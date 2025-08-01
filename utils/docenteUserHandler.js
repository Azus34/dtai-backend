// Extensión para el docenteController para trabajar con la nueva relación
// Este archivo contiene funciones adicionales que puedes integrar a tu docenteController existente

const docenteUserHandler = {
  // Verificar si un docente ya tiene cuenta de usuario
  checkDocenteUsuario: async (req, res) => {
    try {
      const { email } = req.params;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email es requerido'
        });
      }
      
      const result = await db.query('CALL sp_check_docente_usuario(?)', [email]);
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
      console.error('Error verificando docente-usuario:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },
  
  // Crear usuario para un docente existente
  createUserForDocente: async (req, res) => {
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
        'CALL sp_create_user_from_docente(?, ?)',
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
  
  // Obtener datos completos de un docente por su ID de usuario
  getDocenteByUsuarioId: async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID de usuario es requerido'
        });
      }
      
      const result = await db.query('CALL sp_get_docente_by_usuario_id(?)', [id]);
      const docente = result[0][0];
      
      if (!docente) {
        return res.status(404).json({
          success: false,
          message: 'Docente no encontrado para este usuario'
        });
      }
      
      return res.json({
        success: true,
        data: docente
      });
      
    } catch (error) {
      console.error('Error obteniendo docente por usuario_id:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  // Listar todos los docentes con información de usuario
  listDocentesWithUserInfo: async (req, res) => {
    try {
      const docentes = await db.query('SELECT * FROM v_docentes_usuarios');
      
      return res.json({
        success: true,
        data: docentes
      });
      
    } catch (error) {
      console.error('Error listando docentes con info de usuario:', error);
      return res.status(500).json({
        success: false,
        message: 'Error en el servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

// Exportamos las funciones para integrarlas en el controlador principal
module.exports = docenteUserHandler;
