const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  next();
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    if (!roles.includes(req.session.rol)) {
      return res.status(403).json({ message: 'Sin permisos' });
    }
    next();
  };
};

module.exports = { requireAuth, requireRole };