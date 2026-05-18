// Script de seed para crear el administrador inicial
const mongoose = require('mongoose');
const { config } = require('../config/env');
const Admin = require('../models/Admin');

const seedAdmin = async () => {
  try {
    console.log('🍓 Conectando a MongoDB...');
    await mongoose.connect(config.mongodbUri);
    console.log('✅ Conectado a MongoDB');

    // Verificar si ya existe un admin
    const existingAdmin = await Admin.findOne({ email: config.admin.email });

    if (existingAdmin) {
      console.log(`⚠️ Ya existe un admin con email: ${config.admin.email}`);
      console.log('   Si necesitas recrearlo, elimínalo primero de la base de datos.');
    } else {
      const admin = await Admin.create({
        name: 'Administrador Fresata',
        email: config.admin.email,
        password: config.admin.password,
        role: 'superadmin'
      });

      console.log('\n🍓✨ ¡Admin creado exitosamente!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`👤 Nombre: ${admin.name}`);
      console.log(`📧 Email: ${admin.email}`);
      console.log(`🔑 Contraseña: ${config.admin.password}`);
      console.log(`👑 Rol: ${admin.role}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando admin:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAdmin();
