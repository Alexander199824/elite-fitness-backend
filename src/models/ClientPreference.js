/**
 * MODELO DE PREFERENCIAS DE CLIENTE - ELITE FITNESS CLUB
 * 
 * Soy el modelo que maneja las preferencias detalladas de notificaciones
 * Mi responsabilidad es gestionar horarios, tipos de mensajes y canales
 * de comunicación personalizados para cada cliente
 * 
 * Características implementadas:
 * - Preferencias de notificaciones por canal
 * - Horarios personalizados para mensajes
 * - Configuración de recordatorios
 * - Preferencias de contenido motivacional
 * - Configuración de promociones
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ClientPreference = sequelize.define('ClientPreference', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false,
    comment: 'ID único de la preferencia'
  },
  
  clientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'clients',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'ID del cliente asociado'
  },
  
  // ===========================================
  // CONFIGURACIÓN DE CANALES DE COMUNICACIÓN
  // ===========================================
  
  emailNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Recibir notificaciones por email'
  },
  
  smsNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Recibir notificaciones por SMS'
  },
  
  pushNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Recibir notificaciones push móviles'
  },
  
  whatsappNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Recibir notificaciones por WhatsApp'
  },
  
  // ===========================================
  // TIPOS DE CONTENIDO
  // ===========================================
  
  membershipReminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Recordatorios de vencimiento de membresía'
  },
  
  workoutReminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Recordatorios para ir al gimnasio'
  },
  
  motivationalMessages: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Mensajes motivacionales personalizados'
  },
  
  promotionalOffers: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Ofertas promocionales y descuentos'
  },
  
  newProducts: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Notificaciones de nuevos complementos'
  },
  
  eventAnnouncements: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Anuncios de eventos del gimnasio'
  },
  
  prizeNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Notificaciones de premios ganados'
  },
  
  // ===========================================
  // HORARIOS PREFERIDOS PARA NOTIFICACIONES
  // ===========================================
  
  morningNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Permitir notificaciones en la mañana (6-12)'
  },
  
  afternoonNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Permitir notificaciones en la tarde (12-18)'
  },
  
  eveningNotifications: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Permitir notificaciones en la noche (18-22)'
  },
  
  quietHoursStart: {
    type: DataTypes.TIME,
    allowNull: true,
    defaultValue: '22:00:00',
    comment: 'Hora de inicio del período silencioso'
  },
  
  quietHoursEnd: {
    type: DataTypes.TIME,
    allowNull: true,
    defaultValue: '06:00:00',
    comment: 'Hora de fin del período silencioso'
  },
  
  // ===========================================
  // DÍAS DE LA SEMANA PARA RECORDATORIOS
  // ===========================================
  
  mondayReminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Recordatorios los lunes'
  },
  
  tuesdayReminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Recordatorios los martes'
  },
  
  wednesdayReminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Recordatorios los miércoles'
  },
  
  thursdayReminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Recordatorios los jueves'
  },
  
  fridayReminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Recordatorios los viernes'
  },
  
  saturdayReminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Recordatorios los sábados'
  },
  
  sundayReminders: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Recordatorios los domingos'
  },
  
  // ===========================================
  // HORARIOS PREFERIDOS PARA IR AL GYM
  // ===========================================
  
  preferredWorkoutDays: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: ['monday', 'wednesday', 'friday'],
    comment: 'Días preferidos para entrenar'
  },
  
  preferredMorningTime: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Hora preferida para entrenar en la mañana'
  },
  
  preferredAfternoonTime: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Hora preferida para entrenar en la tarde'
  },
  
  preferredEveningTime: {
    type: DataTypes.TIME,
    allowNull: true,
    comment: 'Hora preferida para entrenar en la noche'
  },
  
  // ===========================================
  // CONFIGURACIÓN AVANZADA
  // ===========================================
  
  reminderFrequency: {
    type: DataTypes.ENUM('daily', 'every_2_days', 'weekly', 'custom'),
    defaultValue: 'every_2_days',
    allowNull: false,
    comment: 'Frecuencia de recordatorios de entrenamiento'
  },
  
  motivationalFrequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'never'),
    defaultValue: 'weekly',
    allowNull: false,
    comment: 'Frecuencia de mensajes motivacionales'
  },
  
  membershipReminderDays: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [7, 3, 1],
    comment: 'Días antes del vencimiento para recordar membresía'
  },
  
  customReminderTimes: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Horarios personalizados para diferentes tipos de recordatorios'
  },
  
  // ===========================================
  // CONFIGURACIÓN DE IDIOMA Y FORMATO
  // ===========================================
  
  notificationLanguage: {
    type: DataTypes.STRING(5),
    allowNull: false,
    defaultValue: 'es',
    comment: 'Idioma para las notificaciones (es/en)'
  },
  
  messageStyle: {
    type: DataTypes.ENUM('formal', 'casual', 'motivational', 'minimal'),
    defaultValue: 'motivational',
    allowNull: false,
    comment: 'Estilo de mensajes preferido'
  },
  
  includeEmojis: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Incluir emojis en los mensajes'
  },
  
  // ===========================================
  // CAMPOS DE AUDITORÍA
  // ===========================================
  
  lastUpdated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Última actualización de preferencias'
  },
  
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Usuario que actualizó las preferencias'
  }
  
}, {
  sequelize,
  modelName: 'ClientPreference',
  tableName: 'client_preferences',
  
  // Configuración de timestamps
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  
  // Índices para optimización
  indexes: [
    {
      unique: true,
      fields: ['clientId']
    },
    {
      fields: ['emailNotifications']
    },
    {
      fields: ['smsNotifications']
    },
    {
      fields: ['pushNotifications']
    },
    {
      fields: ['whatsappNotifications']
    },
    {
      fields: ['reminderFrequency']
    }
  ]
});

// ===========================================
// HOOKS (Middleware de Sequelize)
// ===========================================

// Hook: Antes de actualizar - actualizar lastUpdated
ClientPreference.beforeUpdate(async (preference, options) => {
  preference.lastUpdated = new Date();
});

// Hook: Después de actualizar - log de auditoría
ClientPreference.afterUpdate((preference, options) => {
  console.log(`✅ Preferencias actualizadas para cliente: ${preference.clientId}`);
});

// ===========================================
// MÉTODOS DE INSTANCIA
// ===========================================

// Verificar si puede recibir notificación en este momento
ClientPreference.prototype.canReceiveNotificationNow = function() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase(); // mon, tue, etc.
  
  // Verificar período silencioso
  const quietStart = parseInt(this.quietHoursStart?.split(':')[0] || '22');
  const quietEnd = parseInt(this.quietHoursEnd?.split(':')[0] || '6');
  
  if (quietStart <= quietEnd) {
    // Período silencioso no cruza medianoche
    if (currentHour >= quietStart || currentHour < quietEnd) {
      return false;
    }
  } else {
    // Período silencioso cruza medianoche
    if (currentHour >= quietStart && currentHour < quietEnd) {
      return false;
    }
  }
  
  // Verificar horarios del día
  if (currentHour >= 6 && currentHour < 12) {
    return this.morningNotifications;
  } else if (currentHour >= 12 && currentHour < 18) {
    return this.afternoonNotifications;
  } else if (currentHour >= 18 && currentHour <= 22) {
    return this.eveningNotifications;
  }
  
  return false;
};

// Verificar si quiere un tipo específico de notificación
ClientPreference.prototype.wantsNotificationType = function(type) {
  const typeMap = {
    membership: this.membershipReminders,
    workout: this.workoutReminders,
    motivational: this.motivationalMessages,
    promotional: this.promotionalOffers,
    product: this.newProducts,
    event: this.eventAnnouncements,
    prize: this.prizeNotifications
  };
  
  return typeMap[type] || false;
};

// Obtener canales activos de notificación
ClientPreference.prototype.getActiveChannels = function() {
  const channels = [];
  
  if (this.emailNotifications) channels.push('email');
  if (this.smsNotifications) channels.push('sms');
  if (this.pushNotifications) channels.push('push');
  if (this.whatsappNotifications) channels.push('whatsapp');
  
  return channels;
};

// Obtener días activos para recordatorios
ClientPreference.prototype.getActiveReminderDays = function() {
  const days = [];
  const dayMap = {
    monday: this.mondayReminders,
    tuesday: this.tuesdayReminders,
    wednesday: this.wednesdayReminders,
    thursday: this.thursdayReminders,
    friday: this.fridayReminders,
    saturday: this.saturdayReminders,
    sunday: this.sundayReminders
  };
  
  Object.keys(dayMap).forEach(day => {
    if (dayMap[day]) days.push(day);
  });
  
  return days;
};

// Obtener mejor hora para notificar
ClientPreference.prototype.getBestNotificationTime = function() {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Si puede recibir ahora, devolver ahora
  if (this.canReceiveNotificationNow()) {
    return now;
  }
  
  // Buscar la próxima ventana disponible
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (this.morningNotifications) {
    tomorrow.setHours(8, 0, 0, 0); // 8 AM
    return tomorrow;
  } else if (this.afternoonNotifications) {
    tomorrow.setHours(14, 0, 0, 0); // 2 PM
    return tomorrow;
  } else if (this.eveningNotifications) {
    tomorrow.setHours(19, 0, 0, 0); // 7 PM
    return tomorrow;
  }
  
  return null;
};

// ===========================================
// MÉTODOS ESTÁTICOS (Clase)
// ===========================================

// Crear preferencias por defecto para un cliente
ClientPreference.createDefault = async function(clientId) {
  return await this.create({
    clientId: clientId
  });
};

// Obtener clientes que quieren un tipo de notificación
ClientPreference.getClientsForNotification = async function(type, channel = 'email') {
  const whereClause = {
    [`${type}Notifications` || type]: true,
    [`${channel}Notifications`]: true
  };
  
  return await this.findAll({
    where: whereClause,
    include: [{
      model: sequelize.models.Client,
      as: 'client',
      where: { isActive: true }
    }]
  });
};

// Estadísticas de preferencias
ClientPreference.getStats = async function() {
  const total = await this.count();
  const emailEnabled = await this.count({ where: { emailNotifications: true } });
  const smsEnabled = await this.count({ where: { smsNotifications: true } });
  const pushEnabled = await this.count({ where: { pushNotifications: true } });
  const whatsappEnabled = await this.count({ where: { whatsappNotifications: true } });
  
  return {
    total,
    channels: {
      email: emailEnabled,
      sms: smsEnabled,
      push: pushEnabled,
      whatsapp: whatsappEnabled
    },
    percentages: {
      email: Math.round((emailEnabled / total) * 100),
      sms: Math.round((smsEnabled / total) * 100),
      push: Math.round((pushEnabled / total) * 100),
      whatsapp: Math.round((whatsappEnabled / total) * 100)
    }
  };
};

module.exports = ClientPreference;

/**
 * ESTADO ACTUAL - FASE 2.1:
 * ✅ Modelo ClientPreference completo
 * ✅ Configuración detallada de notificaciones
 * ✅ Horarios personalizados por cliente
 * ✅ Métodos para verificar disponibilidad
 * ✅ Gestión de períodos silenciosos
 * ✅ Configuración de días y frecuencias
 * ✅ Estilos de mensaje personalizables
 * 
 * PENDIENTE EN SIGUIENTES SUB-FASES:
 * ⏳ Centralización de modelos (2.1)
 * ⏳ Relaciones entre modelos (2.1)
 * ⏳ Utilidades JWT (2.2)
 * ⏳ Configuración OAuth (2.2)
 * ⏳ Tests de modelos (2.6)
 */