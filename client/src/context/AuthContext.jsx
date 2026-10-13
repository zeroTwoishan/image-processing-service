import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../lib/api.js';

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
      .catch((err) => {
        // Only a 401 means the token is bad. If the server is just down, keep the token for next time.
        if (err.code === 'UNAUTHORIZED') tokenStore.clear();
      })
      .finally(() => setLoading(false));
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
