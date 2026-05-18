// Clase personalizada para manejo de errores de la aplicación

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Solicitud inválida') {
    return new AppError(message, 400);
  }

  static unauthorized(message = 'No autorizado') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'Acceso denegado') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Recurso no encontrado') {
    return new AppError(message, 404);
  }

  static conflict(message = 'Conflicto con el estado actual') {
    return new AppError(message, 409);
  }

  static internal(message = 'Error interno del servidor') {
    return new AppError(message, 500);
  }
}

module.exports = AppError;
