import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import { apiUrl } from '../../api';
import { useCredits } from '../../hooks/useCredits';
import './Credits.css';

const getAuthHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` });

const PACKS = [
  { id: 'starter',  label: 'Starter',  baseCents: 500,  baseDisplay: '$5.00'  },
  { id: 'standard', label: 'Standard', baseCents: 1000, baseDisplay: '$10.00' },
  { id: 'pro',      label: 'Pro',      baseCents: 2500, baseDisplay: '$25.00' },
];

function calculateFee(baseCents) {
  return Math.ceil(baseCents * 0.029 + 30);
}

function centsToDisplay(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function CheckoutForm({ selectedPack, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const feeCents = calculateFee(selectedPack.baseCents);
  const totalCents = selectedPack.baseCents + feeCents;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${apiUrl}/credits/checkout`,
        {},
        {
          params: { pack_id: selectedPack.id },
          headers: { accept: 'application/json', ...getAuthHeader() },
        }
      );

      const { client_secret } = response.data;
      const cardElement = elements.getElement(CardElement);

      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: { card: cardElement },
      });

      if (result.error) {
        setError(result.error.message);
      } else {
        setSuccess(true);
        onSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return <p className="credits__success">Payment successful! Your balance has been updated.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="credits__form">
      <div className="credits__fee-breakdown">
        <span>Processing fee: {centsToDisplay(feeCents)}</span>
        <span>Total charged: <strong>{centsToDisplay(totalCents)}</strong></span>
      </div>
      <div className="credits__card-element">
        <CardElement options={{ style: { base: { fontSize: '14px', color: '#0a0a0a' } } }} />
      </div>
      {error && <p className="credits__error">{error}</p>}
      <button type="submit" disabled={!stripe || loading} className="credits__pay-button">
        {loading ? 'Processing...' : `Pay ${centsToDisplay(totalCents)}`}
      </button>
    </form>
  );
}

const Credits = () => {
  const { balanceDisplay, transactions, loading, refetch } = useCredits();
  const [selectedPack, setSelectedPack] = useState(PACKS[1]);
  const [stripePromise, setStripePromise] = useState(null);
  const stripeLoaded = useRef(false);

  useEffect(() => {
    if (stripeLoaded.current) return;
    stripeLoaded.current = true;
    axios.get(`${apiUrl}/config`).then((res) => {
      setStripePromise(loadStripe(res.data.stripe_publishable_key));
    });
  }, []);

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('en-CA');
  };

  return (
    <div className="credits">
      <div className="container">
        <Link to="/settings" className="credits__back">← Back to Settings</Link>

        <h1 className="credits__title">Credits</h1>

        <div className="credits__balance">
          <span className="credits__balance-label">Your Balance</span>
          <span className="credits__balance-amount">{loading ? '...' : balanceDisplay}</span>
        </div>

        <div className="credits__section">
          <h2 className="credits__section-title">Buy Credits</h2>
          <div className="credits__packs">
            {PACKS.map((pack) => (
              <button
                key={pack.id}
                className={`credits__pack ${selectedPack.id === pack.id ? 'credits__pack--selected' : ''}`}
                onClick={() => setSelectedPack(pack)}
                type="button"
              >
                <span className="credits__pack-label">{pack.label}</span>
                <span className="credits__pack-price">{pack.baseDisplay}</span>
              </button>
            ))}
          </div>

          {stripePromise ? (
            <Elements stripe={stripePromise}>
              <CheckoutForm selectedPack={selectedPack} onSuccess={refetch} />
            </Elements>
          ) : (
            <p className="credits__loading">Loading payment form...</p>
          )}
        </div>

        <div className="credits__section">
          <h2 className="credits__section-title">Transaction History</h2>
          {loading ? (
            <p className="credits__loading">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="credits__empty">No transactions yet.</p>
          ) : (
            <table className="credits__table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDate(t.created_at)}</td>
                    <td>{t.type}</td>
                    <td className={t.amount_cents > 0 ? 'credits__amount--positive' : 'credits__amount--negative'}>
                      {t.amount_cents > 0 ? '+' : ''}{centsToDisplay(t.amount_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Credits;
