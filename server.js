const USUARIO_TALLER = "JJAC";
const CLAVE_TALLER = "milagro07"; // <-- Cambia esto por tu contraseña favorita
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(express.static(__dirname));
app.use(cors());
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true, parameterLimit: 50000 }));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});
// Ruta para el login
app.post('/api/login', (req, res) => {
    const { usuario, clave } = req.body;
    if (usuario === USUARIO_TALLER && clave === CLAVE_TALLER) {
        res.json({ exito: true });
    } else {
        res.status(401).json({ exito: false, mensaje: "Usuario o contraseña incorrectos" });
    }
});

// Conectar a la base de datos (se creará un archivo llamado taller.db)
const db = new sqlite3.Database('./taller.db');

// Crear la tabla si no existe (con los campos de tus imágenes)
// Actualiza la creación de la tabla en server.js
// Agregamos la columna 'estado' para saber si está Abierto o Cerrado
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
    evidencias TEXT,
    estado TEXT DEFAULT 'abierto'
)`);

// Ruta para guardar una nueva orden
app.post('/api/ordenes', (req, res) => {
    const { 
        cliente, contacto, correo, marca, modelo, año, 
        color, placas, vin, km, gasolina, tablero, motivo 
    } = req.body;

    const sql = `INSERT INTO ordenes (
        cliente, contacto, correo, marca, modelo, año, 
        color, placas, vin, km, gasolina, tablero, motivo, evidencias
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')`;
    
    db.run(sql, [
        cliente, contacto, correo, marca, modelo, año, 
        color, placas, vin, km, gasolina, tablero, motivo
    ], function(err) {
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
    
    // Usamos COALESCE para que si 'evidencias' o 'estado' vienen vacíos, mantenga el valor anterior
    const sql = `UPDATE ordenes SET 
                 evidencias = COALESCE(?, evidencias), 
                 estado = COALESCE(?, estado) 
                 WHERE id = ?`;

    db.run(sql, [evidencias, estado, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: "Actualizado con éxito" });
    });
});

// NUEVA RUTA: Permite borrar una orden de la base de datos
app.delete('/api/ordenes/:id', (req, res) => {
    const { id } = req.params;
    const sql = "DELETE FROM ordenes WHERE id = ?";

    db.run(sql, id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: "Orden eliminada con éxito" });
    });
});

//app.listen(3000, () => console.log("Servidor del taller corriendo en http://localhost:3000"));

// El '0.0.0.0' es la clave para que acepte conexiones de toda tu red Wi-Fi
app.listen(3000, '0.0.0.0', () => {
    console.log("🚀 Sistema El Milagro activo en la red local");
});
