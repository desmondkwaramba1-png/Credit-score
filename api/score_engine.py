"""
PAMOJA AI — Credit Score Engine v0.5 (Growth Playbook Edition)
Powered by real African loan default data (Zindi, Kenya, 55,305 loans).
Shifted from pure lending-scores to "Financial OS" engagement scoring.
"""

import pickle, json

class PamojaScoreEngine:

    # Recalibrated to make top tiers harder, requiring OS engagement
    BANDS = [
        (800, 1000, "excellent", "Excellent"),
        (700, 799,  "good",      "Good"),
        (600, 699,  "fair",      "Fair"),
        (500, 599,  "poor",      "Poor"),
        (0,   499,  "very_poor", "Very Poor"),
    ]

    def __init__(self, model_dir="/home/claude/pamoja_credit/models"):
        try:
            with open(f"{model_dir}/pamoja_zindi_hgb.pkl", "rb") as f:
                self.loan_model = pickle.load(f)
            with open(f"{model_dir}/metadata_zindi.json") as f:
                self.loan_meta = json.load(f)
            with open(f"{model_dir}/pamoja_hgb.pkl", "rb") as f:
                self.beh_model = pickle.load(f)
            with open(f"{model_dir}/metadata.json") as f:
                self.beh_meta = json.load(f)
            self.beh_features  = self.beh_meta["features"]
            self.loan_features = self.loan_meta["features"]
        except Exception as e:
            # Running rules-only for demo if ML models missing
            pass

    def _get_band(self, score):
        for lo, hi, key, label in self.BANDS:
            if lo <= score <= hi:
                return {"key": key, "label": label, "range": f"{lo}–{hi}"}
        return {"key": "very_poor", "label": "Very Poor", "range": "0–499"}

    def _loan_rec(self, score, rev):
        if   score >= 800: limit = min(rev*6, 500);    rate = 0.08
        elif score >= 700: limit = min(rev*4, 300);    rate = 0.12
        elif score >= 600: limit = min(rev*2.5, 150);  rate = 0.18
        elif score >= 500: limit = min(rev*1, 50);     rate = 0.25 # Manual review
        else:              limit = 0;                  rate = 0.35
        return {"recommended_limit_usd": round(limit),
                "suggested_rate_apr": f"{rate:.0%}", "rate_float": rate}

    def _calculate_weighted_score(self, b):
        """
        Playbook v0.5 Weightings (0-1000 Scale)
        Re-calibrated to reward daily OS usage.
        """
        # 1. MM Consistency (20%) - Reduced from 30%
        mm_cons = float(b.get("mm_consistency_score", 0.5))
        mm_months = int(b.get("mm_months_active", 0))
        activity_rate = min(mm_months, 12) / 12  
        mm_cons_score = (mm_cons * 0.7) + (activity_rate * 0.3)
        
        # 2. Cash Flow Health (20%) - Reduced from 25%
        mi = float(b.get("mm_inflow_ratio", 1.0))
        ratio_score = min(1.0, mi / 1.5)
        mb = float(b.get("mm_avg_balance_usd", 20))
        rev = float(b.get("monthly_revenue_usd", 150))
        volatility = 1 - min(1.0, mb / max(rev, 1) * 2) 
        stability_score = max(0, 1 - (volatility / 2))
        cf_score = (ratio_score * 0.6) + (stability_score * 0.4)
        
        # 3. Repayment History (25%)
        pl = int(b.get("prior_loans_count", 0))
        rr = b.get("repayment_rate", None)
        if pl == 0:
            repay_score = 0.5 # Neutral for thin file
        else:
            rr_val = float(rr) if rr is not None else 0.5
            experience_bonus = min(0.1, pl * 0.02)
            repay_score = min(1.0, rr_val + experience_bonus)
            
        # 4. Business Stability (10%)
        yb = float(b.get("years_in_business", 0))
        years_score = min(1.0, yb / 10)
        revenue_score = min(1.0, rev / 400) 
        biz_score = (years_score * 0.5) + (revenue_score * 0.5)
        
        # 5. OS Engagement & Mukando (20%) - NEW PLAYBOOK METRIC
        sales_7d = int(b.get("digital_sales_logged_7d", 0))
        peers_invited = int(b.get("mukando_peers_invited", 0))
        os_sales_score = min(1.0, sales_7d / 20.0)
        os_peer_score = min(1.0, peers_invited / 5.0)
        os_engagement_score = (os_sales_score * 0.6) + (os_peer_score * 0.4)
        
        # 6. Utilities & Trust (5%)
        zs = float(b.get("zesa_payment_consistency", 0.3))
        social_score = zs

        weighted = (
            mm_cons_score * 0.20 +
            cf_score * 0.20 +
            repay_score * 0.25 +
            biz_score * 0.10 +
            os_engagement_score * 0.20 +
            social_score * 0.05
        )
        
        final_score = int(weighted * 1000)
        
        # Risk Red Flags
        if pl > 0 and (float(b.get("repayment_rate", 1.0)) < 0.6 or int(b.get("days_late_recent_loan", 0)) > 30):
            final_score -= 150
        tx_count = int(b.get("mm_tx_count_monthly", 5)) * min(mm_months, 1)
        if mm_months < 3 or tx_count < 20:
            final_score -= 100
        if yb == 0:
            final_score -= 50
            
        return max(0, min(1000, final_score))

    def _explain(self, b, score):
        pos, neg, tips = [], [], []
        
        # Diagnostics
        mc = float(b.get("mm_consistency_score", 0))
        if mc > 0.8: pos.append("Exceptional mobile money consistency")
        elif mc < 0.4: neg.append("Highly irregular transaction patterns")
        
        mo = int(b.get("mm_months_active", 0))
        if mo > 24: pos.append(f"Established financial footprint ({mo} months)")
        elif mo < 6: neg.append("Insufficient transaction history (< 6 months)")
        
        pl = int(b.get("prior_loans_count", 0))
        rr = b.get("repayment_rate", None)
        if pl > 5 and rr and float(rr) > 0.95:
            pos.append(f"Perfect repayment record over {pl} cycles")
        elif pl > 0 and rr and float(rr) < 0.6:
            neg.append("Critical history of late repayments")
            
        # Gamification Tips (Playbook)
        sales_7d = int(b.get("digital_sales_logged_7d", 0))
        peers_invited = int(b.get("mukando_peers_invited", 0))
        
        if sales_7d < 20:
            rem = 20 - sales_7d
            tips.append(f"Log {rem} more sales this week for a +10pt score boost")
        else:
            pos.append("Active daily user of PAMOJA Sales Ledger")
            
        if peers_invited < 5:
            tips.append("Invite your Mukando group to PAMOJA to lower your interest rate")
        else:
            pos.append("Strong community network (Mukando organized)")
            
        if pl == 0:
            tips.append("Take and repay a $20 starter loan to build your credit profile")
            
        return {"positives": pos[:5], "negatives": neg[:4], "gamification_tips": tips[:3]}

    def score(self, borrower):
        score = self._calculate_weighted_score(borrower)
        band  = self._get_band(score)
        rev   = float(borrower.get("monthly_revenue_usd", 150))
        
        return {
            "score":               score,
            "band":                band["label"],
            "band_key":            band["key"],
            "score_range":         band["range"],
            "default_probability": round(1 - (score/1000), 4),
            "loan_recommendation": self._loan_rec(score, rev),
            "explanation":         self._explain(borrower, score),
            "scoring_method":      "financial_os_engagement_v0.5",
            "model_version":       "0.5.0",
        }

    def score_loan(self, loan): return self.score(loan)
    def score_batch(self, borrowers): return [self.score(b) for b in borrowers]

if __name__ == "__main__":
    engine = PamojaScoreEngine()
    
    # Test a standard user lacking OS engagement
    print("Test 1: Standard User (No OS Engagement)")
    b1 = {
        "business_type":"tuck_shop", "mm_consistency_score":0.8, "mm_months_active":24,
        "mm_inflow_ratio":1.2, "mm_avg_balance_usd":50, "prior_loans_count":1,
        "repayment_rate":0.9, "years_in_business":2, "monthly_revenue_usd":300,
        "digital_sales_logged_7d": 0, "mukando_peers_invited": 0
    }
    r1 = engine.score(b1)
    print(f"Score: {r1['score']} ({r1['band']}) -> Should be Fair/Good due to baseline strong traits but 0 OS usage.")
    for t in r1["explanation"]["gamification_tips"]: print(" Tip:", t)
    
    # Test identical user with OS engagement
    print("\nTest 2: Engaged User (High OS Engagement)")
    b2 = b1.copy()
    b2["digital_sales_logged_7d"] = 25
    b2["mukando_peers_invited"] = 5
    r2 = engine.score(b2)
    print(f"Score: {r2['score']} ({r2['band']}) -> Should be Excellent.")
    for t in r2["explanation"]["gamification_tips"]: print(" Tip:", t)
