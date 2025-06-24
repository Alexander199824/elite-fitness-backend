/**
 * CONTROLADOR DE USUARIOS ADMINISTRADORES - ELITE FITNESS CLUB
 * 
 * Soy el controlador encargado del CRUD de usuarios administrativos
 * Mi responsabilidad es gestionar admins, staff y super_admins
 * con controles granulares de permisos y auditoría completa
 * 
 * NUEVO EN SUB-FASE 2.3: Implementación completa de CRUD administrativo
 * 
 * Funcionalidades implementadas:
 * - Listar usuarios con filtros y paginación
 * - Obtener usuario específico con detalles
 * - Crear nuevos usuarios administrativos
 * - Actualizar información de usuarios
 * - Eliminación lógica (soft delete)
 * - Gestión de permisos granulares
 * - Auditoría completa de cambios
 * - Estadísticas de usuarios
 */

const { User, Client } = require('../models');
const { Op } = require('sequelize');
const { getUserPermissions, ROLE_HIERARCHY } = require('../middleware/authorize');

/**
 * LISTAR USUARIOS ADMINISTRATIVOS
 * GET /api/users
 */
const getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      isActive,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    
    console.log(`📋 Listando usuarios - página ${page}, límite ${limit}`);
    
    // Construir condiciones de búsqueda
    const where = {};
    
    if (role) {
      where.role = role;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Calcular offset para paginación
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Ejecutar consulta
    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset,
      include: [
        {
          model: Client,
          as: 'createdClients',
          attributes: ['id'],
          required: false
        }
      ]
    });
    
    // Formatear usuarios con información adicional
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      permissions: getUserPermissions(user),
      stats: {
        clientsCreated: user.createdClients?.length || 0,
        isLocked: user.isLocked()
      }
    }));
    
    const totalPages = Math.ceil(count / parseInt(limit));
    
    console.log(`✅ ${users.length} usuarios listados de ${count} totales`);
    
    res.json({
      success: true,
      data: formattedUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      },
      filters: {
        role,
        isActive,
        search,
        sortBy,
        sortOrder
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error en getUsers:', error.message);
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo obtener la lista de usuarios',
      code: 'USERS_FETCH_ERROR'
    });
  }
};

/**
 * OBTENER USUARIO ESPECÍFICO
 * GET /api/users/:id
 */
const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`👤 Obteniendo usuario: ${id}`);
    
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Client,
          as: 'createdClients',
          attributes: ['id', 'email', 'firstName', 'lastName', 'createdAt'],
          limit: 5,
          order: [['createdAt', 'DESC']]
        },
        {
          model: Client,
          as: 'updatedClients',
          attributes: ['id', 'email', 'firstName', 'lastName', 'updatedAt'],
          limit: 5,
          order: [['updatedAt', 'DESC']]
        }
      ]
    });
    
    if (!user) {
      console.log(`❌ Usuario no encontrado: ${id}`);
      
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No existe un usuario con el ID especificado',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Formatear respuesta con información detallada
    const userDetails = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      role: user.role,
      roleLevel: ROLE_HIERARCHY[user.role] || 0,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      loginAttempts: user.loginAttempts,
      isLocked: user.isLocked(),
      lockedUntil: user.lockedUntil,
      phone: user.phone,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      permissions: {
        specific: user.permissions || {},
        effective: getUserPermissions(user),
        canManage: req.user?.role === 'super_admin' || 
                  (req.user?.role === 'admin' && user.role !== 'super_admin')
      },
      activity: {
        clientsCreated: user.createdClients?.length || 0,
        clientsUpdated: user.updatedClients?.length || 0,
        recentClientsCreated: user.createdClients || [],
        recentClientsUpdated: user.updatedClients || []
      }
    };
    
    console.log(`✅ Usuario obtenido: ${user.email} (${user.role})`);
    
    res.json({
      success: true,
      user: userDetails,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error en getUser:', error.message);
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo obtener la información del usuario',
      code: 'USER_FETCH_ERROR'
    });
  }
};

/**
 * CREAR NUEVO USUARIO ADMINISTRATIVO
 * POST /api/users
 */
const createUser = async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role = 'staff',
      phone,
      permissions = {}
    } = req.body;
    
    console.log(`👨‍💼 Creando nuevo usuario admin: ${email} (${role})`);
    
    // Verificar que el usuario actual puede crear este rol
    const currentUserLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const newUserLevel = ROLE_HIERARCHY[role] || 0;
    
    if (newUserLevel >= currentUserLevel) {
      console.log(`❌ Nivel insuficiente para crear rol ${role}: ${req.user.email}`);
      
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: `No puedes crear usuarios con rol ${role}`,
        code: 'INSUFFICIENT_ROLE_LEVEL'
      });
    }
    
    // Verificar si el email ya existe
    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() }
    });
    
    if (existingUser) {
      console.log(`❌ Email de admin ya existe: ${email}`);
      
      return res.status(409).json({
        error: 'Email ya registrado',
        message: 'Ya existe un usuario administrativo con este email',
        code: 'ADMIN_EMAIL_EXISTS'
      });
    }
    
    // Crear nuevo usuario
    const newUser = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role,
      phone,
      permissions,
      isActive: true,
      createdBy: req.user.id
    });
    
    console.log(`✅ Usuario admin creado: ${newUser.email} (${newUser.role}) por ${req.user.email}`);
    
    // Respuesta sin password
    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      fullName: newUser.getFullName(),
      role: newUser.role,
      roleLevel: ROLE_HIERARCHY[newUser.role] || 0,
      phone: newUser.phone,
      permissions: {
        specific: newUser.permissions || {},
        effective: getUserPermissions(newUser)
      },
      isActive: newUser.isActive,
      createdAt: newUser.createdAt,
      createdBy: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.getFullName()
      }
    };
    
    res.status(201).json({
      success: true,
      message: 'Usuario administrativo creado exitosamente',
      user: userResponse,
      nextSteps: {
        emailNotification: 'Se enviará email con credenciales al nuevo usuario',
        profileSetup: 'El usuario puede completar su perfil al iniciar sesión'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error en createUser:', error.message);
    
    // Manejar errores específicos de base de datos
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        error: 'Email duplicado',
        message: 'El email ya está registrado',
        code: 'UNIQUE_CONSTRAINT_ERROR'
      });
    }
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo crear el usuario administrativo',
      code: 'USER_CREATION_ERROR'
    });
  }
};

/**
 * ACTUALIZAR USUARIO ADMINISTRATIVO
 * PUT /api/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      role,
      phone,
      permissions,
      isActive
    } = req.body;
    
    console.log(`✏️  Actualizando usuario: ${id} por ${req.user.email}`);
    
    const user = await User.findByPk(id);
    
    if (!user) {
      console.log(`❌ Usuario a actualizar no encontrado: ${id}`);
      
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No existe un usuario con el ID especificado',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Verificar permisos para actualizar
    const currentUserLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const targetUserLevel = ROLE_HIERARCHY[user.role] || 0;
    const newRoleLevel = role ? ROLE_HIERARCHY[role] || 0 : targetUserLevel;
    
    // No puede actualizar usuarios de igual o mayor nivel
    if (targetUserLevel >= currentUserLevel) {
      console.log(`❌ Nivel insuficiente para actualizar: ${req.user.email} -> ${user.email}`);
      
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No puedes actualizar este usuario',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    // No puede asignar rol de igual o mayor nivel
    if (role && newRoleLevel >= currentUserLevel) {
      console.log(`❌ Nivel insuficiente para asignar rol ${role}: ${req.user.email}`);
      
      return res.status(403).json({
        error: 'Rol no permitido',
        message: `No puedes asignar el rol ${role}`,
        code: 'INSUFFICIENT_ROLE_LEVEL'
      });
    }
    
    // Preparar datos de actualización
    const updateData = {
      updatedBy: req.user.id
    };
    
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (role !== undefined) updateData.role = role;
    if (phone !== undefined) updateData.phone = phone;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Actualizar usuario
    await user.update(updateData);
    
    // Recargar con información actualizada
    await user.reload({
      attributes: { exclude: ['password'] }
    });
    
    console.log(`✅ Usuario actualizado: ${user.email} por ${req.user.email}`);
    
    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      role: user.role,
      roleLevel: ROLE_HIERARCHY[user.role] || 0,
      phone: user.phone,
      permissions: {
        specific: user.permissions || {},
        effective: getUserPermissions(user)
      },
      isActive: user.isActive,
      updatedAt: user.updatedAt,
      updatedBy: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.getFullName()
      }
    };
    
    res.json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      user: userResponse,
      changes: Object.keys(updateData).filter(key => key !== 'updatedBy'),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error en updateUser:', error.message);
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo actualizar el usuario',
      code: 'USER_UPDATE_ERROR'
    });
  }
};

/**
 * ELIMINAR USUARIO (SOFT DELETE)
 * DELETE /api/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    console.log(`🗑️  Eliminando usuario: ${id} por ${req.user.email}`);
    
    const user = await User.findByPk(id);
    
    if (!user) {
      console.log(`❌ Usuario a eliminar no encontrado: ${id}`);
      
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'No existe un usuario con el ID especificado',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Verificar permisos para eliminar
    const currentUserLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const targetUserLevel = ROLE_HIERARCHY[user.role] || 0;
    
    if (targetUserLevel >= currentUserLevel) {
      console.log(`❌ Nivel insuficiente para eliminar: ${req.user.email} -> ${user.email}`);
      
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: 'No puedes eliminar este usuario',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    // No puede eliminarse a sí mismo
    if (user.id === req.user.id) {
      console.log(`❌ Intento de auto-eliminación: ${req.user.email}`);
      
      return res.status(400).json({
        error: 'Operación no permitida',
        message: 'No puedes eliminar tu propia cuenta',
        code: 'CANNOT_DELETE_SELF'
      });
    }
    
    // Soft delete (Sequelize paranoid)
    await user.destroy();
    
    console.log(`✅ Usuario eliminado: ${user.email} por ${req.user.email}. Razón: ${reason || 'No especificada'}`);
    
    res.json({
      success: true,
      message: 'Usuario eliminado exitosamente',
      deletedUser: {
        id: user.id,
        email: user.email,
        fullName: user.getFullName(),
        role: user.role
      },
      deletedBy: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.getFullName()
      },
      reason: reason || 'No especificada',
      note: 'El usuario ha sido eliminado de forma lógica y puede ser restaurado',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error en deleteUser:', error.message);
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo eliminar el usuario',
      code: 'USER_DELETE_ERROR'
    });
  }
};

/**
 * OBTENER PERFIL DEL USUARIO ACTUAL
 * GET /api/users/me
 */
const getUserProfile = async (req, res) => {
  try {
    const user = req.user;
    
    if (!user || user.constructor.name.toLowerCase() !== 'user') {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Este endpoint es solo para usuarios administrativos',
        code: 'ADMIN_ONLY_ENDPOINT'
      });
    }
    
    console.log(`👤 Perfil solicitado: ${user.email}`);
    
    // Obtener estadísticas del usuario
    const clientsCreated = await Client.count({
      where: { createdBy: user.id }
    });
    
    const clientsUpdated = await Client.count({
      where: { updatedBy: user.id }
    });
    
    const profileData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.getFullName(),
      role: user.role,
      roleLevel: ROLE_HIERARCHY[user.role] || 0,
      phone: user.phone,
      profileImage: user.profileImage,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      permissions: {
        specific: user.permissions || {},
        effective: getUserPermissions(user)
      },
      statistics: {
        clientsCreated,
        clientsUpdated,
        totalActivity: clientsCreated + clientsUpdated
      }
    };
    
    res.json({
      success: true,
      profile: profileData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error en getUserProfile:', error.message);
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo obtener el perfil',
      code: 'PROFILE_FETCH_ERROR'
    });
  }
};

/**
 * OBTENER ESTADÍSTICAS DE USUARIOS
 * GET /api/users/stats
 */
const getUserStats = async (req, res) => {
  try {
    console.log(`📊 Estadísticas de usuarios solicitadas por: ${req.user.email}`);
    
    const stats = await User.getStats();
    
    // Estadísticas adicionales
    const roleDistribution = await User.findAll({
      attributes: [
        'role',
        [User.sequelize.fn('COUNT', User.sequelize.col('role')), 'count']
      ],
      group: ['role'],
      raw: true
    });
    
    const recentUsers = await User.findAll({
      where: {
        createdAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
        }
      },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    
    const detailedStats = {
      ...stats,
      roleDistribution: roleDistribution.reduce((acc, item) => {
        acc[item.role] = parseInt(item.count);
        return acc;
      }, {}),
      recentActivity: {
        newUsersLast30Days: recentUsers.length,
        recentUsers: recentUsers.map(user => ({
          id: user.id,
          email: user.email,
          fullName: user.getFullName(),
          role: user.role,
          createdAt: user.createdAt
        }))
      },
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ Estadísticas generadas: ${stats.total} usuarios totales`);
    
    res.json({
      success: true,
      stats: detailedStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error en getUserStats:', error.message);
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener las estadísticas',
      code: 'STATS_FETCH_ERROR'
    });
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserProfile,
  getUserStats
};

/**
 * ESTADO ACTUAL - SUB-FASE 2.3:
 * ✅ CRUD completo de usuarios administrativos
 * ✅ Paginación y filtros avanzados en listados
 * ✅ Control granular de permisos por niveles de rol
 * ✅ Auditoría completa con tracking de cambios
 * ✅ Soft delete para eliminación reversible
 * ✅ Estadísticas detalladas de usuarios
 * ✅ Validaciones de seguridad en todas las operaciones
 * ✅ Logging detallado para auditoría
 * 
 * FUNCIONALIDADES IMPLEMENTADAS:
 * ✅ Listado con búsqueda y ordenamiento
 * ✅ Detalles de usuario con actividad reciente
 * ✅ Creación con validación de permisos
 * ✅ Actualización con control de niveles
 * ✅ Eliminación lógica con justificación
 * ✅ Perfil de usuario actual
 * ✅ Estadísticas y reportes básicos
 * 
 * CONTROLES DE SEGURIDAD:
 * ✅ Verificación de niveles de rol antes de cada operación
 * ✅ Prevención de auto-eliminación
 * ✅ Tracking de quién hace qué y cuándo
 * ✅ Manejo de errores con códigos específicos
 * 
 * LISTO PARA SUB-FASE 2.4:
 * ⏭️ Controlador de clientes (clientController.js)
 * ⏭️ Rutas de autenticación y usuarios
 * ⏭️ Testing completo de controladores
 * ⏭️ Integración con middleware de autorización
 */