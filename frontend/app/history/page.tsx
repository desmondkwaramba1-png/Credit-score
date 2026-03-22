'use client'
import { useState, useEffect } from 'react'
import { ScoreCard } from '../../components/ScoreCard'
import { BarChart3, TrendingUp, AlertCircle } from 'lucide-react'

// Simple in-browser history using localStorage
interface HistoryItem {
  id: string
  timestamp: string
  borrowerName: string
  phone: string
  result: any
}

const BAND_COLOR: Record<string, string> = {
  Excellent: 'text-green-400', 'Very Good': 'text-lime-400',
  Good: 'text-yellow-400', Fair: 'text-orange-400', Poor: 'text-red-400',
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selected, setSelected] = useState<HistoryItem | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pamoja_score_history')
      if (raw) setHistory(JSON.parse(raw))
    } catch {}
  }, [])

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
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6 fade-up flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white">Score History</h1>
          <p className="text-slate-400 text-sm mt-1">All borrowers you have scored in this browser session.</p>
        </div>
        {history.length > 0 && (
          <button onClick={clear} className="text-xs text-slate-500 hover:text-red-400 transition-colors border border-white/[0.06] px-3 py-1.5 rounded-lg">
            Clear history
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="bg-navy-2 border border-white/[0.06] rounded-2xl p-12 text-center">
          <BarChart3 size={32} className="text-slate-600 mx-auto mb-3" />
          <div className="text-slate-400 text-sm">No scores yet</div>
          <div className="text-slate-600 text-xs mt-1">
            Go to <span className="text-brand">Score a Borrower</span> to start. Results will appear here.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: list */}
          <div className="space-y-2">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-navy-2 border border-white/[0.06] rounded-xl p-3 text-center">
                <div className="text-xl font-serif font-bold text-white">{history.length}</div>
                <div className="text-xs text-slate-500">Scored</div>
              </div>
              <div className="bg-navy-2 border border-white/[0.06] rounded-xl p-3 text-center">
                <div className="text-xl font-serif font-bold text-white">{avgScore}</div>
                <div className="text-xs text-slate-500">Avg Score</div>
              </div>
            </div>
            {history.map(h => (
              <button key={h.id} onClick={() => setSelected(h)}
                className={`w-full text-left bg-navy-2 border rounded-xl p-3 transition-all hover:border-brand/40
                  ${selected?.id === h.id ? 'border-brand/60' : 'border-white/[0.06]'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white truncate">{h.borrowerName || h.phone}</span>
                  <span className={`text-xs font-semibold ${BAND_COLOR[h.result?.band] || 'text-white'}`}>
                    {h.result?.score}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs ${BAND_COLOR[h.result?.band] || 'text-slate-400'}`}>
                    {h.result?.band}
                  </span>
                  <span className="text-xs text-slate-600">{new Date(h.timestamp).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Right: detail */}
          <div className="lg:col-span-2">
            {selected ? (
              <ScoreCard result={selected.result} borrowerName={selected.borrowerName || selected.phone} />
            ) : (
              <div className="h-64 bg-navy-2 border border-white/[0.06] rounded-2xl flex items-center justify-center text-slate-500 text-sm">
                Select a borrower to see their full score
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
