// backend/routes/apiRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const reportesController = require('../controllers/reportesController');
const eventController = require('../controllers/eventController');
const newsController = require('../controllers/newsController');
const programController = require('../controllers/programController');
const alumnosController = require('../controllers/alumnosController');
const docenteController = require('../controllers/docenteController');
const calificacionesController = require('../controllers/calificacionesController');

// Rutas públicas
router.post('/login', authController.login);
router.post('/logout', authController.verifyToken, authController.logout);

// Rutas protegidas
router.get('/users', authController.verifyToken, authController.checkRole('administrador'), userController.getAllUsers);
router.post('/users', authController.verifyToken, authController.checkRole('administrador'), userController.createUser);
router.put('/users/:id', authController.verifyToken, authController.checkRole('administrador'), userController.updateUser);
router.delete('/users/:id', authController.verifyToken, authController.checkRole('administrador'), userController.deleteUser);
router.post('/change-password', authController.verifyToken, userController.changePassword);

// Rutas públicas para registrar vistas y obtener estadísticas de actividad
router.post('/news/view', newsController.registerView);
router.get('/news/views-stats', newsController.getViewsStats);
router.get('/news/views-raw', newsController.getViewsRaw);

router.post('/events/view', eventController.registerView);
router.get('/events/views-stats', eventController.getViewsStats);
router.get('/events/views-raw', eventController.getViewsRaw);

// Rutas protegidas - Eventos
router.get('/events', eventController.getAllEvents); 
router.get('/events/:id', authController.verifyToken, authController.checkRole('administrador'), eventController.getEventById);
router.post('/events', authController.verifyToken, authController.checkRole('administrador'), eventController.createEvent);
router.put('/events/:id', authController.verifyToken, authController.checkRole('administrador'), eventController.updateEvent);
router.delete('/events/:id', authController.verifyToken, authController.checkRole('administrador'), eventController.deleteEvent);


// Rutas protegidas - Noticias
router.get('/news', newsController.getAllNews);
router.get('/news/:id', authController.verifyToken, authController.checkRole('administrador'), newsController.getNewsById);
router.post('/news', authController.verifyToken, authController.checkRole('administrador'), newsController.createNews);
router.put('/news/:id', authController.verifyToken, authController.checkRole('administrador'), newsController.updateNews);
router.delete('/news/:id', authController.verifyToken, authController.checkRole('administrador'), newsController.deleteNews);

// Rutas protegidas - Programas
router.get('/programs', programController.getAllPrograms);
router.get('/programs/:id', authController.verifyToken, authController.checkRole('administrador'), programController.getProgramById);
router.post('/programs', authController.verifyToken, authController.checkRole('administrador'), programController.createProgram);
router.put('/programs/:id', authController.verifyToken, authController.checkRole('administrador'), programController.updateProgram);
router.delete('/programs/:id', authController.verifyToken, authController.checkRole('administrador'), programController.deleteProgram);

router.get('/reportes', authController.verifyToken, authController.checkRole('docente'), reportesController.getReportesByDocente);
router.post('/reportes', authController.verifyToken, authController.checkRole('docente'), reportesController.crearReporte);
router.get('/reportes/export/excel', authController.verifyToken, authController.checkRole('docente'), reportesController.exportarExcel);
router.get('/alumnos', authController.verifyToken, alumnosController.getAlumnos);

// Rutas protegidas - Docente
router.get('/docente/alumnos', authController.verifyToken, docenteController.getAlumnos);
router.get('/docente/reportes', authController.verifyToken, authController.checkRole('docente'), docenteController.getReportes);
router.post('/docente/reportes', authController.verifyToken, authController.checkRole('docente'), docenteController.crearReporte);

router.get('/calificaciones', authController.verifyToken, authController.checkRole('administrador'), calificacionesController.getCalificaciones);
router.get('/materias', authController.verifyToken, authController.checkRole('administrador'), calificacionesController.getMaterias);
router.get('/docentes', authController.verifyToken, authController.checkRole('administrador'), calificacionesController.getDocentes);
router.get('/grupos', authController.verifyToken, authController.checkRole('administrador'), calificacionesController.getGrupos);

router.post('/docente/sugerencia-ia', authController.verifyToken, authController.checkRole('docente'), docenteController.getSugerenciaIA);

// Rutas para gestión de usuarios de docentes
router.get('/docentes-usuarios', authController.verifyToken, authController.checkRole('administrador'), docenteController.listDocentesConUsuarios);
router.get('/docentes-usuarios/:id', authController.verifyToken, authController.checkRole('administrador'), docenteController.getDocenteConUsuario);
router.post('/docentes-usuarios', authController.verifyToken, authController.checkRole('administrador'), docenteController.createUsuarioDocente);
router.post('/docentes-usuarios/:docente_id/reset-password', authController.verifyToken, authController.checkRole('administrador'), docenteController.resetPasswordUsuarioDocente);

// Nuevas rutas para análisis cuatrimestral
router.get('/docente/cuatrimestres', authController.verifyToken, authController.checkRole('docente'), docenteController.getCuatrimestres);
router.get('/docente/materias', authController.verifyToken, authController.checkRole('docente'), docenteController.getMaterias);
router.get('/docente/unidades/:materiaId', authController.verifyToken, authController.checkRole('docente'), docenteController.getUnidadesByMateria);
router.post('/docente/analisis-cuatrimestral', authController.verifyToken, authController.checkRole('docente'), docenteController.getAnalisisCuatrimestral);

// Ruta de verificación de token
router.get('/verify', authController.verifyToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;