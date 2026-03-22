'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthProvider'
import { useRouter } from 'next/navigation'
import { 
  TrendingUp, Award, Target, Zap, 
  ArrowRight, ShieldCheck, HelpCircle, 
  LineChart, Wallet, CreditCard
} from 'lucide-react'
import axios from 'axios'

export default function SMEDashboard() {
  const { user, token, loading: authLoading } = useAuth()
  const router = useRouter()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'sme')) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (token) {
      axios.get('/api/history', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setHistory(res.data.history || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    } else if (!authLoading) {
      setLoading(false)
    }
  }, [token, authLoading])

  if (authLoading || loading) return <div className="p-8 text-slate-500 animate-pulse">Loading dashboard...</div>
  
  const latestScore = history[0] || null

  return (
    <div className="max-w-6xl mx-auto space-y-8 fade-up">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">Hello, {user?.full_name.split(' ')[0]}!</h1>
          <p className="text-slate-400 mt-1">Your personal credit health and empowerment center.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-mono font-bold uppercase tracking-wider">
            Borrower Profile
          </div>
          <div className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-mono">
            ID: {user?.email.slice(0, 8)}...
          </div>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Card */}
        <div className="lg:col-span-2 bg-navy-2 border border-white/[0.06] rounded-2xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <Award size={180} />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            {/* Gauge Placeholder */}
            <div className="w-48 h-48 rounded-full border-[12px] border-white/[0.04] flex flex-col items-center justify-center relative">
               <div className="absolute inset-x-0 bottom-6 text-center">
                  <div className="text-4xl font-serif font-bold text-white leading-none">
                    {latestScore ? latestScore.score : '---'}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Score</div>
               </div>
               {/* Visual fill */}
               <svg className="absolute inset-0 -rotate-90 w-full h-full">
                  <circle 
                    cx="96" cy="96" r="84" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="12" 
                    strokeDasharray="527"
                    strokeDashoffset={latestScore ? 527 - (527 * (latestScore.score - 300) / 550) : 527}
                    className="text-brand transition-all duration-1000 ease-out"
                  />
               </svg>
            </div>

            <div className="flex-1 space-y-4 text-center md:text-left">
              <div>
                <h2 className="text-xl font-semibold text-white">Your Credit Stand</h2>
                <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                  <span className={`text-sm font-bold uppercase tracking-wider ${latestScore?.band === 'Excellent' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {latestScore ? latestScore.band : 'No data yet'}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-slate-600" />
                  <span className="text-xs text-slate-500">Updated today</span>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Your score is based on your Mobile Money patterns, ZESA payments, and community rounds participation. 
                Keep your inflow-to-outflow ratio high to improve.
              </p>
              <button 
                onClick={() => router.push('/customer')}
                className="inline-flex items-center gap-2 bg-white text-navy px-5 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
              >
                Refresh My Score <Zap size={14} fill="currentColor" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="space-y-6">
          <div className="bg-navy-2 border border-white/[0.06] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <ShieldCheck size={16} className="text-brand" /> Top Score Factor
            </h3>
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-green-400/5 border border-green-400/10">
                <div className="text-xs font-bold text-green-400 uppercase tracking-wider mb-1">Strong</div>
                <div className="text-sm text-white">MM Consistency</div>
                <div className="text-[10px] text-slate-500 mt-1">18 months of active transaction history.</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-400/5 border border-amber-400/10">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Needs Work</div>
                <div className="text-sm text-white">Inflow Ratio</div>
                <div className="text-[10px] text-slate-500 mt-1">Consider centralizing your sales payments.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         {[
           { label: 'Available Loans', value: '$250', icon: Wallet, color: 'text-brand' },
           { label: 'Interest Rate', value: '4.5%', icon: LineChart, color: 'text-green-400' },
           { label: 'Next Payment', value: '7 Apr', icon: CreditCard, color: 'text-amber-400' },
           { label: 'Empowerment Rank', value: 'Top 15%', icon: Target, color: 'text-purple-400' },
         ].map(({ label, value, icon: Icon, color }) => (
           <div key={label} className="bg-navy-2 border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors">
              <div className={`${color} mb-3`}><Icon size={20} /></div>
              <div className="text-lg font-bold text-white">{value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{label}</div>
           </div>
         ))}
      </div>

      {/* Score History Table */}
      <div className="bg-navy-2 border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="font-semibold text-white">Score History</h2>
          <HelpCircle size={16} className="text-slate-600 cursor-help" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02] text-[10px] uppercase tracking-widest text-slate-500 font-mono">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Score</th>
                <th className="px-6 py-4">Band</th>
                <th className="px-6 py-4">Key Reason</th>
                <th className="px-6 py-4 text-right">View Docs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {history.length > 0 ? history.map((h, i) => (
                <tr key={h.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 text-xs text-slate-400">
                    {new Date(h.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-white text-sm">
                    {h.score}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                      h.band === 'Excellent' ? 'bg-green-400/10 border-green-400/20 text-green-400' : 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400'
                    }`}>
                      {h.band}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">
                    {h.recommendation?.key_driver || 'Mobile money consistency'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-600 hover:text-brand transition-colors"><ArrowRight size={14} /></button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-600 text-sm italic">
                    No scores generated yet. Run your first assessment to see data here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
