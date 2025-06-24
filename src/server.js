/**
 * SERVIDOR PRINCIPAL - ELITE FITNESS CLUB
 * 
 * Soy el punto de entrada principal del sistema
 * Mi responsabilidad es inicializar el servidor, conectar a la base de datos
 * y manejar el ciclo de vida de la aplicación de forma segura
 * 
 * ACTUALIZADO PARA SUB-FASE 2.2: Detección correcta de fase completada
 * 
 * Funcionalidades actuales:
 * - Inicialización segura del servidor
 * - Conexión a PostgreSQL
 * - Detección automática de fase completada
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
 * Detectar fase actual del proyecto
 */
const detectCurrentPhase = () => {
  try {
    // Verificar si existen los modelos (Fase 2.1+)
    const { models } = require('./models');
    const hasModels = Object.keys(models).length > 0;
    
    if (!hasModels) {
      return {
        phase: 'Fase 1',
        title: 'Configuración Base Completada',
        next: 'Fase 2: Autenticación'
      };
    }
    
    // Verificar si Passport.js está configurado (Sub-fase 2.2)
    try {
      const { getAvailableStrategies } = require('./config/passport');
      const strategies = getAvailableStrategies();
      const hasPassport = strategies && Object.keys(strategies).length > 0;
      
      if (hasPassport) {
        // Verificar si JWT utilities están disponibles (Sub-fase 2.2)
        try {
          const { generateAccessToken } = require('./utils/jwt');
          const hasJWT = typeof generateAccessToken === 'function';
          
          if (hasJWT) {
            return {
              phase: 'Sub-fase 2.2',
              title: 'Autenticación y JWT Completada',
              next: 'Sub-fase 2.3: Controladores de Autenticación'
            };
          }
        } catch (jwtError) {
          // JWT no disponible
        }
        
        return {
          phase: 'Fase 2.1',
          title: 'Modelos de Base de Datos Completados',
          next: 'Sub-fase 2.2: JWT y OAuth'
        };
      }
    } catch (passportError) {
      // Passport no disponible
    }
    
    return {
      phase: 'Fase 2.1',
      title: 'Modelos de Base de Datos Completados',
      next: 'Sub-fase 2.2: JWT y OAuth'
    };
    
  } catch (error) {
    return {
      phase: 'Fase 1',
      title: 'Configuración Base Completada',
      next: 'Fase 2: Autenticación'
    };
  }
};

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
    
    // Cargar y validar modelos
    console.log('📊 Cargando modelos de base de datos...');
    try {
      const { validateModels, models } = require('./models');
      validateModels();
      const modelNames = Object.keys(models);
      console.log(`✅ Modelos cargados correctamente: ${modelNames.join(', ')}`);
      console.log(`📈 Total de modelos registrados: ${modelNames.length}`);
    } catch (error) {
      console.log('⚠️  Modelos no disponibles:', error.message);
      console.log('💡 Ejecuta migración para crear las tablas: npm run migrate');
    }
    
    // Iniciar servidor HTTP
    server = app.listen(PORT, HOST, () => {
      console.log('✅ Servidor iniciado exitosamente');
      console.log(`🌐 URL: http://${HOST}:${PORT}`);
      console.log(`🏥 Health Check: http://${HOST}:${PORT}/health`);
      console.log(`💾 DB Status: http://${HOST}:${PORT}/api/db-status`);
      
      // NUEVO: Verificar si endpoint de auth está disponible (Sub-fase 2.2)
      try {
        const { getAvailableStrategies } = require('./config/passport');
        console.log(`🔐 Auth Status: http://${HOST}:${PORT}/api/auth-status`);
      } catch (error) {
        // Auth status no disponible
      }
      
      console.log('==========================================');
      
      // Detectar fase actual automáticamente
      const currentPhase = detectCurrentPhase();
      console.log(`💪 Elite Fitness Club Backend - ${currentPhase.phase}`);
      console.log(`🔧 ${currentPhase.title}`);
      console.log(`⏭️  Listo para ${currentPhase.next}`);
      
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
 * ESTADO ACTUAL - SUB-FASE 2.2:
 * ✅ Servidor Express configurado y funcional
 * ✅ Conexión a PostgreSQL verificada
 * ✅ Modelos de base de datos cargados automáticamente
 * ✅ Detección automática de fase completada
 * ✅ Passport.js y JWT verificados automáticamente
 * ✅ Endpoint de auth-status incluido en logs
 * ✅ Manejo seguro de cierre del servidor
 * ✅ Error handling para excepciones no capturadas
 * ✅ Logging detallado del estado del sistema
 * ✅ Configuración para múltiples entornos
 * 
 * COMPLETADO EN SUB-FASE 2.2:
 * ✅ Modelos de BD (User, Client, ClientPreference)
 * ✅ Utilidades JWT (generación, verificación, renovación)
 * ✅ Configuración OAuth (Google + Facebook)
 * ✅ Estrategias Passport.js (JWT, Local, OAuth)
 * ✅ Middleware de autenticación y autorización
 * ✅ Middleware de validación de datos
 * ✅ Integración completa en aplicación principal
 * ✅ Detección automática de fase completada
 * 
 * LISTO PARA SUB-FASE 2.3:
 * ⏭️ Controladores de autenticación (authController.js)
 * ⏭️ Controladores de usuario (userController.js)
 * ⏭️ Rutas de autenticación (routes/auth.js)
 * ⏭️ Rutas protegidas (routes/users.js, routes/clients.js)
 * ⏭️ Testing completo de APIs de autenticación
 */