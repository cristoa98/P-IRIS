function getColumnInfo(db, tableName, columnName) {
  const result = db.exec(`PRAGMA table_info(${tableName})`);
  return result[0]?.values.find(row => row[1] === columnName) || null;
}

function ensureUsuariosNombreNullable(db) {
  const nombreColumn = getColumnInfo(db, 'usuarios', 'nombre');
  if (!nombreColumn || nombreColumn[3] === 0) return false;

  db.run('PRAGMA foreign_keys = OFF');
  db.run('BEGIN TRANSACTION');
  try {
    db.run(`
      CREATE TABLE usuarios_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        nombre TEXT,
        apellido TEXT,
        rol_id INTEGER DEFAULT 2,
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rol_id) REFERENCES roles(id)
      )
    `);

    db.run(`
      INSERT INTO usuarios_new (id, email, password, nombre, apellido, rol_id, activo, created_at)
      SELECT id, email, password, nombre, apellido, rol_id, activo, created_at
      FROM usuarios
    `);

    db.run('DROP TABLE usuarios');
    db.run('ALTER TABLE usuarios_new RENAME TO usuarios');
    db.run(`
      UPDATE sqlite_sequence
      SET seq = COALESCE((SELECT MAX(id) FROM usuarios), 0)
      WHERE name = 'usuarios'
    `);
    db.run('COMMIT');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  } finally {
    db.run('PRAGMA foreign_keys = ON');
  }

  return true;
}

function ensureCertificadosSchema(db) {
  const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='progreso_cursos'");
  if (result[0]?.values?.length) return false;

  db.run(`
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

    CREATE TABLE IF NOT EXISTS progreso_cursos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      curso_id INTEGER NOT NULL,
      completado INTEGER DEFAULT 0,
      fecha_completado DATETIME,
      UNIQUE(usuario_id, curso_id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (curso_id) REFERENCES cursos(id)
    );
  `);

  return true;
}

module.exports = { ensureUsuariosNombreNullable, ensureCertificadosSchema };
