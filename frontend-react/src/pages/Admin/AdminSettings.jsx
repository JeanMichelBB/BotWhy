// src/pages/Admin/AdminSettings.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '../../api';

const getAuthHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` });

const AdminSettings = () => {
  const [activeModel, setActiveModel] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/admin/settings/active-model`, {
        headers: { accept: 'application/json', ...getAuthHeader() },
      });
      if (!response.ok) throw new Error(`Failed to load settings (${response.status})`);
      const data = await response.json();
      setActiveModel(data.active_model);
      setAvailableModels(data.available_models);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveModel = () => {
    setSaving(true);
    setSaved(false);
    const params = new URLSearchParams({ model: activeModel });
    fetch(`${apiUrl}/admin/settings/active-model?${params}`, {
      method: 'PUT',
      headers: { accept: 'application/json', ...getAuthHeader() },
    })
      .then(response => {
        if (!response.ok) return response.json().then(data => { throw new Error(data.detail || 'Save failed'); });
        setSaved(true);
      })
      .catch(err => setError(err.message))
      .finally(() => setSaving(false));
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="admin__section">
      {error && <p className="admin__error">{error}</p>}
      <label htmlFor="active-model-select">Active model</label>
      <select
        id="active-model-select"
        value={activeModel}
        onChange={(e) => { setActiveModel(e.target.value); setSaved(false); }}
      >
        {availableModels.map(model => (
          <option key={model} value={model}>{model}</option>
        ))}
      </select>
      <button onClick={saveModel} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
      {saved && <p>Saved.</p>}
    </div>
  );
};

export default AdminSettings;
