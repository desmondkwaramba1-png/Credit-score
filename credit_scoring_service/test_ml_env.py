"""
Test script to verify ML model dependencies are installed and accessible.
"""

import sys

try:
    from app.ml.ml_models import (
        LogisticRegression,
        lgb,
        xgb,
        CatBoostClassifier,
        pd,
        np,
        joblib,
    )
    
    print("SUCCESS: All machine learning libraries imported correctly!")
    print(f"  scikit-learn LogisticRegression available.")
    print(f"  lightgbm version: {lgb.__version__}")
    print(f"  xgboost version: {xgb.__version__}")
    print(f"  catboost imported successfully.")
    print(f"  pandas version: {pd.__version__}")
    print(f"  numpy version: {np.__version__}")
    print(f"  joblib version: {joblib.__version__}")
    
    sys.exit(0)
except ImportError as e:
    print(f"ERROR: Failed to import one or more libraries. Details: {e}")
    sys.exit(1)
