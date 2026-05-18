import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar sesión al cargar la app
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('fresata_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setAdmin(response.data.data.admin);
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem('fresata_token');
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, admin: adminData } = response.data.data;

      localStorage.setItem('fresata_token', token);
      setAdmin(adminData);
      setIsAuthenticated(true);
      toast.success('¡Bienvenido! 🍓');

      return true;
    } catch (error) {
      const message = error.response?.data?.message || 'Error al iniciar sesión';
      toast.error(message);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('fresata_token');
    setAdmin(null);
    setIsAuthenticated(false);
    toast.success('Sesión cerrada');
  };

  return (
    <AuthContext.Provider value={{ admin, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
