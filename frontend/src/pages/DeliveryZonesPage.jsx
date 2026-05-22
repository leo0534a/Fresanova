import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/formatters';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineRefresh
} from 'react-icons/hi';

export default function DeliveryZonesPage() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal de zona
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [zoneForm, setZoneForm] = useState({ zoneName: '', displayOrder: 0 });

  // Modal de barrio
  const [showNeighborhoodModal, setShowNeighborhoodModal] = useState(false);
  const [editingNeighborhood, setEditingNeighborhood] = useState(null);
  const [neighborhoodZoneId, setNeighborhoodZoneId] = useState(null);
  const [neighborhoodForm, setNeighborhoodForm] = useState({ name: '', price: '' });

  useEffect(() => { loadZones(); }, []);

  const loadZones = async () => {
    try {
      setLoading(true);
      const response = await api.get('/delivery-zones');
      setZones(response.data.data);
    } catch { toast.error('Error al cargar zonas'); }
    finally { setLoading(false); }
  };

  // ===== ZONAS =====
  const openZoneModal = (zone = null) => {
    if (zone) {
      setEditingZone(zone);
      setZoneForm({ zoneName: zone.zoneName, displayOrder: zone.displayOrder });
    } else {
      setEditingZone(null);
      setZoneForm({ zoneName: '', displayOrder: zones.length + 1 });
    }
    setShowZoneModal(true);
  };

  const saveZone = async (e) => {
    e.preventDefault();
    try {
      if (editingZone) {
        await api.put(`/delivery-zones/${editingZone._id}`, zoneForm);
        toast.success('Zona actualizada');
      } else {
        await api.post('/delivery-zones', { ...zoneForm, neighborhoods: [] });
        toast.success('Zona creada');
      }
      setShowZoneModal(false);
      loadZones();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar zona');
    }
  };

  const deleteZone = async (zoneId) => {
    if (!window.confirm('¿Eliminar esta zona y todos sus barrios?')) return;
    try {
      await api.delete(`/delivery-zones/${zoneId}`);
      toast.success('Zona eliminada');
      loadZones();
    } catch { toast.error('Error al eliminar zona'); }
  };

  // ===== BARRIOS =====
  const openNeighborhoodModal = (zoneId, neighborhood = null) => {
    setNeighborhoodZoneId(zoneId);
    if (neighborhood) {
      setEditingNeighborhood(neighborhood);
      setNeighborhoodForm({ name: neighborhood.name, price: neighborhood.price });
    } else {
      setEditingNeighborhood(null);
      setNeighborhoodForm({ name: '', price: '' });
    }
    setShowNeighborhoodModal(true);
  };

  const saveNeighborhood = async (e) => {
    e.preventDefault();
    try {
      const data = { name: neighborhoodForm.name, price: Number(neighborhoodForm.price) };
      if (editingNeighborhood) {
        await api.put(`/delivery-zones/${neighborhoodZoneId}/neighborhoods/${editingNeighborhood._id}`, data);
        toast.success('Barrio actualizado');
      } else {
        await api.post(`/delivery-zones/${neighborhoodZoneId}/neighborhoods`, data);
        toast.success('Barrio agregado');
      }
      setShowNeighborhoodModal(false);
      loadZones();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar barrio');
    }
  };

  const deleteNeighborhood = async (zoneId, neighborhoodId) => {
    if (!window.confirm('¿Eliminar este barrio?')) return;
    try {
      await api.delete(`/delivery-zones/${zoneId}/neighborhoods/${neighborhoodId}`);
      toast.success('Barrio eliminado');
      loadZones();
    } catch { toast.error('Error al eliminar barrio'); }
  };

  const toggleNeighborhoodActive = async (zoneId, neighborhood) => {
    try {
      await api.put(`/delivery-zones/${zoneId}/neighborhoods/${neighborhood._id}`, {
        isActive: !neighborhood.isActive
      });
      loadZones();
    } catch { toast.error('Error al actualizar barrio'); }
  };

  // Contar totales
  const totalNeighborhoods = zones.reduce((sum, z) => sum + z.neighborhoods.length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-fresanova-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Domicilios</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {zones.length} zonas — {totalNeighborhoods} barrios
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadZones} className="btn-secondary flex items-center gap-2">
            <HiOutlineRefresh className="w-4 h-4" /> Actualizar
          </button>
          <button onClick={() => openZoneModal()} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-4 h-4" /> Nueva Zona
          </button>
        </div>
      </div>

      {/* Zonas y barrios */}
      {zones.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          No hay zonas de domicilio configuradas
        </div>
      ) : (
        <div className="space-y-4">
          {zones.map((zone) => (
            <div key={zone._id} className="card overflow-hidden p-0">
              {/* Encabezado de zona */}
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🗺️</span>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{zone.zoneName}</h3>
                    <p className="text-xs text-gray-500">{zone.neighborhoods.length} barrios</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openNeighborhoodModal(zone._id)}
                    className="text-xs btn-primary py-1.5 px-3 flex items-center gap-1"
                  >
                    <HiOutlinePlus className="w-3 h-3" /> Barrio
                  </button>
                  <button
                    onClick={() => openZoneModal(zone)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    title="Editar zona"
                  >
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteZone(zone._id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Eliminar zona"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tabla de barrios */}
              {zone.neighborhoods.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700">
                        <th className="table-header">Barrio</th>
                        <th className="table-header">Tarifa</th>
                        <th className="table-header">Estado</th>
                        <th className="table-header">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {zone.neighborhoods.map((n) => (
                        <tr key={n._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="table-cell font-medium text-gray-900 dark:text-white">{n.name}</td>
                          <td className="table-cell font-semibold text-fresanova-600">{formatCurrency(n.price)}</td>
                          <td className="table-cell">
                            <button
                              onClick={() => toggleNeighborhoodActive(zone._id, n)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                n.isActive
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200'
                              }`}
                            >
                              {n.isActive ? (
                                <><HiOutlineCheck className="w-3 h-3" /> Activo</>
                              ) : (
                                'Inactivo'
                              )}
                            </button>
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openNeighborhoodModal(zone._id, n)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                title="Editar"
                              >
                                <HiOutlinePencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteNeighborhood(zone._id, n._id)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Eliminar"
                              >
                                <HiOutlineTrash className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Zona */}
      {showZoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingZone ? 'Editar Zona' : 'Nueva Zona'}
              </h2>
              <button onClick={() => setShowZoneModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveZone} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre de la zona
                </label>
                <input
                  type="text"
                  value={zoneForm.zoneName}
                  onChange={(e) => setZoneForm({ ...zoneForm, zoneName: e.target.value })}
                  className="input-field"
                  placeholder="Ej: Zona residencial / central"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Orden de visualización
                </label>
                <input
                  type="number"
                  value={zoneForm.displayOrder}
                  onChange={(e) => setZoneForm({ ...zoneForm, displayOrder: Number(e.target.value) })}
                  className="input-field"
                  min="0"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowZoneModal(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingZone ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Barrio */}
      {showNeighborhoodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingNeighborhood ? 'Editar Barrio' : 'Agregar Barrio'}
              </h2>
              <button onClick={() => setShowNeighborhoodModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <HiOutlineX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveNeighborhood} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del barrio
                </label>
                <input
                  type="text"
                  value={neighborhoodForm.name}
                  onChange={(e) => setNeighborhoodForm({ ...neighborhoodForm, name: e.target.value })}
                  className="input-field"
                  placeholder="Ej: Bosque"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tarifa de domicilio (COP)
                </label>
                <input
                  type="number"
                  value={neighborhoodForm.price}
                  onChange={(e) => setNeighborhoodForm({ ...neighborhoodForm, price: e.target.value })}
                  className="input-field"
                  placeholder="Ej: 5000"
                  min="0"
                  step="500"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNeighborhoodModal(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingNeighborhood ? 'Guardar' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
