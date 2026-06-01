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

  const cursosCount = db.exec("SELECT COUNT(*) FROM cursos")[0]?.values[0][0] || 0;
  if (cursosCount === 0) {
    const cursos = [
      ['Liderazgo Efectivo para Equipos', 'Aprende a liderar equipos de trabajo con estrategias prácticas de gestión emocional y comunicación efectiva.', 29900, 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=200&fit=crop'],
      ['Comunicación Asertiva', 'Desarrolla habilidades para expresar tus ideas con claridad y respeto, mejorando tus relaciones interpersonales.', 24900, 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=200&fit=crop'],
      ['Gestión del Estrés Laboral', 'Técnicas científicamente probadas para manejar el estrés en el trabajo y mantener tu bienestar mental.', 19900, 'https://images.unsplash.com/photo-1494059980473-813e73ee784b?w=400&h=200&fit=crop'],
      ['Inteligencia Emocional en el Trabajo', 'Mejora tu capacidad para reconocer y gestionar emociones propias y ajenas en entornos laborales.', 34900, 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=200&fit=crop'],
      ['Trabajo en Equipo Colaborativo', 'Estrategias para construir equipos de alto rendimiento basados en confianza y colaboración mutua.', 27900, 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=200&fit=crop'],
      ['Mindfulness para Profesionales', 'Introducción a la meditación mindfulness para mejorar concentración, creatividad y reduce el agotamiento.', 22900, 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=200&fit=crop'],
      ['Resolución de Conflictos Organizacionales', 'Metodologías prácticas para mediar y resolver conflictos en el ámbito laboral de manera constructiva.', 39900, 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=400&h=200&fit=crop'],
      ['Motivación y Productividad Personal', 'Descubre qué motiva realmente a las personas y cómo aplicar esto para incrementar tu productividad.', 19900, 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=200&fit=crop'],
      ['Ética Profesional y Liderazgo', 'Reflexiona sobre los principios éticos fundamentales para ejercer un liderazgo responsable e íntegro.', 32900, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop'],
      ['Desarrollo Personal Integral', 'Programa completo para potenciar tu crecimiento personal en todas las dimensiones de tu vida.', 49900, 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=200&fit=crop']
    ];

    cursos.forEach(curso => {
      db.run(`INSERT INTO cursos (titulo, descripcion, precio, imagen_url, duracion, habilitado) VALUES (?, ?, ?, ?, '8 semanas', 1)`, curso);
    });
  }

  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);

  console.log('Base de datos BD.sqlite creada/actualizada exitosamente');
  db.close();
}

initDatabase().catch(console.error);