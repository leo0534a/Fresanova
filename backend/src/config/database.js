// Configuración y conexión a MongoDB Atlas
const mongoose = require('mongoose');
const { config } = require('./env');
const logger = require('../utils/logger');

const connectDatabase = async () => {
  try {
    const connection = await mongoose.connect(config.mongodbUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    logger.info(`✅ MongoDB conectado: ${connection.connection.host}`);
    logger.info(`📦 Base de datos: ${connection.connection.name}`);

    // Manejar eventos de conexión
    mongoose.connection.on('error', (error) => {
      logger.error('❌ Error de conexión MongoDB:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB desconectado');
    });

    // Cerrar conexión al terminar el proceso
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('🔌 Conexión MongoDB cerrada por terminación de la app');
      process.exit(0);
    });

    return connection;
  } catch (error) {
    logger.error('❌ Error al conectar con MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDatabase;
