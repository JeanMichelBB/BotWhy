// src/pages/Admin/AdminLayout.jsx
import React from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import './Admin.css';
import AdminUsers from './AdminUsers';
import AdminModeration from './AdminModeration';
import AdminTransactions from './AdminTransactions';
import AdminSettings from './AdminSettings';

const navLinkClass = ({ isActive }) =>
  isActive ? 'admin__nav-link admin__nav-link--active' : 'admin__nav-link';

const AdminLayout = () => {
  return (
    <div className="admin">
      <h1 className="admin__title">Admin</h1>
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
