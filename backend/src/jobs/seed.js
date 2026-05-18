// Script de seed — Carga el catálogo completo de Fresata en la base de datos
const mongoose = require('mongoose');
const { config } = require('../config/env');
const { Category, Product, Topping, Sauce } = require('../models');

// Generar slug a partir de un nombre
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

    // Limpiar datos existentes y borrar índices para evitar conflictos
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    for (const name of ['categories', 'products', 'toppings', 'sauces']) {
      if (collectionNames.includes(name)) {
        await db.dropCollection(name);
      }
    }
    console.log('🧹 Colecciones eliminadas');

    // ==================== CATEGORÍAS ====================
    console.log('📁 Creando categorías...');
    const categoriesData = [
      {
        name: 'Fresas con Crema',
        slug: generateSlug('Fresas con Crema'),
        emoji: '🍓',
        description: 'Nuestras deliciosas fresas con crema, el clásico de Fresata',
        displayOrder: 1,
        image: 'https://via.placeholder.com/400x300?text=Fresas+con+Crema'
      },
      {
        name: 'Bebidas',
        slug: generateSlug('Bebidas'),
        emoji: '🥤',
        description: 'Refrescantes bebidas artesanales',
        displayOrder: 2,
        image: 'https://via.placeholder.com/400x300?text=Bebidas'
      },
      {
        name: 'Fresas con Chocolate',
        slug: generateSlug('Fresas con Chocolate'),
        emoji: '🍫',
        description: 'Fresas bañadas en el más delicioso chocolate',
        displayOrder: 3,
        image: 'https://via.placeholder.com/400x300?text=Fresas+con+Chocolate'
      }
    ];

    const categories = await Category.insertMany(categoriesData);
    const [fresasCrema, bebidas, fresasChoco] = categories;
    console.log(`✅ ${categories.length} categorías creadas`);

    // ==================== PRODUCTOS ====================
    console.log('🛍️ Creando productos...');
    const productsData = [
      // --- Fresas con Crema ---
      {
        name: 'Fresata Classic',
        slug: generateSlug('Fresata Classic'),
        description: 'La clásica combinación de fresas frescas con crema. Incluye arequipe o leche condensada.',
        basePrice: 20000,
        category: fresasCrema._id,
        allowsToppings: true,
        allowsSauces: true,
        includedToppings: 0,
        includedSauces: 1,
        includesNote: 'Incluye arequipe o leche condensada',
        displayOrder: 1,
        isFeatured: true,
        image: 'https://via.placeholder.com/400x300?text=Fresata+Classic'
      },
      {
        name: 'Fresata Match',
        slug: generateSlug('Fresata Match'),
        description: 'Fresas con crema y la combinación perfecta. Incluye 1 topping clásico + 1 salsa.',
        basePrice: 22000,
        category: fresasCrema._id,
        allowsToppings: true,
        allowsSauces: true,
        includedToppings: 1,
        includedSauces: 1,
        includesNote: 'Incluye 1 topping clásico + 1 salsa',
        displayOrder: 2,
        image: 'https://via.placeholder.com/400x300?text=Fresata+Match'
      },
      {
        name: 'Fresata Forever',
        slug: generateSlug('Fresata Forever'),
        description: 'La experiencia completa de Fresata. Incluye 2 toppings clásicos + 1 salsa.',
        basePrice: 25000,
        category: fresasCrema._id,
        allowsToppings: true,
        allowsSauces: true,
        includedToppings: 2,
        includedSauces: 1,
        includesNote: 'Incluye 2 toppings clásicos + 1 salsa',
        displayOrder: 3,
        isFeatured: true,
        image: 'https://via.placeholder.com/400x300?text=Fresata+Forever'
      },
      {
        name: 'Fresata & Durazno',
        slug: generateSlug('Fresata y Durazno'),
        description: 'Fresas y durazno con crema. Incluye arequipe o leche condensada.',
        basePrice: 20000,
        category: fresasCrema._id,
        allowsToppings: true,
        allowsSauces: true,
        includedToppings: 0,
        includedSauces: 1,
        includesNote: 'Incluye arequipe o leche condensada',
        displayOrder: 4,
        image: 'https://via.placeholder.com/400x300?text=Fresata+Durazno'
      },
      {
        name: 'Fresata Minikids',
        slug: generateSlug('Fresata Minikids'),
        description: 'Porción especial para los más pequeños. Incluye 1 topping clásico + 1 salsa.',
        basePrice: 15000,
        category: fresasCrema._id,
        allowsToppings: true,
        allowsSauces: true,
        includedToppings: 1,
        includedSauces: 1,
        includesNote: 'Incluye 1 topping clásico + 1 salsa',
        displayOrder: 5,
        image: 'https://via.placeholder.com/400x300?text=Fresata+Minikids'
      },

      // --- Bebidas ---
      {
        name: 'Pink Limonada',
        slug: generateSlug('Pink Limonada'),
        description: 'Limonada rosa refrescante y artesanal.',
        basePrice: 12000,
        category: bebidas._id,
        allowsToppings: false,
        allowsSauces: false,
        variants: [{ name: 'Con soda', extraPrice: 2000 }],
        displayOrder: 1,
        image: 'https://via.placeholder.com/400x300?text=Pink+Limonada'
      },
      {
        name: 'Milo Crema',
        slug: generateSlug('Milo Crema'),
        description: 'Delicioso Milo cremoso preparado con amor.',
        basePrice: 15000,
        category: bebidas._id,
        allowsToppings: false,
        allowsSauces: false,
        displayOrder: 2,
        image: 'https://via.placeholder.com/400x300?text=Milo+Crema'
      },
      {
        name: 'Malteada Fresata',
        slug: generateSlug('Malteada Fresata'),
        description: 'Nuestra malteada signature con sabor a fresas.',
        basePrice: 18000,
        category: bebidas._id,
        allowsToppings: false,
        allowsSauces: false,
        displayOrder: 3,
        isFeatured: true,
        image: 'https://via.placeholder.com/400x300?text=Malteada+Fresata'
      },
      {
        name: 'Pink Ice Coffee',
        slug: generateSlug('Pink Ice Coffee'),
        description: 'Café helado rosado con un toque especial Fresata.',
        basePrice: 15000,
        category: bebidas._id,
        allowsToppings: false,
        allowsSauces: false,
        displayOrder: 4,
        image: 'https://via.placeholder.com/400x300?text=Pink+Ice+Coffee'
      },

      // --- Fresas con Chocolate ---
      {
        name: 'Fresas con Chocolate',
        slug: generateSlug('Fresas con Chocolate'),
        description: 'Fresas frescas bañadas en chocolate de primera calidad.',
        basePrice: 18000,
        category: fresasChoco._id,
        allowsToppings: true,
        allowsSauces: true,
        includedToppings: 0,
        includedSauces: 0,
        options: [
          { name: 'Chocolate negro', extraPrice: 0 },
          { name: 'Chocolate blanco', extraPrice: 0 },
          { name: 'Combinado', extraPrice: 0 }
        ],
        displayOrder: 1,
        isFeatured: true,
        image: 'https://via.placeholder.com/400x300?text=Fresas+con+Chocolate'
      }
    ];

    const products = await Product.insertMany(productsData);
    console.log(`✅ ${products.length} productos creados`);

    // ==================== TOPPINGS ====================
    console.log('🧁 Creando toppings...');
    const toppings = await Topping.insertMany([
      { name: 'Oreo', price: 3000, priceGroup: '3000', displayOrder: 1 },
      { name: 'Leche en polvo', price: 3000, priceGroup: '3000', displayOrder: 2 },
      { name: 'Queso', price: 3000, priceGroup: '3000', displayOrder: 3 },
      { name: 'Chip de chocolate', price: 3000, priceGroup: '3000', displayOrder: 4 },
      { name: 'Zucarita', price: 3000, priceGroup: '3000', displayOrder: 5 },
      { name: 'Zlips', price: 3000, priceGroup: '3000', displayOrder: 6 },
      { name: 'Piazza', price: 3000, priceGroup: '3000', displayOrder: 7 },
      { name: 'Masmelo', price: 3000, priceGroup: '3000', displayOrder: 8 },
      { name: 'Milo', price: 3000, priceGroup: '3000', displayOrder: 9 },
      { name: 'Maní', price: 3000, priceGroup: '3000', displayOrder: 10 },
      { name: 'Gomitas', price: 3000, priceGroup: '3000', displayOrder: 11 },
      { name: 'Quipito', price: 3000, priceGroup: '3000', displayOrder: 12 },
      { name: 'Coco rayado', price: 3000, priceGroup: '3000', displayOrder: 13 },
      { name: 'Fresas', price: 3000, priceGroup: '3000', displayOrder: 14 },
      { name: 'Nutella', price: 4000, priceGroup: '4000', displayOrder: 15 },
      { name: 'Biscolata', price: 4000, priceGroup: '4000', displayOrder: 16 },
      { name: 'M&M', price: 4000, priceGroup: '4000', displayOrder: 17 },
      { name: 'Brownie', price: 4000, priceGroup: '4000', displayOrder: 18 },
      { name: 'Durazno', price: 4000, priceGroup: '4000', displayOrder: 19 },
      { name: 'Extra crema Fresata', price: 5000, priceGroup: '5000', displayOrder: 20 },
      { name: 'Pistacho triturado', price: 5000, priceGroup: '5000', displayOrder: 21 },
      { name: 'Crema de pistacho', price: 7000, priceGroup: '7000', displayOrder: 22 }
    ]);
    console.log(`✅ ${toppings.length} toppings creados`);

    // ==================== SALSAS ====================
    console.log('🍯 Creando salsas...');
    const sauces = await Sauce.insertMany([
      { name: 'Arequipe', price: 3000, displayOrder: 1 },
      { name: 'Leche condensada', price: 3000, displayOrder: 2 },
      { name: 'Chocolate', price: 3000, displayOrder: 3 },
      { name: 'Chocolate blanco', price: 3000, displayOrder: 4 }
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
