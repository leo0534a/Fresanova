// Registro centralizado de todas las rutas
const express = require('express');
const router = express.Router();

const webhookRoutes = require('./webhookRoutes');
const authRoutes = require('./authRoutes');
const orderRoutes = require('./orderRoutes');
const productRoutes = require('./productRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const customerRoutes = require('./customerRoutes');

// Webhook de WhatsApp (Twilio)
router.use('/webhook', webhookRoutes);

// API REST
router.use('/api/auth', authRoutes);
router.use('/api/orders', orderRoutes);
router.use('/api/products', productRoutes);
router.use('/api/dashboard', dashboardRoutes);
router.use('/api/customers', customerRoutes);

module.exports = router;
