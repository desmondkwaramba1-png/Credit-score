'use client'
import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CreditCard, User, Code2,
  Layers, ChevronRight, Zap, Clock, LogOut, Menu, X
} from 'lucide-react'
import { AuthProvider, useAuth } from '../components/AuthProvider'
import { useState } from 'react'

const nav = [
  { href: '/',            icon: LayoutDashboard, label: 'Home' },
  { href: '/dashboard/customer', icon: LayoutDashboard, label: 'My Dashboard', role: 'customer' },
  { href: '/dashboard/sme',      icon: LayoutDashboard, label: 'SME Dashboard', role: 'sme' },
  { href: '/lender',      icon: CreditCard,       label: 'Score a Borrower' },
  { href: '/customer',    icon: User,             label: 'My Credit Score' },
  { href: '/batch',       icon: Layers,           label: 'Batch Scoring' },
  { href: '/history',     icon: Clock,            label: 'Score History' },
  { href: '/developer',   icon: Code2,            label: 'API & Docs' },
]

function Sidebar() {
  const path = usePathname()
  const { user, logout, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  
  if (loading) return null

  const filteredNav = nav.filter(item => {
    // If has specific role requirement
    if (item.role && (!user || user.role !== item.role)) return false
    
    // Public paths
    if (!user) return ['/', '/developer'].includes(item.href) && !item.role
    
    // Customer paths
    if (user.role === 'customer') {
      return ['/', '/dashboard/customer', '/customer', '/history'].includes(item.href)
    }
    
    // SME paths
    if (user.role === 'sme') {
      return ['/', '/dashboard/sme', '/lender', '/batch', '/history', '/developer'].includes(item.href)
    }
    
    return true
  })

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 right-4 z-[60] bg-brand p-2 rounded-lg text-white shadow-lg shadow-brand/20"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        w-64 min-h-screen bg-navy-2 border-r border-white/[0.06] flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-white/[0.06]">
          <span className="font-serif text-lg font-bold text-white tracking-tight">
            PAMOJA<span className="text-brand">.</span>AI
          </span>
          <span className="ml-2 text-[10px] font-mono text-brand/70 border border-brand/30 px-1.5 py-0.5 rounded">
            v0.4
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {filteredNav.map(({ href, icon: Icon, label }) => {
            const active = path === href
            return (
              <Link key={href} href={href} onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                  ${active
                    ? 'bg-brand/15 text-brand'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
              >
                <Icon size={16} className={active ? 'text-brand' : 'text-slate-500 group-hover:text-slate-300'} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Auth Section */}
        <div className="p-4 border-t border-white/[0.06]">
          {user ? (
            <div className="space-y-3">
              <div className="px-3">
                <div className="text-sm font-medium text-white truncate">{user.full_name}</div>
                <div className="text-[10px] text-brand uppercase tracking-wider font-bold">{user.role}</div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          ) : (
            <Link href="/login" onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-brand hover:bg-brand/10 transition-colors">
              <User size={16} /> Login / Register
            </Link>
          )}
        </div>

        {/* Bottom Info */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04]">
            <div className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
            <span className="text-xs text-slate-400 font-mono">API connected</span>
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>PAMOJA AI — Credit Scoring</title>
        <meta name="description" content="Alternative credit scoring for Zimbabwean SMEs" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <AuthProvider>
          <div className="flex flex-col md:flex-row min-h-screen bg-navy text-slate-200">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 min-h-screen">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
