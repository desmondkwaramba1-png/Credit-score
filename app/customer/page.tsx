'use client'
import { useState } from 'react'
import axios from 'axios'
import { ScoreCard } from '../../components/ScoreCard'
import { Loader2, Phone, ShieldCheck, Sparkles, Gift } from 'lucide-react'
import { useAuth } from '../../components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const STEPS = ['Enter phone', 'Consent via USSD', 'View score']

export default function SMEScorePage() {
  const { user, token, loading: authLoading } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'sme')) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const requestScore = async () => {
    if (!phone.trim()) return
    setLoading(true); setError('')
    setStep(1)
    await new Promise(r => setTimeout(r, 1200))
    setStep(2)
    try {
      const res = await axios.post('/api/score', {
        phone,
        borrower_name: phone,
        data: {
          business_type: 'tuck_shop', province: 'Harare', gender: 'female',
          age: 32, years_in_business: 3,
          mm_consistency_score: 0.68, mm_months_active: 24, mm_inflow_ratio: 1.15,
          mm_avg_balance_usd: 55, mm_tx_count_monthly: 28,
          prior_loans_count: 1, repayment_rate: 0.88,
          is_rounds_member: 1, rounds_consistency_score: 0.75, rounds_tenure_months: 18,
          zesa_payment_consistency: 0.65, monthly_revenue_usd: 280, revenue_cv: 0.35,
          has_references: 1, has_fixed_location: 1,
          digital_sales_logged_7d: 12, mukando_peers_invited: 2
        }
      }, { 
        headers: { 
          'X-API-Key': 'pk_demo_zw_pamoja2026',
          'Authorization': `Bearer ${token}`
        } 
      })
      setResult(res.data)
    } catch (e: any) {
      setError('Backend offline — ensure api.index:app is running or Vercel secrets are set.')
      setStep(0)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setStep(0); setResult(null); setPhone(''); setError('') }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <header className="fade-up space-y-3 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-teal/10 border border-accent-teal/20 text-accent-teal text-[10px] font-bold uppercase tracking-widest">
          <Sparkles size={10} /> Instant Decision
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-extrabold text-gradient tracking-tight">
          3-Minute Credit Assessment
        </h1>
        <p className="text-slate-500 text-base max-w-xl mx-auto">
          Access your PAMOJA Credit Limit in seconds. Log sales and invite your Mukando group to unlock better terms.
        </p>
      </header>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-12 fade-up max-w-2xl mx-auto">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`flex flex-col items-center gap-2 ${i <= step ? 'text-brand' : 'text-slate-600'}`}>
              <div className={`w-11 h-11 rounded-2xl border-2 flex items-center justify-center text-sm font-bold transition-all duration-500
                ${i < step ? 'bg-gradient-to-br from-brand to-brand-hover border-brand text-white brand-glow' :
                  i === step ? 'border-brand text-brand bg-brand/5' : 'border-slate-200 text-slate-700 bg-slate-50'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className="text-[10px] uppercase tracking-widest font-bold hidden sm:block whitespace-nowrap">{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mt-[-18px] sm:mt-[-28px] mx-4 transition-colors duration-500 ${i < step ? 'bg-gradient-to-r from-brand/60 to-brand/20' : 'bg-slate-100'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Enter phone */}
      {step === 0 && !result && (
        <div className="glass-card-premium rounded-3xl p-10 text-center fade-up max-w-xl mx-auto relative overflow-hidden hidden">
            {/* Kept hidden logic for simulation below */}
        </div>
      )}

      {step === 0 && !result && (
        <div className="glass-card-premium rounded-3xl p-10 text-center fade-up max-w-xl mx-auto relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-accent-teal/5 rounded-full -mr-20 -mt-20 blur-3xl" />
          <div className="relative z-10">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6 brand-glow text-brand">
              <Phone size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Begin 3-Minute Assessment</h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              We'll trigger a secure USSD consent request to your phone. 
              Confirming this grants PAMOJA AI a secure one-time view of your transaction metadata.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                className="flex-1 bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 placeholder-slate-600 focus:outline-none focus:border-brand/40 focus:bg-slate-50 text-lg font-mono tracking-wider transition-all"
                placeholder="+263 77 000 0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && requestScore()}
              />
              <button onClick={requestScore} disabled={loading || !phone.trim()}
                className="btn-primary disabled:opacity-50 px-8 py-4 rounded-2xl text-base flex items-center justify-center gap-2">
                {loading ? <Loader2 size={20} className="animate-spin" /> : 'Start'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: USSD consent simulation */}
      {step === 1 && (
        <div className="glass-card-premium rounded-3xl p-10 text-center fade-up max-w-xl mx-auto">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Loader2 size={28} className="text-amber-600 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Awaiting Permission</h2>
          <p className="text-slate-500 text-sm mb-8">
            A prompt was sent to <span className="text-slate-900 font-mono font-bold tracking-tight">{phone}</span>.<br/> Please confirm the request on your handset.
          </p>
          
          <div className="relative w-64 h-[440px] bg-[#0c1420] rounded-[3rem] p-3 mx-auto border-4 border-[#1a1d23] shadow-2xl">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#1a1d23] rounded-b-2xl z-20" />
            <div className="w-full h-full bg-slate-900 rounded-[2.2rem] overflow-hidden relative flex items-center justify-center p-4">
               <div className="bg-white/95 rounded-2xl p-4 w-full shadow-2xl scale-90 animate-in zoom-in duration-300">
                 <div className="text-[11px] font-sans text-slate-900 leading-tight">
                    <div className="font-black text-xs mb-2 border-b border-slate-200 pb-1">OneMoney / Ecocash</div>
                    <div className="mb-4">Authorize PAMOJA AI to view your transaction history for credit scoring?</div>
                    <div className="space-y-1 font-bold">
                      <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-brand"><span>1. Yes, Allow</span></div>
                      <div className="flex items-center justify-between"><span>2. Decline</span></div>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Generating */}
      {step === 2 && loading && (
        <div className="glass-card-premium rounded-2xl p-8 text-center fade-up">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-brand">
            <Loader2 size={28} className="animate-spin" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Checking OS Engagement</h2>
          <p className="text-slate-500 text-sm">
            Validating EcoCash consistency, Sales Ledger entries, and Mukando groups...
          </p>
          <div className="mt-4 space-y-2 text-xs font-mono text-slate-500">
            {['Fetching mobile money signals','Verifying Digital Sales Ledger','Analysing ZESA payment history','Computing PAMOJA Score'].map((t, i) => (
              <div key={t} className="flex items-center gap-2 justify-center" style={{ animationDelay: `${i * 0.3}s` }}>
                <span className="text-emerald-600">✓</span> {t}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="fade-up space-y-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-emerald-600 font-bold justify-center mb-6">
            <ShieldCheck size={16} /> Decision Complete (2.4s)
          </div>
          
          {/* Note result is wrapped inside a "result" key usually, depends on the API structure. Assuming result.result from earlier script */}
          <ScoreCard result={result.result ? result.result : result} />

          <button onClick={reset}
            className="w-full py-3 mt-4 btn-outline rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand/40">
            Check another number
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-600 text-center">
          {error}
        </div>
      )}
    </div>
  )
}
