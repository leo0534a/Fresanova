// Modelo de Pedido
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productName: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'La cantidad mínima es 1'],
      default: 1
    },
    basePrice: {
      type: Number,
      required: true
    },
    // Opción seleccionada (ej: chocolate negro)
    selectedOption: {
      name: String,
      extraPrice: { type: Number, default: 0 }
    },
    // Variante seleccionada (ej: con soda)
    selectedVariant: {
      name: String,
      extraPrice: { type: Number, default: 0 }
    },
    // Toppings seleccionados
    toppings: [
      {
        topping: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Topping'
        },
        name: String,
        price: Number
      }
    ],
    // Salsas seleccionadas
    sauces: [
      {
        sauce: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Sauce'
        },
        name: String,
        price: Number
      }
    ],
    // Comentario opcional del item
    comment: {
      type: String,
      trim: true
    },
    // Precio total del item (base + toppings + salsas + opciones)
    itemTotal: {
      type: Number,
      required: true
    }
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    // Datos del cliente al momento del pedido (snapshot)
    customerInfo: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      whatsappNumber: { type: String, required: true },
      address: { type: String, required: true },
      addressReference: String
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: 'El pedido debe tener al menos un producto'
      }
    },
    // Subtotal (suma de items)
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    // Costo de domicilio
    deliveryPrice: {
      type: Number,
      required: true,
      default: 10000
    },
    // Total final
    total: {
      type: Number,
      required: true,
      min: 0
    },
    // Método de pago
    paymentMethod: {
      type: String,
      required: [true, 'El método de pago es obligatorio'],
      enum: {
        values: ['efectivo', 'transferencia'],
        message: 'Método de pago inválido. Opciones: efectivo, transferencia'
      }
    },
    // Estado del pedido
    status: {
      type: String,
      enum: [
        'pendiente',
        'confirmado',
        'preparando',
        'en_camino',
        'entregado',
        'cancelado'
      ],
      default: 'pendiente'
    },
    // Historial de cambios de estado
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: String
      }
    ],
    // Comentario general del pedido
    generalComment: {
      type: String,
      trim: true
    },
    // Razón de cancelación
    cancellationReason: {
      type: String,
      trim: true
    },
    // Fecha estimada de entrega
    estimatedDelivery: Date,
    // Fecha real de entrega
    deliveredAt: Date
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Índices para consultas frecuentes
orderSchema.index({ customer: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customerInfo.whatsappNumber': 1 });

module.exports = mongoose.model('Order', orderSchema);
