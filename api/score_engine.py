"""
PAMOJA AI — Credit Score Engine v0.4
Powered by real African loan default data (Zindi, Kenya, 55,305 loans).
AUC: 0.9459 on held-out time period.

Two scoring paths:
  1. LOAN SCORING  — lender submits application with repayment terms
  2. BORROWER SCORING — behavioral signals (mobile money, rounds, utilities)
"""

import pickle, json
import numpy as np
import pandas as pd


class PamojaScoreEngine:

    BANDS = [
        (740, 850, "excellent",  "Excellent"),
        (660, 739, "very_good",  "Very Good"),
        (580, 659, "good",       "Good"),
        (500, 579, "fair",       "Fair"),
        (300, 499, "poor",       "Poor"),
    ]

    def __init__(self, model_dir="/home/claude/pamoja_credit/models"):
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
        self.zim_factor    = self.loan_meta["calibration_factor"]

    def _prob_to_score(self, p): return int(np.clip(850 - p * 550, 300, 850))

    def _get_band(self, score):
        for lo, hi, key, label in self.BANDS:
            if lo <= score <= hi:
                return {"key": key, "label": label, "range": f"{lo}–{hi}"}
        return {"key": "poor", "label": "Poor", "range": "300–499"}

    def _loan_rec(self, score, rev):
        if   score >= 740: limit = min(rev*6, 2000);  rate = 0.09
        elif score >= 660: limit = min(rev*4, 1200);  rate = 0.13
        elif score >= 580: limit = min(rev*2.5, 600); rate = 0.17
        elif score >= 500: limit = min(rev*1.5, 300); rate = 0.22
        else:              limit = min(rev*0.8, 150); rate = 0.28
        return {"recommended_limit_usd": round(limit),
                "suggested_rate_apr": f"{rate:.0%}", "rate_float": rate}

    def _engineer_beh(self, df):
        X = df.copy()
        def col(name, default):
            return X.get(name, pd.Series([default]*len(X),index=X.index)).fillna(default)
        pl = col("prior_loans_count",0); rm = col("is_rounds_member",0)
        yb = col("years_in_business",0); fl = col("has_fixed_location",0)
        rf = col("has_references",0);    cg = col("community_group_member",0)
        mc = col("mm_consistency_score",0.5); mi = col("mm_inflow_ratio",1.0)
        mt = col("mm_tx_count_monthly",10);   ma = col("mm_months_active",12)
        rr = X.get("repayment_rate", pd.Series([np.nan]*len(X),index=X.index))
        X["has_credit_history"]   = (pl>0).astype(int)
        X["is_thin_file"]         = ((pl==0)&(rm==0)).astype(int)
        X["no_mm_no_history"]     = ((ma==0)&(pl==0)).astype(int)
        X["repayment_rate_clean"] = np.where(pl>0, rr.fillna(0.5), 0.45)
        X["mm_tenure_bucket"]     = pd.cut(ma,bins=[0,6,12,24,48,9999],labels=[0,1,2,3,4]).astype(float)
        X["stability_score"]      = fl*0.30+rf*0.25+cg*0.20+np.clip(yb,0,10)/10*0.25
        X["mm_health"]            = mc*0.4+np.clip(mi,0,3)/3*0.3+np.clip(mt,0,60)/60*0.3
        X["mobile_financial"]     = mc*ma.clip(0,60)/60
        if "repayment_rate" in X.columns: X=X.drop(columns=["repayment_rate"])
        return X

    def _thin_file_prob(self, b):
        risk = 0.18
        mc=float(b.get("mm_consistency_score",0.3)); mo=float(b.get("mm_months_active",6))
        mi=float(b.get("mm_inflow_ratio",0.9));      mb=float(b.get("mm_avg_balance_usd",10))
        mt=float(b.get("mm_tx_count_monthly",5))
        risk += -0.025 if mc>0.75 else (0.030 if mc<0.40 else 0)
        risk += -0.020 if mo>24   else (0.025 if mo<6   else 0)
        risk += -0.015 if mi>1.25 else (0.020 if mi<0.80 else 0)
        risk += -0.010 if mb>50   else 0
        risk += -0.010 if mt>30   else (0.015 if mt<8 else 0)
        if int(b.get("uses_airtime_credit",0))==1:
            risk += 0.010 if int(b.get("airtime_credit_repay_fast",0))==0 else -0.005
        ad=float(b.get("airtime_regularity_days",15))
        risk += -0.015 if ad<5 else (0.020 if ad>20 else 0)
        z=float(b.get("zesa_payment_consistency",0.3))
        risk += -0.018 if z>0.70 else (0.022 if z<0.30 else 0)
        risk += -0.010 if int(b.get("council_bills_consistent",0))==1 else 0
        y=float(b.get("years_in_business",0))
        risk += -0.020 if y>=3 else (0.025 if y<1 else 0)
        for fld,delta in [("has_fixed_location",-0.015),("has_references",-0.018),
                           ("is_registered",-0.012),("community_group_member",-0.012),
                           ("pays_suppliers_on_time",-0.010)]:
            risk += delta if int(b.get(fld,0))==1 else 0
        rev=float(b.get("monthly_revenue_usd",100)); cv=float(b.get("revenue_cv",0.8))
        risk += -0.012 if rev>300 else (0.018 if rev<80 else 0)
        risk += -0.010 if cv<0.3 else (0.015 if cv>0.8 else 0)
        return float(np.clip(risk, 0.04, 0.65))

    def _explain(self, b, thin, loan_mode):
        pos, neg = [], []
        if loan_mode:
            ir = float(b.get("interest_rate_pct",0))
            if ir > 0.5:  neg.append(f"High interest burden — {ir:.0%} of loan in interest")
            elif ir < 0.1: pos.append("Low interest rate — manageable repayment burden")
            dur = float(b.get("duration_days",7))
            if dur > 30: neg.append(f"Long loan term ({int(dur)} days) — higher default risk")
            else:        pos.append(f"Short-term loan ({int(dur)} days) — lower default risk")
            pl = int(b.get("prior_loans_count",0))
            pd_rate = float(b.get("prior_default_rate",0))
            if pl > 10 and pd_rate == 0: pos.append(f"Clean record — {pl} prior loans, zero defaults")
            elif pd_rate > 0.1:           neg.append(f"Prior defaults on record ({pd_rate:.0%} rate)")
            if int(b.get("is_new_borrower",0))==1: neg.append("First loan — no repayment history")
        else:
            mc=float(b.get("mm_consistency_score",0)); mo=float(b.get("mm_months_active",0))
            mi=float(b.get("mm_inflow_ratio",1));      pl=int(b.get("prior_loans_count",0))
            rr=b.get("repayment_rate",None)
            if mc>0.70: pos.append("Consistent mobile money usage pattern")
            elif mc<0.40: neg.append("Irregular mobile money transaction pattern")
            if mo>24: pos.append(f"Long mobile money history ({int(mo)} months)")
            elif mo<6: neg.append("Short mobile money history — under 6 months")
            if mi>1.25: pos.append("More money flowing in than out each month")
            elif mi<0.80: neg.append("More outflows than inflows on mobile money")
            if pl>0 and rr and not (isinstance(rr,float) and np.isnan(rr)):
                if float(rr)>0.85: pos.append(f"Strong repayment record — {float(rr):.0%} on time")
                elif float(rr)<0.60: neg.append(f"Weak repayment record — {float(rr):.0%} on time")
            if int(b.get("is_rounds_member",0))==1:
                rc=float(b.get("rounds_consistency_score",0))
                if rc>0.70: pos.append("Active, consistent savings group (rounds) member")
                else:       pos.append("Participates in a savings group (rounds/chama)")
                if int(b.get("is_rounds_organizer",0))==1:
                    pos.append("Organises a savings group — strong trust signal")
            z=float(b.get("zesa_payment_consistency",0))
            if z>0.70: pos.append("Pays ZESA electricity bills consistently")
            elif z<0.30: neg.append("Irregular ZESA payment history")
            y=float(b.get("years_in_business",0))
            if y>=3:  pos.append(f"{int(y)} years in business — established operator")
            elif y<1: neg.append("Under 1 year in business — limited track record")
            if int(b.get("has_fixed_location",0))==1: pos.append("Fixed, stable business location")
            if int(b.get("has_references",0))==1:     pos.append("Verified community references available")
            ad=float(b.get("airtime_regularity_days",14))
            if ad<5: pos.append("Frequent airtime top-ups — phone central to business")
            elif ad>20: neg.append("Infrequent airtime top-ups")
            if thin: neg.append("No prior loan or savings group history — thin credit file")
        return {"positives": pos[:6], "negatives": neg[:4]}

    def score_loan(self, loan):
        """Score a specific loan application (lender mode)."""
        ir = loan.get("interest_rate_pct",
                      (loan.get("total_amount_to_repay",0) -
                       loan.get("total_amount",1)) / max(loan.get("total_amount",1),1))
        pl = int(loan.get("prior_loans_count",5))
        pd_raw = float(loan.get("prior_defaults",0))

        row = {
            "interest_rate_pct":    ir,
            "loan_size_log":        np.log1p(loan.get("total_amount",5000)),
            "repay_ratio":          loan.get("total_amount_to_repay",5500)/max(loan.get("total_amount",5000),1),
            "duration_days":        loan.get("duration_days",7),
            "is_short_term":        int(loan.get("duration_days",7)<=7),
            "is_long_term":         int(loan.get("duration_days",7)>30),
            "lender_portion":       loan.get("lender_portion_funded",0.3),
            "lender_amount_log":    np.log1p(loan.get("amount_funded_by_lender",1500)),
            "is_new_borrower":      int(loan.get("new_versus_repeat","Repeat")=="New"),
            "loan_type_risk":       loan.get("loan_type_risk",0.02),
            "month_of_year":        loan.get("month",6),
            "day_of_week":          loan.get("day_of_week",1),
            "quarter":              loan.get("quarter",2),
            "cum_loans_before":     pl,
            "is_first_loan":        int(pl==0),
            "cum_defaults_before":  pd_raw,
            "prior_default_rate":   pd_raw/max(pl,1),
            "has_prior_default":    int(pd_raw>0),
            "amount_vs_avg":        loan.get("total_amount",5000)/max(loan.get("avg_loan_amount",5000),1),
            "days_since_last_loan": loan.get("days_since_last_loan",30),
            "rapid_reborrow":       int(loan.get("days_since_last_loan",30)<3),
            "cust_total_loans":     pl,
            "cust_avg_interest":    float(ir),
            "cust_avg_duration":    loan.get("duration_days",7),
            "cust_max_amount":      loan.get("total_amount",5000),
            "cust_avg_amount":      loan.get("avg_loan_amount",5000),
            "cust_loan_types":      1,
        }
        df = pd.DataFrame([row])[self.loan_features]
        raw_prob = float(self.loan_model.predict_proba(df)[0][1])
        zim_prob = float(np.clip(raw_prob * self.zim_factor, 0.01, 0.95))
        score = self._prob_to_score(zim_prob)
        band  = self._get_band(score)
        rev   = float(loan.get("monthly_revenue_usd",200))
        loan["interest_rate_pct"] = ir
        loan["prior_default_rate"] = pd_raw/max(pl,1)
        return {
            "score":               score,
            "band":                band["label"],
            "band_key":            band["key"],
            "score_range":         band["range"],
            "default_probability": round(zim_prob,4),
            "raw_model_prob":      round(raw_prob,6),
            "loan_recommendation": self._loan_rec(score,rev),
            "explanation":         self._explain(loan,False,loan_mode=True),
            "scoring_method":      "loan_model_real_data",
            "model_version":       "0.4.0",
            "auc":                 0.9459,
        }

    def score(self, borrower):
        """Score a borrower from behavioral signals (borrower mode)."""
        pl=int(borrower.get("prior_loans_count",0))
        rm=int(borrower.get("is_rounds_member",0))
        is_thin=(pl==0 and rm==0)
        rev=float(borrower.get("monthly_revenue_usd",150))

        raw={f:borrower.get(f,np.nan) for f in self.beh_features
             if f not in ("has_credit_history","is_thin_file","no_mm_no_history",
                          "repayment_rate_clean","mm_tenure_bucket",
                          "stability_score","mm_health","mobile_financial")}
        raw["repayment_rate"]=borrower.get("repayment_rate",np.nan)
        df=self._engineer_beh(pd.DataFrame([raw]))
        for c in self.beh_features:
            if c not in df.columns: df[c]=np.nan
        df=df[self.beh_features]
        beh_p=float(self.beh_model.predict_proba(df)[0][1])

        if is_thin:
            rp=self._thin_file_prob(borrower)
            fp=0.30*beh_p+0.70*rp; method="hybrid_thin_file"
        elif pl==0 and rm==1:
            rp=self._thin_file_prob(borrower)*0.85
            fp=0.55*beh_p+0.45*rp; method="hybrid_rounds_only"
        else:
            fp=beh_p; method="behavioral_model"

        score=self._prob_to_score(fp); band=self._get_band(score)
        return {
            "score":               score,
            "band":                band["label"],
            "band_key":            band["key"],
            "score_range":         band["range"],
            "default_probability": round(fp,4),
            "loan_recommendation": self._loan_rec(score,rev),
            "explanation":         self._explain(borrower,is_thin,loan_mode=False),
            "scoring_method":      method,
            "model_version":       "0.4.0",
        }

    def score_batch(self, borrowers): return [self.score(b) for b in borrowers]


# ── DEMO ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    engine = PamojaScoreEngine()
    W = 66

    print("="*W)
    print("  PAMOJA AI — Credit Score Engine v0.4")
    print("  Loan model: 55,305 real loans · AUC 0.9459")
    print("  Behavioral model: Findex Zimbabwe 2021 calibrated")
    print("="*W)

    # LOAN MODE
    print("\n  ── LOAN SCORING (lender submits application) ──\n")
    loans = [
        ("Tendai — Type_1 microfinance, clean history",
         {"interest_rate_pct":0.04,"total_amount":5000,"duration_days":7,
          "prior_loans_count":12,"prior_defaults":0,"new_versus_repeat":"Repeat",
          "lender_portion_funded":0.30,"days_since_last_loan":7,"monthly_revenue_usd":420}),
        ("Risky borrower — high-interest Type_9, prior default",
         {"interest_rate_pct":1.20,"total_amount":15000,"duration_days":60,
          "prior_loans_count":3,"prior_defaults":1,"new_versus_repeat":"Repeat",
          "lender_portion_funded":0.30,"days_since_last_loan":5,"monthly_revenue_usd":200}),
        ("First-time borrower — small Type_1 microfinance",
         {"interest_rate_pct":0.04,"total_amount":2000,"duration_days":7,
          "prior_loans_count":0,"prior_defaults":0,"new_versus_repeat":"New",
          "lender_portion_funded":0.12,"days_since_last_loan":999,"monthly_revenue_usd":120}),
    ]
    for name, loan in loans:
        r = engine.score_loan(loan); lr = r["loan_recommendation"]
        pct=(r["score"]-300)/550; bar="░"*int(pct*28)+"█"+"─"*(27-int(pct*28))
        print(f"  [{bar}]  {r['score']}  {r['band']}")
        print(f"  {name}")
        print(f"  Risk {r['default_probability']:.1%}  │  ${lr['recommended_limit_usd']:,} limit  │  {lr['suggested_rate_apr']} APR")
        for x in r["explanation"]["positives"][:1]: print(f"    ✓ {x}")
        for x in r["explanation"]["negatives"][:1]: print(f"    ✗ {x}")
        print()

    # BORROWER MODE
    print("\n  ── BORROWER SCORING (behavioral signals) ──\n")
    personas = [
        ("Tendai Moyo — Tuck shop, Chitungwiza",{
            "business_type":"tuck_shop","age":34,"years_in_business":4,
            "mm_consistency_score":0.82,"mm_months_active":38,"mm_inflow_ratio":1.35,
            "mm_avg_balance_usd":78,"mm_tx_count_monthly":45,
            "prior_loans_count":2,"repayment_rate":0.92,"days_late_recent_loan":3,
            "is_rounds_member":1,"rounds_consistency_score":0.88,"rounds_tenure_months":24,
            "zesa_payment_consistency":0.75,"rent_via_mobile":1,"rent_consistency_score":0.80,
            "monthly_revenue_usd":420,"revenue_cv":0.22,"pays_suppliers_on_time":1,
            "has_references":1,"has_fixed_location":1,"community_group_member":1,
        }),
        ("Farai Ncube — Thin file, first-time borrower",{
            "age":23,"years_in_business":0,"mm_consistency_score":0.38,
            "mm_months_active":8,"mm_inflow_ratio":0.85,"prior_loans_count":0,
            "is_rounds_member":0,"zesa_payment_consistency":0.28,
            "monthly_revenue_usd":120,"revenue_cv":0.90,"airtime_regularity_days":22,
        }),
        ("Amai Sibanda — 12yr market trader, strong rounds",{
            "age":45,"years_in_business":12,"mm_consistency_score":0.72,
            "mm_months_active":48,"mm_inflow_ratio":1.20,"prior_loans_count":0,
            "is_rounds_member":1,"rounds_consistency_score":0.91,"rounds_tenure_months":60,
            "is_rounds_organizer":1,"zesa_payment_consistency":0.82,
            "monthly_revenue_usd":280,"revenue_cv":0.28,"has_fixed_location":1,"has_references":1,
        }),
        ("Bongani — Kombi operator, prior default",{
            "age":28,"years_in_business":1,"mm_consistency_score":0.25,
            "mm_months_active":5,"mm_inflow_ratio":0.70,"prior_loans_count":1,
            "repayment_rate":0.45,"days_late_recent_loan":55,"is_rounds_member":0,
            "zesa_payment_consistency":0.15,"monthly_revenue_usd":95,"revenue_cv":1.2,
        }),
    ]
    for name, data in personas:
        r=engine.score(data); lr=r["loan_recommendation"]
        pct=(r["score"]-300)/550; bar="░"*int(pct*28)+"█"+"─"*(27-int(pct*28))
        print(f"  ┌{'─'*(W-2)}┐")
        print(f"  │  {name:<{W-5}}│")
        print(f"  │  [{bar}]  {r['score']}  {r['band']:<10}{' '*(W-52)}│")
        print(f"  │  Risk: {r['default_probability']:.1%}  Limit: ${lr['recommended_limit_usd']:,}  Rate: {lr['suggested_rate_apr']}  {r['scoring_method']:<25}│")
        print(f"  ├{'─'*(W-2)}┤")
        for x in r["explanation"]["positives"][:3]: print(f"  │  ✓  {x:<{W-7}}│")
        for x in r["explanation"]["negatives"][:2]: print(f"  │  ✗  {x:<{W-7}}│")
        print(f"  └{'─'*(W-2)}┘\n")
