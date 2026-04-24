import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import { Shell } from './components/layout/Shell';

import ApiDeveloperPortal from './pages/ApiDeveloperPortal';
import Dashboard from './pages/dashboard/Dashboard';
import BorrowerExplorer from './pages/borrower/BorrowerExplorer';
import BorrowerProfile from './pages/borrower/BorrowerProfile';
import CreditScores from './pages/CreditScores';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import BatchScoring from './pages/BatchScoring';

// ── Role-gated placeholder ─────────────────────────────────────────────────────
const AccessDenied = ({ requiredRole }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '60vh', textAlign: 'center', padding: '2rem',
  }}>
    <div style={{
      width: 64, height: 64, borderRadius: '50%', background: '#FEF2F2',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 28, marginBottom: '1.25rem',
    }}>🔒</div>
    <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', color: '#1A2035', marginBottom: 8 }}>
      Access Restricted
    </h2>
    <p style={{ color: '#6B7A99', maxWidth: 400, lineHeight: 1.6 }}>
      This section is only available to <strong>{requiredRole}</strong> accounts.
      Please log in with the appropriate credentials.
    </p>
  </div>
);

// ── Role-aware route guard ─────────────────────────────────────────────────────
/**
 * Wraps a page component with a role check.
 * @param {React.ReactNode} element  — The page to render
 * @param {string[]}        roles    — Allowed user_type values (e.g. ['lender'])
 *                                     Pass undefined/empty to allow any authenticated user.
 * @param {string}          label    — Human-readable role label for the denied message
 */
function RoleRoute({ element, roles, label }) {
  const { user } = useAuth();
  if (!roles || roles.length === 0) return element;
  const userType = user?.user_type?.toLowerCase() ?? '';
  if (roles.includes(userType)) return element;
  return <AccessDenied requiredRole={label || roles.join(' / ')} />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthGate />
      </BrowserRouter>
    </AuthProvider>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#F5F7FA',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '4px solid #00A8CB', borderTopColor: 'transparent',
            animation: 'spin 0.75s linear infinite',
          }} />
          <p style={{ fontFamily: 'Inter, sans-serif', color: '#6B7A99', fontWeight: 500 }}>
            Initializing CredAI…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={!user ? <AuthPage /> : <Navigate to="/dashboard" replace />}
      />

      {/* Protected layout — any authenticated user */}
      <Route element={user ? <Shell /> : <Navigate to="/login" replace />}>
        <Route path="/"            element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"   element={<RoleRoute element={<Dashboard />} />} />
        <Route path="/settings"    element={<RoleRoute element={<Settings />} />} />

        {/* Lender-only routes */}
        <Route
          path="/borrowers"
          element={<RoleRoute element={<BorrowerExplorer />} roles={['lender']} label="Lender" />}
        />
        <Route
          path="/borrowers/:id"
          element={<RoleRoute element={<BorrowerProfile />} roles={['lender']} label="Lender" />}
        />
        <Route
          path="/credit-scores"
          element={<RoleRoute element={<CreditScores />} roles={['lender']} label="Lender" />}
        />
        <Route
          path="/score-borrowers"
          element={<RoleRoute element={<BatchScoring />} roles={['lender']} label="Lender" />}
        />
        <Route
          path="/transactions"
          element={<RoleRoute element={<Transactions />} roles={['lender']} label="Lender" />}
        />
        <Route
          path="/analytics"
          element={<RoleRoute element={<Analytics />} roles={['lender']} label="Lender" />}
        />

        {/* Developer / Lender portal */}
        <Route
          path="/api-panel"
          element={
            <RoleRoute
              element={<ApiDeveloperPortal />}
              roles={['lender', 'developer', 'sme']}
              label="Authenticated User"
            />
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
