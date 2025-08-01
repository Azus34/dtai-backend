const db = require('../config/database');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const reportesController = {
  // Obtener todos los reportes (puedes agregar filtro por docente si es necesario en tu modelo)
  getReportesByDocente: async (req, res) => {
    try {
      const docenteId = req.user.id;
      const reportes = await db.query(
        `SELECT r.*, a.nombre AS alumno_nombre
         FROM reportes r
         JOIN alumnos a ON r.alumno_id = a.id
         ORDER BY r.fecha DESC`
        // docenteId no se usa por ahora, puedes filtrarlo si tu modelo lo requiere
      );
      res.json(reportes);
    } catch (error) {
      console.error('Error al obtener reportes:', error);
      res.status(500).json({ error: 'Error al obtener reportes' });
    }
  },

  // Crear nuevo reporte
  crearReporte: async (req, res) => {
    try {
      const docenteId = req.user.id;
      const { alumno_id, observacion, tipo } = req.body;

      // Validación mínima
      if (!alumno_id || !observacion || !tipo) {
        return res.status(400).json({ error: 'Faltan datos obligatorios' });
      }

      const result = await db.query(
        'INSERT INTO reportes (alumno_id, fecha, observacion, tipo) VALUES (?, NOW(), ?, ?)',
        [alumno_id, observacion, tipo]
      );

      res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
      console.error('Error al crear reporte:', error);
      res.status(500).json({ error: 'Error al crear reporte' });
    }
  },

  // Exportar reportes a Excel
  exportarExcel: async (req, res) => {
    try {
      const docenteId = req.user.id;
      const reportes = await db.query(
        `SELECT r.*, a.nombre AS alumno_nombre
         FROM reportes r
         JOIN alumnos a ON r.alumno_id = a.id
         ORDER BY r.fecha DESC`
      );

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Reportes');

      sheet.columns = [
        { header: 'Alumno', key: 'alumno_nombre' },
        { header: 'Fecha', key: 'fecha' },
        { header: 'Tipo', key: 'tipo' },
        { header: 'Observación', key: 'observacion' }
      ];

      sheet.addRows(reportes);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=reportes.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Error exportando excel:', error);
      res.status(500).json({ error: 'Error al exportar Excel' });
    }
  }
};

module.exports = reportesController;
