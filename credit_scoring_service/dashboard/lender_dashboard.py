"""
Lender Dashboard — Streamlit frontend.

Provides Loan Officers / Lenders with a portfolio-level view of all SMEs,
risk distributions, and detailed drill-downs into individual borrower
SHAP explanations.
"""

import os
import requests
import json
import pandas as pd
import streamlit as st
import plotly.express as px
from dotenv import load_dotenv

load_dotenv()

# Configuration
DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/credit_scoring_db")

st.set_page_config(page_title="Lender Command Center", page_icon="🏦", layout="wide")


# ── Database Connection ───────────────────────────────────────────────────────
@st.cache_resource
def get_db_connection():
    from sqlalchemy import create_engine
    return create_engine(DB_URL)


engine = get_db_connection()


# ── Data Fetching ─────────────────────────────────────────────────────────────
@st.cache_data(ttl=60)
def fetch_portfolio_data():
    """Fetch the latest credit score and profile for all SME borrowers."""
    query = """
        SELECT b.borrower_id, b.business_name, b.person_income,
               b.loan_amnt, b.loan_intent, b.loan_grade,
               cs.credit_score, cs.risk_level, cs.default_probability,
               cs.shap_explanations, cs.created_at AS scored_at
        FROM borrowers b
        JOIN LATERAL (
            SELECT * FROM credit_scores c
            WHERE c.borrower_id = b.borrower_id
            ORDER BY c.created_at DESC LIMIT 1
        ) cs ON true
    """
    return pd.read_sql(query, engine)


def fetch_audit_logs():
    """Fetch recent API usage logs."""
    query = """
        SELECT endpoint, status_code, duration_ms, timestamp
        FROM audit_logs
        ORDER BY timestamp DESC LIMIT 100
    """
    return pd.read_sql(query, engine)


# ── UI Construction ───────────────────────────────────────────────────────────

st.sidebar.title("🏦 Lender Portal")
lender_email = st.sidebar.text_input("Lender Email", value="ama@fintechgh.com")

if not lender_email:
    st.info("Please login to view portfolio.")
    st.stop()
    
# Check if user is actually a lender
auth_query = "SELECT user_type FROM users WHERE email=%s"
auth_df = pd.read_sql(auth_query, engine, params=(lender_email,))
if auth_df.empty or auth_df.iloc[0]["user_type"] != "lender":
    st.error("Access Denied: Lender privileges required.")
    st.stop()


st.title("SME Portfolio Overview")

df = fetch_portfolio_data()

if df.empty:
    st.info("No SME borrower data found in the portfolio.")
    st.stop()

# ── 1. High-Level Portfolio Stats ─────────────────────────────────────────────
st.markdown("### Portfolio Health")
col1, col2, col3, col4 = st.columns(4)

total_exposure = df["loan_amnt"].sum()
avg_score = df["credit_score"].mean()
high_risk_count = len(df[df["risk_level"] == "HIGH"])

with col1:
    st.metric("Total SMEs", len(df))
with col2:
    st.metric("Total Loan Exposure", f"${total_exposure:,.0f}")
with col3:
    st.metric("Average Credit Score", f"{avg_score:.0f}")
with col4:
    st.metric("High Risk Applications", high_risk_count, delta_color="inverse")

st.divider()

# ── 2. Risk Distribution Charts ───────────────────────────────────────────────
col_chart1, col_chart2 = st.columns(2)

with col_chart1:
    fig_risk = px.pie(
        df, names="risk_level", title="Portfolio Risk Distribution",
        color="risk_level",
        color_discrete_map={"LOW": "green", "MEDIUM": "orange", "HIGH": "red"}
    )
    st.plotly_chart(fig_risk, use_container_width=True)

with col_chart2:
    fig_hist = px.histogram(
        df, x="credit_score", nbins=20, title="Credit Score Distribution",
        color="risk_level",
        color_discrete_map={"LOW": "green", "MEDIUM": "orange", "HIGH": "red"}
    )
    st.plotly_chart(fig_hist, use_container_width=True)

st.divider()

# ── 3. Drill-down: SME Risk Table ─────────────────────────────────────────────
st.markdown("### 🔍 Borrower Deep Dive")

# Filters
f_col1, f_col2 = st.columns(2)
filter_risk = f_col1.multiselect("Filter by Risk Level", ["LOW", "MEDIUM", "HIGH"], default=["LOW", "MEDIUM", "HIGH"])
search_term = f_col2.text_input("Search Business Name")

filtered_df = df[df["risk_level"].isin(filter_risk)]
if search_term:
    filtered_df = filtered_df[filtered_df["business_name"].str.contains(search_term, case=False)]

# Display Table
display_cols = ["business_name", "credit_score", "risk_level", "default_probability", "loan_amnt", "loan_intent", "scored_at"]
st.dataframe(
    filtered_df[display_cols].style.format({
        "default_probability": "{:.1%}",
        "loan_amnt": "${:,.2f}"
    }),
    use_container_width=True
)

st.divider()

# ── 4. SHAP Explanations Profile ──────────────────────────────────────────────
st.markdown("### 🧠 AI Explanations (SHAP)")
st.write("Understand *why* the model assigned a specific score to an SME.")

selected_sme = st.selectbox("Select SME to view AI reasoning:", options=filtered_df["business_name"].tolist())

if selected_sme:
    sme_data = filtered_df[filtered_df["business_name"] == selected_sme].iloc[0]
    
    col_s1, col_s2, col_s3 = st.columns(3)
    col_s1.metric("Credit Score", sme_data["credit_score"])
    col_s2.metric("Risk Level", sme_data["risk_level"])
    col_s3.metric("Probability of Default", f"{sme_data['default_probability']:.1%}")
    
    shap_data = sme_data["shap_explanations"]
    if isinstance(shap_data, str):
        try:
            shap_data = json.loads(shap_data)
        except:
            shap_data = None
            
    if shap_data and "top_features" in shap_data:
        st.write("#### Top Factors Driving This Score")
        
        # Convert SHAP list to DataFrame for plotting
        shap_df = pd.DataFrame(shap_data["top_features"])
        
        # Determine color: positive impact (red = higher default risk), negative (green = lower risk)
        shap_df["color"] = shap_df["impact"].apply(lambda x: "red" if x > 0 else "green")
        shap_df["direction"] = shap_df["impact"].apply(lambda x: "Increases Risk" if x > 0 else "Decreases Risk")
        
        fig_shap = px.bar(
            shap_df, x="impact", y="label", orientation="h",
            color="color", color_discrete_map={"red": "#ff4b4b", "green": "#09ab3b"},
            title=f"Feature Impacts for {selected_sme}",
            hover_data={"value": True, "impact": True, "color": False}
        )
        fig_shap.update_layout(showlegend=False, yaxis={'categoryorder':'total ascending'})
        
        st.plotly_chart(fig_shap, use_container_width=True)
    else:
        st.info("No detailed SHAP explanation available for this prediction.")

st.divider()

# ── 5. System Audit Logs ──────────────────────────────────────────────────────
with st.expander("Show API Audit Logs", expanded=False):
    logs_df = fetch_audit_logs()
    if not logs_df.empty:
        st.dataframe(logs_df, use_container_width=True)
    else:
        st.write("No API logs found.")
