// Exportación centralizada de todos los modelos
const Admin = require('./Admin');
const Category = require('./Category');
const Conversation = require('./Conversation');
const Customer = require('./Customer');
const Message = require('./Message');
const Order = require('./Order');
const Product = require('./Product');
const Sauce = require('./Sauce');
const Topping = require('./Topping');

module.exports = {
  Admin,
  Category,
  Conversation,
  Customer,
  Message,
  Order,
  Product,
  Sauce,
  Topping
};
