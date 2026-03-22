'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Mail, Lock, User, AlertCircle, Loader2, UserPlus, Building2 } from 'lucide-react'
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
    <div className="min-h-[90vh] flex items-center justify-center p-4">
      <div className="w-full max-w-lg fade-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand/10 text-brand mb-4">
            <UserPlus size={28} />
          </div>
          <h1 className="text-3xl font-serif font-bold text-white mb-2">Create Account</h1>
          <p className="text-slate-400 text-sm">Join the alternative credit revolution in Zimbabwe</p>
        </div>

        {/* Card */}
        <div className="bg-navy-2 border border-white/[0.06] rounded-2xl p-8 shadow-2xl shadow-black/40">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Role Selection */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('lender')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  role === 'lender' 
                  ? 'border-brand bg-brand/10 text-brand ring-1 ring-brand' 
                  : 'border-white/[0.08] bg-navy text-slate-500 hover:border-white/20'
                }`}
              >
                <User size={24} />
                <span className="text-sm font-semibold">I am a Lender</span>
                <span className="text-[10px] opacity-60">Score borrowers</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('sme')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  role === 'sme' 
                  ? 'border-brand bg-brand/10 text-brand ring-1 ring-brand' 
                  : 'border-white/[0.08] bg-navy text-slate-500 hover:border-white/20'
                }`}
              >
                <Building2 size={24} />
                <span className="text-sm font-semibold">I am an SME</span>
                <span className="text-[10px] opacity-60">My credit insights</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-navy border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand/50 transition-colors"
                    placeholder="Tendai Moyo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-navy border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand/50 transition-colors"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-500 uppercase tracking-widest mb-1.5 ml-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-navy border border-white/[0.08] rounded-xl py-3 pl-11 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand/50 transition-colors"
                    placeholder="Min. 8 characters"
                    minLength={8}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-hover text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-brand/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>Create Account <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/[0.06] text-center text-xs text-slate-500">
            By registering, you agree to PAMOJA AI's terms of service and data sharing policy for credit assessment.
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="text-brand font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
