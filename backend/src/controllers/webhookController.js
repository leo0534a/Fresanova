const conversationService = require('../services/conversationService');
const logger = require('../utils/logger');

class WebhookController {
  async handleIncoming(req, res) {
    try {
      // Capturamos todos los campos que envía Twilio
      const {
        Body: messageBody,
        From: from,
        To: to,
        MessageSid: messageSid,
        ButtonPayload: buttonPayload,
        ListId: listId,
        NumMedia: numMedia,
        MediaUrl0: mediaUrl0,
        MediaContentType0: mediaContentType0
      } = req.body;

      const textContent = messageBody ? messageBody.trim() : '';
      const hasMedia = parseInt(numMedia, 10) > 0;
      const mediaUrl = hasMedia ? mediaUrl0 : null;

      logger.info(`📩 Mensaje de ${from}: Texto="${textContent}" | Botón="${buttonPayload || 'Ninguno'}" | Lista="${listId || 'Ninguna'}"`);

      // Evitamos procesar webhooks vacíos sin interacción ni texto
      if (!textContent && !buttonPayload && !listId && !hasMedia) {
        return res.status(200).send('<Response></Response>');
      }

      if (!from) {
        return res.status(200).send('<Response></Response>');
      }

      // ALINEACIÓN CORRECTA: Pasamos los 5 parámetros tal y como los espera tu conversationService
      await conversationService.processMessage(
        from, 
        textContent, 
        buttonPayload || null, 
        listId || null, 
        mediaUrl
      );

      res.status(200).send('<Response></Response>');
    } catch (error) {
      logger.error('❌ Error crítico en webhook:', error);
      res.status(200).send('<Response></Response>');
    }
  }

  async verify(req, res) {
    res.status(200).json({
      success: true,
      message: 'Webhook de Fresanova activo 🍓',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new WebhookController();