import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', emoji: '🍓', displayOrder: 0, isActive: true });

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      const response = await api.get('/products/categories/all');
      setCategories(response.data.data);
    } catch { toast.error('Error al cargar categorías'); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingCategory(null);
    setForm({ name: '', description: '', emoji: '🍓', displayOrder: categories.length, isActive: true });
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditingCategory(cat);
    setForm({ name: cat.name, description: cat.description || '', emoji: cat.emoji, displayOrder: cat.displayOrder, isActive: cat.isActive });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/products/categories/${editingCategory._id}`, form);
        toast.success('Categoría actualizada');
      } else {
        await api.post('/products/categories', form);
        toast.success('Categoría creada');
      }
      setShowModal(false);
      loadCategories();
    } catch (error) { toast.error(error.response?.data?.message || 'Error al guardar'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      await api.delete(`/products/categories/${id}`);
      toast.success('Categoría eliminada');
      loadCategories();
    } catch (error) { toast.error(error.response?.data?.message || 'Error al eliminar'); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-fresanova-500 border-t-transparent"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Categorías</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{categories.length} categorías</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" /> Nueva Categoría
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat._id} className="card flex items-start gap-4 hover:shadow-md transition-shadow">
            <span className="text-4xl">{cat.emoji}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white">{cat.name}</h3>
              {cat.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{cat.description}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className={`badge ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {cat.isActive ? 'Activa' : 'Inactiva'}
                </span>
                <span className="text-xs text-gray-400">Orden: {cat.displayOrder}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(cat)} className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50"><HiOutlinePencil className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(cat._id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50"><HiOutlineTrash className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editingCategory ? 'Editar' : 'Nueva'} Categoría</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><HiOutlineX className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows="2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Emoji</label>
                  <input type="text" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="input-field text-2xl text-center" maxLength="2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Orden</label>
                  <input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} className="input-field" min="0" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded text-fresanova-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Categoría activa</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Cancelar</button>
                <button type="submit" className="flex-1 btn-primary">{editingCategory ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
