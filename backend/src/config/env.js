// Configuración centralizada de variables de entorno
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Variables obligatorias que deben existir
const requiredVariables = [
  'MONGODB_URI',
  'JWT_SECRET',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER',
  'DEEPSEEK_API_KEY',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD'
];

// Validar que todas las variables obligatorias estén definidas
const validateEnv = () => {
  const missingVariables = requiredVariables.filter(
    (variable) => !process.env[variable]
  );

  if (missingVariables.length > 0) {
    console.error('❌ Variables de entorno faltantes:');
    missingVariables.forEach((variable) => {
      console.error(`   - ${variable}`);
    });
    console.error('\n📋 Copia .env.example a .env y configura las variables.');

    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

// Exportar configuración centralizada
const config = {
  // Servidor
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',

  // Base de datos
  mongodbUri: process.env.MONGODB_URI,

  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Twilio
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
    webhookVerifyToken: process.env.TWILIO_WEBHOOK_VERIFY_TOKEN
  },

  // DeepSeek IA
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  },

  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD
  },

  // URLs
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  renderExternalUrl: process.env.RENDER_EXTERNAL_URL,

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET
  },

  // CORS - se construyen los orígenes permitidos combinando ALLOWED_ORIGINS, FRONTEND_URL y variantes de localhost en desarrollo
  allowedOrigins: (() => {
    const origins = new Set();

    if (process.env.ALLOWED_ORIGINS) {
      process.env.ALLOWED_ORIGINS.split(',').forEach((o) => origins.add(o.trim()));
    }

    const frontendUrl = process.env.FRONTEND_URL;
    if (frontendUrl) {
      origins.add(frontendUrl);
    }

    if (process.env.RENDER_EXTERNAL_URL) {
      origins.add(process.env.RENDER_EXTERNAL_URL);
    }

    if (process.env.NODE_ENV !== 'production') {
      origins.add('http://localhost:5173');
      origins.add('http://localhost:5174');
      origins.add('http://127.0.0.1:5173');
      origins.add('http://127.0.0.1:5174');
    }

    return [...origins];
  })(),

  // Rate Limit
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
  },

  // Session
  sessionSecret: process.env.SESSION_SECRET || 'fresanova_session_secret',

  // Logs
  logLevel: process.env.LOG_LEVEL || 'debug',

  // Zona horaria
  timezone: process.env.TIMEZONE || 'America/Bogota',

  // Negocio
  business: {
    name: process.env.BUSINESS_NAME || 'Fresanova',
    city: process.env.BUSINESS_CITY || 'Cartagena',
    deliveryPrice: parseInt(process.env.DELIVERY_PRICE, 10) || 10000,
    openHour: process.env.BUSINESS_OPEN_HOUR || '08:00',
    closeHour: process.env.BUSINESS_CLOSE_HOUR || '20:00',
    transferImageUrl: process.env.TRANSFER_IMAGE_URL || ''
  }
};

module.exports = { config, validateEnv };
