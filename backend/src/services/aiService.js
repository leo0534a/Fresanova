// Servicio de IA con DeepSeek para respuestas conversacionales
const axios = require('axios');
const { config } = require('../config/env');
const { getSystemPrompt } = require('../prompts/systemPrompt');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.client = axios.create({
      baseURL: config.deepseek.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.deepseek.apiKey}`
      },
      timeout: 30000
    });
  }

  // Generar respuesta de IA basada en contexto de conversación
  async generateResponse(userMessage, conversationHistory = [], catalogInfo = '') {
    try {
      const systemPrompt = getSystemPrompt(catalogInfo);

      // Construir historial de mensajes para la IA
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      // Agregar historial de conversación (últimos 10 mensajes para contexto)
      const recentHistory = conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }

      // Agregar mensaje actual del usuario
      messages.push({ role: 'user', content: userMessage });

      const response = await this.client.post('/chat/completions', {
        model: config.deepseek.model,
        messages,
        max_tokens: 300,
        temperature: 0.8,
        top_p: 0.9
      });

      const aiResponse = response.data.choices[0].message.content.trim();
      logger.debug(`IA respondió: ${aiResponse.substring(0, 100)}...`);

      return aiResponse;
    } catch (error) {
      logger.error('Error en servicio de IA:', error.message);

      // Respuesta de fallback si la IA falla
      return 'Hola mi amor 🍓 Disculpa, estoy teniendo un momentito técnico. ¿Puedo ayudarte en algo? Escribe "menú" para ver nuestras delicias ✨';
    }
  }

  // Detectar intención del usuario
  async detectIntent(message) {
    const lowerMessage = message.toLowerCase().trim();

    // Detección simple de intención por palabras clave
    if (this.matchesPattern(lowerMessage, ['hola', 'hey', 'buenas', 'buenos', 'hi', 'ola', 'saludos', 'qué tal', 'como estas'])) {
      return 'greeting';
    }

    if (this.matchesPattern(lowerMessage, ['menú', 'menu', 'carta', 'productos', 'que tienen', 'qué tienen', 'que venden', 'opciones'])) {
      return 'view_menu';
    }

    if (this.matchesPattern(lowerMessage, ['pedir', 'quiero', 'ordenar', 'pedido', 'comprar', 'antoja', 'dame'])) {
      return 'place_order';
    }

    if (this.matchesPattern(lowerMessage, ['rastrear', 'seguir', 'tracking', 'estado', 'mi pedido', 'donde va', 'dónde va'])) {
      return 'track_order';
    }

    if (this.matchesPattern(lowerMessage, ['precio', 'cuesta', 'vale', 'cuanto', 'cuánto', 'valor'])) {
      return 'ask_price';
    }

    if (this.matchesPattern(lowerMessage, ['horario', 'hora', 'abierto', 'abiertos', 'cierran', 'abren'])) {
      return 'ask_hours';
    }

    if (this.matchesPattern(lowerMessage, ['domicilio', 'envío', 'delivery', 'envio', 'llevan'])) {
      return 'ask_delivery';
    }

    if (this.matchesPattern(lowerMessage, ['pago', 'pagar', 'transferencia', 'efectivo', 'nequi', 'daviplata'])) {
      return 'ask_payment';
    }

    if (this.matchesPattern(lowerMessage, ['soporte', 'ayuda', 'humano', 'persona', 'queja', 'reclamo', 'problema'])) {
      return 'support';
    }

    if (this.matchesPattern(lowerMessage, ['gracias', 'thanks', 'listo', 'perfecto', 'genial', 'ok'])) {
      return 'thanks';
    }

    if (this.matchesPattern(lowerMessage, ['cancelar', 'anular', 'no quiero'])) {
      return 'cancel';
    }

    // Si no se detecta intención específica, usar IA
    return 'free_chat';
  }

  // Verificar si el mensaje coincide con algún patrón
  matchesPattern(message, patterns) {
    return patterns.some((pattern) => message.includes(pattern));
  }
}

module.exports = new AIService();
