'use client'
import { useState } from 'react'
import axios from 'axios'
import { ScoreCard } from '../../components/ScoreCard'
import { Loader2, Send, User, Smartphone, Building2, MapPin, Calendar, DollarSign, Wallet, History, Users, Lightbulb, Sparkles } from 'lucide-react'
import { useAuth } from '../../components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const PROVINCES = ['Harare','Bulawayo','Manicaland','Masvingo','Midlands','Mat North','Mat South','Mashonaland']
const BIZ_TYPES = ['tuck_shop','market_trader','kombi_operator','cross_border','freelancer','manufacturer','agri']

const PRESETS = {
  'Excellent borrower': {
    borrower_name: 'Tendai Moyo', phone: '+263771234567',
    business_type:'tuck_shop', province:'Harare', gender:'female', age:34, years_in_business:4,
    mm_consistency_score:0.82, mm_months_active:38, mm_inflow_ratio:1.35, mm_avg_balance_usd:78, mm_tx_count_monthly:45,
    prior_loans_count:2, repayment_rate:0.92, days_late_recent_loan:3,
    is_rounds_member:1, rounds_consistency_score:0.88, rounds_tenure_months:24, is_rounds_organizer:0,
    zesa_payment_consistency:0.75, rent_via_mobile:1, rent_consistency_score:0.80, council_bills_consistent:1,
    monthly_revenue_usd:420, revenue_cv:0.22, pays_suppliers_on_time:1, has_references:1, has_fixed_location:1,
  },
  'Thin-file borrower': {
    borrower_name: 'Farai Ncube', phone: '+263772345678',
    business_type:'freelancer', province:'Bulawayo', gender:'male', age:23, years_in_business:0,
    mm_consistency_score:0.38, mm_months_active:8, mm_inflow_ratio:0.85, mm_avg_balance_usd:15, mm_tx_count_monthly:12,
    prior_loans_count:0, repayment_rate:null,
    is_rounds_member:0, zesa_payment_consistency:0.28, monthly_revenue_usd:120, revenue_cv:0.90,
    has_references:0, has_fixed_location:0,
  },
  'Risky borrower': {
    borrower_name: 'Bongani Moyo', phone: '+263773456789',
    business_type:'kombi_operator', province:'Bulawayo', gender:'male', age:28, years_in_business:0.5,
    mm_consistency_score:0.15, mm_months_active:3, mm_inflow_ratio:0.60, mm_avg_balance_usd:5, mm_tx_count_monthly:4,
    prior_loans_count:1, repayment_rate:0.35, days_late_recent_loan:75,
    is_rounds_member:0, zesa_payment_consistency:0.10, monthly_revenue_usd:80, revenue_cv:1.5,
  },
}

type FieldKey = string
interface FormState { [key: FieldKey]: string | number | null }

const DEFAULTS: FormState = {
  borrower_name:'', phone:'',
  business_type:'tuck_shop', province:'Harare', gender:'female', age:30, years_in_business:2,
  mm_consistency_score:0.60, mm_months_active:18, mm_inflow_ratio:1.10, mm_avg_balance_usd:40, mm_tx_count_monthly:20,
  prior_loans_count:0, repayment_rate:'', days_late_recent_loan:0,
  is_rounds_member:0, rounds_consistency_score:0, rounds_tenure_months:0, is_rounds_organizer:0,
  zesa_payment_consistency:0.50, rent_via_mobile:0, rent_consistency_score:0, council_bills_consistent:0,
  monthly_revenue_usd:200, revenue_cv:0.40, pays_suppliers_on_time:1, has_references:0, has_fixed_location:1,
}

function Field({ label, icon: Icon, name, type='number', value, onChange, options, step='0.01', min, max, hint }:
  { label:string; icon?:any; name:string; type?:string; value:string|number|null; onChange:(n:string,v:string|number|null)=>void;
    options?:string[]; step?:string; min?:string; max?:string; hint?:string }) {
  const base = "w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-600 focus:outline-none focus:border-brand/40 focus:bg-slate-50 transition-all"
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon size={12} className="text-slate-500" />}
        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
      </div>
      {options ? (
        <select className={base} value={String(value ?? '')} onChange={e => onChange(name, e.target.value)}>
          {options.map(o => <option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
        </select>
      ) : type === 'toggle' ? (
        <div className="flex gap-2">
          {[{v:0,l:'No'},{v:1,l:'Yes'}].map(({v,l}) => (
            <button key={v} type="button" onClick={() => onChange(name, v)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${Number(value)===v ? 'btn-primary brand-glow' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-900'}`}>
              {l}
            </button>
          ))}
        </div>
      ) : (
        <input className={base} type={type} step={step} min={min} max={max}
          value={value === null ? '' : String(value)}
          placeholder={hint}
          onChange={e => onChange(name, e.target.value === '' ? null : e.target.type==='number' ? parseFloat(e.target.value) : e.target.value)}
        />
      )}
    </div>
  )
}

const SECTION_COLORS = [
  { border: 'border-l-brand', icon: 'bg-blue-50 text-brand', dot: 'bg-brand' },
  { border: 'border-l-sky-400', icon: 'bg-sky-100 text-sky-700 text-sky-600', dot: 'bg-sky-400' },
  { border: 'border-l-green-400', icon: 'bg-emerald-100 text-emerald-700 text-emerald-600', dot: 'bg-green-400' },
]

export default function LenderPage() {
  const { user, token, loading: authLoading } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState<FormState>({...DEFAULTS})
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (authLoading) return <div className="p-8 text-slate-500 animate-pulse">Checking authorization...</div>

  const set = (name: string, value: string | number | null) =>
    setForm(p => ({ ...p, [name]: value }))

  const loadPreset = (preset: keyof typeof PRESETS) => {
    const p = PRESETS[preset] as any
    setForm({ ...DEFAULTS, ...p })
    setResult(null)
  }

  const submit = async () => {
    setLoading(true); setError(''); setResult(null)
    try {
      const { borrower_name, phone, ...data } = form
      const payload = { phone, borrower_name, data: { ...data, repayment_rate: data.repayment_rate === '' ? null : data.repayment_rate } }
      const res = await axios.post('/api/score', payload, { 
        headers: { 
          'X-API-Key': 'pk_demo_zw_pamoja2026',
          'Authorization': `Bearer ${token}`
        } 
      })
      const scored = { ...res.data.result, borrowerName: String(borrower_name || phone) }
      setResult(scored)
      try {
        const prev = JSON.parse(localStorage.getItem('pamoja_score_history') || '[]')
        const entry = { id: Date.now().toString(), timestamp: new Date().toISOString(),
          borrowerName: String(borrower_name || ''), phone: String(phone || ''), result: scored }
        localStorage.setItem('pamoja_score_history', JSON.stringify([entry, ...prev].slice(0, 50)))
      } catch {}
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Backend offline — start the FastAPI server first.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="fade-up space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-brand/20 text-brand text-[10px] font-bold uppercase tracking-widest">
          <Sparkles size={10} /> Lender Portal
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-extrabold text-gradient tracking-tight">
          Score a Borrower
        </h1>
        <p className="text-slate-500 text-base max-w-2xl">
          Leverage AI-driven alternative credit scoring to make faster, smarter lending decisions for the underbanked.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left: Form */}
        <div className="xl:col-span-7 space-y-6 fade-up">
          {/* Section 1: Core Identity */}
          <div className={`glass-card-premium rounded-2xl p-6 space-y-6 border-l-4 ${SECTION_COLORS[0].border}`}>
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className={`w-10 h-10 rounded-xl ${SECTION_COLORS[0].icon} flex items-center justify-center`}>
                <User size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Borrower Identity</h2>
                <p className="text-xs text-slate-500">Official name and contact details</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full Name" icon={User} name="borrower_name" type="text" value={form.borrower_name} onChange={set} hint="e.g. Tendai Moyo" />
              <Field label="Phone" icon={Smartphone} name="phone" type="text" value={form.phone} onChange={set} hint="+263..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Business Type" icon={Building2} name="business_type" value={form.business_type} onChange={set} options={BIZ_TYPES} />
              <Field label="Province" icon={MapPin} name="province" value={form.province} onChange={set} options={PROVINCES} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Age" icon={Calendar} name="age" value={form.age} onChange={set} step="1" min="18" max="80" />
              <Field label="Exp (Yrs)" icon={History} name="years_in_business" value={form.years_in_business} onChange={set} step="1" />
              <Field label="Rev ($/mo)" icon={DollarSign} name="monthly_revenue_usd" value={form.monthly_revenue_usd} onChange={set} step="10" />
            </div>
          </div>

          {/* Section 2: Financial Signals */}
          <div className={`glass-card-premium rounded-2xl p-6 space-y-6 border-l-4 ${SECTION_COLORS[1].border}`}>
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className={`w-10 h-10 rounded-xl ${SECTION_COLORS[1].icon} flex items-center justify-center`}>
                <Wallet size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Financial Signals</h2>
                <p className="text-xs text-slate-500">Mobile money and transaction patterns (28% weight)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="MM Consistency" name="mm_consistency_score" value={form.mm_consistency_score} onChange={set} hint="0.0 to 1.0" />
              <Field label="Months Active" name="mm_months_active" value={form.mm_months_active} onChange={set} step="1" />
              <Field label="Inflow Ratio" name="mm_inflow_ratio" value={form.mm_inflow_ratio} onChange={set} />
              <Field label="Avg Balance ($)" name="mm_avg_balance_usd" value={form.mm_avg_balance_usd} onChange={set} step="5" />
            </div>
          </div>

          {/* Section 3: Stability & Community */}
          <div className={`glass-card-premium rounded-2xl p-6 space-y-6 border-l-4 ${SECTION_COLORS[2].border}`}>
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className={`w-10 h-10 rounded-xl ${SECTION_COLORS[2].icon} flex items-center justify-center`}>
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Repayment & Community</h2>
                <p className="text-xs text-slate-500">History and social trust signals (34% combined weight)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Field label="Prior Loans" name="prior_loans_count" value={form.prior_loans_count} onChange={set} step="1" min="0" />
                <Field label="Repayment Rate" name="repayment_rate" value={form.repayment_rate} onChange={set} hint="0–1, blank if none" />
                <Field label="Days Late (recent)" name="days_late_recent_loan" value={form.days_late_recent_loan} onChange={set} step="1" min="0" />
              </div>
              <div className="space-y-4">
                <Field label="Savings Group?" name="is_rounds_member" value={form.is_rounds_member} onChange={set} type="toggle" />
                {Number(form.is_rounds_member) === 1 && (
                  <div className="grid grid-cols-1 gap-4 pt-2 border-l-2 border-brand/20 pl-4 animate-in fade-in duration-300">
                    <Field label="Rounds Consistency" name="rounds_consistency_score" value={form.rounds_consistency_score} onChange={set} />
                    <Field label="Is Organizer?" name="is_rounds_organizer" value={form.is_rounds_organizer} onChange={set} type="toggle" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
              <Field label="ZESA Consist." name="zesa_payment_consistency" value={form.zesa_payment_consistency} onChange={set} />
              <Field label="Has References?" name="has_references" value={form.has_references} onChange={set} type="toggle" />
              <Field label="Fixed Location?" name="has_fixed_location" value={form.has_fixed_location} onChange={set} type="toggle" />
              <Field label="Revenue CV" name="revenue_cv" value={form.revenue_cv} onChange={set} hint="e.g. 0.4" />
            </div>
          </div>

          <button onClick={submit} disabled={loading}
            className="w-full btn-primary disabled:opacity-50 py-4 px-8 rounded-2xl flex items-center justify-center gap-3 transition-all text-lg mb-12">
            {loading ? <><Loader2 size={24} className="animate-spin" /> Analyzing Patterns...</> : <><Send size={20} /> Generate PAMOJA AI Score</>}
          </button>
        </div>

        {/* Right: Results & Presets */}
        <div className="xl:col-span-5 space-y-8 order-first xl:order-last">
          <div className="xl:sticky xl:top-8 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Lightbulb size={14} className="text-brand" /> Analysis Result
              </h3>
              {result && (
                <button onClick={() => setResult(null)} className="text-xs text-slate-600 hover:text-slate-900 transition-colors">
                  Clear
                </button>
              )}
            </div>

            {result ? (
              <ScoreCard result={result} borrowerName={result.borrowerName} />
            ) : (
              <div className="glass-card-premium rounded-2xl p-12 text-center border-dashed border-slate-200">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl filter grayscale opacity-30">📊</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Pending Data</h3>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                  Enter borrower parameters on the left and trigger the scoring engine to see the risk profile and loan recommendations.
                </p>
                <div className="space-y-3">
                  <div className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter mb-4">Quick Test Presets</div>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.keys(PRESETS).map(p => (
                      <button key={p} onClick={() => loadPreset(p as keyof typeof PRESETS)}
                        className="glass-card rounded-xl px-4 py-3 text-left group hover:bg-slate-100 hover:border-brand/20 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-600 group-hover:text-brand transition-colors">{p}</span>
                          <span className="text-[10px] text-slate-600 italic">Load Profile →</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-600 flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <div className="font-bold">Backend Error</div>
                  <div className="opacity-80">{error}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
