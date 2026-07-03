import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { apiUrl } from '../api';

const getAuthHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` });

export function useCredits() {
  const [balanceCents, setBalanceCents] = useState(null);
  const [balanceDisplay, setBalanceDisplay] = useState('...');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBalance = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/credits/balance`, {
        headers: { accept: 'application/json', ...getAuthHeader() },
      });
      setBalanceCents(response.data.balance_cents);
      setBalanceDisplay(response.data.balance_display);
      setTransactions(response.data.transactions);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balanceCents, balanceDisplay, transactions, loading, error, refetch: fetchBalance };
}
