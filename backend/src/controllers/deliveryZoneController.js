// Controlador de zonas de domicilio
const { DeliveryZone } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');

class DeliveryZoneController {
  // GET /api/delivery-zones — Listar todas las zonas con sus barrios
  async getZones(req, res, next) {
    try {
      const zones = await DeliveryZone.find()
        .sort('displayOrder');

      ApiResponse.success(res, zones);
    } catch (error) {
      next(error);
    }
  }

  // GET /api/delivery-zones/:id — Obtener una zona
  async getZone(req, res, next) {
    try {
      const zone = await DeliveryZone.findById(req.params.id);
      if (!zone) return next(AppError.notFound('Zona no encontrada'));
      ApiResponse.success(res, zone);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/delivery-zones — Crear zona nueva
  async createZone(req, res, next) {
    try {
      const { zoneName, neighborhoods, displayOrder } = req.body;

      if (!zoneName || !neighborhoods || neighborhoods.length === 0) {
        return next(AppError.badRequest('El nombre de la zona y al menos un barrio son obligatorios'));
      }

      const zone = await DeliveryZone.create({
        zoneName,
        neighborhoods,
        displayOrder: displayOrder || 0
      });

      ApiResponse.created(res, zone, 'Zona creada exitosamente');
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/delivery-zones/:id — Actualizar zona completa
  async updateZone(req, res, next) {
    try {
      const { zoneName, neighborhoods, displayOrder, isActive } = req.body;
      const updateData = {};

      if (zoneName !== undefined) updateData.zoneName = zoneName;
      if (neighborhoods !== undefined) updateData.neighborhoods = neighborhoods;
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
      if (isActive !== undefined) updateData.isActive = isActive;

      const zone = await DeliveryZone.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!zone) return next(AppError.notFound('Zona no encontrada'));
      ApiResponse.success(res, zone, 'Zona actualizada');
    } catch (error) {
      next(error);
    }
  }

  // POST /api/delivery-zones/:id/neighborhoods — Agregar barrio a una zona
  async addNeighborhood(req, res, next) {
    try {
      const { name, price } = req.body;

      if (!name || price === undefined) {
        return next(AppError.badRequest('Nombre y precio del barrio son obligatorios'));
      }

      const zone = await DeliveryZone.findById(req.params.id);
      if (!zone) return next(AppError.notFound('Zona no encontrada'));

      // Verificar que no exista un barrio con el mismo nombre en la misma zona
      const exists = zone.neighborhoods.some(
        (n) => n.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (exists) {
        return next(AppError.badRequest('Ya existe un barrio con ese nombre en esta zona'));
      }

      zone.neighborhoods.push({ name: name.trim(), price, isActive: true });
      await zone.save();

      ApiResponse.success(res, zone, 'Barrio agregado');
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/delivery-zones/:id/neighborhoods/:neighborhoodId — Actualizar barrio
  async updateNeighborhood(req, res, next) {
    try {
      const { name, price, isActive } = req.body;
      const zone = await DeliveryZone.findById(req.params.id);
      if (!zone) return next(AppError.notFound('Zona no encontrada'));

      const neighborhood = zone.neighborhoods.id(req.params.neighborhoodId);
      if (!neighborhood) return next(AppError.notFound('Barrio no encontrado'));

      if (name !== undefined) neighborhood.name = name.trim();
      if (price !== undefined) neighborhood.price = price;
      if (isActive !== undefined) neighborhood.isActive = isActive;

      await zone.save();
      ApiResponse.success(res, zone, 'Barrio actualizado');
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/delivery-zones/:id/neighborhoods/:neighborhoodId — Eliminar barrio
  async deleteNeighborhood(req, res, next) {
    try {
      const zone = await DeliveryZone.findById(req.params.id);
      if (!zone) return next(AppError.notFound('Zona no encontrada'));

      const neighborhood = zone.neighborhoods.id(req.params.neighborhoodId);
      if (!neighborhood) return next(AppError.notFound('Barrio no encontrado'));

      neighborhood.deleteOne();
      await zone.save();

      ApiResponse.success(res, zone, 'Barrio eliminado');
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/delivery-zones/:id — Eliminar zona completa
  async deleteZone(req, res, next) {
    try {
      const zone = await DeliveryZone.findByIdAndDelete(req.params.id);
      if (!zone) return next(AppError.notFound('Zona no encontrada'));
      ApiResponse.success(res, null, 'Zona eliminada exitosamente');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DeliveryZoneController();
