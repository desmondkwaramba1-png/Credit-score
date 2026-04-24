import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, TrendingUp, Users, DollarSign, Activity, ChevronRight, Loader2 } from 'lucide-react';
import { predictCreditScore, fetchSystemHealth, API_BASE_URL, API_KEY } from '../api';
import './LenderDashboard.css';

// Pre-configured mock portfolio to demo the Enterprise view before connecting to live postgres endpoints
const MOCK_PORTFOLIO = [
  { id: '1', businessName: 'Mensah Trading Co.', score: 720, risk: 'LOW', pd: 0.12, loanAmnt: 12000, intent: 'EDUCATION' },
  { id: '2', businessName: 'Accra Logistics', score: 650, risk: 'MEDIUM', pd: 0.28, loanAmnt: 45000, intent: 'VENTURE' },
  { id: '3', businessName: 'Golden Seed Farms', score: 540, risk: 'HIGH', pd: 0.45, loanAmnt: 8000, intent: 'MEDICAL' },
  { id: '4', businessName: 'TechHub Africa', score: 780, risk: 'LOW', pd: 0.05, loanAmnt: 25000, intent: 'PERSONAL' },
  { id: '5', businessName: 'Osei Auto Spares', score: 610, risk: 'MEDIUM', pd: 0.32, loanAmnt: 15000, intent: 'DEBTCONSOLIDATION' },
  { id: '6', businessName: 'Creative Weavers', score: 490, risk: 'HIGH', pd: 0.62, loanAmnt: 5000, intent: 'HOMEIMPROVEMENT' },
];

const RiskBadge = ({ risk }) => {
  if (risk === 'LOW') return <span className="badge badge-low"><ShieldCheck size={12} className="inline mr-1"/> LOW RISK</span>;
  if (risk === 'MEDIUM') return <span className="badge badge-medium"><ShieldAlert size={12} className="inline mr-1"/> MEDIUM RISK</span>;
  return <span className="badge badge-high"><Shield size={12} className="inline mr-1"/> HIGH RISK</span>;
};

export default function LenderDashboard() {
  const [portfolio, setPortfolio] = useState([]);
  const [selectedBorrower, setSelectedBorrower] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // We'll simulate fetching the portfolio by hitting a batch predict on a few known users, 
    // or typically we'd create a specific /portfolio endpoint.
    // For now we will populate 3 demo profiles by hitting the API individually.
    const loadPortfolio = async () => {
      setLoading(true);
      try {
        const payload1 = {
             person_age: 35, person_income: 120000, person_home_ownership: "OWN",
             person_emp_length: 10, loan_intent: "EDUCATION", loan_grade: "B",
             loan_amnt: 5000, loan_int_rate: 9.5, loan_percent_income: 0.04,
             cb_person_default_on_file: "N", cb_person_cred_hist_length: 15
        };
        const payload2 = {
             person_age: 26, person_income: 38000, person_home_ownership: "RENT",
             person_emp_length: 2, loan_intent: "VENTURE", loan_grade: "D",
             loan_amnt: 15000, loan_int_rate: 15.5, loan_percent_income: 0.39,
             cb_person_default_on_file: "Y", cb_person_cred_hist_length: 3
        };
        const payload3 = {
             person_age: 29, person_income: 60000, person_home_ownership: "RENT",
             person_emp_length: 5, loan_intent: "MEDICAL", loan_grade: "B",
             loan_amnt: 25000, loan_int_rate: 11.0, loan_percent_income: 0.41,
             cb_person_default_on_file: "N", cb_person_cred_hist_length: 6
        };

        const [r1, r2, r3] = await Promise.all([
          predictCreditScore(payload1),
          predictCreditScore(payload2),
          predictCreditScore(payload3)
        ]);

        setPortfolio([
          { id: '1', businessName: 'Mensah Trading Co.', score: r1.credit_score, risk: r1.risk_level, pd: r1.probability_of_default, loanAmnt: payload1.loan_amnt, intent: payload1.loan_intent, shap: r1.shap_explanations },
           { id: '2', businessName: 'Accra Logistics', score: r2.credit_score, risk: r2.risk_level, pd: r2.probability_of_default, loanAmnt: payload2.loan_amnt, intent: payload2.loan_intent, shap: r2.shap_explanations },
            { id: '3', businessName: 'TechHub Africa', score: r3.credit_score, risk: r3.risk_level, pd: r3.probability_of_default, loanAmnt: payload3.loan_amnt, intent: payload3.loan_intent, shap: r3.shap_explanations }
        ]);
        
      } catch (e) {
        console.error("Failed to load portfolio from API", e);
      }
      setLoading(false);
    };
    
    loadPortfolio();
  }, []);

  // High level stats
  const totalExposure = portfolio.reduce((sum, b) => sum + b.loanAmnt, 0);
  const avgScore = portfolio.length ? Math.round(portfolio.reduce((sum, b) => sum + b.score, 0) / portfolio.length) : 0;
  const highRisk = portfolio.filter(b => b.risk === 'HIGH').length;

  return (
    <div className="lender-dashboard animate-fade-in">
      <header className="dashboard-header">
        <div>
          <h2>Lender Command Center</h2>
          <p className="text-muted">Real-time SME Portfolio Risk Analytics</p>
        </div>
        <div className="header-actions">
          <button className="btn-outline">Export Report</button>
          <button className="btn-primary">Batch Score New Leads</button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="metric-cards">
        <div className="glass-panel metric-card">
          <div className="metric-icon"><Users size={24} color="var(--primary)"/></div>
          <div className="metric-info">
            <p className="metric-label">Active SMEs</p>
            <h3 className="metric-value">{portfolio.length}</h3>
          </div>
        </div>
        <div className="glass-panel metric-card">
          <div className="metric-icon"><DollarSign size={24} color="var(--secondary)"/></div>
          <div className="metric-info">
            <p className="metric-label">Total Exposure</p>
            <h3 className="metric-value">${totalExposure.toLocaleString()}</h3>
          </div>
        </div>
        <div className="glass-panel metric-card">
          <div className="metric-icon"><TrendingUp size={24} color="var(--primary)"/></div>
          <div className="metric-info">
            <p className="metric-label">Average Score</p>
            <h3 className="metric-value">{avgScore}</h3>
          </div>
        </div>
        <div className="glass-panel metric-card">
          <div className="metric-icon"><Activity size={24} color="var(--danger)"/></div>
          <div className="metric-info">
            <p className="metric-label">High Risk Apps</p>
            <h3 className="metric-value">{highRisk}</h3>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Main Table */}
        <div className="glass-panel table-container">
          <div className="table-header">
            <h3>SME Portfolio</h3>
            <div className="table-search">
              <input type="text" placeholder="Search businesses..." className="search-input" />
            </div>
          </div>
          
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Business Name</th>
                <th>Credit Score</th>
                <th>Risk Level</th>
                <th>Prob. of Default</th>
                <th>Loan Amount</th>
                <th>Purpose</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-8 text-muted"><Loader2 className="animate-spin inline mr-2"/> Fetching Live Predictions...</td></tr>
              ) : (
                portfolio.map(borrower => (
                  <tr 
                    key={borrower.id} 
                    className={selectedBorrower?.id === borrower.id ? 'selected-row' : ''}
                    onClick={() => setSelectedBorrower(borrower)}
                  >
                    <td className="font-medium">{borrower.businessName}</td>
                    <td>{borrower.score}</td>
                    <td><RiskBadge risk={borrower.risk} /></td>
                    <td>{(borrower.pd * 100).toFixed(1)}%</td>
                    <td>${borrower.loanAmnt.toLocaleString()}</td>
                    <td className="text-muted text-sm">{borrower.intent}</td>
                    <td><ChevronRight size={16} className="text-muted"/></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Side Panel: SHAP Explanations */}
        {selectedBorrower ? (
          <div className="glass-panel shap-panel animate-fade-in">
            <div className="panel-header">
              <h3>AI Risk Analysis</h3>
              <RiskBadge risk={selectedBorrower.risk} />
            </div>
            
            <div className="borrower-summary">
              <h4>{selectedBorrower.businessName}</h4>
              <div className="stat-grid">
                <div className="stat-box">
                  <span className="label">Credit Score</span>
                  <span className="value">{selectedBorrower.score}</span>
                </div>
                <div className="stat-box">
                  <span className="label">Default Prob</span>
                  <span className="value">{(selectedBorrower.pd * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="shap-visualization">
              <h5 className="section-title">Key Score Drivers (SHAP)</h5>
              <p className="text-sm text-muted mb-4">Factors pushing the score up (green) or down (red).</p>
              
              {/* Live API SHAP Bars */}
              <div className="shap-bars">
                {selectedBorrower.shap?.top_features ? (
                  selectedBorrower.shap.top_features.map((feat, idx) => {
                    const isPositive = feat.impact > 0;
                    const maxImpact = Math.max(...selectedBorrower.shap.top_features.map(f => Math.abs(f.impact)));
                    // Calculate relative width based on the highest impact feature in this set (capped at 90%)
                    const pctWidth = Math.min((Math.abs(feat.impact) / (maxImpact || 1)) * 90, 95);

                    return (
                      <div className="shap-bar-item" key={idx}>
                        <div className="shap-bar-labels">
                          <span>{feat.label}</span>
                          <span className={isPositive ? 'text-danger' : 'text-success'}>
                            {isPositive ? '+' : ''}{feat.impact.toFixed(3)} impact
                          </span>
                        </div>
                        <div className="bar-track">
                          <div 
                            className={`bar ${isPositive ? 'fill-danger' : 'fill-success'}`} 
                            style={{width: `${pctWidth}%`}}>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                   <p className="text-muted">No SHAP explanations available.</p>
                )}
              </div>
            </div>
            
            <div className="action-button-group mt-6">
               <button className="btn-outline w-full mb-3">View Full Profile</button>
               <button className="btn-primary w-full">Request Re-Score</button>
            </div>
          </div>
        ) : (
          <div className="glass-panel shap-panel empty-state">
            <Shield size={48} className="text-muted mb-4 opacity-50"/>
            <h3>Select a Borrower</h3>
            <p className="text-muted text-center">Click on any SME in the portfolio table to view their detailed AI risk breakdown and SHAP feature importance.</p>
          </div>
        )}
      </div>
    </div>
  );
}
