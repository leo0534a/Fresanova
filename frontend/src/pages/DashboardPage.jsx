import { useState, useEffect } from 'react';
import api from '../services/api';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { statusLabels, statusColors } from '../utils/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  HiOutlineClipboardList,
  HiOutlineCash,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineUsers,
  HiOutlineTrendingUp,
  HiOutlineShoppingBag
} from 'react-icons/hi';

const PIE_COLORS = ['#fbbf24', '#3b82f6', '#a855f7', '#f97316', '#22c55e', '#ef4444'];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [salesChart, setSalesChart] = useState([]);
  const [ordersByStatus, setOrdersByStatus] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, salesRes, statusRes, activityRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/sales-chart', { params: { days: 7 } }),
        api.get('/dashboard/orders-by-status'),
        api.get('/dashboard/recent-activity', { params: { limit: 8 } })
      ]);

      setStats(statsRes.data.data);
      setSalesChart(salesRes.data.data);
      setOrdersByStatus(statusRes.data.data);
      setRecentActivity(activityRes.data.data);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-fresata-500 border-t-transparent"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'Pedidos Hoy', value: stats?.today?.orders || 0, icon: HiOutlineClipboardList, color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Ventas Hoy', value: formatCurrency(stats?.today?.sales || 0), icon: HiOutlineCash, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
    { label: 'Pendientes', value: stats?.today?.pending || 0, icon: HiOutlineClock, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
    { label: 'Entregados Hoy', value: stats?.today?.delivered || 0, icon: HiOutlineCheckCircle, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Cancelados Hoy', value: stats?.today?.cancelled || 0, icon: HiOutlineXCircle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
    { label: 'Ingresos Totales', value: formatCurrency(stats?.total?.revenue || 0), icon: HiOutlineTrendingUp, color: 'text-fresata-600 bg-fresata-100 dark:bg-fresata-900/30' },
    { label: 'Total Pedidos', value: stats?.total?.orders || 0, icon: HiOutlineShoppingBag, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Total Clientes', value: stats?.total?.customers || 0, icon: HiOutlineUsers, color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30' }
  ];

  const pieData = ordersByStatus.map((item) => ({
    name: statusLabels[item._id] || item._id,
    value: item.count
  }));

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Resumen general de Fresata</p>
      </div>

      {/* Cards de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div key={index} className="stat-card">
            <div className={`p-3 rounded-xl ${card.color}`}>
              <card.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfica de ventas por día */}
        <div className="card lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ventas Últimos 7 Días</h3>
          <div className="h-72">
            {salesChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="_id" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), 'Ventas']}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Bar dataKey="totalSales" fill="#ec4899" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No hay datos de ventas aún
              </div>
            )}
          </div>
        </div>

        {/* Gráfica de pedidos por estado */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pedidos por Estado</h3>
          <div className="h-72">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No hay datos aún
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actividad reciente y productos top */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actividad reciente */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actividad Reciente</h3>
          <div className="space-y-3">
            {recentActivity.length > 0 ? recentActivity.map((order) => (
              <div key={order._id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{order.orderNumber}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {order.customerInfo?.fullName} — {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(order.total)}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                    {statusLabels[order.status]}
                  </span>
                </div>
              </div>
            )) : (
              <p className="text-gray-400 text-center py-8">No hay actividad reciente</p>
            )}
          </div>
        </div>

        {/* Productos más vendidos */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Productos Más Vendidos</h3>
          <div className="space-y-3">
            {stats?.topProducts?.length > 0 ? stats.topProducts.map((product, index) => (
              <div key={product._id} className="flex items-center gap-4 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-fresata-100 dark:bg-fresata-900/30 text-fresata-600 flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(product.basePrice)}</p>
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {product.salesCount} vendidos
                </span>
              </div>
            )) : (
              <p className="text-gray-400 text-center py-8">No hay ventas aún</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
