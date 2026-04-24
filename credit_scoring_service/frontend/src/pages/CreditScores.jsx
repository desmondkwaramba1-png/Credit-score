import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RiBarChartGroupedLine, RiShieldCheckLine, RiDownloadLine, RiInformationLine } from 'react-icons/ri';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button, FairnessMetric, Skeleton, cn, staggerContainer, staggerItem } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:8001/v1';

const CHART_TOOLTIP = {
  backgroundColor: '#fff', border: '1px solid #E3E8F0', borderRadius: '10px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)', color: '#1A2035', fontSize: '0.8rem',
};

const BAND_COLORS = { '300-580': '#EF4444', '580-670': '#F59E0B', '670-750': '#00A8CB', '750-850': '#00B67A' };

export default function CreditScores() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API_BASE}/analytics`, { headers: { 'Authorization': `Bearer ${user?.access_token}` } });
        setData(await res.json());
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    if (user) fetch_();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-80" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        </div>
        <Skeleton className="h-52 rounded-xl" />
      </div>
    );
  }

  const scoreDistWithColors = (data?.score_distribution || []).map(d => ({
    ...d, color: BAND_COLORS[d.range] || '#00A8CB'
  }));

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={staggerItem} className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black font-heading text-[#1A2035]">Credit Score Intelligence</h1>
          <p className="text-sm text-[#6B7A99] mt-1">Portfolio creditworthiness, score distribution, and fairness audit.</p>
        </div>
        <Button variant="outline">
          <RiBarChartGroupedLine /> Statistics Report
        </Button>
      </motion.div>

      {/* Stats + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left KPIs */}
        <div className="space-y-4">
          {[
            { label: 'Median Score',      value: data?.avg_credit_score || '—', change: '+12 pts', sub: 'vs last quarter', changePos: true },
            { label: 'Prime Borrowers',   value: '34.2%',                       change: '+5.1%',   sub: 'Scores > 720',    changePos: true },
            { label: 'Avg Default Risk',  value: data?.avg_default_prob || '—', change: '-2.3%',   sub: 'Portfolio avg',   changePos: false },
          ].map((s, i) => (
            <motion.div key={i} variants={staggerItem}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <p className="text-xs font-bold text-[#6B7A99] uppercase tracking-widest">{s.label}</p>
                  <div className="flex items-end justify-between mt-2">
                    <h3 className="text-3xl font-black font-heading text-[#1A2035]">{s.value}</h3>
                    <div className="text-right">
                      <p className={cn('text-xs font-bold flex items-center gap-0.5 justify-end', s.changePos ? 'text-[#00806D]' : 'text-[#00806D]')}>
                        {s.change}
                      </p>
                      <p className="text-[10px] text-[#A8B8D0]">{s.sub}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Score Distribution Chart */}
        <motion.div variants={staggerItem} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Score Distribution</CardTitle>
              <CardDescription>Number of SMEs across credit score brackets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreDistWithColors} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F3F8" />
                    <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fill: '#A8B8D0', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#A8B8D0', fontSize: 11 }} />
                    <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: '#F5F7FA' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {scoreDistWithColors.map((entry, index) => (
                        <Cell key={index} fill={entry.color} fillOpacity={0.9} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4 justify-center">
                {[
                  { label: 'Poor (300–580)',      color: '#EF4444', bg: '#FEF2F2' },
                  { label: 'Fair (580–670)',       color: '#F59E0B', bg: '#FEF3C7' },
                  { label: 'Good (670–750)',       color: '#00A8CB', bg: '#E6F7FB' },
                  { label: 'Excellent (750–850)',  color: '#00B67A', bg: '#E6F9F2' },
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: l.bg, color: l.color }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Fairness Audit Panel ── */}
      <motion.div variants={staggerItem}>
        <Card style={{ borderTop: '3px solid #00A8CB' }}>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#E6F7FB] flex items-center justify-center">
                  <RiShieldCheckLine className="text-[#00A8CB] text-lg" />
                </div>
                <div>
                  <CardTitle>Fairness Audit — Model v2.4.0</CardTitle>
                  <CardDescription>Bias-removal metrics using the 4/5ths rule and equalized odds</CardDescription>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E6F9F2] text-[#00806D] border border-[#B3EDD9] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00B67A]" /> Audit Passed
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <FairnessMetric label="Disparate Impact Ratio" value="0.91" benchmark={0.80} higherIsBetter={true} />
              <FairnessMetric label="Equal Opportunity Diff" value="0.05" benchmark={0.10} higherIsBetter={false} />
              <FairnessMetric label="Calibration Score" value="0.94" benchmark={0.85} higherIsBetter={true} />
              <FairnessMetric label="Group AUC Gap" value="0.03" benchmark={0.05} higherIsBetter={false} />
            </div>

            <div className="p-4 rounded-xl bg-[#F5F7FA] border border-[#E3E8F0]">
              <div className="flex items-start gap-3">
                <RiInformationLine className="text-[#00A8CB] text-lg shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#1A2035] mb-1">About This Model</h4>
                  <p className="text-sm text-[#6B7A99] leading-relaxed max-w-3xl">
                    Model v2.4.0 uses <strong className="text-[#1A2035]">data reweighing</strong> to correct for socioeconomic proxy bias in income-derived features.
                    Protected attributes are never used directly. Fairness is measured on income quantile groups using the{' '}
                    <strong className="text-[#1A2035]">4/5ths rule</strong> (Disparate Impact Ratio ≥ 0.80) and{' '}
                    <strong className="text-[#1A2035]">equalized odds</strong>. All metrics currently pass.
                  </p>
                  <div className="flex gap-3 mt-3">
                    <Button variant="link" className="p-0 h-auto text-xs">View Model Specs</Button>
                    <Button variant="link" className="p-0 h-auto text-xs">Calibration History</Button>
                    <Button variant="link" className="p-0 h-auto text-xs">Download Audit Report</Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
