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
        zoneName: 'Zona turística / Centro histórico',
        displayOrder: 1,
        neighborhoods: [
          { name: 'Castillogrande', price: 15000 },
          { name: 'El Laguito', price: 15000 },
          { name: 'Marbella', price: 12000 },
          { name: 'Cabrero', price: 12000 },
          { name: 'Cielo Mar', price: 15000 },
          { name: 'La Boquilla', price: 18000 }
        ]
      },
      {
        zoneName: 'Zona residencial / central',
        displayOrder: 2,
        neighborhoods: [
          { name: 'Basurto', price: 5000 },
          { name: 'Cuatro Vientos', price: 5000 },
          { name: 'Bosque', price: 5000 },
          { name: 'Alto Bosque', price: 6000 },
          { name: 'Nuevo Bosque', price: 6000 },
          { name: 'El Prado', price: 5000 },
          { name: 'Chile', price: 5000 },
          { name: 'Amberes', price: 5000 },
          { name: 'Bruselas', price: 5000 },
          { name: 'España', price: 5000 },
          { name: 'Junín', price: 5000 },
          { name: 'Martínez Martelo', price: 5000 },
          { name: 'Los Alpes', price: 6000 },
          { name: 'Santa Mónica', price: 6000 },
          { name: 'La Troncal', price: 5000 },
          { name: 'El Jardín', price: 6000 },
          { name: 'Anita', price: 5000 }
        ]
      },
      {
        zoneName: 'Zona sur y suroriental',
        displayOrder: 3,
        neighborhoods: [
          { name: 'Olaya Herrera', price: 7000 },
          { name: 'Nelson Mandela', price: 8000 },
          { name: 'El Pozón', price: 8000 },
          { name: 'San José de los Campanos', price: 7000 },
          { name: 'La Consolata', price: 7000 },
          { name: 'Villa Estrella', price: 7000 },
          { name: 'Flor del Campo', price: 8000 },
          { name: 'San Pedro Mártir', price: 7000 },
          { name: 'Henequén', price: 8000 },
          { name: 'La Central', price: 7000 },
          { name: 'El Educador', price: 7000 },
          { name: 'Corales', price: 7000 },
          { name: 'Bicentenario', price: 8000 },
          { name: 'Nueva Granada', price: 7000 },
          { name: 'La Princesa', price: 7000 }
        ]
      },
      {
        zoneName: 'Zona norte / tradicional',
        displayOrder: 4,
        neighborhoods: [
          { name: 'Chiquinquirá', price: 6000 },
          { name: 'Paraguay', price: 6000 },
          { name: 'República del Caribe', price: 6000 },
          { name: 'Santa Lucía', price: 6000 },
          { name: 'La María', price: 6000 },
          { name: 'Loma Fresca', price: 6000 },
          { name: 'Pedro Salazar', price: 6000 },
          { name: '7 de Agosto', price: 6000 },
          { name: 'Zarabanda', price: 6000 },
          { name: 'La Esperanza', price: 6000 },
          { name: 'María Auxiliadora', price: 6000 }
        ]
      },
      {
        zoneName: 'Zona industrial / portuaria',
        displayOrder: 5,
        neighborhoods: [
          { name: 'Mamonal', price: 12000 },
          { name: 'Albornoz', price: 10000 },
          { name: 'Pasacaballos', price: 15000 },
          { name: 'Arroz Barato', price: 10000 },
          { name: 'Puerta de Hierro', price: 8000 }
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
