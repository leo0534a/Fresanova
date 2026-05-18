// Middleware de autenticación JWT
const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const Admin = require('../models/Admin');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

// Verificar token JWT
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Buscar token en el header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(AppError.unauthorized('Acceso denegado. Token no proporcionado.'));
    }

    // Verificar token
    const decoded = jwt.verify(token, config.jwtSecret);

    // Buscar admin en la base de datos
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return next(AppError.unauthorized('El usuario asociado a este token ya no existe.'));
    }

    if (!admin.isActive) {
      return next(AppError.forbidden('Tu cuenta ha sido desactivada.'));
    }

    // Adjuntar admin al request
    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(AppError.unauthorized('Token inválido.'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(AppError.unauthorized('Token expirado. Inicia sesión nuevamente.'));
    }
    logger.error('Error en autenticación:', error);
    return next(AppError.internal('Error de autenticación.'));
  }
};

// Verificar rol del admin
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.admin.role)) {
      return next(
        AppError.forbidden('No tienes permisos para realizar esta acción.')
      );
    }
    next();
  };
};

// Generar token JWT
const generateToken = (adminId) => {
  return jwt.sign({ id: adminId }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
};

module.exports = { authenticate, authorize, generateToken };
