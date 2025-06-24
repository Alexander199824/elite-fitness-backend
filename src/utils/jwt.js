/**
 * UTILIDADES JWT - ELITE FITNESS CLUB
 * 
 * Soy el archivo encargado de manejar toda la lógica de JWT tokens
 * Mi responsabilidad es generar, verificar y gestionar tokens seguros
 * para autenticación de usuarios y clientes
 * 
 * Características implementadas:
 * - Generación de Access Tokens
 * - Generación de Refresh Tokens
 * - Verificación y validación de tokens
 * - Blacklist de tokens revocados
 * - Configuración de expiración
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Set para almacenar tokens revocados (en producción usar Redis)
const revokedTokens = new Set();

// Configuración de JWT desde variables de entorno
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'elite_fitness_super_secret_key_2024',
  accessTokenExpiry: process.env.JWT_EXPIRES_IN || '24h',
  refreshTokenExpiry: '7d', // Refresh tokens duran una semana
  issuer: 'elite-fitness-club',
  audience: ['web', 'mobile']
};

/**
 * Generar Access Token JWT
 */
const generateAccessToken = (payload, options = {}) => {
  try {
    const tokenPayload = {
      id: payload.id,
      email: payload.email,
      type: payload.type || 'client', // 'client' o 'user'
      role: payload.role || null,
      permissions: payload.permissions || {},
      iat: Math.floor(Date.now() / 1000)
    };
    
    const tokenOptions = {
      expiresIn: options.expiresIn || JWT_CONFIG.accessTokenExpiry,
      issuer: JWT_CONFIG.issuer,
      audience: options.audience || JWT_CONFIG.audience,
      subject: payload.id,
      jwtid: crypto.randomUUID(), // ID único del token
      ...options
    };
    
    const token = jwt.sign(tokenPayload, JWT_CONFIG.secret, tokenOptions);
    
    console.log(`✅ Access token generado para: ${payload.email} (${payload.type})`);
    
    return {
      token,
      expiresIn: tokenOptions.expiresIn,
      type: 'Bearer'
    };
    
  } catch (error) {
    console.error('❌ Error generando access token:', error.message);
    throw new Error('Error generando token de acceso');
  }
};

/**
 * Generar Refresh Token
 */
const generateRefreshToken = (userId, userType = 'client') => {
  try {
    const payload = {
      userId,
      userType,
      tokenType: 'refresh',
      iat: Math.floor(Date.now() / 1000)
    };
    
    const options = {
      expiresIn: JWT_CONFIG.refreshTokenExpiry,
      issuer: JWT_CONFIG.issuer,
      subject: userId,
      jwtid: crypto.randomUUID()
    };
    
    const token = jwt.sign(payload, JWT_CONFIG.secret, options);
    
    console.log(`✅ Refresh token generado para usuario: ${userId}`);
    
    return {
      token,
      expiresIn: JWT_CONFIG.refreshTokenExpiry
    };
    
  } catch (error) {
    console.error('❌ Error generando refresh token:', error.message);
    throw new Error('Error generando token de renovación');
  }
};

/**
 * Verificar y decodificar token JWT
 */
const verifyToken = (token, options = {}) => {
  try {
    // Verificar si el token está en la blacklist
    if (revokedTokens.has(token)) {
      throw new Error('Token revocado');
    }
    
    const verifyOptions = {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      ...options
    };
    
    const decoded = jwt.verify(token, JWT_CONFIG.secret, verifyOptions);
    
    // Verificar que no haya expirado (doble verificación)
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      throw new Error('Token expirado');
    }
    
    return decoded;
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token no válido aún');
    } else {
      throw new Error(`Error verificando token: ${error.message}`);
    }
  }
};

/**
 * Revocar token (agregarlo a blacklist)
 */
const revokeToken = (token) => {
  try {
    // En producción, esto debería almacenarse en Redis o base de datos
    revokedTokens.add(token);
    console.log('✅ Token revocado exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error revocando token:', error.message);
    return false;
  }
};

/**
 * Renovar Access Token usando Refresh Token
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    // Verificar refresh token
    const decoded = verifyToken(refreshToken);
    
    if (decoded.tokenType !== 'refresh') {
      throw new Error('Token de renovación inválido');
    }
    
    // Buscar usuario en base de datos
    const { User, Client } = require('../models');
    let user = null;
    
    if (decoded.userType === 'user') {
      user = await User.findByPk(decoded.userId);
    } else {
      user = await Client.findByPk(decoded.userId);
    }
    
    if (!user || !user.isActive) {
      throw new Error('Usuario no encontrado o inactivo');
    }
    
    // Generar nuevo access token
    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      type: decoded.userType,
      role: user.role,
      permissions: user.permissions
    });
    
    console.log(`✅ Access token renovado para: ${user.email}`);
    
    return newAccessToken;
    
  } catch (error) {
    console.error('❌ Error renovando token:', error.message);
    throw new Error('Error renovando token de acceso');
  }
};

/**
 * Generar par de tokens (access + refresh)
 */
const generateTokenPair = (userPayload) => {
  try {
    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload.id, userPayload.type);
    
    return {
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      accessTokenExpiry: accessToken.expiresIn,
      refreshTokenExpiry: refreshToken.expiresIn,
      tokenType: 'Bearer'
    };
    
  } catch (error) {
    console.error('❌ Error generando par de tokens:', error.message);
    throw new Error('Error generando tokens de autenticación');
  }
};

/**
 * Extraer token del header Authorization
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
};

/**
 * Validar estructura del token (sin verificar firma)
 */
const decodeTokenWithoutVerification = (token) => {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    return null;
  }
};

/**
 * Obtener información del token sin verificar
 */
const getTokenInfo = (token) => {
  const decoded = decodeTokenWithoutVerification(token);
  
  if (!decoded) {
    return null;
  }
  
  const payload = decoded.payload;
  
  return {
    userId: payload.id,
    email: payload.email,
    userType: payload.type,
    role: payload.role,
    issuedAt: new Date(payload.iat * 1000),
    expiresAt: new Date(payload.exp * 1000),
    jwtId: payload.jti,
    issuer: payload.iss,
    audience: payload.aud
  };
};

/**
 * Verificar si un token está próximo a expirar
 */
const isTokenExpiringSoon = (token, minutesThreshold = 30) => {
  const tokenInfo = getTokenInfo(token);
  
  if (!tokenInfo) {
    return true; // Si no podemos decodificar, asumimos que está malo
  }
  
  const now = new Date();
  const timeUntilExpiry = tokenInfo.expiresAt.getTime() - now.getTime();
  const minutesUntilExpiry = timeUntilExpiry / (1000 * 60);
  
  return minutesUntilExpiry <= minutesThreshold;
};

/**
 * Limpiar tokens revocados expirados (housekeeping)
 */
const cleanupRevokedTokens = () => {
  // En producción, esto sería un job programado que limpia Redis/BD
  const now = Math.floor(Date.now() / 1000);
  let cleaned = 0;
  
  for (const token of revokedTokens) {
    const tokenInfo = getTokenInfo(token);
    if (tokenInfo && tokenInfo.expiresAt.getTime() / 1000 < now) {
      revokedTokens.delete(token);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 ${cleaned} tokens revocados expirados limpiados`);
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyToken,
  revokeToken,
  refreshAccessToken,
  extractTokenFromHeader,
  decodeTokenWithoutVerification,
  getTokenInfo,
  isTokenExpiringSoon,
  cleanupRevokedTokens,
  JWT_CONFIG
};

/**
 * ESTADO ACTUAL - SUB-FASE 2.2:
 * ✅ Generación de Access Tokens con payload completo
 * ✅ Generación de Refresh Tokens para renovación
 * ✅ Verificación robusta con manejo de errores
 * ✅ Sistema de blacklist para tokens revocados
 * ✅ Renovación automática de tokens
 * ✅ Utilidades para manejo de headers
 * ✅ Información de tokens sin verificación
 * ✅ Detección de expiración próxima
 * 
 * PENDIENTE EN SIGUIENTES SUB-FASES:
 * ⏳ Integración con middleware de autenticación (2.3)
 * ⏳ Configuración de OAuth providers (2.2)
 * ⏳ Controladores de autenticación (2.4)
 * ⏳ Testing de JWT utilities (2.6)
 */