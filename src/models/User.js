/**
 * MODELO DE USUARIOS ADMINISTRADORES - ELITE FITNESS CLUB
 * 
 * Soy el modelo que define la estructura de usuarios administradores
 * Mi responsabilidad es manejar admins y personal con diferentes roles
 * 
 * Características implementadas:
 * - Usuarios administrativos con roles
 * - Autenticación por email/password
 * - Timestamps automáticos
 * - Validaciones de seguridad
 * - Soft delete preparado
 */

const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
    comment: 'ID único del usuario administrador'
  },
  
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      len: [5, 255]
    },
    comment: 'Email único del administrador'
  },
  
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: [8, 255]
    },
    comment: 'Password hasheado con bcrypt'
  },
  
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [2, 100],
      isAlpha: true
    },
    comment: 'Nombre del administrador'
  },
  
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [2, 100],
      isAlpha: true
    },
    comment: 'Apellido del administrador'
  },
  
  role: {
    type: DataTypes.ENUM('super_admin', 'admin', 'staff'),
    allowNull: false,
    defaultValue: 'staff',
    comment: 'Rol del usuario en el sistema'
  },
  
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Estado activo/inactivo del usuario'
  },
  
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha del último login'
  },
  
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Intentos fallidos de login (seguridad)'
  },
  
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha hasta la cual está bloqueado'
  },
  
  profileImage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Imagen de perfil en base64 o URL'
  },
  
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^[+]?[\d\s\-\(\)]+$/
    },
    comment: 'Teléfono del administrador'
  },
  
  permissions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Permisos específicos del usuario'
  },
  
  // Campos de auditoría
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Usuario que creó este registro'
  },
  
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Usuario que actualizó este registro'
  },
  
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Fecha de eliminación lógica'
  }
  
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  
  // Configuración de timestamps
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  
  // Soft delete
  paranoid: true,
  deletedAt: 'deletedAt',
  
  // Índices para optimización
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['role']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['lastLogin']
    }
  ],
  
  // Configuración adicional
  defaultScope: {
    attributes: { exclude: ['password'] } // No incluir password por defecto
  },
  
  scopes: {
    withPassword: {
      attributes: { include: ['password'] }
    },
    active: {
      where: { isActive: true }
    },
    admin: {
      where: { role: ['admin', 'super_admin'] }
    }
  }
});

// ===========================================
// HOOKS (Middleware de Sequelize)
// ===========================================

// Hook: Antes de crear usuario - hashear password
User.beforeCreate(async (user, options) => {
  if (user.password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    user.password = await bcrypt.hash(user.password, saltRounds);
  }
});

// Hook: Antes de actualizar - hashear password si cambió
User.beforeUpdate(async (user, options) => {
  if (user.changed('password')) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    user.password = await bcrypt.hash(user.password, saltRounds);
  }
});

// Hook: Después de crear - log de auditoría
User.afterCreate((user, options) => {
  console.log(`✅ Usuario administrador creado: ${user.email} (${user.role})`);
});

// ===========================================
// MÉTODOS DE INSTANCIA
// ===========================================

// Verificar password
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Obtener nombre completo
User.prototype.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Verificar si está bloqueado
User.prototype.isLocked = function() {
  return !!(this.lockedUntil && this.lockedUntil > Date.now());
};

// Incrementar intentos fallidos
User.prototype.incrementLoginAttempts = async function() {
  const updates = { loginAttempts: this.loginAttempts + 1 };
  
  // Bloquear después de 5 intentos fallidos
  if (this.loginAttempts + 1 >= 5) {
    updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
  }
  
  return await this.update(updates);
};

// Resetear intentos fallidos
User.prototype.resetLoginAttempts = async function() {
  return await this.update({
    loginAttempts: 0,
    lockedUntil: null,
    lastLogin: new Date()
  });
};

// Verificar permisos
User.prototype.hasPermission = function(permission) {
  if (this.role === 'super_admin') return true;
  if (this.role === 'admin' && !permission.includes('super_')) return true;
  
  return this.permissions && this.permissions[permission] === true;
};

// ===========================================
// MÉTODOS ESTÁTICOS (Clase)
// ===========================================

// Encontrar usuario activo por email
User.findActiveByEmail = async function(email) {
  return await this.findOne({
    where: { 
      email: email.toLowerCase(),
      isActive: true 
    }
  });
};

// Crear usuario con validaciones
User.createUser = async function(userData, createdByUserId = null) {
  return await this.create({
    ...userData,
    email: userData.email.toLowerCase(),
    createdBy: createdByUserId
  });
};

// Estadísticas de usuarios
User.getStats = async function() {
  const total = await this.count();
  const active = await this.count({ where: { isActive: true } });
  const admins = await this.count({ where: { role: ['admin', 'super_admin'] } });
  const staff = await this.count({ where: { role: 'staff' } });
  
  return {
    total,
    active,
    inactive: total - active,
    admins,
    staff
  };
};

module.exports = User;

/**
 * ESTADO ACTUAL - FASE 2.1:
 * ✅ Modelo User completo con validaciones
 * ✅ Hooks para hashear passwords automáticamente
 * ✅ Métodos de instancia para autenticación
 * ✅ Métodos estáticos para consultas comunes
 * ✅ Sistema de bloqueo por intentos fallidos
 * ✅ Roles y permisos granulares
 * ✅ Soft delete y auditoría preparados
 * 
 * PENDIENTE EN SIGUIENTES SUB-FASES:
 * ⏳ Relaciones con otros modelos (2.1)
 * ⏳ Middleware de autenticación (2.3)
 * ⏳ Controladores de usuario (2.4)
 * ⏳ Rutas protegidas (2.5)
 * ⏳ Tests del modelo (2.6)
 */