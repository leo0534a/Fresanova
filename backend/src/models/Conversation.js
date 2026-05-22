// Modelo de Conversación (contexto del chat de WhatsApp)
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    whatsappNumber: {
      type: String,
      required: true,
      index: true
    },
    // Estado actual de la conversación
    state: {
      type: String,
      enum: [
        'idle',
        'selecting_category',
        'selecting_product',
        'selecting_option',
        'selecting_variant',
        'asking_toppings',
        'typing_topping',
        'another_topping',
        'asking_sauce',
        'selecting_sauce',
        'asking_comment',
        'typing_comment',
        'confirming_item',
        'adding_more',
        'entering_name',
        'entering_neighborhood',
        'entering_address',
        'asking_reference',
        'typing_reference',
        'entering_phone',
        'selecting_payment',
        'confirming_order',
        'selecting_size',
        'using_existing_data',
        'tracking_order',
        'changing_topping',
        'awaiting_transfer_proof',
        'awaiting_transfer_confirmation',
        'editing_order',
        'editing_item',
        'live_chat',
        'free_chat'
      ],
      default: 'idle'
    },
    // Carrito temporal del usuario
    cart: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        productName: String,
        basePrice: Number,
        selectedSize: { name: String, price: Number },
        selectedOption: { name: String, extraPrice: Number },
        selectedVariant: { name: String, extraPrice: Number },
        toppings: [{ topping: mongoose.Schema.Types.ObjectId, name: String, price: Number }],
        sauces: [{ sauce: mongoose.Schema.Types.ObjectId, name: String, price: Number }],
        comment: String,
        quantity: { type: Number, default: 1 },
        itemTotal: Number
      }
    ],
    // Datos temporales del cliente durante el flujo
    tempCustomerData: {
      fullName: String,
      neighborhood: String,
      deliveryPrice: Number,
      address: String,
      addressReference: String,
      phone: String,
      paymentMethod: String,
      transferProofUrl: String
    },
    // Item en proceso de configuración
    currentItem: {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      productName: String,
      basePrice: Number,
      selectedSize: { name: String, price: Number },
      selectedOption: { name: String, extraPrice: Number },
      selectedVariant: { name: String, extraPrice: Number },
      toppings: [{ topping: mongoose.Schema.Types.ObjectId, name: String, price: Number }],
      sauces: [{ sauce: mongoose.Schema.Types.ObjectId, name: String, price: Number }],
      comment: String,
      quantity: { type: Number, default: 1 },
      itemTotal: Number
    },
    // Categoría seleccionada actualmente
    selectedCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    },
    // Historial de mensajes para contexto de IA (últimos N mensajes)
    messageHistory: [
      {
        role: { type: String, enum: ['user', 'assistant'] },
        content: String,
        timestamp: { type: Date, default: Date.now }
      }
    ],
    // Toppings incluidos restantes (para productos que incluyen toppings gratis)
    remainingIncludedToppings: {
      type: Number,
      default: 0
    },
    remainingIncludedSauces: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Limpiar conversaciones inactivas (más de 2 horas)
conversationSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 7200 });

module.exports = mongoose.model('Conversation', conversationSchema);
