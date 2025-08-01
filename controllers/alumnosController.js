const { query } = require('../config/database');

const alumnosController = {
  getAlumnos: async (req, res) => {
    try {
      const sql = `
        SELECT id, nombre, email, grupo_id, estatus, fecha_ingreso, matricula, promedio_general
        FROM alumnos
      `;
      const alumnos = await query(sql);
      res.status(200).json(alumnos); // <-- Solo el array
    } catch (error) {
      console.error('Error fetching alumnos:', error);
      res.status(500).json([]);
    }
  },
};

module.exports = alumnosController;
