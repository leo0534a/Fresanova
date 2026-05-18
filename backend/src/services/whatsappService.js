// Servicio de WhatsApp con Twilio — Mensajes de texto e interactivos
const twilio = require('twilio');
const { config } = require('../config/env');
const logger = require('../utils/logger');

class WhatsAppService {
  constructor() {
    this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    this.fromNumber = config.twilio.whatsappNumber;
  }

  // Enviar mensaje de texto simple
  async sendMessage(to, body) {
    try {
      const message = await this.client.messages.create({
        from: this.fromNumber,
        to,
        body
      });
      logger.debug(`Mensaje texto enviado a ${to}`);
      return message;
    } catch (error) {
      logger.error(`Error enviando mensaje a ${to}:`, error.message);
      throw error;
    }
  }

  // Enviar mensaje interactivo usando Content Template (botones o listas)
  async sendTemplate(to, contentSid) {
    try {
      if (!contentSid) {
        logger.warn('contentSid nulo, no se puede enviar template');
        return null;
      }

      const message = await this.client.messages.create({
        from: this.fromNumber,
        to,
        contentSid
      });
      logger.debug(`Template interactivo enviado a ${to}: ${contentSid}`);
      return message;
    } catch (error) {
      logger.error(`Error enviando template a ${to}:`, error.message);
      throw error;
    }
  }

  // Enviar texto + template interactivo (dos mensajes)
  async sendTextThenTemplate(to, text, contentSid) {
    await this.sendMessage(to, text);
    if (contentSid) {
      return await this.sendTemplate(to, contentSid);
    }
  }

  // Enviar mensaje con imagen
  async sendMediaMessage(to, body, mediaUrl) {
    try {
      const message = await this.client.messages.create({
        from: this.fromNumber,
        to,
        body,
        mediaUrl: [mediaUrl]
      });
      logger.debug(`Mensaje con media enviado a ${to}`);
      return message;
    } catch (error) {
      logger.error('Error enviando media:', error.message);
      return await this.sendMessage(to, body);
    }
  }
}

module.exports = new WhatsAppService();
