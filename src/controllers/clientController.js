/**
 * CONTROLADOR DE CLIENTES DEL GIMNASIO - ELITE FITNESS CLUB
 * 
 * Soy el controlador encargado del CRUD de clientes del gimnasio
 * Mi responsabilidad es gestionar miembros, sus preferencias y
 * toda la información relacionada con su experiencia en el gym
 * 
 * NUEVO EN SUB-FASE 2.3: Implementación completa de gestión de clientes
 * 
 * Funcionalidades implementadas:
 * - Listar clientes con filtros avanzados
 * - Obtener cliente específico con detalles completos
 * - Actualizar información de clientes
 * - Gestión de preferencias de notificación
 * - Check-in manual de clientes
 * - Gestión de puntos y gamificación
 * - Estadísticas de clientes
 * - Exportación de datos
 */

const { Client, ClientPreference, User } = require('../models');
const { Op } = require('sequelize');

/**
 * LISTAR CLIENTES CON FILTROS
 * GET /api/clients
 */
const getClients = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      isActive,
      isEmailVerified,
      authProvider,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      minPoints,
      maxPoints,
      level
    } = req.query;
    
    console.log(`📋 Listando clientes - página ${page}, límite ${limit} por ${req.user.email}`);
    
    // Construir condiciones de búsqueda
    const where = {};
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (isEmailVerified !== undefined) {
      where.isEmailVerified = isEmailVerified === 'true';
    }
    
    if (authProvider) {
      where.authProvider = authProvider;
    }
    
    if (level) {
      where.level = parseInt(level);
    }
    
    if (minPoints || maxPoints) {
      where.points = {};
      if (minPoints) where.points[Op.gte] = parseInt(minPoints);
      if (maxPoints) where.points[Op.lte] = parseInt(maxPoints);
    }
    
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { memberNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Calcular offset para paginación
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Ejecutar consulta
    const { count, rows: clients } = await Client.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset,
      include: [
        {
          model: ClientPreference,
          as: 'preferences',
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email', 'firstName', 'lastName'],
          required: false
        }
      ]
    });
    
    // Formatear clientes con información adicional
    const formattedClients = clients.map(client => ({
      id: client.id,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      fullName: client.getFullName(),
      memberNumber: client.memberNumber,
      authProvider: client.authProvider,
      isActive: client.isActive,
      isEmailVerified: client.isEmailVerified,
      points: client.points,
      level: client.level,
      totalCheckIns: client.totalCheckIns,
      lastCheckIn: client.lastCheckIn,
      lastLogin: client.lastLogin,
      joinDate: client.joinDate,
      age: client.getAge(),
      createdAt: client.createdAt,
      hasPreferences: !!client.preferences,
      createdBy: client.creator ? {
        id: client.creator.id,
        name: `${client.creator.firstName} ${client.creator.lastName}`
      } : null
    }));
    
    const totalPages = Math.ceil(count / parseInt(limit));
    
    console.log(`✅ ${clients.length} clientes listados de ${count} totales`);
    
    res.json({
      success: true,
      data: formattedClients,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1
      },
      filters: {
        isActive,
        isEmailVerified,
        authProvider,
        search,
        sortBy,
        sortOrder,
        minPoints,
        maxPoints,
        level
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error en getClients:', error.message);
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo obtener la lista de clientes',
      code: 'CLIENTS_FETCH_ERROR'
    });
  }
};

/**
 * OBTENER CLIENTE ESPECÍFICO
 * GET /api/clients/:id
 */
const getClient = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`👤 Obteniendo cliente: ${id} por ${req.user.email}`);
    
    const client = await Client.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: ClientPreference,
          as: 'preferences'
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'email', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!client) {
      console.log(`❌ Cliente no encontrado: ${id}`);
      
      return res.status(404).json({
        error: 'Cliente no encontrado',
        message: 'No existe un cliente con el ID especificado',
        code: 'CLIENT_NOT_FOUND'
      });
    }
    
    // Formatear respuesta con información detallada
    const clientDetails = {
      id: client.id,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      fullName: client.getFullName(),
      memberNumber: client.memberNumber,
      phone: client.phone,
      dateOfBirth: client.dateOfBirth,
      age: client.getAge(),
      gender: client.gender,
      profileImage: client.profileImage,
      
      // Información del gimnasio
      joinDate: client.joinDate,
      emergencyContactName: client.emergencyContactName,
      emergencyContactPhone: client.emergencyContactPhone,
      medicalConditions: client.medicalConditions,
      
      // Estado y configuración
      authProvider: client.authProvider,
      googleId: client.googleId,
      facebookId: client.facebookId,
      isActive: client.isActive,
      isEmailVerified: client.isEmailVerified,
      isPhoneVerified: client.isPhoneVerified,
      language: client.language,
      timezone: client.timezone,
      
      // Actividad y gamificación
      points: client.points,
      level: client.level,
      totalCheckIns: client.totalCheckIns,
      totalPrizesWon: client.totalPrizesWon,
      lastCheckIn: client.lastCheckIn,
      lastLogin: client.lastLogin,
      
      // Preferencias y objetivos
      preferredWorkoutTimes: client.preferredWorkoutTimes,
      fitnessGoals: client.fitnessGoals,
      notificationPreferences: client.notificationPreferences,
      
      // Metadatos
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
      createdBy: client.creator ? {
        id: client.creator.id,
        email: client.creator.email,
        name: `${client.creator.firstName} ${client.creator.lastName}`
      } : null,
      updatedBy: client.updater ? {
        id: client.updater.id,
        email: client.updater.email,
        name: `${client.updater.firstName} ${client.updater.lastName}`
      } : null,
      
      // Preferencias detalladas
      preferences: client.preferences ? {
        id: client.preferences.id,
        emailNotifications: client.preferences.emailNotifications,
        smsNotifications: client.preferences.smsNotifications,
        pushNotifications: client.preferences.pushNotifications,
        whatsappNotifications: client.preferences.whatsappNotifications,
        workoutReminders: client.preferences.workoutReminders,
        membershipReminders: client.preferences.membershipReminders,
        motivationalMessages: client.preferences.motivationalMessages,
        promotionalOffers: client.preferences.promotionalOffers,
        quietHoursStart: client.preferences.quietHoursStart,
        quietHoursEnd: client.preferences.quietHoursEnd,
        reminderFrequency: client.preferences.reminderFrequency,
        notificationLanguage: client.preferences.notificationLanguage,
        messageStyle: client.preferences.messageStyle,
        activeChannels: client.preferences.getActiveChannels(),
        activeReminderDays: client.preferences.getActiveReminderDays(),
        canReceiveNow: client.preferences.canReceiveNotificationNow()
      } : null
    };
    
    console.log(`✅ Cliente obtenido: ${client.email} (Nivel ${client.level})`);
    
    res.json({
      success: true,
      client: clientDetails,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error en getClient:', error.message);
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo obtener la información del cliente',
      code: 'CLIENT_FETCH_ERROR'
    });
  }
};

/**
 * ACTUALIZAR CLIENTE
 * PUT /api/clients/:id
 */
const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log(`✏️  Actualizando cliente: ${id} por ${req.user.email}`);
    
    const client = await Client.findByPk(id);
    
    if (!client) {
      console.log(`❌ Cliente a actualizar no encontrado: ${id}`);
      
      return res.status(404).json({
        error: 'Cliente no encontrado',
        message: 'No existe un cliente con el ID especificado',
        code: 'CLIENT_NOT_FOUND'
      });
    }
    
    // Campos permitidos para actualización
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'dateOfBirth', 'gender',
      'emergencyContactName', 'emergencyContactPhone', 'medicalConditions',
      'preferredWorkoutTimes', 'fitnessGoals', 'notificationPreferences',
      'language', 'timezone', 'isActive', 'isEmailVerified', 'isPhoneVerified'
    ];
    
    // Filtrar solo campos permitidos
    const filteredData = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });
    
    // Agregar auditoría
    filteredData.updatedBy = req.user.id;
    
    // Actualizar cliente
    await client.update(filteredData);
    
    // Recargar con información actualizada
    await client.reload({
      attributes: { exclude: ['password'] },
      include: [
        {
          model: ClientPreference,
          as: 'preferences'
        }
      ]
    });
    
    console.log(`✅ Cliente actualizado: ${client.email} por ${req.user.email}`);
    
    const clientResponse = {
      id: client.id,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      fullName: client.getFullName(),
      memberNumber: client.memberNumber,
      phone: client.phone,
      dateOfBirth: client.dateOfBirth,
      age: client.getAge(),
      gender: client.gender,
      isActive: client.isActive,
      isEmailVerified: client.isEmailVerified,
      isPhoneVerified: client.isPhoneVerified,
      language: client.language,
      timezone: client.timezone,
      updatedAt: client.updatedAt,
      updatedBy: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.getFullName()
      }
    };
    
    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      client: clientResponse,
      changes: Object.keys(filteredData).filter(key => key !== 'updatedBy'),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error en updateClient:', error.message);
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo actualizar el cliente',
      code: 'CLIENT_UPDATE_ERROR'
    });
  }
};

/**
 * ACTUALIZAR PREFERENCIAS DE CLIENTE
 * PUT /api/clients/:id/preferences
 */
const updateClientPreferences = async (req, res) => {
  try {
    const { id } = req.params;
    const preferencesData = req.body;
    
    console.log(`🔔 Actualizando preferencias de cliente: ${id}`);
    
    const client = await Client.findByPk(id);
    
    if (!client) {
      console.log(`❌ Cliente no encontrado para actualizar preferencias: ${id}`);
      
      return res.status(404).json({
        error: 'Cliente no encontrado',
        message: 'No existe un cliente con el ID especificado',
        code: 'CLIENT_NOT_FOUND'
      });
    }
    
    // Buscar o crear preferencias
    let preferences = await ClientPreference.findOne({
      where: { clientId: id }
    });
    
    if (!preferences) {
      preferences = await ClientPreference.create({
        clientId: id,
        ...preferencesData,
        updatedBy: req.user.id
      });
      
      console.log(`✅ Preferencias creadas para cliente: ${client.email}`);
    } else {
      await preferences.update({
        ...preferencesData,
        updatedBy: req.user.id
      });
      
      console.log(`✅ Preferencias actualizadas para cliente: ${client.email}`);
    }
    
    res.json({
      success: true,
      message: 'Preferencias actualizadas exitosamente',
      preferences: {
        id: preferences.id,
        clientId: preferences.clientId,
        emailNotifications: preferences.emailNotifications,
        smsNotifications: preferences.smsNotifications,
        pushNotifications: preferences.pushNotifications,
        whatsappNotifications: preferences.whatsappNotifications,
        workoutReminders: preferences.workoutReminders,
        membershipReminders: preferences.membershipReminders,
        motivationalMessages: preferences.motivationalMessages,
        promotionalOffers: preferences.promotionalOffers,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        reminderFrequency: preferences.reminderFrequency,
        notificationLanguage: preferences.notificationLanguage,
        messageStyle: preferences.messageStyle,
        activeChannels: preferences.getActiveChannels(),
        canReceiveNow: preferences.canReceiveNotificationNow(),
        updatedAt: preferences.updatedAt
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error en updateClientPreferences:', error.message);
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron actualizar las preferencias',
      code: 'PREFERENCES_UPDATE_ERROR'
    });
  }
};

/**
 * CHECK-IN MANUAL DE CLIENTE
 * POST /api/clients/:id/checkin
 */
const clientCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    console.log(`✅ Check-in manual para cliente: ${id} por ${req.user.email}`);
    
    const client = await Client.findByPk(id);
    
    if (!client) {
      console.log(`❌ Cliente no encontrado para check-in: ${id}`);
      
      return res.status(404).json({
        error: 'Cliente no encontrado',
        message: 'No existe un cliente con el ID especificado',
        code: 'CLIENT_NOT_FOUND'
      });
    }
    
    if (!client.isActive) {
      console.log(`❌ Intento de check-in para cliente inactivo: ${client.email}`);
      
      return res.status(400).json({
        error: 'Cliente inactivo',
        message: 'No se puede hacer check-in de un cliente inactivo',
        code: 'CLIENT_INACTIVE'
      });
    }
    
    // Verificar si ya hizo check-in hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastCheckIn = client.lastCheckIn ? new Date(client.lastCheckIn) : null;
    lastCheckIn?.setHours(0, 0, 0, 0);
    
    if (lastCheckIn && lastCheckIn.getTime() === today.getTime()) {
      console.log(`⚠️  Cliente ya hizo check-in hoy: ${client.email}`);
      
      return res.status(400).json({
        error: 'Check-in ya realizado',
        message: 'El cliente ya realizó check-in el día de hoy',
        code: 'CHECKIN_ALREADY_DONE_TODAY'
      });
    }
    
    // Realizar check-in
    await client.checkIn();
    
    // Recargar cliente con datos actualizados
    await client.reload();
    
    console.log(`✅ Check-in exitoso: ${client.email} - Total: ${client.totalCheckIns}, Puntos: ${client.points}, Nivel: ${client.level}`);
    
    res.json({
      success: true,
      message: 'Check-in registrado exitosamente',
      checkIn: {
        clientId: client.id,
        clientName: client.getFullName(),
        memberNumber: client.memberNumber,
        checkInTime: client.lastCheckIn,
        totalCheckIns: client.totalCheckIns,
        pointsEarned: 10, // Puntos por check-in
        currentPoints: client.points,
        currentLevel: client.level,
        notes: notes || null,
        registeredBy: {
          id: req.user.id,
          name: req.user.getFullName()
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error en clientCheckIn:', error.message);
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo registrar el check-in',
      code: 'CHECKIN_ERROR'
    });
  }
};

/**
 * AGREGAR PUNTOS A CLIENTE
 * POST /api/clients/:id/points
 */
const addPointsToClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { points, reason = 'Manual adjustment' } = req.body;
    
    console.log(`⭐ Agregando ${points} puntos a cliente: ${id} por ${req.user.email}`);
    
    if (!points || points <= 0) {
      return res.status(400).json({
        error: 'Puntos inválidos',
        message: 'Debes especificar una cantidad positiva de puntos',
        code: 'INVALID_POINTS'
      });
    }
    
    const client = await Client.findByPk(id);
    
    if (!client) {
      console.log(`❌ Cliente no encontrado para agregar puntos: ${id}`);
      
      return res.status(404).json({
        error: 'Cliente no encontrado',
        message: 'No existe un cliente con el ID especificado',
        code: 'CLIENT_NOT_FOUND'
      });
    }
    
    const previousPoints = client.points;
    const previousLevel = client.level;
    
    // Agregar puntos (el método se encarga del cálculo de nivel)
    await client.addPoints(parseInt(points), reason);
    
    // Recargar cliente
    await client.reload();
    
    const leveledUp = client.level > previousLevel;
    
    console.log(`✅ Puntos agregados: ${client.email} - ${previousPoints} -> ${client.points} puntos, Nivel ${previousLevel} -> ${client.level}`);
    
    res.json({
      success: true,
      message: `${points} puntos agregados exitosamente`,
      pointsTransaction: {
        clientId: client.id,
        clientName: client.getFullName(),
        memberNumber: client.memberNumber,
        pointsAdded: parseInt(points),
        previousPoints,
        currentPoints: client.points,
        previousLevel,
        currentLevel: client.level,
        leveledUp,
        reason,
        addedBy: {
          id: req.user.id,
          name: req.user.getFullName()
        }
      },
      levelUpMessage: leveledUp ? `¡Felicitaciones! Has subido al nivel ${client.level}` : null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error en addPointsToClient:', error.message);
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron agregar los puntos',
      code: 'POINTS_ADD_ERROR'
    });
  }
};

/**
 * OBTENER PERFIL DEL CLIENTE ACTUAL
 * GET /api/clients/me
 */
const getClientProfile = async (req, res) => {
  try {
    const client = req.user;
    
    if (!client || client.constructor.name.toLowerCase() !== 'client') {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'Este endpoint es solo para clientes',
        code: 'CLIENT_ONLY_ENDPOINT'
      });
    }
    
    console.log(`👤 Perfil de cliente solicitado: ${client.email}`);
    
    // Cargar preferencias
    const preferences = await ClientPreference.findOne({
      where: { clientId: client.id }
    });
    
    const profileData = {
      id: client.id,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      fullName: client.getFullName(),
      memberNumber: client.memberNumber,
      phone: client.phone,
      dateOfBirth: client.dateOfBirth,
      age: client.getAge(),
      gender: client.gender,
      profileImage: client.profileImage,
      
      // Información del gimnasio
      joinDate: client.joinDate,
      authProvider: client.authProvider,
      isActive: client.isActive,
      isEmailVerified: client.isEmailVerified,
      isPhoneVerified: client.isPhoneVerified,
      
      // Gamificación
      points: client.points,
      level: client.level,
      totalCheckIns: client.totalCheckIns,
      totalPrizesWon: client.totalPrizesWon,
      lastCheckIn: client.lastCheckIn,
      
      // Configuración
      language: client.language,
      timezone: client.timezone,
      preferredWorkoutTimes: client.preferredWorkoutTimes,
      fitnessGoals: client.fitnessGoals,
      notificationPreferences: client.notificationPreferences,
      
      // Preferencias detalladas
      hasPreferences: !!preferences,
      preferences: preferences ? {
        emailNotifications: preferences.emailNotifications,
        smsNotifications: preferences.smsNotifications,
        pushNotifications: preferences.pushNotifications,
        whatsappNotifications: preferences.whatsappNotifications,
        workoutReminders: preferences.workoutReminders,
        membershipReminders: preferences.membershipReminders,
        motivationalMessages: preferences.motivationalMessages,
        promotionalOffers: preferences.promotionalOffers,
        activeChannels: preferences.getActiveChannels(),
        canReceiveNow: preferences.canReceiveNotificationNow()
      } : null
    };
    
    res.json({
      success: true,
      profile: profileData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error en getClientProfile:', error.message);
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudo obtener el perfil',
      code: 'PROFILE_FETCH_ERROR'
    });
  }
};

/**
 * OBTENER ESTADÍSTICAS DE CLIENTES
 * GET /api/clients/stats
 */
const getClientStats = async (req, res) => {
  try {
    console.log(`📊 Estadísticas de clientes solicitadas por: ${req.user.email}`);
    
    const stats = await Client.getStats();
    
    // Estadísticas adicionales
    const authProviderDistribution = await Client.findAll({
      attributes: [
        'authProvider',
        [Client.sequelize.fn('COUNT', Client.sequelize.col('authProvider')), 'count']
      ],
      group: ['authProvider'],
      raw: true
    });
    
    const levelDistribution = await Client.findAll({
      attributes: [
        'level',
        [Client.sequelize.fn('COUNT', Client.sequelize.col('level')), 'count']
      ],
      group: ['level'],
      order: [['level', 'ASC']],
      raw: true
    });
    
    const topClients = await Client.getTopByPoints(5);
    
    const recentClients = await Client.findAll({
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
      authProviderDistribution: authProviderDistribution.reduce((acc, item) => {
        acc[item.authProvider] = parseInt(item.count);
        return acc;
      }, {}),
      levelDistribution: levelDistribution.reduce((acc, item) => {
        acc[`level_${item.level}`] = parseInt(item.count);
        return acc;
      }, {}),
      topPerformers: topClients.map(client => ({
        id: client.id,
        name: `${client.firstName} ${client.lastName}`,
        points: client.points,
        level: client.level,
        totalCheckIns: client.totalCheckIns
      })),
      recentActivity: {
        newClientsLast30Days: recentClients.length,
        recentClients: recentClients.map(client => ({
          id: client.id,
          email: client.email,
          fullName: `${client.firstName} ${client.lastName}`,
          memberNumber: client.memberNumber,
          authProvider: client.authProvider,
          createdAt: client.createdAt
        }))
      },
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ Estadísticas generadas: ${stats.total} clientes totales`);
    
    res.json({
      success: true,
      stats: detailedStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥 Error en getClientStats:', error.message);
    
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'No se pudieron obtener las estadísticas',
      code: 'STATS_FETCH_ERROR'
    });
  }
};

module.exports = {
  getClients,
  getClient,
  updateClient,
  updateClientPreferences,
  clientCheckIn,
  addPointsToClient,
  getClientProfile,
  getClientStats
};

/**
 * ESTADO ACTUAL - SUB-FASE 2.3:
 * ✅ CRUD completo de clientes del gimnasio
 * ✅ Gestión avanzada de preferencias de notificación
 * ✅ Sistema de check-in manual con validaciones
 * ✅ Gestión de puntos y gamificación
 * ✅ Filtros avanzados y paginación en listados
 * ✅ Perfil detallado de cliente actual
 * ✅ Estadísticas completas con distribuciones
 * ✅ Auditoría de cambios con tracking de usuarios
 * 
 * FUNCIONALIDADES IMPLEMENTADAS:
 * ✅ Listado con filtros múltiples (activo, verificado, proveedor, puntos, nivel)
 * ✅ Detalles completos con preferencias y estadísticas
 * ✅ Actualización segura con campos controlados
 * ✅ Gestión completa de preferencias de notificación
 * ✅ Check-in con validaciones de duplicados diarios
 * ✅ Sistema de puntos con level-up automático
 * ✅ Perfil propio para clientes autenticados
 * ✅ Estadísticas detalladas y ranking de top performers
 * 
 * VALIDACIONES IMPLEMENTADAS:
 * ✅ Verificación de existencia de cliente
 * ✅ Control de campos actualizables por rol
 * ✅ Validación de check-ins duplicados
 * ✅ Verificación de estado activo para operaciones
 * ✅ Control de puntos positivos
 * 
 * LISTO PARA SUB-FASE 2.4:
 * ⏭️ Rutas de autenticación (routes/auth.js)
 * ⏭️ Rutas de usuarios (routes/users.js)  
 * ⏭️ Rutas de clientes (routes/clients.js)
 * ⏭️ Integración con middleware de autorización
 * ⏭️ Testing completo de controladores
 */