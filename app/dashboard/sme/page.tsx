'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '../../../components/AuthProvider'
import { useRouter } from 'next/navigation'
import { 
  TrendingUp, Award, Target, Zap, 
  ArrowRight, ShieldCheck, HelpCircle, 
  LineChart, Wallet, CreditCard, Sparkles, Plus, Users, ShoppingCart
} from 'lucide-react'
import axios from 'axios'

export default function SMEDashboard() {
  const { user, token, loading: authLoading } = useAuth()
  const router = useRouter()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Ledger state
  const [todaySales, setTodaySales] = useState(145.50)
  const [salesLogged, setSalesLogged] = useState(12)

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

  const handleLogSale = () => {
    setTodaySales(prev => prev + 25.00)
    setSalesLogged(prev => prev + 1)
  }

  if (authLoading || loading) return <div className="p-8 text-slate-500 animate-pulse">Loading dashboard...</div>
  
  // Use a simulated highly-engaged score if history is empty for demo purposes
  const latestScore = history.length > 0 ? history[0] : { score: 710, band: 'Good' }

  return (
    <div className="max-w-6xl mx-auto space-y-8 fade-up p-4 sm:p-0">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-teal/10 border border-accent-teal/20 text-accent-teal text-[10px] font-bold uppercase tracking-widest">
            <Sparkles size={10} /> Business OS
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900">Hello, {user?.full_name.split(' ')[0] || 'Trader'}!</h1>
          <p className="text-slate-500 mt-1">Your daily command center for sales, savings, and credit growth.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/customer')} className="btn-primary px-5 py-2 rounded-xl text-sm inline-flex items-center gap-2">
            Get Emergency Loan <Zap size={16} fill="currentColor" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Credit Tracker (Gamified) */}
        <div className="lg:col-span-2 glass-card-premium rounded-2xl p-6 md:p-8 relative overflow-hidden group border-brand/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
            {/* Minimal Gauge */}
            <div className="w-40 h-40 flex-shrink-0 relative flex items-center justify-center bg-white rounded-full shadow-[0_0_40px_rgba(37,99,235,0.1)] border-8 border-slate-50">
              <div className="text-center">
                <div className="text-4xl font-serif font-bold text-slate-900 tracking-tight">{latestScore.score}</div>
                <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${latestScore.score >= 800 ? 'text-emerald-600' : latestScore.score >= 700 ? 'text-lime-600' : 'text-amber-600'}`}>
                  {latestScore.band}
                </div>
              </div>
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                 <circle cx="80" cy="80" r="76" fill="none" stroke="rgba(37,99,235,0.1)" strokeWidth="8" />
                 <circle cx="80" cy="80" r="76" fill="none" stroke="#2563eb" strokeWidth="8" strokeLinecap="round" strokeDasharray="477" strokeDashoffset={477 - (477 * (latestScore.score / 1000))} className="transition-all duration-1000" />
              </svg>
            </div>
            
            <div className="flex-1 w-full space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Your Credit Power</h2>
                <div className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded uppercase tracking-widest font-bold">Tier 2 Active</div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500 font-medium">Progress to Tier 3 ($500 at 8%)</span>
                  <span className="text-brand font-bold">{latestScore.score} / 800</span>
                </div>
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${(latestScore.score / 800) * 100}%` }} />
                </div>
                <div className="mt-3 flex items-start gap-2 text-xs text-slate-600">
                  <Target size={14} className="text-brand flex-shrink-0 mt-0.5" />
                  <span>Log 8 more sales this week to unlock the next credit tier. Daily active users get priority funding.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Array */}
        <div className="glass-card-premium rounded-2xl p-6 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand/20 rounded-full blur-2xl" />
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6 border-b border-white/10 pb-4 relative z-10">Quick Actions</h3>
          <div className="space-y-3 relative z-10">
            <button onClick={handleLogSale} className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 transition-colors p-4 rounded-xl group border border-white/5 text-left">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-brand/30 flex items-center justify-center text-brand-hover"><ShoppingCart size={16} /></div>
                 <div>
                   <div className="text-sm font-bold">Log New Sale</div>
                   <div className="text-[10px] text-slate-400">Boosts credit tracking</div>
                 </div>
               </div>
               <Plus size={16} className="text-slate-400 group-hover:text-white transition-colors" />
            </button>
            <button className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 transition-colors p-4 rounded-xl group border border-white/5 text-left">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400"><CreditCard size={16} /></div>
                 <div>
                   <div className="text-sm font-bold">Pay ZESA / Rent</div>
                   <div className="text-[10px] text-slate-400">Strong utility signal</div>
                 </div>
               </div>
               <ArrowRight size={16} className="text-slate-400 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </div>

      {/* App Modules (Ledger & Mukando) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Digital Ledger Module */}
        <div className="glass-card-premium rounded-2xl p-6 md:p-8 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand flex items-center justify-center border border-brand/20">
                <LineChart size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Digital Sales Ledger</h2>
                <div className="text-xs text-slate-500 mt-0.5">Your daily verified income</div>
              </div>
            </div>
            <span className="px-2 py-1 bg-green-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest rounded-md border border-green-200">Active</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 mb-6 flex-1">
            <div className="flex justify-between items-end">
              <div>
                <div className="text-xs text-slate-500 mb-1">Total Sales Today</div>
                <div className="text-3xl font-serif font-bold text-slate-900 tracking-tight">
                  <span className="text-slate-400 mr-1">$</span>{todaySales.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-brand mb-1">Entries</div>
                <div className="text-xl font-mono text-slate-900">{salesLogged}</div>
              </div>
            </div>
            <div className="mt-5 pt-5 border-t border-slate-200 grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">This Week</div>
                <div className="text-sm font-bold text-slate-900">$842.00</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Top Item</div>
                <div className="text-sm font-bold text-slate-900 truncate">Maize Meal 10kg</div>
              </div>
            </div>
          </div>
          <button onClick={handleLogSale} className="w-full btn-outline py-3 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
            View Full Ledger
          </button>
        </div>

        {/* Mukando / Rounds Module */}
        <div className="glass-card-premium rounded-2xl p-6 md:p-8 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-200">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Mukando Tracker</h2>
                <div className="text-xs text-slate-500 mt-0.5">Community savings groups</div>
              </div>
            </div>
            <span className="px-2 py-1 bg-green-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest rounded-md border border-green-200">1 Active</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 mb-6 flex-1">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-sm font-bold text-slate-900">Mbare Traders Group</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">12 Members</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-1">Contribution</div>
                <div className="font-mono font-bold text-slate-900">$50 / week</div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                <span className="text-slate-500">Next Payout</span>
                <span className="font-bold text-slate-900">$600 (Your Turn)</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Scheduled Date</span>
                <span className="font-bold text-brand">14 April 2026</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors">
              Make Contribution
            </button>
            <button className="flex-1 btn-outline py-3 rounded-xl text-sm font-bold">
              Group Details
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
