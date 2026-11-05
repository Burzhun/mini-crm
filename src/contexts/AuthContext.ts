import { createContext } from 'react';
import type { useAuthSession } from '../hooks/useAuthSession';
export const AuthContext = createContext<ReturnType<typeof useAuthSession> | null>(null);
