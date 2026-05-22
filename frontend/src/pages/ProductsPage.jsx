import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/formatters';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', basePrice: '', category: '',
    allowsToppings: false, allowsSauces: false, includedToppings: 0, includedSauces: 0,
    includesNote: '', isActive: true, sizes: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        api.get('/products'),
        api.get('/products/categories/all')
      ]);
      setProducts(productsRes.data.data);
      setCategories(categoriesRes.data.data);
    } catch {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm({
      name: '', description: '', basePrice: '', category: categories[0]?._id || '',
      allowsToppings: false, allowsSauces: false, includedToppings: 0, includedSauces: 0,
      includesNote: '', isActive: true, sizes: []
    });
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || '',
      basePrice: product.basePrice,
      category: product.category?._id || product.category,
      allowsToppings: product.allowsToppings,
      allowsSauces: product.allowsSauces,
      includedToppings: product.includedToppings || 0,
      includedSauces: product.includedSauces || 0,
      includesNote: product.includesNote || '',
      isActive: product.isActive,
      sizes: product.sizes || []
    });
    setShowModal(true);
  };

  const addSize = () => {
    setForm({ ...form, sizes: [...form.sizes, { name: '', price: '' }] });
  };

  const updateSize = (index, field, value) => {
    const updatedSizes = [...form.sizes];
    updatedSizes[index] = { ...updatedSizes[index], [field]: value };
    setForm({ ...form, sizes: updatedSizes });
  };

  const removeSize = (index) => {
    setForm({ ...form, sizes: form.sizes.filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...form,
        basePrice: Number(form.basePrice),
        sizes: form.sizes
          .filter((s) => s.name && s.price)
          .map((s) => ({ name: s.name, price: Number(s.price) }))
      };
      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, data);
        toast.success('Producto actualizado');
      } else {
        await api.post('/products', data);
        toast.success('Producto creado');
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Producto eliminado');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-fresanova-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Productos</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{products.length} productos registrados</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" /> Nuevo Producto
        </button>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="table-header">Producto</th>
                <th className="table-header">Categoría</th>
                <th className="table-header">Precio</th>
                <th className="table-header">Toppings</th>
                <th className="table-header">Ventas</th>
                <th className="table-header">Estado</th>
                <th className="table-header">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {products.map((product) => (
                <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="table-cell">
                    <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                    {product.includesNote && (
                      <p className="text-xs text-gray-500 mt-0.5">{product.includesNote}</p>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className="inline-flex items-center gap-1 text-sm">
                      {product.category?.emoji} {product.category?.name}
                    </span>
                  </td>
                  <td className="table-cell font-semibold">
                    {product.sizes && product.sizes.length > 0 ? (
                      <div className="space-y-0.5">
                        {product.sizes.map((s, i) => (
                          <p key={i} className="text-xs">
                            <span className="text-gray-500">{s.name}:</span> {formatCurrency(s.price)}
                          </p>
                        ))}
                      </div>
                    ) : (
                      formatCurrency(product.basePrice)
                    )}
                  </td>
                  <td className="table-cell text-xs">
                    {product.allowsToppings && <span className="badge bg-purple-100 text-purple-700 mr-1">Toppings</span>}
                    {product.allowsSauces && <span className="badge bg-amber-100 text-amber-700">Salsas</span>}
                  </td>
                  <td className="table-cell">{product.salesCount}</td>
                  <td className="table-cell">
                    <span className={`badge ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {product.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => openEditModal(product)} className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <HiOutlinePencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(product._id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <HiOutlineX className="w-5 h-5" />
              </button>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio Base (COP)</label>
                  <input type="number" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: e.target.value })} className="input-field" required min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field" required>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.emoji} {cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nota de lo que incluye</label>
                <input type="text" value={form.includesNote} onChange={(e) => setForm({ ...form, includesNote: e.target.value })} className="input-field" placeholder="Ej: Incluye arequipe o leche condensada" />
              </div>
              {/* Tamaños */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tamaños (opcional)</label>
                  <button type="button" onClick={addSize} className="text-xs text-fresanova-600 hover:text-fresanova-700 font-medium">
                    + Agregar tamaño
                  </button>
                </div>
                {form.sizes.length > 0 && (
                  <div className="space-y-2">
                    {form.sizes.map((size, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={size.name}
                          onChange={(e) => updateSize(index, 'name', e.target.value)}
                          className="input-field flex-1"
                          placeholder="Ej: Pequeño"
                        />
                        <input
                          type="number"
                          value={size.price}
                          onChange={(e) => updateSize(index, 'price', e.target.value)}
                          className="input-field w-32"
                          placeholder="Precio"
                          min="0"
                        />
                        <button type="button" onClick={() => removeSize(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg dark:hover:bg-red-900/20">
                          <HiOutlineX className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <p className="text-xs text-gray-500">Si hay tamaños, el precio base se ignora en el bot.</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.allowsToppings} onChange={(e) => setForm({ ...form, allowsToppings: e.target.checked })} className="w-4 h-4 rounded text-fresanova-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Permite toppings</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.allowsSauces} onChange={(e) => setForm({ ...form, allowsSauces: e.target.checked })} className="w-4 h-4 rounded text-fresanova-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Permite salsas</span>
                </label>
              </div>
              {form.allowsToppings && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Toppings incluidos</label>
                  <input type="number" value={form.includedToppings} onChange={(e) => setForm({ ...form, includedToppings: Number(e.target.value) })} className="input-field" min="0" />
                </div>
              )}
              {form.allowsSauces && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Salsas incluidas</label>
                  <input type="number" value={form.includedSauces} onChange={(e) => setForm({ ...form, includedSauces: Number(e.target.value) })} className="input-field" min="0" />
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 rounded text-fresanova-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Producto activo</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-secondary">Cancelar</button>
                <button type="submit" className="flex-1 btn-primary">{editingProduct ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
