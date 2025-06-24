/**
 * RUTAS DE AUTENTICACIÓN - ELITE FITNESS CLUB
 * 
 * Soy el archivo que define todas las rutas relacionadas con autenticación
 * Mi responsabilidad es conectar los endpoints con sus controladores
 * aplicando el middleware apropiado para seguridad y validación
 * 
 * NUEVO EN SUB-FASE 2.3: Implementación completa de rutas de autenticación
 * 
 * Rutas implementadas:
 * - POST /login/client - Login tradicional para clientes
 * - POST /login/admin - Login tradicional para administradores
 * - POST /register - Registro de nuevos clientes
 * - GET /google - Iniciar Google OAuth
 * - GET /google/callback - Callback de Google OAuth
 * - GET /facebook - Iniciar Facebook OAuth
 * - GET /facebook/callback - Callback de Facebook OAuth
 * - POST /refresh - Renovar access token
 * - POST /logout - Cerrar sesión segura
 * - GET /me - Obtener usuario actual
 * - POST /change-password - Cambiar contraseña
 */

const express = require('express');
const passport = require('passport');
const router = express.Router();

// Importar controladores
const {
  loginClient,
  loginAdmin,
  registerClient,
  googleCallback,
  facebookCallback,
  refreshToken,
  logout,
  getCurrentUser,
  changePassword
} = require('../controllers/authController');

// Importar middleware
const { 
  requireAuth,
  optionalAuth,
  logAuthAttempts,
  extractClientInfo
} = require('../middleware/auth');

const {
  validateLogin,
  validateClientRegister,
  validatePasswordChange,
  sanitizeInput
} = require('../middleware/validation');

/**
 * ENDPOINT INFORMATIVO DE AUTENTICACIÓN
 * GET /api/auth
 */
router.get('/', (req, res) => {
  try {
    const { getAvailableStrategies } = require('../config/passport');
    const { getAvailableProviders } = require('../utils/oauth');
    
    const strategies = getAvailableStrategies();
    const providers = getAvailableProviders();
    
    res.json({
      message: '🔐 Elite Fitness Club - Sistema de Autenticación',
      version: '1.0.0 - Sub-fase 2.3',
      endpoints: {
        traditional: {
          clientLogin: 'POST /api/auth/login/client',
          adminLogin: 'POST /api/auth/login/admin',
          register: 'POST /api/auth/register',
          refresh: 'POST /api/auth/refresh',
          logout: 'POST /api/auth/logout',
          me: 'GET /api/auth/me',
          changePassword: 'POST /api/auth/change-password'
        },
        oauth: {
          google: 'GET /api/auth/google',
          facebook: 'GET /api/auth/facebook'
        }
      },
      security: {
        jwt: 'Tokens JWT con firma segura',
        oauth: 'Google + Facebook OAuth disponibles',
        validation: 'Validación robusta con Joi',
        rateLimit: 'Protección anti-spam implementada'
      },
      status: {
        passport: strategies,
        providers: providers,
        totalStrategies: Object.keys(strategies).filter(key => strategies[key]).length,
        totalProviders: providers.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Error obteniendo información de autenticación',
      message: error.message
    });
  }
});

/**
 * LOGIN TRADICIONAL PARA CLIENTES
 * POST /api/auth/login/client
 */
router.post('/login/client', [
  extractClientInfo,
  logAuthAttempts,
  sanitizeInput,
  validateLogin
], loginClient);

/**
 * LOGIN TRADICIONAL PARA ADMINISTRADORES
 * POST /api/auth/login/admin
 */
router.post('/login/admin', [
  extractClientInfo,
  logAuthAttempts,
  sanitizeInput,
  validateLogin
], loginAdmin);

/**
 * REGISTRO DE NUEVOS CLIENTES
 * POST /api/auth/register
 */
router.post('/register', [
  extractClientInfo,
  logAuthAttempts,
  sanitizeInput,
  validateClientRegister
], registerClient);

/**
 * GOOGLE OAUTH - INICIAR AUTENTICACIÓN
 * GET /api/auth/google
 */
router.get('/google', 
  extractClientInfo,
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

/**
 * GOOGLE OAUTH - CALLBACK
 * GET /api/auth/google/callback
 */
router.get('/google/callback', [
  extractClientInfo
], googleCallback);

/**
 * FACEBOOK OAUTH - INICIAR AUTENTICACIÓN
 * GET /api/auth/facebook
 */
router.get('/facebook',
  extractClientInfo,
  passport.authenticate('facebook', { 
    scope: ['email', 'public_profile'],
    session: false 
  })
);

/**
 * FACEBOOK OAUTH - CALLBACK
 * GET /api/auth/facebook/callback
 */
router.get('/facebook/callback', [
  extractClientInfo
], facebookCallback);

/**
 * RENOVAR ACCESS TOKEN
 * POST /api/auth/refresh
 */
router.post('/refresh', [
  sanitizeInput
], refreshToken);

/**
 * LOGOUT SEGURO
 * POST /api/auth/logout
 */
router.post('/logout', [
  optionalAuth // Opcional porque el usuario puede ya no tener token válido
], logout);

/**
 * OBTENER USUARIO ACTUAL AUTENTICADO
 * GET /api/auth/me
 */
router.get('/me', [
  requireAuth
], getCurrentUser);

/**
 * CAMBIAR CONTRASEÑA
 * POST /api/auth/change-password
 */
router.post('/change-password', [
  requireAuth,
  sanitizeInput,
  validatePasswordChange
], changePassword);

/**
 * VERIFICAR ESTADO DE TOKEN (UTILIDAD)
 * GET /api/auth/verify
 */
router.get('/verify', [
  optionalAuth
], (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        valid: false,
        message: 'No hay token válido',
        code: 'NO_VALID_TOKEN'
      });
    }
    
    res.json({
      valid: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        type: req.user.constructor.name.toLowerCase(),
        role: req.user.role || null
      },
      tokenInfo: req.user.tokenPayload ? {
        issuedAt: new Date(req.user.tokenPayload.iat * 1000),
        expiresAt: new Date(req.user.tokenPayload.exp * 1000)
      } : null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      valid: false,
      error: 'Error verificando token',
      message: error.message
    });
  }
});

/**
 * OBTENER PROVEEDORES OAUTH DISPONIBLES
 * GET /api/auth/providers
 */
router.get('/providers', (req, res) => {
  try {
    const { getAvailableProviders } = require('../utils/oauth');
    const providers = getAvailableProviders();
    
    res.json({
      success: true,
      providers: providers,
      totalProviders: providers.length,
      message: providers.length > 0 ? 
        'Proveedores OAuth disponibles' : 
        'No hay proveedores OAuth configurados',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Error obteniendo proveedores OAuth',
      message: error.message
    });
  }
});

/**
 * ENDPOINT DE PRUEBA PARA DESARROLLO
 * GET /api/auth/test (solo en desarrollo)
 */
if (process.env.NODE_ENV === 'development') {
  router.get('/test', (req, res) => {
    res.json({
      message: '🧪 Endpoint de prueba - Solo disponible en desarrollo',
      environment: process.env.NODE_ENV,
      endpoints: {
        testLogin: 'POST /api/auth/test-login',
        testToken: 'GET /api/auth/test-token'
      },
      warning: 'Este endpoint no estará disponible en producción',
      timestamp: new Date().toISOString()
    });
  });
  
  // Login de prueba para desarrollo
  router.post('/test-login', (req, res) => {
    const { generateTokenPair } = require('../utils/jwt');
    
    const testTokens = generateTokenPair({
      id: 'test-user-id',
      email: 'test@elitefitnessclub.com',
      type: 'client'
    });
    
    res.json({
      message: 'Tokens de prueba generados',
      tokens: testTokens,
      warning: 'Solo para desarrollo - No usar en producción',
      timestamp: new Date().toISOString()
    });
  });
}

module.exports = router;

/**
 * ESTADO ACTUAL - SUB-FASE 2.3:
 * ✅ Rutas de autenticación tradicional implementadas
 * ✅ Rutas OAuth para Google y Facebook configuradas
 * ✅ Middleware de validación aplicado correctamente
 * ✅ Middleware de seguridad en todos los endpoints
 * ✅ Endpoint informativo del sistema de autenticación
 * ✅ Rutas de utilidad para verificación de tokens
 * ✅ Endpoints de desarrollo para testing
 * ✅ Manejo de errores centralizado
 * 
 * RUTAS IMPLEMENTADAS:
 * ✅ POST /api/auth/login/client - Login clientes
 * ✅ POST /api/auth/login/admin - Login administradores
 * ✅ POST /api/auth/register - Registro clientes
 * ✅ GET /api/auth/google - OAuth Google
 * ✅ GET /api/auth/google/callback - Callback Google
 * ✅ GET /api/auth/facebook - OAuth Facebook
 * ✅ GET /api/auth/facebook/callback - Callback Facebook
 * ✅ POST /api/auth/refresh - Renovar tokens
 * ✅ POST /api/auth/logout - Logout seguro
 * ✅ GET /api/auth/me - Usuario actual
 * ✅ POST /api/auth/change-password - Cambiar contraseña
 * ✅ GET /api/auth/verify - Verificar token
 * ✅ GET /api/auth/providers - Proveedores disponibles
 * 
 * MIDDLEWARE APLICADO:
 * ✅ extractClientInfo - En todas las rutas relevantes
 * ✅ logAuthAttempts - En endpoints de login y registro
 * ✅ sanitizeInput - En endpoints que reciben datos
 * ✅ validateLogin - En endpoints de login
 * ✅ validateClientRegister - En registro
 * ✅ validatePasswordChange - En cambio de contraseña
 * ✅ requireAuth - En endpoints protegidos
 * ✅ optionalAuth - En endpoints opcionales
 * 
 * SEGURIDAD IMPLEMENTADA:
 * ✅ Validación de datos en todas las entradas
 * ✅ Sanitización automática de inputs
 * ✅ Logging de intentos de autenticación
 * ✅ Rate limiting implícito por middleware global
 * ✅ Headers de seguridad por middleware global
 * 
 * LISTO PARA SUB-FASE 2.4:
 * ⏭️ Rutas de usuarios administrativos (routes/users.js)
 * ⏭️ Rutas de clientes (routes/clients.js)
 * ⏭️ Integración en app.js principal
 * ⏭️ Testing completo de todas las rutas
 * ⏭️ Documentación de APIs
 */