import React from 'react';
import { motion } from 'framer-motion';
import { RiUser3Line, RiNotificationLine, RiLockPasswordLine, RiShieldLine, RiGlobeLine, RiPaletteLine, RiDatabaseLine } from 'react-icons/ri';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, Button, Input, cn, staggerContainer, staggerItem } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const MENU = [
  { label: 'Profile',             icon: RiUser3Line,         active: true },
  { label: 'Notifications',       icon: RiNotificationLine },
  { label: 'Security & Password', icon: RiLockPasswordLine },
  { label: 'Team Access',         icon: RiShieldLine },
  { label: 'Localization',        icon: RiGlobeLine },
  { label: 'Appearance',          icon: RiPaletteLine },
  { label: 'Data & Privacy',      icon: RiDatabaseLine },
];

export default function Settings() {
  const { user } = useAuth();

  return (
    <motion.div className="space-y-6 max-w-5xl mx-auto" variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={staggerItem}>
        <h1 className="text-2xl font-black font-heading text-[#1A2035]">Settings</h1>
        <p className="text-sm text-[#6B7A99] mt-1">Manage your account, security, and notification preferences.</p>
      </motion.div>

      <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Menu */}
        <aside className="space-y-1">
          {MENU.map(item => (
            <button
              key={item.label}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                item.active
                  ? 'bg-[#E6F7FB] text-[#007FA3] font-semibold'
                  : 'text-[#6B7A99] hover:bg-[#F5F7FA] hover:text-[#1A2035]'
              )}
            >
              <item.icon className="text-base shrink-0" />
              {item.label}
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <div className="md:col-span-3 space-y-5">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Profile</CardTitle>
              <CardDescription>Update your public information and avatar used across the platform.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-5 pb-5 border-b border-[#E3E8F0]">
                <div className="w-20 h-20 rounded-2xl text-white text-3xl font-black font-heading flex items-center justify-center shadow-md"
                  style={{ background: 'linear-gradient(135deg, #00A8CB, #007FA3)' }}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button size="sm">Change Avatar</Button>
                    <Button variant="outline" size="sm">Remove</Button>
                  </div>
                  <p className="text-xs text-[#A8B8D0]">JPG, GIF or PNG. Max size 2MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Full Name',     value: user?.name },
                  { label: 'Email Address', value: user?.email },
                  { label: 'Organization',  placeholder: 'Enter your company name' },
                  { label: 'Timezone',      value: 'Greenwich Mean Time (GMT)', readOnly: true },
                ].map(f => (
                  <div key={f.label} className="space-y-1.5">
                    <label className="text-sm font-semibold text-[#1A2035]">{f.label}</label>
                    <Input value={f.value} placeholder={f.placeholder} readOnly={f.readOnly || !!f.value} />
                  </div>
                ))}
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card style={{ borderLeft: '4px solid #00B67A' }}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Account Status</CardTitle>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#E6F9F2] text-[#00806D] border border-[#B3EDD9]">Active Premium</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#6B7A99] leading-relaxed">
                Your account is in good standing with access to all scoring features and API endpoints.
                Next billing date: <strong className="text-[#1A2035]">April 14, 2026</strong>.
              </p>
              <Button variant="link" className="p-0 h-auto mt-3 text-xs">Manage Subscription</Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card style={{ borderLeft: '4px solid #EF4444' }}>
            <CardHeader>
              <CardTitle className="text-[#B91C1C]">Danger Zone</CardTitle>
              <CardDescription>Permanently delete your account and all associated data traces.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#6B7A99] mb-4 leading-relaxed">
                This action is irreversible. All credit scores, transaction profiles, and API logs will be purged in compliance with GDPR and local data protection laws.
              </p>
              <Button variant="destructive">Delete Account</Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}
