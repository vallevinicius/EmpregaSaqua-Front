import { useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearSession, getSession, setSession, subscribe, type Session } from './session';
import { authApi, type RegisterInput } from '@/api/endpoints';

export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, getSession, () => null);
}

export function useAuthActions() {
  const qc = useQueryClient();
  return {
    async login(email: string, password: string) {
      const res = await authApi.login(email.trim().toLowerCase(), password);
      qc.clear(); // nunca reaproveitar cache de outro usuário
      return setSession(res.access_token);
    },
    async register(input: RegisterInput) {
      const res = await authApi.register({ ...input, email: input.email.trim().toLowerCase() });
      qc.clear();
      return setSession(res.access_token);
    },
    logout() {
      clearSession('manual');
      qc.clear();
    },
  };
}
