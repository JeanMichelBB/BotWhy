// src/pages/Admin/AdminTransactions.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../../api';

const getAuthHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` });

const AdminTransactions = () => {
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: pageSize });
      if (typeFilter) params.set('type', typeFilter);
      const response = await fetch(`${apiUrl}/admin/transactions?${params}`, {
        headers: { accept: 'application/json', ...getAuthHeader() },
      });
      if (!response.ok) throw new Error(`Failed to load transactions (${response.status})`);
      const data = await response.json();
      setItems(data.items);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, page, pageSize]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="admin__section">
      <select value={typeFilter} onChange={(e) => { setPage(1); setTypeFilter(e.target.value); }}>
        <option value="">All types</option>
        <option value="purchase">Purchase</option>
        <option value="spend">Spend</option>
        <option value="free_grant">Free grant</option>
        <option value="admin_adjustment">Admin adjustment</option>
      </select>
      {error && <p className="admin__error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="admin__table">
          <thead>
            <tr>
              <th>User</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {items.map(txn => (
              <tr key={txn.id}>
                <td>{txn.user_email || txn.user_id}</td>
                <td>{txn.type}</td>
                <td>${(txn.amount_cents / 100).toFixed(2)}</td>
                <td>{txn.description}</td>
                <td>{txn.created_at ? new Date(txn.created_at).toLocaleString() : ''}</td>
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
    </div>
  );
};

export default AdminTransactions;
