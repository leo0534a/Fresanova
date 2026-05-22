// Servicio de domicilios — Búsqueda de barrios y tarifas
const { DeliveryZone } = require('../models');
const { formatCurrency } = require('../helpers/formatCurrency');
const logger = require('../utils/logger');

class DeliveryService {
  // Buscar barrio por nombre (fuzzy) y devolver el precio de domicilio
  async findNeighborhoodPrice(neighborhoodName) {
    try {
      const normalizedInput = neighborhoodName
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');

      const zones = await DeliveryZone.find({ isActive: true });

      for (const zone of zones) {
        for (const neighborhood of zone.neighborhoods) {
          if (!neighborhood.isActive) continue;

          const normalizedName = neighborhood.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '');

          if (normalizedName === normalizedInput || normalizedInput.includes(normalizedName) || normalizedName.includes(normalizedInput)) {
            return {
              neighborhood: neighborhood.name,
              zone: zone.zoneName,
              price: neighborhood.price
            };
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('Error buscando barrio:', error);
      return null;
    }
  }

  // Obtener lista formateada de barrios y precios para WhatsApp
  async getDeliveryInfoForWhatsApp() {
    try {
      const zones = await DeliveryZone.find({ isActive: true }).sort('displayOrder');

      let info = '🚗 *TARIFAS DE DOMICILIO* 🚗\n';
      info += '━━━━━━━━━━━━━━━━━━━━━\n\n';

      for (const zone of zones) {
        info += `📍 *${zone.zoneName}*\n`;
        const activeNeighborhoods = zone.neighborhoods.filter((n) => n.isActive);

        const grouped = {};
        for (const n of activeNeighborhoods) {
          if (!grouped[n.price]) grouped[n.price] = [];
          grouped[n.price].push(n.name);
        }

        for (const [price, names] of Object.entries(grouped)) {
          info += `  ${formatCurrency(Number(price))}: ${names.join(', ')}\n`;
        }
        info += '\n';
      }

      return info;
    } catch (error) {
      logger.error('Error obteniendo info de domicilios:', error);
      return 'No pudimos cargar las tarifas de domicilio en este momento.';
    }
  }

  // Obtener todos los nombres de barrios para contexto de la IA
  async getNeighborhoodListForAI() {
    try {
      const zones = await DeliveryZone.find({ isActive: true }).sort('displayOrder');
      let list = '';

      for (const zone of zones) {
        const activeNeighborhoods = zone.neighborhoods.filter((n) => n.isActive);
        for (const n of activeNeighborhoods) {
          list += `- ${n.name}: ${formatCurrency(n.price)}\n`;
        }
      }

      return list;
    } catch (error) {
      logger.error('Error obteniendo lista de barrios para IA:', error);
      return '';
    }
  }
}

module.exports = new DeliveryService();
