'use client'
import React, { useEffect, useState } from 'react'
import { useAuth } from '../../components/AuthProvider'
import { useRouter } from 'next/navigation'
import { 
  Building2, Users, PieChart, BarChart3, 
  ArrowUpRight, ArrowDownRight, Activity, 
  Globe, Briefcase, PlusCircle
} from 'lucide-react'
import axios from 'axios'
import Link from 'next/link'

export default function SMEDashboard() {
  const { user, token, loading: authLoading } = useAuth()
  const router = useRouter()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total_scored: 0, avg_score: 0 })

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'sme')) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (token) {
      axios.get('/api/history', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          const data = res.data.history || []
          setHistory(data)
          if (data.length > 0) {
            const sum = data.reduce((acc: number, curr: any) => acc + curr.score, 0)
            setStats({ total_scored: data.length, avg_score: Math.round(sum / data.length) })
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [token, authLoading])

  if (authLoading || loading) return <div className="p-8 text-slate-500 animate-pulse">Loading SME insights...</div>

  return (
    <div className="max-w-6xl mx-auto space-y-8 fade-up">
      {/* SME Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white flex items-center gap-3">
            <Building2 className="text-brand" size={32} /> {user?.full_name} SME Portal
          </h1>
          <p className="text-slate-400 mt-1">Manage your business credit profile and score potential partners.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/lender" className="bg-brand hover:bg-brand-hover text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-brand/20 flex items-center gap-2">
            <PlusCircle size={18} /> New Batch Assessment
          </Link>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Assessments', value: stats.total_scored, sub: '+12% this month', icon: Users, color: 'text-brand' },
          { label: 'Average Score', value: stats.avg_score, sub: 'Tier 1 Quality', icon: Activity, color: 'text-green-400' },
          { label: 'Market Position', value: 'Top 5%', sub: 'Harare District', icon: Globe, color: 'text-sky-400' },
          { label: 'Credit Capacity', value: '$12.5k', sub: 'Calculated Limit', icon: Briefcase, color: 'text-purple-400' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-navy-2 border border-white/[0.06] rounded-xl p-5 group hover:border-white/[0.12] transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`${color} p-2 rounded-lg bg-white/[0.04]`}><Icon size={18} /></div>
              <ArrowUpRight size={14} className="text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
            <div className="text-[10px] text-green-400 mt-2 font-mono flex items-center gap-1">
              {sub}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Performance */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-navy-2 border border-white/[0.06] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <BarChart3 size={18} className="text-brand" /> Assessment History
              </h2>
              <select className="bg-navy border border-white/[0.08] text-xs text-slate-400 rounded-lg px-3 py-1.5 focus:outline-none">
                <option>Last 30 Days</option>
                <option>Last 6 Months</option>
              </select>
            </div>
            
            <div className="space-y-4">
              {history.slice(0, 5).map((h, i) => (
                <div key={h.id} className="flex items-center justify-between p-4 rounded-xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                      {h.borrower_name?.[0] || 'B'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{h.borrower_name || 'Anonymous Borrower'}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{new Date(h.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${h.score > 700 ? 'text-green-400' : 'text-yellow-400'}`}>{h.score}</div>
                    <div className="text-[10px] text-slate-600 uppercase tracking-tighter">{h.band}</div>
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <div className="py-12 text-center text-slate-600 italic text-sm">
                  Start scoring borrowers to populate this analytics chart.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <div className="bg-brand rounded-2xl p-6 text-white overflow-hidden relative group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
              <PieChart size={120} />
            </div>
            <h3 className="font-bold text-lg mb-2">Enhance Verification</h3>
            <p className="text-white/80 text-xs leading-relaxed mb-6">
              Connect your ZESA or City Council account to boost your business creditworthiness by up to 15%.
            </p>
            <button className="w-full py-2.5 bg-navy text-white text-xs font-bold rounded-xl hover:bg-navy-3 transition-colors">
              Link Accounts
            </button>
          </div>

          <div className="bg-navy-2 border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Risk Distribution</h3>
            <div className="space-y-4">
              {[
                { label: 'Low Risk', value: '65%', color: 'bg-green-400' },
                { label: 'Medium Risk', value: '25%', color: 'bg-yellow-400' },
                { label: 'High Risk', value: '10%', color: 'bg-red-400' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5 font-mono">
                    <span>{label}</span>
                    <span>{value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                    <div className={`h-full rounded-full ${color}`} style={{ width: value }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
