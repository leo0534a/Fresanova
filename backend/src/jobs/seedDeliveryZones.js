// Script de seed — Carga las zonas de domicilio con barrios y tarifas
const mongoose = require('mongoose');
const { config } = require('../config/env');
const { DeliveryZone } = require('../models');

const seedDeliveryZones = async () => {
  try {
    console.log('🚗 Conectando a MongoDB...');
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Conectado a MongoDB');

    // Limpiar zonas existentes
    await DeliveryZone.deleteMany({});
    console.log('🧹 Zonas de domicilio eliminadas');

    const zonesData = [
      {
        zoneName: 'Zona $3.000',
        displayOrder: 1,
        neighborhoods: [
          { name: 'Nuevo Bosque', price: 3000 },
          { name: 'Escallon Villa', price: 3000 },
          { name: 'Los Corales', price: 3000 },
          { name: 'Ceballos', price: 3000 },
          { name: 'Nueva Granada', price: 3000 },
          { name: 'La Campiña', price: 3000 },
          { name: 'El Country', price: 3000 },
          { name: 'Almirante Colon', price: 3000 },
          { name: 'Los Calamares', price: 3000 },
          { name: 'Los Almendros', price: 3000 },
          { name: 'El Progreso', price: 3000 },
          { name: 'Altos del Country', price: 3000 },
          { name: 'El Mirador de Zaragocilla', price: 3000 }
        ]
      },
      {
        zoneName: 'Zona $4.000',
        displayOrder: 2,
        neighborhoods: [
          { name: '20 de Julio', price: 4000 },
          { name: 'Los Caracoles', price: 4000 },
          { name: 'San Isidro', price: 4000 },
          { name: 'El Campestre', price: 4000 },
          { name: 'Bosquecito', price: 4000 },
          { name: 'Los Ejecutivos', price: 4000 },
          { name: 'El Rubi', price: 4000 },
          { name: 'Villa Sandra', price: 4000 },
          { name: 'Santa Clara', price: 4000 },
          { name: 'El Golf', price: 4000 },
          { name: 'Las Gaviotas', price: 4000 },
          { name: 'Bellavista', price: 4000 },
          { name: 'Barrio España', price: 4000 },
          { name: 'La Central', price: 4000 },
          { name: 'Las Delicias', price: 4000 },
          { name: 'La Castellana', price: 4000 }
        ]
      },
      {
        zoneName: 'Zona $5.000',
        displayOrder: 3,
        neighborhoods: [
          { name: 'Chiquinquira', price: 5000 },
          { name: 'Paraguay', price: 5000 },
          { name: 'Alto Bosque', price: 5000 },
          { name: 'Manga', price: 5000 },
          { name: 'Chipre', price: 5000 },
          { name: 'Bruselas', price: 5000 },
          { name: 'El Milagro', price: 5000 },
          { name: 'El Socorro', price: 5000 },
          { name: 'Blas de Lezo', price: 5000 },
          { name: 'Villa Barraza', price: 5000 },
          { name: 'Santa Lucia', price: 5000 },
          { name: 'Los Angeles', price: 5000 },
          { name: 'Santa Monica', price: 5000 },
          { name: 'El Refugio', price: 5000 },
          { name: 'Nuevo Chile', price: 5000 },
          { name: 'Altos de San Isidro', price: 5000 },
          { name: 'El Carmelo', price: 5000 },
          { name: 'Altos del Campestre', price: 5000 }
        ]
      },
      {
        zoneName: 'Zona $6.000',
        displayOrder: 4,
        neighborhoods: [
          { name: 'Boston', price: 6000 },
          { name: 'Viejo Porvenir', price: 6000 },
          { name: 'Los Cerezos', price: 6000 },
          { name: 'Los Alpes', price: 6000 },
          { name: 'La Victoria', price: 6000 },
          { name: 'El Recreo', price: 6000 },
          { name: 'San Pedro Martir', price: 6000 },
          { name: 'Villa Rubia', price: 6000 },
          { name: 'Espinal', price: 6000 },
          { name: 'La Candelaria', price: 6000 },
          { name: 'Mirador de la Bahia', price: 6000 },
          { name: 'Villa del Sol', price: 6000 },
          { name: 'El Prado', price: 6000 },
          { name: 'Altos de San Pedro', price: 6000 }
        ]
      },
      {
        zoneName: 'Zona $7.000',
        displayOrder: 5,
        neighborhoods: [
          { name: 'Nuevo Paraiso', price: 7000 },
          { name: 'Pablo VI', price: 7000 },
          { name: 'Olaya Herrera', price: 7000 },
          { name: 'La Maria', price: 7000 },
          { name: 'San Fernando', price: 7000 },
          { name: 'Ternera', price: 7000 },
          { name: 'San Jose de los Campanos', price: 7000 },
          { name: 'La Consolata', price: 7000 },
          { name: 'Villa Rosita', price: 7000 },
          { name: 'El Educador', price: 7000 },
          { name: 'Pie de la Popa', price: 7000 },
          { name: 'Pie del Cerro', price: 7000 },
          { name: 'Los Ciruelos', price: 7000 },
          { name: 'San Buenaventura', price: 7000 },
          { name: 'Villa Rosa', price: 7000 },
          { name: 'La Quinta', price: 7000 },
          { name: 'La Esperanza', price: 7000 },
          { name: 'La Paz', price: 7000 },
          { name: 'Ciudadela 2000', price: 7000 }
        ]
      },
      {
        zoneName: 'Zona $8.000',
        displayOrder: 6,
        neighborhoods: [
          { name: 'Daniel Lemaitre', price: 8000 },
          { name: 'Canapote', price: 8000 },
          { name: 'San Pedro y Libertad', price: 8000 },
          { name: 'Petare', price: 8000 },
          { name: 'Villa Estrella', price: 8000 },
          { name: 'San Francisco', price: 8000 },
          { name: 'Torices', price: 8000 },
          { name: 'Villa Corelca', price: 8000 },
          { name: 'Villa Fanny', price: 8000 },
          { name: 'Villa de Aranjuez', price: 8000 },
          { name: 'La Sierrita', price: 8000 },
          { name: 'Santa Rita', price: 8000 },
          { name: 'Ciudad Jardin', price: 8000 },
          { name: 'Las Palmeras', price: 8000 },
          { name: 'Villa Zuldany', price: 8000 }
        ]
      },
      {
        zoneName: 'Zona $9.000',
        displayOrder: 7,
        neighborhoods: [
          { name: 'El Pozon', price: 9000 },
          { name: 'Marbella', price: 9000 },
          { name: 'Cabrero', price: 9000 },
          { name: 'Nelson Mandela', price: 9000 },
          { name: 'El Rodeo', price: 9000 }
        ]
      },
      {
        zoneName: 'Zona $10.000',
        displayOrder: 8,
        neighborhoods: [
          { name: 'Getsemani', price: 10000 },
          { name: 'Centro', price: 10000 },
          { name: 'San Diego', price: 10000 },
          { name: 'Ciudad Bicentenario', price: 10000 }
        ]
      },
      {
        zoneName: 'Zona $12.000',
        displayOrder: 9,
        neighborhoods: [
          { name: 'Bicentenario', price: 12000 },
          { name: 'Flor del Campo', price: 12000 },
          { name: 'La India', price: 12000 },
          { name: 'Crespo', price: 12000 },
          { name: 'Bocagrande', price: 12000 },
          { name: 'Castillogrande', price: 12000 },
          { name: 'El Laguito', price: 12000 }
        ]
      }
    ];

    const zones = await DeliveryZone.insertMany(zonesData);

    const totalNeighborhoods = zones.reduce((sum, z) => sum + z.neighborhoods.length, 0);

    console.log('\n🚗✨ ¡Seed de zonas de domicilio completado!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🗺️ Zonas: ${zones.length}`);
    console.log(`🏘️ Barrios: ${totalNeighborhoods}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed de zonas:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedDeliveryZones();
