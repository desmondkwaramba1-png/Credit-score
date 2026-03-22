'use client'
import { useState } from 'react'
import axios from 'axios'
import { Upload, Download, Loader2, FileText } from 'lucide-react'

const BAND_COLOR: Record<string, string> = {
  Excellent: 'text-green-400', 'Very Good': 'text-lime-400',
  Good: 'text-yellow-400', Fair: 'text-orange-400', Poor: 'text-red-400',
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
  const [results, setResults] = useState<BatchResult[]>([])
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
        { headers: { 'X-API-Key': 'pk_demo_zw_pamoja2026' } })
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
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="fade-up">
        <h1 className="text-2xl font-serif font-bold text-white">Batch Scoring</h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload a CSV of borrowers and get PAMOJA scores for all of them at once.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-up-2">
        {/* Upload */}
        <div className="lg:col-span-2">
          <div className="bg-navy-2 border border-dashed border-white/[0.12] rounded-xl p-8 text-center hover:border-brand/40 transition-all">
            <Upload size={28} className="text-slate-500 mx-auto mb-3" />
            <div className="text-sm text-white font-medium mb-1">Drop CSV file here</div>
            <div className="text-xs text-slate-500 mb-4">or click to browse</div>
            <label className="cursor-pointer">
              <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
              <span className="bg-brand/10 border border-brand/30 text-brand hover:bg-brand/20 text-sm px-4 py-2 rounded-lg transition-all">
                Select CSV file
              </span>
            </label>
          </div>
        </div>
        {/* Sample */}
        <div className="bg-navy-2 border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-400">CSV Format</span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 leading-relaxed break-all">
            borrower_name, phone,<br/>
            business_type, province,<br/>
            age, years_in_business,<br/>
            mm_consistency_score,<br/>
            mm_months_active, ...
          </div>
          <button onClick={() => {
            const a = document.createElement('a')
            a.href = URL.createObjectURL(new Blob([SAMPLE_CSV], { type: 'text/csv' }))
            a.download = 'pamoja_sample.csv'; a.click()
          }}
            className="mt-3 w-full text-xs text-brand hover:text-brand-hover flex items-center justify-center gap-1.5 py-2 border border-brand/20 rounded-lg hover:border-brand/40 transition-all">
            <Download size={11} /> Download sample CSV
          </button>
          <button onClick={() => { setCsvText(SAMPLE_CSV); runBatch(SAMPLE_CSV) }}
            className="mt-2 w-full text-xs text-slate-400 hover:text-white py-2 border border-white/[0.08] rounded-lg hover:border-white/20 transition-all">
            Run sample data
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-400/10 border border-red-400/20 rounded-lg text-sm text-red-300">{error}</div>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-slate-400 text-sm mb-4">
          <Loader2 size={16} className="animate-spin text-brand" />
          Scoring all borrowers...
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-navy-2 border border-white/[0.06] rounded-xl overflow-hidden fade-up">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <span className="text-sm font-semibold text-white">{results.length} borrowers scored</span>
            <button onClick={downloadCSV}
              className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-hover border border-brand/30 hover:border-brand/60 px-3 py-1.5 rounded-lg transition-all">
              <Download size={12} /> Download results
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Name','Phone','Score','Band','Default Risk','Limit','Rate','Method'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    {r.result ? (
                      <>
                        <td className="px-4 py-3 text-white font-medium">{r.borrower_name || '—'}</td>
                        <td className="px-4 py-3 font-mono text-slate-400 text-xs">{r.phone || '—'}</td>
                        <td className="px-4 py-3 font-mono text-white font-semibold">{r.result.score}</td>
                        <td className={`px-4 py-3 font-medium ${BAND_COLOR[r.result.band] || 'text-white'}`}>
                          {r.result.band}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {(r.result.default_probability * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-slate-300 font-mono">
                          ${r.result.loan_recommendation.recommended_limit_usd.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {r.result.loan_recommendation.suggested_rate_apr}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs font-mono">
                          {r.result.scoring_method}
                        </td>
                      </>
                    ) : (
                      <td colSpan={8} className="px-4 py-3 text-red-400 text-xs">{r.error}</td>
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
