// Modelo de Cliente (usuario de WhatsApp)
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    // Número de WhatsApp (formato: whatsapp:+57XXXXXXXXXX)
    whatsappNumber: {
      type: String,
      required: [true, 'El número de WhatsApp es obligatorio'],
      unique: true,
      trim: true
    },
    // Número de teléfono limpio
    phone: {
      type: String,
      trim: true
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: [200, 'El nombre no puede exceder 200 caracteres']
    },
    neighborhood: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    addressReference: {
      type: String,
      trim: true
    },
    // Total de pedidos realizados
    totalOrders: {
      type: Number,
      default: 0
    },
    // Total gastado por el cliente
    totalSpent: {
      type: Number,
      default: 0
    },
    // Última interacción con el bot
    lastInteraction: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    },
    // Notas del admin sobre el cliente
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Relación virtual con pedidos
customerSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'customer'
});

customerSchema.index({ totalOrders: -1 });

module.exports = mongoose.model('Customer', customerSchema);
