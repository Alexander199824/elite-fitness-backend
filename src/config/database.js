/**
 * CONFIGURACIÓN DE BASE DE DATOS - ELITE FITNESS CLUB
 * 
 * Soy el archivo encargado de establecer la conexión con PostgreSQL
 * Mi responsabilidad es manejar la conexión segura con la base de datos
 * tanto en desarrollo local como en producción en Render
 * 
 * Características actuales:
 * - Conexión a PostgreSQL con Sequelize
 * - Configuración SSL para Render
 * - Pool de conexiones optimizado
 * - Logging condicional según entorno
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configuración de la base de datos según entorno
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'elite_fitness_db',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  dialect: 'postgres',
  
  // Pool de conexiones optimizado
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  
  // Configuración SSL para Render (CRÍTICO)
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  
  // Logging condicional
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  
  // Configuración de zona horaria para Guatemala
  timezone: '-06:00'
};

// Usar DATABASE_URL si está disponible (Render)
let sequelize;
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: dbConfig.pool,
    logging: dbConfig.logging,
    timezone: dbConfig.timezone
  });
} else {
  // Configuración manual
  sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    dbConfig
  );
}

// Función para verificar conexión
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL establecida correctamente');
    console.log(`📍 Conectado a: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    return true;
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
    
    // Diagnóstico adicional para Render
    if (error.message.includes('ECONNRESET')) {
      console.error('💡 Sugerencia: Verificar configuración SSL para Render');
    }
    
    return false;
  }
};

// Función para cerrar conexión
const closeConnection = async () => {
  try {
    await sequelize.close();
    console.log('🔒 Conexión a base de datos cerrada correctamente');
  } catch (error) {
    console.error('❌ Error cerrando conexión:', error.message);
  }
};

module.exports = {
  sequelize,
  testConnection,
  closeConnection,
  dbConfig
};

/**
 * ESTADO ACTUAL - FASE 1:
 * ✅ Configuración básica de PostgreSQL
 * ✅ SSL configurado para Render
 * ✅ Pool de conexiones configurado
 * ✅ Zona horaria Guatemala configurada
 * ✅ Soporte para DATABASE_URL
 * 
 * PENDIENTE PARA SIGUIENTES FASES:
 * ⏳ Modelos de base de datos (Fase 2)
 * ⏳ Sistema de migraciones automático (Fase 2)
 * ⏳ Seeders para datos de prueba (Fase 2)
 * ⏳ Backup automático (Fase 7)
 */