const { getDb } = require('../db');

function destroySession(req) {
  if (req.session) req.session.destroy(() => {});
}

function isPageRequest(req) {
  return req.accepts('html') && !req.originalUrl.startsWith('/api/');
}

function respondUnauthorized(req, res) {
  if (isPageRequest(req)) return res.redirect('/login.html');
  return res.status(401).json({ message: 'No autenticado' });
}

function respondForbidden(req, res) {
  if (isPageRequest(req)) return res.redirect('/index.html');
  return res.status(403).json({ message: 'Sin permisos' });
}

async function getSessionUser(userId) {
  const db = await getDb();
  const stmt = db.prepare(`
    SELECT u.id, u.email, u.nombre, u.apellido, r.nombre AS rol
    FROM usuarios u
    INNER JOIN roles r ON r.id = u.rol_id
    WHERE u.id = ? AND u.activo = 1
    LIMIT 1
  `);

  stmt.bind([userId]);

  let user = null;
  if (stmt.step()) {
    const row = stmt.get();
    user = {
      id: row[0],
      email: row[1],
      nombre: row[2],
      apellido: row[3],
      rol: row[4]
    };
  }

  stmt.free();
  return user;
}

const requireAuth = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return respondUnauthorized(req, res);
    }

    const user = await getSessionUser(req.session.userId);
    if (!user) {
      destroySession(req);
      return respondUnauthorized(req, res);
    }

    req.user = user;
    req.session.rol = user.rol;
    return next();
  } catch (error) {
    return next(error);
  }
};

const requireRole = (roles) => {
  return async (req, res, next) => {
    return requireAuth(req, res, () => {
      if (!roles.includes(req.user.rol)) {
        return respondForbidden(req, res);
      }
      return next();
    });
  };
};

module.exports = { requireAuth, requireRole, getSessionUser };
