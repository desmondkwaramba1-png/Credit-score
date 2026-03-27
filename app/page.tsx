'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  CreditCard, TrendingUp, Users, Zap, ArrowRight, AlertCircle,
  Shield, Smartphone, BarChart3, Globe, Building2, Landmark,
  ChevronRight, CheckCircle2, Layers, Wallet, LineChart, Target
} from 'lucide-react'

import { useAuth } from '../components/AuthProvider'
import { useRouter } from 'next/navigation'

/* ─── Data ─── */
const DEMO_SCORES = [
  { name: 'Tendai Moyo', type: 'Tuck shop · Chitungwiza', score: 824, band: 'Excellent', risk: '2.1%' },
  { name: 'Amai Sibanda', type: 'Market trader · Mbare', score: 710, band: 'Good', risk: '8.4%' },
  { name: 'Farai Ncube', type: 'Freelancer · Bulawayo', score: 685, band: 'Fair', risk: '32.1%' },
  { name: 'Bongani Moyo', type: 'Kombi operator · Bulawayo', score: 420, band: 'Very Poor', risk: '78.5%' },
]

const BAND_COLOR: Record<string, string> = {
  'Excellent': 'text-emerald-600',
  'Good': 'text-lime-600',
  'Fair': 'text-amber-600',
  'Poor': 'text-orange-600',
  'Very Poor': 'text-rose-600',
}

const STATS = [
  { label: 'Time to Cash',      value: '3 Min',  icon: Zap,         color: 'text-emerald-600', bg: 'bg-emerald-100 text-emerald-700' },
  { label: 'Active Ledgers',    value: '12,400+', icon: Smartphone, color: 'text-brand',     bg: 'bg-blue-50' },
  { label: 'Mukando Groups',    value: '840+',    icon: Users,       color: 'text-accent-violet', bg: 'bg-indigo-100 text-indigo-700' },
  { label: 'Model AUC Score',   value: '0.945',   icon: TrendingUp,  color: 'text-amber-600',  bg: 'bg-amber-100 text-amber-700' },
]

const USE_CASES = [
  { 
    icon: Smartphone, color: 'text-brand', border: 'border-brand/20 hover:border-brand/40',
    title: 'Digital Sales Ledger', 
    desc: 'Log daily sales, expenses, and inventory from your phone. Perfect for tuck shops and market traders building a financial track record.',
    cta: 'Open Ledger', href: '/dashboard/sme'
  },
  { 
    icon: Users, color: 'text-accent-teal', border: 'border-accent-teal/20 hover:border-accent-teal/40',
    title: 'Mukando Groups', 
    desc: 'Digitize your savings group. When your peers thrive and contribute on time, your individual PAMOJA credit score improves.',
    cta: 'Manage Rounds', href: '/dashboard/sme'
  },
  { 
    icon: Zap, color: 'text-accent-violet', border: 'border-accent-violet/20 hover:border-accent-violet/40',
    title: '3-Minute Decisions', 
    desc: 'Stop waiting days for approvals. We analyze your ledger and EcoCash data to issue instant credit limits when emergencies hit.',
    cta: 'Check Limit', href: '/customer'
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Log Daily Sales', desc: 'Use our free tools to track business income and invite your Mukando peers to the platform.', icon: Smartphone, color: 'text-brand' },
  { step: '02', title: 'Unlock Tiers', desc: 'As you build your digital ledger, watch your PAMOJA Score grow and unlock larger loan limits.', icon: Layers, color: 'text-accent-teal' },
  { step: '03', title: 'Instant Funding', desc: 'Apply in 30s. Get an automated decision in 90s. Funds disbursed to your EcoCash immediately.', icon: Zap, color: 'text-accent-violet' },
]

/* ─── Components ─── */
function ScoreBar({ score }: { score: number }) {
  const pct = (score / 1000) * 100
  const color = score >= 800 ? '#059669' : score >= 700 ? '#65a30d' :
                score >= 600 ? '#d97706' : score >= 500 ? '#ea580c' : '#e11d48'
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{score}</span>
    </div>
  )
}

function AnimatedStat({ value, label, icon: Icon, color, bg }: any) {
  return (
    <div className="glass-card-premium rounded-2xl p-6 group hover:bg-slate-100 transition-all duration-300 feature-card fade-up">
      <div className={`${color} ${bg} mb-4 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={22} />
      </div>
      <div className="text-3xl font-serif font-extrabold text-slate-900 tracking-tight">{value}</div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">{label}</div>
    </div>
  )
}

/* ─── Main Page ─── */
export default function LandingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [apiOk, setApiOk] = useState<boolean | null>(null)

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'lender') router.push('/lender')
      else if (user.role === 'sme') router.push('/dashboard/sme')
    }
  }, [user, loading, router])

  useEffect(() => {
    fetch('/api/health').then(res => setApiOk(res.ok)).catch(() => setApiOk(false))
  }, [])

  if (loading) return null

  return (
    <div className="min-h-screen">
      {/* ════════════════════════════════════════════ */}
      {/* HERO SECTION                                */}
      {/* ════════════════════════════════════════════ */}
      <section className="relative hero-gradient overflow-hidden">
        {/* Floating Orbs */}
        <div className="orb orb-brand w-[500px] h-[500px] -top-48 -right-48" />
        <div className="orb orb-teal w-[400px] h-[400px] top-1/2 -left-48" />
        <div className="orb orb-violet w-[300px] h-[300px] bottom-0 right-1/4" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 pt-12 md:pt-24 pb-20 md:pb-32">
          {/* Status badges */}
          <div className="flex flex-wrap items-center gap-3 mb-8 fade-up">
            <span className="px-4 py-1.5 bg-blue-50 border border-brand/20 text-brand text-[10px] font-bold uppercase tracking-widest rounded-full">
              Founded 2026 · Harare, Zimbabwe
            </span>
            {apiOk === false && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                <AlertCircle size={10} /> Standalone Mode
              </span>
            )}
            {apiOk === true && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-green-500 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full border border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" /> Engine Live
              </span>
            )}
          </div>

          {/* Hero Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="fade-up">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-extrabold text-gradient-hero tracking-tight leading-[1.08] mb-6">
                The Financial OS<br/>for Small Business.
              </h1>
              <p className="text-slate-500 text-lg md:text-xl max-w-xl leading-relaxed mb-10">
                From tracking daily sales to instant credit in 3 minutes. PAMOJA AI is the daily operating system for Zimbabwean traders and SMEs building their financial identity.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/register" className="btn-primary px-8 py-4 rounded-2xl text-base inline-flex items-center gap-2">
                  Get Started <ArrowRight size={18} />
                </Link>
                <Link href="/developer" className="btn-outline px-8 py-4 rounded-2xl text-base inline-flex items-center gap-2">
                  View API Docs <ChevronRight size={18} />
                </Link>
              </div>
            </div>

            {/* Hero Visual — Gamified Score Preview Card */}
            <div className="fade-up hidden lg:block">
              <div className="glass-card-premium rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-brand/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand/20 flex items-center justify-center text-brand">
                      <Target size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Gamified Growth</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Unlocking Credit Tiers</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest rounded-lg">
                    Level Up
                  </span>
                </div>
                
                <div className="space-y-4 relative z-10">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-brand/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 bg-brand h-full" />
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900">Current: Tier 2 Limits</div>
                        <div className="text-xs text-slate-500">Score: <span className="font-mono text-brand font-bold">710</span> (Good)</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Next Unlock</div>
                        <div className="text-sm font-mono font-bold text-emerald-600">$500 at 8%</div>
                      </div>
                    </div>
                    <ScoreBar score={710} />
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="text-[10px] font-mono text-slate-600">🎯 Tip: Log 5 more sales this week for a +10pt score boost.</div>
                    </div>
                  </div>

                  {DEMO_SCORES.slice(0, 2).map(({ name, type, score, band }) => (
                    <div key={name} className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100 transition-all opacity-60 grayscale">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold flex-shrink-0">
                          {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-slate-900 truncate">{name}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-sm font-serif font-extrabold text-slate-900`}>{score}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#f8fafc] to-transparent" />
      </section>

      {/* ════════════════════════════════════════════ */}
      {/* STATS BAR                                   */}
      {/* ════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 -mt-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 stagger">
          {STATS.map((stat) => (
            <AnimatedStat key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════ */}
      {/* HOW IT WORKS                                */}
      {/* ════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-24 md:py-32">
        <div className="text-center mb-16 fade-up">
          <span className="inline-block px-4 py-1.5 bg-white border border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-widest rounded-full mb-4">
            From Download to Cash
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-extrabold text-gradient tracking-tight mb-4">
            Grow With Pamoja
          </h2>
          <p className="text-slate-500 text-base max-w-lg mx-auto">
            We reward your daily business operations with increased credit limits and lower interest rates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger">
          {HOW_IT_WORKS.map(({ step, title, desc, icon: Icon, color }, i) => (
            <div key={step} className="relative fade-up">
              {/* Connector line (hidden on mobile) */}
              {i < 2 && (
                <div className="hidden md:block absolute top-12 left-[calc(50%+40px)] right-[-40px] h-px bg-gradient-to-r from-slate-200 to-transparent z-0" />
              )}
              
              <div className="glass-card-premium rounded-3xl p-8 text-center relative z-10 feature-card">
                <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-4">Phase {step}</div>
                <div className={`w-16 h-16 rounded-2xl ${color === 'text-brand' ? 'bg-blue-50' : color === 'text-accent-teal' ? 'bg-emerald-50' : 'bg-indigo-50'} flex items-center justify-center mx-auto mb-5 ${color}`}>
                  <Icon size={28} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════ */}
      {/* USE CASES                                   */}
      {/* ════════════════════════════════════════════ */}
      <section className="section-gradient">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-24 md:py-32">
          <div className="text-center mb-16 fade-up">
            <span className="inline-block px-4 py-1.5 bg-brand/5 border border-brand/20 text-brand text-[10px] font-bold uppercase tracking-widest rounded-full mb-4">
              Daily Value Proposition
            </span>
            <h2 className="text-4xl md:text-5xl font-serif font-extrabold text-gradient tracking-tight mb-4">
              More than a lender.
            </h2>
            <p className="text-slate-500 text-base max-w-lg mx-auto">
              You only need loans occasionally, but you manage your business daily. We provide the tools for both.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 stagger">
            {USE_CASES.map(({ icon: Icon, color, border, title, desc, cta, href }) => (
              <Link key={href} href={href}
                className={`group glass-card-premium rounded-3xl p-8 border ${border} transition-all duration-300 feature-card fade-up block`}>
                <div className={`w-14 h-14 rounded-2xl ${
                  color === 'text-brand' ? 'bg-blue-50' : color === 'text-accent-teal' ? 'bg-emerald-50' : 'bg-indigo-50'
                } flex items-center justify-center mb-6 ${color} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={26} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-brand transition-colors">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-8">{desc}</p>
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-brand">
                  {cta} <ArrowRight size={14} className="transition-transform group-hover:translate-x-2" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════ */}
      {/* TESTIMONIAL                                 */}
      {/* ════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-24 md:py-32">
        <div className="glass-card-premium rounded-3xl p-10 md:p-16 text-center relative overflow-hidden fade-up bg-slate-50">
          <div className="absolute top-0 left-0 w-60 h-60 bg-emerald-100/50 rounded-full -ml-32 -mt-32 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-60 h-60 bg-blue-100/50 rounded-full -mr-32 -mb-32 blur-3xl" />
          
          <div className="relative z-10">
            <div className="text-5xl mb-6 opacity-20 text-slate-900">"</div>
            <blockquote className="text-xl md:text-2xl font-serif text-slate-900 leading-relaxed max-w-3xl mx-auto mb-8">
              Pamoja wins by being useful every day, not just when people need cash. By giving traders a free ledger and tools to manage Mukando groups, they organically build a high-fidelity credit profile.
            </blockquote>
            <div className="divider-brand w-16 mx-auto mb-6" />
            <div className="text-sm font-bold text-slate-900">The Growth Playbook</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">Accelerating Financial Inclusion in Zimbabwe</div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════ */}
      {/* FINAL CTA                                   */}
      {/* ════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand/10 via-brand/5 to-emerald-500/5" />
        <div className="orb orb-brand w-[300px] h-[300px] -bottom-32 -left-32" />
        <div className="orb orb-teal w-[200px] h-[200px] -top-16 -right-16" />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-8 py-24 md:py-32 text-center">
          <h2 className="text-4xl md:text-5xl font-serif font-extrabold text-gradient tracking-tight mb-6 fade-up">
            Ready to upgrade your<br/>business operations?
          </h2>
          <p className="text-slate-500 text-base max-w-lg mx-auto mb-10 fade-up">
            Track sales, manage groups, and unlock 3-minute emergency business loans. Connect your EcoCash today.
          </p>
          <div className="flex flex-wrap gap-4 justify-center fade-up">
            <Link href="/register" className="btn-primary px-10 py-4 rounded-2xl text-base inline-flex items-center gap-2">
              Create Free Account <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════ */}
      {/* FOOTER                                      */}
      {/* ════════════════════════════════════════════ */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="font-serif text-lg font-bold text-slate-900 tracking-tight">
                PAMOJA<span className="text-brand">.</span>AI
              </span>
              <span className="text-[10px] font-mono text-brand/70 border border-brand/30 px-1.5 py-0.5 rounded">v0.5</span>
            </div>
            <div className="flex items-center gap-8 text-xs text-slate-500">
              <Link href="/dashboard/sme" className="hover:text-slate-900 transition-colors">Digital Ledger</Link>
              <Link href="/customer" className="hover:text-slate-900 transition-colors">Credit Score</Link>
              <Link href="/developer" className="hover:text-slate-900 transition-colors">API for Lenders</Link>
              <Link href="/login" className="hover:text-slate-900 transition-colors">Sign In</Link>
            </div>
            <div className="text-[10px] text-slate-600">
              © 2026 PAMOJA AI. The Open Financial OS for Zimbabwe.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
