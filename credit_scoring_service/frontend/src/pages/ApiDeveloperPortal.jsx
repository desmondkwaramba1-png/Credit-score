import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiKey2Line, RiCodeSSlashLine, RiBarChartGroupedLine, RiBookOpenLine,
  RiFileCopy2Line, RiRefreshLine, RiTerminalBoxLine, RiCheckDoubleLine,
  RiShieldCheckLine, RiWebhookLine, RiAddLine, RiDeleteBinLine,
  RiToggleLine, RiToggleFill, RiExternalLinkLine, RiErrorWarningLine,
  RiPulseLine,
} from 'react-icons/ri';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Skeleton, cn, staggerContainer, staggerItem,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { auditLogs, webhooks as webhooksApi, usage as usageApi } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const API_BASE = 'http://localhost:8001/v1';

// ── Helpers ────────────────────────────────────────────────────────────────────
const CHART_TOOLTIP = {
  backgroundColor: '#fff', border: '1px solid #E3E8F0',
  borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  color: '#1A2035', fontSize: '0.8rem',
};

export default function ApiDeveloperPortal() {
  const { user, rotateApiKey } = useAuth();
  const token = user?.access_token;

  const [copied, setCopied]           = useState(false);
  const [snippetCopied, setSnippetCopied] = useState(false);
  const [rotating, setRotating]       = useState(false);
  const [logs, setLogs]               = useState([]);
  const [fetchingLogs, setFetchingLogs] = useState(true);
  const [usageData, setUsageData]     = useState(null);

  // Webhook state
  const [webhooks, setWebhooks]       = useState([]);
  const [fetchingWH, setFetchingWH]   = useState(true);
  const [newWHUrl, setNewWHUrl]       = useState('');
  const [newWHDesc, setNewWHDesc]     = useState('');
  const [addingWH, setAddingWH]       = useState(false);
  const [whError, setWHError]         = useState('');
  const [newSecret, setNewSecret]     = useState(null);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const loadLogs = useCallback(async () => {
    try {
      const data = await auditLogs.mine(user.email, token);
      setLogs(Array.isArray(data) ? data : []);
    } catch { setLogs([]); }
    setFetchingLogs(false);
  }, [user, token]);

  const loadUsage = useCallback(async () => {
    try {
      const data = await usageApi.get(token);
      setUsageData(data);
    } catch { /* usage is optional */ }
  }, [token]);

  const loadWebhooks = useCallback(async () => {
    try {
      const data = await webhooksApi.list(token);
      setWebhooks(Array.isArray(data) ? data : []);
    } catch { setWebhooks([]); }
    setFetchingWH(false);
  }, [token]);

  useEffect(() => {
    if (!user) return;
    loadLogs();
    loadUsage();
    loadWebhooks();
  }, [user, loadLogs, loadUsage, loadWebhooks]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(user?.api_key || 'sk-test-...');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRotate = async () => {
    if (!window.confirm('This will immediately invalidate your old key. All active integrations will break. Proceed?')) return;
    setRotating(true);
    try { await rotateApiKey(); } catch { alert('Failed to rotate key'); }
    setRotating(false);
  };

  const handleAddWebhook = async (e) => {
    e.preventDefault();
    if (!newWHUrl.startsWith('http')) { setWHError('URL must start with http:// or https://'); return; }
    setAddingWH(true);
    setWHError('');
    try {
      const data = await webhooksApi.create({ url: newWHUrl, description: newWHDesc || undefined }, token);
      setWebhooks(prev => [data, ...prev]);
      setNewSecret(data.signing_secret);
      setNewWHUrl('');
      setNewWHDesc('');
    } catch (err) {
      setWHError(err.message || 'Failed to register webhook');
    }
    setAddingWH(false);
  };

  const handleToggleWebhook = async (wh) => {
    try {
      const updated = await webhooksApi.update(wh.webhook_id, { is_active: !wh.is_active }, token);
      setWebhooks(prev => prev.map(w => w.webhook_id === wh.webhook_id ? updated : w));
    } catch { /* ignore */ }
  };

  const handleDeleteWebhook = async (id) => {
    if (!window.confirm('Delete this webhook? All delivery history will be lost.')) return;
    try {
      await webhooksApi.delete(id, token);
      setWebhooks(prev => prev.filter(w => w.webhook_id !== id));
    } catch { /* ignore */ }
  };

  // ── cURL snippet ────────────────────────────────────────────────────────────
  const curlSnippet = `curl -X POST "${API_BASE}/score?mode=live" \\
  -H "Authorization: Bearer ${user?.api_key || 'YOUR_API_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "person_age": 32,
    "person_income": 60000.0,
    "person_home_ownership": "RENT",
    "person_emp_length": 3.0,
    "loan_intent": "PERSONAL",
    "loan_grade": "B",
    "loan_amnt": 15000.0,
    "loan_int_rate": 11.5,
    "loan_percent_income": 0.25,
    "cb_person_default_on_file": "N",
    "cb_person_cred_hist_length": 4
  }'`;

  return (
    <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={staggerItem} className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black font-heading text-[#1A2035]">Developer Portal</h1>
          <p className="text-sm text-[#6B7A99] mt-1">
            Integrate CredAI credit intelligence into your systems. Manage API keys, webhooks, and usage.
          </p>
        </div>
        <Button variant="outline"><RiBookOpenLine /> API Documentation</Button>
      </motion.div>

      {/* Row 1: API Key + Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* API Key Card */}
        <motion.div variants={staggerItem} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E6F7FB] flex items-center justify-center">
                  <RiKey2Line className="text-[#00A8CB] text-xl" />
                </div>
                <div>
                  <CardTitle>Authentication Keys</CardTitle>
                  <CardDescription>Use this secret key to authenticate server-side requests.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#6B7A99] uppercase tracking-widest">Secret API Key</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      readOnly
                      value={user?.api_key || 'pmj_test_••••••••••••••••••••••••'}
                      className="w-full h-10 font-mono text-sm px-3 pr-12 border border-[#E3E8F0] rounded-lg bg-[#F9FAFB] text-[#6B7A99] focus:outline-none"
                    />
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-[#F0F3F8] transition-colors text-[#A8B8D0] hover:text-[#00A8CB]"
                      onClick={handleCopy}
                    >
                      {copied ? <RiCheckDoubleLine className="text-[#00B67A]" /> : <RiFileCopy2Line />}
                    </button>
                  </div>
                  <Button variant="outline" onClick={handleRotate} disabled={rotating}>
                    <RiRefreshLine className={rotating ? 'animate-spin' : ''} /> Rotate Key
                  </Button>
                </div>
                <p className="text-xs text-[#A8B8D0]">
                  Never expose this key in client-side code. Use it strictly on your backend server.
                </p>
              </div>

              {/* Code snippet */}
              <div className="border-t border-[#E3E8F0] pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-[#1A2035]">Quick Integration — cURL</h4>
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#F0F3F8] text-[#6B7A99] border border-[#E3E8F0]">
                    POST /v1/score
                  </span>
                </div>
                <div className="relative group bg-[#1A2035] rounded-xl overflow-hidden">
                  <pre className="p-4 text-xs leading-relaxed overflow-x-auto text-[#A8D4E8] font-mono">{curlSnippet}</pre>
                  <button
                    className="absolute top-3 right-3 p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-white opacity-0 group-hover:opacity-100"
                    onClick={() => { navigator.clipboard.writeText(curlSnippet); setSnippetCopied(true); setTimeout(() => setSnippetCopied(false), 2000); }}
                  >
                    {snippetCopied ? <RiCheckDoubleLine className="text-[#00B67A]" /> : <RiFileCopy2Line />}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Logs */}
        <motion.div variants={staggerItem}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F0F3F8] flex items-center justify-center">
                  <RiBarChartGroupedLine className="text-[#6B7A99] text-xl" />
                </div>
                <div>
                  <CardTitle>Response Logs</CardTitle>
                  <CardDescription>Latest API consumption history</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {fetchingLogs ? (
                  [...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)
                ) : logs.length > 0 ? logs.slice(0, 20).map(log => (
                  <div key={log.log_id} className="flex items-center justify-between p-3 rounded-xl border border-[#E3E8F0] bg-[#FAFBFC] hover:border-[#C8D3E6] transition-colors">
                    <div>
                      <p className="text-xs font-bold text-[#1A2035]">{log.endpoint}</p>
                      <p className="text-[10px] text-[#A8B8D0] uppercase tracking-wider mt-0.5">{log.method} · {log.duration_ms}ms</p>
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold',
                      log.status_code < 300 ? 'bg-[#E6F9F2] text-[#00806D]' : 'bg-[#FEF2F2] text-[#B91C1C]'
                    )}>
                      {log.status_code}
                    </span>
                  </div>
                )) : (
                  <div className="text-center py-10">
                    <RiTerminalBoxLine className="text-3xl text-[#C8D3E6] mx-auto mb-2" />
                    <p className="text-xs text-[#A8B8D0]">No API activity yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row 2: Usage chart + Integration guide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Usage chart */}
        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E6F7FB] flex items-center justify-center">
                  <RiPulseLine className="text-[#00A8CB] text-xl" />
                </div>
                <div>
                  <CardTitle>API Usage</CardTitle>
                  <CardDescription>Monthly scoring requests — last 6 months</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {usageData ? (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'Total', value: usageData.total_requests, color: '#00A8CB' },
                      { label: 'Live', value: usageData.live_requests, color: '#00B67A' },
                      { label: 'Test', value: usageData.test_requests, color: '#F59E0B' },
                    ].map(s => (
                      <div key={s.label} className="p-3 rounded-xl bg-[#F5F7FA] border border-[#E3E8F0] text-center">
                        <p className="text-[10px] font-bold text-[#6B7A99] uppercase tracking-widest">{s.label}</p>
                        <p className="text-xl font-black font-heading mt-1" style={{ color: s.color }}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={usageData.monthly_breakdown || []} barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F3F8" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#A8B8D0', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#A8B8D0', fontSize: 11 }} />
                        <Tooltip contentStyle={CHART_TOOLTIP} />
                        <Bar dataKey="requests" fill="#00A8CB" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="h-[220px] flex items-center justify-center">
                  <Skeleton className="h-full w-full rounded-xl" />
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Integration guide */}
        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle>Integration Guide</CardTitle>
              <CardDescription>Three steps to connect CredAI to your systems</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {[
                { step: '1', title: 'Collect SME Data', desc: 'Gather income, loan amount, employment history, and credit bureau data from your applicant.', color: '#00A8CB', bg: '#E6F7FB' },
                { step: '2', title: 'POST /v1/score', desc: 'Submit via API with your Bearer key. Response includes score, risk tier, SHAP explanations, and risk flags.', color: '#00B67A', bg: '#E6F9F2' },
                { step: '3', title: 'Act on Insights', desc: 'Use the 8-tier risk classification and plain-English risk flags to justify underwriting decisions.', color: '#F59E0B', bg: '#FEF3C7' },
              ].map(item => (
                <div key={item.step} className="flex gap-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
                    style={{ background: item.bg, color: item.color }}>
                    {item.step}
                  </div>
                  <div className="flex-1">
                    <h5 className="text-sm font-bold text-[#1A2035]">{item.title}</h5>
                    <p className="text-xs text-[#6B7A99] mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-[#E3E8F0] p-3 rounded-xl bg-[#E6F9F2] flex items-start gap-2">
                <RiShieldCheckLine className="text-[#00B67A] shrink-0 mt-0.5" />
                <p className="text-xs text-[#00806D] font-medium">
                  All predictions pass through our bias-removal pipeline. Disparate Impact Ratio monitored per request.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row 3: Webhook Config */}
      <motion.div variants={staggerItem}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0F3F8] flex items-center justify-center">
                <RiWebhookLine className="text-[#6B7A99] text-xl" />
              </div>
              <div className="flex-1">
                <CardTitle>Webhook Endpoints</CardTitle>
                <CardDescription>
                  Receive real-time <code className="font-mono text-[10px] bg-[#F0F3F8] px-1 rounded">score.completed</code> events
                  signed with HMAC-SHA256.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* New webhook form */}
            <form onSubmit={handleAddWebhook} className="flex flex-wrap gap-3 p-4 rounded-xl bg-[#F5F7FA] border border-[#E3E8F0]">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="url"
                  placeholder="https://your-server.com/webhook"
                  value={newWHUrl}
                  onChange={e => { setNewWHUrl(e.target.value); setWHError(''); }}
                  className="w-full h-9 px-3 text-sm border border-[#E3E8F0] rounded-lg bg-white text-[#1A2035] placeholder:text-[#A8B8D0] focus:outline-none focus:border-[#00A8CB] focus:ring-2 focus:ring-[#00A8CB]/15"
                  required
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newWHDesc}
                  onChange={e => setNewWHDesc(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-[#E3E8F0] rounded-lg bg-white text-[#1A2035] placeholder:text-[#A8B8D0] focus:outline-none focus:border-[#00A8CB] focus:ring-2 focus:ring-[#00A8CB]/15"
                />
              </div>
              <Button type="submit" disabled={addingWH} size="sm">
                <RiAddLine /> {addingWH ? 'Adding…' : 'Add Webhook'}
              </Button>
              {whError && (
                <p className="w-full flex items-center gap-1 text-xs text-[#B91C1C]">
                  <RiErrorWarningLine /> {whError}
                </p>
              )}
            </form>

            {/* Signing secret reveal */}
            <AnimatePresence>
              {newSecret && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] space-y-2"
                >
                  <p className="text-xs font-bold text-[#B45309]">
                    ⚠ Copy this signing secret now — it won't be shown again.
                  </p>
                  <div className="flex gap-2">
                    <code className="flex-1 font-mono text-xs bg-white border border-[#FDE68A] rounded-lg px-3 py-2 text-[#1A2035] break-all">
                      {newSecret}
                    </code>
                    <button
                      className="p-2 rounded-lg hover:bg-[#FDE68A]/40 transition-colors text-[#B45309]"
                      onClick={() => { navigator.clipboard.writeText(newSecret); }}
                    >
                      <RiFileCopy2Line />
                    </button>
                  </div>
                  <button className="text-xs text-[#B45309] underline" onClick={() => setNewSecret(null)}>
                    I've saved it, dismiss
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Webhook list */}
            {fetchingWH ? (
              <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : webhooks.length === 0 ? (
              <div className="py-8 text-center">
                <RiWebhookLine className="text-3xl text-[#C8D3E6] mx-auto mb-2" />
                <p className="text-sm text-[#6B7A99]">No webhooks registered yet. Add one above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {webhooks.map(wh => (
                  <div key={wh.webhook_id}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#E3E8F0] bg-[#FAFBFC] hover:border-[#C8D3E6] transition-colors gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1A2035] truncate">{wh.url}</p>
                      {wh.description && (
                        <p className="text-xs text-[#6B7A99] mt-0.5">{wh.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold',
                        wh.is_active ? 'bg-[#E6F9F2] text-[#00806D]' : 'bg-[#F0F3F8] text-[#6B7A99]'
                      )}>
                        {wh.is_active ? 'Active' : 'Paused'}
                      </span>
                      <button
                        className="p-1.5 rounded-lg hover:bg-[#F0F3F8] transition-colors text-[#6B7A99] hover:text-[#00A8CB]"
                        onClick={() => handleToggleWebhook(wh)}
                        title={wh.is_active ? 'Pause' : 'Activate'}
                      >
                        {wh.is_active ? <RiToggleFill className="text-lg text-[#00A8CB]" /> : <RiToggleLine className="text-lg" />}
                      </button>
                      <button
                        className="p-1.5 rounded-lg hover:bg-[#FEF2F2] transition-colors text-[#A8B8D0] hover:text-[#B91C1C]"
                        onClick={() => handleDeleteWebhook(wh.webhook_id)}
                        title="Delete webhook"
                      >
                        <RiDeleteBinLine className="text-lg" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
