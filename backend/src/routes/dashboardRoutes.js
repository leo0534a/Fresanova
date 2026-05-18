// Rutas del dashboard administrativo
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.get('/stats', (req, res, next) => dashboardController.getStats(req, res, next));
router.get('/sales-chart', (req, res, next) => dashboardController.getSalesChart(req, res, next));
router.get('/orders-by-status', (req, res, next) => dashboardController.getOrdersByStatus(req, res, next));
router.get('/recent-activity', (req, res, next) => dashboardController.getRecentActivity(req, res, next));

module.exports = router;
