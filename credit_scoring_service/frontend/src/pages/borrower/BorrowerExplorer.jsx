import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RiSearchLine, RiFilter3Line, RiArrowUpDownLine, RiMore2Line, RiExternalLinkLine, RiArrowLeftSLine, RiArrowRightSLine, RiUser3Line } from 'react-icons/ri';
import { Card, CardContent, Button, Skeleton, cn, staggerContainer, staggerItem } from '../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8001/v1';

const RISK_STYLE = {
  LOW:    { bg: '#E6F9F2', color: '#00806D', border: '#B3EDD9', dot: '#00B67A', label: 'Low' },
  MEDIUM: { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A', dot: '#F59E0B', label: 'Medium' },
  HIGH:   { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', dot: '#EF4444', label: 'High' },
};

function RiskBadge({ level }) {
  const s = RISK_STYLE[level] || RISK_STYLE.MEDIUM;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label} Risk
    </span>
  );
}

function ScorePill({ score }) {
  const color = score >= 750 ? '#00806D' : score >= 670 ? '#007FA3' : score >= 580 ? '#B45309' : '#B91C1C';
  const bg    = score >= 750 ? '#E6F9F2' : score >= 670 ? '#E6F7FB' : score >= 580 ? '#FEF3C7' : '#FEF2F2';
  return (
    <span className="font-black font-heading text-base px-2 py-0.5 rounded-lg" style={{ color, background: bg }}>
      {score || '—'}
    </span>
  );
}

const FILTERS = ['All', 'Low', 'Medium', 'High'];

export default function BorrowerExplorer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');
  const [borrowers, setBorrowers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API_BASE}/borrowers`, { headers: { 'Authorization': `Bearer ${user?.access_token}` } });
        const data = await res.json();
        setBorrowers(Array.isArray(data) ? data : []);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    if (user) fetch_();
  }, [user]);

  const filtered = (borrowers || []).filter(b => {
    const matchSearch = (b.business_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (b.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchFilter = filter === 'All' || (b.risk_level || '').toUpperCase() === filter.toUpperCase();
    return matchSearch && matchFilter;
  });

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={staggerItem} className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black font-heading text-[#1A2035]">Borrower Explorer</h1>
          <p className="text-sm text-[#6B7A99] mt-1">Full SME directory with dynamic credit profiles and risk assessments.</p>
        </div>
        <Button><RiUser3Line /> Register Borrower</Button>
      </motion.div>

      {/* Table Card */}
      <motion.div variants={staggerItem}>
        <Card className="overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-[#E3E8F0] flex flex-wrap gap-3 items-center" style={{ background: '#FAFBFC' }}>
            {/* Search */}
            <div className="relative flex-1 min-w-[220px] max-w-xs">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8B8D0] text-sm" />
              <input
                placeholder="Search name or category..."
                className="w-full h-9 pl-9 pr-4 text-sm border border-[#E3E8F0] rounded-lg bg-white text-[#1A2035] placeholder:text-[#A8B8D0] focus:outline-none focus:border-[#00A8CB] focus:ring-2 focus:ring-[#00A8CB]/15 transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Risk Filter Pills */}
            <div className="flex items-center gap-1 bg-[#F0F3F8] rounded-xl p-1">
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                    filter === f
                      ? 'bg-white text-[#00A8CB] shadow-sm'
                      : 'text-[#6B7A99] hover:text-[#1A2035]'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm"><RiFilter3Line /> Filters</Button>
              <Button variant="outline" size="sm"><RiArrowUpDownLine /> Sort</Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full tu-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Category</th>
                  <th>Credit Score</th>
                  <th>Risk Level</th>
                  <th>Loan Exposure</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>{[...Array(7)].map((_, j) => <td key={j} className="p-4"><Skeleton className="h-4 w-full rounded" /></td>)}</tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center">
                      <RiSearchLine className="text-3xl text-[#C8D3E6] mx-auto mb-2" />
                      <p className="text-sm text-[#6B7A99]">No borrowers found matching your criteria.</p>
                    </td>
                  </tr>
                ) : filtered.map(b => (
                  <tr key={b.id} className="cursor-pointer group" onClick={() => navigate(`/borrowers/${b.id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0"
                          style={{ background: 'linear-gradient(135deg, #00A8CB, #007FA3)' }}>
                          {(b.business_name || 'B')[0].toUpperCase()}
                        </div>
                        <span className="font-semibold text-[#1A2035] group-hover:text-[#00A8CB] transition-colors">
                          {b.business_name}
                        </span>
                      </div>
                    </td>
                    <td className="text-[#6B7A99]">{b.category}</td>
                    <td><ScorePill score={b.credit_score} /></td>
                    <td><RiskBadge level={b.risk_level || 'MEDIUM'} /></td>
                    <td className="font-semibold text-[#1A2035]">${(b.total_loan_amount || 0).toLocaleString()}</td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#E6F9F2] text-[#00806D] border border-[#B3EDD9]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00B67A]" /> Active
                      </span>
                    </td>
                    <td className="text-right">
                      <button className="p-2 rounded-lg hover:bg-[#F0F3F8] transition-colors text-[#A8B8D0] hover:text-[#00A8CB]">
                        <RiExternalLinkLine />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-[#E3E8F0] flex items-center justify-between" style={{ background: '#FAFBFC' }}>
            <p className="text-xs text-[#A8B8D0]">
              Showing <span className="text-[#1A2035] font-semibold">{filtered.length}</span> of <span className="text-[#1A2035] font-semibold">{borrowers.length}</span> borrowers
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="px-2" disabled><RiArrowLeftSLine /></Button>
              <button className="w-8 h-8 rounded-lg text-xs font-bold text-white flex items-center justify-center" style={{ background: '#00A8CB' }}>1</button>
              <Button variant="outline" size="sm" className="px-2"><RiArrowRightSLine /></Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
