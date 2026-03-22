'use client'
import { useState } from 'react'
import axios from 'axios'
import { ScoreCard } from '../../components/ScoreCard'
import { Loader2, Phone, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const STEPS = ['Enter phone', 'Consent via USSD', 'View score']

export default function CustomerPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'customer')) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const requestScore = async () => {
    if (!phone.trim()) return
    setLoading(true); setError('')
    // Simulate USSD consent step
    setStep(1)
    await new Promise(r => setTimeout(r, 1200))
    setStep(2)
    try {
      // Use a demo borrower profile (in production this pulls real OneMoney data)
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
        }
      }, { headers: { 'X-API-Key': 'pk_demo_zw_pamoja2026' } })
      setResult(res.data.result)
    } catch (e: any) {
      setError('Backend offline — ensure api.index:app is running or Vercel secrets are set.')
      setStep(0)
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setStep(0); setResult(null); setPhone(''); setError('') }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8 fade-up">
        <h1 className="text-2xl font-serif font-bold text-white">My Credit Score</h1>
        <p className="text-slate-400 text-sm mt-1">
          Check your PAMOJA Credit Score using your mobile money behavior. Free for all Zimbabweans.
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-0 mb-8 fade-up-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 ${i <= step ? 'text-brand' : 'text-slate-600'}`}>
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-mono transition-all
                ${i < step ? 'bg-brand border-brand text-white' :
                  i === step ? 'border-brand text-brand' : 'border-white/20 text-slate-600'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className="text-xs hidden sm:block">{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-3 ${i < step ? 'bg-brand/50' : 'bg-white/[0.08]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Enter phone */}
      {step === 0 && !result && (
        <div className="bg-navy-2 border border-white/[0.06] rounded-2xl p-8 text-center fade-up">
          <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Phone size={28} className="text-brand" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Enter your mobile number</h2>
          <p className="text-slate-400 text-sm mb-6">
            We'll send a consent request to your phone via USSD.
            Your data is only accessed with your explicit permission.
          </p>
          <div className="flex gap-3 max-w-sm mx-auto">
            <input
              className="flex-1 bg-navy-3 border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-brand/60 text-sm font-mono"
              placeholder="+263 77 123 4567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && requestScore()}
            />
            <button onClick={requestScore} disabled={loading || !phone.trim()}
              className="bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-all flex items-center gap-2">
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'Check'}
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-4">
            Or dial <span className="font-mono text-brand/70">*384*PAMOJA#</span> on any phone
          </p>
        </div>
      )}

      {/* Step 1: USSD consent simulation */}
      {step === 1 && (
        <div className="bg-navy-2 border border-white/[0.06] rounded-2xl p-8 text-center fade-up">
          <div className="w-16 h-16 bg-yellow-400/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Loader2 size={28} className="text-yellow-400 animate-spin" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Awaiting consent</h2>
          <p className="text-slate-400 text-sm mb-6">
            A USSD prompt has been sent to <span className="text-white font-mono">{phone}</span>.
            Please confirm on your phone to allow PAMOJA AI to access your financial signals.
          </p>
          {/* USSD mockup */}
          <div className="bg-[#1a1a2e] rounded-xl p-4 max-w-xs mx-auto text-left border border-white/[0.06]">
            <div className="text-xs font-mono text-slate-300 leading-relaxed">
              <div className="text-white font-bold mb-1">PAMOJA AI</div>
              <div>Allow PAMOJA AI to access</div>
              <div>your mobile money signals</div>
              <div>to generate your credit</div>
              <div>score?</div>
              <div className="mt-2 text-slate-500">─────────────────</div>
              <div className="mt-1"><span className="text-brand">1</span> Allow (one-time)</div>
              <div><span className="text-brand">2</span> Decline</div>
              <div className="mt-2 text-yellow-400 animate-pulse">Waiting for response…</div>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-4">Auto-approving in demo mode...</p>
        </div>
      )}

      {/* Step 2: Generating */}
      {step === 2 && loading && (
        <div className="bg-navy-2 border border-white/[0.06] rounded-2xl p-8 text-center fade-up">
          <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Loader2 size={28} className="text-brand animate-spin" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Generating your score</h2>
          <p className="text-slate-400 text-sm">
            Analysing EcoCash patterns, savings behavior, utility payments...
          </p>
          <div className="mt-4 space-y-2 text-xs font-mono text-slate-500">
            {['Fetching mobile money signals','Checking rounds participation','Analysing ZESA payment history','Computing PAMOJA Score'].map((t, i) => (
              <div key={t} className="flex items-center gap-2 justify-center" style={{ animationDelay: `${i * 0.3}s` }}>
                <span className="text-green-400">✓</span> {t}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="fade-up space-y-4">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <ShieldCheck size={16} /> Score generated successfully for {phone}
          </div>
          <ScoreCard result={result} />
          {/* How to improve */}
          <div className="bg-navy-2 border border-white/[0.06] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">How to improve your score</h3>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2"><span className="text-brand mt-0.5">→</span> Join a rounds/savings group (chama) — adds 12% weight to your score</div>
              <div className="flex items-start gap-2"><span className="text-brand mt-0.5">→</span> Pay ZESA and rent consistently via mobile money — trackable signal</div>
              <div className="flex items-start gap-2"><span className="text-brand mt-0.5">→</span> Keep your mobile money active — more transactions = stronger consistency score</div>
              <div className="flex items-start gap-2"><span className="text-brand mt-0.5">→</span> Repay any loans on time — repayment history carries 22% weight</div>
            </div>
          </div>
          <button onClick={reset}
            className="w-full py-3 border border-white/[0.08] rounded-xl text-sm text-slate-400 hover:text-white hover:border-white/20 transition-all">
            Check another number
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-400/10 border border-red-400/20 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  )
}
