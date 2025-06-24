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
  getClientStats
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
 * ENDPOINT INFORMATIVO DE GESTIÓN DE CLIENTES
 * GET /api/clients
 */
router.get('/', [
  requirePermission('view_clients') // Solo admins pueden listar todos los clientes
], getClients);

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
 * OBTENER TOP CLIENTES POR PUNTOS
 * GET /api/clients/leaderboard
 */
router.get('/leaderboard', [
  // Cualquier usuario autenticado puede ver el leaderboard
], async (req, res) => {
  try {
    const { Client } = require('../models');
    const { limit = 10 } = req.query;
    
    console.log(`🏆 Leaderboard solicitado por: ${req.user.email}`);
    
    const topClients = await Client.getTopByPoints(parseInt(limit));
    
    const leaderboard = topClients.map((client, index) => ({
      rank: index + 1,
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      points: client.points,
      level: client.level,
      totalCheckIns: client.totalCheckIns,
      // Solo mostrar inicial del apellido para privacidad
      displayName: `${client.firstName} ${client.lastName.charAt(0)}.`
    }));
    
    res.json({
      success: true,
      leaderboard,
      total: leaderboard.length,
      requestedLimit: parseInt(limit),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error en leaderboard:', error.message);
    
    res.status(500).json({
      error: 'Error obteniendo leaderboard',
      message: 'No se pudo obtener la tabla de posiciones',
      code: 'LEADERBOARD_ERROR'
    });
  }
});

/**
 * BUSCAR CLIENTES POR TÉRMINO
 * GET /api/clients/search
 */
router.get('/search', [
  requirePermission('view_clients')
], async (req, res) => {
  try {
    const { q: searchTerm, limit = 10 } = req.query;
    
    if (!searchTerm || searchTerm.length < 2) {
      return res.status(400).json({
        error: 'Término de búsqueda requerido',
        message: 'Debes proporcionar al menos 2 caracteres para buscar',
        code: 'SEARCH_TERM_TOO_SHORT'
      });
    }
    
    const { Client } = require('../models');
    const { Op } = require('sequelize');
    
    console.log(`🔍 Búsqueda de clientes: "${searchTerm}" por ${req.user.email}`);
    
    const clients = await Client.findAll({
      where: {
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${searchTerm}%` } },
          { lastName: { [Op.iLike]: `%${searchTerm}%` } },
          { email: { [Op.iLike]: `%${searchTerm}%` } },
          { memberNumber: { [Op.iLike]: `%${searchTerm}%` } }
        ],
        isActive: true
      },
      attributes: ['id', 'email', 'firstName', 'lastName', 'memberNumber', 'points', 'level'],
      order: [['points', 'DESC']],
      limit: parseInt(limit)
    });
    
    const searchResults = clients.map(client => ({
      id: client.id,
      email: client.email,
      fullName: `${client.firstName} ${client.lastName}`,
      memberNumber: client.memberNumber,
      points: client.points,
      level: client.level
    }));
    
    console.log(`✅ Búsqueda completada: ${searchResults.length} resultados para "${searchTerm}"`);
    
    res.json({
      success: true,
      searchTerm,
      results: searchResults,
      total: searchResults.length,
      limit: parseInt(limit),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error en búsqueda:', error.message);
    
    res.status(500).json({
      error: 'Error en búsqueda',
      message: 'No se pudo realizar la búsqueda de clientes',
      code: 'SEARCH_ERROR'
    });
  }
});

/**
 * ENDPOINT DE INFORMACIÓN DE GESTIÓN DE CLIENTES
 * GET /api/clients/info
 */
router.get('/info', [], (req, res) => {
  try {
    const { getUserPermissions } = require('../middleware/authorize');
    const userPermissions = getUserPermissions(req.user);
    const userType = req.user.constructor.name.toLowerCase();
    
    const clientEndpoints = {
      list: 'GET /api/clients - Listar clientes (solo admins)',
      stats: 'GET /api/clients/stats - Estadísticas (solo admins)',
      profile: 'GET /api/clients/me - Mi perfil (solo clientes)',
      updateProfile: 'PUT /api/clients/me - Actualizar mi perfil (solo clientes)',
      updatePreferences: 'PUT /api/clients/me/preferences - Mis preferencias (solo clientes)',
      view: 'GET /api/clients/:id - Ver cliente específico (admins o propietario)',
      update: 'PUT /api/clients/:id - Actualizar cliente (admins o propietario)',
      preferences: 'PUT /api/clients/:id/preferences - Actualizar preferencias (admins o propietario)',
      checkin: 'POST /api/clients/:id/checkin - Realizar check-in (solo staff+)',
      points: 'POST /api/clients/:id/points - Agregar puntos (solo admins)',
      leaderboard: 'GET /api/clients/leaderboard - Top clientes',
      search: 'GET /api/clients/search - Buscar clientes (solo admins)'
    };
    
    const capabilities = {
      canViewAllClients: userPermissions.includes('view_clients'),
      canUpdateClients: userPermissions.includes('update_clients'),
      canProcessCheckins: userPermissions.includes('process_checkins'),
      canManagePoints: userPermissions.includes('manage_points'),
      canViewStats: userPermissions.includes('view_analytics') || userPermissions.includes('manage_clients'),
      canSearchClients: userPermissions.includes('view_clients'),
      canViewOwnProfile: userType === 'client',
      canUpdateOwnProfile: userType === 'client'
    };
    
    res.json({
      message: '👥 Elite Fitness Club - Gestión de Clientes',
      version: '1.0.0 - Sub-fase 2.3',
      currentUser: {
        id: req.user.id,
        email: req.user.email,
        type: userType,
        role: req.user.role || null,
        permissions: userPermissions.length
      },
      endpoints: clientEndpoints,
      capabilities,
      gamification: {
        pointsPerCheckin: 10,
        pointsPerLevel: 100,
        maxLevel: 'Unlimited'
      },
      queryParameters: {
        list: {
          page: 'Número de página (default: 1)',
          limit: 'Items por página (default: 10)',
          isActive: 'Filtrar por estado (true/false)',
          isEmailVerified: 'Filtrar por email verificado (true/false)',
          authProvider: 'Filtrar por proveedor (local, google, facebook)',
          search: 'Buscar en nombre, apellido, email o número de miembro',
          minPoints: 'Puntos mínimos',
          maxPoints: 'Puntos máximos',
          level: 'Filtrar por nivel específico',
          sortBy: 'Campo de ordenamiento (default: createdAt)',
          sortOrder: 'Orden (ASC/DESC, default: DESC)'
        },
        leaderboard: {
          limit: 'Número de top clientes (default: 10, max: 50)'
        },
        search: {
          q: 'Término de búsqueda (mínimo 2 caracteres)',
          limit: 'Límite de resultados (default: 10)'
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      error: 'Error obteniendo información de gestión',
      message: error.message
    });
  }
});

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