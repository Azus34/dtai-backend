// controllers/calificacionesController.js
const { query } = require('../config/database');

const calificacionesController = {
  // Obtener todas las calificaciones con información relacionada
  getCalificaciones: async (req, res) => {
    try {
      const sql = `
        SELECT c.*, 
               a.nombre AS alumno_nombre,
               a.matricula AS alumno_matricula,
               a.grupo_id,
               d.nombre AS docente_nombre,
               m.nombre AS materia_nombre,
               g.nombre AS grupo_nombre
        FROM calificaciones c
        JOIN alumnos a ON c.alumno_id = a.id
        JOIN materias m ON c.materia_id = m.id
        JOIN docentes d ON c.docente_id = d.id
        JOIN grupos g ON a.grupo_id = g.id
        ORDER BY c.periodo DESC, a.nombre ASC
      `;
      
      const calificaciones = await query(sql);
      
      res.status(200).json({
        success: true,
        data: calificaciones
      });
    } catch (error) {
      console.error('Error al obtener calificaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener calificaciones',
        error: error.message
      });
    }
  },

  // Obtener materias para filtros
  getMaterias: async (req, res) => {
    try {
      const materias = await query('SELECT id, nombre FROM materias ORDER BY nombre');
      res.status(200).json({
        success: true,
        data: materias
      });
    } catch (error) {
      console.error('Error al obtener materias:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener materias',
        error: error.message
      });
    }
  },

  // Obtener docentes para filtros
  getDocentes: async (req, res) => {
    try {
      const docentes = await query('SELECT id, nombre FROM docentes ORDER BY nombre');
      res.status(200).json({
        success: true,
        data: docentes
      });
    } catch (error) {
      console.error('Error al obtener docentes:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener docentes',
        error: error.message
      });
    }
  },

  // Obtener grupos para filtros
  getGrupos: async (req, res) => {
    try {
      const grupos = await query('SELECT id, nombre FROM grupos ORDER BY nombre');
      res.status(200).json({
        success: true,
        data: grupos
      });
    } catch (error) {
      console.error('Error al obtener grupos:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener grupos',
        error: error.message
      });
    }
  }
};

module.exports = calificacionesController;