'use client'
import { useState } from 'react'
import axios from 'axios'
import { Upload, Download, Loader2, FileText, Sparkles, BarChart3 } from 'lucide-react'
import { useAuth } from '../../components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const BAND_COLOR: Record<string, string> = {
  'Excellent': 'text-emerald-600',
  'Good':      'text-lime-400',
  'Fair':      'text-amber-600',
  'Poor':      'text-orange-400',
  'Very Poor': 'text-rose-600',
}

const SAMPLE_CSV = `borrower_name,phone,business_type,province,age,years_in_business,mm_consistency_score,mm_months_active,mm_inflow_ratio,mm_avg_balance_usd,prior_loans_count,repayment_rate,is_rounds_member,rounds_consistency_score,zesa_payment_consistency,monthly_revenue_usd,has_references,has_fixed_location
Tendai Moyo,+263771234567,tuck_shop,Harare,34,4,0.82,38,1.35,78,2,0.92,1,0.88,0.75,420,1,1
Farai Ncube,+263772345678,freelancer,Bulawayo,23,0,0.38,8,0.85,15,0,,,0.28,120,0,0
Amai Sibanda,+263773456789,market_trader,Harare,45,12,0.72,48,1.2,55,0,,1,0.91,0.82,280,1,1
Bongani Moyo,+263774567890,kombi_operator,Bulawayo,28,1,0.25,5,0.7,8,1,0.45,0,,0.15,95,0,0`

interface BatchResult {
  index: number
  phone: string
  borrower_name: string
  result: any
  error: string | null
}

export default function BatchPage() {
  const { user, token, loading: authLoading } = useAuth()
  const router = useRouter()
  const [results, setResults] = useState<BatchResult[]>([])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (authLoading) return <div className="p-8 text-slate-500 animate-pulse">Checking authorization...</div>
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [csvText, setCsvText] = useState('')

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    return lines.slice(1).map(line => {
      const vals = line.split(',')
      const obj: Record<string, any> = {}
      headers.forEach((h, i) => {
        const v = vals[i]?.trim()
        if (v === '' || v === undefined) { obj[h] = null; return }
        const n = parseFloat(v)
        obj[h] = isNaN(n) ? v : n
      })
      return obj
    })
  }

  const runBatch = async (text: string) => {
    setLoading(true); setError(''); setResults([])
    try {
      const rows = parseCSV(text)
      const borrowers = rows.map(r => {
        const { borrower_name, phone, ...data } = r
        return { phone: String(phone || ''), borrower_name: String(borrower_name || ''), data }
      })
      const res = await axios.post('/api/score/batch', { borrowers },
        { 
          headers: { 
            'X-API-Key': 'pk_demo_zw_pamoja2026',
            'Authorization': `Bearer ${token}`
          } 
        })
      setResults(res.data.results)
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Backend offline — start the FastAPI server.')
    } finally {
      setLoading(false)
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setCsvText(text)
      runBatch(text)
    }
    reader.readAsText(file)
  }

  const downloadCSV = () => {
    if (!results.length) return
    const headers = ['name','phone','score','band','default_prob','limit_usd','rate_apr','method']
    const rows = results
      .filter(r => r.result)
      .map(r => [
        r.borrower_name, r.phone, r.result.score, r.result.band,
        r.result.default_probability, r.result.loan_recommendation.recommended_limit_usd,
        r.result.loan_recommendation.suggested_rate_apr, r.result.scoring_method
      ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'pamoja_scores.csv'; a.click()
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="fade-up space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-violet/10 border border-accent-violet/20 text-accent-violet text-[10px] font-bold uppercase tracking-widest">
          <Sparkles size={10} /> Institutional Scale
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-extrabold text-gradient tracking-tight">
          Batch Scoring
        </h1>
        <p className="text-slate-500 text-base max-w-2xl">
          Upload bulk borrower data via CSV for instant institutional-scale risk assessment and credit limit recommendations.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 fade-up">
        {/* Upload Area */}
        <div className="lg:col-span-3">
          <label className="group cursor-pointer block">
            <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
            <div className="glass-card-premium rounded-3xl p-12 text-center border-dashed border-slate-200 group-hover:border-brand/40 group-hover:bg-brand/[0.02] transition-all">
              <div className="w-20 h-20 bg-gradient-to-br from-white/[0.04] to-white/[0.01] rounded-3xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform">
                <Upload size={34} className="text-slate-500 group-hover:text-brand transition-colors" />
              </div>
              <div className="text-xl font-bold text-slate-900 mb-2">Click or Drop CSV</div>
              <p className="text-xs text-slate-500 mb-8 max-w-xs mx-auto">
                Ensure your file follows the required format with phone numbers and business data.
              </p>
              <span className="btn-primary text-xs font-bold uppercase tracking-widest px-8 py-3 rounded-xl inline-block">
                Select CSV File
              </span>
            </div>
          </label>
        </div>

        {/* Format Sidebar */}
        <div className="space-y-4">
          <div className="glass-card-premium rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-brand" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Required Schema</span>
            </div>
            <div className="bg-slate-100 rounded-xl p-3 text-[10px] font-mono text-slate-500 leading-relaxed border border-white/[0.03]">
              borrower_name, phone,<br/>
              business_type, province,<br/>
              age, years_in_business,<br/>
              mm_consistency_score,<br/>
              mm_months_active, ...
            </div>
            <div className="pt-2 space-y-2">
              <button onClick={() => {
                const a = document.createElement('a')
                a.href = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: 'text/csv' }))
                a.download = 'pamoja_sample.csv'; a.click()
              }}
                className="w-full text-[10px] font-bold uppercase tracking-widest text-brand hover:text-slate-900 flex items-center justify-center gap-2 py-2.5 border border-brand/20 rounded-xl hover:bg-brand transition-all">
                <Download size={12} /> Get Sample
              </button>
              <button onClick={() => { setCsvText(SAMPLE_CSV); runBatch(SAMPLE_CSV) }}
                className="w-full text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 py-2.5 border border-slate-200 rounded-xl hover:bg-white transition-all">
                Test with Mock Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-sm text-rose-600">{error}</div>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-slate-500 text-sm mb-4 glass-card-premium rounded-xl p-4">
          <Loader2 size={16} className="animate-spin text-brand" />
          Scoring all borrowers...
        </div>
      )}

      {results.length > 0 && (
        <div className="glass-card-premium rounded-2xl overflow-hidden fade-up">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-brand">
                <BarChart3 size={16} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-slate-900">{results.length}</span>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Processed Records</span>
              </div>
            </div>
            <button onClick={downloadCSV}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand hover:text-slate-900 border border-brand/30 hover:bg-brand px-4 py-2 rounded-xl transition-all brand-glow">
              <Download size={14} /> Export Results
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {['Name','Phone','Score','Band','Default Risk','Limit','Rate','Method'].map(h => (
                    <th key={h} className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors group">
                    {r.result ? (
                      <>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-slate-900 group-hover:text-brand transition-colors">{r.borrower_name || '—'}</div>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-500 text-xs">{r.phone || '—'}</td>
                        <td className="px-6 py-4">
                           <div className="text-lg font-serif font-bold text-slate-900 leading-none">{r.result.score}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white ${BAND_COLOR[r.result.band] || 'text-slate-900'}`}>
                            {r.result.band}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {(r.result.default_probability * 100).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 text-slate-900 font-mono font-bold">
                          ${r.result.loan_recommendation.recommended_limit_usd.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {r.result.loan_recommendation.suggested_rate_apr}
                        </td>
                        <td className="px-6 py-4 text-[10px] font-mono text-slate-600">
                          {r.result.scoring_method}
                        </td>
                      </>
                    ) : (
                      <td colSpan={8} className="px-6 py-4 text-rose-600 text-xs italic">{r.error}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
