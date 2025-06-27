// backend/controllers/userController.js
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const userController = {
  getAllUsers: async (req, res) => {
  try {
    // Cambio clave: Eliminar la destructuración del array
    const users = await db.query('SELECT id, nombre, email, rol, fecha_creacion, ultimo_login, activo FROM usuarios');
    
    // Asegurarse de devolver siempre un array
    if (!users) {
      return res.json([]);
    }
    
    // MySQL2 devuelve [rows, fields], necesitamos solo rows
    const userList = Array.isArray(users[0]) ? users[0] : users;
    
    res.json(userList);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ 
      error: 'Error en el servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
},

  
  createUser: async (req, res) => {
    try {
      const { nombre, email, password, rol } = req.body;
      
      // Validar que el rol sea válido
      if (!['administrador', 'docente'].includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }
      
      // Verificar si el email ya existe
      const [existingUsers] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);
      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
      
      // Hash de la contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Crear usuario
      const [result] = await db.query(
        'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
        [nombre, email, hashedPassword, rol]
      );
      
      res.status(201).json({ id: result.insertId, message: 'Usuario creado exitosamente' });
    } catch (error) {
      console.error('Error al crear usuario:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  },
  
  updateUser: async (req, res) => {
    try {
      const userId = req.params.id;
      const { nombre, email, rol, activo } = req.body;
      
      // Verificar si el usuario existe
      const [users] = await db.query('SELECT id FROM usuarios WHERE id = ?', [userId]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      // Actualizar usuario
      await db.query(
        'UPDATE usuarios SET nombre = ?, email = ?, rol = ?, activo = ? WHERE id = ?',
        [nombre, email, rol, activo, userId]
      );
      
      res.json({ message: 'Usuario actualizado exitosamente' });
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  },
  
  deleteUser: async (req, res) => {
    try {
      const userId = req.params.id;
      
      // Verificar si el usuario existe
      const [users] = await db.query('SELECT id FROM usuarios WHERE id = ?', [userId]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      // Eliminar usuario (en realidad lo marcamos como inactivo)
      await db.query('UPDATE usuarios SET activo = FALSE WHERE id = ?', [userId]);
      
      res.json({ message: 'Usuario desactivado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  },
  
  changePassword: async (req, res) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      // Obtener usuario actual
      const [users] = await db.query('SELECT password FROM usuarios WHERE id = ?', [userId]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      // Verificar contraseña actual
      const isMatch = await bcrypt.compare(currentPassword, users[0].password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Contraseña actual incorrecta' });
      }
      
      // Hash de la nueva contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Actualizar contraseña
      await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPassword, userId]);
      
      res.json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }
};

module.exports = userController;