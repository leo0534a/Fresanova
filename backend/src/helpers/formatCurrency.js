// Formateador de moneda colombiana (COP)

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatNumber = (number) => {
  return new Intl.NumberFormat('es-CO').format(number);
};

module.exports = { formatCurrency, formatNumber };
