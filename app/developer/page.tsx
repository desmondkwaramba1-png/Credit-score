'use client'
import { useState } from 'react'
import axios from 'axios'
import { Copy, Check, Play, ChevronDown, ChevronRight } from 'lucide-react'

function CodeBlock({ code, lang = 'python' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div className="relative group">
      <div className="bg-[#0d1117] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.03]">
          <span className="text-xs font-mono text-slate-500">{lang}</span>
          <button onClick={copy} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors">
            {copied ? <><Check size={11} className="text-green-400" /> Copied</> : <><Copy size={11} /> Copy</>}
          </button>
        </div>
        <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">{code}</pre>
      </div>
    </div>
  )
}

function Endpoint({ method, path, desc, children }: {
  method: string; path: string; desc: string; children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const colors: Record<string, string> = {
    GET: 'bg-sky-400/10 text-sky-400 border-sky-400/20',
    POST: 'bg-green-400/10 text-green-400 border-green-400/20',
  }
  return (
    <div className="bg-navy-2 border border-white/[0.06] rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left">
        <span className={`text-xs font-mono font-semibold px-2 py-1 rounded border ${colors[method]}`}>{method}</span>
        <span className="font-mono text-sm text-white">{path}</span>
        <span className="text-sm text-slate-500 ml-2 hidden sm:block">{desc}</span>
        {open ? <ChevronDown size={14} className="ml-auto text-slate-500" /> : <ChevronRight size={14} className="ml-auto text-slate-500" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-white/[0.04]">{children}</div>}
    </div>
  )
}

const PY_SCORE = `import requests

# Score a borrower using behavioral signals
result = requests.post("https://pamoja-backend-egyp.onrender.com/score",
    headers={"X-API-Key": "pk_demo_zw_pamoja2026"},
    json={
        "phone": "+263771234567",
        "borrower_name": "Tendai Moyo",
        "data": {
            "business_type": "tuck_shop",
            "province": "Harare",
            "age": 34,
            "years_in_business": 4,
            "mm_consistency_score": 0.82,
            "mm_months_active": 38,
            "mm_inflow_ratio": 1.35,
            "mm_avg_balance_usd": 78,
            "mm_tx_count_monthly": 45,
            "prior_loans_count": 2,
            "repayment_rate": 0.92,
            "is_rounds_member": 1,
            "rounds_consistency_score": 0.88,
            "zesa_payment_consistency": 0.75,
            "monthly_revenue_usd": 420,
        }
    }
).json()

print(result["result"]["score"])   # 811
print(result["result"]["band"])    # Excellent
print(result["result"]["default_probability"])  # 0.071`

const JS_SCORE = `// Score a borrower — JavaScript / Node.js
const response = await fetch("https://pamoja-backend-egyp.onrender.com/score", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "pk_demo_zw_pamoja2026"
  },
  body: JSON.stringify({
    phone: "+263771234567",
    borrower_name: "Tendai Moyo",
    data: {
      business_type: "tuck_shop",
      province: "Harare",
      age: 34,
      years_in_business: 4,
      mm_consistency_score: 0.82,
      mm_months_active: 38,
      prior_loans_count: 2,
      repayment_rate: 0.92,
      is_rounds_member: 1,
      monthly_revenue_usd: 420,
    }
  })
})

const { result } = await response.json()
console.log(result.score)  // 811`

const PY_LOAN = `# Score a specific loan application (lender mode)
result = requests.post("https://pamoja-backend-egyp.onrender.com/score/loan",
    headers={"X-API-Key": "pk_demo_zw_pamoja2026"},
    json={
        "phone": "+263771234567",
        "interest_rate_pct": 0.04,      # 4% interest on loan
        "total_amount": 5000,
        "total_amount_to_repay": 5200,
        "duration_days": 7,
        "prior_loans_count": 12,
        "prior_defaults": 0,
        "new_versus_repeat": "Repeat",
        "lender_portion_funded": 0.30,
        "days_since_last_loan": 7,
        "monthly_revenue_usd": 420,
    }
).json()

print(result["result"]["score"])   # AUC 0.9459 loan model`

export default function DeveloperPage() {
  const [testResult, setTestResult] = useState<any>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testError, setTestError] = useState('')

  const runTest = async () => {
    setTestLoading(true); setTestError(''); setTestResult(null)
    try {
      const res = await axios.get('/api/health')
      setTestResult(res.data)
    } catch {
      setTestError('Backend offline. Run: uvicorn api.index:app --reload')
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 fade-up">
        <h1 className="text-2xl font-serif font-bold text-white">API & Developer Docs</h1>
        <p className="text-slate-400 text-sm mt-1">
          REST API for integrating PAMOJA Credit Scoring into your application.
          Python, JavaScript, and PHP SDKs available.
        </p>
      </div>

      {/* Base URL + Auth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 fade-up-2">
        <div className="bg-navy-2 border border-white/[0.06] rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Base URL</div>
          <div className="font-mono text-sm text-brand">https://pamoja-backend-egyp.onrender.com</div>
          <div className="text-xs text-slate-600 mt-1">Staging: http://localhost:8000</div>
        </div>
        <div className="bg-navy-2 border border-white/[0.06] rounded-xl p-4">
          <div className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Authentication</div>
          <div className="font-mono text-sm text-yellow-400">X-API-Key: pk_demo_zw_...</div>
          <div className="text-xs text-slate-600 mt-1">Include in every request header</div>
        </div>
      </div>

      {/* Health check */}
      <div className="mb-4 fade-up">
        <div className="bg-navy-2 border border-white/[0.06] rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-white">API Connection Test</div>
            <div className="text-xs text-slate-500 mt-0.5">Verify your backend is running</div>
          </div>
          <button onClick={runTest} disabled={testLoading}
            className="flex items-center gap-2 text-sm bg-brand/10 border border-brand/30 text-brand hover:bg-brand/20 px-4 py-2 rounded-lg transition-all">
            {testLoading ? <span className="animate-spin">↻</span> : <Play size={13} />}
            Test GET /health
          </button>
        </div>
        {testResult && (
          <pre className="mt-2 bg-[#0d1117] border border-white/[0.06] rounded-xl p-4 text-xs font-mono text-green-400 overflow-x-auto">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        )}
        {testError && (
          <div className="mt-2 p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-sm text-red-300">
            {testError}
          </div>
        )}
      </div>

      {/* Endpoints */}
      <div className="space-y-3 mb-8 fade-up-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Endpoints</h2>

        <Endpoint method="GET" path="/health" desc="API health check">
          <div className="mt-4">
            <CodeBlock lang="curl" code={`curl https://pamoja-backend-egyp.onrender.com/health \\
  -H "X-API-Key: pk_demo_zw_pamoja2026"`} />
          </div>
        </Endpoint>

        <Endpoint method="POST" path="/score" desc="Score a borrower from behavioral signals">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-400">
              Scores a borrower using mobile money behavior, savings groups, utility payments, and business signals.
              Uses hybrid ML + rules model. Best for Customer SDK and MFI borrower assessment.
            </p>
            <CodeBlock lang="python" code={PY_SCORE} />
            <CodeBlock lang="javascript" code={JS_SCORE} />
          </div>
        </Endpoint>

        <Endpoint method="POST" path="/score/loan" desc="Score a specific loan application">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-400">
              Scores a loan application using the real-data model trained on 55,305 African loan outcomes.
              AUC 0.9459. Uses interest rate, duration, repayment history. Best for lenders evaluating specific applications.
            </p>
            <CodeBlock lang="python" code={PY_LOAN} />
          </div>
        </Endpoint>

        <Endpoint method="POST" path="/score/batch" desc="Score up to 100 borrowers at once">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-400">
              Same as /score but accepts an array of borrowers. Used by MFIs to score their entire loan book.
            </p>
            <CodeBlock lang="python" code={`# Batch score multiple borrowers
result = requests.post("https://pamoja-backend-egyp.onrender.com/score/batch",
    headers={"X-API-Key": "pk_demo_zw_pamoja2026"},
    json={"borrowers": [
        {"phone": "+263771234567", "data": {...}},
        {"phone": "+263772345678", "data": {...}},
        # up to 100 borrowers
    ]}
).json()

for r in result["results"]:
    print(r["phone"], r["result"]["score"])`} />
          </div>
        </Endpoint>
      </div>

      {/* Score bands */}
      <div className="bg-navy-2 border border-white/[0.06] rounded-xl p-5 mb-6 fade-up">
        <h3 className="text-sm font-semibold text-white mb-4">Score bands (300–850)</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Band','Range','Typical Default Rate','Loan Limit','Suggested APR'].map(h => (
                <th key={h} className="text-left pb-2 text-slate-500 font-semibold pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono">
            {[
              ['Excellent', '740–850', '~3–5%',   'up to $2,000', '9%'],
              ['Very Good', '660–739', '~6–9%',   'up to $1,200', '13%'],
              ['Good',      '580–659', '~10–15%', 'up to $600',   '17%'],
              ['Fair',      '500–579', '~16–22%', 'up to $300',   '22%'],
              ['Poor',      '300–499', '~30–50%', 'up to $150',   '28%'],
            ].map(([band, range, dr, limit, rate]) => (
              <tr key={band} className="border-b border-white/[0.04]">
                <td className={`py-2 pr-4 font-semibold ${BAND_COLOR[band] || 'text-white'}`}>{band}</td>
                <td className="py-2 pr-4 text-slate-400">{range}</td>
                <td className="py-2 pr-4 text-slate-400">{dr}</td>
                <td className="py-2 pr-4 text-slate-400">{limit}</td>
                <td className="py-2 text-slate-400">{rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Setup */}
      <div className="bg-navy-2 border border-white/[0.06] rounded-xl p-5 fade-up">
        <h3 className="text-sm font-semibold text-white mb-4">Local setup</h3>
        <CodeBlock lang="bash" code={`# 1. Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev

# App runs at http://localhost:3000
# API docs at http://localhost:8000/docs`} />
      </div>
    </div>
  )
}

const BAND_COLOR: Record<string, string> = {
  Excellent: 'text-green-400', 'Very Good': 'text-lime-400',
  Good: 'text-yellow-400', Fair: 'text-orange-400', Poor: 'text-red-400',
}
