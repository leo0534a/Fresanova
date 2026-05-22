// Aplicación Express principal
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { config } = require('./config/env');
const { apiLimiter } = require('./middlewares/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const routes = require('./routes');
const logger = require('./utils/logger');

const app = express();

// Confiar en proxies (ngrok, nginx, etc.) para que rate-limit funcione correctamente
app.set('trust proxy', 1);

// === Seguridad ===
app.use(helmet());

// === CORS ===
const corsOptions = {
  origin: (origin, callback) => {
    // Permitir peticiones sin origin (Postman, curl, webhooks de Twilio)
    if (!origin) return callback(null, true);

    // En desarrollo, permitir cualquier localhost
    if (config.isDevelopment && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    if (config.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn(`CORS bloqueado para origin: ${origin}`);
    return callback(new Error('No permitido por CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Manejar preflight requests explícitamente
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// === Body Parsers ===
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// === Logging HTTP ===
if (config.isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

// === Rate Limiting (solo para API) ===
app.use('/api', apiLimiter);

// === Health Check ===
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🍓 Fresanova Backend activo',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString()
  });
});

// === Rutas ===
app.use(routes);

// === Archivos estáticos (uploads e imágenes del negocio) ===
app.use('/uploads', express.static('src/uploads'));
app.use('/images', express.static(path.join(__dirname, '../../Imagenes')));

// === Frontend estático en producción ===
const path = require('path');
const frontendPath = path.join(__dirname, '../../frontend/dist');
if (config.isProduction) {
  app.use(express.static(frontendPath, {
    maxAge: '30d',
    immutable: true
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/webhook') || req.path.startsWith('/health') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// === Manejo de errores ===
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
