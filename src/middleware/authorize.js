/**
 * MIDDLEWARE DE AUTORIZACIÓN - ELITE FITNESS CLUB
 * 
 * Soy el middleware encargado del control granular de permisos
 * Mi responsabilidad es verificar roles, permisos específicos y
 * autorizar acceso a recursos según el nivel de acceso del usuario
 * 
 * Características implementadas:
 * - Control de roles jerárquicos
 * - Permisos granulares por función
 * - Verificación de propiedad de recursos
 * - Control de acceso por horarios
 * - Logging de intentos de autorización
 * - Políticas de seguridad configurables
 */

/**
 * Jerarquía de roles para administradores
 */
const ROLE_HIERARCHY = {
  'super_admin': 4,
  'admin': 3,
  'staff': 2,
  'client': 1
};

/**
 * Permisos por defecto según rol
 */
const DEFAULT_PERMISSIONS = {
  'super_admin': [
    'manage_all',
    'delete_users',
    'modify_system',
    'view_analytics',
    'manage_payments',
    'manage_clients',
    'manage_products',
    'manage_promotions'
  ],
  'admin': [
    'manage_clients',
    'manage_products',
    'manage_payments',
    'view_analytics',
    'manage_promotions',
    'create_users'
  ],
  'staff': [
    'view_clients',
    'update_clients',
    'process_payments',
    'view_products',
    'update_products'
  ],
  'client': [
    'view_own_profile',
    'update_own_profile',
    'view_own_payments',
    'make_payments',
    'use_gym_services'
  ]
};

/**
 * Middleware para requerir rol mínimo
 */
const requireRole = (minimumRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticación requerida',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }
    
    const userRole = req.user.role || 'client';
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;
    
    if (userLevel < requiredLevel) {
      console.log(`❌ Acceso denegado: ${req.user.email} (${userRole}) intentó acceder a recurso que requiere ${minimumRole}`);
      
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: `Se requiere rol ${minimumRole} o superior`,
        required: minimumRole,
        current: userRole,
        code: 'INSUFFICIENT_ROLE'
      });
    }
    
    console.log(`✅ Autorización por rol: ${req.user.email} (${userRole}) accede a recurso ${minimumRole}`);
    next();
  };
};

/**
 * Middleware para requerir permiso específico
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticación requerida',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }
    
    // Super admin puede todo
    if (req.user.role === 'super_admin') {
      return next();
    }
    
    // Verificar permisos por defecto del rol
    const userRole = req.user.role || 'client';
    const defaultPerms = DEFAULT_PERMISSIONS[userRole] || [];
    
    // Verificar permisos específicos del usuario
    const userPerms = req.user.permissions || {};
    const specificPerm = userPerms[permission];
    
    // Verificar si tiene el permiso
    const hasDefaultPerm = defaultPerms.includes(permission);
    const hasSpecificPerm = specificPerm === true;
    const isDeniedSpecific = specificPerm === false;
    
    // Si está específicamente denegado, denegar acceso
    if (isDeniedSpecific) {
      console.log(`❌ Permiso específicamente denegado: ${req.user.email} -> ${permission}`);
      
      return res.status(403).json({
        error: 'Permiso denegado específicamente',
        message: `El permiso '${permission}' ha sido revocado para tu usuario`,
        permission: permission,
        code: 'PERMISSION_DENIED'
      });
    }
    
    // Si tiene permiso por defecto o específico, permitir
    if (hasDefaultPerm || hasSpecificPerm) {
      console.log(`✅ Autorización por permiso: ${req.user.email} -> ${permission}`);
      return next();
    }
    
    console.log(`❌ Permiso faltante: ${req.user.email} intentó ${permission}`);
    
    return res.status(403).json({
      error: 'Permiso requerido no encontrado',
      message: `No tienes el permiso '${permission}' para realizar esta acción`,
      permission: permission,
      code: 'PERMISSION_REQUIRED'
    });
  };
};

/**
 * Middleware para verificar propiedad de recurso
 */
const requireOwnership = (resourceIdParam = 'id', allowAdmins = true) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticación requerida',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }
    
    // Administradores pueden acceder si está permitido
    if (allowAdmins && req.user.role && ROLE_HIERARCHY[req.user.role] >= 3) {
      console.log(`✅ Admin override: ${req.user.email} accede a recurso de otro usuario`);
      return next();
    }
    
    const resourceId = req.params[resourceIdParam];
    const userId = req.user.id;
    
    if (!resourceId) {
      return res.status(400).json({
        error: 'ID de recurso requerido',
        message: `Parámetro '${resourceIdParam}' no encontrado en la URL`,
        code: 'RESOURCE_ID_REQUIRED'
      });
    }
    
    if (resourceId !== userId) {
      console.log(`❌ Acceso a recurso ajeno: ${req.user.email} intentó acceder a recurso ${resourceId}`);
      
      return res.status(403).json({
        error: 'Acceso no autorizado',
        message: 'Solo puedes acceder a tus propios recursos',
        code: 'RESOURCE_OWNERSHIP_REQUIRED'
      });
    }
    
    console.log(`✅ Propiedad verificada: ${req.user.email} accede a su recurso ${resourceId}`);
    next();
  };
};

/**
 * Middleware para verificar múltiples permisos (requiere ALL)
 */
const requireAllPermissions = (permissions) => {
  return (req, res, next) => {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return next();
    }
    
    // Verificar cada permiso secuencialmente
    const checkNextPermission = (index) => {
      if (index >= permissions.length) {
        // Todos los permisos verificados exitosamente
        return next();
      }
      
      const permission = permissions[index];
      
      requirePermission(permission)(req, res, (err) => {
        if (err) return next(err);
        
        // Si llegamos aquí, el permiso pasó
        // Verificar el siguiente
        checkNextPermission(index + 1);
      });
    };
    
    checkNextPermission(0);
  };
};

/**
 * Middleware para verificar al menos uno de varios permisos (requiere ANY)
 */
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Autenticación requerida',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }
    
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return next();
    }
    
    // Super admin puede todo
    if (req.user.role === 'super_admin') {
      return next();
    }
    
    const userRole = req.user.role || 'client';
    const defaultPerms = DEFAULT_PERMISSIONS[userRole] || [];
    const userPerms = req.user.permissions || {};
    
    // Verificar si tiene al menos uno de los permisos
    const hasAnyPermission = permissions.some(permission => {
      const hasDefault = defaultPerms.includes(permission);
      const hasSpecific = userPerms[permission] === true;
      const isDenied = userPerms[permission] === false;
      
      return (hasDefault || hasSpecific) && !isDenied;
    });
    
    if (!hasAnyPermission) {
      console.log(`❌ Ningún permiso coincide: ${req.user.email} necesita uno de [${permissions.join(', ')}]`);
      
      return res.status(403).json({
        error: 'Permisos insuficientes',
        message: `Necesitas al menos uno de estos permisos: ${permissions.join(', ')}`,
        requiredPermissions: permissions,
        code: 'ANY_PERMISSION_REQUIRED'
      });
    }
    
    console.log(`✅ Permiso encontrado: ${req.user.email} tiene uno de [${permissions.join(', ')}]`);
    next();
  };
};

/**
 * Middleware para control de acceso por horarios
 */
const requireBusinessHours = (timezone = 'America/Guatemala') => {
  return (req, res, next) => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Horarios de negocio: Lunes a Viernes 6AM-10PM, Sábado 7AM-8PM, Domingo cerrado
    const isBusinessDay = day >= 1 && day <= 6; // Lunes a Sábado
    const isBusinessHour = (day >= 1 && day <= 5 && hour >= 6 && hour <= 22) || // Lunes-Viernes
                          (day === 6 && hour >= 7 && hour <= 20); // Sábado
    
    if (!isBusinessDay || !isBusinessHour) {
      // Permitir a administradores trabajar fuera de horario
      if (req.user && req.user.role && ROLE_HIERARCHY[req.user.role] >= 3) {
        console.log(`✅ Admin fuera de horario: ${req.user.email}`);
        return next();
      }
      
      return res.status(403).json({
        error: 'Fuera de horario de atención',
        message: 'Esta función solo está disponible en horario de negocio',
        businessHours: {
          'Lunes-Viernes': '6:00 AM - 10:00 PM',
          'Sábado': '7:00 AM - 8:00 PM',
          'Domingo': 'Cerrado'
        },
        currentTime: now.toLocaleString('es-GT', { timeZone: timezone }),
        code: 'OUTSIDE_BUSINESS_HOURS'
      });
    }
    
    next();
  };
};

/**
 * Middleware para logging de autorizaciones
 */
const logAuthorization = (action) => {
  return (req, res, next) => {
    const user = req.user;
    const clientInfo = req.clientInfo || {};
    
    console.log(`🔐 Autorización: ${user?.email || 'Anónimo'} (${user?.role || 'client'}) -> ${action}`);
    console.log(`   📱 Cliente: ${clientInfo.clientType} ${clientInfo.platform} ${clientInfo.version}`);
    console.log(`   🌐 IP: ${clientInfo.ip} | User-Agent: ${clientInfo.userAgent?.substring(0, 50)}...`);
    
    next();
  };
};

/**
 * Obtener permisos efectivos de un usuario
 */
const getUserPermissions = (user) => {
  if (!user) return [];
  
  const role = user.role || 'client';
  const defaultPerms = DEFAULT_PERMISSIONS[role] || [];
  const userPerms = user.permissions || {};
  
  // Empezar con permisos por defecto
  const effectivePerms = [...defaultPerms];
  
  // Agregar permisos específicos concedidos
  Object.keys(userPerms).forEach(perm => {
    if (userPerms[perm] === true && !effectivePerms.includes(perm)) {
      effectivePerms.push(perm);
    }
  });
  
  // Remover permisos específicamente denegados
  const finalPerms = effectivePerms.filter(perm => userPerms[perm] !== false);
  
  return finalPerms.sort();
};

/**
 * Endpoint para obtener permisos del usuario actual
 */
const getCurrentUserPermissions = (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'No autenticado',
      code: 'NOT_AUTHENTICATED'
    });
  }
  
  const permissions = getUserPermissions(req.user);
  const role = req.user.role || 'client';
  
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      role: role,
      roleLevel: ROLE_HIERARCHY[role] || 0
    },
    permissions: {
      effective: permissions,
      byDefault: DEFAULT_PERMISSIONS[role] || [],
      specific: req.user.permissions || {},
      total: permissions.length
    },
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  // Control de roles
  requireRole,
  
  // Control de permisos
  requirePermission,
  requireAllPermissions,
  requireAnyPermission,
  
  // Control de propiedad
  requireOwnership,
  
  // Controles especiales
  requireBusinessHours,
  logAuthorization,
  
  // Utilidades
  getUserPermissions,
  getCurrentUserPermissions,
  
  // Constantes
  ROLE_HIERARCHY,
  DEFAULT_PERMISSIONS
};

/**
 * ESTADO ACTUAL - SUB-FASE 2.2:
 * ✅ Control de roles jerárquicos (super_admin > admin > staff > client)
 * ✅ Sistema de permisos granulares por función
 * ✅ Verificación de propiedad de recursos
 * ✅ Control de múltiples permisos (ALL/ANY)
 * ✅ Control de acceso por horarios de negocio
 * ✅ Logging detallado de autorizaciones
 * ✅ Utilidades para obtener permisos efectivos
 * ✅ Endpoint para consultar permisos del usuario
 * ✅ Políticas de seguridad configurables
 * 
 * PENDIENTE EN SIGUIENTES SUB-FASES:
 * ⏳ Middleware de validación de datos (2.3)
 * ⏳ Controladores de autenticación (2.4)
 * ⏳ Rutas protegidas con autorización (2.5)
 * ⏳ Testing de autorización (2.6)
 */