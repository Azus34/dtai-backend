// backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const bcrypt = require('bcryptjs');

const authController = {
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Validación de campos requeridos
      if (!email || !password) {
        return res.status(400).json({
          error: 'Email y contraseña son requeridos'
        });
      }

      // Buscar usuario en la base de datos
    const emailNormalized = email.trim().toLowerCase();

    const users = await db.query(
    'SELECT * FROM usuarios WHERE LOWER(TRIM(email)) = ?',
    [emailNormalized]
    );

    console.log('Resultado users:', users);

    if (!users || (Array.isArray(users) && users.length === 0)) {
    return res.status(401).json({
        error: 'Credenciales inválidas. Revisa tu email y contraseña.'
    });
    }

    const user = Array.isArray(users) ? users[0] : users;

    

    //if (password !== user.password) {
    // return res.status(401).json({
    //   error: 'Credenciales inválidas. Revisa tu email y contraseña.'
    // });
    //}
      console.log('Password BD:', `"${user.password}"`);
      console.log('Password ingresadas con hash:', `"${bcrypt.hashSync(password)}"`);
    // comparar contraseña con bycrypt
    const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          error: 'Credenciales inválidas. Revisa tu email y contraseña.'
        });
      }


      // Actualizar último login
      await db.query(
        'UPDATE usuarios SET ultimo_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      // Crear token JWT
      const token = jwt.sign(
        {
          id: user.id,
          rol: user.rol
        },
        process.env.JWT_SECRET || 'fallback_secret_key',
        { expiresIn: '8h' }
      );

      // Respuesta exitosa
      return res.json({
        token,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          rol: user.rol
        }
      });

    } catch (error) {
      console.error('Error en login:', error);
      return res.status(500).json({
        error: 'Error en el servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  logout: async (req, res) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');

      if (!token) {
        return res.status(400).json({
          error: 'Token no proporcionado'
        });
      }

      // Verificar y decodificar token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');

      // Guardar token en lista de tokens inválidos
      await db.query(
        'INSERT INTO tokens_invalidos (token, expiracion) VALUES (?, FROM_UNIXTIME(?))',
        [token, decoded.exp]
      );

      return res.json({
        message: 'Sesión cerrada exitosamente'
      });

    } catch (error) {
      console.error('Error en logout:', error);
      return res.status(500).json({
        error: 'Error al cerrar sesión'
      });
    }
  },

  verifyToken: async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Acceso no autorizado: Token no proporcionado' 
      });
    }
    
    // Verificar si el token está en la lista de inválidos (versión corregida)
    const [invalidTokens] = await db.query(
      'SELECT * FROM tokens_invalidos WHERE token = ?', 
      [token]
    ) || []; // Asegura que siempre haya un array
    
    // Verificación más robusta
    if (invalidTokens && invalidTokens.length > 0) {
      return res.status(401).json({ 
        error: 'Token inválido' 
      });
    }
    
    // Verificar token JWT
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback_secret_key'
    );
    
    // Adjuntar usuario decodificado a la solicitud
    req.user = decoded;
    
    // Continuar con el siguiente middleware
    next();
    
  } catch (error) {
    console.error('Error en verifyToken:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado' 
      });
    }
    
    return res.status(401).json({ 
      error: 'Token inválido' 
    });
  }
},

  checkRole: (requiredRole) => {
    return (req, res, next) => {
      try {
        if (!req.user || req.user.rol !== requiredRole) {
          return res.status(403).json({
            error: 'Acceso prohibido: Permisos insuficientes'
          });
        }
        next();
      } catch (error) {
        console.error('Error en checkRole:', error);
        return res.status(500).json({
          error: 'Error al verificar roles'
        });
      }
    };
  }
};

module.exports = authController;
