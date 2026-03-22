'use client'
import { useState } from 'react'
import axios from 'axios'
import { ScoreCard } from '../../components/ScoreCard'
import { Loader2, Send } from 'lucide-react'

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
    business_type:'kombi_operator', province:'Bulawayo', gender:'male', age:28, years_in_business:1,
    mm_consistency_score:0.25, mm_months_active:5, mm_inflow_ratio:0.70, mm_avg_balance_usd:8, mm_tx_count_monthly:8,
    prior_loans_count:1, repayment_rate:0.45, days_late_recent_loan:55,
    is_rounds_member:0, zesa_payment_consistency:0.15, monthly_revenue_usd:95, revenue_cv:1.2,
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

function Field({ label, name, type='number', value, onChange, options, step='0.01', min, max, hint }:
  { label:string; name:string; type?:string; value:string|number|null; onChange:(n:string,v:string|number|null)=>void;
    options?:string[]; step?:string; min?:string; max?:string; hint?:string }) {
  const base = "w-full bg-navy-3 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand/60 transition-colors"
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5 font-medium">{label}</label>
      {options ? (
        <select className={base} value={String(value ?? '')} onChange={e => onChange(name, e.target.value)}>
          {options.map(o => <option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
        </select>
      ) : type === 'toggle' ? (
        <div className="flex gap-2">
          {[{v:0,l:'No'},{v:1,l:'Yes'}].map(({v,l}) => (
            <button key={v} type="button" onClick={() => onChange(name, v)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${Number(value)===v ? 'bg-brand text-white' : 'bg-navy-3 border border-white/[0.08] text-slate-400 hover:text-white'}`}>
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

export default function LenderPage() {
  const [form, setForm] = useState<FormState>({...DEFAULTS})
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      const res = await axios.post('/api/score', payload, { headers: { 'X-API-Key': 'pk_demo_zw_pamoja2026' } })
      const scored = { ...res.data.result, borrowerName: String(borrower_name || phone) }
      setResult(scored)
      // Save to history
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="fade-up">
        <h1 className="text-2xl font-serif font-bold text-white">Score a Borrower</h1>
        <p className="text-slate-400 text-sm mt-1">
          Enter borrower details to get an instant PAMOJA Credit Score.
        </p>
      </div>

      {/* Presets */}
      <div className="flex gap-2 flex-wrap fade-up-2">
        <span className="text-xs text-slate-500 self-center mr-1">Presets:</span>
        {Object.keys(PRESETS).map(p => (
          <button key={p} onClick={() => loadPreset(p as keyof typeof PRESETS)}
            className="text-[10px] px-2.5 py-1.5 bg-navy-2 border border-white/[0.08] rounded-lg text-slate-300 hover:text-white transition-all">
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Result */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          {result ? (
            <ScoreCard result={result} borrowerName={result.borrowerName} />
          ) : (
            <div className="h-full min-h-64 bg-navy-2 border border-white/[0.06] rounded-2xl flex items-center justify-center">
              <div className="text-center text-slate-500">
                <div className="text-4xl mb-3 opacity-20">◎</div>
                <div className="text-sm">Fill in borrower details and click</div>
                <div className="text-sm font-medium text-slate-400 mt-1">"Generate PAMOJA Score"</div>
                <div className="mt-4 text-xs text-slate-600">or load a preset to see a demo</div>
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="lg:col-span-2 order-2 lg:order-1 space-y-4 fade-up">
          <div className="bg-navy-2 border border-white/[0.06] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Identity</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Borrower Name" name="borrower_name" type="text" value={form.borrower_name} onChange={set} hint="Full name" />
              <Field label="Phone" name="phone" type="text" value={form.phone} onChange={set} hint="+263..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Business Type" name="business_type" value={form.business_type} onChange={set} options={BIZ_TYPES} />
              <Field label="Province" name="province" value={form.province} onChange={set} options={PROVINCES} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Age" name="age" value={form.age} onChange={set} step="1" min="18" max="80" />
              <Field label="Yrs in Business" name="years_in_business" value={form.years_in_business} onChange={set} step="1" />
              <Field label="Monthly Rev ($)" name="monthly_revenue_usd" value={form.monthly_revenue_usd} onChange={set} step="10" />
            </div>
          </div>

          <div className="bg-navy-2 border border-white/[0.06] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mobile Money (28%)</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Consistency (0–1)" name="mm_consistency_score" value={form.mm_consistency_score} onChange={set} />
              <Field label="Months Active" name="mm_months_active" value={form.mm_months_active} onChange={set} step="1" />
              <Field label="Inflow Ratio" name="mm_inflow_ratio" value={form.mm_inflow_ratio} onChange={set} />
              <Field label="Avg Balance ($)" name="mm_avg_balance_usd" value={form.mm_avg_balance_usd} onChange={set} step="5" />
            </div>
          </div>

          <div className="bg-navy-2 border border-white/[0.06] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Repayment History (22%)</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prior Loans" name="prior_loans_count" value={form.prior_loans_count} onChange={set} step="1" min="0" />
              <Field label="Repayment Rate" name="repayment_rate" value={form.repayment_rate} onChange={set} hint="0–1, blank if none" />
            </div>
            <Field label="Days Late (recent)" name="days_late_recent_loan" value={form.days_late_recent_loan} onChange={set} step="1" min="0" />
          </div>

          <div className="bg-navy-2 border border-white/[0.06] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Savings Group (12%)</h3>
            <Field label="Rounds Member?" name="is_rounds_member" value={form.is_rounds_member} onChange={set} type="toggle" />
            {Number(form.is_rounds_member) === 1 && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Consistency (0–1)" name="rounds_consistency_score" value={form.rounds_consistency_score} onChange={set} />
                <Field label="Tenure (months)" name="rounds_tenure_months" value={form.rounds_tenure_months} onChange={set} step="1" />
                <Field label="Is Organizer?" name="is_rounds_organizer" value={form.is_rounds_organizer} onChange={set} type="toggle" />
              </div>
            )}
          </div>

          <div className="bg-navy-2 border border-white/[0.06] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Utilities & Community</h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ZESA Consistency" name="zesa_payment_consistency" value={form.zesa_payment_consistency} onChange={set} />
              <Field label="Revenue CV" name="revenue_cv" value={form.revenue_cv} onChange={set} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Has References?" name="has_references" value={form.has_references} onChange={set} type="toggle" />
              <Field label="Fixed Location?" name="has_fixed_location" value={form.has_fixed_location} onChange={set} type="toggle" />
            </div>
          </div>

          <button onClick={submit} disabled={loading}
            className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all text-sm">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Scoring...</> : <><Send size={14} /> Generate PAMOJA Score</>}
          </button>

          {error && (
            <div className="p-3 bg-red-400/10 border border-red-400/20 rounded-lg text-sm text-red-300">{error}</div>
          )}
        </div>

        {/* Result */}
        <div className="lg:col-span-3">
          {result ? (
            <ScoreCard result={result} borrowerName={result.borrowerName} />
          ) : (
            <div className="h-full min-h-64 bg-navy-2 border border-white/[0.06] rounded-2xl flex items-center justify-center">
              <div className="text-center text-slate-500">
                <div className="text-4xl mb-3 opacity-20">◎</div>
                <div className="text-sm">Fill in borrower details and click</div>
                <div className="text-sm font-medium text-slate-400 mt-1">"Generate PAMOJA Score"</div>
                <div className="mt-4 text-xs text-slate-600">or load a preset to see a demo</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
