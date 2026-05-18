// Rutas de pedidos
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, authorize } = require('../middlewares/auth');

// Todas las rutas requieren autenticación
router.use(authenticate);

router.get('/', (req, res, next) => orderController.getOrders(req, res, next));
router.get('/:id', (req, res, next) => orderController.getOrder(req, res, next));
router.patch('/:id/status', (req, res, next) => orderController.updateStatus(req, res, next));
router.delete('/:id', authorize('superadmin', 'admin'), (req, res, next) => orderController.deleteOrder(req, res, next));

module.exports = router;
