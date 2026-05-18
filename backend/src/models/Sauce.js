// Modelo de Salsa
const mongoose = require('mongoose');

const sauceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la salsa es obligatorio'],
      trim: true,
      unique: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    price: {
      type: Number,
      required: [true, 'El precio de la salsa es obligatorio'],
      min: [0, 'El precio no puede ser negativo']
    },
    image: {
      type: String,
      default: 'https://via.placeholder.com/200x200?text=Salsa'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    displayOrder: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Sauce', sauceSchema);
