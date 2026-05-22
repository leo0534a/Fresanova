// Punto de entrada del servidor
const http = require('http');
const { config, validateEnv } = require('./config/env');
const connectDatabase = require('./config/database');
const app = require('./app');
const socketService = require('./services/socketService');
const logger = require('./utils/logger');

validateEnv();

const startServer = async () => {
  try {
    await connectDatabase();

    const fs = require('fs');
    const path = require('path');
    const logsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Inicializar Content Templates de Twilio
    const contentTemplateService = require('./services/contentTemplateService');
    await contentTemplateService.initialize();

    // Crear servidor HTTP y vincular Socket.IO
    const server = http.createServer(app);
    socketService.initialize(server);

    server.listen(config.port, () => {
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.info(`🍓 Fresanova Backend v2.0.0`);
      logger.info(`🚀 Servidor corriendo en puerto ${config.port}`);
      logger.info(`🌍 Entorno: ${config.nodeEnv}`);
      logger.info(`📡 Webhook: ${config.backendUrl}/webhook`);
      logger.info(`🏥 Health: ${config.backendUrl}/health`);
      logger.info(`📊 API: ${config.backendUrl}/api`);
      logger.info(`🔌 Socket.IO: activo`);
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ El puerto ${config.port} ya está en uso`);
        process.exit(1);
      }
      throw error;
    });

    const gracefulShutdown = (signal) => {
      logger.info(`\n${signal} recibido. Cerrando servidor...`);
      server.close(() => {
        logger.info('🔌 Servidor cerrado correctamente');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

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
