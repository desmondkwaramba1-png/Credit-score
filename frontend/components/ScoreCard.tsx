'use client'
import { CheckCircle2, XCircle, TrendingDown } from 'lucide-react'

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
  }
}

const BAND_COLORS: Record<string, { text: string; bg: string; border: string; gauge: string }> = {
  excellent:  { text: 'text-green-400',  bg: 'bg-green-400/10',   border: 'border-green-400/30',   gauge: '#22c55e' },
  very_good:  { text: 'text-lime-400',   bg: 'bg-lime-400/10',    border: 'border-lime-400/30',    gauge: '#84cc16' },
  good:       { text: 'text-yellow-400', bg: 'bg-yellow-400/10',  border: 'border-yellow-400/30',  gauge: '#eab308' },
  fair:       { text: 'text-orange-400', bg: 'bg-orange-400/10',  border: 'border-orange-400/30',  gauge: '#f97316' },
  poor:       { text: 'text-red-400',    bg: 'bg-red-400/10',     border: 'border-red-400/30',     gauge: '#ef4444' },
}

function ScoreGauge({ score, band_key }: { score: number; band_key: string }) {
  const color = BAND_COLORS[band_key]?.gauge || '#e85d26'
  const pct   = (score - 300) / 550
  // SVG arc gauge
  const R = 70, cx = 85, cy = 85
  const startAngle = -200, endAngle = 20 // degrees
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
      <path d={arcPath(startAngle, endAngle)} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
      <path d={arcPath(startAngle, angle)} fill="none"
        stroke={color} strokeWidth="10" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color}60)` }} />
      <text x={cx} y={cy + 8} textAnchor="middle"
        fill="white" fontSize="26" fontWeight="700" fontFamily="'Libre Baskerville', serif">
        {score}
      </text>
      <text x={cx} y={cy + 24} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">
        300 ──────── 850
      </text>
    </svg>
  )
}

export function ScoreCard({ result, borrowerName }: { result: ScoreResult; borrowerName?: string }) {
  const bc = BAND_COLORS[result.band_key] || BAND_COLORS.fair
  const { positives, negatives } = result.explanation

  return (
    <div className="bg-navy-2 border border-white/[0.06] rounded-2xl overflow-hidden animate-[fadeUp_.5s_ease_both]">
      {/* Score header */}
      <div className="p-6 border-b border-white/[0.06]">
        <div className="flex items-start justify-between gap-4">
          <div>
            {borrowerName && (
              <div className="text-sm text-slate-400 mb-1">{borrowerName}</div>
            )}
            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${bc.text} ${bc.bg} ${bc.border}`}>
                {result.band}
              </span>
              <span className="text-xs font-mono text-slate-500">{result.score_range}</span>
            </div>
            <div className="mt-3 flex items-baseline gap-6">
              <div>
                <div className="text-xs text-slate-500 mb-0.5">Default probability</div>
                <div className="text-xl font-mono font-semibold text-white">
                  {(result.default_probability * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-0.5">Loan limit</div>
                <div className="text-xl font-mono font-semibold text-white">
                  ${result.loan_recommendation.recommended_limit_usd.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-0.5">Suggested APR</div>
                <div className="text-xl font-mono font-semibold text-white">
                  {result.loan_recommendation.suggested_rate_apr}
                </div>
              </div>
            </div>
          </div>
          <ScoreGauge score={result.score} band_key={result.band_key} />
        </div>
      </div>

      {/* Signals */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {positives.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={14} className="text-green-400" />
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Positive signals</span>
            </div>
            <ul className="space-y-2">
              {positives.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-green-400/60 mt-0.5 flex-shrink-0">✓</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}
        {negatives.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <XCircle size={14} className="text-red-400" />
              <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Risk signals</span>
            </div>
            <ul className="space-y-2">
              {negatives.map((n, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-red-400/60 mt-0.5 flex-shrink-0">✗</span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-white/[0.04] flex items-center justify-between">
        <span className="text-[10px] font-mono text-slate-600">
          method: {result.scoring_method}
        </span>
        <span className="text-[10px] font-mono text-slate-600">
          PAMOJA AI v{result.model_version}
        </span>
      </div>
    </div>
  )
}
