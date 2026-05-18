// Rutas de clientes
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', (req, res, next) => customerController.getCustomers(req, res, next));
router.get('/:id', (req, res, next) => customerController.getCustomer(req, res, next));
router.put('/:id', (req, res, next) => customerController.updateCustomer(req, res, next));

module.exports = router;
