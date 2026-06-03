const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

const { getDb, saveDb } = require('../db');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

const DEFAULT_SESSION_MS = 24 * 60 * 60 * 1000;
const REMEMBER_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function mapUsuario(row) {
  return {
    id: row[0],
    email: row[1],
    nombre: row[2],
    apellido: row[3],
    rol: row[4]
  };
}

router.post('/login', async (req, res) => {
  try {
    const { email, password, remember } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'El correo es obligatorio' });
    }

    if (!password) {
      return res.status(400).json({ message: 'La contraseña es obligatoria' });
    }

    const db = await getDb();
    const normalizedEmail = email.trim().toLowerCase();

    const stmt = db.prepare(`
      SELECT u.id, u.email, u.nombre, u.apellido, r.nombre AS rol, u.password, u.activo
      FROM usuarios u
      INNER JOIN roles r ON r.id = u.rol_id
      WHERE LOWER(u.email) = ?
      LIMIT 1
    `);

    stmt.bind([normalizedEmail]);

    let row = null;
    if (stmt.step()) row = stmt.get();
    stmt.free();

    if (!row) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const storedPassword = row[5];
    const activo = row[6];

    if (activo !== 1) {
      return res.status(403).json({ message: 'Usuario inactivo' });
    }

    const passwordOk = storedPassword && storedPassword.startsWith('$2')
      ? await bcrypt.compare(password, storedPassword)
      : password === storedPassword;

    if (!passwordOk) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    if (storedPassword && !storedPassword.startsWith('$2')) {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.run('UPDATE usuarios SET password = ? WHERE id = ?', [hashedPassword, row[0]]);
      saveDb(db);
    }

    req.session.regenerate((error) => {
      if (error) {
        console.error('Error al regenerar sesión:', error);
        return res.status(500).json({ message: 'Error interno del servidor' });
      }

      req.session.userId = row[0];
      req.session.rol = row[4];
      req.session.cookie.maxAge = remember ? REMEMBER_SESSION_MS : DEFAULT_SESSION_MS;

      return res.json({
        message: 'Inicio de sesión exitoso',
        user: mapUsuario(row)
      });
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

router.get('/roles', requireRole(['admin']), async (req, res) => {
  try {
    const db = await getDb();
    const stmt = db.prepare('SELECT id, nombre FROM roles ORDER BY id ASC');
    const roles = [];
    while (stmt.step()) roles.push(stmt.getAsObject());
    stmt.free();
    return res.json(roles);
  } catch (err) {
    return res.status(500).json({ message: 'Error al obtener roles' });
  }
});

router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ message: 'No se pudo cerrar la sesión' });
    }

    res.clearCookie('connect.sid', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    return res.json({ message: 'Sesión cerrada' });
  });
});

module.exports = router;
