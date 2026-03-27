'use client'
import { useState } from 'react'
import axios from 'axios'
import { Copy, Check, Play, ChevronDown, ChevronRight, Sparkles, Terminal, Globe } from 'lucide-react'

function CodeBlock({ code, lang = 'python' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div className="relative group">
      <div className="bg-[#0a0e14] border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/30" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/30" />
            </div>
            <span className="text-xs font-mono text-slate-500 ml-2">{lang}</span>
          </div>
          <button onClick={copy} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors">
            {copied ? <><Check size={11} className="text-emerald-600" /> Copied</> : <><Copy size={11} /> Copy</>}
          </button>
        </div>
        <pre className="p-4 text-xs font-mono text-slate-600 overflow-x-auto leading-relaxed">{code}</pre>
      </div>
    </div>
  )
}

function Endpoint({ method, path, desc, children }: {
  method: string; path: string; desc: string; children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const colors: Record<string, string> = {
    GET: 'bg-sky-100 text-sky-700 text-sky-600 border-sky-200',
    POST: 'bg-emerald-100 text-emerald-700 text-emerald-600 border-emerald-200',
  }
  return (
    <div className="glass-card-premium rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left">
        <span className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border ${colors[method]}`}>{method}</span>
        <span className="font-mono text-sm text-slate-900">{path}</span>
        <span className="text-sm text-slate-500 ml-2 hidden sm:block">{desc}</span>
        {open ? <ChevronDown size={14} className="ml-auto text-slate-500" /> : <ChevronRight size={14} className="ml-auto text-slate-500" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-slate-100">{children}</div>}
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

const BAND_COLOR: Record<string, string> = {
  Excellent: 'text-emerald-600', 'Very Good': 'text-lime-400',
  Good: 'text-amber-600', Fair: 'text-orange-400', Poor: 'text-rose-600',
}

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
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <header className="fade-up space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-violet/10 border border-accent-violet/20 text-accent-violet text-[10px] font-bold uppercase tracking-widest">
          <Terminal size={10} /> Documentation v0.4.0
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-extrabold text-gradient tracking-tight">
          Developer Portal
        </h1>
        <p className="text-slate-500 text-base max-w-2xl">
          Integrate PAMOJA AI's institutional-grade credit scoring into your own financial products using our robust REST API and SDKs.
        </p>
      </header>

      {/* Base URL + Auth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 fade-up stagger">
        <div className="glass-card-premium rounded-2xl p-6 relative overflow-hidden group feature-card fade-up">
          <div className="flex items-center gap-2 mb-3">
            <Globe size={14} className="text-brand" />
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Production Endpoint</div>
          </div>
          <div className="font-mono text-sm text-brand font-bold">https://pamoja-backend-egyp.onrender.com</div>
          <div className="text-[10px] text-slate-600 mt-4 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Global High Availability
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-blue-50 transition-colors" />
        </div>
        <div className="glass-card-premium rounded-2xl p-6 relative overflow-hidden group feature-card fade-up">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-amber-600" />
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authentication</div>
          </div>
          <div className="font-mono text-sm text-amber-600 font-bold border-b border-amber-200 pb-1 w-fit">X-API-Key: pk_demo_zw_...</div>
          <div className="text-[10px] text-slate-600 mt-4">
             Pass this as a header in all REST requests.
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-amber-100 text-amber-700 transition-colors" />
        </div>
      </div>

      {/* Health check */}
      <div className="fade-up">
        <div className="glass-card-premium rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border-brand/20">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${testResult ? 'bg-emerald-100 text-emerald-700 text-emerald-600' : 'bg-blue-50 text-brand'}`}>
              <Play size={24} className={testLoading ? 'animate-pulse' : ''} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">System Connectivity</h3>
              <p className="text-xs text-slate-500">Test your credentials and connection to our scoring engine.</p>
            </div>
          </div>
          <button onClick={runTest} disabled={testLoading}
            className="whitespace-nowrap btn-primary px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest">
            {testLoading ? 'Testing...' : 'Run Diagnostics'}
          </button>
        </div>
        
        {testResult && (
          <div className="mt-4 animate-in slide-in-from-top-4 duration-500">
             <CodeBlock lang="json" code={JSON.stringify(testResult, null, 2)} />
          </div>
        )}
        {testError && (
          <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-600 flex items-center gap-3">
             <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">!</div>
             {testError}
          </div>
        )}
      </div>

      {/* Endpoints */}
      <div className="space-y-3 mb-8 fade-up-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Terminal size={14} className="text-brand" /> Endpoints
        </h2>

        <Endpoint method="GET" path="/health" desc="API health check">
          <div className="mt-4">
            <CodeBlock lang="curl" code={`curl https://pamoja-backend-egyp.onrender.com/health \\
  -H "X-API-Key: pk_demo_zw_pamoja2026"`} />
          </div>
        </Endpoint>

        <Endpoint method="POST" path="/score" desc="Score a borrower from behavioral signals">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-500">
              Scores a borrower using mobile money behavior, savings groups, utility payments, and business signals.
              Uses hybrid ML + rules model. Best for Customer SDK and MFI borrower assessment.
            </p>
            <CodeBlock lang="python" code={PY_SCORE} />
            <CodeBlock lang="javascript" code={JS_SCORE} />
          </div>
        </Endpoint>

        <Endpoint method="POST" path="/score/loan" desc="Score a specific loan application">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-500">
              Scores a loan application using the real-data model trained on 55,305 African loan outcomes.
              AUC 0.9459. Uses interest rate, duration, repayment history. Best for lenders evaluating specific applications.
            </p>
            <CodeBlock lang="python" code={PY_LOAN} />
          </div>
        </Endpoint>

        <Endpoint method="POST" path="/score/batch" desc="Score up to 100 borrowers at once">
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-500">
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
      <div className="glass-card-premium rounded-xl p-5 mb-6 fade-up">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Score bands (300–850)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                {['Band','Range','Typical Default Rate','Loan Limit','Suggested APR'].map(h => (
                  <th key={h} className="text-left pb-3 text-slate-500 font-semibold pr-4 text-[10px] uppercase tracking-widest">{h}</th>
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
                <tr key={band} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className={`py-3 pr-4 font-semibold ${BAND_COLOR[band] || 'text-slate-900'}`}>{band}</td>
                  <td className="py-3 pr-4 text-slate-500">{range}</td>
                  <td className="py-3 pr-4 text-slate-500">{dr}</td>
                  <td className="py-3 pr-4 text-slate-500">{limit}</td>
                  <td className="py-3 text-slate-500">{rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Setup */}
      <div className="glass-card-premium rounded-xl p-5 fade-up">
        <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Terminal size={14} className="text-brand" /> Local setup
        </h3>
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
