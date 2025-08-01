const db = require('../config/database');

const eventController = {
  getAllEvents: async (req, res) => {
  try {
    const events = await db.query('SELECT id, title, description, date, image_url FROM events');
    console.log('Eventos procesados:', events);
    res.json(events);
  } catch (error) {
    console.error('Error al obtener eventos:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
  },

  getEventById: async (req, res) => {
    try {
      const eventId = req.params.id;
      const result = await db.query('SELECT id, title, description, date, image_url FROM events WHERE id = ?', [eventId]);
      let event;
      if (Array.isArray(result)) {
        event = result.length > 0 ? result[0] : null;
      } else if (result) {
        event = result;
      } else {
        event = null;
      }
      if (!event) {
        console.warn(`[getEventById] Evento no encontrado. ID: ${eventId}`);
        return res.status(404).json({ error: 'Evento no encontrado', id: eventId });
      }
      res.json(event);
    } catch (error) {
      console.error(`[getEventById] Error para ID ${req.params.id}:`, error);
      res.status(500).json({ error: 'Error al obtener evento por ID', details: error.message });
    }
  },

  createEvent: async (req, res) => {
    try {
      const { title, description, date, image_url } = req.body;
      if (!title || !description || !date) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }
      const result = await db.query(
        'INSERT INTO events (title, description, date, image_url) VALUES (?, ?, ?, ?)',
        [title, description, date, image_url]
      );
      const insertId = Array.isArray(result) ? result[0].insertId : result.insertId;
      res.status(201).json({ id: insertId, message: 'Evento creado exitosamente' });
    } catch (error) {
      console.error('Error al crear evento:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  updateEvent: async (req, res) => {
    try {
      const eventId = req.params.id;
      const { title, description, date, image_url } = req.body;
      const result = await db.query('SELECT id FROM events WHERE id = ?', [eventId]);
      const events = Array.isArray(result) ? result[0] : result;
      if (events.length === 0) {
        return res.status(404).json({ error: 'Evento no encontrado' });
      }
      await db.query(
        'UPDATE events SET title = ?, description = ?, date = ?, image_url = ? WHERE id = ?',
        [title, description, date, image_url, eventId]
      );
      res.json({ message: 'Evento actualizado exitosamente' });
    } catch (error) {
      console.error('Error al actualizar evento:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  deleteEvent: async (req, res) => {
    try {
      const eventId = req.params.id;
      const result = await db.query('SELECT id FROM events WHERE id = ?', [eventId]);
      const events = Array.isArray(result) ? result[0] : result;
      if (events.length === 0) {
        return res.status(404).json({ error: 'Evento no encontrado' });
      }
      await db.query('DELETE FROM events WHERE id = ?', [eventId]);
      res.json({ message: 'Evento eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar evento:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  // Registrar vista pública de evento
  registerView: async (req, res) => {
    try {
      const { eventId } = req.body;
      if (!eventId) {
        return res.status(400).json({ error: 'eventId requerido' });
      }
      await db.query('INSERT INTO event_views (event_id) VALUES (?)', [eventId]);
      res.json({ success: true });
    } catch (error) {
      console.error('Error al registrar vista de evento:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  },

  // Obtener estadísticas de vistas por evento
  getViewsStats: async (req, res) => {
    try {
      const stats = await db.query(`
        SELECT e.id, e.title, COUNT(ev.id) AS views
        FROM events e
        LEFT JOIN event_views ev ON e.id = ev.event_id
        GROUP BY e.id, e.title
        ORDER BY views DESC
      `);
      res.json(Array.isArray(stats) ? stats : []);
    } catch (error) {
      console.error('Error al obtener estadísticas de vistas de eventos:', error);
      res.status(500).json([]);
    }
  },

  // Obtener vistas crudas de eventos
  getViewsRaw: async (req, res) => {
    try {
      const views = await db.query('SELECT event_id, viewed_at FROM event_views');
      res.json(Array.isArray(views) ? views : []);
    } catch (error) {
      console.error('[getViewsRaw] Error:', error);
      res.status(500).json([]);
    }
  },
};

module.exports = eventController;