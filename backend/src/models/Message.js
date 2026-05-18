// Modelo de Mensaje (registro de mensajes WhatsApp)
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true
    },
    whatsappNumber: {
      type: String,
      required: true
    },
    // Dirección del mensaje
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true
    },
    // Contenido del mensaje
    body: {
      type: String,
      required: true
    },
    // Tipo de mensaje
    messageType: {
      type: String,
      enum: ['text', 'interactive', 'image', 'template'],
      default: 'text'
    },
    // SID del mensaje de Twilio
    twilioMessageSid: String,
    // Estado del mensaje
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ whatsappNumber: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
