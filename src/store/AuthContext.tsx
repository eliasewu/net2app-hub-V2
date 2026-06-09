import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

export interface User {
  id: string; username: string; email: string;
  role: 'super_admin' | 'admin' | 'support' | 'billing' | 'agent' | 'client' | 'supplier';
  permissions: string[]; client_id?: string; supplier_id?: string;
  name?: string; is_active: boolean; last_login?: string;
  created_by?: string;
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

// Load/save users to localStorage (for user management features)
const USERS_KEY = 'pg_users_db';
function loadUsers(): User[] { 
  try { 
    const s = localStorage.getItem(USERS_KEY);
    if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length > 0) return p; }
  } catch {} 
  return []; 
}
function saveUsers(u: User[]) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usersDb, setUsersDb] = useState<User[]>(loadUsers);

  // On mount, check for existing token and validate with API
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        api.setToken(token);
        
        // Verify token is still valid with API
        api.get<any>('/auth/me').then(res => {
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('auth_user', JSON.stringify(res.data));
          }
        }).catch(() => {
          // Token expired, but keep user from localStorage for now
        });
      } catch {}
    }
    setIsLoading(false);
  }, []);

  // Login via API (PostgreSQL)
  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post<any>('/auth/login', { username, password });
      
      if (response.success && response.token) {
        // Save token and user
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('auth_user', JSON.stringify(response.user));
        api.setToken(response.token);
        setUser(response.user);
        
        // Sync users list with API
        api.get<any>('/users').then(res => {
          if (res.success && res.data) {
            setUsersDb(res.data);
            saveUsers(res.data);
          }
        }).catch(() => {});
        
        return { success: true };
      }
      return { success: false, error: 'Invalid credentials' };
    } catch (e: any) {
      console.error('Login error:', e);
      return { success: false, error: e.message || 'Login failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    api.setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const hasPermission = (p: string) => {
    if (!user) return false;
    if (user.role === 'super_admin' || user.permissions.includes('all')) return true;
    return user.permissions.includes(p);
  };

  const isSuperAdmin = () => user?.role === 'super_admin';
  const isAdmin = () => user?.role === 'super_admin' || user?.role === 'admin';

  // User management with API
  const addUser = async (nu: Omit<User, 'id' | 'is_active' | 'last_login' | 'created_by'>, pw: string) => {
    if (!user) return;
    if (user.role === 'admin' && nu.role === 'super_admin') {
      alert('Only Super Admin can create Super Admin accounts');
      return;
    }
    try {
      await api.post('/users', { ...nu, password: pw });
      // Refresh users
      const res = await api.get<any>('/users');
      if (res.success && res.data) {
        setUsersDb(res.data);
        saveUsers(res.data);
      }
    } catch (e: any) {
      alert('Failed to create user: ' + e.message);
    }
  };

  const updateUser = async (id: string, data: Partial<User>) => {
    if (user && user.role === 'admin') {
      const target = usersDb.find(u => u.id === id);
      if (target?.role === 'super_admin') { alert('Admin cannot modify Super Admin users'); return; }
      if (data.role === 'super_admin') { alert('Only Super Admin can grant super_admin role'); return; }
    }
    try {
      await api.put(`/users/${id}`, data);
      const res = await api.get<any>('/users');
      if (res.success && res.data) {
        setUsersDb(res.data);
        saveUsers(res.data);
      }
      if (user && user.id === id) {
        const updated = res?.data?.find((u: User) => u.id === id);
        if (updated) setUser(updated);
      }
    } catch (e: any) {
      alert('Failed to update user: ' + e.message);
    }
  };

  const deleteUser = async (id: string) => {
    if (user && user.id === id) { alert('Cannot delete your own account'); return; }
    try {
      await api.delete(`/users/${id}`);
      const res = await api.get<any>('/users');
      if (res.success && res.data) {
        setUsersDb(res.data);
        saveUsers(res.data);
      }
    } catch (e: any) {
      alert('Failed to delete user: ' + e.message);
    }
  };

  const toggleUserBlock = async (id: string) => {
    const target = usersDb.find(u => u.id === id);
    if (!target) return;
    if (user && user.id === id) { alert('Cannot block your own account'); return; }
    try {
      await api.put(`/users/${id}`, { is_active: !target.is_active });
      const res = await api.get<any>('/users');
      if (res.success && res.data) {
        setUsersDb(res.data);
        saveUsers(res.data);
      }
    } catch (e: any) {
      alert('Failed to toggle user: ' + e.message);
    }
  };

  const resetPassword = async (id: string, newPassword: string) => {
    try {
      await api.put(`/users/${id}`, { password: newPassword });
      alert('Password reset successfully');
    } catch (e: any) {
      alert('Failed to reset password: ' + e.message);
    }
  };

  const changeOwnPassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    if (!user) return false;
    try {
      // Verify current password
      const check = await api.post<any>('/auth/login', { 
        username: user.username, 
        password: currentPassword 
      });
      if (!check.success) {
        alert('Current password is incorrect');
        return false;
      }
      await api.put(`/users/${user.id}`, { password: newPassword });
      alert('Password changed successfully');
      return true;
    } catch (e: any) {
      alert('Failed to change password: ' + e.message);
      return false;
    }
  };

  const verifySuperAdmin = async (password: string): Promise<boolean> => {
    try {
      const check = await api.post<any>('/auth/login', {
        username: 'admin',
        password: password
      });
      return check.success;
    } catch {
      return false;
    }
  };

  const getVisibleUsers = () => {
    if (!user) return [];
    if (user.role === 'super_admin' || user.role === 'admin') return usersDb;
    return usersDb.filter(u => u.id === user.id);
  };

  // Fetch users from API on first load
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      api.get<any>('/users').then(res => {
        if (res.success && res.data) {
          setUsersDb(res.data);
          saveUsers(res.data);
        }
      }).catch(() => {});
    }
  }, []);

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
