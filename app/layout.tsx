'use client'
import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CreditCard, User, Code2,
  Layers, ChevronRight, Zap, Clock
} from 'lucide-react'

const nav = [
  { href: '/',            icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/lender',      icon: CreditCard,       label: 'Score a Borrower' },
  { href: '/customer',    icon: User,             label: 'My Credit Score' },
  { href: '/batch',       icon: Layers,           label: 'Batch Scoring' },
  { href: '/history',     icon: Clock,            label: 'Score History' },
  { href: '/developer',   icon: Code2,            label: 'API & Docs' },
]

function Sidebar() {
  const path = usePathname()
  return (
    <aside className="w-60 min-h-screen bg-navy-2 border-r border-white/[0.06] flex flex-col fixed left-0 top-0 z-50">
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
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = path === href
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                ${active
                  ? 'bg-brand/15 text-brand'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
            >
              <Icon size={16} className={active ? 'text-brand' : 'text-slate-500 group-hover:text-slate-300'} />
              {label}
              {active && <ChevronRight size={12} className="ml-auto text-brand/60" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-white/[0.06] space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04]">
          <div className="w-2 h-2 rounded-full bg-green-400 pulse-dot" />
          <span className="text-xs text-slate-400 font-mono">API online</span>
          <Zap size={11} className="ml-auto text-brand/60" />
        </div>
        <div className="text-[10px] text-slate-600 px-3 font-mono">
          AUC 0.9459 · 55,305 loans
        </div>
      </div>
    </aside>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>PAMOJA AI — Credit Scoring</title>
        <meta name="description" content="Alternative credit scoring for Zimbabwean SMEs" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Sidebar />
        <main className="ml-60 min-h-screen bg-navy">
          {children}
        </main>
      </body>
    </html>
  )
}
