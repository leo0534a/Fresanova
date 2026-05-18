// Validaciones para productos
const AppError = require('../utils/appError');

const validateProductData = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('El nombre del producto es obligatorio (mínimo 2 caracteres)');
  }

  if (data.basePrice === undefined || data.basePrice === null || data.basePrice < 0) {
    errors.push('El precio base es obligatorio y no puede ser negativo');
  }

  if (!data.category) {
    errors.push('La categoría es obligatoria');
  }

  if (errors.length > 0) {
    throw AppError.badRequest(errors.join('. '));
  }

  return true;
};

const validateCategoryData = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('El nombre de la categoría es obligatorio (mínimo 2 caracteres)');
  }

  if (errors.length > 0) {
    throw AppError.badRequest(errors.join('. '));
  }

  return true;
};

const validateToppingData = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length < 2) {
    errors.push('El nombre del topping es obligatorio');
  }

  if (data.price === undefined || data.price < 0) {
    errors.push('El precio es obligatorio y no puede ser negativo');
  }

  if (errors.length > 0) {
    throw AppError.badRequest(errors.join('. '));
  }

  return true;
};

module.exports = { validateProductData, validateCategoryData, validateToppingData };
