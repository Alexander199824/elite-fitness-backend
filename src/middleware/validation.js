/**
 * MIDDLEWARE DE VALIDACIÓN - ELITE FITNESS CLUB
 * 
 * Soy el middleware encargado de validar datos de entrada
 * Mi responsabilidad es asegurar que todos los datos recibidos
 * cumplan con los formatos, tipos y reglas de negocio establecidas
 * 
 * Características implementadas:
 * - Validación de esquemas con Joi
 * - Validaciones específicas para autenticación
 * - Sanitización de datos de entrada
 * - Validación de archivos y uploads
 * - Mensajes de error personalizados en español
 * - Validaciones de seguridad avanzadas
 */

const Joi = require('joi');
const { body, param, query, validationResult } = require('express-validator');

/**
 * Configuración personalizada de Joi en español
 */
const joiOptions = {
  errors: {
    language: 'es'
  },
  abortEarly: false, // Mostrar todos los errores, no solo el primero
  allowUnknown: false, // No permitir campos no definidos
  stripUnknown: true // Remover campos no definidos automáticamente
};

// Mensajes personalizados en español
const customMessages = {
  'string.email': 'Debe ser un email válido',
  'string.min': 'Debe tener al menos {#limit} caracteres',
  'string.max': 'No puede tener más de {#limit} caracteres',
  'string.pattern.base': 'Formato no válido',
  'any.required': 'Este campo es obligatorio',
  'number.min': 'Debe ser mayor o igual a {#limit}',
  'number.max': 'Debe ser menor o igual a {#limit}',
  'array.min': 'Debe tener al menos {#limit} elementos',
  'date.base': 'Debe ser una fecha válida'
};

/**
 * Esquemas de validación comunes
 */
const schemas = {
  // Validación de login
  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .max(255)
      .lowercase()
      .messages(customMessages),
    password: Joi.string()
      .min(8)
      .max(255)
      .required()
      .messages(customMessages),
    remember: Joi.boolean()
      .default(false)
  }),
  
  // Validación de registro de cliente
  clientRegister: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .max(255)
      .lowercase()
      .messages(customMessages),
    password: Joi.string()
      .min(8)
      .max(255)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'La contraseña debe contener al menos: 1 minúscula, 1 mayúscula, 1 número y 1 carácter especial'
      }),
    firstName: Joi.string()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'Solo se permiten letras y espacios'
      }),
    lastName: Joi.string()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'Solo se permiten letras y espacios'
      }),
    phone: Joi.string()
      .pattern(/^[+]?[\d\s\-\(\)]+$/)
      .min(8)
      .max(20)
      .optional()
      .messages({
        ...customMessages,
        'string.pattern.base': 'Formato de teléfono no válido'
      }),
    dateOfBirth: Joi.date()
      .max('now')
      .min('1900-01-01')
      .optional()
      .messages(customMessages),
    gender: Joi.string()
      .valid('male', 'female', 'other', 'prefer_not_to_say')
      .optional()
  }),
  
  // Validación de actualización de perfil
  profileUpdate: Joi.object({
    firstName: Joi.string()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/)
      .optional()
      .messages({
        ...customMessages,
        'string.pattern.base': 'Solo se permiten letras y espacios'
      }),
    lastName: Joi.string()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ\s]+$/)
      .optional()
      .messages({
        ...customMessages,
        'string.pattern.base': 'Solo se permiten letras y espacios'
      }),
    phone: Joi.string()
      .pattern(/^[+]?[\d\s\-\(\)]+$/)
      .min(8)
      .max(20)
      .optional()
      .allow('')
      .messages({
        ...customMessages,
        'string.pattern.base': 'Formato de teléfono no válido'
      }),
    dateOfBirth: Joi.date()
      .max('now')
      .min('1900-01-01')
      .optional()
      .messages(customMessages),
    gender: Joi.string()
      .valid('male', 'female', 'other', 'prefer_not_to_say')
      .optional(),
    emergencyContactName: Joi.string()
      .max(200)
      .optional()
      .allow(''),
    emergencyContactPhone: Joi.string()
      .pattern(/^[+]?[\d\s\-\(\)]+$/)
      .max(20)
      .optional()
      .allow('')
  }),
  
  // Validación de cambio de contraseña
  passwordChange: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages(customMessages),
    newPassword: Joi.string()
      .min(8)
      .max(255)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        ...customMessages,
        'string.pattern.base': 'La nueva contraseña debe contener al menos: 1 minúscula, 1 mayúscula, 1 número y 1 carácter especial'
      }),
    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        ...customMessages,
        'any.only': 'Las contraseñas no coinciden'
      })
  }),
  
  // Validación de preferencias de notificación
  preferences: Joi.object({
    emailNotifications: Joi.boolean().optional(),
    smsNotifications: Joi.boolean().optional(),
    pushNotifications: Joi.boolean().optional(),
    whatsappNotifications: Joi.boolean().optional(),
    reminderFrequency: Joi.string()
      .valid('daily', 'every_2_days', 'weekly', 'custom')
      .optional(),
    notificationLanguage: Joi.string()
      .valid('es', 'en')
      .optional(),
    quietHoursStart: Joi.string()
      .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .optional()
      .messages({
        ...customMessages,
        'string.pattern.base': 'Formato de hora no válido (HH:MM)'
      }),
    quietHoursEnd: Joi.string()
      .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .optional()
      .messages({
        ...customMessages,
        'string.pattern.base': 'Formato de hora no válido (HH:MM)'
      })
  })
};

/**
 * Middleware genérico para validar con Joi
 */
const validateSchema = (schema, property = 'body') => {
  return (req, res, next) => {
    const data = req[property];
    
    const { error, value } = schema.validate(data, joiOptions);
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      return res.status(400).json({
        error: 'Datos de entrada no válidos',
        message: 'Verifica que todos los campos tengan el formato correcto',
        validationErrors: errors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Reemplazar datos originales con datos validados y sanitizados
    req[property] = value;
    next();
  };
};

/**
 * Validaciones específicas usando express-validator
 */
const validateEmail = () => [
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email demasiado largo')
];

const validatePassword = (fieldName = 'password') => [
  body(fieldName)
    .isLength({ min: 8, max: 255 })
    .withMessage('La contraseña debe tener entre 8 y 255 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('La contraseña debe contener al menos: 1 minúscula, 1 mayúscula, 1 número y 1 carácter especial')
];

const validateUUID = (paramName = 'id') => [
  param(paramName)
    .isUUID()
    .withMessage('ID no válido')
];

/**
 * Middleware para manejar errores de express-validator
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      error: 'Errores de validación',
      message: 'Corrige los errores indicados',
      validationErrors: formattedErrors,
      code: 'VALIDATION_ERROR'
    });
  }
  
  next();
};

/**
 * Sanitización de datos de entrada
 */
const sanitizeInput = (req, res, next) => {
  // Función para sanitizar strings
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    return str
      .trim()
      .replace(/\s+/g, ' ') // Múltiples espacios a uno solo
      .replace(/[<>]/g, ''); // Remover < y > para prevenir XSS básico
  };
  
  // Función recursiva para sanitizar objetos
  const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') {
      return typeof obj === 'string' ? sanitizeString(obj) : obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  };
  
  // Sanitizar body, query y params
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  
  next();
};

/**
 * Validación de archivos de imagen
 */
const validateImageUpload = (fieldName = 'image') => {
  return (req, res, next) => {
    const file = req.file;
    
    if (!file) {
      return next(); // Imagen opcional
    }
    
    // Verificar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        error: 'Tipo de archivo no válido',
        message: 'Solo se permiten imágenes JPG, PNG y WebP',
        allowedTypes: allowedTypes,
        code: 'INVALID_FILE_TYPE'
      });
    }
    
    // Verificar tamaño
    const maxSize = parseInt(process.env.MAX_IMAGE_SIZE) || 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return res.status(400).json({
        error: 'Archivo demasiado grande',
        message: `El archivo no puede ser mayor a ${Math.round(maxSize / 1024 / 1024)}MB`,
        maxSize: maxSize,
        currentSize: file.size,
        code: 'FILE_TOO_LARGE'
      });
    }
    
    // Verificar dimensiones básicas si es necesario
    // (esto requeriría una librería como sharp para leer metadatos)
    
    next();
  };
};

/**
 * Validación de rate limiting personalizado
 */
const validateRateLimit = (windowMs, max, message) => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const key = req.ip + (req.user?.id || '');
    const now = Date.now();
    
    // Limpiar intentos antiguos
    if (attempts.has(key)) {
      const userAttempts = attempts.get(key);
      const validAttempts = userAttempts.filter(timestamp => now - timestamp < windowMs);
      attempts.set(key, validAttempts);
    }
    
    const userAttempts = attempts.get(key) || [];
    
    if (userAttempts.length >= max) {
      return res.status(429).json({
        error: 'Demasiados intentos',
        message: message || 'Has excedido el límite de intentos',
        retryAfter: Math.ceil(windowMs / 1000),
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
    
    // Registrar intento
    userAttempts.push(now);
    attempts.set(key, userAttempts);
    
    next();
  };
};

module.exports = {
  // Esquemas Joi
  schemas,
  validateSchema,
  
  // Express-validator helpers
  validateEmail,
  validatePassword,
  validateUUID,
  handleValidationErrors,
  
  // Sanitización
  sanitizeInput,
  
  // Validaciones específicas
  validateImageUpload,
  validateRateLimit,
  
  // Validaciones predefinidas
  validateLogin: validateSchema(schemas.login),
  validateClientRegister: validateSchema(schemas.clientRegister),
  validateProfileUpdate: validateSchema(schemas.profileUpdate),
  validatePasswordChange: validateSchema(schemas.passwordChange),
  validatePreferences: validateSchema(schemas.preferences)
};

/**
 * ESTADO ACTUAL - SUB-FASE 2.2:
 * ✅ Validación de esquemas con Joi personalizado
 * ✅ Validaciones específicas para autenticación
 * ✅ Sanitización automática de datos de entrada
 * ✅ Validación de archivos de imagen
 * ✅ Mensajes de error personalizados en español
 * ✅ Rate limiting personalizado por endpoint
 * ✅ Validaciones de seguridad avanzadas
 * ✅ Soporte para express-validator
 * ✅ Esquemas predefinidos para casos comunes
 * 
 * LISTO PARA SUB-FASE 2.3:
 * ⏭️ Controladores de autenticación
 * ⏭️ Rutas protegidas con middleware
 * ⏭️ Testing completo de autenticación
 * ⏭️ Integración con frontend
 */