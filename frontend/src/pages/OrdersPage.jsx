import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime, statusLabels, statusColors } from '../utils/formatters';
import { HiOutlineSearch, HiOutlineFilter, HiOutlineEye, HiOutlineRefresh } from 'react-icons/hi';

const STATUS_OPTIONS = ['', 'pendiente', 'confirmado', 'preparando', 'en_camino', 'entregado', 'cancelado'];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [filters, setFilters] = useState({
    page: 1,
    search: '',
    status: ''
  });
  const { subscribe } = useSocket();

  useEffect(() => {
    loadOrders();
  }, [filters.page, filters.status]);

  // Escuchar eventos en tiempo real
  useEffect(() => {
    const unsubNew = subscribe('new_order', (order) => {
      setOrders((prev) => [order, ...prev]);
    });

    const unsubStatus = subscribe('order_status_update', (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
    });

    return () => { unsubNew(); unsubStatus(); };
  }, [subscribe]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params = { page: filters.page, limit: 15 };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;

      const response = await api.get('/orders', { params });
      setOrders(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
    loadOrders();
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Pedido actualizado a: ${statusLabels[newStatus]}`);
      loadOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al actualizar estado');
    }
  };

  const getNextStatus = (currentStatus) => {
    const flow = { pendiente: 'confirmado', confirmado: 'preparando', preparando: 'en_camino', en_camino: 'entregado' };
    return flow[currentStatus];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pedidos</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de pedidos de clientes</p>
        </div>
        <button onClick={loadOrders} className="btn-secondary flex items-center gap-2 self-start">
          <HiOutlineRefresh className="w-4 h-4" /> Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Buscar por nombre, teléfono o número de pedido..."
                className="input-field pl-10"
              />
            </div>
            <button type="submit" className="btn-primary">Buscar</button>
          </form>
          <div className="flex items-center gap-2">
            <HiOutlineFilter className="w-5 h-5 text-gray-400" />
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
              className="input-field w-auto"
            >
              <option value="">Todos los estados</option>
              {STATUS_OPTIONS.filter(Boolean).map((status) => (
                <option key={status} value={status}>{statusLabels[status]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de pedidos */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-fresanova-500 border-t-transparent"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No se encontraron pedidos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="table-header">Pedido</th>
                  <th className="table-header">Cliente</th>
                  <th className="table-header">Productos</th>
                  <th className="table-header">Total</th>
                  <th className="table-header">Pago</th>
                  <th className="table-header">Estado</th>
                  <th className="table-header">Fecha</th>
                  <th className="table-header">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="table-cell font-medium text-fresanova-600">{order.orderNumber}</td>
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{order.customerInfo?.fullName}</p>
                        <p className="text-xs text-gray-500">{order.customerInfo?.phone}</p>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="space-y-1 max-w-[250px]">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.productName}
                              {item.selectedSize?.name ? ` (${item.selectedSize.name})` : ''}
                            </span>
                            {(item.toppings?.length > 0 || item.sauces?.length > 0) && (
                              <p className="text-gray-400 truncate">
                                {[
                                  ...item.toppings?.map((t) => t.name) || [],
                                  ...item.sauces?.map((s) => s.name) || []
                                ].join(', ')}
                              </p>
                            )}
                          </div>
                        ))}
                        {(!order.items || order.items.length === 0) && (
                          <span className="text-gray-400 text-xs">Sin productos</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell font-semibold">{formatCurrency(order.total)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <span className="capitalize">{order.paymentMethod}</span>
                        {order.paymentMethod === 'transferencia' && !order.transferConfirmed && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            Pendiente
                          </span>
                        )}
                        {order.paymentMethod === 'transferencia' && order.transferConfirmed && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Confirmada
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td className="table-cell text-xs">{formatDateTime(order.createdAt)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/pedidos/${order._id}`}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-fresanova-600 hover:bg-fresanova-50 dark:hover:bg-fresanova-900/20 transition-colors"
                          title="Ver detalle"
                        >
                          <HiOutlineEye className="w-4 h-4" />
                        </Link>
                        {getNextStatus(order.status) && (
                          <button
                            onClick={() => updateOrderStatus(order._id, getNextStatus(order.status))}
                            className="text-xs btn-primary py-1 px-2"
                          >
                            {statusLabels[getNextStatus(order.status)]}
                          </button>
                        )}
                        {!['entregado', 'cancelado'].includes(order.status) && (
                          <button
                            onClick={() => updateOrderStatus(order._id, 'cancelado')}
                            className="text-xs btn-danger py-1 px-2"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {orders.length} de {pagination.total} pedidos
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={filters.page === 1}
                className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="flex items-center px-3 text-sm text-gray-600 dark:text-gray-400">
                {filters.page} / {pagination.pages}
              </span>
              <button
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={filters.page === pagination.pages}
                className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
