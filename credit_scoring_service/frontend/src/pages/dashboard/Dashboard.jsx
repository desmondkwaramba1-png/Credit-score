import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RiTeamLine, RiMoneyDollarCircleLine, RiPulseLine, RiAlertLine, RiSparklingLine, RiArrowRightUpLine, RiArrowRightDownLine, RiArrowRightLine } from 'react-icons/ri';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button, AnimatedCounter, ScoreGauge, Skeleton, cn, staggerContainer, staggerItem } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8001/v1';

const CHART_TOOLTIP = {
  backgroundColor: '#fff', border: '1px solid #E3E8F0', borderRadius: '10px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)', color: '#1A2035', fontSize: '0.8rem',
};

function KpiCard({ title, value, icon: Icon, change, changeLabel, iconBg, iconColor }) {
  const isPos = !String(change).startsWith('-');
  return (
    <motion.div variants={staggerItem}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-xs font-bold text-[#6B7A99] uppercase tracking-widest mb-2">{title}</p>
              <h3 className="text-3xl font-black font-heading text-[#1A2035]">{value}</h3>
              {change !== undefined && (
                <div className={cn('flex items-center gap-1 mt-2 text-xs font-semibold', isPos ? 'text-[#00806D]' : 'text-[#B91C1C]')}>
                  {isPos ? <RiArrowRightUpLine /> : <RiArrowRightDownLine />}
                  {change} <span className="text-[#6B7A99] font-normal">{changeLabel}</span>
                </div>
              )}
            </div>
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconBg || 'bg-[#E6F7FB]')}>
              <Icon className={cn('text-xl', iconColor || 'text-[#00A8CB]')} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const isLender = user?.user_type?.toLowerCase() === 'lender';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const endpoint = isLender
          ? `${API_BASE}/dashboard/stats`
          : `${API_BASE}/borrower/me?email=${user.email}`;
        const res = await fetch(endpoint, { headers: { 'Authorization': `Bearer ${user?.access_token}` } });
        setData(await res.json());
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      }
      setLoading(false);
    };
    if (user) fetchData();
  }, [user, isLender]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2"><Skeleton className="h-8 w-72" /><Skeleton className="h-4 w-52" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  /* ─── LENDER VIEW ─── */
  if (isLender) {
    return (
      <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={staggerItem} className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black font-heading text-[#1A2035]">Portfolio Overview</h1>
            <p className="text-sm text-[#6B7A99] mt-1">
              Monitoring <strong className="text-[#1A2035]">{data?.total_borrowers || 0}</strong> active SME accounts across your portfolio.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Download Report</Button>
            <Button>
              <RiSparklingLine /> Risk Assessment
            </Button>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard title="Total SMEs" value={<AnimatedCounter value={data?.total_borrowers || 0} />}
            icon={RiTeamLine} iconBg="bg-[#E6F7FB]" iconColor="text-[#00A8CB]" change="+8" changeLabel="this month" />
          <KpiCard title="Portfolio Exposure" value={<AnimatedCounter value={((data?.total_exposure||0)/1e6).toFixed(1)} prefix="$" suffix="M" />}
            icon={RiMoneyDollarCircleLine} iconBg="bg-[#E6F9F2]" iconColor="text-[#00806D]" change="+$1.2M" changeLabel="vs last month" />
          <KpiCard title="Avg Credit Score" value={<AnimatedCounter value={data?.avg_credit_score || 0} />}
            icon={RiPulseLine} iconBg="bg-[#E6F7FB]" iconColor="text-[#007FA3]" change="+12pts" changeLabel="vs last qtr" />
          <KpiCard title="At-Risk Accounts" value={<AnimatedCounter value={data?.at_risk_count || 0} />}
            icon={RiAlertLine} iconBg="bg-[#FEF2F2]" iconColor="text-[#B91C1C]" change="-3" changeLabel="this week" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Recent Activity */}
          <motion.div variants={staggerItem} className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Credit Events</CardTitle>
                <CardDescription>Latest scoring requests and status changes across your portfolio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data?.recent_activity?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-[#F5F7FA] transition-colors group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#E6F7FB] flex items-center justify-center font-bold text-[#00A8CB] text-sm border border-[#B3E5F0]">
                          {(item.name || 'U')[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#1A2035] group-hover:text-[#00A8CB] transition-colors">{item.name || 'Unknown Business'}</p>
                          <p className="text-xs text-[#6B7A99]">{item.action} · {new Date(item.time).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <RiArrowRightLine className="text-[#C8D3E6] group-hover:text-[#00A8CB] transition-colors" />
                    </div>
                  ))}
                  {(!data?.recent_activity || data.recent_activity.length === 0) && (
                    <div className="text-center py-8">
                      <div className="w-14 h-14 rounded-full bg-[#F0F3F8] flex items-center justify-center mx-auto mb-3">
                        <RiPulseLine className="text-2xl text-[#A8B8D0]" />
                      </div>
                      <p className="text-sm text-[#6B7A99]">No recent activity detected.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Insight Panel */}
          <motion.div variants={staggerItem}>
            <Card style={{ borderTop: '3px solid #00A8CB' }}>
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-[#E6F7FB] flex items-center justify-center">
                    <RiSparklingLine className="text-[#00A8CB]" />
                  </div>
                  <CardTitle>AI Insight</CardTitle>
                </div>
                <CardDescription>Powered by TransUnion-class ML</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-[#6B7A99]">
                  AI analysis indicates a <strong className="text-[#1A2035]">shift in default probability</strong> within retail sector SMEs. Bias audit passed: DIR = 0.91 ✓
                </p>
                <div className="p-3 rounded-xl bg-[#E6F9F2] border border-[#B3EDD9] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00B67A] animate-pulse-dot" />
                  <span className="text-xs font-bold text-[#00806D]">Model Fairness: Excellent</span>
                </div>
                <Button className="w-full">
                  <RiSparklingLine /> View Detailed Insights
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  /* ─── SME VIEW ─── */
  const score = data?.current_score || 0;
  const scoreBand = score >= 750 ? 'Excellent' : score >= 670 ? 'Good' : score >= 580 ? 'Fair' : 'Poor';

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={staggerItem} className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black font-heading text-[#1A2035]">My Credit Health</h1>
          <p className="text-sm text-[#6B7A99] mt-1">
            Insights for <strong className="text-[#1A2035]">{data?.business_name}</strong>
          </p>
        </div>
        <Button>
          <RiSparklingLine /> Request New Scoring
        </Button>
      </motion.div>

      {/* Score + History */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Score Gauge Card */}
        <motion.div variants={staggerItem}>
          <Card>
            <CardContent className="p-8 flex flex-col items-center text-center">
              <p className="text-xs font-bold text-[#6B7A99] uppercase tracking-widest mb-5">Your Credit Score</p>
              <ScoreGauge score={score} size={180} />
              <div className="mt-5 w-full space-y-2">
                {[
                  { label: 'Excellent', range: '750–850', color: '#00B67A', bg: '#E6F9F2' },
                  { label: 'Good',      range: '670–749', color: '#00A8CB', bg: '#E6F7FB' },
                  { label: 'Fair',      range: '580–669', color: '#F59E0B', bg: '#FEF3C7' },
                  { label: 'Poor',      range: '300–579', color: '#EF4444', bg: '#FEF2F2' },
                ].map(b => (
                  <div key={b.label} className={cn(
                    'flex justify-between items-center px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    scoreBand === b.label ? 'shadow-sm ring-1' : 'opacity-50'
                  )} style={scoreBand === b.label ? { background: b.bg, color: b.color, ringColor: b.color } : { background: '#F5F7FA', color: '#6B7A99' }}>
                    <span>{b.label}</span>
                    <span className="font-mono">{b.range}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Score History */}
        <motion.div variants={staggerItem} className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Score History</CardTitle>
              <CardDescription>Your credit score trend over the past 12 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.history?.map(h => ({ ...h, date: new Date(h.date).toLocaleDateString('en', { month: 'short' }) })) || []}>
                    <defs>
                      <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00A8CB" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#00A8CB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F3F8" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#A8B8D0', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} domain={['dataMin - 30', 'dataMax + 30']} tick={{ fill: '#A8B8D0', fontSize: 11 }} />
                    <Tooltip contentStyle={CHART_TOOLTIP} />
                    <Area type="monotone" dataKey="score" stroke="#00A8CB" strokeWidth={2.5} fill="url(#scoreGrad)" dot={{ fill: '#00A8CB', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recommendations + Integration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle>AI Recommendations</CardTitle>
              <CardDescription>Steps to improve your creditworthiness</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.recommendations?.map((rec, i) => (
                <div key={i} className="flex gap-3 p-4 rounded-xl bg-[#F5F7FA] border border-[#E3E8F0]">
                  <div className="w-6 h-6 rounded-full bg-[#E6F7FB] border border-[#B3E5F0] flex items-center justify-center text-xs font-bold text-[#00A8CB] shrink-0">{i+1}</div>
                  <p className="text-sm text-[#1A2035] leading-relaxed">{rec}</p>
                </div>
              ))}
              {(!data?.recommendations || data.recommendations.length === 0) && (
                <p className="text-sm text-[#6B7A99] italic text-center py-6">No recommendations yet. Request a score assessment.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card style={{ borderTop: '3px solid #00A8CB' }}>
            <CardHeader>
              <CardTitle>Integration Guide</CardTitle>
              <CardDescription>Connect your systems via the API Portal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-[#6B7A99] leading-relaxed">
                Automate your scoring pipeline. Use your API keys to integrate direct predictions into your internal systems in minutes.
              </p>
              <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8F0] font-mono text-xs text-[#1A2035] overflow-x-auto">
                POST /v1/predict<br />
                Authorization: Bearer {'<'}your-key{'>'}
              </div>
              <Button variant="outline" className="w-full">Go to Developer Portal</Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
