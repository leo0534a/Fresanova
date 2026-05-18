// Generador de números de pedido únicos

const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 9000 + 1000);

  return `FR-${year}${month}${day}-${random}`;
};

module.exports = { generateOrderNumber };
