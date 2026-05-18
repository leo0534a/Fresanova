// Controlador de pedidos (API REST para el panel admin)
const { Order, Customer } = require('../models');
const orderService = require('../services/orderService');
const whatsappService = require('../services/whatsappService');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

class OrderController {
  // GET /api/orders — Listar pedidos con filtros y paginación
  async getOrders(req, res, next) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        search,
        startDate,
        endDate,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const filter = {};

      if (status) {
        filter.status = status;
      }

      if (search) {
        filter.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { 'customerInfo.fullName': { $regex: search, $options: 'i' } },
          { 'customerInfo.phone': { $regex: search, $options: 'i' } }
        ];
      }

      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) filter.createdAt.$lte = new Date(endDate);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const [orders, total] = await Promise.all([
        Order.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .populate('customer', 'fullName whatsappNumber totalOrders'),
        Order.countDocuments(filter)
      ]);

      ApiResponse.paginated(res, orders, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/orders/:id — Obtener pedido por ID
  async getOrder(req, res, next) {
    try {
      const order = await Order.findById(req.params.id)
        .populate('customer')
        .populate('items.product')
        .populate('items.toppings.topping')
        .populate('items.sauces.sauce');

      if (!order) {
        return next(AppError.notFound('Pedido no encontrado'));
      }

      ApiResponse.success(res, order);
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/orders/:id/status — Cambiar estado de pedido
  async updateStatus(req, res, next) {
    try {
      const { status, cancellationReason } = req.body;

      if (!status) {
        return next(AppError.badRequest('El nuevo estado es obligatorio'));
      }

      const order = await orderService.updateOrderStatus(
        req.params.id,
        status,
        req.admin.name
      );

      if (status === 'cancelado' && cancellationReason) {
        order.cancellationReason = cancellationReason;
        await order.save();
      }

      // Enviar notificación por WhatsApp al cliente
      try {
        const statusMessage = orderService.getStatusUpdateMessage(order);
        await whatsappService.sendMessage(
          order.customerInfo.whatsappNumber,
          statusMessage
        );
        logger.info(`Notificación de estado enviada a ${order.customerInfo.whatsappNumber}`);
      } catch (whatsappError) {
        logger.warn('No se pudo enviar notificación WhatsApp:', whatsappError.message);
      }

      ApiResponse.success(res, order, `Pedido actualizado a: ${status}`);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/orders/:id — Eliminar pedido (solo admin)
  async deleteOrder(req, res, next) {
    try {
      const order = await Order.findByIdAndDelete(req.params.id);

      if (!order) {
        return next(AppError.notFound('Pedido no encontrado'));
      }

      logger.info(`Pedido ${order.orderNumber} eliminado por ${req.admin.name}`);

      ApiResponse.success(res, null, 'Pedido eliminado exitosamente');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrderController();
