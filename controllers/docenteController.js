const { query } = require('../config/database');
const axios = require('axios');
const docenteUserFunctions = require('../utils/docenteUserFunctions');

// Incorporar las funciones de gestión de usuarios de docentes
// al controlador principal
const {
  getDocenteConUsuario,
  createUsuarioDocente,
  listDocentesConUsuarios,
  resetPasswordUsuarioDocente
} = docenteUserFunctions;

async function getGeminiSuggestion(params) {
  let prompt;

  // Si recibimos un prompt directo, lo usamos
  if (params.prompt) {
    prompt = params.prompt;
  } else {
    // Si recibimos un alumno, tipo y gravedad, generamos el prompt para sugerencia individual
    const { alumno, tipo, gravedad, calificaciones } = params;
    let detalleCalif = '';
    if (Array.isArray(calificaciones) && calificaciones.length > 0) {
      // Solo mostrar materias donde el promedio es menor a 70
      const califList = calificaciones
        .filter(c => parseFloat(c.calificacion) < 70)
        .map(c => `${c.materia}: ${c.calificacion} (${c.estatus})`)
        .join('; ');
      detalleCalif = califList
        ? `Calificaciones en riesgo (<70): ${califList}. `
        : '';
    }
    
    prompt = `
Eres un asistente académico. Sugiere una observación para el siguiente reporte docente:
Alumno: ${alumno.nombre} (${alumno.matricula}), Grupo: ${alumno.grupo}, Promedio: ${alumno.promedio_general}, Estatus: ${alumno.estatus}.
${detalleCalif}
Solo considera en riesgo las materias con calificación menor a 70 y omite las demás.
Tipo de reporte: ${tipo}. Gravedad: ${gravedad}.
Observación sugerida:
    `;
  }
  
  const apiKey = 'AIzaSyAbaG4BmQDez2bcNZt-XTAJvjCqEVO7dOE';
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;

  try {
    const response = await axios.post(url, {
      contents: [{ parts: [{ text: prompt }] }]
    });
    return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (err) {
    console.error('Error Gemini:', err.response?.data || err.message);
    return '';
  }
}

const docenteController = {
  // Funciones para gestionar la relación docentes-usuarios
  getDocenteConUsuario,
  createUsuarioDocente,
  listDocentesConUsuarios,
  resetPasswordUsuarioDocente,
  
  // Obtener alumnos asignados al docente
  getSugerenciaIA: async (req, res) => {
    try {
      const { alumno_id, tipo, gravedad } = req.body;
      if (!alumno_id || !tipo || !gravedad) {
        return res.status(400).json({ success: false, message: 'Faltan datos' });
      }
      // Busca datos del alumno
      const alumnos = await query(
        `SELECT a.id, a.nombre, a.matricula, g.nombre AS grupo, a.promedio_general, a.estatus
         FROM alumnos a
         JOIN grupos g ON a.grupo_id = g.id
         WHERE a.id = ?`,
        [alumno_id]
      );
      if (!alumnos.length) {
        return res.status(404).json({ success: false, message: 'Alumno no encontrado' });
      }
      const alumno = alumnos[0];

      // Si es grave, obtener calificaciones recientes del alumno
      let calificaciones = [];
      if (gravedad === 'grave') {
        calificaciones = await query(
          `SELECT m.nombre AS materia, c.calificacion, c.estatus
           FROM calificaciones c
           JOIN materias m ON c.materia_id = m.id
           WHERE c.alumno_id = ?
           ORDER BY c.periodo DESC, m.nombre ASC
           LIMIT 5`,
          [alumno_id]
        );
      }

      const sugerencia = await getGeminiSuggestion({ alumno, tipo, gravedad, calificaciones });
      res.json({ success: true, sugerencia });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error IA', error: error.message });
    }
  },

  getAlumnos: async (req, res) => {
    try {
      const docenteId = req.user.id;
      
      // Primero obtenemos las materias que imparte el docente
      const materias = await query(
        `SELECT materia_id FROM docente_materia WHERE docente_id = ?`,
        [docenteId]
      );
      
      if (materias.length === 0) {
        return res.status(200).json([]);
      }
      
      // Obtenemos los grupos donde imparte esas materias
      const grupos = await query(
        `SELECT DISTINCT grupo_id FROM docente_materia 
         WHERE docente_id = ? AND materia_id IN (?)`,
        [docenteId, materias.map(m => m.materia_id)]
      );
      
      if (grupos.length === 0) {
        return res.status(200).json([]);
      }
      
      // Finalmente obtenemos los alumnos de esos grupos
      const alumnos = await query(
        `SELECT a.id, a.nombre, a.email, a.matricula, 
                g.nombre AS grupo, a.estatus, a.promedio_general
         FROM alumnos a
         JOIN grupos g ON a.grupo_id = g.id
         WHERE a.grupo_id IN (?)
         ORDER BY a.nombre`,
        [grupos.map(g => g.grupo_id)]
      );
      
      res.status(200).json(alumnos);
    } catch (error) {
      console.error('Error al obtener alumnos del docente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los alumnos',
        error: error.message,
      });
    }
  },

  // Obtener reportes generados por el docente
  getReportes: async (req, res) => {
    try {
      const docenteId = req.user.id;
      
      const reportes = await query(
        `SELECT r.id, r.fecha, r.observacion, r.tipo, r.gravedad,
                a.id AS alumno_id, a.nombre AS alumno_nombre
         FROM reportes r
         JOIN alumnos a ON r.alumno_id = a.id
         WHERE r.docente_id = ?
         ORDER BY r.fecha DESC
         LIMIT 50`,
        [docenteId]
      );
      
      res.status(200).json(reportes);
    } catch (error) {
      console.error('Error al obtener reportes del docente:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los reportes',
        error: error.message,
      });
    }
  },

  // Crear reporte como docente
  crearReporte: async (req, res) => {
    try {
      const docenteId = req.user.id;
      const { alumno_id, observacion, tipo, gravedad } = req.body;

      if (!alumno_id || !observacion || !tipo || !gravedad) {
        return res.status(400).json({
          success: false,
          message: 'Faltan datos obligatorios'
        });
      }

      // Verificar que el alumno pertenece a un grupo que el docente enseña
      const alumnoValido = await query(
        `SELECT a.id FROM alumnos a
         JOIN grupos g ON a.grupo_id = g.id
         JOIN docente_materia dm ON g.id = dm.grupo_id
         WHERE a.id = ? AND dm.docente_id = ?`,
        [alumno_id, docenteId]
      );

      if (alumnoValido.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permiso para reportar a este alumno'
        });
      }

      const result = await query(
        `INSERT INTO reportes 
         (alumno_id, docente_id, fecha, observacion, tipo, gravedad)
         VALUES (?, ?, NOW(), ?, ?, ?)`,
        [alumno_id, docenteId, observacion, tipo, gravedad]
      );

      const nuevoReporte = await query(
        `SELECT r.id, r.fecha, r.observacion, r.tipo, r.gravedad,
                a.id AS alumno_id, a.nombre AS alumno_nombre
         FROM reportes r
         JOIN alumnos a ON r.alumno_id = a.id
         WHERE r.id = ?`,
        [result.insertId]
      );

      res.status(201).json(nuevoReporte[0]);
    } catch (error) {
      console.error('Error al crear reporte:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear el reporte',
        error: error.message,
      });
    }
  },

  // Obtener cuatrimestres disponibles para el docente
  getCuatrimestres: async (req, res) => {
    try {
      const docenteId = req.user.id;
      
      console.log('ID del docente solicitando cuatrimestres:', docenteId);
      
      // Primero verificamos qué materias tiene asignadas el docente
      const materiasAsignadas = await query(
        `SELECT materia_id, grupo_id FROM docente_materia WHERE docente_id = ?`, 
        [docenteId]
      );
      console.log('Materias asignadas al docente:', materiasAsignadas);
      
      // Verificamos las relaciones materia-cuatrimestre
      if (materiasAsignadas.length > 0) {
        const materiasIds = materiasAsignadas.map(m => m.materia_id);
        const relacionesCuatrimestre = await query(
          `SELECT materia_id, cuatrimestre_id FROM materia_cuatrimestre 
           WHERE materia_id IN (?)`,
          [materiasIds]
        );
        console.log('Relaciones materia-cuatrimestre:', relacionesCuatrimestre);
      }
      
      // Verificamos las calificaciones
      const calificaciones = await query(
        `SELECT COUNT(*) AS total FROM calificaciones WHERE docente_id = ?`,
        [docenteId]
      );
      console.log('Total de calificaciones del docente:', calificaciones);
      
      // Obtenemos solo cuatrimestres que realmente tienen materias asignadas al docente
      // y que tienen alumnos con calificaciones
      const cuatrimestres = await query(
        `SELECT DISTINCT c.id, c.nombre, c.numero
         FROM cuatrimestres c
         JOIN materia_cuatrimestre mc ON c.id = mc.cuatrimestre_id
         JOIN docente_materia dm ON mc.materia_id = dm.materia_id
         JOIN calificaciones cal ON dm.materia_id = cal.materia_id AND dm.docente_id = cal.docente_id
         WHERE dm.docente_id = ? AND cal.docente_id = ?
         ORDER BY c.numero`,
        [docenteId, docenteId]
      );

      console.log('Cuatrimestres obtenidos:', cuatrimestres);
      console.log('Consulta SQL para debugging:', 
        `SELECT DISTINCT c.id, c.nombre, c.numero
         FROM cuatrimestres c
         JOIN materia_cuatrimestre mc ON c.id = mc.cuatrimestre_id
         JOIN docente_materia dm ON mc.materia_id = dm.materia_id
         JOIN calificaciones cal ON dm.materia_id = cal.materia_id AND dm.docente_id = cal.docente_id
         WHERE dm.docente_id = ${docenteId} AND cal.docente_id = ${docenteId}
         ORDER BY c.numero`);
      
      // Si no hay datos, devolver un array vacío en lugar de error
      res.status(200).json(cuatrimestres || []);
    } catch (error) {
      console.error('Error al obtener cuatrimestres:', error);
      // En caso de error, devolver array vacío para que el frontend no muestre nada
      res.status(200).json([]);
    }
  },

  // Obtener materias que imparte el docente
  getMaterias: async (req, res) => {
    try {
      const docenteId = req.user.id;
      const { cuatrimestreId } = req.query;
      
      console.log('ID del docente solicitando materias:', docenteId);
      console.log('ID del cuatrimestre seleccionado:', cuatrimestreId);
      
      // Si se proporciona un cuatrimestre, filtrar las materias por ese cuatrimestre
      let query_str = `
        SELECT DISTINCT m.id, m.nombre
        FROM materias m
        JOIN docente_materia dm ON m.id = dm.materia_id
        JOIN calificaciones cal ON m.id = cal.materia_id AND dm.docente_id = cal.docente_id
        WHERE dm.docente_id = ? 
      `;
      
      const params = [docenteId];
      
      // Si se proporciona un cuatrimestre, añadir la condición de filtrado
      if (cuatrimestreId) {
        query_str += `
          AND m.id IN (
            SELECT mc.materia_id 
            FROM materia_cuatrimestre mc 
            WHERE mc.cuatrimestre_id = ?
          )
        `;
        params.push(cuatrimestreId);
      }
      
      query_str += " ORDER BY m.nombre";

      console.log('Consulta SQL para materias:', query_str);
      console.log('Parámetros de la consulta:', params);
      
      const materias = await query(query_str, params);
      
      console.log('Materias obtenidas:', materias);
      
      // Si no hay datos, devolver un array vacío en lugar de error
      res.status(200).json(materias || []);
    } catch (error) {
      console.error('Error al obtener materias:', error);
      // En caso de error, devolver array vacío para que el frontend no muestre nada
      res.status(200).json([]);
    }
  },

  // Obtener unidades para una materia específica
  getUnidadesByMateria: async (req, res) => {
    try {
      const { materiaId } = req.params;
      const docenteId = req.user.id;
      
      console.log('ID del docente solicitando unidades:', docenteId);
      console.log('ID de la materia seleccionada:', materiaId);
      
      // Verificar que el docente imparte esta materia y que hay calificaciones
      const tienePermiso = await query(
        `SELECT COUNT(*) as count FROM docente_materia dm
         JOIN calificaciones c ON dm.materia_id = c.materia_id AND dm.docente_id = c.docente_id
         WHERE dm.docente_id = ? AND dm.materia_id = ?`,
        [docenteId, materiaId]
      );
      
      console.log('Verificación de permiso:', tienePermiso);
      
      if (!tienePermiso[0] || tienePermiso[0].count === 0) {
        console.log('El docente no tiene permiso o no hay calificaciones para esta materia');
        return res.status(200).json([]);  // Devolver array vacío en lugar de error
      }
      
      // Obtener solo unidades que tienen calificaciones asociadas
      const unidades = await query(
        `SELECT DISTINCT u.id, u.nombre, u.numero, u.horas
         FROM unidades u
         JOIN calificaciones c ON u.id = c.unidad_id
         WHERE u.materia_id = ? AND c.docente_id = ?
         ORDER BY u.numero`,
        [materiaId, docenteId]
      );
      
      console.log('Unidades obtenidas:', unidades);
      console.log('Consulta SQL para unidades:', 
        `SELECT DISTINCT u.id, u.nombre, u.numero, u.horas
         FROM unidades u
         JOIN calificaciones c ON u.id = c.unidad_id
         WHERE u.materia_id = ${materiaId} AND c.docente_id = ${docenteId}
         ORDER BY u.numero`);
      
      res.status(200).json(unidades || []);
    } catch (error) {
      console.error('Error al obtener unidades:', error);
      res.status(200).json([]);  // Devolver array vacío en lugar de error
    }
  },

  // Análisis cuatrimestral con IA
  getAnalisisCuatrimestral: async (req, res) => {
    try {
      const { cuatrimestre_id, materia_id, unidad_id } = req.body;
      const docenteId = req.user.id;
      
      if (!cuatrimestre_id || !materia_id) {
        return res.status(400).json({
          success: false,
          message: 'Faltan datos obligatorios'
        });
      }
      
      // Verificar que el docente imparte esta materia y que hay calificaciones
      const tienePermiso = await query(
        `SELECT COUNT(*) as count FROM docente_materia dm
         JOIN calificaciones c ON dm.materia_id = c.materia_id AND dm.docente_id = c.docente_id
         WHERE dm.docente_id = ? AND dm.materia_id = ?`,
        [docenteId, materia_id]
      );
      
      if (!tienePermiso[0] || tienePermiso[0].count === 0) {
        return res.status(403).json({
          success: false,
          message: 'No hay datos de calificaciones para esta materia'
        });
      }
      
      // Obtener información del cuatrimestre y materia
      const cuatrimestreInfo = await query(
        'SELECT nombre FROM cuatrimestres WHERE id = ?',
        [cuatrimestre_id]
      );
      
      const materiaInfo = await query(
        'SELECT nombre FROM materias WHERE id = ?',
        [materia_id]
      );
      
      // Verificar que se encontraron el cuatrimestre y la materia
      if (!cuatrimestreInfo.length || !materiaInfo.length) {
        return res.status(404).json({
          success: false,
          message: 'Cuatrimestre o materia no encontrados'
        });
      }
      
      let unidadInfo = { nombre: 'Todas las unidades' };
      if (unidad_id) {
        const unidadResult = await query(
          'SELECT nombre FROM unidades WHERE id = ?',
          [unidad_id]
        );
        if (unidadResult.length) {
          unidadInfo = unidadResult[0];
        }
      }
      
      // Obtener calificaciones para el análisis
      let calificacionesQuery = `
        SELECT c.alumno_id, c.calificacion, c.estatus, 
               a.nombre AS alumno_nombre, a.matricula,
               u.nombre AS unidad_nombre, u.numero AS unidad_numero
        FROM calificaciones c
        JOIN alumnos a ON c.alumno_id = a.id
        JOIN materias m ON c.materia_id = m.id
        JOIN unidades u ON c.unidad_id = u.id
        JOIN materia_cuatrimestre mc ON m.id = mc.materia_id
        WHERE c.materia_id = ?
        AND mc.cuatrimestre_id = ?
        AND c.docente_id = ?`;
      
      const queryParams = [materia_id, cuatrimestre_id, docenteId];
      
      // Si se especificó una unidad, filtrar por ella
      if (unidad_id) {
        calificacionesQuery += ' AND c.unidad_id = ?';
        queryParams.push(unidad_id);
      }
      
      calificacionesQuery += ' ORDER BY a.nombre, u.numero';
      
      const calificaciones = await query(calificacionesQuery, queryParams);
      
      // Calcular estadísticas
      const totalAlumnos = new Set(calificaciones.map(c => c.alumno_id)).size;
      const promedioCalificaciones = calificaciones.length > 0 
        ? calificaciones.reduce((sum, c) => sum + parseFloat(c.calificacion), 0) / calificaciones.length 
        : 0;
      
      const aprobados = new Set(
        calificaciones
          .filter(c => c.estatus === 'aprobado')
          .map(c => c.alumno_id)
      ).size;
      
      const reprobados = totalAlumnos - aprobados;
      const porcentajeAprobacion = totalAlumnos > 0 ? Math.round((aprobados / totalAlumnos) * 100) : 0;
      
      // Calcular distribución de calificaciones
      const rangos = ['90-100', '80-89', '70-79', '60-69', '0-59'];
      const distribucion = rangos.map(rango => {
        const [min, max] = rango.split('-').map(Number);
        const cantidad = calificaciones.filter(c => {
          const cal = parseFloat(c.calificacion);
          return cal >= min && cal <= max;
        }).length;
        
        return { rango, cantidad };
      });

      // Generar sugerencia IA basada en el análisis
      let prompt = `
        Eres un asistente académico especializado en análisis educativo. Por favor, analiza los siguientes datos y genera una evaluación detallada del rendimiento académico:
        
        Materia: ${materiaInfo[0].nombre}
        Cuatrimestre: ${cuatrimestreInfo[0].nombre}
        ${unidad_id ? `Unidad: ${unidadInfo.nombre}` : 'Análisis de todas las unidades'}
        
        Estadísticas:
        - Total de alumnos: ${totalAlumnos}
        - Promedio general: ${promedioCalificaciones.toFixed(2)}
        - Alumnos aprobados: ${aprobados} (${porcentajeAprobacion}%)
        - Alumnos reprobados: ${reprobados} (${100 - porcentajeAprobacion}%)
        
        Distribución de calificaciones:
        ${distribucion.map(d => `- ${d.rango}: ${d.cantidad} alumnos`).join('\n')}
        
        Detalle de unidades:
        ${calificaciones.length > 0 ? 
          Array.from(new Set(calificaciones.map(c => c.unidad_nombre))).map(unidad => {
            const calificacionesUnidad = calificaciones.filter(c => c.unidad_nombre === unidad);
            const promedioUnidad = calificacionesUnidad.reduce((sum, c) => sum + parseFloat(c.calificacion), 0) / calificacionesUnidad.length;
            return `- ${unidad}: Promedio ${promedioUnidad.toFixed(2)}`;
          }).join('\n')
          : 'No hay datos disponibles para unidades'
        }
        
        ${calificaciones.length === 0 ? 'NOTA: No hay datos de calificaciones disponibles para este análisis. Por favor, proporciona recomendaciones generales para la enseñanza de esta materia y sugerencias para mejorar el rendimiento académico.' : ''}
        
        Con base en estos datos, proporciona:
        1. Un análisis de los resultados académicos
        2. Identificación de fortalezas y áreas de mejora
        3. Recomendaciones específicas para mejorar el rendimiento académico
        4. Sugerencias de estrategias didácticas adaptadas a estos resultados
      `;
      
      const sugerencia = await getGeminiSuggestion({ prompt });
      
      // Estructura de respuesta
      const analisis = {
        cuatrimestre: cuatrimestreInfo[0].nombre,
        materia: materiaInfo[0].nombre,
        unidad: unidadInfo.nombre,
        estadisticas: {
          promedio: parseFloat(promedioCalificaciones.toFixed(2)),
          aprobados,
          reprobados,
          totalAlumnos,
          porcentajeAprobacion
        },
        distribucion,
        sugerencia
      };
      
      res.status(200).json(analisis);
    } catch (error) {
      console.error('Error al generar análisis cuatrimestral:', error);
      res.status(500).json({
        success: false,
        message: 'Error al generar el análisis',
        error: error.message,
      });
    }
  }

  // Obtener sugerencia de IA para el docente
};

module.exports = docenteController;