// Script de seed — Carga el catálogo completo de Fresanova en la base de datos
const mongoose = require('mongoose');
const { config } = require('../config/env');
const { Category, Product, Topping, Sauce } = require('../models');

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

const seedDatabase = async () => {
  try {
    console.log('🍓 Conectando a MongoDB...');
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Conectado a MongoDB');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    for (const name of ['categories', 'products', 'toppings', 'sauces']) {
      if (collectionNames.includes(name)) {
        await db.dropCollection(name);
      }
    }
    console.log('🧹 Colecciones eliminadas');

    // ==================== CATEGORÍA ====================
    console.log('📁 Creando categoría...');
    const categoriesData = [
      {
        name: 'Fresas con Crema',
        slug: generateSlug('Fresas con Crema'),
        emoji: '🍓',
        description: 'Nuestras deliciosas fresas con crema y más, el clásico de Fresa Nova',
        displayOrder: 1,
        image: 'https://via.placeholder.com/400x300?text=Fresas+con+Crema'
      }
    ];

    const categories = await Category.insertMany(categoriesData);
    const [fresasCrema] = categories;
    console.log(`✅ ${categories.length} categoría creada`);

    // ==================== PRODUCTOS ====================
    console.log('🛍️ Creando productos...');
    const productsData = [
      {
        name: 'Fresa con Crema',
        slug: generateSlug('Fresa con Crema'),
        description: 'Fresas picadas, crema de la casa, oreo triturada, piazza, chips de chocolate y salsa de tu preferencia.',
        basePrice: 14900,
        category: fresasCrema._id,
        allowsToppings: true,
        allowsSauces: true,
        includedToppings: 0,
        includedSauces: 1,
        includesNote: 'Incluye salsa de tu preferencia',
        sizes: [
          { name: 'Pequeño', price: 14900 },
          { name: 'Mediano', price: 19900 },
          { name: 'Grande', price: 23900 }
        ],
        displayOrder: 1,
        isFeatured: true
      },
      {
        name: 'Durazno con Crema',
        slug: generateSlug('Durazno con Crema'),
        description: 'Durazno picado, crema de la casa, oreo triturada, piazza, chips de chocolate y salsa de tu preferencia.',
        basePrice: 14900,
        category: fresasCrema._id,
        allowsToppings: true,
        allowsSauces: true,
        includedToppings: 0,
        includedSauces: 1,
        includesNote: 'Incluye salsa de tu preferencia',
        sizes: [
          { name: 'Pequeño', price: 14900 },
          { name: 'Mediano', price: 19900 },
          { name: 'Grande', price: 23900 }
        ],
        displayOrder: 2
      },
      {
        name: 'Triple Tentación de Chocolate',
        slug: generateSlug('Triple Tentacion de Chocolate'),
        description: 'Fresas picadas, crema de la casa, oreo triturada, chips de chocolates, piazza, brownie y nutella.',
        basePrice: 19500,
        category: fresasCrema._id,
        allowsToppings: true,
        allowsSauces: false,
        includedToppings: 0,
        includedSauces: 0,
        sizes: [
          { name: 'Pequeño', price: 19500 },
          { name: 'Mediano', price: 24900 },
          { name: 'Grande', price: 27900 }
        ],
        displayOrder: 3,
        isFeatured: true
      },
      {
        name: 'Tentación Blanca',
        slug: generateSlug('Tentacion Blanca'),
        description: 'Fresas picadas, crema de la casa, oreo triturada, leche en polvo, piazza, chocorramo y mamut.',
        basePrice: 18900,
        category: fresasCrema._id,
        allowsToppings: true,
        allowsSauces: false,
        includedToppings: 0,
        includedSauces: 0,
        sizes: [
          { name: 'Pequeño', price: 18900 },
          { name: 'Mediano', price: 23900 },
          { name: 'Grande', price: 26900 }
        ],
        displayOrder: 4
      },
      {
        name: 'Barquillo de Fresa Nova',
        slug: generateSlug('Barquillo de Fresa Nova'),
        description: 'Fresas enteras, chocolate derretido, leche en polvo, masmelo y piazza.',
        basePrice: 14900,
        category: fresasCrema._id,
        allowsToppings: true,
        allowsSauces: false,
        includedToppings: 0,
        includedSauces: 0,
        sizes: [],
        displayOrder: 5
      },
      {
        name: 'Super Bowl de Fresa Nova',
        slug: generateSlug('Super Bowl de Fresa Nova'),
        description: 'Fresas enteras, chocolate derretido, chips de chocolate, leche en polvo, crema de la casa, piazza y gol.',
        basePrice: 23900,
        category: fresasCrema._id,
        allowsToppings: true,
        allowsSauces: false,
        includedToppings: 0,
        includedSauces: 0,
        sizes: [],
        displayOrder: 6,
        isFeatured: true
      }
    ];

    const products = await Product.insertMany(productsData);
    console.log(`✅ ${products.length} productos creados`);

    // ==================== TOPPINGS ====================
    console.log('🧁 Creando toppings...');
    const toppings = await Topping.insertMany([
      // Toppings $2.000
      { name: 'Mamut', price: 2000, priceGroup: '2000', displayOrder: 1 },
      { name: 'Piazza', price: 2000, priceGroup: '2000', displayOrder: 2 },
      { name: 'Oreo', price: 2000, priceGroup: '2000', displayOrder: 3 },
      { name: 'Chips chocolate', price: 2000, priceGroup: '2000', displayOrder: 4 },
      { name: 'Zucarita', price: 2000, priceGroup: '2000', displayOrder: 5 },
      { name: 'Maní triturado', price: 2000, priceGroup: '2000', displayOrder: 6 },
      { name: 'Quipito', price: 2000, priceGroup: '2000', displayOrder: 7 },
      { name: 'Masmelo', price: 2000, priceGroup: '2000', displayOrder: 8 },
      { name: 'Leche en polvo', price: 2000, priceGroup: '2000', displayOrder: 9 },
      { name: 'Milo', price: 2000, priceGroup: '2000', displayOrder: 10 },
      { name: 'Gol', price: 2000, priceGroup: '2000', displayOrder: 11 },
      { name: 'Burbuja Jet', price: 2000, priceGroup: '2000', displayOrder: 12 },
      { name: 'Chocorramo', price: 2000, priceGroup: '2000', displayOrder: 13 },
      { name: 'Moritas', price: 2000, priceGroup: '2000', displayOrder: 14 },
      // Toppings $3.000
      { name: 'Biscolata', price: 3000, priceGroup: '3000', displayOrder: 15 },
      { name: 'M & M', price: 3000, priceGroup: '3000', displayOrder: 16 },
      // Toppings Premium $3.500
      { name: 'Brownie', price: 3500, priceGroup: '3500', displayOrder: 17 },
      { name: 'Nutella', price: 3500, priceGroup: '3500', displayOrder: 18 }
    ]);
    console.log(`✅ ${toppings.length} toppings creados`);

    // ==================== SALSAS (gratuitas) ====================
    console.log('🍯 Creando salsas...');
    const sauces = await Sauce.insertMany([
      { name: 'Leche Condensada', price: 0, displayOrder: 1 },
      { name: 'Chocolate', price: 0, displayOrder: 2 },
      { name: 'Arequipe', price: 0, displayOrder: 3 }
    ]);
    console.log(`✅ ${sauces.length} salsas creadas`);

    console.log('\n🍓✨ ¡Seed completado exitosamente!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📁 Categorías: ${categories.length}`);
    console.log(`🛍️ Productos: ${products.length}`);
    console.log(`🧁 Toppings: ${toppings.length}`);
    console.log(`🍯 Salsas: ${sauces.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedDatabase();
