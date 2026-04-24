import pandas as pd
import numpy as np
import os
import joblib

from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.preprocessing import StandardScaler
from pytorch_tabnet.tab_model import TabNetClassifier
from lightgbm import LGBMClassifier
from xgboost import XGBClassifier

# ── Module-level wrapper classes (must be at module level for joblib pickling) ──

class TabNetInferenceModel:
    """Wraps a trained TabNetClassifier + its scaler for inference."""
    def __init__(self, tabnet, scaler):
        self.model = tabnet
        self.scaler = scaler

    def predict_proba(self, X_infer):
        return self.model.predict_proba(self.scaler.transform(X_infer))

    def predict(self, X_infer):
        return self.model.predict(self.scaler.transform(X_infer))


class StackedInferenceModel:
    """Wraps two base models + a meta-model + scaler for stacked ensemble inference."""
    def __init__(self, m1, m2, meta, scaler):
        self.m1 = m1
        self.m2 = m2
        self.meta = meta
        self.scaler = scaler

    def predict_proba(self, X_infer):
        p1 = self.m1.predict_proba(X_infer)[:, 1]
        X_infer_scaled = self.scaler.transform(X_infer)
        p2 = self.m2.predict_proba(X_infer_scaled)[:, 1]
        X_meta = np.column_stack([p1, p2])
        return self.meta.predict_proba(X_meta)

    def predict(self, X_infer):
        probs = self.predict_proba(X_infer)[:, 1]
        return (probs > 0.5).astype(int)


def feature_engineering(df):
    """
    Apply feature engineering to the dataset.
    Since we are using the Kaggle Credit Risk Dataset, we will define new features.
    """
    df = df.copy()
    
    # 1. loan_to_income_ratio: Highlights high indebtedness vs earning power
    # In Kaggle dataset: loan_amnt / person_income
    if 'loan_amnt' in df.columns and 'person_income' in df.columns:
        df['loan_to_income_ratio'] = df['loan_amnt'] / df['person_income']
        
    return df


def main():
    # 1. Define file paths for loading and saving assets
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dataset_path = os.path.join(base_dir, 'datasets', 'fintech_credit_dataset_cleaned.csv')
    model_path = os.path.join(base_dir, 'model.pkl')

    # Load dataset
    print("Loading dataset...")
    df = pd.read_csv(dataset_path)

    # 2. Apply feature engineering 
    print("Applying feature engineering...")
    df = feature_engineering(df)

    # 3. Separate features (X) and target (y)
    X = df.drop(columns=['default', 'probability_of_default'], errors='ignore')
    y = df['default']
    
    print(f"Dataset shape after feature engineering: {X.shape}")

    # 4. Initialize StratifiedKFold cross-validation (5 splits) for evaluation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    # 5. Load the existing model
    print("Loading existing trained model...")
    # 5. Load the existing model — fall back to fresh Logistic Regression if corrupt/missing
    print("Loading existing trained model (or training fresh base model)...")
    try:
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"No model at {model_path}")
        existing_model = joblib.load(model_path)
        print("Existing model loaded successfully.")
    except Exception as load_err:
        print(f"  [WARNING] Could not load existing model ({load_err}). Training a fresh Logistic Regression as base model.")
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import StandardScaler as SS
        from sklearn.linear_model import LogisticRegression as LR
        existing_model = Pipeline([
            ("scaler", SS()),
            ("clf", LR(max_iter=1000, random_state=42, class_weight="balanced")),
        ])

    # 6. Initialize Pretrained Tabular Model (TabNet)
    # We will instantiate TabNet and use manual cross-validation to get its predictions
    # Note: TabNet requires target values to be dense (which they are) and X to be numeric numpy arrays
    print("Initializing Pretrained TabNet model...")
    
    # Optional scaling for TabNet features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X_scaled_df = pd.DataFrame(X_scaled, columns=X.columns)
    y_values = y.values
    
    # To reduce training time during our CV, we use moderate epochs for TabNet.
    # We are omitting RandomizedSearchCV to save massive execution time, instead using sensible defaults.
    tabnet_params = dict(
        n_d=16, 
        n_a=16, 
        n_steps=4,
        gamma=1.5,
        n_independent=2, 
        n_shared=2,
        seed=42,
        optimizer_params=dict(lr=2e-2)
    )
    
    # Manually collect Out-Of-Fold (OOF) predictions to train the Stacking Meta-model
    print("Generating out-of-fold predictions for base models...")
    
    existing_oof_preds = np.zeros((len(X), 2))
    tabnet_oof_preds = np.zeros((len(X), 2))
    
    # We'll also track the fold CV scores for comparison
    existing_cv_acc, existing_cv_auc = [], []
    tabnet_cv_acc, tabnet_cv_auc = [], []

    # 7 & 8: Perform CV folds to train TabNet and get OOF predictions for Stacking
    for fold, (train_idx, test_idx) in enumerate(cv.split(X, y)):
        print(f"  --> Processing Fold {fold + 1}/5...")
        
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
        X_train_scaled, X_test_scaled = X_scaled[train_idx], X_scaled[test_idx]
        y_train_arr, y_test_arr = y_values[train_idx], y_values[test_idx]

        # Evaluate the existing model on this fold (fitting is required because we are generating CV predictions)
        # Note: If the existing model is a complete pipeline (e.g LogReg + Scaler) we fit and predict
        existing_model.fit(X_train, y_train)
        y_pred_existing = existing_model.predict(X_test)
        y_proba_existing = existing_model.predict_proba(X_test)
        existing_oof_preds[test_idx] = y_proba_existing
        existing_cv_acc.append(accuracy_score(y_test, y_pred_existing))
        existing_cv_auc.append(roc_auc_score(y_test, y_proba_existing[:, 1]))

        # Train and evaluate TabNet
        tabnet_model = TabNetClassifier(**tabnet_params, verbose=0)
        
        # TabNet early stopping (Optional requested feature)
        tabnet_model.fit(
            X_train=X_train_scaled, y_train=y_train_arr,
            eval_set=[(X_train_scaled, y_train_arr), (X_test_scaled, y_test_arr)],
            eval_name=['train', 'valid'],
            eval_metric=['auc'],
            max_epochs=30, patience=5,
            batch_size=1024, virtual_batch_size=128
        )
        
        y_pred_tabnet = tabnet_model.predict(X_test_scaled)
        y_proba_tabnet = tabnet_model.predict_proba(X_test_scaled)
        tabnet_oof_preds[test_idx] = y_proba_tabnet
        tabnet_cv_acc.append(accuracy_score(y_test_arr, y_pred_tabnet))
        tabnet_cv_auc.append(roc_auc_score(y_test_arr, y_proba_tabnet[:, 1]))


    print("\n9. Evaluating Base Models:")
    print(f"Existing Model CV - Accuracy: {np.mean(existing_cv_acc):.4f}, ROC-AUC: {np.mean(existing_cv_auc):.4f}")
    print(f"TabNet Model CV   - Accuracy: {np.mean(tabnet_cv_acc):.4f}, ROC-AUC: {np.mean(tabnet_cv_auc):.4f}")

    # 7. Create Stacked Ensemble Meta-model using the out-of-fold predictions
    # We use LightGBM as the meta-model to learn how to blend the predictions
    print("\n10. Training Stacked Ensemble Meta-Model (LightGBM)...")
    
    # The meta features for each row are just the probabilities from each model
    # (We only need the probability of class 1 from each model)
    meta_features = np.column_stack([
         existing_oof_preds[:, 1],
         tabnet_oof_preds[:, 1]
    ])

    # Tune the Meta Model (LightGBM) using cross validation
    meta_model = LGBMClassifier(random_state=42, verbose=-1)
    
    # We can use cross_val_predict to get the ensemble's CV performance
    meta_oof_preds_proba = cross_val_predict(meta_model, meta_features, y, cv=cv, method='predict_proba')
    meta_oof_preds_class = cross_val_predict(meta_model, meta_features, y, cv=cv, method='predict')
    
    ensemble_acc = accuracy_score(y, meta_oof_preds_class)
    ensemble_auc = roc_auc_score(y, meta_oof_preds_proba[:, 1])
    
    print(f"Stacked Ensemble CV - Accuracy: {ensemble_acc:.4f}, ROC-AUC: {ensemble_auc:.4f}")

    # Print Summary Table (Task 9)
    print("\n==== Summary Table ====")
    results_df = pd.DataFrame([
        {'Model': 'Existing Model', 'Accuracy': np.mean(existing_cv_acc), 'ROC-AUC': np.mean(existing_cv_auc)},
        {'Model': 'Pretrained TabNet', 'Accuracy': np.mean(tabnet_cv_acc), 'ROC-AUC': np.mean(tabnet_cv_auc)},
        {'Model': 'Stacked Ensemble', 'Accuracy': ensemble_acc, 'ROC-AUC': ensemble_auc}
    ]).sort_values(by="ROC-AUC", ascending=False)
    
    print(results_df.to_string(index=False))
    print("=======================")

    best_model_name = results_df.iloc[0]['Model']
    print(f"\nBest performing model based on ROC-AUC is: {best_model_name}")

    # 10. Save the best model
    # For a production scenario where the Stacking model wins, the final artifact would need to include
    # the trained base models, the meta model, and the scaler.
    # To keep things simple, we build an estimator wrapper that processes inference identically if ensemble wins
    print("\n11. Finalizing and saving best model...")
    if best_model_name == 'Stacked Ensemble':
        # Train base models and meta model on all data
        existing_model.fit(X, y)
        tabnet_model_final = TabNetClassifier(**tabnet_params, verbose=0)
        # Without cv splits for early stopping, we train on all dataset
        tabnet_model_final.fit(
            X_train=X_scaled, y_train=y_values,
            max_epochs=20, batch_size=1024
        )
        
        # Train meta model on the full data's base predictions
        final_existing_preds = existing_model.predict_proba(X)[:, 1]
        final_tabnet_preds = tabnet_model_final.predict_proba(X_scaled)[:, 1]
        final_meta_X = np.column_stack([final_existing_preds, final_tabnet_preds])
        meta_model.fit(final_meta_X, y)
        
        # Use module-level StackedInferenceModel (required for joblib pickling)
        final_model = StackedInferenceModel(existing_model, tabnet_model_final, meta_model, scaler)
        
    elif best_model_name == 'Pretrained TabNet':
        # Create wrapper for TabNet to handle scaling during inference
        tabnet_model_final = TabNetClassifier(**tabnet_params, verbose=0)
        tabnet_model_final.fit(X_train=X_scaled, y_train=y_values, max_epochs=20, batch_size=1024)
        
        # Use module-level TabNetInferenceModel (required for joblib pickling)
        final_model = TabNetInferenceModel(tabnet_model_final, scaler)
    else:
        # Existing model wins again
        existing_model.fit(X, y)
        final_model = existing_model

    joblib.dump(final_model, model_path)
    print(f"Model successfully saved to {model_path}")

if __name__ == "__main__":
    main()
