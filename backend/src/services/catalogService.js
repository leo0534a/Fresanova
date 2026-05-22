// Servicio de catálogo — gestión de productos, toppings y salsas
const { Product, Category, Topping, Sauce } = require('../models');
const logger = require('../utils/logger');
const { formatCurrency } = require('../helpers/formatCurrency');

class CatalogService {
  // Obtener catálogo completo formateado para la IA
  async getCatalogForAI() {
    try {
      const categories = await Category.find({ isActive: true }).sort('displayOrder');
      const products = await Product.find({ isActive: true })
        .populate('category')
        .sort('displayOrder');
      const toppings = await Topping.find({ isActive: true }).sort('price displayOrder');
      const sauces = await Sauce.find({ isActive: true }).sort('displayOrder');

      let catalogText = '';

      for (const category of categories) {
        catalogText += `\n📌 ${category.emoji} ${category.name.toUpperCase()}\n`;
        const categoryProducts = products.filter(
          (p) => p.category._id.toString() === category._id.toString()
        );

        for (const product of categoryProducts) {
          if (product.sizes && product.sizes.length > 0) {
            // Producto con tamaños — mostrar rango de precios
            const sizesText = product.sizes.map(
              (s) => `${s.name}: ${formatCurrency(s.price)}`
            ).join(' | ');
            catalogText += `  • ${product.name}: ${sizesText}`;
          } else {
            catalogText += `  • ${product.name}: ${formatCurrency(product.basePrice)}`;
          }
          if (product.includesNote) {
            catalogText += ` (${product.includesNote})`;
          }
          if (product.variants && product.variants.length > 0) {
            const variantTexts = product.variants.map(
              (v) => `${v.name} +${formatCurrency(v.extraPrice)}`
            );
            catalogText += ` | Opciones: ${variantTexts.join(', ')}`;
          }
          if (product.options && product.options.length > 0) {
            const optionTexts = product.options.map((o) => o.name);
            catalogText += ` | Tipos: ${optionTexts.join(', ')}`;
          }
          catalogText += '\n';
        }
      }

      // Agregar toppings
      catalogText += '\n🧁 TOPPINGS DISPONIBLES:\n';
      const toppingsByPrice = {};
      for (const topping of toppings) {
        const key = topping.price;
        if (!toppingsByPrice[key]) toppingsByPrice[key] = [];
        toppingsByPrice[key].push(topping.name);
      }
      for (const [price, names] of Object.entries(toppingsByPrice)) {
        catalogText += `  ${formatCurrency(Number(price))}: ${names.join(', ')}\n`;
      }

      // Agregar salsas
      catalogText += '\n🍯 SALSAS DISPONIBLES:\n';
      for (const sauce of sauces) {
        catalogText += `  • ${sauce.name}: ${formatCurrency(sauce.price)}\n`;
      }

      return catalogText;
    } catch (error) {
      logger.error('Error obteniendo catálogo para IA:', error);
      return 'Catálogo no disponible temporalmente.';
    }
  }

  // Obtener categorías activas
  async getActiveCategories() {
    return Category.find({ isActive: true }).sort('displayOrder');
  }

  // Obtener productos por categoría
  async getProductsByCategory(categoryId) {
    return Product.find({ category: categoryId, isActive: true })
      .populate('category')
      .sort('displayOrder');
  }

  // Obtener toppings activos
  async getActiveToppings() {
    return Topping.find({ isActive: true }).sort('price displayOrder');
  }

  // Obtener salsas activas
  async getActiveSauces() {
    return Sauce.find({ isActive: true }).sort('displayOrder');
  }

  // Buscar producto por nombre (fuzzy)
  async findProductByName(name) {
    const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    return Product.findOne({ name: regex, isActive: true }).populate('category');
  }

  // Formatear categorías como menú de WhatsApp
  formatCategoriesMenu(categories) {
    let menu = '🍓✨ *MENÚ Fresanova* ✨🍓\n\n';
    menu += '¿Qué se te antoja hoy, mi amor?\n\n';

    categories.forEach((cat, index) => {
      menu += `${index + 1}️⃣ ${cat.emoji} ${cat.name}\n`;
    });

    menu += `\n${categories.length + 1}️⃣ 📦 Rastrear mi pedido`;
    menu += `\n${categories.length + 2}️⃣ 💬 Hablar con soporte`;
    menu += '\n\n_Responde con el número, corazón_ 💖';

    return menu;
  }

  // Formatear productos como lista de WhatsApp
  formatProductsList(products, categoryName) {
    let list = `${categoryName.toUpperCase()} 🍓\n\n`;

    products.forEach((product, index) => {
      list += `${index + 1}️⃣ *${product.name}*\n`;
      if (product.sizes && product.sizes.length > 0) {
        const minPrice = Math.min(...product.sizes.map((s) => s.price));
        list += `   💰 Desde ${formatCurrency(minPrice)}\n`;
        const sizesDesc = product.sizes.map((s) => `${s.name}: ${formatCurrency(s.price)}`).join(' | ');
        list += `   📐 ${sizesDesc}\n`;
      } else {
        list += `   💰 ${formatCurrency(product.basePrice)}\n`;
      }
      if (product.includesNote) {
        list += `   📝 ${product.includesNote}\n`;
      }
      list += '\n';
    });

    list += '_Escribe el número del producto que quieras, bebé_ ✨';

    return list;
  }

  // Formatear toppings como lista
  formatToppingsList(toppings, includedCount = 0) {
    let list = '🧁 *TOPPINGS DISPONIBLES*\n\n';

    if (includedCount > 0) {
      list += `💝 _¡Tienes ${includedCount} topping(s) incluido(s) en tu producto!_\n\n`;
    }

    const grouped = {};
    toppings.forEach((t) => {
      const key = t.price;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    });

    let counter = 1;
    for (const [price, items] of Object.entries(grouped)) {
      list += `💰 *${formatCurrency(Number(price))}:*\n`;
      items.forEach((item) => {
        list += `  ${counter}️⃣ ${item.name}\n`;
        counter++;
      });
      list += '\n';
    }

    list += '0️⃣ No quiero toppings\n\n';
    list += '_Escribe los números separados por coma (ej: 1,3,5) o 0 para continuar_ 🍓';

    return list;
  }

  // Formatear salsas como lista
  formatSaucesList(sauces, includedCount = 0) {
    let list = '🍯 *SALSAS DISPONIBLES*\n\n';

    if (includedCount > 0) {
      list += `💝 _¡Tienes ${includedCount} salsa(s) incluida(s)!_\n\n`;
    }

    sauces.forEach((sauce, index) => {
      list += `${index + 1}️⃣ ${sauce.name} — ${formatCurrency(sauce.price)}\n`;
    });

    list += '\n0️⃣ No quiero salsa\n\n';
    list += '_Escribe el número de la salsa o 0 para continuar, corazón_ ✨';

    return list;
  }
}

module.exports = new CatalogService();
