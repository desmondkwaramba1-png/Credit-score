import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  RiArrowLeftLine, RiBuilding4Line, RiCalendarEventLine, RiShieldCheckLine,
  RiInformationLine, RiArrowRightUpLine, RiArrowRightDownLine,
  RiMoneyDollarCircleLine, RiPieChartLine, RiHistoryLine,
  RiPulseLine, RiArrowRightLine, RiSparklingLine, RiDownloadLine
} from 'react-icons/ri';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button, ScoreGauge, Skeleton, cn, staggerContainer, staggerItem } from '../../components/ui';

const CHART_TOOLTIP = {
  backgroundColor: '#fff', border: '1px solid #E3E8F0',
  borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  color: '#1A2035', fontSize: '0.8rem',
};

const MOCK_FINANCIAL = [
  { month: 'Jul', revenue: 15000, expenses: 11000 },
  { month: 'Aug', revenue: 18000, expenses: 12500 },
  { month: 'Sep', revenue: 14000, expenses: 13000 },
  { month: 'Oct', revenue: 22000, expenses: 15000 },
  { month: 'Nov', revenue: 25000, expenses: 16000 },
  { month: 'Dec', revenue: 28000, expenses: 17500 },
];

const SHAP_FEATURES = [
  { label: 'Annual Income',           impact:  0.124, positive: true },
  { label: 'Credit History Length',   impact:  0.089, positive: true },
  { label: 'Debt-to-Income Ratio',    impact: -0.045, positive: false },
  { label: 'Transaction Frequency',   impact:  0.067, positive: true },
  { label: 'Business Age',            impact: -0.012, positive: false },
];

export default function BorrowerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2"><Skeleton className="h-7 w-64" /><Skeleton className="h-4 w-48" /></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-80 rounded-xl" />
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-black font-heading text-[#1A2035]">Mensah Trading Co.</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E6F7FB] text-[#007FA3] border border-[#B3E5F0]">
                ID: SME-92841
              </span>
            </div>
            <p className="text-sm text-[#6B7A99] flex items-center gap-1.5">
              <RiBuilding4Line /> Retail & Wholesale · Accra, Ghana
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><RiDownloadLine /> Download Dossier</Button>
          <Button><RiSparklingLine /> Recalculate Score</Button>
        </div>
      </motion.div>

      {/* Top Row: Score + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Score Card */}
        <motion.div variants={staggerItem}>
          <Card className="flex flex-col items-center p-8 text-center" style={{ borderTop: '3px solid #00A8CB' }}>
            <p className="text-xs font-bold text-[#6B7A99] uppercase tracking-widest mb-4">Credit Score</p>
            <ScoreGauge score={720} size={180} />
            <div className="mt-5 w-full p-3 rounded-xl bg-[#F5F7FA] border border-[#E3E8F0] text-sm text-[#6B7A99] text-left">
              <span className="font-bold text-[#1A2035]">Top 15%</span> of retail SMEs in this region.
            </div>
          </Card>
        </motion.div>

        {/* KPI Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Probability of Default', value: '12.4%',   icon: RiShieldCheckLine,       pos: true,  desc: 'Down 2.1% this quarter',    iconBg: '#E6F9F2', iconColor: '#00806D' },
            { label: 'Monthly Revenue',         value: '$28,400', icon: RiMoneyDollarCircleLine, pos: true,  desc: 'Highest in 12 months',      iconBg: '#E6F7FB', iconColor: '#007FA3' },
            { label: 'Business Age',            value: '3.5 Yrs', icon: RiCalendarEventLine,     pos: null,  desc: 'Registration: Jan 2021',    iconBg: '#F0F3F8', iconColor: '#6B7A99' },
            { label: 'Transaction Frequency',   value: '142/mo',  icon: RiPulseLine,             pos: true,  desc: '+12% transaction volume',   iconBg: '#E6F7FB', iconColor: '#00A8CB' },
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
                  <h4 className="text-2xl font-black font-heading text-[#1A2035]">{s.value}</h4>
                  <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium', s.pos === true ? 'text-[#00806D]' : s.pos === false ? 'text-[#B91C1C]' : 'text-[#6B7A99]')}>
                    {s.pos === true && <RiArrowRightUpLine />}
                    {s.pos === false && <RiArrowRightDownLine />}
                    {s.desc}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* SHAP + Cash Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* SHAP Explainability */}
        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI Decision Drivers</CardTitle>
                  <CardDescription>SHAP values — feature contribution to the credit score</CardDescription>
                </div>
                <RiPieChartLine className="text-xl text-[#C8D3E6]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {SHAP_FEATURES.map((f, i) => (
                <motion.div key={i} className="space-y-1.5"
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-[#1A2035]">{f.label}</span>
                    <span style={{ color: f.positive ? '#00806D' : '#B91C1C' }}>
                      {f.positive ? '+' : ''}{f.impact.toFixed(3)} impact
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full overflow-hidden bg-[#F0F3F8]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: f.positive ? 'linear-gradient(90deg, #00B67A, #00A8CB)' : 'linear-gradient(90deg, #EF4444, #F87171)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.abs(f.impact) * 400}%` }}
                      transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                </motion.div>
              ))}
              <div className="pt-3 border-t border-[#E3E8F0] mt-2">
                <p className="text-xs text-[#A8B8D0]">
                  SHAP values measure each feature's contribution to the model's prediction vs. the portfolio average. No protected attributes used.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Cash Flow Chart */}
        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cash Flow Analysis</CardTitle>
                  <CardDescription>Revenue vs. Operating Expenses — Last 6 Months</CardDescription>
                </div>
                <RiHistoryLine className="text-xl text-[#C8D3E6]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_FINANCIAL} barGap={4} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F3F8" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#A8B8D0', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#A8B8D0', fontSize: 11 }}
                      tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={CHART_TOOLTIP} formatter={v => [`$${v.toLocaleString()}`, '']} />
                    <Bar dataKey="revenue"  fill="#00A8CB" radius={[5,5,0,0]} name="Revenue" fillOpacity={0.85} />
                    <Bar dataKey="expenses" fill="#E3E8F0" radius={[5,5,0,0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-5 mt-3 justify-center">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7A99]">
                  <span className="w-3 h-3 rounded-sm" style={{ background: '#00A8CB' }} /> Revenue
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7A99]">
                  <span className="w-3 h-3 rounded-sm bg-[#E3E8F0] border border-[#C8D3E6]" /> Expenses
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Risk Committee Recommendations */}
      <motion.div variants={staggerItem}>
        <Card style={{ borderLeft: '4px solid #F59E0B' }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                <RiInformationLine className="text-[#F59E0B] text-lg" />
              </div>
              <div>
                <CardTitle>Risk Committee Recommendations</CardTitle>
                <CardDescription>AI-generated strategic actions for this borrower</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { tag: 'Strategy',   title: 'Approve with Buffer',  desc: 'Strong resilience detected. Capital injection of $50k recommended with 90-day review.', tagBg: '#E6F7FB', tagColor: '#007FA3' },
                { tag: 'Vigilance', title: 'Monthly Monitoring',   desc: 'High revenue volatility in Sept. Review mobile money statements monthly.', tagBg: '#FEF3C7', tagColor: '#B45309' },
                { tag: 'Loyalty',   title: 'Priority Reward',      desc: 'Eligible for "Tier 1 Partner" status. Reduces interest rate by 0.5% on next loan.', tagBg: '#E6F9F2', tagColor: '#00806D' },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl border border-[#E3E8F0] bg-[#FAFBFC] flex flex-col justify-between hover:shadow-sm transition-shadow">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mb-3"
                      style={{ background: item.tagBg, color: item.tagColor }}>
                      {item.tag}
                    </span>
                    <h5 className="font-bold text-sm text-[#1A2035] mb-1">{item.title}</h5>
                    <p className="text-xs text-[#6B7A99] leading-relaxed">{item.desc}</p>
                  </div>
                  <button className="mt-4 flex items-center gap-1 text-xs font-bold text-[#00A8CB] hover:text-[#007FA3] transition-colors">
                    View Details <RiArrowRightLine />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
