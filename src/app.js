/**
 * APLICACIÓN PRINCIPAL - ELITE FITNESS CLUB BACKEND
 * 
 * Soy el archivo principal que configura toda la aplicación Express
 * Mi responsabilidad es establecer middlewares, rutas y configuraciones
 * de seguridad para el sistema de gestión del gimnasio
 * 
 * Configuraciones actuales:
 * - Middlewares de seguridad básicos
 * - CORS configurado para web y móvil
 * - Rate limiting anti-spam
 * - Compresión de respuestas
 * - Manejo de errores centralizado
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importar configuración de base de datos
const { testConnection } = require('./config/database');

// Crear aplicación Express
const app = express();

// ===========================================
// MIDDLEWARES DE SEGURIDAD
// ===========================================

// Helmet para headers de seguridad
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configurado para Guatemala y múltiples plataformas
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:19006', // Expo
    process.env.MOBILE_APP_URL || 'elitefitnessapp://'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-type']
};

app.use(cors(corsOptions));

// Rate limiting para prevenir spam
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // límite de requests
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// ===========================================
// MIDDLEWARES GENERALES
// ===========================================

// Compresión de respuestas
app.use(compression());

// Logging de requests (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Parseo de JSON con límite de tamaño
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===========================================
// RUTAS DE SALUD Y ESTADO
// ===========================================

// Ruta de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Elite Fitness Club API funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0-fase1'
  });
});

// Ruta para verificar conexión a base de datos
app.get('/api/db-status', async (req, res) => {
  try {
    const isConnected = await testConnection();
    res.status(200).json({
      database: isConnected ? 'connected' : 'disconnected',
      message: isConnected ? 'Conexión a PostgreSQL exitosa' : 'Error de conexión',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      database: 'error',
      message: 'Error verificando conexión a base de datos',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ===========================================
// RUTAS PRINCIPALES (Preparadas para siguientes fases)
// ===========================================

// Ruta raíz con información del sistema
app.get('/', (req, res) => {
  res.status(200).json({
    message: '🏋️‍♂️ Elite Fitness Club - Sistema de Gestión',
    version: '1.0.0',
    phase: 'Fase 1 - Configuración Base',
    features: {
      database: 'PostgreSQL configurado',
      security: 'Helmet + CORS + Rate Limiting',
      environment: process.env.NODE_ENV || 'development'
    },
    endpoints: {
      health: '/health',
      dbStatus: '/api/db-status'
    },
    nextPhase: 'Fase 2 - Autenticación y Usuarios'
  });
});

// ===========================================
// MANEJO DE ERRORES
// ===========================================

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe en este servidor`,
    availableEndpoints: ['/', '/health', '/api/db-status']
  });
});

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
  console.error('💥 Error no manejado:', err);
  
  // Error de JSON malformado
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'JSON malformado',
      message: 'El cuerpo de la request contiene JSON inválido'
    });
  }
  
  // Error genérico
  res.status(err.status || 500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;

/**
 * ESTADO ACTUAL - FASE 1:
 * ✅ Express configurado con middlewares de seguridad
 * ✅ CORS configurado para web y móvil
 * ✅ Rate limiting implementado
 * ✅ Manejo de errores centralizado
 * ✅ Health checks y estado de BD
 * ✅ Compresión y optimizaciones básicas
 * 
 * PENDIENTE PARA SIGUIENTES FASES:
 * ⏳ Rutas de autenticación (Fase 2)
 * ⏳ Rutas de clientes y membresías (Fase 3)
 * ⏳ Rutas de pagos (Fase 4)
 * ⏳ Rutas de gamificación (Fase 5)
 * ⏳ Sistema de uploads de imágenes (Fase 5)
 * ⏳ Rutas de comunicaciones (Fase 6)
 * ⏳ Rutas de analytics (Fase 7)
 */