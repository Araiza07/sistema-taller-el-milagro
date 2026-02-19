const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Permite fotos de hasta 10MB

// Conectar a la base de datos (se creará un archivo llamado taller.db)
const db = new sqlite3.Database('./taller.db');

// Crear la tabla si no existe (con los campos de tus imágenes)
// Actualiza la creación de la tabla en server.js
db.run(`CREATE TABLE IF NOT EXISTS ordenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente TEXT,
    contacto TEXT,
    correo TEXT,
    marca TEXT,
    modelo TEXT,
    año TEXT,
    color TEXT,
    placas TEXT,
    vin TEXT,
    km TEXT,
    gasolina TEXT,
    tablero TEXT,
    motivo TEXT,
    evidencias TEXT
)`);

// Ruta para guardar una nueva orden
app.post('/api/ordenes', (req, res) => {
    const { cliente, placas, marca, modelo, vin, gasolina, motivo } = req.body;
    const sql = `INSERT INTO ordenes (cliente, placas, marca, modelo, vin, gasolina, motivo, evidencias) VALUES (?, ?, ?, ?, ?, ?, ?, '[]')`;
    
    db.run(sql, [cliente, placas, marca, modelo, vin, gasolina, motivo], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
    });
});

// Ruta para obtener todas las ordenes
app.get('/api/ordenes', (req, res) => {
    db.all("SELECT * FROM ordenes", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
// Ruta para actualizar una orden (agregar evidencias o cerrar)
app.put('/api/ordenes/:id', (req, res) => {
    const { evidencias, estado } = req.body;
    const { id } = req.params;
    
    // Si mandamos estado, actualizamos estado. Si mandamos evidencias, actualizamos evidencias.
    const sql = "UPDATE ordenes SET evidencias = ?, estado = ? WHERE id = ?";
    db.run(sql, [evidencias, estado, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: "Actualizado con éxito" });
    });
});

app.listen(3000, () => console.log("Servidor del taller corriendo en http://localhost:3000"));