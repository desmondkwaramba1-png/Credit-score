"""
ML Scoring Engine — refactored from predict.py.

Exposes:
  - ScoringEngine  : stateful class wrapping load, predict, and 8-tier risk mapping.
  - load_model()   : module-level cached loader (backward-compatible).
  - predict()      : module-level function (backward-compatible).
"""

import logging
from functools import lru_cache
from pathlib import Path
from typing import List, Literal, Tuple

import httpx
import joblib
import pandas as pd

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ─────────────────────────────────────────────────────────────────────────────
# 8-Tier Risk Mapping
# ─────────────────────────────────────────────────────────────────────────────
#
# Score  | Tier          | PD range (approx)
# -------+---------------+------------------
# 800-850 | EXCEPTIONAL   | 0.00 – 0.07
# 740-799 | EXCELLENT     | 0.07 – 0.12
# 670-739 | VERY_GOOD     | 0.12 – 0.18
# 620-669 | GOOD          | 0.18 – 0.25
# 580-619 | FAIR          | 0.25 – 0.32
# 520-579 | POOR          | 0.32 – 0.42
# 400-519 | VERY_POOR     | 0.42 – 0.65
# 300-399 | CRITICAL      | 0.65 – 1.00

_TIER_TABLE = [
    # (pd_max_exclusive, risk_level, tier_label, score_floor, score_ceil)
    (0.07, "LOW",    "EXCEPTIONAL", 800, 850),
    (0.12, "LOW",    "EXCELLENT",   740, 799),
    (0.18, "LOW",    "VERY_GOOD",   670, 739),
    (0.25, "MEDIUM", "GOOD",        620, 669),
    (0.32, "MEDIUM", "FAIR",        580, 619),
    (0.42, "HIGH",   "POOR",        520, 579),
    (0.65, "HIGH",   "VERY_POOR",   400, 519),
    (1.01, "HIGH",   "CRITICAL",    300, 399),
]


def _map_pd_to_tier(pd: float) -> Tuple[int, str, str]:
    """Return (credit_score, risk_level, risk_tier) for a given probability of default."""
    for pd_max, risk_level, tier_label, score_floor, score_ceil in _TIER_TABLE:
        if pd < pd_max:
            # Linear interpolation within the tier band
            pd_min = 0.0 if _TIER_TABLE.index((pd_max, risk_level, tier_label, score_floor, score_ceil)) == 0 \
                else _TIER_TABLE[_TIER_TABLE.index((pd_max, risk_level, tier_label, score_floor, score_ceil)) - 1][0]
            span = pd_max - pd_min
            ratio = (pd - pd_min) / span if span > 0 else 0
            score = int(score_ceil - ratio * (score_ceil - score_floor))
            score = max(score_floor, min(score_ceil, score))
            return score, risk_level, tier_label
    return 300, "HIGH", "CRITICAL"


def _generate_risk_flags(
    pd: float,
    risk_tier: str,
    features: dict,
) -> List[str]:
    """
    Produce a list of plain-English risk flags based on the borrower's feature profile.
    These complement SHAP explanations with human-readable warnings.
    """
    flags: List[str] = []

    loan_pct = features.get("loan_percent_income", 0)
    if loan_pct and float(loan_pct) > 0.40:
        flags.append("Loan amount exceeds 40% of annual income — high debt-to-income ratio detected.")

    cb_default = features.get("cb_person_default_on_file", "N")
    if str(cb_default).upper() == "Y":
        flags.append("Prior credit bureau default on file — historical delinquency increases risk.")

    emp_length = features.get("person_emp_length", None)
    if emp_length is not None and float(emp_length) < 1.0:
        flags.append("Employment tenure is less than 1 year — income stability may be limited.")

    cred_hist = features.get("cb_person_cred_hist_length", None)
    if cred_hist is not None and int(cred_hist) < 2:
        flags.append("Credit history is less than 2 years — thin credit file increases uncertainty.")

    int_rate = features.get("loan_int_rate", None)
    if int_rate is not None and float(int_rate) > 18.0:
        flags.append("Loan interest rate above 18% — suggests existing high-risk borrowing profile.")

    grade = features.get("loan_grade", "")
    if grade in ("D", "E", "F", "G"):
        flags.append(f"Loan grade '{grade}' indicates a sub-prime credit tier.")

    if risk_tier in ("VERY_POOR", "CRITICAL"):
        flags.append("Probability of default exceeds 42% — lender review strongly recommended.")

    return flags


def _compute_confidence(features: dict) -> float:
    """
    Heuristic confidence score (0.0–1.0) based on completeness and
    quality of the input data provided.
    """
    key_fields = [
        "person_age", "person_income", "person_home_ownership",
        "person_emp_length", "loan_intent", "loan_grade", "loan_amnt",
        "loan_int_rate", "loan_percent_income", "cb_person_default_on_file",
        "cb_person_cred_hist_length",
    ]
    filled = sum(1 for k in key_fields if features.get(k) is not None)
    completeness = filled / len(key_fields)

    # Slight penalty if key risk indicators are missing
    penalty = 0.0
    if features.get("loan_percent_income") is None:
        penalty += 0.05
    if features.get("cb_person_cred_hist_length") is None:
        penalty += 0.05

    return max(0.0, min(1.0, round(completeness - penalty, 2)))


# ─────────────────────────────────────────────────────────────────────────────
# ScoringEngine Class
# ─────────────────────────────────────────────────────────────────────────────

class ScoringEngine:
    """
    Stateful scoring engine wrapping the ML pipeline.

    Usage:
        engine = ScoringEngine()
        result = engine.score(features_df, raw_features_dict)
    """

    def __init__(self):
        self.model = self._load()

    # ── private ────────────────────────────────────────────────────────────────
    @staticmethod
    def _download_model_if_needed():
        if not settings.model_url:
            return
        model_path = Path(settings.model_path)
        if model_path.exists():
            logger.info("Pre-trained model already exists at %s. Skipping download.", model_path)
            return
        logger.info("Downloading pre-trained model from %s...", settings.model_url)
        try:
            model_path.parent.mkdir(parents=True, exist_ok=True)
            with httpx.stream("GET", settings.model_url, follow_redirects=True) as response:
                response.raise_for_status()
                with open(model_path, "wb") as f:
                    for chunk in response.iter_bytes(chunk_size=8192):
                        f.write(chunk)
            logger.info("Model downloaded to %s", model_path)
        except Exception as e:
            logger.error("Model download failed: %s", e)
            raise RuntimeError(f"Could not download ML model: {e}") from e

    def _load(self):
        try:
            self._download_model_if_needed()
            model_path = settings.model_path
            logger.info("Loading ML model from: %s", model_path)
            model = joblib.load(model_path)
            logger.info("Model loaded: %s", type(model).__name__)
            return model
        except FileNotFoundError:
            logger.warning("Model file not found at %s", settings.model_path)
            return None
        except Exception as e:
            logger.error("Failed to load ML model: %s", e)
            return None

    # ── public ─────────────────────────────────────────────────────────────────
    def score(
        self,
        features: pd.DataFrame,
        raw_features: dict | None = None,
    ) -> dict:
        """
        Run inference and return a rich result dict.

        Returns:
            {
              credit_score, probability_of_default, risk_level,
              risk_tier, risk_flags, confidence
            }
        """
        from fastapi import HTTPException

        if self.model is None:
            raise HTTPException(
                status_code=503,
                detail="Credit scoring model is currently unavailable.",
            )

        prob_default = float(self.model.predict_proba(features)[0][1])
        credit_score, risk_level, risk_tier = _map_pd_to_tier(prob_default)
        raw = raw_features or {}
        risk_flags = _generate_risk_flags(prob_default, risk_tier, raw)
        confidence = _compute_confidence(raw)

        logger.info(
            "ScoringEngine: score=%d pod=%.4f tier=%s flags=%d confidence=%.2f",
            credit_score, prob_default, risk_tier, len(risk_flags), confidence,
        )
        return {
            "credit_score": credit_score,
            "probability_of_default": round(prob_default, 4),
            "risk_level": risk_level,
            "risk_tier": risk_tier,
            "risk_flags": risk_flags,
            "confidence": confidence,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Module-level helpers (backward-compatible with existing scoring_service.py)
# ─────────────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def load_model():
    """Backward-compat cached loader."""
    engine = ScoringEngine()
    return engine.model


def predict(features: pd.DataFrame) -> Tuple[int, float, Literal["LOW", "MEDIUM", "HIGH"]]:
    """
    Backward-compat predict function.
    Returns (credit_score, probability_of_default, risk_level).
    """
    from fastapi import HTTPException

    model = load_model()
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Credit scoring model is currently unavailable.",
        )
    prob_default = float(model.predict_proba(features)[0][1])
    credit_score, risk_level, _ = _map_pd_to_tier(prob_default)
    logger.info("predict(): score=%d pod=%.4f risk=%s", credit_score, prob_default, risk_level)
    return credit_score, prob_default, risk_level
