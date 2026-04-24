import React, { createContext, useContext } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopNav } from './TopNav';
import { AnimatePresence, motion } from 'framer-motion';

const SidebarContext = createContext({ collapsed: false, setCollapsed: () => {} });
export const useSidebar = () => useContext(SidebarContext);

// Inner component — can safely use useLocation because it lives inside <Router>
function PageWrapper() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}

export function Shell() {
  return (
    <SidebarContext.Provider value={{ collapsed: false, setCollapsed: () => {} }}>
      <div className="min-h-screen" style={{ background: '#F5F7FA' }}>
        <TopNav />
        <main className="max-w-screen-xl mx-auto px-6 py-8">
          <PageWrapper />
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
