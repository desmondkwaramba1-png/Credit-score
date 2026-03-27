'use client'
import React, { useState, useEffect } from 'react'
import './globals.css'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, CreditCard, User, Code2,
  Layers, ChevronRight, Zap, Clock, LogOut, Menu, X
} from 'lucide-react'
import { AuthProvider, useAuth } from '../components/AuthProvider'

const nav = [
  { href: '/',               icon: LayoutDashboard, label: 'Home' },
  { href: '/dashboard/sme',  icon: LayoutDashboard, label: 'SME Dashboard', role: 'sme' },
  { href: '/lender',         icon: CreditCard,      label: 'Score a Borrower', role: 'lender' },
  { href: '/customer',       icon: User,            label: 'My Credit Score', role: 'sme' },
  { href: '/batch',          icon: Layers,          label: 'Batch Scoring', role: 'lender' },
  { href: '/history',        icon: Clock,           label: 'Score History' },
  { href: '/developer',      icon: Code2,           label: 'API & Docs' },
]

function Sidebar() {
  const path = usePathname()
  const { user, logout, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  
  if (loading) return null
  if (!user) return null

  const filteredNav = nav.filter(item => {
    if (item.role && (!user || user.role !== item.role)) return false
    if (user.role === 'sme') {
      return ['/', '/dashboard/sme', '/customer', '/history'].includes(item.href)
    }
    if (user.role === 'lender') {
      return ['/', '/lender', '/batch', '/history', '/developer'].includes(item.href)
    }
    return true
  })

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 right-4 z-[60] bg-gradient-to-r from-brand to-brand-hover p-2.5 rounded-xl text-slate-900 shadow-lg shadow-brand/20"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        w-64 min-h-screen glass-sidebar border-r border-slate-200 flex flex-col fixed left-0 top-0 z-50 transition-transform duration-500
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-brand/5 to-transparent" />
          <span className="font-serif text-lg font-bold text-slate-900 tracking-tight relative z-10">
            PAMOJA<span className="text-brand">.</span>AI
          </span>
          <span className="ml-2 text-[10px] font-mono text-brand/70 border border-brand/30 px-1.5 py-0.5 rounded relative z-10">
            v0.4
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {filteredNav.map(({ href, icon: Icon, label }) => {
            const active = path === href
            return (
              <Link key={href} href={href} onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative overflow-hidden
                  ${active
                    ? 'bg-brand/15 text-brand'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
              >
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-brand" />}
                <Icon size={16} className={active ? 'text-brand' : 'text-slate-500 group-hover:text-slate-600'} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Auth Section */}
        <div className="p-4 border-t border-slate-200">
          <div className="glass-card rounded-2xl p-4 bg-slate-50 space-y-4">
            <div>
              <div className="text-sm font-bold text-slate-900 truncate">{user.full_name}</div>
              <div className="text-[10px] text-brand uppercase tracking-widest font-extrabold mt-0.5">{user.role}</div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-rose-600 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all"
            >
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>

        {/* Bottom Info */}
        <div className="p-4 border-t border-white/[0.03]">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-brand/5 border border-brand/10">
            <div className="w-2 h-2 rounded-full bg-green-500 pulse-dot shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <span className="text-[10px] text-brand font-bold uppercase tracking-widest">Engine Online</span>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}
    </>
  )
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  React.useEffect(() => {
    if (!loading && !user && !['/login', '/register', '/'].includes(pathname)) {
      router.push('/login')
    }
  }, [user, loading, pathname, router])

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Loading PAMOJA AI</span>
      </div>
    </div>
  )

  const isAuthPage = ['/login', '/register'].includes(pathname)
  const isLanding = pathname === '/'

  if (!user && !isAuthPage && !isLanding) return null

  // Landing page and auth pages get full-width layout
  if (isAuthPage || isLanding) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        {children}
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 text-slate-800">
      <Sidebar />
      <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 min-h-screen md:ml-64">
        {children}
      </main>
    </div>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>PAMOJA AI — Open Finance for Zimbabwe</title>
        <meta name="description" content="Institutional-grade alternative credit scoring for Zimbabwean SMEs and lenders. Powered by mobile money, utility payments, and community signals." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <AuthProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  )
}
