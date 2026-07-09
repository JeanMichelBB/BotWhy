// src/pages/Admin/AdminModeration.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../api';
import ConfirmationOverlay from '../../components/ConfirmationOverlay/ConfirmationOverlay';

const getAuthHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` });

const AdminModeration = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmState, setConfirmState] = useState(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: pageSize });
      const response = await fetch(`${apiUrl}/admin/trending?${params}`, {
        headers: { accept: 'application/json', ...getAuthHeader() },
      });
      if (!response.ok) throw new Error(`Failed to load posts (${response.status})`);
      const data = await response.json();
      setItems(data.items);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
            return fetchPosts();
          })
          .catch(err => window.alert(err.message))
          .finally(() => setConfirmState(null));
      },
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="admin__section">
      {error && <p className="admin__error">{error}</p>}
      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p>No trending posts.</p>
      ) : (
        <table className="admin__table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Description</th>
              <th>Likes</th>
              <th>Comments</th>
              <th>Reports</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(post => (
              <tr
                key={post.id}
                onClick={() => navigate(`/trending?post=${post.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <td>{post.title}</td>
                <td>{post.user_email || post.user_id}</td>
                <td>{post.description}</td>
                <td>{post.likes}</td>
                <td>{post.comment_count}</td>
                <td>{post.report_count}</td>
                <td>{post.created_at ? new Date(post.created_at).toLocaleString() : ''}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => deletePost(post)}>Delete</button>
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

export default AdminModeration;
