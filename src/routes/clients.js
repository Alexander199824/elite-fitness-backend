/**
 * RUTAS DE CLIENTES DEL GIMNASIO - ELITE FITNESS CLUB
 * 
 * Soy el archivo que define todas las rutas para gestión de clientes
 * Mi responsabilidad es conectar endpoints con controladores aplicando
 * middleware de autorización diferenciado para admins y clientes
 * 
 * NUEVO EN SUB-FASE 2.3: Implementación completa de rutas de clientes
 * 
 * Rutas implementadas:
 * - GET / - Listar clientes (solo admins)
 * - GET /stats - Estadísticas de clientes (solo admins)
 * - GET /me - Perfil del cliente actual (solo clientes)
 * - GET /:id - Obtener cliente específico (admins o propietario)
 * - PUT /:id - Actualizar cliente (admins o propietario)
 * - PUT /:id/preferences - Actualizar preferencias (admins o propietario)
 * - POST /:id/checkin - Realizar check-in (solo admins)
 * - POST /:id/points - Agregar puntos (solo admins)
 */

/**
 * RUTAS DE CLIENTES DEL GIMNASIO - ELITE FITNESS CLUB
 * 
 * CORREGIDO PARA SUB-FASE 2.3: Todas las rutas implementadas correctamente
 */

const express = require('express');
const router = express.Router();

// Importar controladores
const {
  getClients,
  getClient,
  updateClient,
  updateClientPreferences,
  clientCheckIn,
  addPointsToClient,
  getClientProfile,
  getClientStats,
  getLeaderboard,
  searchClients,
  getClientsInfo
} = require('../controllers/clientController');

// Importar middleware de autenticación y autorización
const { 
  requireAuth,
  requireAdmin,
  requireClient,
  flexibleAuth
} = require('../middleware/auth');

const {
  requireRole,
  requirePermission,
  requireOwnership,
  requireAnyPermission,
  logAuthorization
} = require('../middleware/authorize');

const {
  validateUUID,
  validateSchema,
  schemas,
  handleValidationErrors,
  sanitizeInput
} = require('../middleware/validation');

/**
 * APLICAR MIDDLEWARE BASE A TODAS LAS RUTAS
 * Todas las rutas de clientes requieren autenticación
 */
router.use([
  requireAuth,
  logAuthorization('client_management')
]);

/**
 * OBTENER INFORMACIÓN DE GESTIÓN DE CLIENTES
 * GET /api/clients/info
 */
router.get('/info', getClientsInfo);

/**
 * OBTENER ESTADÍSTICAS DE CLIENTES
 * GET /api/clients/stats
 */
router.get('/stats', [
  requireAnyPermission(['view_analytics', 'manage_clients'])
], getClientStats);

/**
 * OBTENER PERFIL DEL CLIENTE ACTUAL
 * GET /api/clients/me
 */
router.get('/me', [
  requireClient // Solo clientes pueden acceder a este endpoint
], getClientProfile);

/**
 * ACTUALIZAR PERFIL DEL CLIENTE ACTUAL
 * PUT /api/clients/me
 */
router.put('/me', [
  requireClient,
  sanitizeInput,
  validateSchema(schemas.profileUpdate)
], async (req, res, next) => {
  // Redirigir a updateClient con el ID del cliente actual
  req.params.id = req.user.id;
  updateClient(req, res, next);
});

/**
 * ACTUALIZAR PREFERENCIAS DEL CLIENTE ACTUAL
 * PUT /api/clients/me/preferences
 */
router.put('/me/preferences', [
  requireClient,
  sanitizeInput,
  validateSchema(schemas.preferences)
], async (req, res, next) => {
  // Redirigir a updateClientPreferences con el ID del cliente actual
  req.params.id = req.user.id;
  updateClientPreferences(req, res, next);
});

/**
 * OBTENER TOP CLIENTES POR PUNTOS (LEADERBOARD)
 * GET /api/clients/leaderboard
 */
router.get('/leaderboard', getLeaderboard);

/**
 * BUSCAR CLIENTES POR TÉRMINO
 * GET /api/clients/search
 */
router.get('/search', [
  requirePermission('view_clients')
], searchClients);

/**
 * LISTAR TODOS LOS CLIENTES
 * GET /api/clients
 */
router.get('/', [
  requirePermission('view_clients') // Solo admins pueden listar todos los clientes
], getClients);

/**
 * OBTENER CLIENTE ESPECÍFICO
 * GET /api/clients/:id
 */
router.get('/:id', [
  validateUUID('id'),
  handleValidationErrors,
  flexibleAuth({
    allowGuest: false,
    requireVerification: false
  })
], async (req, res, next) => {
  // Los clientes solo pueden ver su propio perfil
  // Los admins pueden ver cualquier cliente
  if (req.user.constructor.name.toLowerCase() === 'client' && 
      req.user.id !== req.params.id) {
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'Solo puedes ver tu propio perfil',
      code: 'CLIENT_SELF_ONLY'
    });
  }
  
  // Si es admin, verificar permisos
  if (req.user.constructor.name.toLowerCase() === 'user') {
    requirePermission('view_clients')(req, res, next);
  } else {
    next();
  }
}, getClient);

/**
 * ACTUALIZAR CLIENTE ESPECÍFICO
 * PUT /api/clients/:id
 */
router.put('/:id', [
  validateUUID('id'),
  handleValidationErrors,
  sanitizeInput,
  validateSchema(schemas.profileUpdate),
  flexibleAuth({
    allowGuest: false,
    requireVerification: false
  })
], async (req, res, next) => {
  // Los clientes solo pueden actualizar su propio perfil
  // Los admins pueden actualizar cualquier cliente
  if (req.user.constructor.name.toLowerCase() === 'client' && 
      req.user.id !== req.params.id) {
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'Solo puedes actualizar tu propio perfil',
      code: 'CLIENT_SELF_ONLY'
    });
  }
  
  // Si es admin, verificar permisos
  if (req.user.constructor.name.toLowerCase() === 'user') {
    requirePermission('update_clients')(req, res, next);
  } else {
    next();
  }
}, updateClient);

/**
 * ACTUALIZAR PREFERENCIAS DE CLIENTE ESPECÍFICO
 * PUT /api/clients/:id/preferences
 */
router.put('/:id/preferences', [
  validateUUID('id'),
  handleValidationErrors,
  sanitizeInput,
  validateSchema(schemas.preferences),
  flexibleAuth({
    allowGuest: false,
    requireVerification: false
  })
], async (req, res, next) => {
  // Los clientes solo pueden actualizar sus propias preferencias
  // Los admins pueden actualizar preferencias de cualquier cliente
  if (req.user.constructor.name.toLowerCase() === 'client' && 
      req.user.id !== req.params.id) {
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'Solo puedes actualizar tus propias preferencias',
      code: 'CLIENT_PREFERENCES_SELF_ONLY'
    });
  }
  
  // Si es admin, verificar permisos
  if (req.user.constructor.name.toLowerCase() === 'user') {
    requirePermission('update_clients')(req, res, next);
  } else {
    next();
  }
}, updateClientPreferences);

/**
 * REALIZAR CHECK-IN DE CLIENTE
 * POST /api/clients/:id/checkin
 */
router.post('/:id/checkin', [
  validateUUID('id'),
  handleValidationErrors,
  requirePermission('process_checkins'), // Solo staff+ pueden hacer check-ins manuales
  sanitizeInput
], clientCheckIn);

/**
 * AGREGAR PUNTOS A CLIENTE
 * POST /api/clients/:id/points
 */
router.post('/:id/points', [
  validateUUID('id'),
  handleValidationErrors,
  requirePermission('manage_points'), // Solo admins pueden agregar puntos manualmente
  sanitizeInput
], addPointsToClient);

/**
 * MIDDLEWARE DE MANEJO DE ERRORES ESPECÍFICO PARA CLIENTES
 */
router.use((error, req, res, next) => {
  console.error('❌ Error en rutas de clientes:', error.message);
  
  // Error de permisos insuficientes
  if (error.name === 'AuthorizationError') {
    return res.status(403).json({
      error: 'Permisos insuficientes',
      message: 'No tienes autorización para realizar esta acción sobre clientes',
      requiredPermission: error.requiredPermission || 'unknown',
      currentRole: req.user?.role || 'unknown',
      currentType: req.user?.constructor.name.toLowerCase() || 'unknown',
      code: 'INSUFFICIENT_CLIENT_PERMISSIONS'
    });
  }
  
  // Error de acceso a recurso ajeno
  if (error.code === 'CLIENT_SELF_ONLY') {
    return res.status(403).json({
      error: 'Acceso restringido',
      message: 'Los clientes solo pueden acceder a su propia información',
      code: 'CLIENT_SELF_ACCESS_ONLY'
    });
  }
  
  // Error de validación
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Datos de cliente inválidos',
      message: 'Los datos proporcionados no son válidos',
      details: error.errors?.map(e => ({
        field: e.path,
        message: e.message
      })) || [],
      code: 'CLIENT_VALIDATION_ERROR'
    });
  }
  
  // Error genérico
  res.status(500).json({
    error: 'Error interno en gestión de clientes',
    message: 'Ocurrió un error procesando la solicitud de cliente',
    code: 'CLIENT_MANAGEMENT_ERROR',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

/**
 * ESTADO ACTUAL - SUB-FASE 2.3:
 * ✅ Rutas de gestión de clientes implementadas
 * ✅ Control de acceso diferenciado (admins vs clientes)
 * ✅ Middleware de autorización granular aplicado
 * ✅ Validación de datos y UUIDs en parámetros
 * ✅ Endpoints especiales (leaderboard, búsqueda)
 * ✅ Rutas de autogestión para clientes (/me)
 * ✅ Logging de acciones sobre clientes
 * ✅ Manejo de errores específico
 * 
 * RUTAS IMPLEMENTADAS:
 * ✅ GET /api/clients - Listar clientes (solo admins)
 * ✅ GET /api/clients/stats - Estadísticas (solo admins con permisos)
 * ✅ GET /api/clients/me - Perfil propio (solo clientes)
 * ✅ PUT /api/clients/me - Actualizar perfil propio (solo clientes)
 * ✅ PUT /api/clients/me/preferences - Preferencias propias (solo clientes)
 * ✅ GET /api/clients/:id - Ver cliente (admins o propietario)
 * ✅ PUT /api/clients/:id - Actualizar (admins o propietario)
 * ✅ PUT /api/clients/:id/preferences - Preferencias (admins o propietario)
 * ✅ POST /api/clients/:id/checkin - Check-in manual (solo staff+)
 * ✅ POST /api/clients/:id/points - Agregar puntos (solo admins)
 * ✅ GET /api/clients/leaderboard - Top clientes (todos)
 * ✅ GET /api/clients/search - Buscar clientes (solo admins)
 * ✅ GET /api/clients/info - Información de gestión
 * 
 * CONTROLES DE ACCESO:
 * ✅ Clientes solo pueden ver/editar su propia información
 * ✅ Admins pueden gestionar todos los clientes según permisos
 * ✅ Staff puede realizar check-ins manuales
 * ✅ Solo admins pueden agregar puntos manualmente
 * ✅ Leaderboard público para usuarios autenticados
 * ✅ Búsqueda restringida a personal administrativo
 * 
 * MIDDLEWARE APLICADO:
 * ✅ requireAuth - Autenticación en todas las rutas
 * ✅ logAuthorization - Logging de acciones
 * ✅ flexibleAuth - Autorización contextual
 * ✅ requirePermission - Control granular de permisos
 * ✅ validateUUID - Validación de IDs
 * ✅ validateSchema - Validación de datos de entrada
 * ✅ sanitizeInput - Limpieza de datos
 * 
 * FUNCIONALIDADES ESPECIALES:
 * ✅ Autogestión completa para clientes (/me endpoints)
 * ✅ Leaderboard gamificado público
 * ✅ Búsqueda avanzada para administradores
 * ✅ Check-ins manuales con validaciones
 * ✅ Sistema de puntos con logging
 * 
 * LISTO PARA CONTINUAR:
 * ⏭️ Actualizar app.js para integrar todas las rutas
 * ⏭️ Crear tests completos de Sub-fase 2.3
 * ⏭️ Actualizar README.md con progreso
 * ⏭️ Documentación de APIs completada
 */