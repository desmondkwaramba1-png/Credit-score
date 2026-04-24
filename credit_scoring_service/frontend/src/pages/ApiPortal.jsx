import React, { useState } from 'react';
import { Key, RefreshCw, Copy, CheckCircle, Terminal, Code, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './ApiPortal.css';

export default function ApiPortal() {
  const { user, rotateApiKey } = useAuth();
  const [rotating, setRotating] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState('');

  const handleRotate = async () => {
    if (!window.confirm('Are you sure? Your current API key will be invalidated immediately.')) return;
    setRotating(true);
    try {
      const key = await rotateApiKey();
      setNewKey(key);
    } catch (e) {
      alert('Failed to rotate key: ' + e.message);
    }
    setRotating(false);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const displayKey = newKey || `sk-${user?.user_type?.toLowerCase()}-${user?.name?.toLowerCase().replace(/\s+/g, '')}`;
  
  const curlExample = `curl -X POST http://localhost:8001/v1/predict-credit-score \\
  -H "Authorization: Bearer ${displayKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "person_age": 30,
    "person_income": 75000,
    "person_home_ownership": "RENT",
    "person_emp_length": 5,
    "loan_intent": "EDUCATION",
    "loan_grade": "B",
    "loan_amnt": 10000,
    "loan_int_rate": 10.5,
    "loan_percent_income": 0.13,
    "cb_person_default_on_file": "N",
    "cb_person_cred_hist_length": 7
  }'`;

  const pythonExample = `import requests

API_KEY = "${displayKey}"
API_URL = "http://localhost:8001/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

payload = {
    "person_age": 30,
    "person_income": 75000,
    "person_home_ownership": "RENT",
    "person_emp_length": 5,
    "loan_intent": "EDUCATION",
    "loan_grade": "B",
    "loan_amnt": 10000,
    "loan_int_rate": 10.5,
    "loan_percent_income": 0.13,
    "cb_person_default_on_file": "N",
    "cb_person_cred_hist_length": 7
}

response = requests.post(f"{API_URL}/predict-credit-score", json=payload, headers=headers)
result = response.json()
print(f"Credit Score: {result['credit_score']}")
print(f"Risk Level:   {result['risk_level']}")
print(f"Default Prob: {result['probability_of_default']:.2%}")`;

  return (
    <div className="api-portal animate-fade-in">
      <header className="dashboard-header">
        <div>
          <h2>Developer API Portal</h2>
          <p className="text-muted">Manage your API keys and integrate the CredAI scoring engine into your applications.</p>
        </div>
      </header>

      {/* API Key Card */}
      <div className="glass-panel api-key-card">
        <div className="api-key-header">
          <div className="api-key-icon">
            <Key size={24} color="var(--primary)" />
          </div>
          <div>
            <h3>Your API Key</h3>
            <p className="text-muted text-sm">Use this key to authenticate all API requests.</p>
          </div>
        </div>

        <div className="api-key-display">
          <code className="api-key-value">{displayKey}</code>
          <button
            className="icon-btn"
            onClick={() => copyToClipboard(displayKey, 'apikey')}
            title="Copy to clipboard"
          >
            {copied === 'apikey' ? <CheckCircle size={18} color="var(--secondary)" /> : <Copy size={18} />}
          </button>
        </div>

        <div className="api-key-meta">
          <span className="badge badge-low">Active</span>
          <span className="text-muted text-sm ml-3">Account Type: <strong>{user?.user_type === 'SME' ? 'SME / Business' : 'Lender / Fintech'}</strong></span>
        </div>

        <button className="btn-outline rotate-btn" onClick={handleRotate} disabled={rotating}>
          {rotating
            ? <><RefreshCw size={16} className="spinner" /> Rotating...</>
            : <><RefreshCw size={16} /> Rotate API Key</>
          }
        </button>

        {newKey && (
          <div className="rotate-success">
            <CheckCircle size={16} />
            <span>New key generated and saved! Your old key is no longer valid.</span>
          </div>
        )}
      </div>

      {/* Base URL Info */}
      <div className="glass-panel endpoint-info">
        <h3>Base URL</h3>
        <div className="code-block">
          <code>http://localhost:8001/v1</code>
          <button className="icon-btn" onClick={() => copyToClipboard('http://localhost:8001/v1', 'baseurl')}>
            {copied === 'baseurl' ? <CheckCircle size={16} color="var(--secondary)" /> : <Copy size={16} />}
          </button>
        </div>
        <div className="endpoint-list">
          <div className="endpoint-item">
            <span className="method-badge method-post">POST</span>
            <code>/predict-credit-score</code>
            <span className="text-muted text-sm">Single credit score prediction with SHAP explanations</span>
          </div>
          <div className="endpoint-item">
            <span className="method-badge method-post">POST</span>
            <code>/predict-batch</code>
            <span className="text-muted text-sm">Score up to 50 applicants in a single request</span>
          </div>
          <div className="endpoint-item">
            <span className="method-badge method-get">GET</span>
            <code>/health</code>
            <span className="text-muted text-sm">API health, DB status, and model availability check</span>
          </div>
        </div>
      </div>

      {/* Code snippets */}
      <div className="code-examples">
        <div className="glass-panel code-example-card">
          <div className="code-example-header">
            <Terminal size={18} color="var(--text-muted)" />
            <h4>cURL Example</h4>
            <button className="icon-btn ml-auto" onClick={() => copyToClipboard(curlExample, 'curl')}>
              {copied === 'curl' ? <CheckCircle size={16} color="var(--secondary)" /> : <Copy size={16} />}
            </button>
          </div>
          <pre className="code-snippet">{curlExample}</pre>
        </div>

        <div className="glass-panel code-example-card">
          <div className="code-example-header">
            <Code size={18} color="var(--text-muted)" />
            <h4>Python Example</h4>
            <button className="icon-btn ml-auto" onClick={() => copyToClipboard(pythonExample, 'python')}>
              {copied === 'python' ? <CheckCircle size={16} color="var(--secondary)" /> : <Copy size={16} />}
            </button>
          </div>
          <pre className="code-snippet">{pythonExample}</pre>
        </div>
      </div>
    </div>
  );
}
