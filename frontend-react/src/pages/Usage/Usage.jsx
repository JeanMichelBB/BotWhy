import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCredits } from '../../hooks/useCredits';
import './Usage.css';

const FILTERS = ['all', 'spend', 'purchase', 'free_grant'];

const FILTER_LABELS = {
    all: 'All',
    spend: 'Usage',
    purchase: 'Top-ups',
    free_grant: 'Grants',
};

function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
}

function centsToDisplay(cents) {
    const abs = Math.abs(cents);
    const dollars = abs / 100;
    const decimals = dollars < 0.01 ? 6 : 2;
    return `$${dollars.toFixed(decimals)}`;
}

export default function Usage() {
    const { balanceDisplay, transactions, loading } = useCredits();
    const [filter, setFilter] = useState('all');

    const filtered = transactions.filter(t => filter === 'all' || t.type === filter);

    const totalSpent = transactions
        .filter(t => t.type === 'spend')
        .reduce((sum, t) => sum + Math.abs(t.amount_cents), 0);

    return (
        <div className="usage">
            <div className="container">
                <Link to="/settings" className="usage__back">← Back to Settings</Link>

                <h1 className="usage__title">Usage</h1>

                <div className="usage__summary">
                    <div className="usage__summary-item">
                        <span className="usage__summary-label">Balance</span>
                        <span className="usage__summary-value">{balanceDisplay}</span>
                    </div>
                    <div className="usage__summary-item">
                        <span className="usage__summary-label">Total spent</span>
                        <span className="usage__summary-value">{centsToDisplay(totalSpent)}</span>
                    </div>
                    <div className="usage__summary-item">
                        <span className="usage__summary-label">Transactions</span>
                        <span className="usage__summary-value">{transactions.length}</span>
                    </div>
                </div>

                <div className="usage__filters">
                    {FILTERS.map(f => (
                        <button
                            key={f}
                            className={`usage__filter ${filter === f ? 'usage__filter--active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {FILTER_LABELS[f]}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <p className="usage__empty">Loading...</p>
                ) : filtered.length === 0 ? (
                    <p className="usage__empty">No transactions yet.</p>
                ) : (
                    <table className="usage__table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Description</th>
                                <th>Type</th>
                                <th className="usage__col-amount">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(t => (
                                <tr key={t.id}>
                                    <td className="usage__date">{formatDate(t.created_at)}</td>
                                    <td className="usage__time">{formatTime(t.created_at)}</td>
                                    <td>{t.description || '—'}</td>
                                    <td>
                                        <span className={`usage__badge usage__badge--${t.type}`}>
                                            {FILTER_LABELS[t.type] || t.type}
                                        </span>
                                    </td>
                                    <td className={`usage__col-amount ${t.amount_cents > 0 ? 'usage__amount--positive' : 'usage__amount--negative'}`}>
                                        {t.amount_cents > 0 ? '+' : '−'}{centsToDisplay(t.amount_cents)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
