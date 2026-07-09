// src/pages/Admin/AdminLayout.jsx
import React, { useState } from 'react';
import { NavLink, Routes, Route, Navigate, Link } from 'react-router-dom';
import './Admin.css';
import { apiUrl } from '../../api';
import AdminUsers from './AdminUsers';
import AdminModeration from './AdminModeration';
import AdminTransactions from './AdminTransactions';
import AdminSettings from './AdminSettings';

const getAuthHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` });

const navLinkClass = ({ isActive }) =>
  isActive ? 'admin__nav-link admin__nav-link--active' : 'admin__nav-link';

const AdminLayout = () => {
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState(null);
  const [reconcileError, setReconcileError] = useState(null);

  const runReconcile = () => {
    setReconciling(true);
    setReconcileError(null);
    fetch(`${apiUrl}/admin/reconcile-spend`, {
      method: 'POST',
      headers: { accept: 'application/json', ...getAuthHeader() },
    })
      .then(response => {
        if (!response.ok) throw new Error(`Reconciliation failed (${response.status})`);
        return response.json();
      })
      .then(data => setReconcileResult(data))
      .catch(err => setReconcileError(err.message))
      .finally(() => setReconciling(false));
  };

  return (
    <div className="admin">
      {/* ← Back to Settings */}
      <Link to="/settings" className="admin__back">← Back to Settings</Link>
      <div className="admin__header">
        <h1 className="admin__title">Admin</h1>
        <button
          type="button"
          className="admin__reconcile-button"
          onClick={runReconcile}
          disabled={reconciling}
        >
          {reconciling ? 'Reconciling...' : 'Reconcile OpenRouter spend'}
        </button>
      </div>
      {reconcileError && <p className="admin__error">{reconcileError}</p>}
      {reconcileResult && (
        <div className="admin__reconcile-result">
          <p>
            Checked {reconcileResult.checked} transactions —{' '}
            {reconcileResult.mismatches.length} mismatch{reconcileResult.mismatches.length === 1 ? '' : 'es'},{' '}
            {reconcileResult.errors.length} error{reconcileResult.errors.length === 1 ? '' : 's'}.
          </p>
          {reconcileResult.mismatches.length > 0 && (
            <table className="admin__table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Stored (¢)</th>
                  <th>OpenRouter (¢)</th>
                  <th>Diff (¢)</th>
                </tr>
              </thead>
              <tbody>
                {reconcileResult.mismatches.map(m => (
                  <tr key={m.transaction_id}>
                    <td>{m.transaction_id}</td>
                    <td>{m.stored_cents}</td>
                    <td>{m.openrouter_cents}</td>
                    <td>{m.diff_cents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {reconcileResult.errors.length > 0 && (
            <ul>
              {reconcileResult.errors.map(e => (
                <li key={e.transaction_id}>{e.transaction_id}: {e.detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <nav className="admin__nav">
        <NavLink to="/admin/users" className={navLinkClass}>Users</NavLink>
        <NavLink to="/admin/moderation" className={navLinkClass}>Moderation</NavLink>
        <NavLink to="/admin/transactions" className={navLinkClass}>Transactions</NavLink>
        <NavLink to="/admin/settings" className={navLinkClass}>Settings</NavLink>
      </nav>
      <div className="admin__content">
        <Routes>
          <Route path="users" element={<AdminUsers />} />
          <Route path="moderation" element={<AdminModeration />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="*" element={<Navigate to="/admin/users" />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminLayout;
