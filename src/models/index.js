/**
 * CENTRALIZADOR DE MODELOS - ELITE FITNESS CLUB
 * 
 * Soy el archivo que centraliza todos los modelos de la base de datos
 * Mi responsabilidad es importar todos los modelos, establecer relaciones
 * y proporcionar una interfaz unificada para el resto de la aplicación
 * 
 * Funcionalidades implementadas:
 * - Importación automática de todos los modelos
 * - Establecimiento de relaciones entre modelos
 * - Sincronización con base de datos
 * - Exportación centralizada
 * - Sistema de migración integrado
 */

const { sequelize } = require('../config/database');

// ===========================================
// IMPORTACIÓN DE MODELOS
// ===========================================

const User = require('./User');
const Client = require('./Client');
const ClientPreference = require('./ClientPreference');

// ===========================================
// ESTABLECIMIENTO DE RELACIONES
// ===========================================

/**
 * RELACIONES ENTRE MODELOS
 * 
 * User (Administradores):
 * - Puede crear/actualizar muchos Clients
 * 
 * Client (Clientes del gimnasio):
 * - Pertenece a un User (createdBy, updatedBy)
 * - Tiene una ClientPreference
 * 
 * ClientPreference (Preferencias):
 * - Pertenece a un Client
 */

// User -> Client (Auditoría)
User.hasMany(Client, {
  foreignKey: 'createdBy',
  as: 'createdClients',
  constraints: false
});

User.hasMany(Client, {
  foreignKey: 'updatedBy',
  as: 'updatedClients',
  constraints: false
});

Client.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
  constraints: false
});

Client.belongsTo(User, {
  foreignKey: 'updatedBy',
  as: 'updater',
  constraints: false
});

// Client -> ClientPreference (1:1)
Client.hasOne(ClientPreference, {
  foreignKey: 'clientId',
  as: 'preferences',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

ClientPreference.belongsTo(Client, {
  foreignKey: 'clientId',
  as: 'client',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

// User -> ClientPreference (Auditoría)
User.hasMany(ClientPreference, {
  foreignKey: 'updatedBy',
  as: 'updatedPreferences',
  constraints: false
});

ClientPreference.belongsTo(User, {
  foreignKey: 'updatedBy',
  as: 'updater',
  constraints: false
});

// ===========================================
// FUNCIONES DE UTILIDAD
// ===========================================

/**
 * Sincronizar todos los modelos con la base de datos
 */
const syncDatabase = async (options = {}) => {
  try {
    console.log('🔄 Sincronizando modelos con base de datos...');
    
    // Verificar conexión
    await sequelize.authenticate();
    console.log('✅ Conexión a base de datos verificada');
    
    // Sincronizar modelos en orden (respetando relaciones)
    await sequelize.sync(options);
    
    console.log('✅ Modelos sincronizados exitosamente');
    console.log(`📊 Modelos registrados: ${Object.keys(sequelize.models).length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error sincronizando modelos:', error.message);
    throw error;
  }
};

/**
 * Recrear todas las tablas (para desarrollo)
 */
const recreateDatabase = async () => {
  try {
    console.log('🔄 Recreando estructura de base de datos...');
    
    // Sync con force: true elimina y recrea todas las tablas
    await sequelize.sync({ force: true });
    
    console.log('✅ Base de datos recreada exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error recreando base de datos:', error.message);
    throw error;
  }
};

/**
 * Verificar que todos los modelos están correctamente definidos
 */
const validateModels = () => {
  const models = sequelize.models;
  const modelNames = Object.keys(models);
  
  console.log('🔍 Validando modelos registrados...');
  console.log(`📝 Modelos encontrados: ${modelNames.join(', ')}`);
  
  // Verificar que los modelos esperados estén presentes
  const expectedModels = ['User', 'Client', 'ClientPreference'];
  const missingModels = expectedModels.filter(name => !modelNames.includes(name));
  
  if (missingModels.length > 0) {
    throw new Error(`❌ Modelos faltantes: ${missingModels.join(', ')}`);
  }
  
  // Verificar relaciones
  console.log('🔗 Verificando relaciones entre modelos...');
  
  // Client -> ClientPreference
  if (!models.Client.associations.preferences) {
    throw new Error('❌ Relación Client -> ClientPreference no encontrada');
  }
  
  // ClientPreference -> Client
  if (!models.ClientPreference.associations.client) {
    throw new Error('❌ Relación ClientPreference -> Client no encontrada');
  }
  
  console.log('✅ Todos los modelos y relaciones son válidos');
  return true;
};

/**
 * Obtener estadísticas de todos los modelos
 */
const getModelsStats = async () => {
  try {
    const stats = {
      users: await User.getStats(),
      clients: await Client.getStats(),
      preferences: await ClientPreference.getStats()
    };
    
    return stats;
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error.message);
    return null;
  }
};

/**
 * Crear datos de prueba básicos (para desarrollo)
 */
const createSeedData = async () => {
  try {
    console.log('🌱 Creando datos de prueba...');
    
    // Verificar si ya existen datos
    const userCount = await User.count();
    if (userCount > 0) {
      console.log('⏭️  Datos ya existen, saltando seeding');
      return false;
    }
    
    // Crear usuario administrador por defecto
    const adminUser = await User.create({
      email: 'admin@elitefitnessclub.com',
      password: 'Admin123!',
      firstName: 'Elite',
      lastName: 'Admin',
      role: 'super_admin',
      isActive: true
    });
    
    console.log('✅ Usuario administrador creado');
    
    // Crear cliente de prueba
    const testClient = await Client.create({
      email: 'cliente@test.com',
      password: 'Cliente123!',
      firstName: 'Juan',
      lastName: 'Pérez',
      authProvider: 'local',
      isActive: true,
      isEmailVerified: true,
      createdBy: adminUser.id
    });
    
    console.log('✅ Cliente de prueba creado');
    
    // Crear preferencias por defecto para el cliente
    await ClientPreference.create({
      clientId: testClient.id
    });
    
    console.log('✅ Preferencias de prueba creadas');
    console.log('🎉 Datos de prueba completados');
    
    return true;
  } catch (error) {
    console.error('❌ Error creando datos de prueba:', error.message);
    throw error;
  }
};

// ===========================================
// MIGRACIÓN INTEGRADA CON MODELOS
// ===========================================

/**
 * Función de migración que integra con el sistema existente
 */
const migrateWithModels = async () => {
  try {
    console.log('🚀 Iniciando migración con modelos...');
    
    // Importar función de migración existente
    const { dropAllTables } = require('../utils/migrate');
    
    // 1. Eliminar tablas existentes
    await dropAllTables();
    
    // 2. Recrear con modelos
    await recreateDatabase();
    
    // 3. Crear datos de prueba si está habilitado
    if (process.env.ENABLE_SEEDERS === 'true') {
      await createSeedData();
    }
    
    console.log('✅ Migración con modelos completada');
    return true;
  } catch (error) {
    console.error('❌ Error en migración con modelos:', error.message);
    throw error;
  }
};

// ===========================================
// EXPORTACIÓN
// ===========================================

// Exportar modelos individuales
module.exports = {
  // Modelos
  User,
  Client,
  ClientPreference,
  
  // Instancia de Sequelize
  sequelize,
  
  // Funciones de utilidad
  syncDatabase,
  recreateDatabase,
  validateModels,
  getModelsStats,
  createSeedData,
  migrateWithModels,
  
  // Todos los modelos en un objeto
  models: {
    User,
    Client,
    ClientPreference
  }
};

// ===========================================
// INICIALIZACIÓN AUTOMÁTICA
// ===========================================

// Validar modelos al importar este archivo
try {
  validateModels();
  console.log('🎯 Modelos inicializados correctamente');
} catch (error) {
  console.error('💥 Error inicializando modelos:', error.message);
  throw error;
}

/**
 * ESTADO ACTUAL - FASE 2.1:
 * ✅ Todos los modelos centralizados
 * ✅ Relaciones establecidas correctamente
 * ✅ Funciones de utilidad implementadas
 * ✅ Sistema de migración integrado
 * ✅ Validación automática de modelos
 * ✅ Seeders básicos implementados
 * ✅ Estadísticas y monitoreo
 * 
 * RELACIONES IMPLEMENTADAS:
 * ✅ User (1:N) -> Client (createdBy/updatedBy)
 * ✅ Client (1:1) -> ClientPreference
 * ✅ User (1:N) -> ClientPreference (updatedBy)
 * 
 * LISTO PARA SUB-FASE 2.2:
 * ⏭️ Utilidades JWT y OAuth
 * ⏭️ Middleware de autenticación
 * ⏭️ Controladores de usuario
 * ⏭️ Rutas protegidas
 */