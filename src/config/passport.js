/**
 * CONFIGURACIÓN PASSPORT.JS - ELITE FITNESS CLUB
 * 
 * Soy el archivo que configura todas las estrategias de autenticación
 * Mi responsabilidad es configurar Passport.js con estrategias para:
 * - Google OAuth 2.0
 * - Facebook Login
 * - JWT Authentication
 * - Local Authentication (email/password)
 * 
 * Características implementadas:
 * - Estrategias OAuth configurables
 * - Autenticación local segura
 * - Verificación JWT
 * - Serialización de usuarios
 * - Manejo de errores de autenticación
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const LocalStrategy = require('passport-local').Strategy;

const { 
  getPassportConfig, 
  processGoogleProfile, 
  processFacebookProfile,
  findOrCreateOAuthClient,
  isOAuthAvailable 
} = require('../utils/oauth');

const { verifyToken, JWT_CONFIG } = require('../utils/jwt');

/**
 * Configurar serialización de usuarios para sesiones
 * (Usado principalmente para OAuth web flows)
 */
passport.serializeUser((user, done) => {
  // Serializar usando ID y tipo de usuario
  done(null, {
    id: user.id,
    type: user.constructor.name.toLowerCase() // 'user' o 'client'
  });
});

passport.deserializeUser(async (serializedUser, done) => {
  try {
    const { User, Client } = require('../models');
    let user = null;
    
    if (serializedUser.type === 'user') {
      user = await User.findByPk(serializedUser.id);
    } else {
      user = await Client.findByPk(serializedUser.id);
    }
    
    if (!user || !user.isActive) {
      return done(null, false);
    }
    
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

/**
 * Estrategia JWT para autenticación API
 */
passport.use('jwt', new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_CONFIG.secret,
  issuer: JWT_CONFIG.issuer,
  audience: JWT_CONFIG.audience,
  ignoreExpiration: false,
  passReqToCallback: true
}, async (req, payload, done) => {
  try {
    const { User, Client } = require('../models');
    let user = null;
    
    // Buscar usuario según el tipo
    if (payload.type === 'user') {
      user = await User.findByPk(payload.id);
    } else if (payload.type === 'client') {
      user = await Client.findByPk(payload.id);
    } else {
      return done(null, false, { message: 'Tipo de usuario no válido' });
    }
    
    if (!user || !user.isActive) {
      return done(null, false, { message: 'Usuario no encontrado o inactivo' });
    }
    
    // Actualizar último login si es necesario
    const now = new Date();
    const timeSinceLastLogin = user.lastLogin ? now - user.lastLogin : Infinity;
    
    if (timeSinceLastLogin > 30 * 60 * 1000) { // 30 minutos
      await user.update({ lastLogin: now }, { silent: true });
    }
    
    // Agregar información del token al usuario
    user.tokenPayload = payload;
    
    return done(null, user);
    
  } catch (error) {
    console.error('❌ Error en estrategia JWT:', error.message);
    return done(error, false);
  }
}));

/**
 * Estrategia Local para autenticación email/password
 */
passport.use('local-client', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: true
}, async (req, email, password, done) => {
  try {
    const { Client } = require('../models');
    
    // Buscar cliente por email
    const client = await Client.scope('withPassword').findActiveByEmail(email);
    
    if (!client) {
      return done(null, false, { 
        message: 'Email no registrado',
        code: 'EMAIL_NOT_FOUND'
      });
    }
    
    // Verificar si la cuenta está bloqueada
    if (client.isLocked()) {
      return done(null, false, { 
        message: 'Cuenta temporalmente bloqueada por múltiples intentos fallidos',
        code: 'ACCOUNT_LOCKED'
      });
    }
    
    // Verificar password
    const isValidPassword = await client.validatePassword(password);
    
    if (!isValidPassword) {
      // Incrementar intentos fallidos
      await client.incrementLoginAttempts();
      
      return done(null, false, { 
        message: 'Contraseña incorrecta',
        code: 'INVALID_PASSWORD'
      });
    }
    
    // Login exitoso - resetear intentos fallidos
    await client.resetLoginAttempts();
    
    console.log(`✅ Login local exitoso: ${client.email}`);
    return done(null, client);
    
  } catch (error) {
    console.error('❌ Error en estrategia local-client:', error.message);
    return done(error, false);
  }
}));

/**
 * Estrategia Local para administradores
 */
passport.use('local-user', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password',
  passReqToCallback: true
}, async (req, email, password, done) => {
  try {
    const { User } = require('../models');
    
    // Buscar usuario por email
    const user = await User.scope('withPassword').findActiveByEmail(email);
    
    if (!user) {
      return done(null, false, { 
        message: 'Email de administrador no registrado',
        code: 'EMAIL_NOT_FOUND'
      });
    }
    
    // Verificar si la cuenta está bloqueada
    if (user.isLocked()) {
      return done(null, false, { 
        message: 'Cuenta de administrador bloqueada',
        code: 'ACCOUNT_LOCKED'
      });
    }
    
    // Verificar password
    const isValidPassword = await user.validatePassword(password);
    
    if (!isValidPassword) {
      // Incrementar intentos fallidos
      await user.incrementLoginAttempts();
      
      return done(null, false, { 
        message: 'Contraseña incorrecta',
        code: 'INVALID_PASSWORD'
      });
    }
    
    // Login exitoso - resetear intentos fallidos
    await user.resetLoginAttempts();
    
    console.log(`✅ Login admin exitoso: ${user.email} (${user.role})`);
    return done(null, user);
    
  } catch (error) {
    console.error('❌ Error en estrategia local-user:', error.message);
    return done(error, false);
  }
}));

/**
 * Estrategia Google OAuth 2.0
 */
if (isOAuthAvailable().google) {
  const googleConfig = getPassportConfig().google;
  
  passport.use('google', new GoogleStrategy(googleConfig, async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Procesar perfil de Google
      const processedProfile = processGoogleProfile(profile);
      
      // Encontrar o crear cliente
      const client = await findOrCreateOAuthClient(processedProfile, 'google');
      
      // Agregar información OAuth al cliente
      client.oauthProfile = processedProfile;
      client.oauthTokens = { accessToken, refreshToken };
      
      console.log(`✅ Google OAuth exitoso: ${client.email}`);
      return done(null, client);
      
    } catch (error) {
      console.error('❌ Error en Google OAuth:', error.message);
      return done(error, false);
    }
  }));
  
  console.log('✅ Estrategia Google OAuth configurada');
} else {
  console.log('⚠️  Google OAuth no configurado (falta GOOGLE_OAUTH_CLIENT_ID o CLIENT_SECRET)');
}

/**
 * Estrategia Facebook Login
 */
if (isOAuthAvailable().facebook) {
  const facebookConfig = getPassportConfig().facebook;
  
  passport.use('facebook', new FacebookStrategy(facebookConfig, async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Procesar perfil de Facebook
      const processedProfile = processFacebookProfile(profile);
      
      // Encontrar o crear cliente
      const client = await findOrCreateOAuthClient(processedProfile, 'facebook');
      
      // Agregar información OAuth al cliente
      client.oauthProfile = processedProfile;
      client.oauthTokens = { accessToken, refreshToken };
      
      console.log(`✅ Facebook OAuth exitoso: ${client.email}`);
      return done(null, client);
      
    } catch (error) {
      console.error('❌ Error en Facebook OAuth:', error.message);
      return done(error, false);
    }
  }));
  
  console.log('✅ Estrategia Facebook OAuth configurada');
} else {
  console.log('⚠️  Facebook OAuth no configurado (falta FACEBOOK_APP_ID o APP_SECRET)');
}

/**
 * Función para inicializar Passport
 */
const initializePassport = (app) => {
  // Inicializar Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  console.log('✅ Passport.js inicializado correctamente');
  
  // Logging de estrategias configuradas
  const strategies = [];
  
  if (passport._strategy('jwt')) strategies.push('JWT');
  if (passport._strategy('local-client')) strategies.push('Local Client');
  if (passport._strategy('local-user')) strategies.push('Local User');
  if (passport._strategy('google')) strategies.push('Google OAuth');
  if (passport._strategy('facebook')) strategies.push('Facebook OAuth');
  
  console.log(`📋 Estrategias configuradas: ${strategies.join(', ')}`);
  
  return passport;
};

/**
 * Middleware para autenticación JWT sin errores
 */
const authenticateJWT = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      // No hay usuario autenticado, pero no es error
      req.user = null;
      req.isAuthenticated = false;
      return next();
    }
    
    // Usuario autenticado exitosamente
    req.user = user;
    req.isAuthenticated = true;
    next();
  })(req, res, next);
};

/**
 * Middleware para requerir autenticación JWT
 */
const requireJWT = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return res.status(401).json({
        error: 'Token de autenticación requerido',
        message: info?.message || 'No autorizado',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }
    
    req.user = user;
    req.isAuthenticated = true;
    next();
  })(req, res, next);
};

/**
 * Obtener información de estrategias disponibles
 */
const getAvailableStrategies = () => {
  const strategies = {
    jwt: !!passport._strategy('jwt'),
    localClient: !!passport._strategy('local-client'),
    localUser: !!passport._strategy('local-user'),
    google: !!passport._strategy('google'),
    facebook: !!passport._strategy('facebook')
  };
  
  return strategies;
};

module.exports = {
  passport,
  initializePassport,
  authenticateJWT,
  requireJWT,
  getAvailableStrategies
};

/**
 * ESTADO ACTUAL - SUB-FASE 2.2:
 * ✅ Estrategia JWT para autenticación API
 * ✅ Estrategia Local para clientes (email/password)
 * ✅ Estrategia Local para administradores
 * ✅ Estrategia Google OAuth 2.0 configurada
 * ✅ Estrategia Facebook Login configurada
 * ✅ Serialización/deserialización de usuarios
 * ✅ Middleware de autenticación JWT
 * ✅ Middleware para requerir autenticación
 * ✅ Manejo de cuentas bloqueadas
 * ✅ Logging y monitoreo de autenticación
 * 
 * PENDIENTE EN SIGUIENTES SUB-FASES:
 * ⏳ Middleware de autorización por roles (2.3)
 * ⏳ Middleware de validación de datos (2.3)
 * ⏳ Controladores de autenticación (2.4)
 * ⏳ Rutas protegidas (2.5)
 * ⏳ Testing completo de autenticación (2.6)
 */