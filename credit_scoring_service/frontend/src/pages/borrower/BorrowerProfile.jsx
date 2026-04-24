import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  RiArrowLeftLine, RiBuilding4Line, RiCalendarEventLine, RiShieldCheckLine,
  RiMoneyDollarCircleLine, RiPulseLine, RiArrowRightLine, RiSparklingLine,
  RiLoader4Line, RiErrorWarningLine, RiUser3Line
} from 'react-icons/ri';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, ScoreGauge, Skeleton, cn, staggerContainer, staggerItem } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8001/v1';

const RISK_STYLE = {
  LOW:    { bg: '#E6F9F2', color: '#00806D', border: '#B3EDD9' },
  MEDIUM: { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' },
  HIGH:   { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
};

export default function BorrowerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [borrower, setBorrower] = useState(null);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [error, setError] = useState(null);
  const [scoring, setScoring] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/borrowers/${id}`, {
          headers: { 'Authorization': `Bearer ${user?.access_token}` }
        });
        if (!res.ok) throw new Error('Borrower not found');
        const data = await res.json();
        setBorrower(data);

        // Fetch score history for this borrower
        const histRes = await fetch(`${API_BASE}/borrowers/${id}/scores`, {
          headers: { 'Authorization': `Bearer ${user?.access_token}` }
        });
        if (histRes.ok) {
          const histData = await histRes.json();
          setScoreHistory(Array.isArray(histData) ? histData : []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    if (user && id) fetchData();
  }, [user, id]);

  const handleRescore = async () => {
    if (!borrower) return;
    setScoring(true);
    try {
      // Use stored financial data to trigger a new score
      const res = await fetch(`${API_BASE}/score?mode=live`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token}`
        },
        body: JSON.stringify(borrower.last_payload || {
          person_age: 35,
          person_income: borrower.annual_income || 50000,
          person_home_ownership: 'RENT',
          person_emp_length: 5,
          loan_intent: 'VENTURE',
          loan_grade: 'B',
          loan_amnt: borrower.total_loan_amount || 20000,
          loan_int_rate: 12.5,
          loan_percent_income: 0.25,
          cb_person_default_on_file: 'N',
          cb_person_cred_hist_length: 4
        })
      });
      if (res.ok) {
        const newScore = await res.json();
        // Refresh borrower to pick up new score
        const refreshRes = await fetch(`${API_BASE}/borrowers/${id}`, {
          headers: { 'Authorization': `Bearer ${user?.access_token}` }
        });
        if (refreshRes.ok) setBorrower(await refreshRes.json());
        alert(`New score generated: ${newScore.credit_score} (${newScore.risk_level} Risk)`);
      }
    } catch (e) {
      alert('Rescoring failed: ' + e.message);
    } finally {
      setScoring(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2"><Skeleton className="h-7 w-64" /><Skeleton className="h-4 w-48" /></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-80 rounded-xl" />
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !borrower) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <RiErrorWarningLine className="text-5xl text-[#EF4444] mb-4" />
        <h2 className="text-xl font-black text-[#1A2035] mb-2">Borrower Not Found</h2>
        <p className="text-sm text-[#6B7A99] mb-6">{error || 'This borrower record does not exist or you lack access.'}</p>
        <Button onClick={() => navigate('/borrowers')}><RiArrowLeftLine /> Back to Explorer</Button>
      </div>
    );
  }

  const riskStyle = RISK_STYLE[borrower.risk_level?.toUpperCase()] || RISK_STYLE.MEDIUM;
  const latestScore = borrower.credit_score || 0;

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={staggerItem} className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/borrowers')} className="rounded-xl">
            <RiArrowLeftLine />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl font-black font-heading text-[#1A2035]">{borrower.business_name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E6F7FB] text-[#007FA3] border border-[#B3E5F0]">
                ID: {(borrower.borrower_id || id).slice(0, 8).toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-[#6B7A99] flex items-center gap-1.5">
              <RiBuilding4Line /> {borrower.category || 'Business'} · {borrower.country || 'Africa'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleRescore}
            disabled={scoring}
          >
            {scoring ? <RiLoader4Line className="animate-spin" /> : <RiSparklingLine />}
            {scoring ? 'Scoring…' : 'Recalculate Score'}
          </Button>
        </div>
      </motion.div>

      {/* Top Row: Score + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score Card */}
        <motion.div variants={staggerItem}>
          <Card className="flex flex-col items-center p-8 text-center" style={{ borderTop: '3px solid #00A8CB' }}>
            <p className="text-xs font-bold text-[#6B7A99] uppercase tracking-widest mb-4">Credit Score</p>
            <ScoreGauge score={latestScore} size={180} />
            <div className="mt-4 w-full">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: riskStyle.bg, color: riskStyle.color, border: `1px solid ${riskStyle.border}` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: riskStyle.color }} />
                {borrower.risk_level || 'MEDIUM'} Risk
              </span>
            </div>
            {scoreHistory.length > 0 && (
              <p className="text-[11px] text-[#6B7A99] mt-3">
                {scoreHistory.length} score{scoreHistory.length !== 1 ? 's' : ''} on record
              </p>
            )}
          </Card>
        </motion.div>

        {/* KPI Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            {
              label: 'Probability of Default',
              value: borrower.probability_of_default != null
                ? `${(borrower.probability_of_default * 100).toFixed(1)}%`
                : '—',
              icon: RiShieldCheckLine,
              iconBg: '#E6F9F2', iconColor: '#00806D',
              desc: 'Based on latest ML inference'
            },
            {
              label: 'Total Loan Exposure',
              value: borrower.total_loan_amount != null
                ? `$${Number(borrower.total_loan_amount).toLocaleString()}`
                : '—',
              icon: RiMoneyDollarCircleLine,
              iconBg: '#E6F7FB', iconColor: '#007FA3',
              desc: 'Active loan portfolio'
            },
            {
              label: 'Business Category',
              value: borrower.category || 'N/A',
              icon: RiBuilding4Line,
              iconBg: '#F0F3F8', iconColor: '#6B7A99',
              desc: borrower.country || 'Location not set'
            },
            {
              label: 'Contact',
              value: borrower.contact_phone || '—',
              icon: RiUser3Line,
              iconBg: '#E6F7FB', iconColor: '#00A8CB',
              desc: borrower.contact_email || 'No email on file'
            },
          ].map((s, i) => (
            <motion.div key={i} variants={staggerItem}>
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs font-bold text-[#6B7A99] uppercase tracking-widest">{s.label}</p>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.iconBg }}>
                      <s.icon style={{ color: s.iconColor, fontSize: '1.1rem' }} />
                    </div>
                  </div>
                  <h4 className="text-2xl font-black font-heading text-[#1A2035] truncate">{s.value}</h4>
                  <p className="text-xs text-[#6B7A99] mt-1">{s.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Score History */}
      {scoreHistory.length > 0 && (
        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle>Score History</CardTitle>
              <CardDescription>All credit scoring events for this borrower ({scoreHistory.length} total)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full tu-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Credit Score</th>
                      <th>Risk Level</th>
                      <th>Default Prob.</th>
                      <th>Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreHistory.slice(0, 10).map((s, i) => (
                      <tr key={i}>
                        <td className="text-[#6B7A99] text-xs">
                          {s.scored_at ? new Date(s.scored_at).toLocaleString() : '—'}
                        </td>
                        <td>
                          <span className="font-black font-heading" style={{
                            color: s.credit_score >= 750 ? '#00806D' : s.credit_score >= 670 ? '#007FA3' : s.credit_score >= 580 ? '#B45309' : '#B91C1C'
                          }}>{s.credit_score || '—'}</span>
                        </td>
                        <td>
                          {s.risk_level && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                              style={{
                                background: RISK_STYLE[s.risk_level]?.bg || '#F0F3F8',
                                color: RISK_STYLE[s.risk_level]?.color || '#6B7A99'
                              }}>
                              {s.risk_level}
                            </span>
                          )}
                        </td>
                        <td className="text-[#6B7A99] text-xs">
                          {s.probability_of_default != null ? `${(s.probability_of_default * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F0F3F8] text-[#6B7A99]">
                            {s.mode || 'test'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty state when no scores yet */}
      {scoreHistory.length === 0 && (
        <motion.div variants={staggerItem}>
          <Card className="text-center py-14 px-6 border-dashed border-2 border-[#C8D3E6]">
            <RiPulseLine className="text-4xl text-[#C8D3E6] mx-auto mb-3" />
            <h3 className="text-base font-black text-[#1A2035] mb-1">No Scores Yet</h3>
            <p className="text-sm text-[#6B7A99] mb-6">
              This borrower has not been scored. Click "Recalculate Score" to run the first assessment.
            </p>
            <Button onClick={handleRescore} disabled={scoring}>
              {scoring ? <RiLoader4Line className="animate-spin" /> : <RiSparklingLine />}
              Generate First Score
            </Button>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
