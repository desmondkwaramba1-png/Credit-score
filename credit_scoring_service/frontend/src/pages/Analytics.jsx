import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RiBarChartGroupedLine, RiPieChartLine, RiTimerFlashLine, RiArrowRightUpLine, RiArrowRightDownLine, RiInformationLine } from 'react-icons/ri';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ComposedChart, Line, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button, Skeleton, cn, staggerContainer, staggerItem } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:8001/v1';

const CHART_TOOLTIP = {
  backgroundColor: '#fff', border: '1px solid #E3E8F0',
  borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  color: '#1A2035', fontSize: '0.8rem',
};

const SECTOR_COLORS = ['#00A8CB', '#00B67A', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Analytics() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeRange, setActiveRange] = useState('YTD');

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
        <Skeleton className="h-9 w-72" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
      </div>
    );
  }

  const RANGES = ['1M', '3M', '6M', 'YTD', '1Y'];

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={staggerItem} className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black font-heading text-[#1A2035]">Advanced Analytics</h1>
          <p className="text-sm text-[#6B7A99] mt-1">Macro-level portfolio performance and predictive trend forecasting.</p>
        </div>
        <div className="flex items-center gap-1 bg-[#F0F3F8] rounded-xl p-1">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setActiveRange(r)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                activeRange === r ? 'bg-white text-[#00A8CB] shadow-sm' : 'text-[#6B7A99] hover:text-[#1A2035]'
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue Growth */}
        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle>Aggregate Revenue Growth</CardTitle>
              <CardDescription>Total monthly revenue across all managed SMEs vs target</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data?.revenue_trend || []}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00A8CB" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#00A8CB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F3F8" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#A8B8D0', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#A8B8D0', fontSize: 11 }} />
                    <Tooltip contentStyle={CHART_TOOLTIP} />
                    <Area type="monotone" dataKey="revenue" fill="url(#revGrad)" stroke="#00A8CB" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="targets" stroke="#00B67A" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 mt-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7A99]">
                  <span className="w-4 h-0.5 rounded bg-[#00A8CB] inline-block" /> Actual Revenue
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7A99]">
                  <span className="w-4 h-px border-dashed border-t-2 border-[#00B67A] inline-block" /> Target
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sector Exposure */}
        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle>Sector Exposure</CardTitle>
              <CardDescription>Capital allocation by business category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.sector_distribution || []} layout="vertical" barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F0F3F8" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#6B7A99', fontSize: 12 }} width={80} />
                    <Tooltip contentStyle={CHART_TOOLTIP} cursor={{ fill: '#F5F7FA' }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {(data?.sector_distribution || []).map((_, i) => (
                        <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { label: 'Avg Default Prob', value: data?.avg_default_prob || '—', icon: RiTimerFlashLine, trend: '-1.4%', pos: false, desc: 'Improving' },
          { label: 'Capital Velocity',  value: data?.capital_velocity  || '—', icon: RiBarChartGroupedLine, trend: '+0.2x', pos: true, desc: 'Accelerating' },
          { label: 'Risk-Adj ROI',      value: data?.risk_adjusted_roi || '—', icon: RiPieChartLine,        trend: '+2.1%', pos: true, desc: 'Optimized' },
        ].map((stat, i) => (
          <motion.div key={i} variants={staggerItem}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#E6F7FB] flex items-center justify-center text-[#00A8CB]">
                    <stat.icon className="text-lg" />
                  </div>
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-0.5',
                    stat.pos ? 'bg-[#E6F9F2] text-[#00806D]' : 'bg-[#E6F7FB] text-[#007FA3]'
                  )}>
                    {stat.pos ? <RiArrowRightUpLine /> : <RiArrowRightDownLine />}
                    {stat.trend}
                  </span>
                </div>
                <p className="text-xs font-bold text-[#6B7A99] uppercase tracking-widest">{stat.label}</p>
                <h4 className="text-2xl font-black font-heading text-[#1A2035] mt-1">{stat.value}</h4>
                <p className="text-xs text-[#A8B8D0] mt-1">{stat.desc} from previous cycle</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Alert Banner */}
      <motion.div variants={staggerItem}>
        <div className="p-4 rounded-xl flex items-start gap-4 border border-[#FDE68A]" style={{ background: '#FFFBEB' }}>
          <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0">
            <RiInformationLine className="text-[#F59E0B] text-lg" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-[#1A2035] mb-1">Sector Volatility Detected — Agri-SMEs</h4>
            <p className="text-sm text-[#6B7A99] leading-relaxed max-w-3xl">
              Predictive models have flagged a sharp increase in default probability for{' '}
              <strong className="text-[#1A2035]">Agri-SMEs</strong> in the Western Region due to seasonal variations.
              Consider adjusting credit limits for new applications in this cohort.
            </p>
            <Button variant="outline" size="sm" className="mt-3 border-[#FDE68A] text-[#B45309] hover:bg-[#FEF3C7]">
              Read Volatility Report
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
