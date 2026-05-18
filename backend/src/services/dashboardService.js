// Servicio de estadísticas para el dashboard administrativo
const { Order, Customer, Product } = require('../models');
const { getStartOfDay, getEndOfDay } = require('../helpers/dateHelper');
const logger = require('../utils/logger');

class DashboardService {
  // Obtener estadísticas generales del dashboard
  async getStats() {
    try {
      const startOfDay = getStartOfDay();
      const endOfDay = getEndOfDay();

      // Consultas en paralelo para optimizar rendimiento
      const [
        todayOrders,
        todaySales,
        pendingOrders,
        deliveredToday,
        cancelledToday,
        totalRevenue,
        totalOrders,
        totalCustomers,
        topProducts
      ] = await Promise.all([
        // Pedidos de hoy
        Order.countDocuments({
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }),
        // Ventas de hoy (solo entregados y no cancelados)
        Order.aggregate([
          {
            $match: {
              createdAt: { $gte: startOfDay, $lte: endOfDay },
              status: { $nin: ['cancelado'] }
            }
          },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        // Pedidos pendientes
        Order.countDocuments({ status: 'pendiente' }),
        // Entregados hoy
        Order.countDocuments({
          status: 'entregado',
          deliveredAt: { $gte: startOfDay, $lte: endOfDay }
        }),
        // Cancelados hoy
        Order.countDocuments({
          status: 'cancelado',
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }),
        // Ingresos totales (todos los entregados)
        Order.aggregate([
          { $match: { status: 'entregado' } },
          { $group: { _id: null, total: { $sum: '$total' } } }
        ]),
        // Total de pedidos históricos
        Order.countDocuments(),
        // Total de clientes
        Customer.countDocuments(),
        // Productos más vendidos (top 5)
        Product.find({ salesCount: { $gt: 0 } })
          .sort('-salesCount')
          .limit(5)
          .select('name salesCount basePrice image')
      ]);

      return {
        today: {
          orders: todayOrders,
          sales: todaySales[0]?.total || 0,
          delivered: deliveredToday,
          cancelled: cancelledToday,
          pending: pendingOrders
        },
        total: {
          orders: totalOrders,
          revenue: totalRevenue[0]?.total || 0,
          customers: totalCustomers
        },
        topProducts
      };
    } catch (error) {
      logger.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  // Obtener estadísticas de ventas por día (últimos 7 días)
  async getSalesChart(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const salesByDay = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
            status: { $nin: ['cancelado'] }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            totalSales: { $sum: '$total' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return salesByDay;
    } catch (error) {
      logger.error('Error obteniendo gráfica de ventas:', error);
      throw error;
    }
  }

  // Obtener pedidos por estado
  async getOrdersByStatus() {
    try {
      const ordersByStatus = await Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      return ordersByStatus;
    } catch (error) {
      logger.error('Error obteniendo pedidos por estado:', error);
      throw error;
    }
  }

  // Obtener actividad reciente
  async getRecentActivity(limit = 10) {
    try {
      return Order.find()
        .sort('-createdAt')
        .limit(limit)
        .populate('customer', 'fullName whatsappNumber')
        .select('orderNumber status total customerInfo createdAt paymentMethod');
    } catch (error) {
      logger.error('Error obteniendo actividad reciente:', error);
      throw error;
    }
  }
}

module.exports = new DashboardService();
