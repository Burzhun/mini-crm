import { useEffect, useState } from 'react';
import type { Repository } from '../api';
import type { Snapshot } from '../domain';
import { errorMessage } from '../utils/errors';

const empty: Snapshot = { projects: [], tasks: [], profiles: [], history: [] };
export function useCrmData(repository: Repository) {
  const [data, setData] = useState<Snapshot>(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    setData(empty);
    setLoading(true);
    repository
      .load()
      .then((snapshot) => {
        if (active) setData(snapshot);
      })
      .catch((error) => {
        if (active) setError(errorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repository]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function execute(action: () => Promise<void>, success: string) {
    setBusy(true);
    setError('');
    try {
      await action();
      setData(await repository.load());
      setNotice(success);
      return true;
    } catch (error) {
      setError(errorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return {
    data,
    loading,
    busy,
    error,
    notice,
    execute,
    clearError: () => setError(''),
    reportError: (error: unknown) => setError(errorMessage(error)),
  };
}
