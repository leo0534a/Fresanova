// Controlador del dashboard administrativo
const dashboardService = require('../services/dashboardService');
const ApiResponse = require('../utils/apiResponse');

class DashboardController {
  // GET /api/dashboard/stats
  async getStats(req, res, next) {
    try {
      const stats = await dashboardService.getStats();
      ApiResponse.success(res, stats, 'Estadísticas obtenidas');
    } catch (error) {
      next(error);
    }
  }

  // GET /api/dashboard/sales-chart
  async getSalesChart(req, res, next) {
    try {
      const { days = 7 } = req.query;
      const chart = await dashboardService.getSalesChart(parseInt(days));
      ApiResponse.success(res, chart, 'Gráfica de ventas obtenida');
    } catch (error) {
      next(error);
    }
  }

  // GET /api/dashboard/orders-by-status
  async getOrdersByStatus(req, res, next) {
    try {
      const data = await dashboardService.getOrdersByStatus();
      ApiResponse.success(res, data, 'Pedidos por estado obtenidos');
    } catch (error) {
      next(error);
    }
  }

  // GET /api/dashboard/recent-activity
  async getRecentActivity(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const activity = await dashboardService.getRecentActivity(parseInt(limit));
      ApiResponse.success(res, activity, 'Actividad reciente obtenida');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
