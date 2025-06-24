/**
 * APLICACIÓN PRINCIPAL - ELITE FITNESS CLUB BACKEND
 * 
 * Soy el archivo principal que configura toda la aplicación Express
 * Mi responsabilidad es establecer middlewares, rutas y configuraciones
 * de seguridad para el sistema de gestión del gimnasio
 * 
 * ACTUALIZADO PARA SUB-FASE 2.2: Integración completa de Passport.js
 * 
 * Configuraciones actuales:
 * - Middlewares de seguridad básicos
 * - CORS configurado para web y móvil
 * - Rate limiting anti-spam
 * - Compresión de respuestas
 * - Express-session para Passport
 * - Passport.js inicializado con todas las estrategias
 * - Manejo de errores centralizado
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
require('dotenv').config();

// Importar configuración de base de datos
const { testConnection } = require('./config/database');

// Importar e inicializar Passport.js (NUEVO EN SUB-FASE 2.2)
const { initializePassport } = require('./config/passport');

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
// CONFIGURACIÓN DE SESIONES (NUEVO EN SUB-FASE 2.2)
// ===========================================

// Express-session configurado para Passport.js
app.use(session({
  secret: process.env.SESSION_SECRET || 'elite_fitness_session_secret_2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS en producción
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  },
  name: 'elite-fitness-session'
}));

// ===========================================
// INICIALIZACIÓN DE PASSPORT.JS (NUEVO EN SUB-FASE 2.2)
// ===========================================

// Inicializar Passport con todas las estrategias
try {
  initializePassport(app);
  console.log('✅ Passport.js inicializado correctamente con todas las estrategias');
} catch (error) {
  console.error('❌ Error inicializando Passport.js:', error.message);
  console.log('⚠️  Continuando sin autenticación OAuth...');
}

// ===========================================
// MIDDLEWARE DE INFORMACIÓN DEL CLIENTE (SUB-FASE 2.2)
// ===========================================

// Extraer información del cliente para auditoría y seguridad
const { extractClientInfo } = require('./middleware/auth');
app.use(extractClientInfo);

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
    version: '1.0.0-fase2.2',
    authentication: {
      passport: 'initialized',
      strategies: 'configured',
      session: 'active'
    }
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
// RUTA DE ESTADO DE AUTENTICACIÓN (NUEVO SUB-FASE 2.2)
// ===========================================

// Endpoint para verificar estrategias de autenticación disponibles
app.get('/api/auth-status', (req, res) => {
  try {
    const { getAvailableStrategies } = require('./config/passport');
    const { getAvailableProviders } = require('./utils/oauth');
    
    const strategies = getAvailableStrategies();
    const providers = getAvailableProviders();
    
    res.status(200).json({
      status: 'ok',
      message: 'Sistema de autenticación configurado',
      passport: {
        initialized: true,
        strategies: strategies,
        totalStrategies: Object.keys(strategies).filter(key => strategies[key]).length
      },
      oauth: {
        providers: providers,
        totalProviders: providers.length
      },
      jwt: {
        configured: !!process.env.JWT_SECRET,
        algorithm: 'HS256'
      },
      session: {
        configured: true,
        secure: process.env.NODE_ENV === 'production'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error verificando estado de autenticación',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ===========================================
// RUTAS PRINCIPALES
// ===========================================

// Ruta raíz con información del sistema actualizada
app.get('/', (req, res) => {
  res.status(200).json({
    message: '🏋️‍♂️ Elite Fitness Club - Sistema de Gestión',
    version: '1.0.0',
    phase: 'Sub-fase 2.2 - Autenticación y JWT Completada',
    features: {
      database: 'PostgreSQL configurado',
      security: 'Helmet + CORS + Rate Limiting',
      authentication: 'Passport.js + JWT + OAuth',
      session: 'Express-session configurado',
      environment: process.env.NODE_ENV || 'development'
    },
    endpoints: {
      health: '/health',
      dbStatus: '/api/db-status',
      authStatus: '/api/auth-status'
    },
    authentication: {
      jwt: 'Configurado y listo',
      oauth: 'Google + Facebook disponibles',
      local: 'Email/password implementado',
      session: 'Persistente y segura'
    },
    nextPhase: 'Sub-fase 2.3 - Controladores de Autenticación'
  });
});

// ===========================================
// MANEJO DE ERRORES ACTUALIZADO
// ===========================================

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe en este servidor`,
    availableEndpoints: ['/', '/health', '/api/db-status', '/api/auth-status'],
    authentication: 'Sistema de autenticación disponible en Sub-fase 2.3'
  });
});

// Middleware de manejo de errores global actualizado
app.use((err, req, res, next) => {
  console.error('💥 Error no manejado:', err);
  
  // Error de JSON malformado
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'JSON malformado',
      message: 'El cuerpo de la request contiene JSON inválido'
    });
  }
  
  // Error de Passport.js
  if (err.name === 'AuthenticationError') {
    return res.status(401).json({
      error: 'Error de autenticación',
      message: 'Credenciales inválidas o token expirado',
      code: 'AUTHENTICATION_FAILED'
    });
  }
  
  // Error de autorización
  if (err.name === 'AuthorizationError') {
    return res.status(403).json({
      error: 'Error de autorización',
      message: 'No tienes permisos para acceder a este recurso',
      code: 'AUTHORIZATION_FAILED'
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
 * ESTADO ACTUAL - SUB-FASE 2.2:
 * ✅ Express configurado con middlewares de seguridad
 * ✅ CORS configurado para web y móvil
 * ✅ Rate limiting implementado
 * ✅ Express-session configurado para Passport.js
 * ✅ Passport.js inicializado con todas las estrategias
 * ✅ Middleware de información del cliente
 * ✅ Endpoints de estado de autenticación
 * ✅ Manejo de errores actualizado para auth
 * ✅ Health checks y estado de BD
 * ✅ Compresión y optimizaciones básicas
 * 
 * COMPLETADO EN SUB-FASE 2.2:
 * ✅ Modelos de BD (User, Client, ClientPreference)
 * ✅ Utilidades JWT (generación, verificación, renovación)
 * ✅ Configuración OAuth (Google + Facebook)
 * ✅ Estrategias Passport.js (JWT, Local, OAuth)
 * ✅ Middleware de autenticación y autorización
 * ✅ Middleware de validación de datos
 * ✅ Integración completa en aplicación principal
 * 
 * LISTO PARA SUB-FASE 2.3:
 * ⏭️ Controladores de autenticación (authController.js)
 * ⏭️ Controladores de usuario (userController.js)
 * ⏭️ Rutas de autenticación (routes/auth.js)
 * ⏭️ Rutas protegidas (routes/users.js, routes/clients.js)
 * ⏭️ Testing completo de APIs de autenticación
 */