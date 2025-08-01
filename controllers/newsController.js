const db = require('../config/database');

const newsController = {
  getAllNews: async (req, res) => {
    try {
      const news = await db.query('SELECT id, title, description, date, image_url FROM news');
      res.json(news);
    } catch (error) {
      console.error('[getAllNews] Error:', error);
      res.status(500).json({ error: 'Error al obtener noticias', details: error.message });
    }
  },

  getNewsById: async (req, res) => {
    try {
      const newsId = req.params.id;
      const result = await db.query('SELECT id, title, description, date, image_url FROM news WHERE id = ?', [newsId]);
      let news;
      if (Array.isArray(result)) {
        news = result.length > 0 ? result[0] : null;
      } else if (result) {
        news = result;
      } else {
        news = null;
      }
      if (!news) {
        console.warn(`[getNewsById] Noticia no encontrada. ID: ${newsId}`);
        return res.status(404).json({ error: 'Noticia no encontrada', id: newsId });
      }
      res.json(news);
    } catch (error) {
      console.error(`[getNewsById] Error para ID ${req.params.id}:`, error);
      res.status(500).json({ error: 'Error al obtener noticia por ID', details: error.message });
    }
  },

  createNews: async (req, res) => {
    try {
      const { title, description, date, image_url } = req.body;
      if (!title || !description || !date) {
        return res.status(400).json({ error: 'Faltan campos obligatorios', fields: { title, description, date } });
      }
      const result = await db.query(
        'INSERT INTO news (title, description, date, image_url) VALUES (?, ?, ?, ?)',
        [title, description, date, image_url]
      );
      const insertId = Array.isArray(result) ? result[0].insertId : result.insertId;
      res.status(201).json({ id: insertId, message: 'Noticia creada exitosamente' });
    } catch (error) {
      console.error('[createNews] Error:', error);
      res.status(500).json({ error: 'Error al crear noticia', details: error.message });
    }
  },

  updateNews: async (req, res) => {
    try {
      const newsId = req.params.id;
      const { title, description, date, image_url } = req.body;
      const result = await db.query('SELECT id FROM news WHERE id = ?', [newsId]);
      const news = Array.isArray(result) ? result[0] : result;
      if (!news || (Array.isArray(news) && news.length === 0)) {
        console.warn(`[updateNews] Noticia no encontrada. ID: ${newsId}`);
        return res.status(404).json({ error: 'Noticia no encontrada', id: newsId });
      }
      await db.query(
        'UPDATE news SET title = ?, description = ?, date = ?, image_url = ? WHERE id = ?',
        [title, description, date, image_url, newsId]
      );
      res.json({ message: 'Noticia actualizada exitosamente' });
    } catch (error) {
      console.error(`[updateNews] Error para ID ${req.params.id}:`, error);
      res.status(500).json({ error: 'Error al actualizar noticia', details: error.message });
    }
  },

  deleteNews: async (req, res) => {
    try {
      const newsId = req.params.id;
      const result = await db.query('SELECT id FROM news WHERE id = ?', [newsId]);
      const news = Array.isArray(result) ? result[0] : result;
      if (!news || (Array.isArray(news) && news.length === 0)) {
        console.warn(`[deleteNews] Noticia no encontrada. ID: ${newsId}`);
        return res.status(404).json({ error: 'Noticia no encontrada', id: newsId });
      }
      await db.query('DELETE FROM news WHERE id = ?', [newsId]);
      res.json({ message: 'Noticia eliminada exitosamente' });
    } catch (error) {
      console.error(`[deleteNews] Error para ID ${req.params.id}:`, error);
      res.status(500).json({ error: 'Error al eliminar noticia', details: error.message });
    }
  },

  // Registrar vista pública de noticia
  registerView: async (req, res) => {
    try {
      const { newsId } = req.body;
      if (!newsId) {
        return res.status(400).json({ error: 'newsId requerido', body: req.body });
      }
      await db.query('INSERT INTO news_views (news_id) VALUES (?)', [newsId]);
      res.json({ success: true });
    } catch (error) {
      console.error('[registerView] Error:', error);
      res.status(500).json({ error: 'Error al registrar vista de noticia', details: error.message });
    }
  },

  // Obtener estadísticas de vistas por noticia
  getViewsStats: async (req, res) => {
    try {
      const stats = await db.query(`
        SELECT n.id, n.title, COUNT(nv.id) AS views
        FROM news n
        LEFT JOIN news_views nv ON n.id = nv.news_id
        GROUP BY n.id, n.title
        ORDER BY views DESC
      `);
      res.json(Array.isArray(stats) ? stats : []);
    } catch (error) {
      console.error('[getViewsStats] Error:', error);
      res.status(500).json({ error: 'Error al obtener estadísticas de vistas de noticias', details: error.message });
    }
  },

  // Obtener vistas crudas de noticias
  getViewsRaw: async (req, res) => {
    try {
      const views = await db.query('SELECT news_id, viewed_at FROM news_views');
      res.json(Array.isArray(views) ? views : []);
    } catch (error) {
      console.error('[getViewsRaw] Error:', error);
      res.status(500).json([]);
    }
  },
};

module.exports = newsController;