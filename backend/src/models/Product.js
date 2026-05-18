// Modelo de Producto
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del producto es obligatorio'],
      trim: true,
      maxlength: [150, 'El nombre no puede exceder 150 caracteres']
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'La descripción no puede exceder 1000 caracteres']
    },
    basePrice: {
      type: Number,
      required: [true, 'El precio base es obligatorio'],
      min: [0, 'El precio no puede ser negativo']
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'La categoría es obligatoria']
    },
    image: {
      type: String,
      default: 'https://via.placeholder.com/400x300?text=Fresata+Producto'
    },
    // Indica si el producto permite agregar toppings
    allowsToppings: {
      type: Boolean,
      default: false
    },
    // Indica si el producto permite agregar salsas
    allowsSauces: {
      type: Boolean,
      default: false
    },
    // Toppings incluidos en el precio base
    includedToppings: {
      type: Number,
      default: 0
    },
    // Salsas incluidas en el precio base
    includedSauces: {
      type: Number,
      default: 0
    },
    // Nota sobre lo que incluye (ej: "Incluye arequipe o leche condensada")
    includesNote: {
      type: String,
      trim: true
    },
    // Opciones especiales del producto (ej: chocolate negro, blanco, combinado)
    options: [
      {
        name: { type: String, trim: true },
        extraPrice: { type: Number, default: 0 }
      }
    ],
    // Variantes del producto (ej: Pink Limonada con soda +2000)
    variants: [
      {
        name: { type: String, trim: true },
        extraPrice: { type: Number, default: 0 }
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    displayOrder: {
      type: Number,
      default: 0
    },
    // Contador de ventas para estadísticas
    salesCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Generar slug automáticamente
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Índices para búsquedas frecuentes
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ salesCount: -1 });

module.exports = mongoose.model('Product', productSchema);
