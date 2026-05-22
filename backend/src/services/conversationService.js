// Servicio de conversaciones — Flujo del bot con mensajes interactivos
const { Conversation, Message, Customer, Product, Topping, Sauce, Category } = require('../models');
const catalogService = require('./catalogService');
const aiService = require('./aiService');
const orderService = require('./orderService');
const whatsappService = require('./whatsappService');
const contentTemplateService = require('./contentTemplateService');
const socketService = require('./socketService');
const { formatCurrency } = require('../helpers/formatCurrency');
const { isBusinessOpen } = require('../helpers/dateHelper');
const deliveryService = require('./deliveryService');
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
  async processMessage(whatsappNumber, incomingMessage, buttonPayload, listId, mediaUrl) {
    try {
      const conversation = await this.getOrCreateConversation(whatsappNumber);

      await this.saveMessage(conversation._id, whatsappNumber, 'inbound', incomingMessage || '[media]');
      conversation.messageHistory.push({ role: 'user', content: incomingMessage || '[media]' });
      if (conversation.messageHistory.length > 20) {
        conversation.messageHistory = conversation.messageHistory.slice(-20);
      }

      const actionId = buttonPayload || listId || null;

      await this.handleState(conversation, incomingMessage, actionId, mediaUrl);

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
  async handleState(conversation, message, actionId, mediaUrl) {
    const state = conversation.state;

    // Cancelar en cualquier momento (excepto en live_chat y awaiting_transfer_confirmation)
    if (!['live_chat', 'awaiting_transfer_confirmation'].includes(state)) {
      if (['cancelar', 'salir', 'volver', 'inicio', 'reiniciar'].includes(message.toLowerCase().trim())) {
        return await this.resetConversation(conversation);
      }
    }

    switch (state) {
      case 'idle': return await this.handleIdle(conversation, message, actionId);
      case 'selecting_category': return await this.handleCategorySelection(conversation, message, actionId);
      case 'selecting_product': return await this.handleProductSelection(conversation, message, actionId);
      case 'selecting_size': return await this.handleSizeSelection(conversation, message, actionId);
      case 'selecting_option': return await this.handleOptionSelection(conversation, message, actionId);
      case 'selecting_variant': return await this.handleVariantSelection(conversation, message, actionId);
      case 'asking_toppings': return await this.handleAskToppings(conversation, message, actionId);
      case 'typing_topping': return await this.handleTypingTopping(conversation, message);
      case 'another_topping': return await this.handleAnotherTopping(conversation, message, actionId);
      case 'changing_topping': return await this.handleChangingTopping(conversation, message, actionId);
      case 'asking_sauce': return await this.handleAskSauce(conversation, message, actionId);
      case 'selecting_sauce': return await this.handleSauceSelection(conversation, message, actionId);
      case 'asking_comment': return await this.handleAskComment(conversation, message, actionId);
      case 'typing_comment': return await this.handleTypingComment(conversation, message);
      case 'confirming_item': return await this.handleItemConfirmation(conversation, message, actionId);
      case 'adding_more': return await this.handleAddMore(conversation, message, actionId);
      case 'entering_name': return await this.handleName(conversation, message);
      case 'entering_neighborhood': return await this.handleNeighborhood(conversation, message);
      case 'entering_address': return await this.handleAddress(conversation, message);
      case 'asking_reference': return await this.handleAskReference(conversation, message, actionId);
      case 'typing_reference': return await this.handleTypingReference(conversation, message);
      case 'entering_phone': return await this.handlePhone(conversation, message);
      case 'selecting_payment': return await this.handlePayment(conversation, message, actionId);
      case 'awaiting_transfer_proof': return await this.handleTransferProof(conversation, message, actionId, mediaUrl);
      case 'awaiting_transfer_confirmation': return await this.handleAwaitingTransferConfirmation(conversation, message, actionId);
      case 'confirming_order': return await this.handleOrderConfirmation(conversation, message, actionId);
      case 'editing_order': return await this.handleEditOrder(conversation, message, actionId);
      case 'editing_item': return await this.handleEditItem(conversation, message, actionId);
      case 'using_existing_data': return await this.handleExistingData(conversation, message, actionId);
      case 'tracking_order': return await this.handleTracking(conversation, message);
      case 'live_chat': return await this.handleLiveChat(conversation, message);
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
      const deliveryInfo = await deliveryService.getDeliveryInfoForWhatsApp();
      await whatsappService.sendMessage(to, deliveryInfo);
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

    const catalogInfo = await catalogService.getCatalogForAI();
    const deliveryInfo = await deliveryService.getNeighborhoodListForAI();
    const aiResponse = await aiService.generateResponse(message, conversation.messageHistory, catalogInfo, deliveryInfo);
    await whatsappService.sendMessage(to, aiResponse);

    const mainTpl = contentTemplateService.getTemplate('mainMenu');
    if (mainTpl) await whatsappService.sendTemplate(to, mainTpl);
  }

  // ===== CATEGORÍA — Lista interactiva =====
  async handleCategorySelection(conversation, message, actionId) {
    const to = conversation.whatsappNumber;
    let selectedCategory = null;

    if (actionId && actionId.startsWith('cat_')) {
      const categoryId = actionId.replace('cat_', '');
      selectedCategory = await Category.findById(categoryId);
    }

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

    conversation.selectedCategory = selectedCategory._id;
    conversation.state = 'selecting_product';

    const productsTpl = contentTemplateService.getProductTemplate(selectedCategory._id.toString());
    if (productsTpl) {
      await whatsappService.sendTemplate(to, productsTpl);
    } else {
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
      const products = await catalogService.getProductsByCategory(conversation.selectedCategory);
      selectedProduct = products.find((p) =>
        message.toLowerCase().includes(p.name.toLowerCase())
      );
    }

    if (!selectedProduct) {
      await whatsappService.sendMessage(to, 'Selecciona un producto de la lista, mi amor 🍓');
      return;
    }

    // Inicializar item actual con el precio base más bajo
    const lowestPrice = selectedProduct.sizes?.length > 0
      ? selectedProduct.sizes[0].price
      : selectedProduct.basePrice;

    conversation.currentItem = {
      product: selectedProduct._id,
      productName: selectedProduct.name,
      basePrice: lowestPrice,
      toppings: [],
      sauces: [],
      quantity: 1,
      itemTotal: lowestPrice
    };
    conversation.remainingIncludedToppings = selectedProduct.includedToppings || 0;
    conversation.remainingIncludedSauces = selectedProduct.includedSauces || 0;

    // ¿Tiene tamaños?
    if (selectedProduct.sizes && selectedProduct.sizes.length > 0) {
      conversation.state = 'selecting_size';
      const sizeTpl = contentTemplateService.getProductSizeTemplate(selectedProduct._id.toString());
      if (sizeTpl) {
        await whatsappService.sendTemplate(to, sizeTpl);
      } else {
        let msg = `📏 *${selectedProduct.name}*\n¿Qué tamaño prefieres, mi amor?\n\n`;
        selectedProduct.sizes.forEach((size) => {
          msg += `• ${size.name}: ${formatCurrency(size.price)}\n`;
        });
        await whatsappService.sendMessage(to, msg);
      }
      return;
    }

    // ¿Tiene opciones?
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

    // ¿Tiene variantes?
    if (selectedProduct.variants && selectedProduct.variants.length > 0) {
      conversation.state = 'selecting_variant';
      const variantsTpl = contentTemplateService.getProductVariantTemplate(selectedProduct._id.toString());
      if (variantsTpl) {
        await whatsappService.sendTemplate(to, variantsTpl);
      }
      return;
    }

    await this.goToToppingsOrNext(conversation, selectedProduct);
  }

  // ===== TAMAÑO DEL PRODUCTO =====
  async handleSizeSelection(conversation, message, actionId) {
    const to = conversation.whatsappNumber;
    const product = await Product.findById(conversation.currentItem.product);

    let selectedSize = null;

    if (actionId && actionId.startsWith('size_')) {
      const sizeName = actionId.replace('size_', '');
      selectedSize = product.sizes.find((s) => s.name.toLowerCase() === sizeName);
    }

    if (!selectedSize) {
      selectedSize = product.sizes.find((s) =>
        message.toLowerCase().includes(s.name.toLowerCase())
      );
    }

    if (!selectedSize) {
      await whatsappService.sendMessage(to, 'Por favor selecciona un tamaño válido, corazón 📏🍓');
      return;
    }

    conversation.currentItem.selectedSize = { name: selectedSize.name, price: selectedSize.price };
    conversation.currentItem.basePrice = selectedSize.price;
    conversation.currentItem.itemTotal = selectedSize.price;

    await whatsappService.sendMessage(to, `📏 ¡Tamaño *${selectedSize.name}* (${formatCurrency(selectedSize.price)})! Perfecto, mi amor 😍`);

    // Continuar con opciones, variantes o toppings
    if (product.options && product.options.length > 0) {
      conversation.state = 'selecting_option';
      const optionsTpl = contentTemplateService.getProductOptionTemplate(product._id.toString());
      if (optionsTpl) await whatsappService.sendTemplate(to, optionsTpl);
      return;
    }

    if (product.variants && product.variants.length > 0) {
      conversation.state = 'selecting_variant';
      const variantsTpl = contentTemplateService.getProductVariantTemplate(product._id.toString());
      if (variantsTpl) await whatsappService.sendTemplate(to, variantsTpl);
      return;
    }

    await this.goToToppingsOrNext(conversation, product);
  }

  // ===== OPCIONES DEL PRODUCTO =====
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

  // ===== VARIANTES DEL PRODUCTO =====
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

      list += '✏️ *Escribe el nombre del topping (o varios separados por coma)*';
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

  // ===== TOPPINGS: Usuario escribe nombre (soporta múltiples separados por coma) =====
  async handleTypingTopping(conversation, message) {
    const to = conversation.whatsappNumber;
    const inputText = message.trim();

    // Separar por comas, "y", "+"
    const toppingNames = inputText
      .split(/[,\+]|\s+y\s+/i)
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (toppingNames.length === 0) {
      await whatsappService.sendMessage(to, 'Escribe el nombre del topping, corazón 🍓');
      return;
    }

    let addedToppings = [];
    let notFoundToppings = [];

    for (const toppingName of toppingNames) {
      const regex = new RegExp(toppingName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const topping = await Topping.findOne({ name: regex, isActive: true });

      if (!topping) {
        notFoundToppings.push(toppingName);
        continue;
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
      addedToppings.push(`✅ *${topping.name}*${priceText}`);
    }

    if (addedToppings.length > 0) {
      let confirmMsg = addedToppings.join('\n') + ' agregado(s) 🧁';
      await whatsappService.sendMessage(to, confirmMsg);
    }

    if (notFoundToppings.length > 0) {
      await whatsappService.sendMessage(to, `No encontré: ${notFoundToppings.join(', ')} 😔 Revisa el nombre, corazón.`);
      if (addedToppings.length === 0) return;
    }

    // Preguntar si quiere otro
    conversation.state = 'another_topping';
    const tpl = contentTemplateService.getTemplate('anotherTopping');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
    else await whatsappService.sendMessage(to, '¿Quieres agregar otro topping? (sí/no)');
  }

  // ===== TOPPINGS: ¿Otro? (con opción de cambiar) =====
  async handleAnotherTopping(conversation, message, actionId) {
    if (actionId === 'yes_another' || message.toLowerCase().includes('sí') || message.toLowerCase().includes('si') || message.toLowerCase().includes('agregar')) {
      conversation.state = 'typing_topping';
      await whatsappService.sendMessage(conversation.whatsappNumber, '✏️ Escribe el nombre del siguiente topping (o varios separados por coma):');
      return;
    }

    if (actionId === 'change_topping' || message.toLowerCase().includes('cambiar')) {
      return await this.showToppingChangeOptions(conversation);
    }

    if (actionId === 'no_more' || message.toLowerCase().includes('no')) {
      await this.goToSauceOrNext(conversation);
      return;
    }

    const tpl = contentTemplateService.getTemplate('anotherTopping');
    if (tpl) await whatsappService.sendTemplate(conversation.whatsappNumber, tpl);
  }

  // Mostrar opciones para cambiar topping
  async showToppingChangeOptions(conversation) {
    const to = conversation.whatsappNumber;
    const currentToppings = conversation.currentItem.toppings || [];

    if (currentToppings.length === 0) {
      await whatsappService.sendMessage(to, 'No tienes toppings agregados aún, mi amor 🍓');
      conversation.state = 'typing_topping';
      await whatsappService.sendMessage(to, '✏️ Escribe el nombre del topping que quieras:');
      return;
    }

    let msg = '🔄 *Tus toppings actuales:*\n\n';
    currentToppings.forEach((t, i) => {
      const priceText = t.price > 0 ? ` (${formatCurrency(t.price)})` : ' (incluido)';
      msg += `${i + 1}. ${t.name}${priceText}\n`;
    });
    msg += '\n✏️ Escribe el *número* del topping que quieres cambiar o "eliminar [número]" para quitarlo.';

    conversation.state = 'changing_topping';
    await whatsappService.sendMessage(to, msg);
  }

  // ===== CAMBIAR TOPPING =====
  async handleChangingTopping(conversation, message, actionId) {
    const to = conversation.whatsappNumber;
    const currentToppings = conversation.currentItem.toppings || [];
    const msgLower = message.toLowerCase().trim();

    // Eliminar topping
    if (msgLower.startsWith('eliminar') || msgLower.startsWith('quitar') || msgLower.startsWith('borrar')) {
      const numStr = msgLower.replace(/^(eliminar|quitar|borrar)\s*/, '');
      const index = parseInt(numStr, 10) - 1;

      if (isNaN(index) || index < 0 || index >= currentToppings.length) {
        await whatsappService.sendMessage(to, 'Número inválido, corazón. Intenta de nuevo 🍓');
        return;
      }

      const removed = currentToppings[index];
      conversation.currentItem.itemTotal -= removed.price;
      conversation.currentItem.toppings.splice(index, 1);

      await whatsappService.sendMessage(to, `🗑️ *${removed.name}* eliminado.`);
      conversation.state = 'another_topping';
      const tpl = contentTemplateService.getTemplate('anotherTopping');
      if (tpl) await whatsappService.sendTemplate(to, tpl);
      return;
    }

    // Cambiar topping por número
    const index = parseInt(msgLower, 10) - 1;
    if (!isNaN(index) && index >= 0 && index < currentToppings.length) {
      const removed = currentToppings[index];
      conversation.currentItem.itemTotal -= removed.price;
      conversation.currentItem.toppings.splice(index, 1);

      await whatsappService.sendMessage(to, `🔄 *${removed.name}* eliminado. Ahora escribe el topping de reemplazo:`);
      conversation.state = 'typing_topping';
      return;
    }

    await whatsappService.sendMessage(to, 'Escribe el número del topping a cambiar o "eliminar [número]", corazón 🍓');
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

      let msg = `🛒 ¡Agregado al carrito!\n\n`;
      msg += `Productos: ${conversation.cart.length}\n`;
      msg += `Subtotal: ${formatCurrency(cartTotal)}\n`;
      msg += `_El domicilio se calcula según tu barrio_`;

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

      const customer = await Customer.findOne({ whatsappNumber: conversation.whatsappNumber });
      if (customer && customer.fullName && customer.address && customer.phone && customer.neighborhood) {
        const deliveryResult = await deliveryService.findNeighborhoodPrice(customer.neighborhood);
        const deliveryPrice = deliveryResult ? deliveryResult.price : config.business.deliveryPrice;

        conversation.tempCustomerData = {
          fullName: customer.fullName,
          neighborhood: customer.neighborhood,
          deliveryPrice,
          address: customer.address,
          addressReference: customer.addressReference,
          phone: customer.phone
        };

        let msg = `📋 Tengo tus datos guardados:\n\n`;
        msg += `👤 ${customer.fullName}\n`;
        msg += `🏘️ ${customer.neighborhood} (Domicilio: ${formatCurrency(deliveryPrice)})\n`;
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
    conversation.state = 'entering_neighborhood';
    await whatsappService.sendMessage(to, `¡Lindo nombre, ${message.trim()}! 💖\n\n🏘️ Escribe el *nombre de tu barrio* para calcular el domicilio:`);
  }

  // ===== BARRIO =====
  async handleNeighborhood(conversation, message) {
    const to = conversation.whatsappNumber;
    if (message.trim().length < 2) {
      await whatsappService.sendMessage(to, 'Necesito el nombre de tu barrio, corazón 🏘️');
      return;
    }

    if (message.trim().toLowerCase() === 'barrios') {
      const deliveryInfo = await deliveryService.getDeliveryInfoForWhatsApp();
      await whatsappService.sendMessage(to, deliveryInfo);
      await whatsappService.sendMessage(to, '✏️ Ahora escribe el nombre de tu barrio:');
      return;
    }

    const result = await deliveryService.findNeighborhoodPrice(message.trim());

    if (!result) {
      await whatsappService.sendMessage(
        to,
        `No encontré el barrio "${message.trim()}" en nuestra lista 😔\n\nPor favor revisa el nombre e intenta de nuevo, o escribe otro barrio cercano.\n\nSi quieres ver todos los barrios disponibles, escribe *"barrios"*`
      );
      return;
    }

    conversation.tempCustomerData.neighborhood = result.neighborhood;
    conversation.tempCustomerData.deliveryPrice = result.price;
    conversation.state = 'entering_address';
    await whatsappService.sendMessage(
      to,
      `✅ *${result.neighborhood}* — Domicilio: *${formatCurrency(result.price)}*\n\n📍 Ahora escribe tu *dirección exacta* de entrega:`
    );
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
      await this.showOrderSummary(conversation);
      conversation.state = 'confirming_order';
      const tpl = contentTemplateService.getTemplate('confirmOrder');
      if (tpl) await whatsappService.sendTemplate(to, tpl);
      return;
    }

    if (actionId === 'transferencia' || message.toLowerCase().includes('transferencia')) {
      conversation.tempCustomerData.paymentMethod = 'transferencia';

      // Enviar imagen de BRE-B para transferencia
      const transferImageUrl = config.business.transferImageUrl;
      if (transferImageUrl) {
        await whatsappService.sendMediaMessage(
          to,
          '💸 ¡Perfecto, mi amor! Realiza la transferencia a esta cuenta:',
          transferImageUrl
        );
      } else {
        await whatsappService.sendMessage(to, '💸 ¡Perfecto, mi amor! Realiza la transferencia y envíanos el comprobante 📸');
      }

      // Mostrar el total a transferir
      const cartTotal = conversation.cart.reduce((sum, item) => sum + item.itemTotal, 0);
      const deliveryPrice = conversation.tempCustomerData.deliveryPrice || config.business.deliveryPrice;
      const total = cartTotal + deliveryPrice;
      await whatsappService.sendMessage(to, `💰 *Total a transferir: ${formatCurrency(total)}*`);

      conversation.state = 'awaiting_transfer_proof';
      const tpl = contentTemplateService.getTemplate('transferButtons');
      if (tpl) await whatsappService.sendTemplate(to, tpl);
      return;
    }

    const tpl = contentTemplateService.getTemplate('paymentMethod');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
  }

  // ===== ESPERANDO COMPROBANTE DE TRANSFERENCIA =====
  async handleTransferProof(conversation, message, actionId, mediaUrl) {
    const to = conversation.whatsappNumber;

    if (actionId === 'transfer_cancel' || message.toLowerCase().includes('cancelar')) {
      conversation.tempCustomerData.paymentMethod = '';
      conversation.state = 'selecting_payment';
      await whatsappService.sendMessage(to, '❌ Transferencia cancelada. ¿Cómo prefieres pagar?');
      const tpl = contentTemplateService.getTemplate('paymentMethod');
      if (tpl) await whatsappService.sendTemplate(to, tpl);
      return;
    }

    if (actionId === 'transfer_done') {
      await whatsappService.sendMessage(to, '📸 ¡Genial! Envíame una *foto del comprobante* de la transferencia, corazón 💸');
      return;
    }

    // Recibió imagen del comprobante
    if (mediaUrl) {
      conversation.tempCustomerData.transferProofUrl = mediaUrl;
      conversation.state = 'awaiting_transfer_confirmation';

      await whatsappService.sendMessage(
        to,
        '✅ ¡Comprobante recibido, mi amor! 💖\n\n' +
        '🔍 Estamos verificando tu transferencia... Nuestro equipo la revisará en un momentico.\n\n' +
        '⏳ Te avisaremos apenas esté confirmada. ¡Gracias por tu paciencia, corazón! 🍓✨'
      );

      // Emitir evento al panel admin
      const cartTotal = conversation.cart.reduce((sum, item) => sum + item.itemTotal, 0);
      const deliveryPrice = conversation.tempCustomerData.deliveryPrice || config.business.deliveryPrice;
      socketService.emitTransferPending({
        whatsappNumber: to,
        customerName: conversation.tempCustomerData.fullName,
        total: cartTotal + deliveryPrice,
        transferProofUrl: mediaUrl,
        timestamp: new Date()
      });
      return;
    }

    await whatsappService.sendMessage(to, '📸 Necesito que me envíes una *foto del comprobante*, mi amor. Si ya transferiste, dale al botón "Ya transferí" 💸');
    const tpl = contentTemplateService.getTemplate('transferButtons');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
  }

  // ===== ESPERANDO CONFIRMACIÓN DEL ADMIN =====
  async handleAwaitingTransferConfirmation(conversation, message, actionId) {
    const to = conversation.whatsappNumber;
    await whatsappService.sendMessage(
      to,
      '⏳ Tu transferencia aún está siendo verificada, corazón. Te avisaremos apenas esté confirmada 🍓💖'
    );
  }

  // Método llamado desde el API cuando el admin confirma la transferencia
  async confirmTransfer(whatsappNumber) {
    const conversation = await Conversation.findOne({ whatsappNumber, isActive: true });
    if (!conversation || conversation.state !== 'awaiting_transfer_confirmation') {
      return false;
    }

    const to = conversation.whatsappNumber;

    await whatsappService.sendMessage(
      to,
      '🎉 ¡Tu transferencia ha sido *confirmada*, mi amor! 💖✨\n\n¡Gracias por confiar en Fresa Nova! 🍓'
    );

    // Mostrar resumen y pedir confirmación (sin botón de cancelar)
    await this.showOrderSummary(conversation);
    conversation.state = 'confirming_order';
    // Usar template sin cancelar para post-transferencia
    conversation.tempCustomerData.transferConfirmed = true;
    await conversation.save();

    const tpl = contentTemplateService.getTemplate('confirmOrderTransfer');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
    else {
      const tpl2 = contentTemplateService.getTemplate('confirmOrder');
      if (tpl2) await whatsappService.sendTemplate(to, tpl2);
    }

    return true;
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
      conversation.state = 'live_chat';

      await whatsappService.sendMessage(to, receipt);
      await whatsappService.sendMessage(
        to,
        '💬 Ahora puedes hablar directamente con un asesor si tienes alguna duda o pregunta.\n\n' +
        '📦 Te seguiremos enviando las actualizaciones de tu pedido.\n\n' +
        'Escribe *"menú"* cuando quieras volver al menú principal 🍓✨'
      );

      // Emitir evento de nuevo pedido
      socketService.emitNewOrder(order);
      return;
    }

    if (actionId === 'edit_order' || message.toLowerCase().includes('editar')) {
      return await this.showEditOptions(conversation);
    }

    if (actionId === 'cancel_order' || message.toLowerCase().includes('cancelar') || message.toLowerCase().includes('no')) {
      await this.resetConversation(conversation);
      return;
    }

    const isTransferConfirmed = conversation.tempCustomerData?.transferConfirmed;
    const tpl = contentTemplateService.getTemplate(isTransferConfirmed ? 'confirmOrderTransfer' : 'confirmOrder');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
  }

  // ===== EDITAR PEDIDO =====
  async showEditOptions(conversation) {
    const to = conversation.whatsappNumber;
    conversation.state = 'editing_order';
    const tpl = contentTemplateService.getTemplate('editOrderOptions');
    if (tpl) {
      await whatsappService.sendTemplate(to, tpl);
    } else {
      await whatsappService.sendMessage(to, '✏️ ¿Qué deseas editar?\n1. 🛒 Productos\n2. 📍 Datos de entrega\n3. 💰 Método de pago');
    }
  }

  async handleEditOrder(conversation, message, actionId) {
    const to = conversation.whatsappNumber;

    if (actionId === 'edit_products' || message.includes('1') || message.toLowerCase().includes('producto')) {
      return await this.showEditItemOptions(conversation);
    }

    if (actionId === 'edit_delivery' || message.includes('2') || message.toLowerCase().includes('datos') || message.toLowerCase().includes('entrega') || message.toLowerCase().includes('direc')) {
      conversation.tempCustomerData = conversation.tempCustomerData || {};
      // Mantener el método de pago y transferencia confirmada si existe
      const paymentMethod = conversation.tempCustomerData.paymentMethod;
      const transferConfirmed = conversation.tempCustomerData.transferConfirmed;
      const transferProofUrl = conversation.tempCustomerData.transferProofUrl;
      conversation.tempCustomerData = { paymentMethod, transferConfirmed, transferProofUrl };
      conversation.state = 'entering_name';
      await whatsappService.sendMessage(to, '📝 Vamos a actualizar tus datos de entrega.\n\n👤 Escribe tu *nombre completo*:');
      return;
    }

    if (actionId === 'edit_payment' || message.includes('3') || message.toLowerCase().includes('pago')) {
      conversation.state = 'selecting_payment';
      const tpl = contentTemplateService.getTemplate('paymentMethod');
      if (tpl) await whatsappService.sendTemplate(to, tpl);
      return;
    }

    const tpl = contentTemplateService.getTemplate('editOrderOptions');
    if (tpl) await whatsappService.sendTemplate(to, tpl);
  }

  async showEditItemOptions(conversation) {
    const to = conversation.whatsappNumber;

    if (conversation.cart.length === 0) {
      await whatsappService.sendMessage(to, 'Tu carrito está vacío, mi amor 🍓');
      await this.showEditOptions(conversation);
      return;
    }

    let msg = '🛒 *Tus productos:*\n\n';
    conversation.cart.forEach((item, i) => {
      msg += `${i + 1}. *${item.productName}*`;
      if (item.selectedSize?.name) msg += ` (${item.selectedSize.name})`;
      msg += ` — ${formatCurrency(item.itemTotal)}\n`;
    });
    msg += '\n✏️ Escribe el *número* del producto a eliminar, o "agregar" para añadir otro, o "listo" para volver al resumen.';

    conversation.state = 'editing_item';
    await whatsappService.sendMessage(to, msg);
  }

  async handleEditItem(conversation, message, actionId) {
    const to = conversation.whatsappNumber;
    const msgLower = message.toLowerCase().trim();

    if (msgLower === 'listo' || msgLower === 'volver' || msgLower === 'resumen') {
      if (conversation.cart.length === 0) {
        await whatsappService.sendMessage(to, 'Tu carrito está vacío. Agrega al menos un producto 🍓');
        conversation.state = 'selecting_category';
        const catTpl = contentTemplateService.getTemplate('categories');
        if (catTpl) await whatsappService.sendTemplate(to, catTpl);
        return;
      }
      await this.showOrderSummary(conversation);
      conversation.state = 'confirming_order';
      const isTransferConfirmed = conversation.tempCustomerData?.transferConfirmed;
      const tpl = contentTemplateService.getTemplate(isTransferConfirmed ? 'confirmOrderTransfer' : 'confirmOrder');
      if (tpl) await whatsappService.sendTemplate(to, tpl);
      return;
    }

    if (msgLower === 'agregar' || msgLower.includes('añadir') || msgLower.includes('agregar')) {
      conversation.state = 'selecting_category';
      await whatsappService.sendMessage(to, '¡Perfecto, agrega más! 🍓✨');
      const catTpl = contentTemplateService.getTemplate('categories');
      if (catTpl) await whatsappService.sendTemplate(to, catTpl);
      return;
    }

    const index = parseInt(msgLower, 10) - 1;
    if (!isNaN(index) && index >= 0 && index < conversation.cart.length) {
      const removed = conversation.cart[index];
      conversation.cart.splice(index, 1);
      await whatsappService.sendMessage(to, `🗑️ *${removed.productName}* eliminado del carrito.`);
      return await this.showEditItemOptions(conversation);
    }

    await whatsappService.sendMessage(to, 'Escribe el número del producto a eliminar, "agregar" o "listo", corazón 🍓');
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

  // ===== CHAT EN VIVO CON ASESOR =====
  async handleLiveChat(conversation, message) {
    const to = conversation.whatsappNumber;

    // Permitir volver al menú
    if (['menú', 'menu', 'inicio', 'salir'].includes(message.toLowerCase().trim())) {
      conversation.state = 'idle';
      await whatsappService.sendMessage(to, '¡Gracias por escribirnos, corazón! 💖🍓');
      const mainTpl = contentTemplateService.getTemplate('mainMenu');
      if (mainTpl) await whatsappService.sendTemplate(to, mainTpl);
      return;
    }

    // Emitir mensaje al panel admin via Socket.IO
    socketService.emitLiveChatMessage({
      whatsappNumber: to,
      message,
      direction: 'inbound',
      timestamp: new Date()
    });

    // No responder automáticamente — el asesor real responderá desde el panel
  }

  // ===== CHAT LIBRE CON IA =====
  async handleFreeChat(conversation, message) {
    const to = conversation.whatsappNumber;
    const catalogInfo = await catalogService.getCatalogForAI();
    const deliveryInfo = await deliveryService.getNeighborhoodListForAI();
    const aiResponse = await aiService.generateResponse(message, conversation.messageHistory, catalogInfo, deliveryInfo);
    await whatsappService.sendMessage(to, aiResponse);
    conversation.state = 'idle';
  }

  // ===== HELPERS DE NAVEGACIÓN =====

  async goToToppingsOrNext(conversation, product) {
    const to = conversation.whatsappNumber;

    if (product.allowsToppings) {
      conversation.state = 'asking_toppings';
      const priceDisplay = conversation.currentItem.selectedSize
        ? formatCurrency(conversation.currentItem.selectedSize.price)
        : formatCurrency(product.basePrice);
      await whatsappService.sendMessage(to, `😍 *${product.name}* — ${priceDisplay} ¡Excelente elección!`);
      const tpl = contentTemplateService.getTemplate('wantToppings');
      if (tpl) await whatsappService.sendTemplate(to, tpl);
      else await whatsappService.sendMessage(to, '¿Quieres agregar toppings? (sí/no)');
      return;
    }

    await this.goToSauceOrNext(conversation);
  }

  async goToSauceOrNext(conversation) {
    const to = conversation.whatsappNumber;
    const product = await Product.findById(conversation.currentItem.product);

    if (product && product.allowsSauces) {
      conversation.state = 'asking_sauce';
      const tpl = contentTemplateService.getTemplate('wantSauce');
      if (tpl) await whatsappService.sendTemplate(to, tpl);
      else await whatsappService.sendMessage(to, '¿Quieres elegir una salsa? (sí/no)');
      return;
    }

    await this.goToComment(conversation);
  }

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
    summary += `🍓 ${item.productName}`;
    if (item.selectedSize?.name) summary += ` (${item.selectedSize.name})`;
    summary += ` — ${formatCurrency(item.basePrice)}\n`;
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

  // Mostrar resumen del pedido completo
  async showOrderSummary(conversation) {
    const to = conversation.whatsappNumber;
    const cartTotal = conversation.cart.reduce((sum, item) => sum + item.itemTotal, 0);
    const deliveryPrice = conversation.tempCustomerData.deliveryPrice || config.business.deliveryPrice;
    const total = cartTotal + deliveryPrice;

    let summary = '🧾✨ *RESUMEN DE TU PEDIDO* ✨🧾\n━━━━━━━━━━━━━━━━━━━━━\n\n';

    conversation.cart.forEach((item, i) => {
      summary += `${i + 1}. *${item.productName}*`;
      if (item.selectedSize?.name) summary += ` (${item.selectedSize.name})`;
      summary += ` — ${formatCurrency(item.itemTotal)}\n`;
      if (item.toppings?.length > 0) summary += `   🧁 ${item.toppings.map((t) => t.name).join(', ')}\n`;
      if (item.sauces?.length > 0) summary += `   🍯 ${item.sauces.map((s) => s.name).join(', ')}\n`;
      if (item.comment) summary += `   💬 ${item.comment}\n`;
    });

    summary += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    summary += `👤 ${conversation.tempCustomerData.fullName}\n`;
    if (conversation.tempCustomerData.neighborhood) summary += `🏘️ ${conversation.tempCustomerData.neighborhood}\n`;
    summary += `📍 ${conversation.tempCustomerData.address}\n`;
    if (conversation.tempCustomerData.addressReference) summary += `🏠 ${conversation.tempCustomerData.addressReference}\n`;
    summary += `📱 ${conversation.tempCustomerData.phone}\n`;
    summary += `💳 ${conversation.tempCustomerData.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia'}\n\n`;
    summary += `📦 Subtotal: ${formatCurrency(cartTotal)}\n`;
    summary += `🚗 Domicilio (${conversation.tempCustomerData.neighborhood || config.business.city}): ${formatCurrency(deliveryPrice)}\n`;
    summary += `💵 *TOTAL: ${formatCurrency(total)}*`;

    await whatsappService.sendMessage(to, summary);
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
