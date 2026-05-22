// Servicio de Socket.IO para comunicación en tiempo real
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const logger = require('../utils/logger');

class SocketService {
  constructor() {
    this.io = null;
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: config.allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    // Middleware de autenticación JWT
    this.io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Token de autenticación requerido'));
      }
      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        socket.adminId = decoded.id;
        next();
      } catch {
        return next(new Error('Token inválido'));
      }
    });

    this.io.on('connection', (socket) => {
      logger.info(`🔌 Admin conectado via Socket.IO: ${socket.adminId}`);

      socket.on('disconnect', () => {
        logger.info(`🔌 Admin desconectado: ${socket.adminId}`);
      });
    });

    logger.info('✅ Socket.IO inicializado');
  }

  emitNewOrder(order) {
    if (this.io) {
      this.io.emit('new_order', order);
      logger.debug(`📡 Evento new_order emitido: ${order.orderNumber}`);
    }
  }

  emitOrderStatusUpdate(order) {
    if (this.io) {
      this.io.emit('order_status_update', order);
      logger.debug(`📡 Evento order_status_update: ${order.orderNumber} → ${order.status}`);
    }
  }

  emitTransferPending(data) {
    if (this.io) {
      this.io.emit('transfer_pending', data);
      logger.debug(`📡 Evento transfer_pending: ${data.whatsappNumber}`);
    }
  }

  emitTransferConfirmed(orderId) {
    if (this.io) {
      this.io.emit('transfer_confirmed', { orderId });
      logger.debug(`📡 Evento transfer_confirmed: ${orderId}`);
    }
  }

  emitLiveChatMessage(data) {
    if (this.io) {
      this.io.emit('live_chat_message', data);
      logger.debug(`📡 Evento live_chat_message: ${data.whatsappNumber}`);
    }
  }
}

module.exports = new SocketService();
