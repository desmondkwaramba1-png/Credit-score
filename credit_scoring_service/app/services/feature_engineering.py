"""
Feature engineering pipeline for the credit scoring model.

Transforms raw borrower input (Kaggle Credit Risk dataset schema) into a
model-ready feature DataFrame. Categorical columns are label-encoded to
match the encoding applied during training by clean_kaggle_data.py.
"""

import logging
import pandas as pd

logger = logging.getLogger(__name__)

# These encodings match the LabelEncoder mappings from clean_kaggle_data.py
HOME_OWNERSHIP_MAP = {"OTHER": 0, "MORTGAGE": 1, "OWN": 2, "RENT": 3}
LOAN_INTENT_MAP = {
    "DEBTCONSOLIDATION": 0,
    "EDUCATION": 1,
    "HOMEIMPROVEMENT": 2,
    "MEDICAL": 3,
    "PERSONAL": 4,
    "VENTURE": 5,
}
LOAN_GRADE_MAP = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5, "G": 6}
DEFAULT_ON_FILE_MAP = {"N": 0, "Y": 1}

# Ordered list of features expected by the trained model
FEATURE_COLUMNS = [
    "person_age",
    "person_income",
    "person_home_ownership",
    "person_emp_length",
    "loan_intent",
    "loan_grade",
    "loan_amnt",
    "loan_int_rate",
    "loan_percent_income",
    "cb_person_default_on_file",
    "cb_person_cred_hist_length",
    "loan_to_income_ratio",  # feature engineered during training
]


def engineer_features(
    person_age: int,
    person_income: float,
    person_home_ownership: str,
    person_emp_length: float,
    loan_intent: str,
    loan_grade: str,
    loan_amnt: float,
    loan_int_rate: float,
    loan_percent_income: float,
    cb_person_default_on_file: str,
    cb_person_cred_hist_length: int,
) -> pd.DataFrame:
    """
    Encode and engineer features from raw borrower financial inputs.

    Returns a single-row DataFrame with columns in FEATURE_COLUMNS order,
    ready to be passed directly to the trained ML model.
    """
    # Encode categoricals — default to 0 if unknown value is provided
    home_ownership_enc = HOME_OWNERSHIP_MAP.get(person_home_ownership.upper(), 0)
    loan_intent_enc = LOAN_INTENT_MAP.get(loan_intent.upper().replace(" ", ""), 0)
    loan_grade_enc = LOAN_GRADE_MAP.get(loan_grade.upper(), 0)
    default_on_file_enc = DEFAULT_ON_FILE_MAP.get(cb_person_default_on_file.upper(), 0)

    # Engineered feature
    loan_to_income_ratio = loan_amnt / person_income if person_income > 0 else 0.0

    features = {
        "person_age": [float(person_age)],
        "person_income": [person_income],
        "person_home_ownership": [float(home_ownership_enc)],
        "person_emp_length": [person_emp_length],
        "loan_intent": [float(loan_intent_enc)],
        "loan_grade": [float(loan_grade_enc)],
        "loan_amnt": [loan_amnt],
        "loan_int_rate": [loan_int_rate],
        "loan_percent_income": [loan_percent_income],
        "cb_person_default_on_file": [float(default_on_file_enc)],
        "cb_person_cred_hist_length": [float(cb_person_cred_hist_length)],
        "loan_to_income_ratio": [loan_to_income_ratio],
    }

    df = pd.DataFrame(features, columns=FEATURE_COLUMNS)
    logger.debug("Engineered features: %s", df.to_dict(orient="records"))
    return df
