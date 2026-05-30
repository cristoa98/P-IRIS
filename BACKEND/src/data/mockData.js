const mockData = {
  cursos: [],
  roles: [
    { id: 1, nombre: 'admin', permisos: ['create', 'read', 'update', 'delete'] },
    { id: 2, nombre: 'user', permisos: ['read'] }
  ]
};

module.exports = mockData;