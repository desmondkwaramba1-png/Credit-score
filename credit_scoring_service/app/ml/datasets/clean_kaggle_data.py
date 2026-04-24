import os
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder

def load_and_clean_dataset(input_csv_path: str, output_csv_path: str):
    """
    Loads a raw Kaggle credit risk dataset, cleans it, and saves a processed version 
    ready for machine learning models (fully numeric, no missing values).
    
    Expected raw columns (Kaggle Standard):
    person_age, person_income, person_home_ownership, person_emp_length, 
    loan_intent, loan_grade, loan_amnt, loan_int_rate, loan_status, 
    loan_percent_income, cb_person_default_on_file, cb_person_cred_hist_length
    """
    print(f"Loading raw dataset from {input_csv_path}...")
    
    if not os.path.exists(input_csv_path):
        raise FileNotFoundError(f"Missing raw dataset! Please ensure {input_csv_path} exists. You can download it from Kaggle: https://www.kaggle.com/datasets/laotse/credit-risk-dataset")
    
    df = pd.read_csv(input_csv_path)
    
    print(f"Original shape: {df.shape}")
    
    # 1. Handle Missing Values
    print("Handling missing values...")
    # Fill missing employment length with median
    if 'person_emp_length' in df.columns:
        df['person_emp_length'] = df['person_emp_length'].fillna(df['person_emp_length'].median())
    
    # Fill missing interest rates with median
    if 'loan_int_rate' in df.columns:
        df['loan_int_rate'] = df['loan_int_rate'].fillna(df['loan_int_rate'].median())
        
    # 2. Outlier Treatment (Filtering extreme unrealistic values to help models generalize)
    print("Removing extreme outliers...")
    if 'person_age' in df.columns:
        # Remove ages > 100 (likely data entry errors)
        df = df[df['person_age'] <= 100]
        
    if 'person_emp_length' in df.columns:
        # Remove employment length > 60 years
        df = df[df['person_emp_length'] <= 60]

    # 3. Rename Target Column to match existing infrastructure
    if 'loan_status' in df.columns:
        df = df.rename(columns={'loan_status': 'default'})
        
    # 4. Encode Categorical Variables (Convert Strings to Numbers)
    print("Encoding categorical variables for ML models...")
    categorical_cols = df.select_dtypes(include=['object']).columns
    
    # We use LabelEncoder here because TabNet & Tree-based models (CatBoost/LGBM) 
    # handle ordinal labels well natively without blowing up dimensionality.
    le = LabelEncoder()
    mappings = {}
    
    for col in categorical_cols:
        # Fill any missing categorical with 'Unknown' just in case
        df[col] = df[col].fillna('Unknown')
        df[col] = le.fit_transform(df[col])
        # Save mapping for future reference if needed
        mappings[col] = dict(zip(le.classes_, le.transform(le.classes_)))

    print("Encoding mapping for reference:")
    for col, mapping in mappings.items():
        print(f"  - {col}: {mapping}")

    # 5. Save the cleaned dataset
    print(f"Cleaned dataset shape: {df.shape}")
    os.makedirs(os.path.dirname(output_csv_path), exist_ok=True)
    df.to_csv(output_csv_path, index=False)
    print(f"Successfully saved cleaned data to {output_csv_path}")
    
    return df

if __name__ == "__main__":
    # Get the directory of this script
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Define paths
    raw_data_path = os.path.join(current_dir, "credit_risk_dataset.csv")
    cleaned_data_path = os.path.join(current_dir, "fintech_credit_dataset_cleaned.csv")
    
    load_and_clean_dataset(raw_data_path, cleaned_data_path)
