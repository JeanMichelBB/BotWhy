// src/pages/Admin/AdminModeration.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../../api';
import ConfirmationOverlay from '../../components/ConfirmationOverlay/ConfirmationOverlay';

const getAuthHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` });

const AdminModeration = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  const fetchReported = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/admin/trending/reported`, {
        headers: { accept: 'application/json', ...getAuthHeader() },
      });
      if (!response.ok) throw new Error(`Failed to load reported posts (${response.status})`);
      const data = await response.json();
      setItems(data.items);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReported();
  }, [fetchReported]);

  const deletePost = (post) => {
    setConfirmState({
      message: `Delete trending post "${post.title}"? This also deletes its messages.`,
      onConfirm: () => {
        fetch(`${apiUrl}/admin/trending/${post.id}`, {
          method: 'DELETE',
          headers: { accept: 'application/json', ...getAuthHeader() },
        })
          .then(response => {
            if (!response.ok) throw new Error('Delete failed');
            return fetchReported();
          })
          .catch(err => window.alert(err.message))
          .finally(() => setConfirmState(null));
      },
    });
  };

  return (
    <div className="admin__section">
      {error && <p className="admin__error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p>No reported posts.</p>
      ) : (
        <table className="admin__table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Description</th>
              <th>Reports</th>
              <th>Likes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(post => (
              <tr key={post.id}>
                <td>{post.title}</td>
                <td>{post.description}</td>
                <td>{Array.isArray(post.reports) ? post.reports.length : 0}</td>
                <td>{post.likes}</td>
                <td>
                  <button onClick={() => deletePost(post)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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

export default AdminModeration;
