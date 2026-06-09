import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

export interface User {
  id: string; username: string; email: string;
  role: string; permissions: string[]; client_id?: string; supplier_id?: string;
  name?: string; is_active: boolean; last_login?: string; created_by?: string;
}

interface AuthContextType {
  user: User | null; isAuthenticated: boolean; isLoading: boolean;
  login: (u: string, p: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hasPermission: (p: string) => boolean;
  isSuperAdmin: () => boolean;
  isAdmin: () => boolean;
  users: User[];
  getVisibleUsers: () => User[];
  addUser: (u: Omit<User, 'id' | 'is_active' | 'last_login' | 'created_by'>, password: string) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  toggleUserBlock: (id: string) => void;
  resetPassword: (id: string, newPassword: string) => void;
  changeOwnPassword: (currentPassword: string, newPassword: string) => boolean;
  verifySuperAdmin: (password: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usersDb, setUsersDb] = useState<User[]>([]);

  // Load users from API
  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      if (res.success && res.data) setUsersDb(res.data);
    } catch {}
  };

  // On mount, check token and load users
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (token && savedUser) {
      try { setUser(JSON.parse(savedUser)); api.setToken(token); loadUsers(); } catch {}
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post('/auth/login', { username, password });
      if (response.success && response.token) {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('auth_user', JSON.stringify(response.user));
        api.setToken(response.token);
        setUser(response.user);
        loadUsers();
        return { success: true };
      }
      return { success: false, error: 'Invalid credentials' };
    } catch (e: any) { return { success: false, error: e.message || 'Login failed' }; }
  };

  const logout = () => {
    localStorage.removeItem('auth_token'); localStorage.removeItem('auth_user');
    api.setToken(null); setUser(null); setUsersDb([]);
    window.location.href = '/login';
  };

  const hasPermission = (p: string) => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.permissions.includes('all')) return true;
    return user.permissions.includes(p);
  };
  const isSuperAdmin = () => user?.role === 'super_admin';
  const isAdmin = () => user?.role === 'super_admin' || user?.role === 'admin';
  const getVisibleUsers = () => {
    if (!user) return [];
    if (user.role === 'super_admin' || user.role === 'admin') return usersDb;
    return usersDb.filter(u => u.id === user.id);
  };

  // User management via API
  const addUser = async (nu: any, pw: string) => {
    try {
      await api.post('/users', { ...nu, password: pw });
      loadUsers();
    } catch (e: any) { alert('Failed: ' + e.message); }
  };
  const updateUser = async (id: string, data: any) => {
    try {
      await api.put('/users/' + id, data);
      loadUsers();
      if (user && user.id === id) {
        const res = await api.get('/users');
        if (res.success && res.data) {
          const updated = res.data.find((u: User) => String(u.id) === String(id));
          if (updated) { setUser(updated); localStorage.setItem('auth_user', JSON.stringify(updated)); }
        }
      }
    } catch (e: any) { alert('Failed: ' + e.message); }
  };
  const deleteUser = async (id: string) => {
    if (user && user.id === id) { alert('Cannot delete yourself'); return; }
    try { await api.delete('/users/' + id); loadUsers(); } catch (e: any) { alert('Failed: ' + e.message); }
  };
  const toggleUserBlock = async (id: string) => {
    const target = usersDb.find(u => u.id === id);
    if (!target) return;
    try { await api.put('/users/' + id, { is_active: !target.is_active }); loadUsers(); } catch (e: any) { alert('Failed: ' + e.message); }
  };
  const resetPassword = async (id: string, pw: string) => {
    try { await api.put('/users/' + id, { password: pw }); alert('Password reset'); } catch (e: any) { alert('Failed: ' + e.message); }
  };
  const changeOwnPassword = async (cp: string, np: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const check = await api.post('/auth/login', { username: user.username, password: cp });
      if (!check.success) { alert('Wrong current password'); return false; }
      await api.put('/users/' + user.id, { password: np });
      alert('Password changed');
      return true;
    } catch (e: any) { alert('Failed: ' + e.message); return false; }
  };
  const verifySuperAdmin = async (p: string): Promise<boolean> => {
    try { const r = await api.post('/auth/login', { username: 'admin', password: p }); return r.success; } catch { return false; }
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, isLoading,
      login, logout, hasPermission, isSuperAdmin, isAdmin,
      users: usersDb, getVisibleUsers,
      addUser, updateUser, deleteUser, toggleUserBlock,
      resetPassword, changeOwnPassword, verifySuperAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
