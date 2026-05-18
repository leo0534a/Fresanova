// Controlador de autenticación de administradores
const Admin = require('../models/Admin');
const { generateToken } = require('../middlewares/auth');
const ApiResponse = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

class AuthController {
  // POST /api/auth/login
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return next(AppError.badRequest('Email y contraseña son obligatorios'));
      }

      // Buscar admin con contraseña
      const admin = await Admin.findOne({ email }).select('+password');
      if (!admin) {
        return next(AppError.unauthorized('Credenciales inválidas'));
      }

      if (!admin.isActive) {
        return next(AppError.forbidden('Tu cuenta está desactivada'));
      }

      // Verificar contraseña
      const isPasswordValid = await admin.comparePassword(password);
      if (!isPasswordValid) {
        return next(AppError.unauthorized('Credenciales inválidas'));
      }

      // Actualizar último login
      admin.lastLogin = new Date();
      await admin.save();

      // Generar token
      const token = generateToken(admin._id);

      logger.info(`Admin ${admin.email} inició sesión`);

      ApiResponse.success(res, {
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          avatar: admin.avatar
        }
      }, 'Inicio de sesión exitoso');
    } catch (error) {
      next(error);
    }
  }

  // GET /api/auth/me
  async getProfile(req, res, next) {
    try {
      ApiResponse.success(res, {
        admin: {
          id: req.admin._id,
          name: req.admin.name,
          email: req.admin.email,
          role: req.admin.role,
          avatar: req.admin.avatar,
          lastLogin: req.admin.lastLogin
        }
      }, 'Perfil obtenido');
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/auth/update-password
  async updatePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return next(AppError.badRequest('Contraseña actual y nueva son obligatorias'));
      }

      if (newPassword.length < 6) {
        return next(AppError.badRequest('La nueva contraseña debe tener al menos 6 caracteres'));
      }

      const admin = await Admin.findById(req.admin._id).select('+password');
      const isValid = await admin.comparePassword(currentPassword);

      if (!isValid) {
        return next(AppError.unauthorized('Contraseña actual incorrecta'));
      }

      admin.password = newPassword;
      await admin.save();

      const token = generateToken(admin._id);

      ApiResponse.success(res, { token }, 'Contraseña actualizada exitosamente');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
