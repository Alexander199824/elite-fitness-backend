/**
 * MIDDLEWARE DE AUTENTICACIÓN - ELITE FITNESS CLUB
 * 
 * Soy el middleware encargado de manejar toda la autenticación
 * Mi responsabilidad es verificar tokens, validar usuarios y
 * proporcionar protección para rutas que requieren autenticación
 * 
 * Características implementadas:
 * - Verificación automática de JWT tokens
 * - Rate limiting por usuario autenticado
 * - Detección de tokens próximos a expirar
 * - Manejo de refresh automático
 * - Logging de intentos de autenticación
 * - Soporte para múltiples tipos de usuarios
 */

const rateLimit = require('express-rate-limit');
const { authenticateJWT, requireJWT } = require('../config/passport');
const { verifyToken, isTokenExpiringSoon, extractTokenFromHeader } = require('../utils/jwt');

/**
 * Middleware de autenticación opcional
 * Identifica al usuario si está autenticado, pero no requiere autenticación
 */
const optionalAuth = (req, res, next) => {
  authenticateJWT(req, res, next);
};

/**
 * Middleware de autenticación requerida
 * Requiere que el usuario esté autenticado para continuar
 */
const requireAuth = (req, res, next) => {
  requireJWT(req, res, next);
};

/**
 * Middleware para requerir tipo específico de usuario
 */
const requireUserType = (userType) => {
  return (req, res, next) => {
    // Primero verificar autenticación
    requireJWT(req, res, (err) => {
      if (err) return next(err);
      
      // Verificar tipo de usuario
      if (!req.user) {
        return res.status(401).json({
          error: 'Autenticación requerida',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }
      
      const currentUserType = req.user.constructor.name.toLowerCase();
      
      if (currentUserType !== userType.toLowerCase()) {
        return res.status(403).json({
          error: `Acceso restringido a ${userType}s`,
          message: `Esta ruta es solo para ${userType}s`,
          code: 'USER_TYPE_MISMATCH'
        });
      }
      
      next();
    });
  };
};

/**
 * Middleware para solo clientes
 */
const requireClient = requireUserType('client');

/**
 * Middleware para solo administradores
 */
const requireAdmin = requireUserType('user');

/**
 * Middleware para verificar token y sugerir renovación
 */
const checkTokenExpiration = (req, res, next) => {
  // Solo funciona si ya hay autenticación
  if (!req.user || !req.headers.authorization) {
    return next();
  }
  
  const token = extractTokenFromHeader(req.headers.authorization);
  
  if (token && isTokenExpiringSoon(token, 30)) { // 30 minutos
    // Agregar header indicando que debe renovar
    res.set('X-Token-Expiring', 'true');
    res.set('X-Token-Refresh-Suggested', 'true');
  }
  
  next();
};

/**
 * Rate limiting para usuarios autenticados
 */
const authenticatedRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: (req) => {
    // Rate limit más alto para usuarios autenticados
    if (req.user) {
      // Administradores tienen límite más alto
      if (req.user.constructor.name.toLowerCase() === 'user') {
        return 1000; // 1000 requests por 15 min para admins
      }
      return 500; // 500 requests por 15 min para clientes
    }
    return 100; // 100 requests por 15 min para no autenticados
  },
  keyGenerator: (req) => {
    // Usar ID de usuario si está autenticado, sino IP
    if (req.user) {
      return `user:${req.user.id}`;
    }
    return req.ip;
  },
  message: (req) => ({
    error: 'Demasiadas solicitudes',
    message: req.user 
      ? 'Has excedido el límite de requests para usuarios autenticados'
      : 'Has excedido el límite de requests. Inicia sesión para límite más alto',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(15 * 60) // 15 minutos en segundos
  }),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting para health checks y algunos endpoints
    const skipPaths = ['/health', '/api/db-status'];
    return skipPaths.includes(req.path);
  }
});

/**
 * Middleware de logging de autenticación
 */
const logAuthAttempts = (req, res, next) => {
  // Solo log para rutas de autenticación
  const authPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];
  
  if (authPaths.includes(req.path)) {
    const startTime = Date.now();
    
    // Log del intento
    console.log(`🔐 Intento de auth: ${req.method} ${req.path} desde ${req.ip}`);
    
    // Override del res.json para capturar resultado
    const originalJson = res.json;
    res.json = function(data) {
      const duration = Date.now() - startTime;
      const success = res.statusCode < 400;
      
      if (success) {
        console.log(`✅ Auth exitoso en ${duration}ms: ${req.path}`);
      } else {
        console.log(`❌ Auth fallido en ${duration}ms: ${req.path} - ${data.error || 'Error desconocido'}`);
      }
      
      return originalJson.call(this, data);
    };
  }
  
  next();
};

/**
 * Middleware para extraer información del cliente (User-Agent, etc.)
 */
const extractClientInfo = (req, res, next) => {
  req.clientInfo = {
    userAgent: req.headers['user-agent'] || 'Unknown',
    ip: req.ip || req.connection.remoteAddress,
    clientType: req.headers['x-client-type'] || 'web', // web, mobile, admin
    platform: req.headers['x-platform'] || 'unknown', // ios, android, web
    version: req.headers['x-app-version'] || 'unknown'
  };
  
  next();
};

/**
 * Middleware para validar origen de la request
 */
const validateOrigin = (req, res, next) => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  
  // Lista de orígenes permitidos
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3001',
    'http://localhost:3000',
    'http://localhost:19006', // Expo
    process.env.MOBILE_APP_URL
  ].filter(Boolean);
  
  // Para APIs móviles, no siempre hay origin/referer
  if (req.clientInfo?.clientType === 'mobile') {
    return next();
  }
  
  // Para desarrollo, ser más permisivo
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  // En producción, validar origen
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      error: 'Origen no permitido',
      message: 'Tu aplicación no tiene permisos para acceder a esta API',
      code: 'INVALID_ORIGIN'
    });
  }
  
  next();
};

/**
 * Middleware para manejar múltiples métodos de autenticación
 */
const flexibleAuth = (options = {}) => {
  const { 
    allowGuest = false,
    preferredUserType = null,
    requireVerification = false
  } = options;
  
  return (req, res, next) => {
    authenticateJWT(req, res, (err) => {
      if (err) return next(err);
      
      // Si no hay usuario y se permite invitado
      if (!req.user && allowGuest) {
        req.user = null;
        req.isAuthenticated = false;
        return next();
      }
      
      // Si no hay usuario y no se permite invitado
      if (!req.user) {
        return res.status(401).json({
          error: 'Autenticación requerida',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }
      
      // Verificar tipo de usuario preferido
      if (preferredUserType) {
        const currentUserType = req.user.constructor.name.toLowerCase();
        if (currentUserType !== preferredUserType.toLowerCase()) {
          return res.status(403).json({
            error: `Acceso preferido para ${preferredUserType}s`,
            code: 'USER_TYPE_MISMATCH'
          });
        }
      }
      
      // Verificar verificación de email si es requerida
      if (requireVerification && req.user.isEmailVerified === false) {
        return res.status(403).json({
          error: 'Email no verificado',
          message: 'Debes verificar tu email antes de acceder a esta función',
          code: 'EMAIL_NOT_VERIFIED'
        });
      }
      
      next();
    });
  };
};

/**
 * Middleware para endpoint de información del usuario actual
 */
const getCurrentUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'No autenticado',
      code: 'NOT_AUTHENTICATED'
    });
  }
  
  // Formatear respuesta del usuario
  const userInfo = {
    id: req.user.id,
    email: req.user.email,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    type: req.user.constructor.name.toLowerCase(),
    isActive: req.user.isActive,
    lastLogin: req.user.lastLogin,
    createdAt: req.user.createdAt
  };
  
  // Agregar campos específicos según tipo de usuario
  if (req.user.constructor.name.toLowerCase() === 'user') {
    userInfo.role = req.user.role;
    userInfo.permissions = req.user.permissions;
  } else {
    userInfo.memberNumber = req.user.memberNumber;
    userInfo.points = req.user.points;
    userInfo.level = req.user.level;
    userInfo.authProvider = req.user.authProvider;
    userInfo.isEmailVerified = req.user.isEmailVerified;
  }
  
  res.json({
    success: true,
    user: userInfo,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  // Middleware básicos
  optionalAuth,
  requireAuth,
  requireClient,
  requireAdmin,
  requireUserType,
  
  // Middleware avanzados
  checkTokenExpiration,
  authenticatedRateLimit,
  logAuthAttempts,
  extractClientInfo,
  validateOrigin,
  flexibleAuth,
  
  // Endpoints
  getCurrentUser
};

/**
 * ESTADO ACTUAL - SUB-FASE 2.2:
 * ✅ Middleware de autenticación opcional y requerida
 * ✅ Verificación por tipo de usuario (client/admin)
 * ✅ Rate limiting diferenciado por usuario
 * ✅ Detección de tokens próximos a expirar
 * ✅ Logging de intentos de autenticación
 * ✅ Extracción de información del cliente
 * ✅ Validación de orígenes permitidos
 * ✅ Autenticación flexible con opciones
 * ✅ Endpoint para obtener usuario actual
 * 
 * PENDIENTE EN SIGUIENTES SUB-FASES:
 * ⏳ Middleware de autorización por roles (2.3)
 * ⏳ Middleware de validación de datos (2.3)
 * ⏳ Controladores de autenticación (2.4)
 * ⏳ Rutas de autenticación (2.5)
 * ⏳ Testing de middleware (2.6)
 */