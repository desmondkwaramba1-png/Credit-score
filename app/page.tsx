'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CreditCard, TrendingUp, Users, Zap, ArrowRight, AlertCircle } from 'lucide-react'

const DEMO_SCORES = [
  { name: 'Tendai Moyo', type: 'Tuck shop · Chitungwiza', score: 811, band: 'Excellent', risk: '7.1%' },
  { name: 'Amai Sibanda', type: 'Market trader · Mbare', score: 780, band: 'Excellent', risk: '12.7%' },
  { name: 'Farai Ncube', type: 'Freelancer · Bulawayo', score: 629, band: 'Good', risk: '40.1%' },
  { name: 'Bongani Moyo', type: 'Kombi operator · Bulawayo', score: 481, band: 'Poor', risk: '67.0%' },
]

const BAND_COLOR: Record<string, string> = {
  Excellent: 'text-green-400', 'Very Good': 'text-lime-400',
  Good: 'text-yellow-400', Fair: 'text-orange-400', Poor: 'text-red-400',
}

const STATS = [
  { label: 'Model AUC',        value: '0.9459', sub: 'on held-out test set',       icon: TrendingUp, color: 'text-green-400' },
  { label: 'Training Loans',   value: '55,305', sub: 'real African loan outcomes',  icon: CreditCard, color: 'text-brand' },
  { label: 'Signal Categories',value: '7',      sub: 'mobile money · rounds · ZESA',icon: Zap,        color: 'text-yellow-400' },
  { label: 'Score Range',      value: '300–850', sub: 'FICO-equivalent scale',       icon: Users,      color: 'text-sky-400' },
]

function ScoreBar({ score }: { score: number }) {
  const pct = ((score - 300) / 550) * 100
  const color = score >= 740 ? '#22c55e' : score >= 660 ? '#84cc16' :
                score >= 580 ? '#eab308' : score >= 500 ? '#f97316' : '#ef4444'
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{score}</span>
    </div>
  )
}

import { useAuth } from '../components/AuthProvider'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [apiOk, setApiOk] = useState<boolean | null>(null)

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'customer') router.push('/dashboard/customer')
      else if (user.role === 'sme') router.push('/dashboard/sme')
    }
  }, [user, loading, router])

  useEffect(() => {
    fetch('/api/health').then(res => setApiOk(res.ok)).catch(() => setApiOk(false))
  }, [])

  if (loading) return null

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 fade-up">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-brand/70 tracking-widest uppercase">
            Founded 2026 · Harare, Zimbabwe
          </span>
          {apiOk === false && (
            <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
              <AlertCircle size={11} /> Backend offline — ensure the API functions are running or Vercel secrets are set.
            </span>
          )}
          {apiOk === true && (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" /> API connected
            </span>
          )}
        </div>
        <h1 className="text-3xl font-serif font-bold text-white leading-tight">
          PAMOJA AI Credit Engine
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Alternative credit scoring for Zimbabwean SMEs — no bank account required.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 fade-up-2">
        {STATS.map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-navy-2 border border-white/[0.06] rounded-xl p-4">
            <div className={`${color} mb-2`}><Icon size={18} /></div>
            <div className="text-2xl font-serif font-bold text-white">{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
            <div className="text-[10px] text-slate-600 mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8 fade-up-3">
        {[
          { href: '/lender', title: 'Score a Borrower', desc: 'Enter borrower details and get an instant PAMOJA Credit Score.', cta: 'Open scorer', color: 'border-brand/30 hover:border-brand/60' },
          { href: '/customer', title: 'Check My Score', desc: 'Borrowers can see their own PAMOJA Credit Score and insights.', cta: 'Check score', color: 'border-sky-500/30 hover:border-sky-500/60' },
          { href: '/developer', title: 'API Integration', desc: 'REST API with Python examples and schema tester.', cta: 'View docs', color: 'border-purple-500/30 hover:border-purple-500/60' },
        ].map(({ href, title, desc, cta, color }) => (
          <Link key={href} href={href}
            className={`group block bg-navy-2 border ${color} rounded-xl p-5 transition-all duration-200 hover:bg-navy-3`}>
            <h3 className="font-semibold text-white mb-2">{title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">{desc}</p>
            <span className="flex items-center gap-1 text-xs text-brand font-medium">
              {cta} <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>

      {/* Sample scores */}
      <div className="bg-navy-2 border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white">Sample borrower scores</h2>
          <Link href="/lender"
            className="text-xs text-brand hover:text-brand-hover flex items-center gap-1">
            Score a real borrower <ArrowRight size={11} />
          </Link>
        </div>
        <div className="space-y-4">
          {DEMO_SCORES.map(({ name, type, score, band, risk }) => (
            <div key={name} className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.04] last:border-0 last:pb-0">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-bold flex-shrink-0">
                  {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{name}</div>
                  <div className="text-xs text-slate-500 truncate">{type}</div>
                  <ScoreBar score={score} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-sm font-semibold ${BAND_COLOR[band] || 'text-white'}`}>{band}</div>
                <div className="text-xs text-slate-500 mt-0.5">{risk} risk</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model info */}
      <div className="mt-4 p-4 bg-navy-3/50 rounded-xl border border-white/[0.04]">
        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <div className="text-white font-semibold font-mono">0.9459</div>
            <div className="text-slate-500 mt-0.5">ROC-AUC score</div>
          </div>
          <div>
            <div className="text-white font-semibold font-mono">6.55×</div>
            <div className="text-slate-500 mt-0.5">Zimbabwe calibration</div>
          </div>
          <div>
            <div className="text-white font-semibold font-mono">3 modes</div>
            <div className="text-slate-500 mt-0.5">loan · behavioral · thin-file</div>
          </div>
        </div>
      </div>
    </div>
  )
}
