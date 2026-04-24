/**
 * CredAI — Centralized API Client
 *
 * All network calls go through this module.
 * Token and API key are read from the in-memory auth context
 * (passed as arguments) — never stored in this file.
 */

const rawBase = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
export const API_BASE = rawBase.endsWith('/v1') ? rawBase : `${rawBase.replace(/\/$/, '')}/v1`;

// ── Low-level fetch wrapper ────────────────────────────────────────────────────
async function apiFetch(path, { method = 'GET', token, apiKey, body, params } = {}) {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });
  }

  const headers = { 'Content-Type': 'application/json' };
  if (token)  headers['Authorization'] = `Bearer ${token}`;
  if (apiKey) headers['X-API-Key'] = apiKey;

  const res = await fetch(url.toString(), {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw Object.assign(new Error(err.detail || `HTTP ${res.status}`), {
      status: res.status,
      body: err,
    });
  }

  // 204 No Content has no body
  if (res.status === 204) return null;
  return res.json();
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export const auth = {
  register: (payload) =>
    apiFetch('/auth/register', { method: 'POST', body: payload }),

  login: async ({ email, password }) => {
    const form = new URLSearchParams({ username: email, password });
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');
    return data;
  },

  rotateApiKey: (email, token) =>
    apiFetch(`/auth/api-key/rotate?email=${encodeURIComponent(email)}`, {
      method: 'POST',
      token,
    }),
};

// ── Health ─────────────────────────────────────────────────────────────────────
export const health = {
  check: () => apiFetch('/health').catch(() => null),
};

// ── Scoring ────────────────────────────────────────────────────────────────────
export const scoring = {
  /** POST /v1/score — live or test mode */
  score: (payload, { token, mode = 'test' } = {}) =>
    apiFetch('/score', { method: 'POST', token, body: payload, params: { mode } }),

  /** POST /v1/score/batch */
  scoreBatch: (items, { token, mode = 'test' } = {}) =>
    apiFetch('/score/batch', { method: 'POST', token, body: items, params: { mode } }),

  /** GET /v1/score/:id */
  getById: (requestId, token) =>
    apiFetch(`/score/${requestId}`, { token }),

  /** GET /v1/sandbox/score — no auth required */
  sandbox: (seed = 42) =>
    apiFetch('/sandbox/score', { params: { seed } }),

  /** Legacy endpoint (still active for backward compat) */
  predictLegacy: (payload, token) =>
    apiFetch('/predict-credit-score', { method: 'POST', token, body: payload }),
};

// ── Usage ──────────────────────────────────────────────────────────────────────
export const usage = {
  get: (token) => apiFetch('/usage', { token }),
};

// ── Dashboard ──────────────────────────────────────────────────────────────────
export const dashboard = {
  stats: (token) => apiFetch('/dashboard/stats', { token }),
  smeProfile: (email, token) =>
    apiFetch(`/borrower/me?email=${encodeURIComponent(email)}`, { token }),
};

// ── Borrowers ──────────────────────────────────────────────────────────────────
export const borrowers = {
  list: (token) => apiFetch('/borrowers', { token }),
  profile: (email, token) =>
    apiFetch(`/borrower/me?email=${encodeURIComponent(email)}`, { token }),
};

// ── Analytics ──────────────────────────────────────────────────────────────────
export const analytics = {
  portfolio: (token) => apiFetch('/analytics', { token }),
};

// ── Transactions ───────────────────────────────────────────────────────────────
export const transactions = {
  list: (token) => apiFetch('/transactions', { token }),
};

// ── Audit Logs ─────────────────────────────────────────────────────────────────
export const auditLogs = {
  mine: (email, token) =>
    apiFetch(`/audit-logs/me?email=${encodeURIComponent(email)}`, { token }),
};

// ── Webhooks ───────────────────────────────────────────────────────────────────
export const webhooks = {
  list: (token) => apiFetch('/webhooks', { token }),
  create: (payload, token) =>
    apiFetch('/webhooks', { method: 'POST', token, body: payload }),
  update: (id, payload, token) =>
    apiFetch(`/webhooks/${id}`, { method: 'PATCH', token, body: payload }),
  delete: (id, token) =>
    apiFetch(`/webhooks/${id}`, { method: 'DELETE', token }),
  deliveries: (id, token) =>
    apiFetch(`/webhooks/${id}/deliveries`, { token }),
};
