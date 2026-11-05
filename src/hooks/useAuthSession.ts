import { useEffect, useState } from 'react';
import { supabase } from '../api';
import { demoData } from '../demo';
import type { Profile } from '../domain';
import { errorMessage } from '../utils/errors';

export function useAuthSession() {
  const [user, setUser] = useState<Profile | null>(null);
  const [demo, setDemo] = useState(false);
  const [authLoading, setAuthLoading] = useState(!!supabase);
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    let ticket = 0;
    async function accept(id?: string) {
      const current = ++ticket;
      setAuthLoading(true);
      try {
        if (!id) {
          if (alive && current === ticket) setUser(null);
          return;
        }
        const { data: profile, error } = await supabase!
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();
        if (error)
          throw new Error('Профиль не настроен. Примените миграцию и назначьте роль пользователю.');
        if (alive && current === ticket) {
          setDemo(false);
          setUser(profile as Profile);
          setAuthError('');
        }
      } catch (error) {
        if (alive && current === ticket) {
          setUser(null);
          setAuthError(errorMessage(error));
        }
      } finally {
        if (alive && current === ticket) setAuthLoading(false);
      }
    }
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!alive) return;
      if (error) {
        setAuthError(error.message);
        setAuthLoading(false);
      } else void accept(session?.user.id);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (alive) void accept(session?.user.id);
      }, 0);
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  async function login(email: string, password: string) {
    setAuthError('');
    setBusy(true);
    try {
      if (!supabase) throw new Error('Подключение к Supabase не настроено. Используйте деморежим.');
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error)
        throw new Error(
          error.message === 'Invalid login credentials'
            ? 'Неверный email или пароль.'
            : error.message,
        );
    } catch (error) {
      setAuthError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function enterDemo(id: string) {
    const profile = demoData().profiles.find((p) => p.id === id);
    if (!profile) return;
    setDemo(true);
    setAuthLoading(false);
    setUser(profile);
    setAuthError('');
  }

  async function logout() {
    if (!demo && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    setUser(null);
    setDemo(false);
    setAuthError('');
  }

  return { user, demo, authLoading, authError, busy, login, enterDemo, logout };
}
