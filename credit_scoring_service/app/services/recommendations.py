"""
Recommendations Engine.

Generates actionable, SME-specific credit improvement recommendations
based on risk level, probability of default, and raw feature values.
"""

from typing import List, Dict, Any


def generate_recommendations(
    risk_level: str,
    prob_default: float,
    features: Dict[str, Any],
    shap_top_features: List[Dict],
) -> List[str]:
    """
    Generate a prioritised list of actionable recommendations for an SME borrower.

    Args:
        risk_level:       "LOW", "MEDIUM", or "HIGH"
        prob_default:     Probability of default (0.0 – 1.0)
        features:         Raw feature dict from the API request
        shap_top_features: Top SHAP feature impacts from shap_service

    Returns:
        List of recommendation strings, ordered by priority.
    """
    recs: List[str] = []

    loan_to_income = features.get("loan_to_income_ratio", 0)
    loan_int_rate  = features.get("loan_int_rate", 0)
    emp_length     = features.get("person_emp_length", 0)
    cred_hist      = features.get("cb_person_cred_hist_length", 0)
    income         = features.get("person_income", 0)
    loan_amnt      = features.get("loan_amnt", 0)
    default_flag   = str(features.get("cb_person_default_on_file", "N")).upper()
    loan_pct       = features.get("loan_percent_income", 0)

    # ── Risk-level general advice ─────────────────────────────────────────────
    if risk_level == "HIGH":
        recs.append(
            "⚠️ Your current risk profile is HIGH. Prioritise reducing outstanding debts "
            "before applying for new loans."
        )
    elif risk_level == "MEDIUM":
        recs.append(
            "📊 Your risk profile is MEDIUM. Small improvements in key areas can "
            "significantly boost your credit score."
        )
    else:
        recs.append(
            "✅ Your risk profile is LOW. Keep up your current financial practices to "
            "maintain a strong credit score."
        )

    # ── Feature-specific recommendations ────────────────────────────────────────
    if loan_to_income > 0.4:
        recs.append(
            f"💳 Your loan-to-income ratio is {loan_to_income:.2f} (above the safe threshold of 0.40). "
            "Reduce your loan amount or increase your income before the next application."
        )

    if loan_pct > 0.3:
        recs.append(
            f"📉 Your loan represents {loan_pct*100:.1f}% of your annual income. "
            "Aim to keep this below 30% to improve your creditworthiness."
        )

    if loan_int_rate > 15:
        recs.append(
            f"📈 Your current interest rate is {loan_int_rate:.1f}%. "
            "Consider refinancing or negotiating a lower rate to reduce repayment burden."
        )

    if emp_length < 2:
        recs.append(
            "🏢 Your employment length is less than 2 years. Lenders prefer at least "
            "2–3 years of stable employment — building this tenure will improve your score."
        )

    if cred_hist < 3:
        recs.append(
            f"📅 Your credit history is only {int(cred_hist)} year(s) long. "
            "Building a 3+ year credit history by maintaining small, on-time loans will improve your profile."
        )

    if default_flag == "Y":
        recs.append(
            "⛔ A prior default is on your credit record. Demonstrating 12+ months of "
            "consistent repayment will help rebuild lender confidence."
        )

    if income < 30_000:
        recs.append(
            f"💰 Your reported income of ${income:,.0f} is below lender thresholds for "
            "larger loans. Document all revenue streams and consider diversifying income sources."
        )

    if loan_amnt > income * 0.5:
        recs.append(
            "🔍 The requested loan amount is high relative to your income. "
            "Consider requesting a smaller amount or providing additional collateral."
        )

    # ── SHAP-driven advice: highlight the top negative driver ────────────────────
    if shap_top_features:
        worst = max(shap_top_features, key=lambda x: x.get("impact", 0))
        if worst.get("impact", 0) > 0.05:
            label = worst.get("label", worst.get("feature", "Unknown"))
            recs.append(
                f"🔎 Model insight: '{label}' is the single largest driver of your "
                "current risk score. Addressing this factor will have the highest impact."
            )

    # ── Universal advice ────────────────────────────────────────────────────────
    recs.append("📱 Use mobile money consistently to build a verifiable digital financial trail.")
    recs.append(
        "🤝 Connecting with a local microfinance institution can help you access "
        "starter credit products designed for SMEs."
    )

    return recs
