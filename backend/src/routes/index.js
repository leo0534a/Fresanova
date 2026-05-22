// Registro centralizado de todas las rutas
const express = require('express');
const router = express.Router();

const webhookRoutes = require('./webhookRoutes');
const authRoutes = require('./authRoutes');
const orderRoutes = require('./orderRoutes');
const productRoutes = require('./productRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const customerRoutes = require('./customerRoutes');
const deliveryZoneRoutes = require('./deliveryZoneRoutes');
const chatRoutes = require('./chatRoutes');

// Webhook de WhatsApp (Twilio)
router.use('/webhook', webhookRoutes);

// API REST
router.use('/api/auth', authRoutes);
router.use('/api/orders', orderRoutes);
router.use('/api/products', productRoutes);
router.use('/api/dashboard', dashboardRoutes);
router.use('/api/customers', customerRoutes);
router.use('/api/delivery-zones', deliveryZoneRoutes);
router.use('/api/chat', chatRoutes);

module.exports = router;
