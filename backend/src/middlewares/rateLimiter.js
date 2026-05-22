// Configuración de rate limiting
const rateLimit = require('express-rate-limit');
const { config } = require('../config/env');

// Rate limiter general para la API — más permisivo en desarrollo
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.isDevelopment ? 1000 : config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter estricto para login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Intenta en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiter para webhook de WhatsApp (más permisivo)
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60,
  message: {
    success: false,
    message: 'Demasiados mensajes. Intenta más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { apiLimiter, authLimiter, webhookLimiter };
