'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Mail, Lock, User, AlertCircle, Loader2, UserPlus, Building2, TrendingUp, Shield, Zap } from 'lucide-react'
import { useAuth } from '../../components/AuthProvider'
import axios from 'axios'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'lender' | 'sme'>('lender')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const res = await axios.post('/api/auth/register', { 
        email, 
        password, 
        full_name: fullName, 
        role 
      })
      const { access_token, role: userRole, full_name } = res.data
      login(access_token, userRole, full_name, email)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Left Panel — Brand Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative hero-gradient items-center justify-center p-12">
        <div className="orb orb-brand w-[400px] h-[400px] top-0 -right-32" />
        <div className="orb orb-violet w-[300px] h-[300px] -bottom-32 -left-16" />
        
        <div className="relative z-10 max-w-md">
          <Link href="/" className="font-serif text-2xl font-bold text-slate-900 tracking-tight mb-12 block">
            PAMOJA<span className="text-brand">.</span>AI
          </Link>
          
          <h2 className="text-4xl font-serif font-extrabold text-gradient-hero tracking-tight leading-tight mb-6">
            Join the credit<br/>revolution.
          </h2>
          <p className="text-slate-500 text-base leading-relaxed mb-12">
            Whether you're a lender looking for better risk signals, or an SME building your credit identity — PAMOJA AI is your gateway to open finance.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {[
              { value: '0.946', label: 'Model AUC' },
              { value: '55K+', label: 'Loans Trained' },
              { value: '<2s', label: 'Response Time' },
              { value: '7+', label: 'Signal Layers' },
            ].map(({ value, label }) => (
              <div key={label} className="glass-card rounded-xl p-4">
                <div className="text-xl font-serif font-bold text-slate-900">{value}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
        <div className="absolute inset-0 mesh-gradient opacity-30" />
        
        <div className="w-full max-w-lg relative z-10 fade-up">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="font-serif text-xl font-bold text-slate-900 tracking-tight">
              PAMOJA<span className="text-brand">.</span>AI
            </Link>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand/20 to-brand/5 text-brand mb-6 brand-glow">
              <UserPlus size={32} />
            </div>
            <h1 className="text-3xl font-serif font-extrabold text-gradient tracking-tight mb-2">Create Account</h1>
            <p className="text-slate-500 text-sm">Join the alternative credit revolution in Zimbabwe</p>
          </div>

          <div className="glass-card-premium rounded-3xl p-8 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
                  <AlertCircle size={16} />
                  <span className="font-bold">{error}</span>
                </div>
              )}

              {/* Role Selection */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('lender')}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all duration-300 ${
                    role === 'lender' 
                    ? 'border-brand bg-blue-50 text-brand ring-1 ring-brand brand-glow' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${role === 'lender' ? 'bg-brand/20' : 'bg-slate-100'}`}>
                    <TrendingUp size={22} />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest block">Lender</span>
                    <span className="text-[10px] opacity-60 block mt-0.5">Score borrowers</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('sme')}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all duration-300 ${
                    role === 'sme' 
                    ? 'border-brand bg-blue-50 text-brand ring-1 ring-brand brand-glow' 
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${role === 'sme' ? 'bg-brand/20' : 'bg-slate-100'}`}>
                    <Building2 size={22} />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest block">SME</span>
                    <span className="text-[10px] opacity-60 block mt-0.5">My credit insights</span>
                  </div>
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Full Name
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand transition-colors" size={18} />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-600 focus:outline-none focus:border-brand/40 focus:bg-slate-50 transition-all"
                      placeholder="Tendai Moyo"
                    />
                  </div>
                </div>

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
                    Create Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand transition-colors" size={18} />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-600 focus:outline-none focus:border-brand/40 focus:bg-slate-50 transition-all"
                      placeholder="Min. 8 characters"
                      minLength={8}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 text-base"
              >
                {loading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <>Create Account <ArrowRight size={20} /></>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-500">
                Already have an account?{' '}
                <Link href="/login" className="text-brand font-bold hover:text-brand-hover hover:underline transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
