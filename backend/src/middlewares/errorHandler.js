// Middleware global de manejo de errores
const logger = require('../utils/logger');
const { config } = require('../config/env');

const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';

  // Errores de Mongoose - ID inválido
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Formato inválido para el campo: ${err.path}`;
  }

  // Errores de Mongoose - Duplicado
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `Ya existe un registro con ese ${field}.`;
  }

  // Errores de Mongoose - Validación
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => e.message);
    message = errors.join('. ');
  }

  // Log del error
  if (statusCode >= 500) {
    logger.error(`[${statusCode}] ${message}`, {
      stack: err.stack,
      url: req.originalUrl,
      method: req.method
    });
  } else {
    logger.warn(`[${statusCode}] ${message} - ${req.method} ${req.originalUrl}`);
  }

  // Respuesta al cliente
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  // Incluir stack trace solo en desarrollo
  if (config.isDevelopment && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

// Middleware para rutas no encontradas
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
};

module.exports = { errorHandler, notFoundHandler };
