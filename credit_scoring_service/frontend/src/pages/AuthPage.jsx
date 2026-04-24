import React, { useState } from 'react';
import { Shield, Mail, Lock, User, ChevronRight, Eye, EyeOff, Loader2, AlertCircle, Zap, BarChart3, Brain, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

const FEATURES = [
  { icon: Brain,     title: 'AI-Powered Scoring',     desc: 'Bias-free ML models with full SHAP explainability' },
  { icon: Zap,       title: 'Real-Time Analysis',      desc: 'Live credit risk scoring response in under 200ms' },
  { icon: BarChart3, title: 'Portfolio Intelligence',  desc: 'Macro analytics, fairness audits & trend forecasting' },
];

const TRUST_ITEMS = ['256-bit Encryption', 'SOC 2 Compliant', 'GDPR Ready'];

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [userType, setUserType] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'register' && !userType) {
      setError('Please select your account type to continue.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        await register({ name: form.name, email: form.email, password: form.password, user_type: userType });
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">

      {/* ═══ LEFT — Form Panel ═══ */}
      <div className="auth-form-panel">
        <motion.div
          className="auth-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-mark">
              <Shield size={22} color="white" />
            </div>
            <span className="auth-logo-name">CredAI</span>
          </div>

          {/* Heading */}
          <h2 className="auth-title">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Sign in to your credit intelligence dashboard.'
              : 'Join the AI-powered, bias-free credit platform.'}
          </p>

          {/* Role Selection (register) */}
          <AnimatePresence mode="wait">
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="role-selection-inner"
              >
                <p className="role-label">I am registering as a:</p>
                <div className="role-grid">
                  <button
                    type="button"
                    className={`role-card ${userType === 'lender' ? 'role-card-active-lender' : ''}`}
                    onClick={() => { setUserType('lender'); setError(''); }}
                  >
                    <Shield size={22} />
                    <span>Lender</span>
                  </button>
                  <button
                    type="button"
                    className={`role-card ${userType === 'sme' ? 'role-card-active-sme' : ''}`}
                    onClick={() => { setUserType('sme'); setError(''); }}
                  >
                    <User size={22} />
                    <span>SME Business</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Name field (register only) */}
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="input-group"
                >
                  <User size={16} className="input-icon" />
                  <input
                    type="text"
                    name="name"
                    placeholder="Full name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="auth-input"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="input-group">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                name="email"
                placeholder="Email address"
                value={form.email}
                onChange={handleChange}
                required
                className="auth-input"
              />
            </div>

            {/* Password */}
            <div className="input-group">
              <Lock size={16} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={8}
                className="auth-input"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(s => !s)}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="auth-error"
              >
                <AlertCircle size={15} />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Submit */}
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading
                ? <Loader2 size={20} className="animate-spin" />
                : (<>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                    <ChevronRight size={17} />
                  </>)
              }
            </button>
          </form>

          {/* Mode toggle */}
          <div className="auth-footer">
            {mode === 'login' ? (
              <p>Don't have an account?{' '}
                <button className="auth-link" onClick={() => { setMode('register'); setError(''); }}>Create one</button>
              </p>
            ) : (
              <p>Already have an account?{' '}
                <button className="auth-link" onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
              </p>
            )}
          </div>

          {/* Trust badges */}
          <div className="auth-trust">
            {TRUST_ITEMS.map(item => (
              <div className="auth-trust-item" key={item}>
                <CheckCircle size={12} style={{ color: '#00A8CB' }} />
                {item}
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ═══ RIGHT — Brand Hero Panel ═══ */}
      <div className="auth-hero">
        {/* Background shapes */}
        <div className="hero-shape hero-shape-1" />
        <div className="hero-shape hero-shape-2" />
        <div className="hero-shape hero-shape-3" />

        <div className="auth-hero-content">
          {/* Brand */}
          <motion.div
            className="hero-brand"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="hero-brand-icon">
              <Shield size={26} color="white" />
            </div>
            <h1 className="hero-brand-name">CredAI</h1>
          </motion.div>

          <motion.h2
            className="hero-title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Credit Intelligence,<br />Built on Trust.
          </motion.h2>

          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Enterprise credit scoring powered by bias-free machine learning,
            SHAP explainability, and real-time fairness monitoring.
          </motion.p>

          {/* Features */}
          <div className="hero-features">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={i}
                className="hero-feature-card"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              >
                <div className="feature-icon-wrap">
                  <feat.icon size={18} />
                </div>
                <div>
                  <h4>{feat.title}</h4>
                  <p>{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Score preview widget */}
          <motion.div
            className="hero-score-preview"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
          >
            <div>
              <p className="hero-score-label">Sample Credit Score</p>
              <p className="hero-score-num">742</p>
            </div>
            <div>
              <span className="hero-score-band">Good Standing</span>
              <div className="hero-stats" style={{ marginTop: '0.75rem' }}>
                <div className="hero-stat">
                  <span>98%</span>
                  <span>Model Accuracy</span>
                </div>
                <div className="hero-stat">
                  <span>0.92</span>
                  <span>Fairness Score</span>
                </div>
                <div className="hero-stat">
                  <span>&lt;200ms</span>
                  <span>Response</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
