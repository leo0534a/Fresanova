// Validaciones para pedidos
const AppError = require('../utils/appError');

const validateOrderData = (data) => {
  const errors = [];

  if (!data.customerInfo) {
    errors.push('La información del cliente es obligatoria');
  } else {
    if (!data.customerInfo.fullName || data.customerInfo.fullName.trim().length < 2) {
      errors.push('El nombre completo es obligatorio (mínimo 2 caracteres)');
    }
    if (!data.customerInfo.address || data.customerInfo.address.trim().length < 5) {
      errors.push('La dirección es obligatoria (mínimo 5 caracteres)');
    }
    if (!data.customerInfo.phone || data.customerInfo.phone.trim().length < 7) {
      errors.push('El teléfono es obligatorio (mínimo 7 dígitos)');
    }
  }

  if (!data.items || data.items.length === 0) {
    errors.push('El pedido debe tener al menos un producto');
  }

  if (!data.paymentMethod || !['efectivo', 'transferencia'].includes(data.paymentMethod)) {
    errors.push('Método de pago inválido. Opciones: efectivo, transferencia');
  }

  if (errors.length > 0) {
    throw AppError.badRequest(errors.join('. '));
  }

  return true;
};

const validateStatusChange = (currentStatus, newStatus) => {
  const validTransitions = {
    pendiente: ['confirmado', 'cancelado'],
    confirmado: ['preparando', 'cancelado'],
    preparando: ['en_camino', 'cancelado'],
    en_camino: ['entregado', 'cancelado'],
    entregado: [],
    cancelado: []
  };

  const allowed = validTransitions[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    throw AppError.badRequest(
      `No se puede cambiar de "${currentStatus}" a "${newStatus}". Transiciones permitidas: ${allowed.join(', ') || 'ninguna'}`
    );
  }

  return true;
};

module.exports = { validateOrderData, validateStatusChange };
