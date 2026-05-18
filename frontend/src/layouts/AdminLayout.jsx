import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  HiOutlineHome,
  HiOutlineClipboardList,
  HiOutlineShoppingBag,
  HiOutlineTag,
  HiOutlineUsers,
  HiOutlineLogout,
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineMenu,
  HiOutlineX,
  HiOutlineCake
} from 'react-icons/hi';

const menuItems = [
  { path: '/', label: 'Dashboard', icon: HiOutlineHome },
  { path: '/pedidos', label: 'Pedidos', icon: HiOutlineClipboardList },
  { path: '/productos', label: 'Productos', icon: HiOutlineShoppingBag },
  { path: '/categorias', label: 'Categorias', icon: HiOutlineTag },
  { path: '/toppings', label: 'Toppings y Salsas', icon: HiOutlineCake },
  { path: '/clientes', label: 'Clientes', icon: HiOutlineUsers }
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { admin, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-fresata-500 text-white shadow-md shadow-fresata-500/30'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
    }`;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-200 dark:border-gray-700">
        <span className="text-3xl">🍓</span>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Fresata</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Panel Admin</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={navLinkClass}
            onClick={() => setSidebarOpen(false)}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer del sidebar */}
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
        {/* Info del admin */}
        <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-lg bg-gray-50 dark:bg-gray-800">
          <div className="w-8 h-8 rounded-full bg-fresata-500 flex items-center justify-center text-white font-bold text-sm">
            {admin?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{admin?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{admin?.email}</p>
          </div>
        </div>

        {/* Botones de tema y logout */}
        <div className="flex gap-2">
          <button
            onClick={toggleDarkMode}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {darkMode ? <HiOutlineSun className="w-4 h-4" /> : <HiOutlineMoon className="w-4 h-4" />}
            {darkMode ? 'Claro' : 'Oscuro'}
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <HiOutlineLogout className="w-4 h-4" />
            Salir
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar móvil */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <HiOutlineX className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Sidebar desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-72 lg:flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
        <SidebarContent />
      </aside>

      {/* Contenido principal */}
      <div className="lg:pl-72">
        {/* Header móvil */}
        <header className="sticky top-0 z-20 flex items-center gap-4 px-4 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <HiOutlineMenu className="w-5 h-5" />
          </button>
          <span className="text-xl">🍓</span>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Fresata</h1>
        </header>

        {/* Contenido de la página */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
