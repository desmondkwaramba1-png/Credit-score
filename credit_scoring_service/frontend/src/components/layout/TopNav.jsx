import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  RiDashboardLine, RiGroupLine, RiPulseLine, RiExchangeLine,
  RiBarChartLine, RiSettings4Line, RiLogoutBoxRLine,
  RiNotification3Line, RiSearchLine, RiMenuLine, RiCloseLine,
  RiShieldCheckLine, RiUserLine, RiCodeSSlashLine, RiSparklingLine
} from 'react-icons/ri';
import { cn } from '../ui';

export function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isLender = user?.user_type?.toLowerCase() === 'lender';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navItems = [
    { to: '/dashboard', icon: RiDashboardLine, label: 'Dashboard' },
    ...(isLender ? [
      { to: '/borrowers', icon: RiGroupLine, label: 'Borrowers' },
      { to: '/score-borrowers', icon: RiSparklingLine, label: 'Score' },
      { to: '/credit-scores', icon: RiPulseLine, label: 'Credit Scores' },
      { to: '/analytics', icon: RiBarChartLine, label: 'Analytics' },
    ] : [
      { to: '/analytics', icon: RiBarChartLine, label: 'Analytics' },
      { to: '/api-panel', icon: RiCodeSSlashLine, label: 'API Portal' },
    ]),
  ];

  return (
    <>
      <header className="tu-nav" style={{ background: '#fff', borderBottom: '1px solid #E3E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between gap-6">

          {/* ── Brand ── */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00A8CB, #007FA3)' }}>
              <RiShieldCheckLine className="text-white text-xl" />
            </div>
            <span className="font-heading font-black text-xl" style={{ color: '#00A8CB', letterSpacing: '-0.03em' }}>CredAI</span>
            <span className="hidden sm:block text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#E6F7FB', color: '#007FA3' }}>by TransUnion</span>
          </div>

          {/* ── Desktop Nav Links ── */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[#E6F7FB] text-[#00A8CB] font-semibold'
                    : 'text-[#6B7A99] hover:text-[#1A2035] hover:bg-[#F5F7FA]'
                )}
              >
                <Icon className="text-base" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* ── Right Actions ── */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search */}
            <div className="hidden lg:flex items-center gap-2 px-3 h-9 rounded-lg border border-[#E3E8F0] bg-[#F5F7FA] text-[#A8B8D0] text-sm">
              <RiSearchLine />
              <span>Search...</span>
              <kbd className="text-[10px] font-mono bg-white border border-[#E3E8F0] rounded px-1 py-0.5">⌘K</kbd>
            </div>

            {/* System status */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: '#E6F9F2' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00B67A] animate-pulse-dot" />
              <span className="text-[10px] font-bold" style={{ color: '#00806D' }}>LIVE</span>
            </div>

            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-[#F0F3F8] transition-colors text-[#6B7A99]">
              <RiNotification3Line className="text-lg" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#00A8CB] ring-2 ring-white" />
            </button>

            {/* Settings */}
            <NavLink
              to="/settings"
              className={({ isActive }) => cn(
                'p-2 rounded-lg transition-colors',
                isActive ? 'bg-[#E6F7FB] text-[#00A8CB]' : 'text-[#6B7A99] hover:bg-[#F0F3F8] hover:text-[#1A2035]'
              )}
            >
              <RiSettings4Line className="text-lg" />
            </NavLink>

            {/* Divider */}
            <div className="w-px h-6 bg-[#E3E8F0] mx-1" />

            {/* User Avatar + Menu */}
            <div className="relative">
              <button
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-[#F0F3F8] transition-colors"
                onClick={() => setUserMenuOpen(o => !o)}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #00A8CB, #007FA3)' }}>
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-[#1A2035] leading-tight">{user?.name}</p>
                  <p className="text-[10px] text-[#6B7A99] capitalize leading-tight">{user?.user_type}</p>
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E3E8F0] rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b border-[#E3E8F0]">
                    <p className="text-sm font-semibold text-[#1A2035]">{user?.name}</p>
                    <p className="text-xs text-[#6B7A99]">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => navigate('/settings')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#1A2035] hover:bg-[#F5F7FA] transition-colors"
                  >
                    <RiSettings4Line /> Settings
                  </button>
                  <button
                    onClick={() => { logout(); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#EF4444] hover:bg-[#FEF2F2] transition-colors border-t border-[#E3E8F0]"
                  >
                    <RiLogoutBoxRLine /> Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-[#F0F3F8] text-[#6B7A99]"
              onClick={() => setMobileOpen(o => !o)}
            >
              {mobileOpen ? <RiCloseLine className="text-xl" /> : <RiMenuLine className="text-xl" />}
            </button>
          </div>
        </div>

        {/* ── Mobile Nav Drawer ── */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[#E3E8F0] bg-white px-4 py-3 animate-fade-in">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all mb-1',
                  isActive ? 'bg-[#E6F7FB] text-[#00A8CB]' : 'text-[#6B7A99] hover:bg-[#F5F7FA] hover:text-[#1A2035]'
                )}
              >
                <Icon className="text-base" />
                {label}
              </NavLink>
            ))}
            <hr className="border-[#E3E8F0] my-2" />
            <button
              onClick={logout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#EF4444] hover:bg-[#FEF2F2] w-full transition-all"
            >
              <RiLogoutBoxRLine /> Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Overlay for user menu */}
      {userMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
      )}
    </>
  );
}
