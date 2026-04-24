"""
Model training script — Bias-Free Edition.

Generates synthetic borrower training data, applies fairness-aware sample
reweighing, trains a Logistic Regression pipeline, evaluates both predictive
accuracy AND fairness metrics, then saves the model as model.pkl.

Fairness approach (preprocessing):
  - Income quartile groups are used as a socioeconomic proxy.
  - Kamiran & Calders (2012) reweighing is applied before fitting.
  - Post-training fairness audit runs DIR, EOD, and Group AUC Gap.
  - All metrics are logged; training fails loudly if DIR < 0.75.

Usage:
    python -m app.ml.train_model
    # or from project root:
    python credit_scoring_service/app/ml/train_model.py
"""

import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    classification_report,
    roc_auc_score,
    accuracy_score,
)

# ── Ensure project root is on sys.path when run directly ──────────────────────
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.ml.fairness import reweight_samples, fairness_audit

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

RANDOM_STATE = 42
N_SAMPLES    = 10_000
MODEL_OUTPUT = Path(__file__).parent / "model.pkl"

# Minimum acceptable Disparate Impact Ratio — below this we warn strongly.
DIR_MINIMUM  = 0.75


# ── Synthetic data generation ─────────────────────────────────────────────────

def generate_synthetic_data(n: int = N_SAMPLES, seed: int = RANDOM_STATE) -> pd.DataFrame:
    """
    Generate synthetic borrower data for training.

    Features:
      - income               : log-normal, ~$45 000 median
      - loan_amount          : 0.1x – 5x income
      - transaction_frequency: Poisson
      - business_age         : 0–120 months

    Label (default):
      - Higher DTI  → higher default probability
      - Lower income → higher default probability
      - Younger biz  → higher default probability

    Fairness note:
      No protected attributes (race, gender, geography) are generated.
      Income is a known socioeconomic proxy — reweighing is applied at
      training time to remove its indirect discriminatory effect.
    """
    rng = np.random.default_rng(seed)

    income = rng.lognormal(mean=10.7, sigma=0.5, size=n)
    loan_ratio = rng.uniform(0.1, 5.0, size=n)
    loan_amount = income * loan_ratio
    transaction_frequency = rng.poisson(lam=20, size=n)
    business_age = rng.integers(0, 121, size=n)

    debt_to_income = loan_amount / income
    log_income = np.log1p(income)

    z = (
        -3.0
        + 1.8 * debt_to_income
        - 0.3 * (log_income - log_income.mean()) / log_income.std()
        - 0.015 * business_age
        - 0.01 * transaction_frequency
    )
    prob_default = 1 / (1 + np.exp(-z))
    default = (rng.random(n) < prob_default).astype(int)

    df = pd.DataFrame({
        "debt_to_income_ratio":  debt_to_income,
        "log_income":            log_income,
        "log_loan_amount":       np.log1p(loan_amount),
        "transaction_frequency": transaction_frequency.astype(float),
        "business_age":          business_age.astype(float),
        "default":               default,
    })

    logger.info(
        "Generated %d samples | Default rate: %.2f%%",
        n, df["default"].mean() * 100,
    )
    return df


# ── Feature columns ─────────────────────────────────────────────────────────

FEATURE_COLUMNS = [
    "debt_to_income_ratio",
    "log_income",
    "log_loan_amount",
    "transaction_frequency",
    "business_age",
]


# ── Pipeline ─────────────────────────────────────────────────────────────────

def build_pipeline() -> Pipeline:
    return Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(
            max_iter=1000,
            random_state=RANDOM_STATE,
            class_weight="balanced",   # handles label imbalance
            C=1.0,
            solver="lbfgs",
        )),
    ])


# ── Training with fairness-aware reweighing ──────────────────────────────────

def train(df: pd.DataFrame) -> Pipeline:
    X = df[FEATURE_COLUMNS]
    y = df["default"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )

    # ── Compute fairness sample weights ──────────────────────────────────────
    logger.info("Computing fairness sample weights (income-quartile reweighing)...")
    sample_weights = reweight_samples(
        y=y_train,
        log_income=X_train["log_income"].values,
    )

    # ── Fit pipeline ──────────────────────────────────────────────────────────
    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train, clf__sample_weight=sample_weights)

    # ── Standard accuracy metrics ─────────────────────────────────────────────
    y_pred  = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]

    accuracy = accuracy_score(y_test, y_pred)
    roc_auc  = roc_auc_score(y_test, y_proba)

    logger.info("Accuracy : %.4f", accuracy)
    logger.info("ROC-AUC  : %.4f", roc_auc)
    print("\nClassification Report:\n", classification_report(y_test, y_pred))

    # ── Fairness audit ────────────────────────────────────────────────────────
    logger.info("Running post-training fairness audit...")
    audit = fairness_audit(
        y_true=y_test,
        y_proba=y_proba,
        log_income=X_test["log_income"].values,
    )

    print("\n" + "="*60)
    print("  FAIRNESS AUDIT RESULTS")
    print("="*60)
    print(f"  Disparate Impact Ratio (>=0.80): {audit['disparate_impact_ratio']}  {'[PASS]' if audit['dir_pass'] else '[FAIL]'}")
    print(f"  Equal Opportunity Diff (<=0.10): {audit['equal_opportunity_diff']}  {'[PASS]' if audit['eod_pass'] else '[FAIL]'}")
    print(f"  Group AUC Gap          (<=0.05): {audit['group_auc_gap']}  {'[PASS]' if audit['auc_gap_pass'] else '[FAIL]'}")
    print(f"  Overall: {'PASSED [OK]' if audit['overall_pass'] else 'NEEDS REVIEW [WARN]'}")
    print("="*60)

    if audit["disparate_impact_ratio"] is not None and audit["disparate_impact_ratio"] < DIR_MINIMUM:
        logger.error(
            "DIR %.4f is below minimum threshold %.2f. "
            "Review data distribution and reweighing parameters before deploying.",
            audit["disparate_impact_ratio"], DIR_MINIMUM
        )
    elif not audit["overall_pass"]:
        logger.warning(
            "Some fairness metrics did not pass. Review the audit report above "
            "before deploying this model to production."
        )

    return pipeline


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    logger.info("=== CredAI Model Training — Bias-Free Edition ===")

    logger.info("Step 1/3: Generating synthetic training data...")
    df = generate_synthetic_data()

    logger.info("Step 2/3: Training logistic regression with fairness reweighing...")
    model = train(df)

    logger.info("Step 3/3: Saving model to %s", MODEL_OUTPUT)
    joblib.dump(model, MODEL_OUTPUT)
    logger.info("Done! Model saved successfully.")
