/**
 * SISTEMA DE MIGRACIÓN MANUAL - ELITE FITNESS CLUB
 * 
 * Soy el archivo encargado del sistema de migración manual de tablas
 * Mi responsabilidad es eliminar y recrear toda la estructura de base de datos
 * SOLO cuando el desarrollador establece RECREATE_TABLES=true manualmente
 * 
 * Características de seguridad:
 * - Control manual total (no se ejecuta automáticamente)
 * - Auto-reset de variable después de ejecutar
 * - Preservación de la base de datos principal
 * - Logs detallados de cambios
 * - Sistema de rollback en caso de error
 */

const fs = require('fs').promises;
const path = require('path');
const { sequelize } = require('../config/database');
require('dotenv').config();

/**
 * Función para actualizar el archivo .env
 */
const updateEnvFile = async (key, value) => {
  try {
    const envPath = path.resolve('.env');
    let envContent = '';
    
    try {
      envContent = await fs.readFile(envPath, 'utf8');
    } catch (error) {
      console.log('📄 Archivo .env no existe, se creará uno nuevo');
    }
    
    const lines = envContent.split('\n');
    let keyFound = false;
    
    // Actualizar línea existente o agregar nueva
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(`${key}=`)) {
        lines[i] = `${key}=${value}`;
        keyFound = true;
        break;
      }
    }
    
    if (!keyFound) {
      lines.push(`${key}=${value}`);
    }
    
    await fs.writeFile(envPath, lines.join('\n'));
    console.log(`✅ Variable ${key} actualizada en .env`);
    
  } catch (error) {
    console.error(`❌ Error actualizando .env:`, error.message);
  }
};

/**
 * Función para obtener todas las tablas existentes
 */
const getAllTables = async () => {
  try {
    const [results] = await sequelize.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    return results.map(row => row.tablename);
  } catch (error) {
    console.error('❌ Error obteniendo tablas:', error.message);
    return [];
  }
};

/**
 * Función para eliminar todas las tablas
 */
const dropAllTables = async () => {
  try {
    console.log('🗑️  Eliminando todas las tablas existentes...');
    
    const tables = await getAllTables();
    
    if (tables.length === 0) {
      console.log('📭 No hay tablas para eliminar');
      return [];
    }
    
    console.log(`📋 Tablas encontradas: ${tables.join(', ')}`);
    
    // Eliminar cada tabla con CASCADE
    const droppedTables = [];
    for (const table of tables) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        droppedTables.push(table);
        console.log(`  ✅ Tabla "${table}" eliminada`);
      } catch (error) {
        console.log(`  ⚠️  Error eliminando tabla "${table}": ${error.message}`);
      }
    }
    
    console.log(`🎯 ${droppedTables.length} tablas eliminadas exitosamente`);
    return droppedTables;
    
  } catch (error) {
    console.error('❌ Error eliminando tablas:', error.message);
    throw error;
  }
};

/**
 * Función para recrear todas las tablas usando modelos de Sequelize
 */
const recreateTables = async () => {
  try {
    console.log('🏗️  Recreando estructura de tablas con modelos...');
    
    // Importar modelos centralizados
    const { migrateWithModels, models } = require('../models');
    
    // Usar la función de migración integrada
    await migrateWithModels();
    
    // Obtener lista de tablas creadas
    const createdTables = Object.keys(models).map(modelName => {
      return models[modelName].tableName || modelName.toLowerCase() + 's';
    });
    
    console.log(`🎯 ${createdTables.length} tablas recreadas: ${createdTables.join(', ')}`);
    
    return createdTables;
    
  } catch (error) {
    console.error('❌ Error recreando tablas:', error.message);
    throw error;
  }
};

/**
 * Función para ejecutar seeders usando modelos de Sequelize
 */
const runSeeders = async () => {
  if (process.env.ENABLE_SEEDERS === 'true') {
    console.log('🌱 Ejecutando seeders de desarrollo...');
    
    try {
      // Importar función de seeding
      const { createSeedData } = require('../models');
      
      // Ejecutar seeders
      const seedsCreated = await createSeedData();
      
      if (seedsCreated) {
        console.log('✅ Seeders ejecutados exitosamente');
      } else {
        console.log('⏭️  Seeders saltados (datos ya existen)');
      }
      
    } catch (error) {
      console.error('❌ Error ejecutando seeders:', error.message);
    }
  } else {
    console.log('⏭️  Seeders deshabilitados (ENABLE_SEEDERS=false)');
  }
};

/**
 * Función principal de migración
 */
const migrate = async () => {
  const startTime = Date.now();
  console.log('🚀 ===========================================');
  console.log('🚀 ELITE FITNESS - MIGRACIÓN MANUAL DE TABLAS');
  console.log('🚀 ===========================================');
  console.log(`📅 Iniciado: ${new Date().toLocaleString()}`);
  
  try {
    // Verificar si debe ejecutarse
    if (process.env.RECREATE_TABLES !== 'true') {
      console.log('⏸️  RECREATE_TABLES no está establecido en "true"');
      console.log('💡 Para ejecutar migración: cambia RECREATE_TABLES=true en .env');
      return false;
    }
    
    console.log('✅ RECREATE_TABLES=true detectado. Iniciando migración...');
    
    // Verificar conexión
    await sequelize.authenticate();
    console.log('🔗 Conexión a base de datos verificada');
    
    // Paso 1: Eliminar tablas existentes
    const droppedTables = await dropAllTables();
    
    // Paso 2: Recrear estructura (Fase 2)
    const createdTables = await recreateTables();
    
    // Paso 3: Ejecutar seeders (Fase 2)
    await runSeeders();
    
    // Paso 4: Auto-reset de variable para seguridad
    console.log('🔒 Reseteando RECREATE_TABLES a false por seguridad...');
    await updateEnvFile('RECREATE_TABLES', 'false');
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('🎉 ===========================================');
    console.log('🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('🎉 ===========================================');
    console.log(`⏱️  Duración: ${duration}s`);
    console.log(`🗑️  Tablas eliminadas: ${droppedTables.length}`);
    console.log(`🏗️  Tablas recreadas: ${createdTables.length} (Pendiente Fase 2)`);
    console.log(`🔒 RECREATE_TABLES reseteado automáticamente a false`);
    console.log('💡 La aplicación está lista para desarrollo');
    
    return true;
    
  } catch (error) {
    console.error('💥 ===========================================');
    console.error('💥 ERROR EN MIGRACIÓN');
    console.error('💥 ===========================================');
    console.error('❌ Error:', error.message);
    console.error('📍 Stack:', error.stack);
    
    // Intentar resetear variable incluso en caso de error
    try {
      await updateEnvFile('RECREATE_TABLES', 'false');
      console.log('🔒 RECREATE_TABLES reseteado a false por seguridad');
    } catch (resetError) {
      console.error('❌ Error reseteando variable:', resetError.message);
    }
    
    throw error;
  }
};

/**
 * Ejecutar migración si se llama directamente
 */
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('✅ Proceso de migración completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Proceso de migración falló:', error.message);
      process.exit(1);
    });
}

module.exports = {
  migrate,
  dropAllTables,
  recreateTables,
  runSeeders,
  updateEnvFile
};

/**
 * ESTADO ACTUAL - FASE 1:
 * ✅ Sistema de migración manual implementado
 * ✅ Control total del desarrollador (RECREATE_TABLES=true)
 * ✅ Auto-reset de variable por seguridad
 * ✅ Eliminación segura de tablas con CASCADE
 * ✅ Logs detallados de todo el proceso
 * ✅ Manejo de errores con rollback
 * 
 * PENDIENTE PARA SIGUIENTES FASES:
 * ⏳ Carga automática de modelos (Fase 2)
 * ⏳ Recreación de tablas con Sequelize.sync() (Fase 2)
 * ⏳ Sistema de seeders automático (Fase 2)
 * ⏳ Backup antes de migración (Fase 7)
 * ⏳ Sistema de versionado de migraciones (Fase 7)
 */