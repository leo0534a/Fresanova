// Modelo de Topping
const mongoose = require('mongoose');

const toppingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del topping es obligatorio'],
      trim: true,
      unique: true,
      maxlength: [100, 'El nombre no puede exceder 100 caracteres']
    },
    price: {
      type: Number,
      required: [true, 'El precio del topping es obligatorio'],
      min: [0, 'El precio no puede ser negativo']
    },
    // Grupo de precio para mostrar organizadamente
    priceGroup: {
      type: String,
      enum: ['3000', '4000', '5000', '7000'],
      required: true
    },
    image: {
      type: String,
      default: 'https://via.placeholder.com/200x200?text=Topping'
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

toppingSchema.index({ isActive: 1, priceGroup: 1 });

module.exports = mongoose.model('Topping', toppingSchema);
