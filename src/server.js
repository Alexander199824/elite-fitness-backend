/**
 * SERVIDOR PRINCIPAL - ELITE FITNESS CLUB
 * 
 * Soy el punto de entrada principal del sistema
 * Mi responsabilidad es inicializar el servidor, conectar a la base de datos
 * y manejar el ciclo de vida de la aplicación de forma segura
 * 
 * Funcionalidades actuales:
 * - Inicialización segura del servidor
 * - Conexión a PostgreSQL
 * - Manejo de señales del sistema
 * - Logging de estado del servidor
 */

require('dotenv').config();
const app = require('./app');
const { testConnection, closeConnection } = require('./config/database');

// Configuración del puerto
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Variable para almacenar la instancia del servidor
let server;

/**
 * Función para inicializar el servidor de forma segura
 */
const startServer = async () => {
  try {
    console.log('🚀 Iniciando Elite Fitness Club Backend...');
    console.log(`📍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    
    // Verificar conexión a base de datos
    console.log('🔗 Verificando conexión a base de datos...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ No se pudo conectar a la base de datos');
      console.error('💡 Verifica tu archivo .env y que PostgreSQL esté ejecutándose');
      process.exit(1);
    }
    
    // Cargar y validar modelos de Fase 2
    console.log('📊 Cargando modelos de base de datos...');
    try {
      const { validateModels, models } = require('./models');
      validateModels();
      const modelNames = Object.keys(models);
      console.log(`✅ Modelos de Fase 2 cargados correctamente: ${modelNames.join(', ')}`);
      console.log(`📈 Total de modelos registrados: ${modelNames.length}`);
    } catch (error) {
      console.log('⚠️  Modelos de Fase 2 no disponibles:', error.message);
      console.log('💡 Ejecuta migración para crear las tablas: npm run migrate');
    }
    
    // Iniciar servidor HTTP
    server = app.listen(PORT, HOST, () => {
      console.log('✅ Servidor iniciado exitosamente');
      console.log(`🌐 URL: http://${HOST}:${PORT}`);
      console.log(`🏥 Health Check: http://${HOST}:${PORT}/health`);
      console.log(`💾 DB Status: http://${HOST}:${PORT}/api/db-status`);
      console.log('==========================================');
      
      // Detectar fase según modelos disponibles
      try {
        const { models } = require('./models');
        const hasModels = Object.keys(models).length > 0;
        
        if (hasModels) {
          console.log('💪 Elite Fitness Club Backend - Fase 2.1');
          console.log('🔧 Modelos de Base de Datos Completados');
          console.log('⏭️  Listo para Sub-fase 2.2: JWT y OAuth');
        } else {
          console.log('💪 Elite Fitness Club Backend - Fase 1');
          console.log('🔧 Configuración Base Completada');
          console.log('⏭️  Listo para Fase 2: Autenticación');
        }
      } catch (error) {
        console.log('💪 Elite Fitness Club Backend - Fase 1');
        console.log('🔧 Configuración Base Completada');
        console.log('⏭️  Listo para Fase 2: Autenticación');
      }
      
      console.log('==========================================');
    });
    
    // Configurar timeout del servidor
    server.timeout = 30000; // 30 segundos
    
  } catch (error) {
    console.error('💥 Error crítico iniciando servidor:', error.message);
    process.exit(1);
  }
};

/**
 * Función para cerrar el servidor de forma segura
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Señal ${signal} recibida. Cerrando servidor...`);
  
  try {
    // Cerrar servidor HTTP
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
      console.log('🔒 Servidor HTTP cerrado');
    }
    
    // Cerrar conexión a base de datos
    await closeConnection();
    
    console.log('✅ Cierre exitoso del sistema');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error durante el cierre:', error.message);
    process.exit(1);
  }
};

/**
 * Manejo de errores no capturados
 */
process.on('uncaughtException', (error) => {
  console.error('💥 Excepción no capturada:', error);
  console.error('📍 Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promise rechazada no manejada:', reason);
  console.error('📍 Promise:', promise);
  process.exit(1);
});

/**
 * Manejo de señales del sistema para cierre seguro
 */
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// En Windows
process.on('SIGBREAK', () => gracefulShutdown('SIGBREAK'));

/**
 * Inicializar servidor solo si no está siendo importado
 */
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, gracefulShutdown };

/**
 * ESTADO ACTUAL - FASE 2.1:
 * ✅ Servidor Express configurado y funcional
 * ✅ Conexión a PostgreSQL verificada
 * ✅ Modelos de base de datos cargados automáticamente
 * ✅ Manejo seguro de cierre del servidor
 * ✅ Error handling para excepciones no capturadas
 * ✅ Logging detallado del estado del sistema
 * ✅ Configuración para múltiples entornos
 * ✅ Detección automática de fase según modelos disponibles
 * 
 * PENDIENTE PARA SIGUIENTES SUB-FASES:
 * ⏳ Utilidades JWT y OAuth (Sub-fase 2.2)
 * ⏳ Middleware de autenticación (Sub-fase 2.3)
 * ⏳ Controladores de autenticación (Sub-fase 2.4)
 * ⏳ Rutas protegidas (Sub-fase 2.5)
 * ⏳ Testing completo de autenticación (Sub-fase 2.6)
 */