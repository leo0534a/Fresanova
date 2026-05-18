// Rutas del webhook de WhatsApp
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { webhookLimiter } = require('../middlewares/rateLimiter');

router.post('/', webhookLimiter, (req, res) => webhookController.handleIncoming(req, res));
router.get('/', (req, res) => webhookController.verify(req, res));

module.exports = router;
