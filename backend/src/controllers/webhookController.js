// Controlador del webhook de WhatsApp (Twilio)
const conversationService = require('../services/conversationService');
const logger = require('../utils/logger');

class WebhookController {
  // POST /webhook — Recibir mensajes de WhatsApp
  async handleIncoming(req, res) {
    try {
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

      const textContent = messageBody || '';
      const hasInteraction = buttonPayload || listId;
      const hasMedia = parseInt(numMedia, 10) > 0;
      const mediaUrl = hasMedia ? mediaUrl0 : null;

      logger.info(`📩 Mensaje de ${from}: ${textContent}${buttonPayload ? ` [Botón: ${buttonPayload}]` : ''}${listId ? ` [Lista: ${listId}]` : ''}${mediaUrl ? ` [Media: ${mediaContentType0}]` : ''}`);

      if (!textContent && !hasInteraction && !hasMedia) {
        return res.status(200).send('<Response></Response>');
      }

      if (!from) {
        return res.status(200).send('<Response></Response>');
      }

      await conversationService.processMessage(from, textContent, buttonPayload || null, listId || null, mediaUrl);

      res.status(200).send('<Response></Response>');
    } catch (error) {
      logger.error('Error en webhook:', error);
      res.status(200).send('<Response></Response>');
    }
  }

  // GET /webhook — Verificación del webhook
  async verify(req, res) {
    res.status(200).json({
      success: true,
      message: 'Webhook de Fresanova activo 🍓',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new WebhookController();
