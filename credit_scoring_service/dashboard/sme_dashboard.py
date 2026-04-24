"""
SME Dashboard — Streamlit frontend.

Provides SME owners with an overview of their credit profile,
historical scores, cash flow trends, and actionable recommendations
based on live predictions from the backend API.
"""

import os
import requests
import pandas as pd
import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# Configuration
API_URL = os.getenv("API_URL", "http://localhost:8000/v1")
API_KEY = os.getenv("VALID_API_KEYS", "sk-test-key-1234").split(",")[0]
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/credit_scoring_db")

HEADERS = {"Authorization": f"Bearer {API_KEY}"}

st.set_page_config(page_title="SME Credit Dashboard", page_icon="📈", layout="wide")


# ── Database Connection ───────────────────────────────────────────────────────
@st.cache_resource
def get_db_connection():
    from sqlalchemy import create_engine
    engine = create_engine(DB_URL)
    return engine


engine = get_db_connection()


# ── Data Fetching ─────────────────────────────────────────────────────────────
@st.cache_data(ttl=60)
def fetch_sme_profile(email: str):
    """Fetch user and borrower info."""
    query = """
        SELECT u.user_id, u.name, b.borrower_id, b.business_name,
               b.person_income, b.loan_amnt, b.person_age, b.person_emp_length,
               b.cb_person_cred_hist_length
        FROM users u
        JOIN borrowers b ON u.user_id = b.user_id
        WHERE u.email = %s AND u.user_type = 'SME'
        LIMIT 1
    """
    df = pd.read_sql(query, engine, params=(email,))
    return df.iloc[0].to_dict() if not df.empty else None


@st.cache_data(ttl=60)
def fetch_credit_history(borrower_id: str):
    """Fetch historical credit scores."""
    query = """
        SELECT credit_score, default_probability, risk_level, created_at AS scored_at, recommendations
        FROM credit_scores
        WHERE borrower_id = %s
        ORDER BY created_at ASC
    """
    return pd.read_sql(query, engine, params=(borrower_id,))


@st.cache_data(ttl=60)
def fetch_transactions(borrower_id: str):
    """Fetch transaction history."""
    query = """
        SELECT type, amount, transaction_date
        FROM transactions
        WHERE borrower_id = %s
        ORDER BY transaction_date DESC
    """
    return pd.read_sql(query, engine, params=(borrower_id,))


# ── UI Construction ───────────────────────────────────────────────────────────

st.sidebar.title("💳 SME Login")
sme_email = st.sidebar.text_input("Enter your email", value="kwame@sme-ghana.com")

if not sme_email:
    st.info("Please login to view your dashboard.")
    st.stop()

profile = fetch_sme_profile(sme_email)

if not profile:
    st.error("SME profile not found. Please check your email.")
    st.stop()

borrower_id = profile["borrower_id"]

st.title(f"Dashboard: {profile['business_name']}")
st.markdown(f"**Owner:** {profile['name']} | **Account ID:** `{str(borrower_id)[:8]}...`")

# Fetch data
scores_df = fetch_credit_history(borrower_id)
tx_df = fetch_transactions(borrower_id)

# ── 1. Top Level Metrics ──────────────────────────────────────────────────────
st.markdown("### Profile Overview")
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Annual Income", f"${profile['person_income']:,.0f}")
with col2:
    st.metric("Current Loan Req.", f"${profile['loan_amnt']:,.0f}")
with col3:
    if not scores_df.empty:
        latest_score = scores_df.iloc[-1]["credit_score"]
        st.metric("Latest Credit Score", f"{latest_score} / 850")
    else:
        st.metric("Latest Credit Score", "N/A")
with col4:
    if not scores_df.empty:
        risk = scores_df.iloc[-1]["risk_level"]
        color = "green" if risk == "LOW" else "orange" if risk == "MEDIUM" else "red"
        st.markdown(f"<h3 style='color:{color}'>{risk} Risk</h3>", unsafe_allow_html=True)
    else:
        st.metric("Risk Level", "N/A")

st.divider()

# ── 2. Historical Charts ──────────────────────────────────────────────────────
col_chart1, col_chart2 = st.columns(2)

with col_chart1:
    st.markdown("### Credit Score Journey")
    if not scores_df.empty:
        fig_score = px.line(
            scores_df, x="scored_at", y="credit_score",
            markers=True, title="Score over Time",
            range_y=[300, 850]
        )
        # Add risk tier bands
        fig_score.add_hrect(y0=300, y1=580, fillcolor="red", opacity=0.1, line_width=0)
        fig_score.add_hrect(y0=580, y1=720, fillcolor="orange", opacity=0.1, line_width=0)
        fig_score.add_hrect(y0=720, y1=850, fillcolor="green", opacity=0.1, line_width=0)
        st.plotly_chart(fig_score, use_container_width=True)
    else:
        st.info("No credit score history available.")

with col_chart2:
    st.markdown("### Cash Flow Trends")
    if not tx_df.empty:
        # Resample to weekly
        tx_df["week"] = tx_df["transaction_date"].dt.to_period("W").dt.start_time
        weekly_tx = tx_df.groupby(["week", "type"])["amount"].sum().reset_index()
        fig_tx = px.bar(
            weekly_tx, x="week", y="amount", color="type",
            title="Weekly Transactions by Type"
        )
        st.plotly_chart(fig_tx, use_container_width=True)
    else:
        st.info("No transaction history available.")

# ── 3. Recommendations & Insights ─────────────────────────────────────────────
st.markdown("### 💡 Actionable Recommendations")
if not scores_df.empty:
    latest_recs = scores_df.iloc[-1].get("recommendations", [])
    if isinstance(latest_recs, list) and latest_recs:
        for idx, rec in enumerate(latest_recs):
            st.info(rec)
    else:
        st.write("No specific recommendations at this time.")

st.divider()

# ── 4. Sandbox Simulator ──────────────────────────────────────────────────────
st.markdown("### 🧪 Sandbox: See how changes affect your score")
st.write("Predict your future score by adjusting your loan request details.")

with st.form("sandbox_form"):
    s_col1, s_col2, s_col3 = st.columns(3)
    with s_col1:
        sim_loan_amnt = st.number_input("New Loan Amount", value=float(profile['loan_amnt']), step=1000.0)
        sim_income = st.number_input("Projected Annual Income", value=float(profile['person_income']), step=1000.0)
    with s_col2:
        sim_intent = st.selectbox("Loan Purpose", ["EDUCATION", "MEDICAL", "VENTURE", "PERSONAL", "DEBTCONSOLIDATION", "HOMEIMPROVEMENT"])
        sim_int_rate = st.number_input("Expected Interest Rate (%)", value=11.5, step=0.5)
    with s_col3:
        # derive percent income
        sim_pct = sim_loan_amnt / sim_income if sim_income > 0 else 0
        st.metric("Simulated Loan-to-Income", f"{sim_pct*100:.1f}%")
        st.caption("Keeping this below 30% improves scores.")

    submit_sim = st.form_submit_button("Run Simulation")

if submit_sim:
    with st.spinner("Running ML Simulation..."):
        payload = {
            "person_age": int(profile["person_age"]),
            "person_income": sim_income,
            "person_home_ownership": "RENT", # default
            "person_emp_length": float(profile["person_emp_length"]),
            "loan_intent": sim_intent,
            "loan_grade": "B", # default
            "loan_amnt": sim_loan_amnt,
            "loan_int_rate": sim_int_rate,
            "loan_percent_income": sim_pct,
            "cb_person_default_on_file": "N",
            "cb_person_cred_hist_length": int(profile["cb_person_cred_hist_length"])
        }
        
        try:
            resp = requests.post(
                f"{API_URL}/predict-credit-score",
                json=payload,
                headers=HEADERS
            )
            if resp.status_code == 200:
                data = resp.json()
                st.success("Simulation Complete!")
                col_r1, col_r2, col_r3 = st.columns(3)
                col_r1.metric("Simulated Score", f"{data['credit_score']} / 850")
                col_r2.metric("Simulated Risk", data['risk_level'])
                col_r3.metric("Probability of Default", f"{data['probability_of_default']*100:.1f}%")
                
                exp = data.get("shap_explanations")
                if exp and "top_features" in exp:
                    st.write("**Top Score Drivers in Simulation:**")
                    for feat in exp["top_features"][:3]:
                        direction = "🔴 Increased Risk" if feat["impact"] > 0 else "🟢 Reduced Risk"
                        st.write(f"- {direction} | **{feat['label']}**")
            else:
                st.error(f"API Error {resp.status_code}: {resp.text}")
        except Exception as e:
            st.error(f"Connection error: {e}")
