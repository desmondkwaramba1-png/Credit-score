# End-to-End AI Credit Scoring Platform

> A full-stack AI-powered credit scoring and SME insights platform. Built with **FastAPI**, **PostgreSQL**, **Streamlit**, and **PyTorch TabNet**. Designed for fintechs, lenders, and SMEs.

---

## 🌟 Platform Highlights

1. **AI Inference API (FastAPI)**: Real-time credit scoring using an ensemble ML model trained on the Kaggle Credit Risk Dataset.
2. **PostgreSQL Database**: Robust data schema storing Users, SMEs (Borrowers), Transaction history, Audit Logs, and Credit Scores.
3. **Explainable AI (SHAP)**: Every score includes SHAP feature importance to explain the AI's reasoning.
4. **Actionable Recommendations**: Generates tailored financial advice based on the SME's risk profile and feature values.
5. **SME Dashboard (Streamlit)**: SME portal to view score history, cash flow trends, and a Sandbox Simulator to test how changing loan amounts affects their score.
6. **Lender Dashboard (Streamlit)**: Portfolio command center with drill-down views, pie charts, and full audit logs.
7. **Audit Logging**: Immutable logging middleware that records all API requests and responses.

---

## 🏗️ Project Architecture

```
credit_scoring_service/
├── app/
│   ├── api/routes.py           # /predict-credit-score, /predict-batch
│   ├── database/
│   │   ├── db.py               # SQLAlchemy engine
│   │   └── models.py           # ORM: User, Borrower, CreditScore, Transaction, AuditLog
│   ├── services/
│   │   ├── scoring_service.py  # Orchestrates the scoring pipeline
│   │   ├── shap_service.py     # Generate SHAP explanations
│   │   └── recommendations.py  # SME advice engine
│   ├── middleware/
│   │   └── audit_logger.py     # Request/Response DB logging
│   └── ml/model.pkl            # Trained TabNet Ensemble tracking model
├── database/
│   └── db.sql                  # Raw SQL Schema + Sample Data (auto-loads in Docker)
├── dashboard/
│   ├── sme_dashboard.py        # Streamlit SME Portal
│   └── lender_dashboard.py     # Streamlit Lender Portal
├── docker-compose.yml
└── requirements.txt
```

---

## 🚀 Quick Start (Docker)

The absolute easiest way to run the entire platform is with Docker.

```bash
docker compose up --build
```

**Services will be available at:**
- **FastAPI Docs (Swagger)**: http://localhost:8000/docs
- **SME Dashboard**: http://localhost:8501  *(Login: `kwame@sme-ghana.com`)*
- **Lender Dashboard**: http://localhost:8502 *(Login: `ama@fintechgh.com`)*

*(Note: On first startup, PostgreSQL will automatically run `database/db.sql` to create the tables and populate sample data).*

---

## 💻 Running Locally (Without Docker)

If you prefer to run the components manually on your machine:

### 1. Setup PostgreSQL
Create a database named `credit_scoring_db` and run the schema file:
```bash
psql -U postgres -d credit_scoring_db -f database/db.sql
```

### 2. Configure Environment
Copy `.env.example` to `.env` and set:
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/credit_scoring_db
VALID_API_KEYS=sk-lender-ama-0001,sk-sme-kwame-0001
```

### 3. Start the Backend API
```bash
# In an activated virtualenv
pip install -r requirements.txt
uvicorn app.api.main:app --reload --port 8000
```

### 4. Start the Dashboards
Open two new terminal tabs and run:
```bash
# Terminal 1: SME View
streamlit run dashboard/sme_dashboard.py --server.port=8501

# Terminal 2: Lender View
streamlit run dashboard/lender_dashboard.py --server.port=8502
```

---

## 📡 API Reference

### `POST /v1/predict-credit-score`

Evaluates an SME borrower and returns their credit score, along with AI explanations.

**Headers:** `Authorization: Bearer sk-lender-ama-0001`

**Request:**
```json
{
  "person_age": 28,
  "person_income": 55000,
  "person_home_ownership": "RENT",
  "person_emp_length": 4.0,
  "loan_intent": "EDUCATION",
  "loan_grade": "B",
  "loan_amnt": 12000,
  "loan_int_rate": 11.5,
  "loan_percent_income": 0.22,
  "cb_person_default_on_file": "N",
  "cb_person_cred_hist_length": 5
}
```

**Response (200 OK):**
```json
{
  "borrower_id": "a1b2c3d4-...",
  "credit_score": 720,
  "probability_of_default": 0.1800,
  "risk_level": "LOW",
  "shap_explanations": {
    "top_features": [
      {
        "feature": "loan_to_income_ratio",
        "label": "Loan-to-Income Ratio",
        "value": 0.2181,
        "impact": 0.0763
      }
    ],
    "method": "rule_based"
  },
  "recommendations": [
    "✅ Your risk profile is LOW. Keep up your current financial practices.",
    "📱 Use mobile money consistently to build a verifiable digital financial trail."
  ],
  "scored_at": "2026-03-14T12:00:00Z"
}
```

---

## Security & Compliance
- **Audit Logging**: Every request payload, response payload, and IP is stored immutably in the PostgreSQL `audit_logs` table.
- **Explainability**: Black-box predictions are supplemented with top-5 SHAP feature drivers so lenders can justify decisions to regulatory bodies.
- **Role-Based Views**: Dashboards query Postgres to verify the signed-in user's `user_type` before displaying sensitive data.

## 🚀 Deployment to Render

This repository is optimized for deployment on [Render](https://render.com) using the included `render.yaml` blueprint.

### Steps to Deploy:
1. **Connect to Render**: Log in to your Render dashboard and click **"New"** -> **"Blueprint"**.
2. **Connect GitHub**: Connect your GitHub repository (`Credit-score`).
3. **Approve Blueprint**: Render will automatically detect the `render.yaml` file and show the services to be created (DB, Redis, API, and Frontend).
4. **Deploy**: Click **"Apply"**.
5. **Update CORS (Optional)**: Once the frontend is deployed, you should update the `CORS_ORIGINS` environment variable in the `credit-scoring-api` service settings to match your frontend URL (e.g., `https://credit-scoring-frontend.onrender.com`) for better security.

### Environment Variables
The blueprint handles most configuration, but you can override these in the Render dashboard:
- `JWT_SECRET`: Automatically generated, but can be customized.
- `CORS_ORIGINS`: Set to `*` by default for the first deploy.
- `DATABASE_URL`: Linked automatically to the managed PostgreSQL.
- `REDIS_URL`: Linked automatically to the managed Redis.
