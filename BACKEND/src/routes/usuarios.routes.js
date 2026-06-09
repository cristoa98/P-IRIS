const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db');
const { requireRole } = require('../middlewares/auth.middleware');

router.get('/', requireRole(['admin']), async (req, res) => {
  try {
    const db = await getDb();
    const stmt = db.prepare(`
      SELECT u.id, u.nombre, u.apellido, u.email, r.id AS rol_id, r.nombre AS rol
      FROM usuarios u
      INNER JOIN roles r ON r.id = u.rol_id
      ORDER BY u.id ASC
    `);
    const usuarios = [];
    while (stmt.step()) usuarios.push(stmt.getAsObject());
    stmt.free();
    res.json(usuarios);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
});

router.patch('/:id/rol', requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { rol_id } = req.body;

  if (!rol_id) return res.status(400).json({ message: 'rol_id es requerido' });

  try {
    const db = await getDb();

    const rol = db.exec('SELECT id FROM roles WHERE id = ?', [rol_id]);
    if (!rol[0]?.values?.length) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    db.run('UPDATE usuarios SET rol_id = ? WHERE id = ?', [rol_id, id]);
    saveDb(db);

    // Actualizar sesión si el usuario afectado está logueado
    if (req.session.userId === parseInt(id)) {
      const rolRow = db.exec('SELECT nombre FROM roles WHERE id = ?', [rol_id]);
      req.session.rol = rolRow[0]?.values[0][0];
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error al actualizar rol:', err);
    res.status(500).json({ message: 'Error al actualizar rol' });
  }
});

router.patch('/:id/nombre', requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ message: 'El nombre es requerido' });
  }

  try {
    const db = await getDb();
    const existe = db.exec('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (!existe[0]?.values?.length) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    db.run('UPDATE usuarios SET nombre = ? WHERE id = ?', [nombre.trim(), id]);
    saveDb(db);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al actualizar nombre:', err);
    res.status(500).json({ message: 'Error al actualizar nombre' });
  }
});

router.delete('/:id', requireRole(['admin']), async (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === req.session.userId) {
    return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
  }

  try {
    const db = await getDb();
    const existe = db.exec('SELECT id FROM usuarios WHERE id = ?', [id]);
    if (!existe[0]?.values?.length) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    db.run('DELETE FROM usuarios WHERE id = ?', [id]);
    saveDb(db);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ message: 'Error al eliminar usuario' });
  }
});

module.exports = router;
