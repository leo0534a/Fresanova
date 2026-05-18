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
        ListId: listId
      } = req.body;

      // Determinar el contenido del mensaje (texto o acción interactiva)
      const textContent = messageBody || '';
      const hasInteraction = buttonPayload || listId;

      logger.info(`📩 Mensaje de ${from}: ${textContent}${buttonPayload ? ` [Botón: ${buttonPayload}]` : ''}${listId ? ` [Lista: ${listId}]` : ''}`);

      // Si no hay texto ni interacción, ignorar
      if (!textContent && !hasInteraction) {
        return res.status(200).send('<Response></Response>');
      }

      if (!from) {
        return res.status(200).send('<Response></Response>');
      }

      // Procesar mensaje con soporte para botones y listas interactivas
      await conversationService.processMessage(from, textContent, buttonPayload || null, listId || null);

      // Responder a Twilio con 200 vacío (los mensajes se envían por API desde el servicio)
      res.status(200).send('<Response></Response>');
    } catch (error) {
      logger.error('Error en webhook:', error);
      // Siempre responder 200 a Twilio para evitar reintentos
      res.status(200).send('<Response></Response>');
    }
  }

  // GET /webhook — Verificación del webhook
  async verify(req, res) {
    res.status(200).json({
      success: true,
      message: 'Webhook de Fresata activo 🍓',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new WebhookController();
