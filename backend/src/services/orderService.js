// Servicio de gestión de pedidos
const { Order, Customer, Product } = require('../models');
const { generateOrderNumber } = require('../helpers/orderNumber');
const { formatCurrency } = require('../helpers/formatCurrency');
const { formatDateTime } = require('../helpers/dateHelper');
const { validateOrderData, validateStatusChange } = require('../validations/orderValidation');
const { config } = require('../config/env');
const AppError = require('../utils/appError');
const socketService = require('./socketService');
const logger = require('../utils/logger');

class OrderService {
  // Crear un nuevo pedido desde el carrito de la conversación
  async createOrderFromConversation(conversation) {
    try {
      // Obtener o crear cliente
      let customer = await Customer.findOne({
        whatsappNumber: conversation.whatsappNumber
      });

      if (!customer) {
        customer = await Customer.create({
          whatsappNumber: conversation.whatsappNumber,
          phone: conversation.tempCustomerData.phone,
          fullName: conversation.tempCustomerData.fullName,
          neighborhood: conversation.tempCustomerData.neighborhood,
          address: conversation.tempCustomerData.address,
          addressReference: conversation.tempCustomerData.addressReference
        });
      } else {
        // Actualizar datos del cliente
        customer.fullName = conversation.tempCustomerData.fullName;
        customer.neighborhood = conversation.tempCustomerData.neighborhood;
        customer.address = conversation.tempCustomerData.address;
        customer.addressReference = conversation.tempCustomerData.addressReference;
        customer.phone = conversation.tempCustomerData.phone;
        customer.lastInteraction = new Date();
        await customer.save();
      }

      // Calcular totales — precio de domicilio según barrio
      const subtotal = conversation.cart.reduce((sum, item) => sum + item.itemTotal, 0);
      const deliveryPrice = conversation.tempCustomerData.deliveryPrice || config.business.deliveryPrice;
      const total = subtotal + deliveryPrice;

      // Crear el pedido
      const order = await Order.create({
        orderNumber: generateOrderNumber(),
        customer: customer._id,
        customerInfo: {
          fullName: conversation.tempCustomerData.fullName,
          phone: conversation.tempCustomerData.phone,
          whatsappNumber: conversation.whatsappNumber,
          neighborhood: conversation.tempCustomerData.neighborhood,
          address: conversation.tempCustomerData.address,
          addressReference: conversation.tempCustomerData.addressReference
        },
        items: conversation.cart.map((item) => ({
          product: item.product,
          productName: item.productName,
          quantity: item.quantity || 1,
          basePrice: item.basePrice,
          selectedSize: item.selectedSize,
          selectedOption: item.selectedOption,
          selectedVariant: item.selectedVariant,
          toppings: item.toppings || [],
          sauces: item.sauces || [],
          comment: item.comment,
          itemTotal: item.itemTotal
        })),
        subtotal,
        deliveryPrice,
        total,
        paymentMethod: conversation.tempCustomerData.paymentMethod,
        transferProofUrl: conversation.tempCustomerData.transferProofUrl || null,
        transferConfirmed: conversation.tempCustomerData.paymentMethod === 'transferencia',
        transferConfirmedAt: conversation.tempCustomerData.paymentMethod === 'transferencia' ? new Date() : null,
        transferConfirmedBy: conversation.tempCustomerData.paymentMethod === 'transferencia' ? 'admin' : null,
        status: 'pendiente',
        statusHistory: [
          {
            status: 'pendiente',
            changedAt: new Date(),
            changedBy: 'sistema'
          }
        ]
      });

      // Actualizar estadísticas del cliente
      customer.totalOrders += 1;
      customer.totalSpent += total;
      await customer.save();

      // Actualizar contadores de ventas de productos
      for (const item of conversation.cart) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { salesCount: item.quantity || 1 }
        });
      }

      logger.info(`Pedido creado: ${order.orderNumber} para ${customer.fullName}`);

      return order;
    } catch (error) {
      logger.error('Error creando pedido:', error);
      throw error;
    }
  }

  // Generar factura en texto para WhatsApp
  formatOrderReceipt(order) {
    let receipt = '🧾✨ *FACTURA Fresanova* ✨🧾\n';
    receipt += '━━━━━━━━━━━━━━━━━━━━━\n\n';
    receipt += `📋 Pedido: *${order.orderNumber}*\n`;
    receipt += `📅 Fecha: ${formatDateTime(order.createdAt)}\n\n`;
    receipt += `👤 *Cliente:* ${order.customerInfo.fullName}\n`;
    if (order.customerInfo.neighborhood) {
      receipt += `🏘️ *Barrio:* ${order.customerInfo.neighborhood}\n`;
    }
    receipt += `📍 *Dirección:* ${order.customerInfo.address}\n`;
    if (order.customerInfo.addressReference) {
      receipt += `🏠 *Referencia:* ${order.customerInfo.addressReference}\n`;
    }
    receipt += `📱 *Teléfono:* ${order.customerInfo.phone}\n\n`;
    receipt += '━━━━━━━━━━━━━━━━━━━━━\n';
    receipt += '🛒 *PRODUCTOS:*\n\n';

    order.items.forEach((item, index) => {
      receipt += `${index + 1}. *${item.productName}*`;
      if (item.selectedSize && item.selectedSize.name) {
        receipt += ` (${item.selectedSize.name})`;
      }
      receipt += '\n';
      receipt += `   Base: ${formatCurrency(item.basePrice)}\n`;

      if (item.selectedOption && item.selectedOption.name) {
        receipt += `   Tipo: ${item.selectedOption.name}`;
        if (item.selectedOption.extraPrice > 0) {
          receipt += ` (+${formatCurrency(item.selectedOption.extraPrice)})`;
        }
        receipt += '\n';
      }

      if (item.selectedVariant && item.selectedVariant.name) {
        receipt += `   Variante: ${item.selectedVariant.name}`;
        if (item.selectedVariant.extraPrice > 0) {
          receipt += ` (+${formatCurrency(item.selectedVariant.extraPrice)})`;
        }
        receipt += '\n';
      }

      if (item.toppings && item.toppings.length > 0) {
        const toppingNames = item.toppings.map(
          (t) => `${t.name} (${formatCurrency(t.price)})`
        );
        receipt += `   🧁 Toppings: ${toppingNames.join(', ')}\n`;
      }

      if (item.sauces && item.sauces.length > 0) {
        const sauceNames = item.sauces.map(
          (s) => `${s.name} (${formatCurrency(s.price)})`
        );
        receipt += `   🍯 Salsas: ${sauceNames.join(', ')}\n`;
      }

      if (item.comment) {
        receipt += `   💬 Nota: ${item.comment}\n`;
      }

      receipt += `   💰 Subtotal item: ${formatCurrency(item.itemTotal)}\n\n`;
    });

    receipt += '━━━━━━━━━━━━━━━━━━━━━\n';
    receipt += `📦 Subtotal: ${formatCurrency(order.subtotal)}\n`;
    receipt += `🚗 Domicilio: ${formatCurrency(order.deliveryPrice)}\n`;
    receipt += `💵 *TOTAL: ${formatCurrency(order.total)}*\n\n`;
    receipt += `💳 Pago: *${order.paymentMethod === 'efectivo' ? 'Efectivo contra entrega' : 'Transferencia'}*\n\n`;
    receipt += '━━━━━━━━━━━━━━━━━━━━━\n';
    receipt += '✅ *Estado:* Pendiente de confirmación\n\n';
    receipt += '¡Gracias por tu pedido, corazón! 💖🍓\n';
    receipt += 'Te avisaremos cuando esté listo ✨';

    return receipt;
  }

  // Cambiar estado de un pedido
  async updateOrderStatus(orderId, newStatus, changedBy = 'admin') {
    const order = await Order.findById(orderId);
    if (!order) {
      throw AppError.notFound('Pedido no encontrado');
    }

    validateStatusChange(order.status, newStatus);

    order.status = newStatus;
    order.statusHistory.push({
      status: newStatus,
      changedAt: new Date(),
      changedBy
    });

    if (newStatus === 'entregado') {
      order.deliveredAt = new Date();
    }

    await order.save();

    // Emitir evento de actualización en tiempo real
    socketService.emitOrderStatusUpdate(order);

    logger.info(`Pedido ${order.orderNumber} actualizado a: ${newStatus}`);
    return order;
  }

  // Obtener mensaje de actualización de estado para WhatsApp
  getStatusUpdateMessage(order) {
    const statusMessages = {
      confirmado: `¡Hola ${order.customerInfo.fullName}! 🍓✨\n\nTu pedido *${order.orderNumber}* ha sido *confirmado*.\n\nYa estamos trabajando en él, corazón 💖`,
      preparando: `¡Hey ${order.customerInfo.fullName}! 👩‍🍳✨\n\nTu pedido *${order.orderNumber}* se está *preparando* con mucho amor 🍓\n\n¡Ya casi, mi vida!`,
      en_camino: `¡${order.customerInfo.fullName}! 🚗💨\n\nTu pedido *${order.orderNumber}* va *en camino*.\n\n¡Prepárate para disfrutar, bebé! 🍓✨`,
      entregado: `¡Listo, ${order.customerInfo.fullName}! 🎉🍓\n\nTu pedido *${order.orderNumber}* ha sido *entregado*.\n\n¡Esperamos que lo disfrutes mucho, corazón! 💖\n\n¿Te gustó? ¡Cuéntanos! ✨`,
      cancelado: `Hola ${order.customerInfo.fullName} 😔\n\nTu pedido *${order.orderNumber}* ha sido *cancelado*.\n\n${order.cancellationReason ? `Razón: ${order.cancellationReason}\n\n` : ''}Si necesitas algo, estamos aquí, mi amor 🍓`
    };

    return statusMessages[order.status] || `Tu pedido *${order.orderNumber}* ahora está en estado: *${order.status}*`;
  }

  // Buscar pedido por número
  async findByOrderNumber(orderNumber) {
    return Order.findOne({ orderNumber }).populate('customer');
  }

  // Buscar pedidos de un cliente por WhatsApp
  async findByWhatsApp(whatsappNumber) {
    return Order.find({ 'customerInfo.whatsappNumber': whatsappNumber })
      .sort('-createdAt')
      .limit(5);
  }

  // Obtener tracking de pedido formateado para WhatsApp
  formatOrderTracking(order) {
    const statusEmojis = {
      pendiente: '⏳',
      confirmado: '✅',
      preparando: '👩‍🍳',
      en_camino: '🚗',
      entregado: '🎉',
      cancelado: '❌'
    };

    const statusLabels = {
      pendiente: 'Pendiente',
      confirmado: 'Confirmado',
      preparando: 'Preparando',
      en_camino: 'En camino',
      entregado: 'Entregado',
      cancelado: 'Cancelado'
    };

    let tracking = `📦 *SEGUIMIENTO DE PEDIDO*\n`;
    tracking += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    tracking += `📋 Pedido: *${order.orderNumber}*\n`;
    tracking += `📅 Fecha: ${formatDateTime(order.createdAt)}\n`;
    tracking += `💵 Total: ${formatCurrency(order.total)}\n\n`;
    tracking += `Estado actual: ${statusEmojis[order.status]} *${statusLabels[order.status]}*\n\n`;

    // Mostrar barra de progreso visual
    const statusOrder = ['pendiente', 'confirmado', 'preparando', 'en_camino', 'entregado'];
    const currentIndex = statusOrder.indexOf(order.status);

    if (order.status !== 'cancelado') {
      tracking += 'Progreso:\n';
      statusOrder.forEach((status, index) => {
        const emoji = index <= currentIndex ? '🟢' : '⚪';
        tracking += `${emoji} ${statusLabels[status]}\n`;
      });
    }

    tracking += '\n¡Gracias por tu paciencia, corazón! 💖🍓';

    return tracking;
  }
}

module.exports = new OrderService();
