/**
 * CONFIGURACIÓN OAUTH - ELITE FITNESS CLUB
 * 
 * Soy el archivo encargado de manejar la configuración OAuth
 * Mi responsabilidad es configurar Google y Facebook OAuth,
 * manejar callbacks y procesar perfiles de usuarios
 * 
 * Características implementadas:
 * - Configuración Google OAuth 2.0
 * - Configuración Facebook Login
 * - Procesamiento de perfiles OAuth
 * - Manejo de errores de OAuth
 * - URLs de redirección configurables
 */

require('dotenv').config();

// Configuración OAuth desde variables de entorno
const OAUTH_CONFIG = {
  google: {
    clientID: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    callbackURL: '/api/auth/google/callback',
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent'
  },
  
  facebook: {
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: '/api/auth/facebook/callback',
    profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
    scope: ['email', 'public_profile']
  },
  
  // URLs de redirección del frontend
  redirectUrls: {
    success: process.env.FRONTEND_URL + '/auth/success' || 'http://localhost:3001/auth/success',
    failure: process.env.FRONTEND_URL + '/auth/failure' || 'http://localhost:3001/auth/failure',
    mobile: process.env.MOBILE_APP_URL + 'auth/callback' || 'elitefitnessapp://auth/callback'
  }
};

/**
 * Validar configuración OAuth
 */
const validateOAuthConfig = () => {
  const errors = [];
  
  // Validar Google OAuth
  if (!OAUTH_CONFIG.google.clientID) {
    errors.push('GOOGLE_OAUTH_CLIENT_ID no configurado');
  }
  if (!OAUTH_CONFIG.google.clientSecret) {
    errors.push('GOOGLE_OAUTH_CLIENT_SECRET no configurado');
  }
  
  // Validar Facebook OAuth
  if (!OAUTH_CONFIG.facebook.clientID) {
    errors.push('FACEBOOK_APP_ID no configurado');
  }
  if (!OAUTH_CONFIG.facebook.clientSecret) {
    errors.push('FACEBOOK_APP_SECRET no configurado');
  }
  
  if (errors.length > 0) {
    console.warn('⚠️  Configuración OAuth incompleta:');
    errors.forEach(error => console.warn(`   - ${error}`));
    console.warn('💡 OAuth funcionará en modo degradado');
    return false;
  }
  
  console.log('✅ Configuración OAuth validada correctamente');
  return true;
};

/**
 * Procesar perfil de Google OAuth
 */
const processGoogleProfile = (profile) => {
  try {
    const emails = profile.emails || [];
    const photos = profile.photos || [];
    
    const processedProfile = {
      id: profile.id,
      provider: 'google',
      email: emails.length > 0 ? emails[0].value : null,
      firstName: profile.name?.givenName || '',
      lastName: profile.name?.familyName || '',
      displayName: profile.displayName || '',
      picture: photos.length > 0 ? photos[0].value : null,
      verified: emails.length > 0 ? emails[0].verified : false,
      locale: profile._json?.locale || 'es',
      raw: profile._json
    };
    
    // Validar que tenga email
    if (!processedProfile.email) {
      throw new Error('Perfil de Google sin email válido');
    }
    
    console.log(`✅ Perfil de Google procesado: ${processedProfile.email}`);
    return processedProfile;
    
  } catch (error) {
    console.error('❌ Error procesando perfil de Google:', error.message);
    throw new Error('Error procesando datos de Google OAuth');
  }
};

/**
 * Procesar perfil de Facebook OAuth
 */
const processFacebookProfile = (profile) => {
  try {
    const emails = profile.emails || [];
    const photos = profile.photos || [];
    
    const processedProfile = {
      id: profile.id,
      provider: 'facebook',
      email: emails.length > 0 ? emails[0].value : null,
      firstName: profile.name?.givenName || '',
      lastName: profile.name?.familyName || '',
      displayName: profile.displayName || '',
      picture: photos.length > 0 ? photos[0].value : null,
      verified: true, // Facebook emails son verificados por defecto
      locale: profile._json?.locale || 'es_LA',
      raw: profile._json
    };
    
    // Validar que tenga email
    if (!processedProfile.email) {
      throw new Error('Perfil de Facebook sin email válido');
    }
    
    console.log(`✅ Perfil de Facebook procesado: ${processedProfile.email}`);
    return processedProfile;
    
  } catch (error) {
    console.error('❌ Error procesando perfil de Facebook:', error.message);
    throw new Error('Error procesando datos de Facebook OAuth');
  }
};

/**
 * Encontrar o crear cliente con OAuth
 */
const findOrCreateOAuthClient = async (profile, provider) => {
  try {
    const { Client } = require('../models');
    
    // Buscar cliente existente por OAuth ID
    let client = await Client.findByOAuthId(provider, profile.id);
    
    if (client) {
      // Cliente existente - actualizar último login
      await client.update({ lastLogin: new Date() });
      console.log(`✅ Cliente OAuth existente encontrado: ${client.email}`);
      return client;
    }
    
    // Buscar por email para vincular cuentas
    client = await Client.findActiveByEmail(profile.email);
    
    if (client) {
      // Cliente existe con email pero sin OAuth - vincular cuenta
      const updateData = {
        authProvider: client.authProvider === 'local' ? provider : 'multiple',
        isEmailVerified: true,
        lastLogin: new Date()
      };
      
      if (provider === 'google') {
        updateData.googleId = profile.id;
      } else if (provider === 'facebook') {
        updateData.facebookId = profile.id;
      }
      
      await client.update(updateData);
      console.log(`✅ Cuenta vinculada con ${provider}: ${client.email}`);
      return client;
    }
    
    // Crear nuevo cliente OAuth
    const clientData = {
      email: profile.email.toLowerCase(),
      firstName: profile.firstName,
      lastName: profile.lastName,
      authProvider: provider,
      isEmailVerified: true,
      profileImage: profile.picture,
      lastLogin: new Date()
    };
    
    if (provider === 'google') {
      clientData.googleId = profile.id;
    } else if (provider === 'facebook') {
      clientData.facebookId = profile.id;
    }
    
    client = await Client.create(clientData);
    console.log(`✅ Nuevo cliente OAuth creado: ${client.email} (${provider})`);
    
    // Crear preferencias por defecto
    const { ClientPreference } = require('../models');
    await ClientPreference.createDefault(client.id);
    
    return client;
    
  } catch (error) {
    console.error(`❌ Error en findOrCreateOAuthClient (${provider}):`, error.message);
    throw new Error('Error procesando autenticación OAuth');
  }
};

/**
 * Generar URL de redirección con tokens
 */
const generateRedirectUrl = (baseUrl, tokens, userInfo = {}) => {
  try {
    const url = new URL(baseUrl);
    
    // Agregar tokens como parámetros de consulta
    url.searchParams.set('access_token', tokens.accessToken);
    url.searchParams.set('refresh_token', tokens.refreshToken);
    url.searchParams.set('expires_in', tokens.accessTokenExpiry);
    
    // Agregar información básica del usuario
    if (userInfo.id) url.searchParams.set('user_id', userInfo.id);
    if (userInfo.email) url.searchParams.set('email', userInfo.email);
    if (userInfo.firstName) url.searchParams.set('first_name', userInfo.firstName);
    
    return url.toString();
    
  } catch (error) {
    console.error('❌ Error generando URL de redirección:', error.message);
    return baseUrl; // Fallback a URL base
  }
};

/**
 * Manejar callback exitoso de OAuth
 */
const handleOAuthSuccess = async (client, clientType = 'web') => {
  try {
    const { generateTokenPair } = require('./jwt');
    
    // Generar tokens para el cliente
    const tokens = generateTokenPair({
      id: client.id,
      email: client.email,
      type: 'client',
      role: null,
      permissions: {}
    });
    
    const userInfo = {
      id: client.id,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName
    };
    
    // Generar URL de redirección según tipo de cliente
    let redirectUrl;
    
    if (clientType === 'mobile') {
      redirectUrl = generateRedirectUrl(OAUTH_CONFIG.redirectUrls.mobile, tokens, userInfo);
    } else {
      redirectUrl = generateRedirectUrl(OAUTH_CONFIG.redirectUrls.success, tokens, userInfo);
    }
    
    console.log(`✅ OAuth exitoso para: ${client.email} (${clientType})`);
    
    return {
      success: true,
      tokens,
      user: userInfo,
      redirectUrl
    };
    
  } catch (error) {
    console.error('❌ Error en handleOAuthSuccess:', error.message);
    throw error;
  }
};

/**
 * Manejar error de OAuth
 */
const handleOAuthError = (error, clientType = 'web') => {
  console.error('❌ Error OAuth:', error.message);
  
  let redirectUrl;
  
  if (clientType === 'mobile') {
    redirectUrl = OAUTH_CONFIG.redirectUrls.mobile + '?error=' + encodeURIComponent(error.message);
  } else {
    redirectUrl = OAUTH_CONFIG.redirectUrls.failure + '?error=' + encodeURIComponent(error.message);
  }
  
  return {
    success: false,
    error: error.message,
    redirectUrl
  };
};

/**
 * Obtener configuración para Passport strategies
 */
const getPassportConfig = () => {
  return {
    google: {
      ...OAUTH_CONFIG.google,
      passReqToCallback: true
    },
    facebook: {
      ...OAUTH_CONFIG.facebook,
      passReqToCallback: true
    }
  };
};

/**
 * Verificar si OAuth está disponible
 */
const isOAuthAvailable = () => {
  const googleAvailable = !!(OAUTH_CONFIG.google.clientID && OAUTH_CONFIG.google.clientSecret);
  const facebookAvailable = !!(OAUTH_CONFIG.facebook.clientID && OAUTH_CONFIG.facebook.clientSecret);
  
  return {
    google: googleAvailable,
    facebook: facebookAvailable,
    any: googleAvailable || facebookAvailable
  };
};

/**
 * Obtener información de providers disponibles
 */
const getAvailableProviders = () => {
  const availability = isOAuthAvailable();
  const providers = [];
  
  if (availability.google) {
    providers.push({
      name: 'google',
      displayName: 'Google',
      authUrl: '/api/auth/google',
      icon: 'google'
    });
  }
  
  if (availability.facebook) {
    providers.push({
      name: 'facebook',
      displayName: 'Facebook',
      authUrl: '/api/auth/facebook',
      icon: 'facebook'
    });
  }
  
  return providers;
};

module.exports = {
  OAUTH_CONFIG,
  validateOAuthConfig,
  processGoogleProfile,
  processFacebookProfile,
  findOrCreateOAuthClient,
  generateRedirectUrl,
  handleOAuthSuccess,
  handleOAuthError,
  getPassportConfig,
  isOAuthAvailable,
  getAvailableProviders
};

/**
 * ESTADO ACTUAL - SUB-FASE 2.2:
 * ✅ Configuración OAuth para Google y Facebook
 * ✅ Procesamiento de perfiles OAuth
 * ✅ Vinculación automática de cuentas existentes
 * ✅ Creación automática de clientes OAuth
 * ✅ Generación de URLs de redirección con tokens
 * ✅ Manejo de errores OAuth
 * ✅ Configuración para Passport strategies
 * ✅ Detección de providers disponibles
 * 
 * PENDIENTE EN SIGUIENTES SUB-FASES:
 * ⏳ Estrategias Passport.js (2.2)
 * ⏳ Middleware de autenticación (2.3)
 * ⏳ Controladores de autenticación (2.4)
 * ⏳ Rutas protegidas (2.5)
 * ⏳ Testing OAuth (2.6)
 */