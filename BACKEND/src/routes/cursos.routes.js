const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db');

router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const offset = (page - 1) * limit;
    const { busqueda, ordenar, categoria, precio_min, precio_max } = req.query;

    const db = await getDb();

    const whereClauses = ['habilitado = 1'];
    const params = [];

    if (busqueda && busqueda.trim()) {
      whereClauses.push('(titulo LIKE ? OR descripcion LIKE ?)');
      const term = '%' + busqueda.trim() + '%';
      params.push(term, term);
    }

    if (categoria && categoria !== '') {
      whereClauses.push('categoria_id = ?');
      params.push(parseInt(categoria));
    }

    if (precio_min && precio_min !== '') {
      whereClauses.push('precio >= ?');
      params.push(parseFloat(precio_min));
    }

    if (precio_max && precio_max !== '') {
      whereClauses.push('precio <= ?');
      params.push(parseFloat(precio_max));
    }

    const whereSQL = whereClauses.join(' AND ');

    let orderSQL = 'id DESC';
    if (ordenar === 'fecha') {
      orderSQL = 'created_at DESC, id DESC';
    } else if (ordenar === 'precio_asc') {
      orderSQL = 'precio ASC, id DESC';
    } else if (ordenar === 'precio_desc') {
      orderSQL = 'precio DESC, id DESC';
    }

    const countSql = `SELECT COUNT(*) FROM cursos WHERE ${whereSQL}`;
    const countResult = db.exec(countSql, params);
    const total = countResult[0]?.values[0][0] || 0;
    const totalPaginas = Math.ceil(total / limit);

    const queryParams = [...params, limit, offset];
    const cursosSql = `
      SELECT id, titulo, descripcion, precio, imagen_url
      FROM cursos
      WHERE ${whereSQL}
      ORDER BY ${orderSQL}
      LIMIT ? OFFSET ?
    `;
    const cursosResult = db.exec(cursosSql, queryParams);

    const cursos = (cursosResult[0]?.values || []).map(row => ({
      id: row[0],
      titulo: row[1],
      descripcion: row[2],
      precio: row[3],
      imagen_url: row[4]
    }));

    res.json({
      cursos,
      pagina: page,
      total,
      totalPaginas
    });
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET admin — todos los cursos incluyendo deshabilitados
router.get('/admin/todos', async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(`
      SELECT c.id, c.titulo, c.descripcion, c.precio, c.imagen_url, c.video_url,
             c.duracion, c.habilitado, c.categoria_id, cat.nombre as categoria
      FROM cursos c
      LEFT JOIN categorias cat ON cat.id = c.categoria_id
      ORDER BY c.id DESC
    `);

    const cursos = (result[0]?.values || []).map(row => ({
      id: row[0],
      titulo: row[1],
      descripcion: row[2],
      precio: row[3],
      imagen_url: row[4],
      video_url: row[5],
      duracion: row[6],
      habilitado: row[7],
      categoria_id: row[8],
      categoria: row[9] || 'General'
    }));

    res.json(cursos);
  } catch (error) {
    console.error('Error al obtener cursos admin:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const result = db.exec(`
      SELECT c.id, c.titulo, c.descripcion, c.precio, c.imagen_url, c.video_url, c.duracion, c.categoria_id, cat.nombre as categoria
      FROM cursos c
      LEFT JOIN categorias cat ON cat.id = c.categoria_id
      WHERE c.id = ? AND c.habilitado = 1
    `, [parseInt(id)]);

    if (!result[0]?.values || result[0].values.length === 0) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }

    const row = result[0].values[0];
    const curso = {
      id: row[0],
      titulo: row[1],
      descripcion: row[2],
      precio: row[3],
      imagen_url: row[4],
      video_url: row[5],
      duracion: row[6],
      categoria_id: row[7],
      categoria: row[8] || 'General'
    };

    res.json(curso);
  } catch (error) {
    console.error('Error al obtener curso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST — crear curso
router.post('/', async (req, res) => {
  try {
    const { titulo, descripcion, precio, video_url, imagen_url, categoria_id, duracion } = req.body;

    if (!titulo || !titulo.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' });
    if (!descripcion || !descripcion.trim()) return res.status(400).json({ message: 'La descripción es obligatoria' });
    if (precio === undefined || precio === null || precio === '') return res.status(400).json({ message: 'El precio es obligatorio' });
    if (isNaN(parseFloat(precio)) || parseFloat(precio) < 0) return res.status(400).json({ message: 'El precio debe ser un número válido' });
    if (!video_url || !video_url.trim()) return res.status(400).json({ message: 'El enlace del curso es obligatorio' });

    const db = await getDb();
    db.run(
      `INSERT INTO cursos (titulo, descripcion, precio, video_url, imagen_url, categoria_id, duracion, habilitado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        titulo.trim(),
        descripcion.trim(),
        parseFloat(precio),
        video_url.trim(),
        imagen_url ? imagen_url.trim() : null,
        categoria_id ? parseInt(categoria_id) : null,
        duracion ? duracion.trim() : null
      ]
    );

    const idResult = db.exec('SELECT last_insert_rowid()');
    const newId = idResult[0]?.values[0][0];
    saveDb(db);

    res.status(201).json({ id: newId, message: 'Curso creado exitosamente' });
  } catch (error) {
    console.error('Error al crear curso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT — editar curso
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, precio, video_url, imagen_url, categoria_id, duracion } = req.body;

    if (!titulo || !titulo.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' });
    if (!descripcion || !descripcion.trim()) return res.status(400).json({ message: 'La descripción es obligatoria' });
    if (precio === undefined || precio === null || precio === '') return res.status(400).json({ message: 'El precio es obligatorio' });
    if (isNaN(parseFloat(precio)) || parseFloat(precio) < 0) return res.status(400).json({ message: 'El precio debe ser un número válido' });
    if (!video_url || !video_url.trim()) return res.status(400).json({ message: 'El enlace del curso es obligatorio' });

    const db = await getDb();

    const existing = db.exec('SELECT id FROM cursos WHERE id = ?', [parseInt(id)]);
    if (!existing[0]?.values?.length) return res.status(404).json({ message: 'Curso no encontrado' });

    db.run(
      `UPDATE cursos SET titulo = ?, descripcion = ?, precio = ?, video_url = ?,
       imagen_url = ?, categoria_id = ?, duracion = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        titulo.trim(),
        descripcion.trim(),
        parseFloat(precio),
        video_url.trim(),
        imagen_url ? imagen_url.trim() : null,
        categoria_id ? parseInt(categoria_id) : null,
        duracion ? duracion.trim() : null,
        parseInt(id)
      ]
    );
    saveDb(db);

    res.json({ message: 'Curso actualizado exitosamente' });
  } catch (error) {
    console.error('Error al editar curso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// DELETE — eliminar curso permanentemente
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const existing = db.exec('SELECT id FROM cursos WHERE id = ?', [parseInt(id)]);
    if (!existing[0]?.values?.length) return res.status(404).json({ message: 'Curso no encontrado' });

    db.run('DELETE FROM cursos WHERE id = ?', [parseInt(id)]);
    saveDb(db);

    res.json({ message: 'Curso eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar curso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PATCH — toggle habilitado
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const existing = db.exec('SELECT id, habilitado FROM cursos WHERE id = ?', [parseInt(id)]);
    if (!existing[0]?.values?.length) return res.status(404).json({ message: 'Curso no encontrado' });

    const actual = existing[0].values[0][1];
    const nuevo = actual === 1 ? 0 : 1;

    db.run('UPDATE cursos SET habilitado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [nuevo, parseInt(id)]);
    saveDb(db);

    res.json({ habilitado: nuevo, message: nuevo === 1 ? 'Curso habilitado' : 'Curso deshabilitado' });
  } catch (error) {
    console.error('Error al cambiar estado del curso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

module.exports = router;