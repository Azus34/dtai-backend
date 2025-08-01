const db = require('../config/database');

const programController = {
  getAllPrograms: async (req, res) => {
    try {
      const programs = await db.query('SELECT id, name, description, level, duration, image_url FROM programs');
      res.json(programs);
    } catch (error) {
      console.error('Error al obtener programas:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  getProgramById: async (req, res) => {
  try {
    const programId = req.params.id;
    const result = await db.query('SELECT id, name, description, level, duration, image_url FROM programs WHERE id = ?', [programId]);
    if (result.length === 0) {
      return res.status(404).json({ error: 'Programa no encontrado' });
    }
    res.json(result[0]);
  } catch (error) {
    console.error('Error al obtener programa por ID:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
},

  createProgram: async (req, res) => {
    try {
      const { name, description, level, duration, image_url } = req.body;
      if (!name || !description || !level || !duration) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }
      if (!['básico', 'intermedio', 'avanzado'].includes(level)) {
        return res.status(400).json({ error: 'Nivel inválido' });
      }
      const result = await db.query(
        'INSERT INTO programs (name, description, level, duration, image_url) VALUES (?, ?, ?, ?, ?)',
        [name, description, level, duration, image_url]
      );
      const insertId = Array.isArray(result) ? result[0].insertId : result.insertId;
      res.status(201).json({ id: insertId, message: 'Programa creado exitosamente' });
    } catch (error) {
      console.error('Error al crear programa:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  updateProgram: async (req, res) => {
    try {
      const programId = req.params.id;
      const { name, description, level, duration, image_url } = req.body;
      if (!['básico', 'intermedio', 'avanzado'].includes(level)) {
        return res.status(400).json({ error: 'Nivel inválido' });
      }
      const result = await db.query('SELECT id FROM programs WHERE id = ?', [programId]);
      const programs = Array.isArray(result) ? result[0] : result;
      if (programs.length === 0) {
        return res.status(404).json({ error: 'Programa no encontrado' });
      }
      await db.query(
        'UPDATE programs SET name = ?, description = ?, level = ?, duration = ?, image_url = ? WHERE id = ?',
        [name, description, level, duration, image_url, programId]
      );
      res.json({ message: 'Programa actualizado exitosamente' });
    } catch (error) {
      console.error('Error al actualizar programa:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  deleteProgram: async (req, res) => {
    try {
      const programId = req.params.id;
      const result = await db.query('SELECT id FROM programs WHERE id = ?', [programId]);
      const programs = Array.isArray(result) ? result[0] : result;
      if (programs.length === 0) {
        return res.status(404).json({ error: 'Programa no encontrado' });
      }
      await db.query('DELETE FROM programs WHERE id = ?', [programId]);
      res.json({ message: 'Programa eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar programa:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }
};

module.exports = programController;