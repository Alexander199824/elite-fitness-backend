/**
 * MODELO DE CLIENTES DEL GIMNASIO - ELITE FITNESS CLUB
 * 
 * Soy el modelo que define la estructura de clientes del gimnasio
 * Mi responsabilidad es manejar todos los datos de los miembros
 * incluyendo autenticación OAuth, preferencias y datos del gym
 * 
 * CORREGIDO SUB-FASE 2.3: Agregados métodos faltantes para tests
 * 
 * Características implementadas:
 * - Autenticación OAuth (Google + Facebook)
 * - Autenticación tradicional email/password
 * - Datos personales y contacto
 * - Información específica del gimnasio
 * - Preferencias de notificaciones
 * - Gestión de membresías
 * - Métodos de seguridad (isLocked, intentos de login)
 */

const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { sequelize } = require('../config/database');

const Client = sequelize.define('Client', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
    comment: 'ID único del cliente'
  },
  
  // ===========================================
  // AUTENTICACIÓN Y DATOS BÁSICOS
  // ===========================================
  
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      len: [5, 255]
    },
    comment: 'Email único del cliente'
  },
  
  password: {
    type: DataTypes.STRING(255),
    allowNull: true, // Puede ser null si usa solo OAuth
    validate: {
      len: [8, 255]
    },
    comment: 'Password hasheado (opcional si usa OAuth)'
  },
  
  // OAuth providers
  googleId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    comment: 'ID del usuario en Google OAuth'
  },
  
  facebookId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    comment: 'ID del usuario en Facebook OAuth'
  },
  
  authProvider: {
    type: DataTypes.ENUM('local', 'google', 'facebook', 'multiple'),
    allowNull: false,
    defaultValue: 'local',
    comment: 'Proveedor de autenticación principal'
  },
  
  // ===========================================
  // INFORMACIÓN PERSONAL
  // ===========================================
  
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [2, 100]
    },
    comment: 'Nombre del cliente'
  },
  
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [2, 100]
    },
    comment: 'Apellido del cliente'
  },
  
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^[+]?[\d\s\-\(\)]+$/
    },
    comment: 'Teléfono del cliente'
  },
  
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fecha de nacimiento'
  },
  
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other', 'prefer_not_to_say'),
    allowNull: true,
    comment: 'Género del cliente'
  },
  
  profileImage: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Imagen de perfil (base64 o URL)'
  },
  
  // ===========================================
  // INFORMACIÓN DEL GIMNASIO
  // ===========================================
  
  memberNumber: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
    comment: 'Número de membresía único'
  },
  
  joinDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Fecha de ingreso al gimnasio'
  },
  
  emergencyContactName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Nombre del contacto de emergencia'
  },
  
  emergencyContactPhone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Teléfono del contacto de emergencia'
  },
  
  medicalConditions: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Condiciones médicas relevantes'
  },
  
  // ===========================================
  // PREFERENCIAS Y CONFIGURACIÓN
  // ===========================================
  
  preferredWorkoutTimes: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Horarios preferidos para entrenar'
  },
  
  fitnessGoals: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Objetivos de fitness del cliente'
  },
  
  notificationPreferences: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      email: true,
      sms: false,
      push: true,
      whatsapp: false
    },
    comment: 'Preferencias de notificaciones'
  },
  
  language: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: 'es',
    comment: 'Idioma preferido (es, en)'
  },
  
  timezone: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'America/Guatemala',
    comment: 'Zona horaria del cliente'
  },
  
  // ===========================================
  // ESTADO Y CONTROL
  // ===========================================
  
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Estado activo/inactivo del cliente'
  },
  
  isEmailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Email verificado'
  },
  
  isPhoneVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Teléfono verificado'
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
  
  lastCheckIn: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Último check-in al gimnasio'
  },
  
  totalCheckIns: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Total de check-ins realizados'
  },
  
  // ===========================================
  // GAMIFICACIÓN Y PREMIOS
  // ===========================================
  
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Puntos de gamificación acumulados'
  },
  
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false,
    comment: 'Nivel de gamificación'
  },
  
  totalPrizesWon: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: 'Total de premios ganados en ruletas'
  },
  
  // ===========================================
  // CAMPOS DE AUDITORÍA
  // ===========================================
  
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
  modelName: 'Client',
  tableName: 'clients',
  
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
      unique: true,
      fields: ['memberNumber']
    },
    {
      unique: true,
      fields: ['googleId']
    },
    {
      unique: true,
      fields: ['facebookId']
    },
    {
      fields: ['authProvider']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['lastLogin']
    },
    {
      fields: ['lastCheckIn']
    },
    {
      fields: ['points']
    },
    {
      fields: ['level']
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
    verified: {
      where: { isEmailVerified: true }
    },
    oauth: {
      where: { authProvider: ['google', 'facebook', 'multiple'] }
    }
  }
});

// ===========================================
// HOOKS (Middleware de Sequelize)
// ===========================================

// Hook: Antes de crear cliente - hashear password si existe
Client.beforeCreate(async (client, options) => {
  if (client.password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    client.password = await bcrypt.hash(client.password, saltRounds);
  }
  
  // Generar número de membresía si no existe
  if (!client.memberNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    client.memberNumber = `EFC${timestamp}${random}`;
  }
});

// Hook: Antes de actualizar - hashear password si cambió
Client.beforeUpdate(async (client, options) => {
  if (client.changed('password') && client.password) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    client.password = await bcrypt.hash(client.password, saltRounds);
  }
});

// Hook: Después de crear - log de auditoría
Client.afterCreate((client, options) => {
  console.log(`✅ Cliente registrado: ${client.email} (${client.authProvider})`);
});

// ===========================================
// MÉTODOS DE INSTANCIA
// ===========================================

// Verificar password
Client.prototype.validatePassword = async function(password) {
  if (!this.password) return false;
  return await bcrypt.compare(password, this.password);
};

// Verificar si está bloqueado (ARREGLO PARA TESTS)
Client.prototype.isLocked = function() {
  return !!(this.lockedUntil && this.lockedUntil > Date.now());
};

// Incrementar intentos fallidos (ARREGLO PARA TESTS)
Client.prototype.incrementLoginAttempts = async function() {
  const updates = { loginAttempts: (this.loginAttempts || 0) + 1 };
  
  // Bloquear después de 5 intentos fallidos
  if ((this.loginAttempts || 0) + 1 >= 5) {
    updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
  }
  
  return await this.update(updates);
};

// Resetear intentos fallidos (ARREGLO PARA TESTS)
Client.prototype.resetLoginAttempts = async function() {
  return await this.update({
    loginAttempts: 0,
    lockedUntil: null,
    lastLogin: new Date()
  });
};

// Obtener nombre completo
Client.prototype.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Calcular edad
Client.prototype.getAge = function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Realizar check-in
Client.prototype.checkIn = async function() {
  const updates = {
    lastCheckIn: new Date(),
    totalCheckIns: this.totalCheckIns + 1,
    points: this.points + 10 // 10 puntos por check-in
  };
  
  // Calcular nivel basado en puntos
  const newLevel = Math.floor(updates.points / 100) + 1;
  if (newLevel > this.level) {
    updates.level = newLevel;
  }
  
  return await this.update(updates);
};

// Agregar puntos
Client.prototype.addPoints = async function(points, reason = 'activity') {
  const newPoints = this.points + points;
  const newLevel = Math.floor(newPoints / 100) + 1;
  
  return await this.update({
    points: newPoints,
    level: newLevel > this.level ? newLevel : this.level
  });
};

// Verificar preferencia de notificación
Client.prototype.wantsNotification = function(type) {
  return this.notificationPreferences && this.notificationPreferences[type] === true;
};

// Obtener horarios preferidos
Client.prototype.getPreferredWorkoutTimes = function() {
  return this.preferredWorkoutTimes || {};
};

// ===========================================
// MÉTODOS ESTÁTICOS (Clase)
// ===========================================

// Encontrar cliente activo por email
Client.findActiveByEmail = async function(email) {
  return await this.findOne({
    where: { 
      email: email.toLowerCase(),
      isActive: true 
    }
  });
};

// Encontrar por OAuth ID
Client.findByOAuthId = async function(provider, oauthId) {
  const field = provider === 'google' ? 'googleId' : 'facebookId';
  return await this.findOne({
    where: { [field]: oauthId }
  });
};

// Crear cliente con OAuth
Client.createWithOAuth = async function(oauthData, provider) {
  const clientData = {
    email: oauthData.email.toLowerCase(),
    firstName: oauthData.firstName || oauthData.name?.split(' ')[0] || '',
    lastName: oauthData.lastName || oauthData.name?.split(' ').slice(1).join(' ') || '',
    authProvider: provider,
    isEmailVerified: true, // OAuth emails are pre-verified
    profileImage: oauthData.picture || oauthData.photo
  };
  
  if (provider === 'google') {
    clientData.googleId = oauthData.id;
  } else if (provider === 'facebook') {
    clientData.facebookId = oauthData.id;
  }
  
  return await this.create(clientData);
};

// Estadísticas de clientes
Client.getStats = async function() {
  const total = await this.count();
  const active = await this.count({ where: { isActive: true } });
  const verified = await this.count({ where: { isEmailVerified: true } });
  const oauth = await this.count({ where: { authProvider: ['google', 'facebook', 'multiple'] } });
  const local = await this.count({ where: { authProvider: 'local' } });
  
  return {
    total,
    active,
    inactive: total - active,
    verified,
    unverified: total - verified,
    oauth,
    local
  };
};

// Top clientes por puntos
Client.getTopByPoints = async function(limit = 10) {
  return await this.findAll({
    where: { isActive: true },
    order: [['points', 'DESC']],
    limit: limit,
    attributes: ['id', 'firstName', 'lastName', 'points', 'level', 'totalCheckIns']
  });
};

module.exports = Client;

/**
 * ESTADO ACTUAL - CORREGIDO SUB-FASE 2.3:
 * ✅ Modelo Client completo con OAuth
 * ✅ Autenticación múltiple (local + Google + Facebook)
 * ✅ Sistema de gamificación integrado
 * ✅ Preferencias de notificaciones
 * ✅ Datos específicos del gimnasio
 * ✅ Métodos para check-in y puntos
 * ✅ Métodos de seguridad agregados (isLocked, incrementLoginAttempts, resetLoginAttempts)
 * ✅ Hooks para generación automática de datos
 * ✅ Campos de seguridad agregados (loginAttempts, lockedUntil)
 * 
 * CORREGIDO PARA TESTS:
 * ✅ isLocked() - Método para verificar si cuenta está bloqueada
 * ✅ incrementLoginAttempts() - Método para incrementar intentos fallidos
 * ✅ resetLoginAttempts() - Método para resetear intentos fallidos
 * ✅ loginAttempts - Campo para contar intentos fallidos
 * ✅ lockedUntil - Campo para fecha de bloqueo
 */