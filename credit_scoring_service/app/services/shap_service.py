"""
SHAP Explanation Service.

Generates top-5 feature importance values for each prediction.
Uses a rule-based approximation when the model is a custom wrapper
(TabNetInferenceModel / StackedInferenceModel) that doesn't support
native SHAP Tree/LinearExplainer.
"""

import logging
from typing import Dict, Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Human-readable feature descriptions for the API response
FEATURE_DESCRIPTIONS = {
    "loan_to_income_ratio":       "Loan-to-Income Ratio",
    "loan_int_rate":              "Loan Interest Rate",
    "person_income":              "Annual Income",
    "loan_amnt":                  "Loan Amount",
    "person_emp_length":          "Employment Length (years)",
    "cb_person_cred_hist_length": "Credit History Length (years)",
    "loan_percent_income":        "Loan as % of Income",
    "person_age":                 "Borrower Age",
    "loan_grade":                 "Loan Grade",
    "person_home_ownership":      "Home Ownership",
    "cb_person_default_on_file":  "Prior Default on Record",
    "loan_intent":                "Loan Purpose",
}


def _rule_based_shap(features_df: pd.DataFrame, prob_default: float) -> Dict[str, float]:
    """
    Rule-based SHAP approximation.

    Calculates a normalized signed contribution for each feature based on
    domain knowledge of credit risk factors. Used as fallback when SHAP
    library or model explainers are not directly available.

    Returns a dict of {feature_name: contribution_value} for top-5 features.
    """
    row = features_df.iloc[0]

    # Risk direction: positive = increases default risk, negative = decreases it
    contributions = {
        "loan_to_income_ratio":       float(row.get("loan_to_income_ratio", 0)) * 0.35,
        "loan_int_rate":              float(row.get("loan_int_rate", 0)) * 0.025,
        "person_income":              -float(row.get("person_income", 0)) / 200_000,
        "loan_amnt":                  float(row.get("loan_amnt", 0)) / 50_000,
        "person_emp_length":          -float(row.get("person_emp_length", 0)) * 0.03,
        "cb_person_cred_hist_length": -float(row.get("cb_person_cred_hist_length", 0)) * 0.02,
        "loan_percent_income":        float(row.get("loan_percent_income", 0)) * 0.30,
        "person_age":                 -float(row.get("person_age", 0)) * 0.005,
    }

    # Sort by absolute impact, take top 5
    sorted_items = sorted(contributions.items(), key=lambda x: abs(x[1]), reverse=True)
    top5 = {k: round(v, 4) for k, v in sorted_items[:5]}
    return top5


def generate_shap_explanations(
    features_df: pd.DataFrame,
    model: Any,
    prob_default: float,
) -> Dict[str, Any]:
    """
    Generate SHAP explanation for a single prediction.

    Attempts to use the SHAP library for tree-based or linear models.
    Falls back to rule-based approximation for custom model wrappers.

    Returns:
        {
          "top_features": [{"feature": ..., "label": ..., "value": ..., "impact": ...}],
          "method": "shap" | "rule_based"
        }
    """
    top5_raw: Dict[str, float] = {}
    method = "rule_based"

    try:
        import shap
        base_model = getattr(model, "clf", None) or getattr(model, "m1", None) or model
        explainer = shap.Explainer(base_model, features_df)
        shap_values = explainer(features_df)
        vals = shap_values.values[0]
        if hasattr(vals, '__iter__') and not isinstance(vals, (int, float)):
            # For binary classification, take the class-1 SHAP values
            if len(vals.shape) == 2:
                vals = vals[:, 1]
        contributions = {col: float(vals[i]) for i, col in enumerate(features_df.columns)}
        sorted_items = sorted(contributions.items(), key=lambda x: abs(x[1]), reverse=True)
        top5_raw = {k: round(v, 4) for k, v in sorted_items[:5]}
        method = "shap"
    except Exception as e:
        logger.debug("SHAP library unavailable or incompatible, using rule-based: %s", e)
        top5_raw = _rule_based_shap(features_df, prob_default)

    row = features_df.iloc[0]
    top_features = [
        {
            "feature": feat,
            "label":   FEATURE_DESCRIPTIONS.get(feat, feat.replace("_", " ").title()),
            "value":   float(row.get(feat, 0)) if feat in features_df.columns else None,
            "impact":  impact,
        }
        for feat, impact in top5_raw.items()
    ]

    return {"top_features": top_features, "method": method}
