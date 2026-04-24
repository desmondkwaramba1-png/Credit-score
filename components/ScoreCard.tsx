'use client'
import { CheckCircle2, XCircle, Target } from 'lucide-react'

interface ScoreResult {
  score: number
  band: string
  band_key: string
  score_range: string
  default_probability: number
  scoring_method: string
  model_version: string
  loan_recommendation: {
    recommended_limit_usd: number
    suggested_rate_apr: string
    rate_float: number
  }
  explanation: {
    positives: string[]
    negatives: string[]
    gamification_tips?: string[]
  }
}

const BAND_COLORS: Record<string, { text: string; bg: string; border: string; gauge: string; gradFrom: string }> = {
  excellent:  { text: 'text-emerald-600',  bg: 'bg-emerald-100 text-emerald-700',   border: 'border-green-400/30',   gauge: '#059669', gradFrom: 'from-emerald-400/20' },
  good:       { text: 'text-lime-600',   bg: 'bg-lime-100/50',    border: 'border-lime-400/30',    gauge: '#65a30d', gradFrom: 'from-lime-400/20' },
  fair:       { text: 'text-amber-600', bg: 'bg-amber-100 text-amber-700',  border: 'border-yellow-400/30',  gauge: '#d97706', gradFrom: 'from-amber-400/20' },
  poor:       { text: 'text-orange-600', bg: 'bg-orange-100/50',  border: 'border-orange-400/30',  gauge: '#ea580c', gradFrom: 'from-orange-400/20' },
  very_poor:  { text: 'text-rose-600',    bg: 'bg-rose-100 text-rose-700',     border: 'border-red-400/30',     gauge: '#e11d48', gradFrom: 'from-rose-400/20' },
}

function ScoreGauge({ score, band_key }: { score: number; band_key: string }) {
  const color = BAND_COLORS[band_key]?.gauge || '#2563eb'
  const pct   = score / 1000
  const R = 70, cx = 85, cy = 85
  const startAngle = -200, endAngle = 20
  const range = endAngle - startAngle
  const angle = startAngle + range * pct
  const toRad = (d: number) => d * Math.PI / 180
  const arcPath = (start: number, end: number) => {
    const x1 = cx + R * Math.cos(toRad(start))
    const y1 = cy + R * Math.sin(toRad(start))
    const x2 = cx + R * Math.cos(toRad(end))
    const y2 = cy + R * Math.sin(toRad(end))
    const large = Math.abs(end - start) > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`
  }
  return (
    <svg width="170" height="110" viewBox="0 0 170 110">
      <defs>
        <linearGradient id={`gauge-grad-${band_key}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <path d={arcPath(startAngle, endAngle)} fill="none"
        stroke="rgba(15,23,42,0.06)" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(startAngle, angle)} fill="none"
        stroke={`url(#gauge-grad-${band_key})`} strokeWidth="10" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 8px ${color}40)` }} />
      <text x={cx} y={cy + 8} textAnchor="middle"
        fill="#0f172a" fontSize="26" fontWeight="700" fontFamily="'Libre Baskerville', serif">
        {score}
      </text>
      <text x={cx} y={cy + 24} textAnchor="middle" fill="#64748b" fontSize="9">
        0 ──────── 1000
      </text>
    </svg>
  )
}

export function ScoreCard({ result, borrowerName }: { result: ScoreResult; borrowerName?: string }) {
  const bc = BAND_COLORS[result.band_key] || BAND_COLORS.fair
  const { positives, negatives, gamification_tips } = result.explanation

  return (
    <div className="glass-card-premium rounded-2xl overflow-hidden animate-[fadeUp_.5s_ease_both] relative">
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${bc.gradFrom} to-transparent`} />
      
      {/* Score header */}
      <div className="p-6 border-b border-slate-200 bg-white/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            {borrowerName && (
              <div className="text-sm font-bold text-slate-900 mb-1">{borrowerName}</div>
            )}
            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${bc.text} ${bc.bg} ${bc.border}`}>
                {result.band}
              </span>
              <span className="text-xs font-mono text-slate-500">{result.score_range}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Default Risk</div>
                <div className="text-xl font-mono font-semibold text-slate-900">
                  {(result.default_probability * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Max Limit</div>
                <div className="text-xl font-mono font-semibold text-slate-900">
                  ${result.loan_recommendation.recommended_limit_usd.toLocaleString()}
                </div>
              </div>
              <div className="hidden md:block">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Offer APR</div>
                <div className="text-xl font-mono font-semibold text-slate-900">
                  {result.loan_recommendation.suggested_rate_apr}
                </div>
              </div>
            </div>
          </div>
          <ScoreGauge score={result.score} band_key={result.band_key} />
        </div>
      </div>

      {/* Gamification Tips (PLAYBOOK ADDITION) */}
      {gamification_tips && gamification_tips.length > 0 && (
        <div className="p-5 bg-blue-50/50 border-b border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-brand" />
            <span className="text-xs font-bold text-brand uppercase tracking-wider">Level Up Your Score</span>
          </div>
          <div className="grid gap-2">
            {gamification_tips.map((tip, i) => (
              <div key={i} className="flex items-center gap-3 bg-white border border-blue-100 rounded-xl p-3 text-sm text-slate-700 shadow-sm relative overflow-hidden group">
                <div className="w-1 h-full bg-brand absolute left-0 top-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                <span className="text-brand ml-1">✧</span>
                <span className="font-medium">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Signals */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50">
        {positives.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Positive signals</span>
            </div>
            <ul className="space-y-2.5">
              {positives.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 leading-snug">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}
        {negatives.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <XCircle size={14} className="text-rose-600" />
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Risk factors</span>
            </div>
            <ul className="space-y-2.5">
              {negatives.map((n, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600 leading-snug">
                  <span className="text-rose-500 mt-0.5 flex-shrink-0">✗</span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-200 bg-slate-100/50 flex items-center justify-between">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          Engine: {result.scoring_method}
        </span>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
          v{result.model_version}
        </span>
      </div>
    </div>
  )
}
