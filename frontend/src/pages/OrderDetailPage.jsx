import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime, statusLabels, statusColors } from '../utils/formatters';
import { HiOutlineArrowLeft } from 'react-icons/hi';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  const loadOrder = async () => {
    try {
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data.data);
    } catch {
      toast.error('Pedido no encontrado');
      navigate('/pedidos');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      await api.patch(`/orders/${id}/status`, { status: newStatus });
      toast.success(`Actualizado a: ${statusLabels[newStatus]}`);
      loadOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al actualizar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-fresata-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!order) return null;

  const statusFlow = ['pendiente', 'confirmado', 'preparando', 'en_camino', 'entregado'];
  const currentIndex = statusFlow.indexOf(order.status);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/pedidos')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <HiOutlineArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{order.orderNumber}</h1>
          <p className="text-gray-500 dark:text-gray-400">{formatDateTime(order.createdAt)}</p>
        </div>
        <span className={`ml-auto inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[order.status]}`}>
          {statusLabels[order.status]}
        </span>
      </div>

      {/* Barra de progreso */}
      {order.status !== 'cancelado' && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">PROGRESO DEL PEDIDO</h3>
          <div className="flex items-center gap-2">
            {statusFlow.map((status, index) => (
              <div key={status} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  index <= currentIndex
                    ? 'bg-fresata-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                  {index <= currentIndex ? '✓' : index + 1}
                </div>
                {index < statusFlow.length - 1 && (
                  <div className={`flex-1 h-1 mx-1 rounded ${
                    index < currentIndex ? 'bg-fresata-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {statusFlow.map((status) => (
              <span key={status} className="text-[10px] text-gray-500 dark:text-gray-400">{statusLabels[status]}</span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info del cliente */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cliente</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Nombre:</span>
              <span className="font-medium text-gray-900 dark:text-white">{order.customerInfo.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Teléfono:</span>
              <span className="font-medium text-gray-900 dark:text-white">{order.customerInfo.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Dirección:</span>
              <span className="font-medium text-gray-900 dark:text-white text-right max-w-[200px]">{order.customerInfo.address}</span>
            </div>
            {order.customerInfo.addressReference && (
              <div className="flex justify-between">
                <span className="text-gray-500">Referencia:</span>
                <span className="font-medium text-gray-900 dark:text-white">{order.customerInfo.addressReference}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Pago:</span>
              <span className="font-medium text-gray-900 dark:text-white capitalize">{order.paymentMethod}</span>
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Acciones</h3>
          <div className="space-y-3">
            {order.status !== 'cancelado' && order.status !== 'entregado' && (
              <>
                {currentIndex < statusFlow.length - 1 && (
                  <button
                    onClick={() => updateStatus(statusFlow[currentIndex + 1])}
                    className="w-full btn-primary py-2.5"
                  >
                    Avanzar a: {statusLabels[statusFlow[currentIndex + 1]]}
                  </button>
                )}
                <button onClick={() => updateStatus('cancelado')} className="w-full btn-danger py-2.5">
                  Cancelar Pedido
                </button>
              </>
            )}
            {order.status === 'cancelado' && order.cancellationReason && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-700 dark:text-red-300">
                <strong>Razón de cancelación:</strong> {order.cancellationReason}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Productos del pedido */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Productos</h3>
        <div className="space-y-4">
          {order.items.map((item, index) => (
            <div key={item._id || index} className="flex items-start gap-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <div className="w-8 h-8 rounded-full bg-fresata-100 dark:bg-fresata-900/30 text-fresata-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                <p className="text-sm text-gray-500">Base: {formatCurrency(item.basePrice)}</p>
                {item.selectedOption?.name && (
                  <p className="text-sm text-gray-500">Tipo: {item.selectedOption.name}</p>
                )}
                {item.toppings?.length > 0 && (
                  <p className="text-sm text-gray-500">Toppings: {item.toppings.map((t) => t.name).join(', ')}</p>
                )}
                {item.sauces?.length > 0 && (
                  <p className="text-sm text-gray-500">Salsas: {item.sauces.map((s) => s.name).join(', ')}</p>
                )}
                {item.comment && (
                  <p className="text-sm text-yellow-600">Nota: {item.comment}</p>
                )}
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(item.itemTotal)}</p>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal:</span>
            <span className="font-medium">{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Domicilio:</span>
            <span className="font-medium">{formatCurrency(order.deliveryPrice)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
            <span>Total:</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Historial de estados */}
      {order.statusHistory?.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Historial</h3>
          <div className="space-y-3">
            {order.statusHistory.map((entry, index) => (
              <div key={index} className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-fresata-500"></div>
                <span className="font-medium text-gray-900 dark:text-white">{statusLabels[entry.status]}</span>
                <span className="text-gray-500">{formatDateTime(entry.changedAt)}</span>
                <span className="text-gray-400">por {entry.changedBy}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
