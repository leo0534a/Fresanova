// Utilidad para respuestas estandarizadas de la API

class ApiResponse {
  static success(res, data = null, message = 'Operación exitosa', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  static created(res, data = null, message = 'Recurso creado exitosamente') {
    return ApiResponse.success(res, data, message, 201);
  }

  static error(res, message = 'Error interno del servidor', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  static notFound(res, message = 'Recurso no encontrado') {
    return ApiResponse.error(res, message, 404);
  }

  static badRequest(res, message = 'Solicitud inválida', errors = null) {
    return ApiResponse.error(res, message, 400, errors);
  }

  static unauthorized(res, message = 'No autorizado') {
    return ApiResponse.error(res, message, 401);
  }

  static forbidden(res, message = 'Acceso denegado') {
    return ApiResponse.error(res, message, 403);
  }

  static paginated(res, data, pagination, message = 'Datos obtenidos exitosamente') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ApiResponse;
