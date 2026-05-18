// Rutas de autenticación
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');

router.post('/login', authLimiter, (req, res, next) => authController.login(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.getProfile(req, res, next));
router.put('/update-password', authenticate, (req, res, next) => authController.updatePassword(req, res, next));

module.exports = router;
