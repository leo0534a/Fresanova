// Servicio de Content Templates de Twilio para mensajes interactivos de WhatsApp
const twilio = require('twilio');
const { config } = require('../config/env');
const { Category, Product, Topping, Sauce } = require('../models');
const { formatCurrency } = require('../helpers/formatCurrency');
const logger = require('../utils/logger');

class ContentTemplateService {
  constructor() {
    this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    this.templates = {};
    this.initialized = false;
  }

  // Crear un template de botones rápidos (máximo 3 botones)
  async createQuickReply(friendlyName, body, actions) {
    try {
      const content = await this.client.content.v1.contents.create({
        friendlyName: `Fresanova_${friendlyName}_${Date.now()}`,
        language: 'es',
        variables: {},
        types: {
          'twilio/quick-reply': {
            body,
            actions: actions.map((a) => ({ title: a.title, id: a.id }))
          }
        }
      });
      logger.debug(`Template creado: ${friendlyName} -> ${content.sid}`);
      return content.sid;
    } catch (error) {
      logger.error(`Error creando template ${friendlyName}:`, error.message);
      return null;
    }
  }

  // Crear un template de lista seleccionable (máximo 10 items)
  async createListPicker(friendlyName, body, buttonText, items) {
    try {
      const content = await this.client.content.v1.contents.create({
        friendlyName: `Fresanova_${friendlyName}_${Date.now()}`,
        language: 'es',
        variables: {},
        types: {
          'twilio/list-picker': {
            body,
            button: buttonText,
            items: items.map((item) => ({
              id: item.id,
              item: (item.title || '').substring(0, 24),
              description: (item.description || '').substring(0, 72)
            }))
          }
        }
      });
      logger.debug(`Template lista creado: ${friendlyName} -> ${content.sid}`);
      return content.sid;
    } catch (error) {
      logger.error(`Error creando template lista ${friendlyName}:`, error.message);
      return null;
    }
  }

  // Inicializar todos los templates estáticos al arrancar el servidor
  async initialize() {
    try {
      logger.info('📋 Inicializando Content Templates de Twilio...');

      // ===== TEMPLATES ESTÁTICOS =====

      // Menú principal (3 botones)
      this.templates.mainMenu = await this.createQuickReply(
        'main_menu',
        '¡Hola mi amor! 🍓✨ Bienvenido a Fresa Nova, ¿qué deseas hacer?',
        [
          { title: '🍓 Ver Menú', id: 'menu' },
          { title: '📦 Mi Pedido', id: 'track' },
          { title: '💬 Soporte', id: 'support' }
        ]
      );

      // Confirmación de item
      this.templates.confirmItem = await this.createQuickReply(
        'confirm_item',
        '¿Confirmamos este producto para tu pedido?',
        [
          { title: '✅ Confirmar', id: 'confirm' },
          { title: '❌ Cancelar', id: 'cancel' }
        ]
      );

      // Agregar más o finalizar
      this.templates.addMoreOrFinish = await this.createQuickReply(
        'add_more_finish',
        '¿Qué hacemos ahora, corazón? 💖',
        [
          { title: '🍓 Agregar más', id: 'add_more' },
          { title: '✅ Hacer pedido', id: 'finish' }
        ]
      );

      // Método de pago
      this.templates.paymentMethod = await this.createQuickReply(
        'payment_method',
        '💰 ¿Cómo prefieres pagar, mi amor?',
        [
          { title: '💵 Efectivo', id: 'efectivo' },
          { title: '📱 Transferencia', id: 'transferencia' }
        ]
      );

      // Confirmación final del pedido (con editar)
      this.templates.confirmOrder = await this.createQuickReply(
        'confirm_order',
        '¿Confirmamos tu pedido, corazón? 🍓',
        [
          { title: '✅ Confirmar', id: 'confirm_order' },
          { title: '✏️ Editar', id: 'edit_order' },
          { title: '❌ Cancelar', id: 'cancel_order' }
        ]
      );

      // Confirmación post-transferencia (sin cancelar)
      this.templates.confirmOrderTransfer = await this.createQuickReply(
        'confirm_order_transfer',
        '✅ Tu transferencia fue confirmada. ¿Confirmamos tu pedido? 🍓',
        [
          { title: '✅ Confirmar', id: 'confirm_order' },
          { title: '✏️ Editar', id: 'edit_order' }
        ]
      );

      // ¿Quieres toppings?
      this.templates.wantToppings = await this.createQuickReply(
        'want_toppings',
        '🧁 ¿Quieres agregar toppings a tu producto?',
        [
          { title: '✅ Sí, agregar', id: 'yes_toppings' },
          { title: '❌ No, gracias', id: 'no_toppings' }
        ]
      );

      // ¿Otro topping? (con opción de cambiar anterior)
      this.templates.anotherTopping = await this.createQuickReply(
        'another_topping',
        '¿Quieres agregar otro topping? 🧁',
        [
          { title: '✅ Agregar', id: 'yes_another' },
          { title: '🔄 Cambiar', id: 'change_topping' },
          { title: '❌ No más', id: 'no_more' }
        ]
      );

      // ¿Quieres salsa?
      this.templates.wantSauce = await this.createQuickReply(
        'want_sauce',
        '🍯 ¿Quieres elegir una salsa? (incluida gratis)',
        [
          { title: '✅ Sí, elegir', id: 'yes_sauce' },
          { title: '❌ No, gracias', id: 'no_sauce' }
        ]
      );

      // ¿Agregar comentario?
      this.templates.wantComment = await this.createQuickReply(
        'want_comment',
        '💬 ¿Quieres agregar alguna nota especial para este producto?',
        [
          { title: '✏️ Sí, agregar', id: 'yes_comment' },
          { title: '⏭️ No, continuar', id: 'no_comment' }
        ]
      );

      // Referencia de dirección
      this.templates.wantReference = await this.createQuickReply(
        'want_reference',
        '🏠 ¿Tienes alguna referencia para encontrarte más fácil?',
        [
          { title: '✏️ Sí, escribir', id: 'yes_reference' },
          { title: '⏭️ No tengo', id: 'no_reference' }
        ]
      );

      // Datos existentes
      this.templates.useExistingData = await this.createQuickReply(
        'use_existing_data',
        '¿Usamos estos datos para el envío? 📋',
        [
          { title: '✅ Sí, usar estos', id: 'use_existing' },
          { title: '✏️ Actualizar', id: 'update_data' }
        ]
      );

      // Botones de transferencia
      this.templates.transferButtons = await this.createQuickReply(
        'transfer_buttons',
        '¿Ya realizaste la transferencia, mi amor? 💸',
        [
          { title: '✅ Ya transferí', id: 'transfer_done' },
          { title: '❌ Cancelar', id: 'transfer_cancel' }
        ]
      );

      // Opciones de edición del pedido
      this.templates.editOrderOptions = await this.createQuickReply(
        'edit_order_options',
        '✏️ ¿Qué deseas editar, corazón?',
        [
          { title: '🛒 Productos', id: 'edit_products' },
          { title: '📍 Datos entrega', id: 'edit_delivery' },
          { title: '💰 Método pago', id: 'edit_payment' }
        ]
      );

      // ===== TEMPLATES DINÁMICOS (desde la BD) =====
      await this.createDynamicTemplates();

      this.initialized = true;
      logger.info('✅ Content Templates inicializados correctamente');
    } catch (error) {
      logger.error('❌ Error inicializando Content Templates:', error.message);
      logger.warn('⚠️ El bot funcionará en modo texto (sin botones interactivos)');
    }
  }

  // Crear templates dinámicos basados en los datos de la BD
  async createDynamicTemplates() {
    // Template de categorías (lista)
    const categories = await Category.find({ isActive: true }).sort('displayOrder');
    if (categories.length > 0) {
      this.templates.categories = await this.createListPicker(
        'categories',
        '🍓✨ ¡Este es nuestro menú, mi amor! Escoge una categoría:',
        'Ver categorías',
        categories.map((cat) => ({
          id: `cat_${cat._id}`,
          title: `${cat.emoji} ${cat.name}`,
          description: cat.description || ''
        }))
      );
    }

    // Template de productos por categoría
    this.templates.products = {};
    for (const category of categories) {
      const products = await Product.find({ category: category._id, isActive: true }).sort('displayOrder');
      if (products.length > 0 && products.length <= 10) {
        this.templates.products[category._id.toString()] = await this.createListPicker(
          `products_${category.slug || category._id}`,
          `${category.emoji} *${category.name.toUpperCase()}*\n¿Qué se te antoja, corazón?`,
          'Ver productos',
          products.map((prod) => {
            let priceText = '';
            if (prod.sizes && prod.sizes.length > 0) {
              priceText = `Desde ${formatCurrency(prod.sizes[0].price)}`;
            } else {
              priceText = formatCurrency(prod.basePrice);
            }
            return {
              id: `prod_${prod._id}`,
              title: prod.name,
              description: `${priceText}${prod.includesNote ? ' — ' + prod.includesNote : ''}`
            };
          })
        );
      }
    }

    // Template de salsas
    const sauces = await Sauce.find({ isActive: true }).sort('displayOrder');
    if (sauces.length > 0 && sauces.length <= 10) {
      this.templates.sauces = await this.createListPicker(
        'sauces',
        '🍯 ¿Qué salsa quieres, mi amor? (¡gratis!)',
        'Ver salsas',
        sauces.map((sauce) => ({
          id: `sauce_${sauce._id}`,
          title: sauce.name,
          description: sauce.price > 0 ? formatCurrency(sauce.price) : '¡Incluida!'
        }))
      );
    }

    // Templates de opciones de producto (ej: chocolate negro/blanco)
    const productsWithOptions = await Product.find({ isActive: true, 'options.0': { $exists: true } });
    this.templates.productOptions = {};
    for (const product of productsWithOptions) {
      if (product.options.length <= 3) {
        this.templates.productOptions[product._id.toString()] = await this.createQuickReply(
          `options_${product._id}`,
          `😍 *${product.name}* — ${formatCurrency(product.basePrice)}\n¿Qué tipo prefieres?`,
          product.options.map((opt) => ({
            title: opt.name,
            id: `opt_${opt.name.toLowerCase().replace(/\s/g, '_')}`
          }))
        );
      }
    }

    // Templates de variantes de producto (ej: con soda)
    const productsWithVariants = await Product.find({ isActive: true, 'variants.0': { $exists: true } });
    this.templates.productVariants = {};
    for (const product of productsWithVariants) {
      const actions = [{ title: `Normal (${formatCurrency(product.basePrice)})`, id: 'variant_normal' }];
      for (const variant of product.variants) {
        actions.push({
          title: `${variant.name} (+${formatCurrency(variant.extraPrice)})`,
          id: `variant_${variant.name.toLowerCase().replace(/\s/g, '_')}`
        });
      }
      if (actions.length <= 3) {
        this.templates.productVariants[product._id.toString()] = await this.createQuickReply(
          `variants_${product._id}`,
          `😍 *${product.name}*\n¿Qué variante prefieres, bebé?`,
          actions
        );
      }
    }

    // Templates de tamaño por producto
    const productsWithSizes = await Product.find({ isActive: true, 'sizes.0': { $exists: true } });
    this.templates.productSizes = {};
    for (const product of productsWithSizes) {
      if (product.sizes.length <= 3) {
        this.templates.productSizes[product._id.toString()] = await this.createQuickReply(
          `sizes_${product._id}`,
          `📏 *${product.name}*\n¿Qué tamaño quieres, mi amor?`,
          product.sizes.map((size) => ({
            title: `${size.name} (${formatCurrency(size.price)})`,
            id: `size_${size.name.toLowerCase()}`
          }))
        );
      }
    }
  }

  getTemplate(key) {
    return this.templates[key] || null;
  }

  getProductTemplate(categoryId) {
    return this.templates.products?.[categoryId] || null;
  }

  getProductOptionTemplate(productId) {
    return this.templates.productOptions?.[productId] || null;
  }

  getProductVariantTemplate(productId) {
    return this.templates.productVariants?.[productId] || null;
  }

  getProductSizeTemplate(productId) {
    return this.templates.productSizes?.[productId] || null;
  }
}

module.exports = new ContentTemplateService();
