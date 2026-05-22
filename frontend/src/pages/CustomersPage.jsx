import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { HiOutlineSearch, HiOutlineEye, HiOutlineX, HiOutlineChatAlt2 } from 'react-icons/hi';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [showDetail, setShowDetail] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatCustomerName, setChatCustomerName] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  useEffect(() => { loadCustomers(); }, [page]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const response = await api.get('/customers', { params });
      setCustomers(response.data.data);
      setPagination(response.data.pagination);
    } catch { toast.error('Error al cargar clientes'); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadCustomers();
  };

  const viewCustomer = async (id) => {
    try {
      const response = await api.get(`/customers/${id}`);
      setSelectedCustomer(response.data.data.customer);
      setCustomerOrders(response.data.data.orders);
      setShowDetail(true);
    } catch { toast.error('Error al cargar cliente'); }
  };

  const viewChat = async (id) => {
    try {
      setLoadingChat(true);
      const response = await api.get(`/customers/${id}/messages`);
      setChatMessages(response.data.data.messages);
      setChatCustomerName(response.data.data.customer.fullName || 'Cliente');
      setShowChat(true);
    } catch { toast.error('Error al cargar conversación'); }
    finally { setLoadingChat(false); }
  };

  if (loading && customers.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-fresanova-500 border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{pagination?.total || customers.length} clientes registrados</p>
      </div>

      <div className="card">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, teléfono o WhatsApp..."
              className="input-field pl-10"
            />
          </div>
          <button type="submit" className="btn-primary">Buscar</button>
        </form>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="table-header">Cliente</th>
                <th className="table-header">WhatsApp</th>
                <th className="table-header">Pedidos</th>
                <th className="table-header">Total Gastado</th>
                <th className="table-header">Última Interacción</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {customers.map((customer) => (
                <tr key={customer._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="table-cell">
                    <p className="font-medium text-gray-900 dark:text-white">{customer.fullName || 'Sin nombre'}</p>
                    {customer.address && <p className="text-xs text-gray-500 truncate max-w-[200px]">{customer.address}</p>}
                  </td>
                  <td className="table-cell text-sm">{customer.whatsappNumber?.replace('whatsapp:', '')}</td>
                  <td className="table-cell font-semibold">{customer.totalOrders}</td>
                  <td className="table-cell font-semibold text-green-600">{formatCurrency(customer.totalSpent)}</td>
                  <td className="table-cell text-xs">{customer.lastInteraction ? formatDateTime(customer.lastInteraction) : '-'}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => viewCustomer(customer._id)} className="p-1.5 rounded-lg text-gray-500 hover:text-fresanova-600 hover:bg-fresanova-50" title="Ver detalle">
                        <HiOutlineEye className="w-4 h-4" />
                      </button>
                      <button onClick={() => viewChat(customer._id)} className="p-1.5 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" title="Ver conversación">
                        <HiOutlineChatAlt2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan="6" className="text-center py-12 text-gray-400">No se encontraron clientes</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm text-gray-500">{pagination.total} clientes</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50">Anterior</button>
              <span className="flex items-center px-3 text-sm text-gray-600 dark:text-gray-400">{page} / {pagination.pages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page === pagination.pages} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-50">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {showDetail && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedCustomer.fullName || 'Cliente'}</h2>
              <button onClick={() => setShowDetail(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><HiOutlineX className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">WhatsApp</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedCustomer.whatsappNumber?.replace('whatsapp:', '')}</p>
                </div>
                <div>
                  <p className="text-gray-500">Teléfono</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedCustomer.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Dirección</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedCustomer.address || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Pedidos</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedCustomer.totalOrders}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Gastado</p>
                  <p className="font-bold text-green-600">{formatCurrency(selectedCustomer.totalSpent)}</p>
                </div>
              </div>

              {customerOrders.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Últimos Pedidos</h3>
                  <div className="space-y-2">
                    {customerOrders.map((order) => (
                      <div key={order._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-sm">
                        <div>
                          <p className="font-medium text-fresanova-600">{order.orderNumber}</p>
                          <p className="text-xs text-gray-500">{formatDateTime(order.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(order.total)}</p>
                          <p className="text-xs capitalize text-gray-500">{order.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de conversación */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                  {chatCustomerName.charAt(0) || 'C'}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">{chatCustomerName}</h2>
                  <p className="text-xs text-gray-500">Conversación con el bot</p>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900/30" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
              {loadingChat ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-green-500 border-t-transparent"></div>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No hay mensajes registrados</div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                      msg.direction === 'inbound'
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-md'
                        : 'bg-green-500 text-white rounded-tr-md'
                    }`}>
                      <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                      <p className={`text-[10px] mt-1 text-right ${
                        msg.direction === 'inbound' ? 'text-gray-400' : 'text-green-100'
                      }`}>
                        {new Date(msg.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
