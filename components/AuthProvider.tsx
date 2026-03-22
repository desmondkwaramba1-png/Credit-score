'use client'
import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  email: string
  full_name: string
  role: 'lender' | 'sme'
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, role: string, full_name: string, email: string) => void
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const savedToken = localStorage.getItem('pamoja_token')
    const savedRole = localStorage.getItem('pamoja_role') as 'lender' | 'sme'
    const savedName = localStorage.getItem('pamoja_name')
    const savedEmail = localStorage.getItem('pamoja_email')

    if (savedToken && savedRole && savedName && savedEmail) {
      setToken(savedToken)
      setUser({ email: savedEmail, role: savedRole, full_name: savedName })
    }
    setLoading(false)
  }, [])

  const login = (token: string, role: string, full_name: string, email: string) => {
    localStorage.setItem('pamoja_token', token)
    localStorage.setItem('pamoja_role', role)
    localStorage.setItem('pamoja_name', full_name)
    localStorage.setItem('pamoja_email', email)
    
    setToken(token)
    setUser({ email, role: role as 'lender' | 'sme', full_name })
    
    // Redirect based on role
    if (role === 'lender') {
      router.push('/lender')
    } else {
      router.push('/dashboard/sme')
    }
  }

  const logout = () => {
    localStorage.removeItem('pamoja_token')
    localStorage.removeItem('pamoja_role')
    localStorage.removeItem('pamoja_name')
    localStorage.removeItem('pamoja_email')
    setToken(null)
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
