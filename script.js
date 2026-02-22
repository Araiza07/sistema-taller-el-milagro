// Validar si el usuario ya inició sesión
if (sessionStorage.getItem('autenticado') !== 'true') {
    window.location.href = 'login.html';
}
// script.js - SOLO REGISTRO (Pantalla Principal)

//const API_URL = 'http://localhost:3000/api/ordenes';
// Reemplaza tu const API_URL por esta línea en TODOS tus archivos JS:
const API_URL = `http://${window.location.hostname}:3000/api/ordenes`;
//const API_URL = 'http://192.168.1.78:3000/api/ordenes';
const form = document.getElementById('form-orden');


// 1. ESCUCHAR EL ENVÍO DEL FORMULARIO
form.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Capturar todos los campos del formulario
    const nuevaOrden = {
        cliente: document.getElementById('cliente').value,
        contacto: document.getElementById('contacto').value,
        correo: document.getElementById('correo').value,
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        año: document.getElementById('año').value,
        color: document.getElementById('color').value,
        placas: document.getElementById('placas').value,
        vin: document.getElementById('vin').value,
        km: document.getElementById('km').value,
        gasolina: document.querySelector('input[name="gas"]:checked')?.value || "N/A",
        tablero: document.querySelector('input[name="tablero"]:checked')?.value || "N/A",
        motivo: document.getElementById('motivo').value
    };

    try {
        // Enviar datos al servidor Node.js
        const respuesta = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaOrden)
        });

        if (respuesta.ok) {
            // Confirmación de éxito
            alert("¡Orden de Servicio creada con éxito! Ya puedes consultarla en el historial.");
            form.reset(); // Limpia los campos para el siguiente vehículo
        } else {
            alert("Error al guardar. Verifica que el servidor (node server.js) esté encendido.");
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        alert("No se pudo conectar con el servidor. Revisa la terminal.");
    }
});
function cerrarSesion() {
    // Borramos la validación de la memoria
    sessionStorage.removeItem('autenticado');
    // Mandamos al usuario de vuelta al login
    window.location.href = 'login.html';
}