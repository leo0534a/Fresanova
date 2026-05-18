// Servicio de conversaciones — Flujo del bot con mensajes interactivos
const { Conversation, Message, Customer, Product, Topping, Sauce, Category } = require('../models');
const catalogService = require('./catalogService');
const aiService = require('./aiService');
const orderService = require('./orderService');
const whatsappService = require('./whatsappService');
const contentTemplateService = require('./contentTemplateService');
const { formatCurrency } = require('../helpers/formatCurrency');
const { isBusinessOpen } = require('../helpers/dateHelper');
const { config } = require('../config/env');
const logger = require('../utils/logger');

class ConversationService {
  // Obtener o crear conversación activa
  async getOrCreateConversation(whatsappNumber) {
    let conversation = await Conversation.findOne({ whatsappNumber, isActive: true });

    if (!conversation) {
      let customer = await Customer.findOne({ whatsappNumber });
      if (!customer) {
        customer = await Customer.create({
          whatsappNumber,
          phone: whatsappNumber.replace('whatsapp:', '')
        });
      }
      conversation = await Conversation.create({
        customer: customer._id,
        whatsappNumber,
        state: 'idle'
      });
    }

    conversation.lastActivity = new Date();
    await conversation.save();
    return conversation;
  }

  // Punto de entrada: procesar mensaje entrante
  async processMessage(whatsappNumber, incomingMessage, buttonPayload, listId) {
    try {
      const conversation = await this.getOrCreateConversation(whatsappNumber);

      await this.saveMessage(conversation._id, whatsappNumber, 'inbound', incomingMessage);
      conversation.messageHistory.push({ role: 'user', content: incomingMessage });
      if (conversation.messageHistory.length > 20) {
        conversation.messageHistory = conversation.messageHistory.slice(-20);
      }

      // El payload tiene prioridad (viene de botones/listas)
      const actionId = buttonPayload || listId || null;

      await this.handleState(conversation, incomingMessage, actionId);

      await conversation.save();
    } catch (error) {
      logger.error('Error procesando mensaje:', error);
      await whatsappService.sendMessage(
        whatsappNumber,
        'Ay mi amor 🍓 Tuve un problemita técnico. ¿Puedes intentar de nuevo? ✨'
      );
    }
  }

  // Máquina de estados principal
  async handleState(conversation, message, actionId) {
    const state = conversation.state;
    const to = conversation.whatsappNumber;

    // Cancelar en cualquier momento
    if (['cancelar', 'salir', 'volver', 'inicio', 'reiniciar'].includes(message.toLowerCase().trim())) {
      return await this.resetConversation(conversation);
    }

    switch (state) {
      case 'idle': return await this.handleIdle(conversation, message, actionId);
      case 'selecting_category': return await this.handleCategorySelection(conversation, message, actionId);
      case 'selecting_product': return await this.handleProductSelection(conversation, message, actionId);
      case 'selecting_option': return await this.handleOptionSelection(conversation, message, actionId);
      case 'selecting_variant': return await this.handleVariantSelection(conversation, message, actionId);
      case 'asking_toppings': return await this.handleAskToppings(conversation, message, actionId);
      case 'typing_topping': return await this.handleTypingTopping(conversation, message);
      case 'another_topping': return await this.handleAnotherTopping(conversation, message, actionId);
      case 'asking_sauce': return await this.handleAskSauce(conversation, message, actionId);
      case 'selecting_sauce': return await this.handleSauceSelection(conversation, message, actionId);
      case 'asking_comment': return await this.handleAskComment(conversation, message, actionId);
      case 'typing_comment': return await this.handleTypingComment(conversation, message);
      case 'confirming_item': return await this.handleItemConfirmation(conversation, message, actionId);
      case 'adding_more': return await this.handleAddMore(conversation, message, actionId);
      case 'entering_name': return await this.handleName(conversation, message);
      case 'entering_address': return await this.handleAddress(conversation, message);
      case 'asking_reference': return await this.handleAskReference(conversation, message, actionId);
      case 'typing_reference': return await this.handleTypingReference(conversation, message);
      case 'entering_phone': return await this.handlePhone(conversation, message);
      case 'selecting_payment': return await this.handlePayment(conversation, message, actionId);
      case 'confirming_order': return await this.handleOrderConfirmation(conversation, message, actionId);
      case 'using_existing_data': return await this.handleExistingData(conversation, message, actionId);
      case 'tracking_order': return await this.handleTracking(conversation, message);
      default: return await this.handleFreeChat(conversation, message);
    }
  }

  // ===== IDLE — Primera interacción =====
  async handleIdle(conversation, message, actionId) {
    const to = conversation.whatsappNumber;
    const intent = await aiService.detectIntent(message);

    if (['greeting', 'view_menu', 'place_order'].includes(intent) || actionId === 'menu') {
      conversation.state = 'selecting_category';

      const horarioMsg = !isBusinessOpen()
        ? `⏰ Estamos cerraditos ahora (${config.business.openHour} - ${config.business.closeHour}), pero puedes ver el menú 💖\n\n`
        : '';

      if (horarioMsg) await whatsappService.sendMessage(to, horarioMsg);

      const categoriesTpl = contentTemplateService.getTemplate('categories');
      if (categoriesTpl) {
        await whatsappService.sendTemplate(to, categoriesTpl);
      } else {
        // Fallback a menú principal con botones
        const mainMenuTpl = contentTemplateService.getTemplate('mainMenu');
        if (mainMenuTpl) await whatsappService.sendTemplate(to, mainMenuTpl);
        else await whatsappService.sendMessage(to, '¡Hola mi amor! 🍓 Escribe "menú" para ver nuestras delicias ✨');
      }
      return;
    }

    if (intent === 'track_order' || actionId === 'track') {
      conversation.state = 'tracking_order';
      await whatsappService.sendMessage(to, '📦 ¡Claro, corazón! Escribe tu número de pedido (ej: FR-250518-1234) 🍓✨');
      return;
    }

    if (intent === 'ask_hours') {
      await whatsappService.sendMessage(to, `¡Hola mi amor! 🍓 Nuestro horario es de *${config.business.openHour}* a *${config.business.closeHour}* ✨`);
      const mainTpl = contentTemplateService.getTemplate('mainMenu');
      if (mainTpl) await whatsappService.sendTemplate(to, mainTpl);
      return;
    }

    if (intent === 'ask_delivery') {
      await whatsappService.sendMessage(to, `¡Claro bebé! 🚗 El domicilio cuesta *${formatCurrency(config.business.deliveryPrice)}* en ${config.business.city} 🍓`);
      const mainTpl = contentTemplateService.getTemplate('mainMenu');
      if (mainTpl) await whatsappService.sendTemplate(to, mainTpl);
      return;
    }

    if (intent === 'ask_payment') {
      await whatsappService.sendMessage(to, '¡Mi amor! 💰 Aceptamos *efectivo contra entrega* y *transferencia* 📱');
      const mainTpl = contentTemplateService.getTemplate('mainMenu');
      if (mainTpl) await whatsappService.sendTemplate(to, mainTpl);
      return;
    }

    if (intent === 'support' || actionId === 'support') {
      await whatsappService.sendMessage(to, '¡Hola corazón! 💖 Cuéntame en qué puedo ayudarte. Pronto alguien del equipo te atenderá 🍓✨');
      return;
    }

    // Chat libre con IA
    const catalogInfo = await catalogService.getCatalogForAI();
    const aiResponse = await aiService.generateResponse(message, conversation.messageHistory, catalogInfo);
    await whatsappService.sendMessage(to, aiResponse);

    // Mostrar menú principal después de la respuesta IA
    const mainTpl = contentTemplateService.getTemplate('mainMenu');
    if (mainTpl) await whatsappService.sendTemplate(to, mainTpl);
  }

  // ===== CATEGORÍA — Lista interactiva =====
  async handleCategorySelection(conversation, message, actionId) {
    const to = conversation.whatsappNumber;

    // Detectar selección de categoría por actionId (viene de lista)
    let selectedCategory = null;

    if (actionId && actionId.startsWith('cat_')) {
      const categoryId = actionId.replace('cat_', '');
      selectedCategory = await Category.findById(categoryId);
    }

    // Fallback: buscar por nombre del mensaje
    if (!selectedCategory) {
      const categories = await catalogService.getActiveCategories();
      selectedCategory = categories.find((cat) => {
        const catName = cat.name.toLowerCase();
        const msgLower = message.toLowerCase();
        return msgLower.includes(catName) || msgLower.includes(cat.emoji);
      });
    }

    if (!selectedCategory) {
      const categoriesTpl = contentTemplateService.getTemplate('categories');
      if (categoriesTpl) {
        await whatsappService.sendMessage(to, 'Selecciona una categoría del menú, corazón 🍓');
        await whatsappService.sendTemplate(to, categoriesTpl);
      }
      return;
    }

    // Mostrar productos de la categoría
    conversation.selectedCategory = selectedCategory._id;
    conversation.state = 'selecting_product';

    const productsTpl = contentTemplateService.getProductTemplate(selectedCategory._id.toString());
    if (productsTpl) {
      await whatsappService.sendTemplate(to, productsTpl);
    } else {
      // Fallback texto
      const products = await catalogService.getProductsByCategory(selectedCategory._id);
      await whatsappService.sendMessage(to, catalogService.formatProductsList(products, selectedCategory.name));
    }
  }

  // ===== PRODUCTO — Lista interactiva =====
  async handleProductSelection(conversation, message, actionId) {
    const to = conversation.whatsappNumber;
    let selectedProduct = null;

    if (actionId && actionId.startsWith('prod_')) {
      const productId = actionId.replace('prod_', '');
      selectedProduct = await Product.findById(productId).populate('category');
    }

    if (!selectedProduct) {
      // Buscar por nombre
      const products = await catalogService.getProductsByCategory(conversation.selectedCategory);
      selectedProduct = products.find((p) =>
        message.toLowerCase().includes(p.name.toLowerCase())
      );
    }

    if (!selectedProduct) {
      await whatsappService.sendMessage(to, 'Selecciona un producto de la lista, mi amor 🍓');
      return;
    }

    // Inicializar item actual
    conversation.currentItem = {
      product: selectedProduct._id,
      productName: selectedProduct.name,
      basePrice: selectedProduct.basePrice,
      toppings: [],
      sauces: [],
      quantity: 1,
      itemTotal: selectedProduct.basePrice
    };
    conversation.remainingIncludedToppings = selectedProduct.includedToppings || 0;
    conversation.remainingIncludedSauces = selectedProduct.includedSauces || 0;

    // ¿Tiene opciones? (ej: tipo de chocolate)
    if (selectedProduct.options && selectedProduct.options.length > 0) {
      conversation.state = 'selecting_option';
      const optionsTpl = contentTemplateService.getProductOptionTemplate(selectedProduct._id.toString());
      if (optionsTpl) {
        await whatsappService.sendTemplate(to, optionsTpl);
      } else {
        let msg = `😍 *${selectedProduct.name}*\n¿Qué tipo prefieres?\n\n`;
        selectedProduct.options.forEach((opt, i) => { msg += `${i + 1}. ${opt.name}\n`; });
        await whatsappService.sendMessage(to, msg);
      }
      return;
    }

    // ¿Tiene variantes? (ej: con soda)
    if (selectedProduct.variants && selectedProduct.variants.length > 0) {
      conversation.state = 'selecting_variant';
      const variantsTpl = contentTemplateService.getProductVariantTemplate(selectedProduct._id.toString());
      if (variantsTpl) {
        await whatsappService.sendTemplate(to, variantsTpl);
      }
      return;
    }

    // ¿Permite toppings?
    await this.goToToppingsOrNext(conversation, selectedProduct);
  }

  // ===== OPCIONES DEL PRODUCTO (chocolate negro/blanco/combinado) =====
  async handleOptionSelection(conversation, message, actionId) {
    const to = conversation.whatsappNumber;
    const product = await Product.findById(conversation.currentItem.product);

    let selectedOption = null;
    if (actionId && actionId.startsWith('opt_')) {
      const optName = actionId.replace('opt_', '').replace(/_/g, ' ');
      selectedOption = product.options.find((o) => o.name.toLowerCase() === optName);
    }
    if (!selectedOption) {
      selectedOption = product.options.find((o) =>
        message.toLowerCase().includes(o.name.toLowerCase())
      );
    }

    if (!selectedOption) {
      await whatsappService.sendMessage(to, 'Selecciona una opción válida, corazón 🍓');
      return;
    }

    conversation.currentItem.selectedOption = { name: selectedOption.name, extraPrice: selectedOption.extraPrice || 0 };
    conversation.currentItem.itemTotal = conversation.currentItem.basePrice + (selectedOption.extraPrice || 0);

    await whatsappService.sendMessage(to, `¡${selectedOption.name}, excelente elección! 😋`);
    await this.goToToppingsOrNext(conversation, product);
  }

  // ===== VARIANTES DEL PRODUCTO (normal / con soda) =====
  async handleVariantSelection(conversation, message, actionId) {
    const to = conversation.whatsappNumber;
    const product = await Product.findById(conversation.currentItem.product);

    if (actionId === 'variant_normal' || message.toLowerCase().includes('normal')) {
      // Sin variante
    } else {
      let selectedVariant = null;
      if (actionId && actionId.startsWith('variant_')) {
        const varName = actionId.replace('variant_', '').replace(/_/g, ' ');
        selectedVariant = product.variants.find((v) => v.name.toLowerCase() === varName);
      }
      if (!selectedVariant) {
        selectedVariant = product.variants.find((v) =>
          message.toLowerCase().includes(v.name.toLowerCase())
        );
      }

      if (selectedVariant) {
        conversation.currentItem.selectedVariant = { name: selectedVariant.name, extraPrice: selectedVariant.extraPrice || 0 };
        conversation.currentItem.itemTotal = conversation.currentItem.basePrice + (selectedVariant.extraPrice || 0);
      }
    }

    await this.goToToppingsOrNext(conversation, product);
  }

  // ===== FLUJO TOPPINGS: Preguntar si quiere =====
  async handleAskToppings(conversation, message, actionId) {
    const to = conversation.whatsappNumber;

    if (actionId === 'yes_toppings' || message.toLowerCase().includes('sí') || message.toLowerCase().includes('si')) {
      conversation.state = 'typing_topping';
      const toppings = await catalogService.getActiveToppings();

      let list = '🧁 *TOPPINGS DISPONIBLES*\n\n';
      const grouped = {};
      toppings.forEach((t) => { if (!grouped[t.price]) grouped[t.price] = []; grouped[t.price].push(t.name); });

      for (const [price, names] of Object.entries(grouped)) {
        list += `💰 *${formatCurrency(Number(price))}:*\n`;
        list += names.join(', ') + '\n\n';
      }

      const includedCount = conversation.remainingIncludedToppings;
      if (includedCount > 0) {
        list += `💝 _¡Tienes ${includedCount} topping(s) incluido(s) gratis!_\n\n`;
      }

      list += '✏️ *Escribe el nombre del topping que quieras*';
      await whatsappService.sendMessage(to, list);
      return;
    }

    if (actionId === 'no_toppings' || message.toLowerCase().includes('no')) {
      await this.goToSauceOrNext(conversation);
      return;
    }

    const tpl = contentTemplateService.getTemplate('wantToppings');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
  }

  // ===== TOPPINGS: Usuario escribe nombre =====
  async handleTypingTopping(conversation, message) {
    const to = conversation.whatsappNumber;
    const toppingName = message.trim();

    // Buscar topping por nombre (fuzzy)
    const regex = new RegExp(toppingName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const topping = await Topping.findOne({ name: regex, isActive: true });

    if (!topping) {
      await whatsappService.sendMessage(to, `No encontré "${toppingName}" 😔 Revisa la lista y escribe el nombre exacto, corazón 🍓`);
      return;
    }

    let toppingPrice = topping.price;
    if (conversation.remainingIncludedToppings > 0) {
      toppingPrice = 0;
      conversation.remainingIncludedToppings--;
    }

    conversation.currentItem.toppings.push({
      topping: topping._id,
      name: topping.name,
      price: toppingPrice
    });
    conversation.currentItem.itemTotal += toppingPrice;

    const priceText = toppingPrice > 0 ? ` (+${formatCurrency(toppingPrice)})` : ' (¡incluido!)';
    await whatsappService.sendMessage(to, `✅ *${topping.name}*${priceText} agregado 🧁`);

    // Preguntar si quiere otro
    conversation.state = 'another_topping';
    const tpl = contentTemplateService.getTemplate('anotherTopping');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
    else await whatsappService.sendMessage(to, '¿Quieres agregar otro topping? (sí/no)');
  }

  // ===== TOPPINGS: ¿Otro? =====
  async handleAnotherTopping(conversation, message, actionId) {
    if (actionId === 'yes_another' || message.toLowerCase().includes('sí') || message.toLowerCase().includes('si')) {
      conversation.state = 'typing_topping';
      await whatsappService.sendMessage(conversation.whatsappNumber, '✏️ Escribe el nombre del siguiente topping:');
      return;
    }

    await this.goToSauceOrNext(conversation);
  }

  // ===== FLUJO SALSAS: Preguntar si quiere =====
  async handleAskSauce(conversation, message, actionId) {
    const to = conversation.whatsappNumber;

    if (actionId === 'yes_sauce' || message.toLowerCase().includes('sí') || message.toLowerCase().includes('si')) {
      conversation.state = 'selecting_sauce';
      const saucesTpl = contentTemplateService.getTemplate('sauces');
      if (saucesTpl) {
        await whatsappService.sendTemplate(to, saucesTpl);
      } else {
        const sauces = await catalogService.getActiveSauces();
        await whatsappService.sendMessage(to, catalogService.formatSaucesList(sauces));
      }
      return;
    }

    if (actionId === 'no_sauce' || message.toLowerCase().includes('no')) {
      await this.goToComment(conversation);
      return;
    }

    const tpl = contentTemplateService.getTemplate('wantSauce');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
  }

  // ===== SALSAS: Selección de lista =====
  async handleSauceSelection(conversation, message, actionId) {
    const to = conversation.whatsappNumber;
    let selectedSauce = null;

    if (actionId && actionId.startsWith('sauce_')) {
      const sauceId = actionId.replace('sauce_', '');
      selectedSauce = await Sauce.findById(sauceId);
    }
    if (!selectedSauce) {
      selectedSauce = await Sauce.findOne({
        name: new RegExp(message.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
        isActive: true
      });
    }

    if (!selectedSauce) {
      await whatsappService.sendMessage(to, 'Selecciona una salsa de la lista, corazón 🍓');
      return;
    }

    let saucePrice = selectedSauce.price;
    if (conversation.remainingIncludedSauces > 0) {
      saucePrice = 0;
      conversation.remainingIncludedSauces--;
    }

    conversation.currentItem.sauces = [{ sauce: selectedSauce._id, name: selectedSauce.name, price: saucePrice }];
    conversation.currentItem.itemTotal += saucePrice;

    const priceText = saucePrice > 0 ? ` (+${formatCurrency(saucePrice)})` : ' (¡incluida!)';
    await whatsappService.sendMessage(to, `✅ Salsa de *${selectedSauce.name}*${priceText} 🍯`);
    await this.goToComment(conversation);
  }

  // ===== COMENTARIO: Preguntar =====
  async handleAskComment(conversation, message, actionId) {
    const to = conversation.whatsappNumber;

    if (actionId === 'yes_comment' || message.toLowerCase().includes('sí') || message.toLowerCase().includes('si')) {
      conversation.state = 'typing_comment';
      await whatsappService.sendMessage(to, '✏️ Escribe tu nota para este producto:');
      return;
    }

    if (actionId === 'no_comment' || message.toLowerCase().includes('no')) {
      await this.showItemSummary(conversation);
      return;
    }

    const tpl = contentTemplateService.getTemplate('wantComment');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
  }

  // ===== COMENTARIO: Escribir =====
  async handleTypingComment(conversation, message) {
    conversation.currentItem.comment = message.trim();
    await whatsappService.sendMessage(conversation.whatsappNumber, `💬 Nota guardada: "${message.trim()}"`);
    await this.showItemSummary(conversation);
  }

  // ===== CONFIRMACIÓN DEL ITEM =====
  async handleItemConfirmation(conversation, message, actionId) {
    const to = conversation.whatsappNumber;

    if (actionId === 'confirm' || message.toLowerCase().includes('confirmar') || message.toLowerCase().includes('sí')) {
      conversation.cart.push({ ...conversation.currentItem });
      conversation.currentItem = {};

      const cartTotal = conversation.cart.reduce((sum, item) => sum + item.itemTotal, 0);
      const total = cartTotal + config.business.deliveryPrice;

      let msg = `🛒 ¡Agregado al carrito!\n\n`;
      msg += `Productos: ${conversation.cart.length}\n`;
      msg += `Subtotal: ${formatCurrency(cartTotal)}\n`;
      msg += `Domicilio: ${formatCurrency(config.business.deliveryPrice)}\n`;
      msg += `*Total: ${formatCurrency(total)}*`;

      await whatsappService.sendMessage(to, msg);

      conversation.state = 'adding_more';
      const tpl = contentTemplateService.getTemplate('addMoreOrFinish');
      if (tpl) await whatsappService.sendTemplate(to, tpl);
      return;
    }

    if (actionId === 'cancel' || message.toLowerCase().includes('cancelar') || message.toLowerCase().includes('no')) {
      conversation.currentItem = {};
      conversation.state = 'selecting_category';
      await whatsappService.sendMessage(to, '¡Ok, cancelado! 😊');
      const catTpl = contentTemplateService.getTemplate('categories');
      if (catTpl) await whatsappService.sendTemplate(to, catTpl);
      return;
    }

    const tpl = contentTemplateService.getTemplate('confirmItem');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
  }

  // ===== ¿AGREGAR MÁS O FINALIZAR? =====
  async handleAddMore(conversation, message, actionId) {
    const to = conversation.whatsappNumber;

    if (actionId === 'add_more' || message.toLowerCase().includes('agregar') || message.toLowerCase().includes('más')) {
      conversation.state = 'selecting_category';
      await whatsappService.sendMessage(to, '¡Perfecto, sigamos! 🍓✨');
      const catTpl = contentTemplateService.getTemplate('categories');
      if (catTpl) await whatsappService.sendTemplate(to, catTpl);
      return;
    }

    if (actionId === 'finish' || message.toLowerCase().includes('pedido') || message.toLowerCase().includes('finalizar')) {
      if (conversation.cart.length === 0) {
        conversation.state = 'selecting_category';
        await whatsappService.sendMessage(to, 'Tu carrito está vacío, agrega algo primero 🍓');
        const catTpl = contentTemplateService.getTemplate('categories');
        if (catTpl) await whatsappService.sendTemplate(to, catTpl);
        return;
      }

      // Ver si ya tenemos datos del cliente
      const customer = await Customer.findOne({ whatsappNumber: conversation.whatsappNumber });
      if (customer && customer.fullName && customer.address && customer.phone) {
        conversation.tempCustomerData = {
          fullName: customer.fullName,
          address: customer.address,
          addressReference: customer.addressReference,
          phone: customer.phone
        };

        let msg = `📋 Tengo tus datos guardados:\n\n`;
        msg += `👤 ${customer.fullName}\n`;
        msg += `📍 ${customer.address}\n`;
        msg += `📱 ${customer.phone}`;

        await whatsappService.sendMessage(to, msg);
        conversation.state = 'using_existing_data';
        const tpl = contentTemplateService.getTemplate('useExistingData');
        if (tpl) await whatsappService.sendTemplate(to, tpl);
        return;
      }

      conversation.state = 'entering_name';
      await whatsappService.sendMessage(to, '¡Perfecto, corazón! 💖 Para el domicilio necesito tus datos.\n\n👤 Escribe tu *nombre completo*:');
      return;
    }

    const tpl = contentTemplateService.getTemplate('addMoreOrFinish');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
  }

  // ===== DATOS EXISTENTES =====
  async handleExistingData(conversation, message, actionId) {
    const to = conversation.whatsappNumber;

    if (actionId === 'use_existing' || message.toLowerCase().includes('sí') || message.toLowerCase().includes('usar')) {
      conversation.state = 'selecting_payment';
      const tpl = contentTemplateService.getTemplate('paymentMethod');
      if (tpl) await whatsappService.sendTemplate(to, tpl);
      return;
    }

    if (actionId === 'update_data' || message.toLowerCase().includes('actualizar') || message.toLowerCase().includes('no')) {
      conversation.tempCustomerData = {};
      conversation.state = 'entering_name';
      await whatsappService.sendMessage(to, '📝 ¡Ok! Escribe tu *nombre completo*:');
      return;
    }

    const tpl = contentTemplateService.getTemplate('useExistingData');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
  }

  // ===== NOMBRE =====
  async handleName(conversation, message) {
    const to = conversation.whatsappNumber;
    if (message.trim().length < 2) {
      await whatsappService.sendMessage(to, 'Necesito tu nombre completo, mi amor 🍓');
      return;
    }
    conversation.tempCustomerData = conversation.tempCustomerData || {};
    conversation.tempCustomerData.fullName = message.trim();
    conversation.state = 'entering_address';
    await whatsappService.sendMessage(to, `¡Lindo nombre, ${message.trim()}! 💖\n\n📍 Escribe tu *dirección exacta* de entrega:`);
  }

  // ===== DIRECCIÓN =====
  async handleAddress(conversation, message) {
    const to = conversation.whatsappNumber;
    if (message.trim().length < 5) {
      await whatsappService.sendMessage(to, 'Necesito una dirección más detallada, corazón 🏠');
      return;
    }
    conversation.tempCustomerData.address = message.trim();
    conversation.state = 'asking_reference';
    const tpl = contentTemplateService.getTemplate('wantReference');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
    else await whatsappService.sendMessage(to, '🏠 ¿Tienes alguna referencia? (sí/no)');
  }

  // ===== REFERENCIA: Preguntar =====
  async handleAskReference(conversation, message, actionId) {
    const to = conversation.whatsappNumber;

    if (actionId === 'yes_reference' || message.toLowerCase().includes('sí') || message.toLowerCase().includes('si')) {
      conversation.state = 'typing_reference';
      await whatsappService.sendMessage(to, '✏️ Escribe la referencia (ej: "casa blanca esquina", "edificio azul piso 3"):');
      return;
    }

    if (actionId === 'no_reference' || message.toLowerCase().includes('no')) {
      conversation.state = 'entering_phone';
      await whatsappService.sendMessage(to, '📱 Escribe tu *número de teléfono* de contacto:');
      return;
    }

    const tpl = contentTemplateService.getTemplate('wantReference');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
  }

  // ===== REFERENCIA: Escribir =====
  async handleTypingReference(conversation, message) {
    conversation.tempCustomerData.addressReference = message.trim();
    conversation.state = 'entering_phone';
    await whatsappService.sendMessage(conversation.whatsappNumber, '📱 Escribe tu *número de teléfono* de contacto:');
  }

  // ===== TELÉFONO =====
  async handlePhone(conversation, message) {
    const to = conversation.whatsappNumber;
    const phone = message.trim().replace(/\D/g, '');
    if (phone.length < 7) {
      await whatsappService.sendMessage(to, 'Necesito un número válido (mínimo 7 dígitos), mi amor 📱');
      return;
    }
    conversation.tempCustomerData.phone = message.trim();
    conversation.state = 'selecting_payment';
    const tpl = contentTemplateService.getTemplate('paymentMethod');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
    else await whatsappService.sendMessage(to, '💰 ¿Cómo pagas? Escribe: efectivo o transferencia');
  }

  // ===== MÉTODO DE PAGO =====
  async handlePayment(conversation, message, actionId) {
    const to = conversation.whatsappNumber;

    if (actionId === 'efectivo' || message.toLowerCase().includes('efectivo')) {
      conversation.tempCustomerData.paymentMethod = 'efectivo';
    } else if (actionId === 'transferencia' || message.toLowerCase().includes('transferencia')) {
      conversation.tempCustomerData.paymentMethod = 'transferencia';
    } else {
      const tpl = contentTemplateService.getTemplate('paymentMethod');
      if (tpl) await whatsappService.sendTemplate(to, tpl);
      return;
    }

    // Mostrar resumen final
    const cartTotal = conversation.cart.reduce((sum, item) => sum + item.itemTotal, 0);
    const total = cartTotal + config.business.deliveryPrice;

    let summary = '🧾✨ *RESUMEN DE TU PEDIDO* ✨🧾\n━━━━━━━━━━━━━━━━━━━━━\n\n';

    conversation.cart.forEach((item, i) => {
      summary += `${i + 1}. *${item.productName}* — ${formatCurrency(item.itemTotal)}\n`;
      if (item.toppings?.length > 0) summary += `   🧁 ${item.toppings.map((t) => t.name).join(', ')}\n`;
      if (item.sauces?.length > 0) summary += `   🍯 ${item.sauces.map((s) => s.name).join(', ')}\n`;
      if (item.comment) summary += `   💬 ${item.comment}\n`;
    });

    summary += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    summary += `👤 ${conversation.tempCustomerData.fullName}\n`;
    summary += `📍 ${conversation.tempCustomerData.address}\n`;
    if (conversation.tempCustomerData.addressReference) summary += `🏠 ${conversation.tempCustomerData.addressReference}\n`;
    summary += `📱 ${conversation.tempCustomerData.phone}\n`;
    summary += `💳 ${conversation.tempCustomerData.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia'}\n\n`;
    summary += `📦 Subtotal: ${formatCurrency(cartTotal)}\n`;
    summary += `🚗 Domicilio: ${formatCurrency(config.business.deliveryPrice)}\n`;
    summary += `💵 *TOTAL: ${formatCurrency(total)}*`;

    await whatsappService.sendMessage(to, summary);

    conversation.state = 'confirming_order';
    const tpl = contentTemplateService.getTemplate('confirmOrder');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
  }

  // ===== CONFIRMAR PEDIDO FINAL =====
  async handleOrderConfirmation(conversation, message, actionId) {
    const to = conversation.whatsappNumber;

    if (actionId === 'confirm_order' || message.toLowerCase().includes('confirmar') || message.toLowerCase().includes('sí')) {
      const order = await orderService.createOrderFromConversation(conversation);
      const receipt = orderService.formatOrderReceipt(order);

      conversation.cart = [];
      conversation.currentItem = {};
      conversation.tempCustomerData = {};
      conversation.state = 'idle';

      await whatsappService.sendMessage(to, receipt);
      return;
    }

    if (actionId === 'cancel_order' || message.toLowerCase().includes('cancelar') || message.toLowerCase().includes('no')) {
      await this.resetConversation(conversation);
      return;
    }

    const tpl = contentTemplateService.getTemplate('confirmOrder');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
  }

  // ===== RASTREAR PEDIDO =====
  async handleTracking(conversation, message) {
    const to = conversation.whatsappNumber;
    const orderNumber = message.trim().toUpperCase();

    let order = await orderService.findByOrderNumber(orderNumber);

    if (!order) {
      const recentOrders = await orderService.findByWhatsApp(conversation.whatsappNumber);
      if (recentOrders.length > 0) {
        let msg = 'No encontré ese número, pero estos son tus pedidos recientes 📦\n\n';
        recentOrders.forEach((o) => {
          msg += `📋 *${o.orderNumber}* — ${o.status.toUpperCase()} — ${formatCurrency(o.total)}\n`;
        });
        msg += '\nEscribe el número exacto del pedido o "menú" para volver 🍓';
        await whatsappService.sendMessage(to, msg);
        return;
      }

      conversation.state = 'idle';
      await whatsappService.sendMessage(to, 'No encontré pedidos con ese número 😔 Escribe "menú" para hacer un nuevo pedido 🍓');
      return;
    }

    conversation.state = 'idle';
    await whatsappService.sendMessage(to, orderService.formatOrderTracking(order));
  }

  // ===== CHAT LIBRE CON IA =====
  async handleFreeChat(conversation, message) {
    const to = conversation.whatsappNumber;
    const catalogInfo = await catalogService.getCatalogForAI();
    const aiResponse = await aiService.generateResponse(message, conversation.messageHistory, catalogInfo);
    await whatsappService.sendMessage(to, aiResponse);
    conversation.state = 'idle';
  }

  // ===== HELPERS DE NAVEGACIÓN =====

  // Ir a toppings o al siguiente paso
  async goToToppingsOrNext(conversation, product) {
    const to = conversation.whatsappNumber;

    if (product.allowsToppings) {
      conversation.state = 'asking_toppings';
      await whatsappService.sendMessage(to, `😍 *${product.name}* — ${formatCurrency(product.basePrice)} ¡Excelente elección!`);
      const tpl = contentTemplateService.getTemplate('wantToppings');
      if (tpl) await whatsappService.sendTemplate(to, tpl);
      else await whatsappService.sendMessage(to, '¿Quieres agregar toppings? (sí/no)');
      return;
    }

    await this.goToSauceOrNext(conversation);
  }

  // Ir a salsas o al siguiente paso
  async goToSauceOrNext(conversation) {
    const to = conversation.whatsappNumber;
    const product = await Product.findById(conversation.currentItem.product);

    if (product && product.allowsSauces) {
      conversation.state = 'asking_sauce';
      const tpl = contentTemplateService.getTemplate('wantSauce');
      if (tpl) await whatsappService.sendTemplate(to, tpl);
      else await whatsappService.sendMessage(to, '¿Quieres agregar salsa? (sí/no)');
      return;
    }

    await this.goToComment(conversation);
  }

  // Ir a comentario
  async goToComment(conversation) {
    conversation.state = 'asking_comment';
    const tpl = contentTemplateService.getTemplate('wantComment');
    if (tpl) await whatsappService.sendTemplate(conversation.whatsappNumber, tpl);
    else await whatsappService.sendMessage(conversation.whatsappNumber, '¿Agregar nota? (sí/no)');
  }

  // Mostrar resumen del item antes de confirmar
  async showItemSummary(conversation) {
    const to = conversation.whatsappNumber;
    const item = conversation.currentItem;

    let summary = `✨ *Tu producto:*\n\n`;
    summary += `🍓 ${item.productName} — ${formatCurrency(item.basePrice)}\n`;
    if (item.selectedOption?.name) summary += `📌 Tipo: ${item.selectedOption.name}\n`;
    if (item.selectedVariant?.name) summary += `📌 ${item.selectedVariant.name} (+${formatCurrency(item.selectedVariant.extraPrice)})\n`;
    if (item.toppings?.length > 0) summary += `🧁 Toppings: ${item.toppings.map((t) => `${t.name}${t.price > 0 ? ` (+${formatCurrency(t.price)})` : ''}`).join(', ')}\n`;
    if (item.sauces?.length > 0) summary += `🍯 Salsa: ${item.sauces.map((s) => `${s.name}${s.price > 0 ? ` (+${formatCurrency(s.price)})` : ''}`).join(', ')}\n`;
    if (item.comment) summary += `💬 Nota: ${item.comment}\n`;
    summary += `\n💰 *Total: ${formatCurrency(item.itemTotal)}*`;

    await whatsappService.sendMessage(to, summary);

    conversation.state = 'confirming_item';
    const tpl = contentTemplateService.getTemplate('confirmItem');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
  }

  // Resetear conversación
  async resetConversation(conversation) {
    const to = conversation.whatsappNumber;
    conversation.state = 'idle';
    conversation.cart = [];
    conversation.currentItem = {};
    conversation.tempCustomerData = {};
    conversation.selectedCategory = undefined;
    conversation.remainingIncludedToppings = 0;
    conversation.remainingIncludedSauces = 0;

    await whatsappService.sendMessage(to, '¡Listo, empezamos de nuevo! 🍓✨');
    const mainTpl = contentTemplateService.getTemplate('mainMenu');
    if (mainTpl) await whatsappService.sendTemplate(to, mainTpl);
  }

  // Guardar mensaje en BD
  async saveMessage(conversationId, whatsappNumber, direction, body) {
    try {
      await Message.create({
        conversation: conversationId,
        whatsappNumber,
        direction,
        body: body.substring(0, 5000)
      });
    } catch (error) {
      logger.error('Error guardando mensaje:', error);
    }
  }
}

module.exports = new ConversationService();
