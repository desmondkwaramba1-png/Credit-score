import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RiExchangeLine, RiSearchLine, RiFilterLine, RiArrowUpDownLine, RiDownload2Line, RiArrowRightSLine } from 'react-icons/ri';
import { Card, CardContent, Button, Input, Badge, Skeleton, cn, staggerContainer, staggerItem } from '../components/ui';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:8001/v1';

const STATUS_STYLE = {
  Completed: { bg: '#E6F9F2', color: '#00806D', border: '#B3EDD9', dot: '#00B67A' },
  Pending:   { bg: '#FEF3C7', color: '#B45309', border: '#FDE68A', dot: '#F59E0B' },
  Failed:    { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', dot: '#EF4444' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.Pending;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {status}
    </span>
  );
}

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API_BASE}/transactions`, { headers: { 'Authorization': `Bearer ${user?.access_token}` } });
        setTransactions(await res.json());
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    if (user) fetch_();
  }, [user]);

  const filtered = (transactions || []).filter(tx =>
    (tx.business_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tx.transaction_id || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={staggerItem} className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black font-heading text-[#1A2035]">Financial Transactions</h1>
          <p className="text-sm text-[#6B7A99] mt-1">Monitor live cashflow across your borrower network.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline"><RiDownload2Line /> CSV Export</Button>
          <Button><RiExchangeLine /> New Transaction</Button>
        </div>
      </motion.div>

      {/* Table Card */}
      <motion.div variants={staggerItem}>
        <Card className="overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 border-b border-[#E3E8F0] flex items-center gap-3 flex-wrap" style={{ background: '#FAFBFC' }}>
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8B8D0] text-sm" />
              <input
                placeholder="Search by business or transaction ID..."
                className="w-full h-9 pl-9 pr-4 text-sm border border-[#E3E8F0] rounded-lg bg-white text-[#1A2035] placeholder:text-[#A8B8D0] focus:outline-none focus:border-[#00A8CB] focus:ring-2 focus:ring-[#00A8CB]/15 transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm"><RiFilterLine /> Filters</Button>
              <Button variant="outline" size="sm"><RiArrowUpDownLine /> Sort</Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left tu-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction ID</th>
                  <th>Business</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="p-4"><Skeleton className="h-4 w-full rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <RiExchangeLine className="text-3xl text-[#C8D3E6]" />
                        <p className="text-sm text-[#6B7A99]">No transactions found.</p>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map(tx => (
                  <tr key={tx.transaction_id} className="group cursor-pointer">
                    <td className="font-medium text-[#6B7A99]">{new Date(tx.date).toLocaleDateString()}</td>
                    <td>
                      <span className="font-mono text-xs px-2 py-1 rounded-md bg-[#F0F3F8] text-[#6B7A99]">
                        {tx.transaction_id.slice(0, 8)}…
                      </span>
                    </td>
                    <td className="font-semibold text-[#1A2035]">{tx.business_name}</td>
                    <td>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7A99] bg-[#F0F3F8] px-2 py-0.5 rounded">
                        {tx.type}
                      </span>
                    </td>
                    <td className={cn('font-bold', tx.amount > 0 ? 'text-[#00806D]' : 'text-[#B91C1C]')}>
                      {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                    </td>
                    <td><StatusBadge status={tx.status} /></td>
                    <td className="text-[#6B7A99]">{tx.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-[#E3E8F0] flex justify-between items-center" style={{ background: '#FAFBFC' }}>
            <p className="text-xs text-[#A8B8D0]">Showing {filtered.length} of {transactions.length} transactions</p>
            <Button variant="ghost" size="sm" className="text-[#00A8CB] gap-1">
              Load More <RiArrowRightSLine />
            </Button>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
