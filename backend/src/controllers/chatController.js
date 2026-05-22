// Controlador del chat en vivo y confirmación de transferencias
const { Conversation, Message, Order } = require('../models');
const whatsappService = require('../services/whatsappService');
const conversationService = require('../services/conversationService');
const socketService = require('../services/socketService');
const logger = require('../utils/logger');

class ChatController {
  // GET /api/chat/conversations — Listar conversaciones activas en live_chat
  async getActiveChats(req, res) {
    try {
      const conversations = await Conversation.find({
        state: 'live_chat',
        isActive: true
      })
        .populate('customer', 'fullName whatsappNumber phone')
        .sort('-lastActivity');

      res.json({
        success: true,
        data: conversations.map((conv) => ({
          _id: conv._id,
          whatsappNumber: conv.whatsappNumber,
          customerName: conv.customer?.fullName || 'Sin nombre',
          phone: conv.customer?.phone || conv.whatsappNumber,
          lastActivity: conv.lastActivity
        }))
      });
    } catch (error) {
      logger.error('Error obteniendo chats activos:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  }

  // GET /api/chat/:whatsappNumber/messages — Historial de mensajes
  async getMessages(req, res) {
    try {
      const { whatsappNumber } = req.params;
      const formattedNumber = whatsappNumber.startsWith('whatsapp:')
        ? whatsappNumber
        : `whatsapp:${whatsappNumber}`;

      const messages = await Message.find({ whatsappNumber: formattedNumber })
        .sort('-createdAt')
        .limit(50);

      res.json({
        success: true,
        data: messages.reverse()
      });
    } catch (error) {
      logger.error('Error obteniendo mensajes:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  }

  // POST /api/chat/send — Admin envía mensaje al cliente
  async sendMessage(req, res) {
    try {
      const { whatsappNumber, message } = req.body;

      if (!whatsappNumber || !message) {
        return res.status(400).json({ success: false, message: 'whatsappNumber y message son requeridos' });
      }

      const formattedNumber = whatsappNumber.startsWith('whatsapp:')
        ? whatsappNumber
        : `whatsapp:${whatsappNumber}`;

      await whatsappService.sendMessage(formattedNumber, message);

      // Guardar mensaje en BD
      const conversation = await Conversation.findOne({ whatsappNumber: formattedNumber, isActive: true });
      if (conversation) {
        await Message.create({
          conversation: conversation._id,
          whatsappNumber: formattedNumber,
          direction: 'outbound',
          body: message
        });
      }

      // Emitir via Socket.IO
      socketService.emitLiveChatMessage({
        whatsappNumber: formattedNumber,
        message,
        direction: 'outbound',
        timestamp: new Date(),
        sentBy: 'admin'
      });

      res.json({ success: true, message: 'Mensaje enviado' });
    } catch (error) {
      logger.error('Error enviando mensaje desde admin:', error);
      res.status(500).json({ success: false, message: 'Error enviando mensaje' });
    }
  }

  // POST /api/orders/:id/confirm-transfer — Confirmar transferencia
  async confirmTransfer(req, res) {
    try {
      const { id } = req.params;

      // Buscar la conversación por el número del cliente
      const order = await Order.findById(id);
      if (order) {
        // Si ya hay una orden, solo actualizar el campo
        order.transferConfirmed = true;
        order.transferConfirmedAt = new Date();
        order.transferConfirmedBy = 'admin';
        await order.save();

        socketService.emitTransferConfirmed(id);
        return res.json({ success: true, message: 'Transferencia confirmada en el pedido' });
      }

      // Si no hay orden aún, buscar conversación pendiente
      const conversation = await Conversation.findOne({
        state: 'awaiting_transfer_confirmation',
        isActive: true
      }).sort('-lastActivity');

      if (!conversation) {
        return res.status(404).json({ success: false, message: 'No se encontró conversación pendiente de transferencia' });
      }

      const confirmed = await conversationService.confirmTransfer(conversation.whatsappNumber);

      if (!confirmed) {
        return res.status(400).json({ success: false, message: 'No se pudo confirmar la transferencia' });
      }

      socketService.emitTransferConfirmed(id);
      res.json({ success: true, message: 'Transferencia confirmada y cliente notificado' });
    } catch (error) {
      logger.error('Error confirmando transferencia:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  }

  // GET /api/chat/pending-transfers — Transferencias pendientes de confirmación
  async getPendingTransfers(req, res) {
    try {
      const conversations = await Conversation.find({
        state: 'awaiting_transfer_confirmation',
        isActive: true
      })
        .populate('customer', 'fullName whatsappNumber phone')
        .sort('-lastActivity');

      res.json({
        success: true,
        data: conversations.map((conv) => ({
          _id: conv._id,
          whatsappNumber: conv.whatsappNumber,
          customerName: conv.customer?.fullName || conv.tempCustomerData?.fullName || 'Sin nombre',
          phone: conv.customer?.phone || conv.whatsappNumber,
          transferProofUrl: conv.tempCustomerData?.transferProofUrl,
          lastActivity: conv.lastActivity
        }))
      });
    } catch (error) {
      logger.error('Error obteniendo transferencias pendientes:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  }

  // POST /api/chat/confirm-transfer-by-phone — Confirmar transferencia por número
  async confirmTransferByPhone(req, res) {
    try {
      const { whatsappNumber } = req.body;

      if (!whatsappNumber) {
        return res.status(400).json({ success: false, message: 'whatsappNumber es requerido' });
      }

      const formattedNumber = whatsappNumber.startsWith('whatsapp:')
        ? whatsappNumber
        : `whatsapp:${whatsappNumber}`;

      const confirmed = await conversationService.confirmTransfer(formattedNumber);

      if (!confirmed) {
        return res.status(400).json({ success: false, message: 'No se encontró transferencia pendiente para este número' });
      }

      socketService.emitTransferConfirmed(formattedNumber);
      res.json({ success: true, message: 'Transferencia confirmada y cliente notificado' });
    } catch (error) {
      logger.error('Error confirmando transferencia por teléfono:', error);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  }
}

module.exports = new ChatController();
