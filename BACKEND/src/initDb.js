const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'BD.sqlite');

async function initDatabase() {
  const SQL = await initSqlJs();

  let db;
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      permisos TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      nombre TEXT NOT NULL,
      apellido TEXT,
      rol_id INTEGER DEFAULT 2,
      activo INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rol_id) REFERENCES roles(id)
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      descripcion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cursos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      descripcion TEXT,
      precio REAL NOT NULL DEFAULT 0,
      imagen_url TEXT,
      video_url TEXT,
      categoria_id INTEGER,
      duracion TEXT,
      habilitado INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    );

    CREATE TABLE IF NOT EXISTS compras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      estado TEXT DEFAULT 'completada',
      datos_facturacion TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS detalle_compra (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      compra_id INTEGER NOT NULL,
      curso_id INTEGER NOT NULL,
      precio_unitario REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (compra_id) REFERENCES compras(id),
      FOREIGN KEY (curso_id) REFERENCES cursos(id)
    );

    CREATE TABLE IF NOT EXISTS certificados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      curso_id INTEGER NOT NULL,
      codigo TEXT NOT NULL UNIQUE,
      fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
      url_descarga TEXT,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (curso_id) REFERENCES cursos(id)
    );

    CREATE TABLE IF NOT EXISTS notificaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      mensaje TEXT NOT NULL,
      leida INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS mensajes_contacto (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT NOT NULL,
      mensaje TEXT NOT NULL,
      respondida INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS metricas_ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      curso_id INTEGER,
      mes TEXT NOT NULL,
      anio INTEGER NOT NULL,
      cantidad_ventas INTEGER DEFAULT 0,
      revenue REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (curso_id) REFERENCES cursos(id)
    );
  `);

  const rolesCount = db.exec("SELECT COUNT(*) FROM roles")[0]?.values[0][0] || 0;
  if (rolesCount === 0) {
    db.run(`INSERT INTO roles (nombre, permisos) VALUES ('admin', '["create","read","update","delete"]')`);
    db.run(`INSERT INTO roles (nombre, permisos) VALUES ('user', '["read"]')`);
  }

  const catsCount = db.exec("SELECT COUNT(*) FROM categorias")[0]?.values[0][0] || 0;
  if (catsCount === 0) {
    db.run(`INSERT INTO categorias (nombre, descripcion) VALUES ('General', 'Cursos y talleres generales')`);
  }

  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);

  console.log('Base de datos BD.sqlite creada/actualizada exitosamente');
  db.close();
}

initDatabase().catch(console.error);