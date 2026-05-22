import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/formatters';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';

export default function ToppingsPage() {
  const [toppings, setToppings] = useState([]);
  const [sauces, setSauces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('topping'); // 'topping' | 'sauce'
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', isActive: true });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [toppingsRes, saucesRes] = await Promise.all([
        api.get('/products/toppings/all'),
        api.get('/products/sauces/all')
      ]);
      setToppings(toppingsRes.data.data);
      setSauces(saucesRes.data.data);
    } catch { toast.error('Error al cargar datos'); }
    finally { setLoading(false); }
  };

  const openCreate = (type) => {
    setModalType(type);
    setEditingItem(null);
    setForm({ name: '', price: '', isActive: true });
    setShowModal(true);
  };

  const openEdit = (item, type) => {
    setModalType(type);
    setEditingItem(item);
    setForm({ name: item.name, price: item.price, isActive: item.isActive });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { ...form, price: Number(form.price) };
    const endpoint = modalType === 'topping' ? 'toppings' : 'sauces';
    const label = modalType === 'topping' ? 'Topping' : 'Salsa';

    try {
      if (editingItem) {
        await api.put(`/products/${endpoint}/${editingItem._id}`, data);
        toast.success(`${label} actualizado`);
      } else {
        await api.post(`/products/${endpoint}`, data);
        toast.success(`${label} creado`);
      }
      setShowModal(false);
      loadData();
    } catch (error) { toast.error(error.response?.data?.message || 'Error al guardar'); }
  };

  const handleDelete = async (id, type) => {
    const label = type === 'topping' ? 'topping' : 'salsa';
    if (!confirm(`¿Eliminar este ${label}?`)) return;
    const endpoint = type === 'topping' ? 'toppings' : 'sauces';
    try {
      await api.delete(`/products/${endpoint}/${id}`);
      toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} eliminado`);
      loadData();
    } catch (error) { toast.error(error.response?.data?.message || 'Error al eliminar'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-fresanova-500 border-t-transparent"></div></div>;
  }

  const ItemTable = ({ items, type, title, emoji }) => (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center justify-between p-6 pb-0">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{emoji} {title} ({items.length})</h2>
        <button onClick={() => openCreate(type)} className="btn-primary text-sm flex items-center gap-1">
          <HiOutlinePlus className="w-4 h-4" /> Nuevo
        </button>
      </div>
      <div className="overflow-x-auto mt-4">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="table-header">Nombre</th>
              <th className="table-header">Precio</th>
              <th className="table-header">Estado</th>
              <th className="table-header">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((item) => (
              <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="table-cell font-medium text-gray-900 dark:text-white">{item.name}</td>
                <td className="table-cell font-semibold">{formatCurrency(item.price)}</td>
                <td className="table-cell">
                  <span className={`badge ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="table-cell">
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(item, type)} className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50">
                      <HiOutlinePencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item._id, type)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50">
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan="4" className="text-center py-8 text-gray-400">No hay {title.toLowerCase()} registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Toppings y Salsas</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de extras para productos</p>
      </div>

      <ItemTable items={toppings} type="topping" title="Toppings" emoji="🧁" />
      <ItemTable items={sauces} type="sauce" title="Salsas" emoji="🍯" />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingItem ? 'Editar' : 'Nuevo'} {modalType === 'topping' ? 'Topping' : 'Salsa'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><HiOutlineX className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio (COP)</label>
                <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input-field" required min="0" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded text-fresanova-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Activo</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Cancelar</button>
                <button type="submit" className="flex-1 btn-primary">{editingItem ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
