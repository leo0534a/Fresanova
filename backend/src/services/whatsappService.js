const twilio = require('twilio');
const { config } = require('../config/env');
const logger = require('../utils/logger');

class WhatsAppService {
  constructor() {
    this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    this.fromNumber = config.twilio.whatsappNumber;
  }

  async sendMessage(to, body) {
    try {
      const message = await this.client.messages.create({
        from: this.fromNumber,
        to,
        body
      });
      logger.debug(`✅ Mensaje texto enviado a ${to}`);
      return message;
    } catch (error) {
      logger.error(`❌ Error enviando mensaje a ${to}:`, error.message);
      throw error;
    }
  }

  // Agregamos variables de contenido (contentVariables) por si tu menú requiere datos dinámicos
  async sendTemplate(to, contentSid, contentVariables = {}) {
    try {
      if (!contentSid) {
        logger.warn('⚠️ contentSid nulo, el bot intentará enviar texto plano');
        return null;
      }

      const messageOptions = {
        from: this.fromNumber,
        to,
        contentSid
      };

      // Si la plantilla de Twilio requiere variables, se las pasamos
      if (Object.keys(contentVariables).length > 0) {
        messageOptions.contentVariables = JSON.stringify(contentVariables);
      }

      const message = await this.client.messages.create(messageOptions);
      logger.debug(`✨ Template interactivo enviado a ${to}: ${contentSid}`);
      return message;
    } catch (error) {
      logger.error(`❌ Error enviando template a ${to}:`, error.message);
      throw error;
    }
  }

  async sendTextThenTemplate(to, text, contentSid, contentVariables = {}) {
    await this.sendMessage(to, text);
    if (contentSid) {
      return await this.sendTemplate(to, contentSid, contentVariables);
    }
  }

  async sendMediaMessage(to, body, mediaUrl) {
    try {
      const message = await this.client.messages.create({
        from: this.fromNumber,
        to,
        body,
        mediaUrl: [mediaUrl]
      });
      logger.debug(`🖼️ Mensaje con media enviado a ${to}`);
      return message;
    } catch (error) {
      logger.error('❌ Error enviando media:', error.message);
      return await this.sendMessage(to, body); // Fallback a solo texto si falla la imagen
    }
  }
}

module.exports = new WhatsAppService();