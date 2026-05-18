// Punto de entrada del servidor
const { config, validateEnv } = require('./config/env');
const connectDatabase = require('./config/database');
const app = require('./app');
const logger = require('./utils/logger');

// Validar variables de entorno
validateEnv();

// Iniciar servidor
const startServer = async () => {
  try {
    // Conectar a MongoDB
    await connectDatabase();

    // Crear directorio de logs si no existe
    const fs = require('fs');
    const path = require('path');
    const logsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Inicializar Content Templates de Twilio (botones y listas interactivas)
    const contentTemplateService = require('./services/contentTemplateService');
    await contentTemplateService.initialize();

    // Iniciar el servidor HTTP
    const server = app.listen(config.port, () => {
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.info(`🍓 Fresata Backend v1.0.0`);
      logger.info(`🚀 Servidor corriendo en puerto ${config.port}`);
      logger.info(`🌍 Entorno: ${config.nodeEnv}`);
      logger.info(`📡 Webhook: ${config.backendUrl}/webhook`);
      logger.info(`🏥 Health: ${config.backendUrl}/health`);
      logger.info(`📊 API: ${config.backendUrl}/api`);
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    // Manejo de errores del servidor
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ El puerto ${config.port} ya está en uso`);
        process.exit(1);
      }
      throw error;
    });

    // Manejo graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`\n${signal} recibido. Cerrando servidor...`);
      server.close(() => {
        logger.info('🔌 Servidor cerrado correctamente');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Manejo de errores no capturados
    process.on('unhandledRejection', (error) => {
      logger.error('❌ Unhandled Rejection:', error);
    });

    process.on('uncaughtException', (error) => {
      logger.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
