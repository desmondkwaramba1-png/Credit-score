'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Mail, Lock, AlertCircle, Loader2, ShieldCheck, TrendingUp, Users, Zap } from 'lucide-react'
import { useAuth } from '../../components/AuthProvider'
import axios from 'axios'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const res = await axios.post('/api/auth/login', { email, password })
      const { access_token, role, full_name } = res.data
      login(access_token, role, full_name, email)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left Panel — Brand Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative hero-gradient items-center justify-center p-12">
        <div className="orb orb-brand w-[400px] h-[400px] -top-32 -left-32" />
        <div className="orb orb-teal w-[300px] h-[300px] bottom-0 right-0" />
        
        <div className="relative z-10 max-w-md">
          <Link href="/" className="font-serif text-2xl font-bold text-slate-900 tracking-tight mb-12 block">
            PAMOJA<span className="text-brand">.</span>AI
          </Link>
          
          <h2 className="text-4xl font-serif font-extrabold text-gradient-hero tracking-tight leading-tight mb-6">
            Open Finance<br/>for Zimbabwe.
          </h2>
          <p className="text-slate-500 text-base leading-relaxed mb-12">
            Institutional-grade credit scoring powered by mobile money, utility payments, and community trust networks.
          </p>

          <div className="space-y-4">
            {[
              { icon: TrendingUp, text: 'AUC 0.9459 predictive accuracy', color: 'text-emerald-600' },
              { icon: Users, text: '55,305 real loan outcomes trained', color: 'text-brand' },
              { icon: Zap, text: 'Sub-2 second scoring response', color: 'text-amber-600' },
            ].map(({ icon: Icon, text, color }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-slate-600">
                <div className={`w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center ${color}`}>
                  <Icon size={16} />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
        <div className="absolute inset-0 mesh-gradient opacity-30" />
        
        <div className="w-full max-w-md relative z-10 fade-up">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="font-serif text-xl font-bold text-slate-900 tracking-tight">
              PAMOJA<span className="text-brand">.</span>AI
            </Link>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand/20 to-brand/5 text-brand mb-6 brand-glow">
              <ShieldCheck size={32} />
            </div>
            <h1 className="text-3xl font-serif font-extrabold text-gradient tracking-tight mb-2">Welcome Back</h1>
            <p className="text-slate-500 text-sm">Secure access to your PAMOJA AI dashboard</p>
          </div>

          <div className="glass-card-premium rounded-3xl p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
                  <AlertCircle size={16} />
                  <span className="font-bold">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Organization Email
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand transition-colors" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-600 focus:outline-none focus:border-brand/40 focus:bg-slate-50 transition-all"
                    placeholder="name@institution.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                  Secure Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand transition-colors" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-600 focus:outline-none focus:border-brand/40 focus:bg-slate-50 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-4 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-base"
              >
                {loading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <>Sign In <ArrowRight size={20} /></>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-500">
                New to PAMOJA?{' '}
                <Link href="/register" className="text-brand font-bold hover:text-brand-hover hover:underline transition-colors">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
