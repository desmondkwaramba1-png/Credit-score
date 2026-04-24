import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiSearchLine, RiArrowUpDownLine, RiExternalLinkLine,
  RiArrowLeftSLine, RiArrowRightSLine, RiUser3Line,
  RiCloseLine, RiLoader4Line, RiCheckLine
} from 'react-icons/ri';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Skeleton, cn, staggerContainer, staggerItem } from '../../components/ui';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const API_BASE = 'http://localhost:8001/v1';

const RISK_STYLE = {
  LOW:    { bg: '#E6F9F2', color: '#00806D', border: '#B3EDD9', dot: '#00B67A', label: 'Low' },
  MEDIUM: { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A', dot: '#F59E0B', label: 'Medium' },
  HIGH:   { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', dot: '#EF4444', label: 'High' },
};

function RiskBadge({ level }) {
  const s = RISK_STYLE[(level || '').toUpperCase()] || RISK_STYLE.MEDIUM;
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

function RegisterModal({ onClose, onSuccess, token }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    business_name: '',
    category: '',
    country: '',
    contact_email: '',
    contact_phone: '',
    total_loan_amount: '',
    annual_income: '',
  });

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/borrowers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...form,
          total_loan_amount: parseFloat(form.total_loan_amount) || 0,
          annual_income: parseFloat(form.annual_income) || 0,
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Registration failed');
      }
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,32,53,0.5)', backdropFilter: 'blur(4px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3E8F0]">
          <div>
            <h2 className="text-lg font-black font-heading text-[#1A2035]">Register New Borrower</h2>
            <p className="text-xs text-[#6B7A99] mt-0.5">Add an SME to your portfolio</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F0F3F8] text-[#6B7A99] transition-colors">
            <RiCloseLine className="text-lg" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-[#6B7A99] uppercase tracking-wider">Business Name *</label>
              <input name="business_name" required value={form.business_name} onChange={handleChange} className="tu-input w-full" placeholder="e.g. Mensah Trading Co." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#6B7A99] uppercase tracking-wider">Category</label>
              <select name="category" value={form.category} onChange={handleChange} className="tu-input w-full">
                <option value="">Select category</option>
                <option value="Retail & Wholesale">Retail & Wholesale</option>
                <option value="Agriculture">Agriculture</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Tech & Services">Tech & Services</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Food & Beverage">Food & Beverage</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#6B7A99] uppercase tracking-wider">Country</label>
              <input name="country" value={form.country} onChange={handleChange} className="tu-input w-full" placeholder="e.g. Ghana" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#6B7A99] uppercase tracking-wider">Contact Email</label>
              <input type="email" name="contact_email" value={form.contact_email} onChange={handleChange} className="tu-input w-full" placeholder="owner@business.com" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#6B7A99] uppercase tracking-wider">Contact Phone</label>
              <input name="contact_phone" value={form.contact_phone} onChange={handleChange} className="tu-input w-full" placeholder="+233 XX XXX XXXX" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#6B7A99] uppercase tracking-wider">Annual Income ($)</label>
              <input type="number" name="annual_income" value={form.annual_income} onChange={handleChange} className="tu-input w-full" placeholder="50000" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#6B7A99] uppercase tracking-wider">Loan Amount ($)</label>
              <input type="number" name="total_loan_amount" value={form.total_loan_amount} onChange={handleChange} className="tu-input w-full" placeholder="20000" />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C] font-semibold">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? <RiLoader4Line className="animate-spin" /> : <RiCheckLine />}
              {loading ? 'Registering…' : 'Register Borrower'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

const FILTERS = ['All', 'Low', 'Medium', 'High'];
const SORT_OPTIONS = [
  { label: 'Score (High→Low)', key: 'credit_score', dir: -1 },
  { label: 'Score (Low→High)', key: 'credit_score', dir: 1 },
  { label: 'Name (A→Z)',       key: 'business_name', dir: 1 },
  { label: 'Exposure (High)',  key: 'total_loan_amount', dir: -1 },
];

export default function BorrowerExplorer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState(SORT_OPTIONS[0]);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [borrowers, setBorrowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchBorrowers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/borrowers`, {
        headers: { 'Authorization': `Bearer ${user?.access_token}` }
      });
      const data = await res.json();
      setBorrowers(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchBorrowers();
  }, [user]);

  const filtered = (borrowers || [])
    .filter(b => {
      const matchSearch = (b.business_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (b.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchFilter = filter === 'All' || (b.risk_level || '').toUpperCase() === filter.toUpperCase();
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      const va = a[sort.key] ?? '';
      const vb = b[sort.key] ?? '';
      if (typeof va === 'number') return sort.dir * (va - vb);
      return sort.dir * String(va).localeCompare(String(vb));
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <AnimatePresence>
        {showModal && (
          <RegisterModal
            token={user?.access_token}
            onClose={() => setShowModal(false)}
            onSuccess={() => { setShowModal(false); fetchBorrowers(); }}
          />
        )}
      </AnimatePresence>

      <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={staggerItem} className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black font-heading text-[#1A2035]">Borrower Explorer</h1>
            <p className="text-sm text-[#6B7A99] mt-1">
              Full SME directory with dynamic credit profiles.
              {borrowers.length > 0 && <span className="ml-1 font-semibold text-[#1A2035]">{borrowers.length} total</span>}
            </p>
          </div>
          <Button onClick={() => setShowModal(true)}><RiUser3Line /> Register Borrower</Button>
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
                  onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                />
              </div>

              {/* Risk Filter Pills */}
              <div className="flex items-center gap-1 bg-[#F0F3F8] rounded-xl p-1">
                {FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => { setFilter(f); setPage(1); }}
                    className={cn(
                      'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                      filter === f ? 'bg-white text-[#00A8CB] shadow-sm' : 'text-[#6B7A99] hover:text-[#1A2035]'
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="relative ml-auto">
                <Button variant="outline" size="sm" onClick={() => setShowSortMenu(o => !o)}>
                  <RiArrowUpDownLine /> {sort.label}
                </Button>
                {showSortMenu && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowSortMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[#E3E8F0] rounded-xl shadow-lg z-30 overflow-hidden">
                      {SORT_OPTIONS.map(opt => (
                        <button
                          key={opt.label}
                          className={cn('w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors', sort.label === opt.label ? 'bg-[#E6F7FB] text-[#00A8CB]' : 'text-[#1A2035] hover:bg-[#F5F7FA]')}
                          onClick={() => { setSort(opt); setShowSortMenu(false); }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
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
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(6)].map((_, i) => (
                      <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} className="p-4"><Skeleton className="h-4 w-full rounded" /></td>)}</tr>
                    ))
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-16 text-center">
                        <RiSearchLine className="text-3xl text-[#C8D3E6] mx-auto mb-2" />
                        <p className="text-sm text-[#6B7A99]">
                          {borrowers.length === 0 ? 'No borrowers yet. Register your first SME!' : 'No borrowers match your search.'}
                        </p>
                        {borrowers.length === 0 && (
                          <Button className="mt-4" onClick={() => setShowModal(true)}><RiUser3Line /> Register Borrower</Button>
                        )}
                      </td>
                    </tr>
                  ) : paginated.map(b => (
                    <tr key={b.borrower_id || b.id} className="cursor-pointer group" onClick={() => navigate(`/borrowers/${b.borrower_id || b.id}`)}>
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
                      <td className="text-[#6B7A99]">{b.category || '—'}</td>
                      <td><ScorePill score={b.credit_score} /></td>
                      <td><RiskBadge level={b.risk_level || 'MEDIUM'} /></td>
                      <td className="font-semibold text-[#1A2035]">
                        {b.total_loan_amount ? `$${Number(b.total_loan_amount).toLocaleString()}` : '—'}
                      </td>
                      <td className="text-right" onClick={e => e.stopPropagation()}>
                        <button
                          className="p-2 rounded-lg hover:bg-[#F0F3F8] transition-colors text-[#A8B8D0] hover:text-[#00A8CB]"
                          onClick={() => navigate(`/borrowers/${b.borrower_id || b.id}`)}
                          title="View Profile"
                        >
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
                Showing <span className="text-[#1A2035] font-semibold">{Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="text-[#1A2035] font-semibold">{filtered.length}</span> borrowers
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="px-2" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                  <RiArrowLeftSLine />
                </Button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={cn('w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-colors', page === i + 1 ? 'text-white' : 'text-[#6B7A99] hover:bg-[#F0F3F8]')}
                    style={page === i + 1 ? { background: '#00A8CB' } : {}}
                  >
                    {i + 1}
                  </button>
                ))}
                <Button variant="outline" size="sm" className="px-2" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                  <RiArrowRightSLine />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </>
  );
}
