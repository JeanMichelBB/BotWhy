// src/pages/Admin/AdminUsers.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../../api';
import ConfirmationOverlay from '../../components/ConfirmationOverlay/ConfirmationOverlay';

const getAuthHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` });

const AdminUsers = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: pageSize });
      if (search) params.set('search', search);
      const response = await fetch(`${apiUrl}/admin/users?${params}`, {
        headers: { accept: 'application/json', ...getAuthHeader() },
      });
      if (!response.ok) throw new Error(`Failed to load users (${response.status})`);
      const data = await response.json();
      setItems(data.items);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, page, pageSize]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const adjustCredit = (userId) => {
    const amountInput = window.prompt('Amount in cents (negative to deduct):');
    if (amountInput === null) return;
    const amountCents = Number(amountInput);
    if (Number.isNaN(amountCents)) {
      window.alert('Amount must be a number.');
      return;
    }
    const reason = window.prompt('Reason for this adjustment:');
    if (!reason) return;

    const params = new URLSearchParams({ amount_cents: amountCents, reason });
    fetch(`${apiUrl}/admin/users/${userId}/credit-adjustment?${params}`, {
      method: 'POST',
      headers: { accept: 'application/json', ...getAuthHeader() },
    })
      .then(response => {
        if (!response.ok) throw new Error('Adjustment failed');
        return fetchUsers();
      })
      .catch(err => window.alert(err.message));
  };

  const toggleDeleted = (user) => {
    const path = user.is_deleted ? 'reactivate' : 'soft-delete';
    const message = user.is_deleted
      ? `Reactivate ${user.email}?`
      : `Soft-delete ${user.email}? Their row and balance are preserved.`;
    setConfirmState({
      message,
      onConfirm: () => {
        fetch(`${apiUrl}/admin/users/${user.user_id}/${path}`, {
          method: 'POST',
          headers: { accept: 'application/json', ...getAuthHeader() },
        })
          .then(response => {
            if (!response.ok) throw new Error('Action failed');
            return fetchUsers();
          })
          .catch(err => window.alert(err.message))
          .finally(() => setConfirmState(null));
      },
    });
  };

  const toggleRole = (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    setConfirmState({
      message: `${newRole === 'admin' ? 'Promote' : 'Demote'} ${user.email} to ${newRole}?`,
      onConfirm: () => {
        const params = new URLSearchParams({ role: newRole });
        fetch(`${apiUrl}/admin/users/${user.user_id}/role?${params}`, {
          method: 'POST',
          headers: { accept: 'application/json', ...getAuthHeader() },
        })
          .then(response => {
            if (!response.ok) return response.json().then(data => { throw new Error(data.detail || 'Role change failed'); });
            return fetchUsers();
          })
          .catch(err => window.alert(err.message))
          .finally(() => setConfirmState(null));
      },
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="admin__section">
      <input
        type="text"
        placeholder="Search by email..."
        value={search}
        onChange={(e) => { setPage(1); setSearch(e.target.value); }}
        className="admin__search"
      />
      {error && <p className="admin__error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="admin__table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Balance</th>
              <th>Messages</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(user => (
              <tr key={user.user_id}>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>${(user.credit_balance_cents / 100).toFixed(2)}</td>
                <td>{user.message_count}</td>
                <td>{user.is_deleted ? 'Deleted' : 'Active'}</td>
                <td>
                  <button onClick={() => adjustCredit(user.user_id)}>Adjust credit</button>
                  <button onClick={() => toggleDeleted(user)}>{user.is_deleted ? 'Reactivate' : 'Soft-delete'}</button>
                  <button onClick={() => toggleRole(user)}>{user.role === 'admin' ? 'Demote' : 'Promote'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="admin__pagination">
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
        <span>Page {page} of {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>
      {confirmState && (
        <ConfirmationOverlay
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
};

export default AdminUsers;
