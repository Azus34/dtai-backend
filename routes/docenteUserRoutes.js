// Rutas adicionales para la integración de docentes y usuarios
// Puedes integrar estas rutas en tu archivo de rutas principal

// Importar el controlador de docentes-usuarios
const docenteUserHandler = require('../utils/docenteUserHandler');

// Middleware de autenticación (asumiendo que ya lo tienes definido)
const { authenticateToken, isAdmin } = require('../middlewares/authMiddleware');

module.exports = function(router) {
  // Verificar si un docente ya tiene cuenta de usuario
  router.get('/docentes/check-usuario/:email', authenticateToken, isAdmin, docenteUserHandler.checkDocenteUsuario);
  
  // Crear usuario para un docente existente
  router.post('/docentes/crear-usuario', authenticateToken, isAdmin, docenteUserHandler.createUserForDocente);
  
  // Obtener datos completos de un docente por su ID de usuario
  router.get('/docentes/by-usuario/:id', authenticateToken, docenteUserHandler.getDocenteByUsuarioId);
  
  // Listar todos los docentes con información de usuario
  router.get('/docentes/with-users', authenticateToken, isAdmin, docenteUserHandler.listDocentesWithUserInfo);
  
  return router;
};
