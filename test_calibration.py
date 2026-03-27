import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), "api"))
from score_engine import PamojaScoreEngine

engine = PamojaScoreEngine(model_dir=os.path.join(os.getcwd(), "api", "models"))

personas = [
    ("Excellent", {
        "mm_consistency_score": 0.9, "mm_months_active": 48, "mm_inflow_ratio": 1.5,
        "mm_avg_balance_usd": 150, "mm_tx_count_monthly": 60, "years_in_business": 10,
        "has_fixed_location": 1, "has_references": 1, "monthly_revenue_usd": 1000, "revenue_cv": 0.1
    }),
    ("Average (Thin File)", {
        "mm_consistency_score": 0.5, "mm_months_active": 12, "mm_inflow_ratio": 1.0,
        "mm_avg_balance_usd": 40, "mm_tx_count_monthly": 20, "years_in_business": 2,
        "has_fixed_location": 1, "monthly_revenue_usd": 200, "revenue_cv": 0.4
    }),
    ("Risky (Thin File)", {
        "mm_consistency_score": 0.2, "mm_months_active": 3, "mm_inflow_ratio": 0.6,
        "mm_avg_balance_usd": 5, "mm_tx_count_monthly": 4, "years_in_business": 0,
        "has_fixed_location": 0, "monthly_revenue_usd": 60, "revenue_cv": 1.5,
        "zesa_payment_consistency": 0.1
    })
]

for name, data in personas:
    res = engine.score(data)
    print(f"Persona: {name}")
    print(f"  Score: {res['score']}")
    print(f"  Band:  {res['band']}")
    print(f"  Risk:  {res['default_probability']:.2%}")
    print("-" * 20)
