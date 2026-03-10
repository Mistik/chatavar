// ─── Boot auth — runs ONCE at module load, before React renders ───────────────
// Validates the stored token against /api/me and primes the Zustand store.
// Returns a promise that resolves when auth state is known.
// This avoids React effect timing issues (double-fire in dev, HMR remounts, etc.)

import api from './api';

let _bootPromise = null;

export function bootAuth(store) {
  if (_bootPromise) return _bootPromise;           // already running / done
  const { token, setAuth, logout } = store.getState();

  if (!token) {
    _bootPromise = Promise.resolve({ authed: false });
    return _bootPromise;
  }

  _bootPromise = api.get('/me')
    .then(({ data }) => {
      setAuth(data.user, data.token || token);
      return { authed: true, user: data.user };
    })
    .catch((err) => {
      if (err.response?.status === 401) {
        logout();                                   // only clear on real 401
      }
      // Network errors / 5xx: keep token, let user stay logged in
      return { authed: !!store.getState().token };
    });

  return _bootPromise;
}
