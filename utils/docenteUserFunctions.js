// Importaciones necesarias (asegúrate de que estén todas incluidas en tu controlador)
const db = require('../config/database');
const bcrypt = require('bcryptjs');

// Añade estas funciones a tu controlador de docentes existente
const docenteUserFunctions = {
  // Obtener un docente con su información de usuario
  getDocenteConUsuario: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID de docente es requerido'
        });
      }
      
      const result = await db.query('CALL sp_get_docente_usuario(?)', [id]);
      const docente = result[0][0];
      
      if (!docente) {
        return res.status(404).json({
          success: false,
          message: 'Docente no encontrado'
        });
      }
      
      return res.json({
        success: true,
        data: docente,
        tieneUsuario: docente.usuario_id !== null
      });
      
    } catch (error) {
      console.error('Error obteniendo docente con usuario:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  // Crear usuario para un docente existente
  createUsuarioDocente: async (req, res) => {
    try {
      const { docente_id, password } = req.body;
      
      if (!docente_id || !password) {
        return res.status(400).json({
          success: false,
          message: 'ID de docente y contraseña son requeridos'
        });
      }
      
      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Crear usuario para el docente
      const result = await db.query(
        'CALL sp_create_usuario_docente(?, ?)',
        [docente_id, hashedPassword]
      );
      
      const response = result[0][0];
      
      if (response.usuario_id === 0) {
        return res.status(400).json({
          success: false,
          message: response.mensaje
        });
      }
      
      return res.status(201).json({
        success: true,
        message: response.mensaje,
        usuario_id: response.usuario_id
      });
      
    } catch (error) {
      console.error('Error creando usuario para docente:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  // Listar todos los docentes con información de usuario
  listDocentesConUsuarios: async (req, res) => {
    try {
      const docentes = await db.query(`
        SELECT 
          d.*,
          u.id AS usuario_id,
          u.activo,
          u.ultimo_login
        FROM docentes d
        LEFT JOIN usuarios u ON d.id = u.docente_id
      `);
      
      return res.json({
        success: true,
        data: docentes
      });
      
    } catch (error) {
      console.error('Error listando docentes con usuarios:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  // Actualizar contraseña de usuario docente
  resetPasswordUsuarioDocente: async (req, res) => {
    try {
      const { docente_id } = req.params;
      const { password } = req.body;
      
      if (!docente_id || !password) {
        return res.status(400).json({
          success: false,
          message: 'ID de docente y contraseña son requeridos'
        });
      }
      
      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Buscar usuario asociado al docente
      const usuarios = await db.query(
        'SELECT id FROM usuarios WHERE docente_id = ?',
        [docente_id]
      );
      
      if (!usuarios || usuarios.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No existe usuario para este docente'
        });
      }
      
      // Actualizar contraseña
      await db.query(
        'UPDATE usuarios SET password = ? WHERE docente_id = ?',
        [hashedPassword, docente_id]
      );
      
      return res.json({
        success: true,
        message: 'Contraseña actualizada correctamente'
      });
      
    } catch (error) {
      console.error('Error actualizando contraseña:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

// Exporta estas funciones para usarlas en tu controlador de docentes
module.exports = docenteUserFunctions;
