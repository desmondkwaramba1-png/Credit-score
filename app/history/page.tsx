'use client'
import { useState, useEffect } from 'react'
import { ScoreCard } from '../../components/ScoreCard'
import { BarChart3, TrendingUp, AlertCircle, Search, Clock, ChevronRight, PieChart, Activity, X, Sparkles } from 'lucide-react'
import { useAuth } from '../../components/AuthProvider'
import { useRouter } from 'next/navigation'
import axios from 'axios'

interface HistoryItem {
  id: string
  timestamp: string
  borrowerName: string
  phone: string
  result: any
}

const BAND_COLOR: Record<string, string> = {
  'Excellent': 'text-emerald-600',
  'Good':      'text-lime-400',
  'Fair':      'text-amber-600',
  'Poor':      'text-orange-400',
  'Very Poor': 'text-rose-600',
}

export default function HistoryPage() {
  const { user, token, loading: authLoading } = useAuth()
  const router = useRouter()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selected, setSelected] = useState<HistoryItem | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    const fetchHistory = async () => {
      setLoading(true)
      try {
        const res = await axios.get('/api/history', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setHistory(res.data.history.map((h: any) => {
          const result = {
            score: h.score,
            band: h.band,
            band_key: (h.band || 'Fair').toLowerCase().replace(' ', '_'),
            score_range: h.score >= 750 ? '750–1000' : h.score >= 650 ? '650–749' : h.score >= 550 ? '550–649' : h.score >= 450 ? '450–549' : '0–449',
            default_probability: h.default_probability || (1 - (h.score/1000)),
            scoring_method: h.scoring_method || 'weighted_composite_v1.0',
            model_version: '1.0.0',
            loan_recommendation: h.recommendation || {
              recommended_limit_usd: 0,
              suggested_rate_apr: '—',
              rate_float: 0
            },
            explanation: {
              positives: ['Institutional record verified', 'Identity matched'],
              negatives: []
            }
          }
          return {
            id: String(h.id),
            timestamp: h.created_at,
            borrowerName: h.borrower_name,
            phone: h.phone,
            result: result
          }
        }))
      } catch (e) {
        const raw = localStorage.getItem('pamoja_score_history')
        if (raw) setHistory(JSON.parse(raw))
      } finally {
        setLoading(false)
      }
    }

    if (user) fetchHistory()
  }, [user, authLoading, router, token])

  if (authLoading) return <div className="p-8 text-slate-500 animate-pulse">Checking authorization...</div>

  const clear = () => { localStorage.removeItem('pamoja_score_history'); setHistory([]); setSelected(null) }

  const bandCounts = history.reduce((acc, h) => {
    const b = h.result?.band || 'Unknown'
    acc[b] = (acc[b] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const avgScore = history.length
    ? Math.round(history.reduce((s, h) => s + (h.result?.score || 0), 0) / history.length)
    : 0

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Detail Modal for Mobile */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:hidden animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg glass-card-premium rounded-3xl p-2 border-brand/20 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button 
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-900 hover:bg-white/20 transition-all"
            >
              <X size={18} />
            </button>
            <div className="p-4">
              <ScoreCard result={selected.result} borrowerName={selected.borrowerName || selected.phone} />
            </div>
          </div>
        </div>
      )}

      <header className="fade-up flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-amber-600 text-[10px] font-bold uppercase tracking-widest">
            <Sparkles size={10} /> Institutional Audit
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-extrabold text-gradient tracking-tight">
            Score History
          </h1>
          <p className="text-slate-500 text-base max-w-xl">
            Monitor and analyze recent borrower assessments. Track risk distributions across your portfolio.
          </p>
        </div>
        {history.length > 0 && (
          <button onClick={clear} className="w-fit text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-rose-600 transition-all btn-outline px-5 py-2.5 rounded-xl">
            Purge records
          </button>
        )}
      </header>

      {history.length === 0 ? (
        <div className="glass-card-premium rounded-3xl p-20 text-center border-dashed border-slate-200 fade-up">
          <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-12">
            <BarChart3 size={40} className="text-slate-800" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-3 tracking-tight">Archives Empty</h2>
          <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
            Your scoring history is currently empty. Start by assessing a borrower in the <span className="text-brand font-bold">Lending Portal</span> to generate insights.
          </p>
        </div>
      ) : (
        <div className="space-y-8 fade-up">
          {/* Top Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 stagger">
            <div className="glass-card-premium rounded-2xl p-6 flex items-center gap-5 relative overflow-hidden group feature-card fade-up">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-brand brand-glow group-hover:scale-110 transition-transform">
                <Activity size={28} />
              </div>
              <div className="relative z-10">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Scored</div>
                <div className="text-3xl font-serif font-extrabold text-slate-900 leading-none">{history.length}</div>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-full -mr-12 -mt-12 blur-2xl" />
            </div>
            <div className="glass-card-premium rounded-2xl p-6 flex items-center gap-5 relative overflow-hidden group feature-card fade-up">
              <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center text-sky-600 group-hover:scale-110 transition-transform">
                <PieChart size={28} />
              </div>
              <div className="relative z-10">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Average Score</div>
                <div className="text-3xl font-serif font-extrabold text-slate-900 leading-none">{avgScore}</div>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-400/5 rounded-full -mr-12 -mt-12 blur-2xl" />
            </div>
            <div className="md:col-span-2 glass-card-premium rounded-2xl p-6 overflow-hidden relative group feature-card fade-up">
              <div className="flex items-center gap-6 relative z-10 h-full">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                  <TrendingUp size={28} />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Portfolio Risk Distribution</div>
                  <div className="flex h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-100">
                    {Object.entries(bandCounts).map(([band, count]) => (
                      <div key={band} 
                        style={{ width: `${(count/history.length)*100}%`, backgroundColor: BAND_COLOR[band] === 'text-emerald-600' ? '#22c55e' : BAND_COLOR[band] === 'text-lime-400' ? '#84cc16' : BAND_COLOR[band] === 'text-amber-600' ? '#eab308' : BAND_COLOR[band] === 'text-orange-400' ? '#f97316' : '#ef4444' }}
                        className="h-full rounded-full mx-[1px] first:ml-0 last:mr-0"
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-48 h-48 bg-green-400/5 rounded-full -mr-24 -mt-24 blur-3xl" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Feed */}
            <div className="lg:col-span-4 space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Clock size={12} className="text-brand" /> Timeline
                </h3>
              </div>
              
              <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar pb-10">
                {history.map((h, i) => (
                  <button 
                    key={h.id} 
                    onClick={() => setSelected(h)}
                    className={`w-full text-left glass-card-premium rounded-2xl p-5 transition-all duration-300 group relative overflow-hidden
                      ${selected?.id === h.id ? 'border-brand/40 bg-brand/[0.04] ring-1 ring-brand/20 translate-x-1' : 'hover:bg-slate-100 border-slate-200 hover:translate-x-1'}`}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-start justify-between relative z-10">
                      <div className="space-y-2">
                        <div className="text-sm font-extrabold text-slate-900 group-hover:text-brand transition-colors truncate max-w-[160px]">
                          {h.borrowerName || h.phone}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md bg-white uppercase tracking-tighter ${BAND_COLOR[h.result?.band] || 'text-slate-900'}`}>
                            {h.result?.band}
                          </span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                            {new Date(h.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-serif font-black tracking-tighter ${BAND_COLOR[h.result?.band] || 'text-slate-900'}`}>
                          {h.result?.score}
                        </div>
                        <div className="flex justify-end mt-1">
                           <ChevronRight size={16} className={`transition-transform duration-300 ${selected?.id === h.id ? 'translate-x-1 text-brand' : 'text-slate-800'}`} />
                        </div>
                      </div>
                    </div>
                    {selected?.id === h.id && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-16 -mt-16 blur-3xl animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Detailed Analysis */}
            <div className="lg:col-span-8 hidden lg:block">
              <div className="sticky top-8 space-y-6">
                <div className="flex items-center justify-between px-1 uppercase tracking-[0.2em] text-[10px] font-black text-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                    Diagnostic Engine v1.0
                  </div>
                  {selected && <span className="font-mono">REC_ID_{selected.id.slice(-8).toUpperCase()}</span>}
                </div>
                
                {selected ? (
                  <div className="animate-in fade-in slide-in-from-right-8 duration-700">
                    <ScoreCard result={selected.result} borrowerName={selected.borrowerName || selected.phone} />
                  </div>
                ) : (
                  <div className="glass-card-premium rounded-3xl p-24 text-center border-dashed border-slate-100 bg-slate-50">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-slate-100 shadow-inner">
                      <Search size={32} className="text-slate-800" />
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-slate-900 mb-3 tracking-tight">Select a Prospect</h3>
                    <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                      Choose a record from the timeline to decode their behavioral signals and visualize institutional risk parameters.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
