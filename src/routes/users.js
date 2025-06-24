/**
 * RUTAS DE USUARIOS ADMINISTRATIVOS - ELITE FITNESS CLUB
 * 
 * Soy el archivo que define todas las rutas para gestión de usuarios admins
 * Mi responsabilidad es conectar endpoints con controladores aplicando
 * middleware de autorización granular según roles y permisos
 * 
 * NUEVO EN SUB-FASE 2.3: Implementación completa de rutas administrativas
 * 
 * Rutas implementadas:
 * - GET / - Listar usuarios con filtros y paginación
 * - GET /stats - Estadísticas de usuarios administrativos
 * - GET /me - Perfil del usuario administrativo actual
 * - GET /:id - Obtener usuario específico
 * - POST / - Crear nuevo usuario administrativo
 * - PUT /:id - Actualizar usuario administrativo
 * - DELETE /:id - Eliminar usuario (soft delete)
 */

const express = require('express');
const router = express.Router();

// Importar controladores
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserProfile,
  getUserStats
} = require('../controllers/userController');

// Importar middleware de autenticación y autorización
const { 
  requireAuth,
  requireAdmin,
  requireUserType
} = require('../middleware/auth');

const {
  requireRole,
  requirePermission,
  requireOwnership,
  logAuthorization,
  getCurrentUserPermissions
} = require('../middleware/authorize');

const {
  validateUUID,
  handleValidationErrors,
  sanitizeInput
} = require('../middleware/validation');

/**
 * APLICAR MIDDLEWARE BASE A TODAS LAS RUTAS
 * Todas las rutas de usuarios requieren autenticación administrativa
 */
router.use([
  requireAuth,
  requireUserType('user'), // Solo usuarios administrativos
  logAuthorization('user_management')
]);

/**
 * ENDPOINT INFORMATIVO DE GESTIÓN DE USUARIOS
 * GET /api/users
 */
router.get('/', [
  requirePermission('view_users')
], getUsers);

/**
 * OBTENER ESTADÍSTICAS DE USUARIOS
 * GET /api/users/stats
 */
router.get('/stats', [
  requireRole('admin') // Solo admins pueden ver estadísticas
], getUserStats);

/**
 * OBTENER PERFIL DEL USUARIO ADMINISTRATIVO ACTUAL
 * GET /api/users/me
 */
router.get('/me', [
  // No requiere permisos adicionales, cualquier admin puede ver su propio perfil
], getUserProfile);

/**
 * OBTENER PERMISOS DEL USUARIO ACTUAL
 * GET /api/users/me/permissions
 */
router.get('/me/permissions', [
  // No requiere permisos adicionales
], getCurrentUserPermissions);

/**
 * CREAR NUEVO USUARIO ADMINISTRATIVO
 * POST /api/users
 */
router.post('/', [
  requirePermission('create_users'),
  sanitizeInput
], createUser);

/**
 * OBTENER USUARIO ESPECÍFICO
 * GET /api/users/:id
 */
router.get('/:id', [
  validateUUID('id'),
  handleValidationErrors,
  requirePermission('view_users')
], getUser);

/**
 * ACTUALIZAR USUARIO ADMINISTRATIVO
 * PUT /api/users/:id
 */
router.put('/:id', [
  validateUUID('id'),
  handleValidationErrors,
  sanitizeInput,
  requirePermission('update_users')
], updateUser);

/**
 * ELIMINAR USUARIO ADMINISTRATIVO (SOFT DELETE)
 * DELETE /api/users/:id
 */
router.delete('/:id', [
  validateUUID('id'),
  handleValidationErrors,
  requirePermission('delete_users')
], deleteUser);

/**
 * ENDPOINT DE INFORMACIÓN DE GESTIÓN DE USUARIOS
 * GET /api/users/info
 */
router.get('/info', [
  requirePermission('view_users')
], (req, res) => {
  try {
    const { getUserPermissions, ROLE_HIERARCHY, DEFAULT_PERMISSIONS } = require('../middleware/authorize');
    
    const userPermissions = getUserPermissions(req.user);
    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    
    res.json({
      message: '👥 Elite Fitness Club - Gestión de Usuarios Administrativos',
      version: '1.0.0 - Sub-fase 2.3',
      currentUser: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        level: userLevel,
        permissions: userPermissions.length
      },
      endpoints: {
        list: 'GET /api/users - Listar usuarios con filtros',
        stats: 'GET /api/users/stats - Estadísticas administrativas',
        profile: 'GET /api/users/me - Mi perfil administrativo',
        permissions: 'GET /api/users/me/permissions - Mis permisos',
        create: 'POST /api/users - Crear nuevo admin',
        view: 'GET /api/users/:id - Ver usuario específico',
        update: 'PUT /api/users/:id - Actualizar usuario',
        delete: 'DELETE /api/users/:id - Eliminar usuario'
      },
      capabilities: {
        canViewUsers: userPermissions.includes('view_users'),
        canCreateUsers: userPermissions.includes('create_users'),
        canUpdateUsers: userPermissions.includes('update_users'),
        canDeleteUsers: userPermissions.includes('delete_users'),
        canViewStats: req.user.role === 'super_admin' || req.user.role === 'admin'
      },
      roleHierarchy: ROLE_HIERARCHY,
      queryParameters: {
        list: {
          page: 'Número de página (default: 1)',
          limit: 'Items por página (default: 10)',
          role: 'Filtrar por rol (super_admin, admin, staff)',
          isActive: 'Filtrar por estado (true/false)',
          search: 'Buscar en nombre, apellido o email',
          sortBy: 'Campo de ordenamiento (default: createdAt)',
          sortOrder: 'Orden (ASC/DESC, default: DESC)'
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
 * MIDDLEWARE DE MANEJO DE ERRORES ESPECÍFICO PARA USUARIOS
 */
router.use((error, req, res, next) => {
  console.error('❌ Error en rutas de usuarios:', error.message);
  
  // Error de permisos insuficientes
  if (error.name === 'AuthorizationError') {
    return res.status(403).json({
      error: 'Permisos insuficientes',
      message: 'No tienes autorización para realizar esta acción sobre usuarios',
      requiredPermission: error.requiredPermission || 'unknown',
      currentRole: req.user?.role || 'unknown',
      code: 'INSUFFICIENT_USER_PERMISSIONS'
    });
  }
  
  // Error de validación de UUID
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Datos de usuario inválidos',
      message: 'Los datos proporcionados no son válidos',
      details: error.errors?.map(e => ({
        field: e.path,
        message: e.message
      })) || [],
      code: 'USER_VALIDATION_ERROR'
    });
  }
  
  // Error genérico
  res.status(500).json({
    error: 'Error interno en gestión de usuarios',
    message: 'Ocurrió un error procesando la solicitud de usuario',
    code: 'USER_MANAGEMENT_ERROR',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

/**
 * ESTADO ACTUAL - SUB-FASE 2.3:
 * ✅ Rutas de gestión de usuarios administrativos implementadas
 * ✅ Middleware de autorización granular aplicado
 * ✅ Control de permisos específicos por endpoint
 * ✅ Validación de UUIDs en parámetros de ruta
 * ✅ Sanitización de datos de entrada
 * ✅ Logging de acciones administrativas
 * ✅ Endpoint informativo con capacidades del usuario
 * ✅ Manejo de errores específico para gestión de usuarios
 * 
 * RUTAS IMPLEMENTADAS:
 * ✅ GET /api/users - Listar usuarios (requiere view_users)
 * ✅ GET /api/users/stats - Estadísticas (requiere admin+)
 * ✅ GET /api/users/me - Perfil propio (sin permisos adicionales)
 * ✅ GET /api/users/me/permissions - Permisos propios
 * ✅ POST /api/users - Crear usuario (requiere create_users)
 * ✅ GET /api/users/:id - Ver usuario (requiere view_users)
 * ✅ PUT /api/users/:id - Actualizar (requiere update_users)
 * ✅ DELETE /api/users/:id - Eliminar (requiere delete_users)
 * ✅ GET /api/users/info - Información de gestión
 * 
 * MIDDLEWARE APLICADO:
 * ✅ requireAuth - Autenticación requerida en todas las rutas
 * ✅ requireUserType('user') - Solo usuarios administrativos
 * ✅ logAuthorization - Logging de acciones administrativas
 * ✅ requirePermission - Control granular por endpoint
 * ✅ requireRole - Control por nivel de rol
 * ✅ validateUUID - Validación de IDs en parámetros
 * ✅ sanitizeInput - Limpieza de datos de entrada
 * 
 * CONTROLES DE SEGURIDAD:
 * ✅ Verificación de permisos antes de cada operación
 * ✅ Logging de todas las acciones administrativas
 * ✅ Validación de datos de entrada y parámetros
 * ✅ Manejo de errores con códigos específicos
 * ✅ Información contextual sobre capacidades del usuario
 * 
 * LISTO PARA CONTINUAR:
 * ⏭️ Rutas de clientes (routes/clients.js)
 * ⏭️ Integración en app.js principal
 * ⏭️ Testing completo de rutas administrativas
 * ⏭️ Documentación de endpoints
 */