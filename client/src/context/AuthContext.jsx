import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStore, AUTH_EXPIRED_EVENT } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Only "loading" if there's a saved token to check; with no token we already know: logged out.
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));

  // Restore the session on page load: turn a saved token back into a user.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api('/me')
      .then(({ user }) => setUser(user))
      // A 401 already cleared the token inside api(). Any other failure (server down) keeps it for next time.
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Any request that gets a 401 with our token means the session is dead: log out everywhere at once,
  // and ProtectedRoute sends the user to /login (remembering the page they were on).
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const saveSession = ({ user, token }) => {
    tokenStore.set(token);
    setUser(user);
  };

  const login = (username, password) => api('/login', { method: 'POST', body: { username, password } }).then(saveSession);
  const register = (username, password) =>
    api('/register', { method: 'POST', body: { username, password } }).then(saveSession);
  const logout = () => {
    tokenStore.clear();
    setUser(null);
  };

  return <AuthContext value={{ user, loading, login, register, logout }}>{children}</AuthContext>;
}

export const useAuth = () => useContext(AuthContext);
