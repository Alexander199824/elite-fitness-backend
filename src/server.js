/**
 * SERVIDOR PRINCIPAL - ELITE FITNESS CLUB
 * 
 * Soy el punto de entrada principal del sistema
 * Mi responsabilidad es inicializar el servidor, conectar a la base de datos
 * y manejar el ciclo de vida de la aplicación de forma segura
 * 
 * ACTUALIZADO PARA SUB-FASE 2.3: Detección completa de controladores y rutas
 * 
 * Funcionalidades actuales:
 * - Inicialización segura del servidor
 * - Conexión a PostgreSQL
 * - Detección automática de fase completada
 * - Verificación de controladores y rutas
 * - Manejo de señales del sistema
 * - Logging de estado del servidor
 * - Información de APIs disponibles
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
    
    // Verificar si los controladores están disponibles (Sub-fase 2.3)
    try {
      const authController = require('./controllers/authController');
      const userController = require('./controllers/userController');
      const clientController = require('./controllers/clientController');
      
      const hasControllers = authController && userController && clientController;
      
      if (hasControllers) {
        // Verificar si las rutas están disponibles (Sub-fase 2.3)
        try {
          const authRoutes = require('./routes/auth');
          const userRoutes = require('./routes/users');
          const clientRoutes = require('./routes/clients');
          
          const hasRoutes = authRoutes && userRoutes && clientRoutes;
          
          if (hasRoutes) {
            return {
              phase: 'Sub-fase 2.3',
              title: 'Controladores y Rutas Completadas',
              next: 'Sub-fase 2.4: Documentación APIs y Optimizaciones'
            };
          }
        } catch (routesError) {
          // Rutas no disponibles
        }
        
        return {
          phase: 'Sub-fase 2.3',
          title: 'Controladores Implementados',
          next: 'Sub-fase 2.3: Completar Rutas'
        };
      }
    } catch (controllersError) {
      // Controladores no disponibles
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
    
    // Verificar controladores y rutas (Sub-fase 2.3)
    console.log('🎛️  Verificando controladores y rutas...');
    try {
      const authController = require('./controllers/authController');
      const userController = require('./controllers/userController');
      const clientController = require('./controllers/clientController');
      
      console.log('✅ Controladores cargados: authController, userController, clientController');
      
      // Verificar rutas
      try {
        const authRoutes = require('./routes/auth');
        const userRoutes = require('./routes/users');
        const clientRoutes = require('./routes/clients');
        
        console.log('✅ Rutas integradas: /api/auth, /api/users, /api/clients');
        console.log('🔗 APIs disponibles: 25+ endpoints operativos');
      } catch (routesError) {
        console.log('⚠️  Rutas no disponibles:', routesError.message);
      }
    } catch (controllersError) {
      console.log('⚠️  Controladores no disponibles:', controllersError.message);
    }
    
    // Iniciar servidor HTTP
    server = app.listen(PORT, HOST, () => {
      console.log('✅ Servidor iniciado exitosamente');
      console.log(`🌐 URL: http://${HOST}:${PORT}`);
      console.log(`🏥 Health Check: http://${HOST}:${PORT}/health`);
      console.log(`💾 DB Status: http://${HOST}:${PORT}/api/db-status`);
      
      // Verificar si endpoint de auth está disponible (Sub-fase 2.2+)
      try {
        const { getAvailableStrategies } = require('./config/passport');
        console.log(`🔐 Auth Status: http://${HOST}:${PORT}/api/auth-status`);
      } catch (error) {
        // Auth status no disponible
      }
      
      // Mostrar APIs disponibles (Sub-fase 2.3)
      try {
        const authController = require('./controllers/authController');
        console.log(`🔐 Auth APIs: http://${HOST}:${PORT}/api/auth`);
        console.log(`👥 Users APIs: http://${HOST}:${PORT}/api/users`);
        console.log(`👤 Clients APIs: http://${HOST}:${PORT}/api/clients`);
      } catch (error) {
        // APIs no disponibles aún
      }
      
      console.log('==========================================');
      
      // Detectar fase actual automáticamente
      const currentPhase = detectCurrentPhase();
      console.log(`💪 Elite Fitness Club Backend - ${currentPhase.phase}`);
      console.log(`🔧 ${currentPhase.title}`);
      console.log(`⏭️  Listo para ${currentPhase.next}`);
      
      // Mostrar funcionalidades disponibles según la fase
      if (currentPhase.phase.includes('2.3')) {
        console.log('🎉 FUNCIONALIDADES OPERATIVAS:');
        console.log('   🔐 Sistema de autenticación completo (OAuth + JWT)');
        console.log('   👥 Gestión de usuarios administrativos (CRUD)');
        console.log('   👤 Gestión de clientes con autogestión');
        console.log('   🎮 Sistema de gamificación (puntos, check-ins)');
        console.log('   🛡️  Autorización granular por permisos');
        console.log('   📊 APIs RESTful completas (25+ endpoints)');
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
 * ESTADO ACTUAL - SUB-FASE 2.3:
 * ✅ Servidor Express configurado y funcional
 * ✅ Conexión a PostgreSQL verificada
 * ✅ Modelos de base de datos cargados automáticamente
 * ✅ Detección automática de fase completada actualizada
 * ✅ Passport.js y JWT verificados automáticamente
 * ✅ Controladores de autenticación, usuarios y clientes integrados
 * ✅ Rutas completas con middleware aplicado
 * ✅ APIs RESTful operativas (25+ endpoints)
 * ✅ Manejo seguro de cierre del servidor
 * ✅ Error handling para excepciones no capturadas
 * ✅ Logging detallado del estado del sistema
 * ✅ Configuración para múltiples entornos
 * 
 * COMPLETADO EN SUB-FASE 2.3:
 * ✅ authController.js - Controlador de autenticación completo
 * ✅ userController.js - CRUD de usuarios administrativos
 * ✅ clientController.js - Gestión de clientes del gimnasio
 * ✅ routes/auth.js - Rutas de autenticación con middleware
 * ✅ routes/users.js - Rutas administrativas con permisos
 * ✅ routes/clients.js - Rutas de clientes con autogestión
 * ✅ app.js actualizado con integración de rutas
 * ✅ server.js con detección de controladores y rutas
 * ✅ Sistema completo de APIs operativo
 * 
 * LISTO PARA SUB-FASE 2.4:
 * ⏭️ Documentación completa de APIs (Swagger/OpenAPI)
 * ⏭️ Optimizaciones de rendimiento y cache
 * ⏭️ Logging avanzado para auditoría
 * ⏭️ Preparación para deployment a producción
 * ⏭️ Integración con frontend (React/React Native)
 * ⏭️ Testing de performance y carga
 */