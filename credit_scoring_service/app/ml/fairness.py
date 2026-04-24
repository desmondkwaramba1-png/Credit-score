"""
fairness.py — Bias-removal and fairness audit utilities for CredAI.

Provides:
  - reweight_samples()       : compute sample weights to equalize positive-outcome
                               rates across income-quantile proxy groups
  - compute_dir()            : Disparate Impact Ratio (4/5ths rule)
  - compute_eod()            : Equal Opportunity Difference (TPR parity)
  - compute_group_auc_gap()  : AUC gap between highest- and lowest-income quartiles
  - fairness_audit()         : full audit report as a dict (loggable / API-ready)
"""

from __future__ import annotations

import logging
from typing import Tuple

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

logger = logging.getLogger(__name__)

# ── Proxy group definition ─────────────────────────────────────────────────────
# We use log_income quartiles as a socioeconomic proxy because protected
# attributes (race, gender) are never collected.  Fairness is measured across
# income quartiles to detect disparate impact on lower-income borrowers.

INCOME_QUANTILES = 4   # split into Q1 (lowest) … Q4 (highest)


def _income_groups(log_income: np.ndarray) -> np.ndarray:
    """Map log-income values to quartile-group labels 0–3."""
    boundaries = np.nanpercentile(log_income, [25, 50, 75])
    groups = np.zeros(len(log_income), dtype=int)
    groups[log_income >= boundaries[0]] = 1
    groups[log_income >= boundaries[1]] = 2
    groups[log_income >= boundaries[2]] = 3
    return groups


# ── Sample reweighing ──────────────────────────────────────────────────────────

def reweight_samples(
    y: np.ndarray,
    log_income: np.ndarray,
) -> np.ndarray:
    """
    Compute per-sample weights so that positive-outcome rates become uniform
    across income-quartile proxy groups (preprocessing debiasing).

    Based on the reweighing algorithm (Kamiran & Calders, 2012):
      w(x) = expected_positive_rate / group_positive_rate   for positives
      w(x) = expected_negative_rate / group_negative_rate   for negatives

    Args:
        y:           Binary labels (1 = default).
        log_income:  Log-income feature array (same length as y).

    Returns:
        sample_weights array of shape (n,), floats near 1.0.
    """
    groups = _income_groups(log_income)
    n = len(y)
    weights = np.ones(n, dtype=float)

    expected_pos_rate = y.mean()
    expected_neg_rate = 1.0 - expected_pos_rate

    for g in range(INCOME_QUANTILES):
        mask = groups == g
        if mask.sum() == 0:
            continue

        y_g = y[mask]
        pos_rate = y_g.mean()
        neg_rate = 1.0 - pos_rate

        # Avoid division by zero
        if pos_rate > 0:
            weights[mask & (y == 1)] = expected_pos_rate / pos_rate
        if neg_rate > 0:
            weights[mask & (y == 0)] = expected_neg_rate / neg_rate

    # Normalize so weights sum to n
    weights = weights / weights.mean()
    logger.info(
        "Reweighing complete | weight range [%.4f, %.4f] | mean=%.4f",
        weights.min(), weights.max(), weights.mean()
    )
    return weights


# ── Disparate Impact Ratio ─────────────────────────────────────────────────────

def compute_dir(
    y_pred: np.ndarray,
    log_income: np.ndarray,
    threshold: float = 0.5,
    positive_outcome: int = 0,   # 0 = no default (loan approved)
) -> float:
    """
    Compute the Disparate Impact Ratio between the lowest-income quartile
    (Q1, disadvantaged) and the highest (Q4, privileged).

    DIR = P(Ŷ = positive | group = Q1) / P(Ŷ = positive | group = Q4)

    A DIR ≥ 0.80 satisfies the EEOC 4/5ths rule.

    Args:
        y_pred:          Raw model probabilities (P(default)).
        log_income:      Log-income feature array.
        threshold:       Probability cutoff for classification.
        positive_outcome: The label value considered "positive" (0 = approved).

    Returns:
        DIR as a float.
    """
    groups = _income_groups(log_income)
    binary_pred = (y_pred < threshold).astype(int)  # 0 = approved

    q1_mask = groups == 0
    q4_mask = groups == 3

    if q1_mask.sum() == 0 or q4_mask.sum() == 0:
        logger.warning("Insufficient samples in lowest or highest income quartile for DIR.")
        return float("nan")

    rate_q1 = (binary_pred[q1_mask] == positive_outcome).mean()
    rate_q4 = (binary_pred[q4_mask] == positive_outcome).mean()

    if rate_q4 == 0:
        logger.warning("Approval rate in Q4 is 0; DIR undefined.")
        return float("nan")

    dir_value = rate_q1 / rate_q4
    logger.info("DIR = %.4f (Q1 approval=%.4f, Q4 approval=%.4f)", dir_value, rate_q1, rate_q4)
    return dir_value


# ── Equal Opportunity Difference ──────────────────────────────────────────────

def compute_eod(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    log_income: np.ndarray,
    threshold: float = 0.5,
) -> float:
    """
    Equal Opportunity Difference: |TPR_Q1 − TPR_Q4|.

    Measures whether truly non-defaulting borrowers in the lowest income quartile
    are approved at the same rate as those in the highest quartile.

    A value ≤ 0.10 is generally considered acceptable.

    Returns:
        EOD as a float (absolute difference).
    """
    groups = _income_groups(log_income)
    binary_pred = (y_pred < threshold).astype(int)

    def tpr(mask):
        """True positive rate for the given group mask (positive = non-default)."""
        y_g, p_g = y_true[mask], binary_pred[mask]
        non_default = y_g == 0
        if non_default.sum() == 0:
            return float("nan")
        return (p_g[non_default] == 0).mean()  # predicted approved among truly non-defaulting

    tpr_q1 = tpr(groups == 0)
    tpr_q4 = tpr(groups == 3)

    if np.isnan(tpr_q1) or np.isnan(tpr_q4):
        return float("nan")

    eod = abs(tpr_q1 - tpr_q4)
    logger.info("EOD = %.4f (TPR Q1=%.4f, Q4=%.4f)", eod, tpr_q1, tpr_q4)
    return eod


# ── Group AUC Gap ─────────────────────────────────────────────────────────────

def compute_group_auc_gap(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    log_income: np.ndarray,
) -> float:
    """
    Compute the AUC gap between the highest- and lowest-income quartile groups.

    A gap ≤ 0.05 is generally acceptable.

    Returns:
        Absolute AUC gap as a float.
    """
    groups = _income_groups(log_income)
    aucs = []
    for g in [0, 3]:  # Q1 and Q4
        mask = groups == g
        y_g, p_g = y_true[mask], y_proba[mask]
        if len(np.unique(y_g)) < 2:
            aucs.append(float("nan"))
            continue
        aucs.append(roc_auc_score(y_g, p_g))

    if any(np.isnan(a) for a in aucs):
        return float("nan")

    gap = abs(aucs[1] - aucs[0])
    logger.info("AUC gap = %.4f (Q1 AUC=%.4f, Q4 AUC=%.4f)", gap, aucs[0], aucs[1])
    return gap


# ── Full Fairness Audit ────────────────────────────────────────────────────────

def fairness_audit(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    log_income: np.ndarray,
    threshold: float = 0.5,
) -> dict:
    """
    Run all fairness metrics and return a structured report.

    Pass/fail thresholds (industry standard):
      - DIR  ≥ 0.80   (4/5ths rule)
      - EOD  ≤ 0.10
      - AUC gap ≤ 0.05

    Returns:
        dict with keys: dir, eod, auc_gap, dir_pass, eod_pass, auc_gap_pass, overall_pass
    """
    dir_val  = compute_dir(y_proba, log_income, threshold)
    eod_val  = compute_eod(y_true, y_proba, log_income, threshold)
    auc_val  = compute_group_auc_gap(y_true, y_proba, log_income)

    dir_pass  = (not np.isnan(dir_val))  and dir_val  >= 0.80
    eod_pass  = (not np.isnan(eod_val))  and eod_val  <= 0.10
    auc_pass  = (not np.isnan(auc_val))  and auc_val  <= 0.05
    overall   = dir_pass and eod_pass and auc_pass

    report = {
        "disparate_impact_ratio":  round(dir_val,  4) if not np.isnan(dir_val)  else None,
        "equal_opportunity_diff":  round(eod_val,  4) if not np.isnan(eod_val)  else None,
        "group_auc_gap":           round(auc_val,  4) if not np.isnan(auc_val)  else None,
        "dir_pass":   dir_pass,
        "eod_pass":   eod_pass,
        "auc_gap_pass": auc_pass,
        "overall_pass": overall,
    }

    banner = "✅ PASSED" if overall else "⚠️  NEEDS REVIEW"
    logger.info("=== Fairness Audit %s ===", banner)
    for k, v in report.items():
        logger.info("  %s: %s", k, v)

    return report
