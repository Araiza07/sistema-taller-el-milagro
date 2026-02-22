// Validar si el usuario ya inició sesión
if (sessionStorage.getItem('autenticado') !== 'true') {
    window.location.href = 'login.html';
}
// script-ordenes.js - GESTIÓN DE HISTORIAL Y BÚSQUEDA (CON SEGUIMIENTO)
//const API_URL = 'http://localhost:3000/api/ordenes';
//const API_URL = 'http://192.168.1.78:3000/api/ordenes';
// Reemplaza tu const API_URL por esta línea en TODOS tus archivos JS:
const API_URL = `http://${window.location.hostname}:3000/api/ordenes`;
const contenedorRecientes = document.getElementById('contenedor-recientes');
const contenedorBusqueda = document.getElementById('contenedor-busqueda');
const buscador = document.getElementById('buscador');

let todasLasOrdenes = [];

// 1. CARGAR DATOS AL INICIAR
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respuesta = await fetch(API_URL);
        todasLasOrdenes = await respuesta.json();
        
        todasLasOrdenes.forEach(o => {
            if (typeof o.evidencias === 'string') {
                try { o.evidencias = JSON.parse(o.evidencias); } 
                catch (e) { o.evidencias = []; }
            }
            if (!o.estado) o.estado = 'abierto';
        });

        actualizarContadores();
        mostrarUltimasCinco();
    } catch (error) {
        console.error("Error al cargar datos:", error);
        alert("No se pudo conectar con el servidor. RECUERDA INICIAR 'node server.js' EN LA TERMINAL.");
    }
});

function mostrarUltimasCinco() {
    const recientes = [...todasLasOrdenes].reverse().slice(0, 5);
    contenedorRecientes.innerHTML = "";
    if (recientes.length === 0) {
        contenedorRecientes.innerHTML = "<p>No hay órdenes registradas aún.</p>";
        return;
    }
    recientes.forEach(o => crearTarjeta(o, contenedorRecientes));
}

// 2. BUSCADOR
buscador.addEventListener('input', (e) => {
    const termino = e.target.value.toLowerCase().trim();
    contenedorBusqueda.innerHTML = "";
    if (termino === "") return;

    const filtradas = todasLasOrdenes.filter(o => 
        o.cliente.toLowerCase().includes(termino) || 
        o.placas.toLowerCase().includes(termino)
    );

    if (filtradas.length === 0) {
        contenedorBusqueda.innerHTML = "<p>No se encontraron coincidencias.</p>";
    } else {
        filtradas.forEach(o => crearTarjeta(o, contenedorBusqueda));
    }
});

// 3. CREAR TARJETA
function crearTarjeta(orden, destino) {
    const div = document.createElement('div');
    div.classList.add('carpeta-cliente');
    
    if (orden.estado === 'cerrado') {
        div.style.borderLeft = "5px solid #238636";
        div.style.backgroundColor = "#1c2128";
    }

    div.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
            <div style="flex: 1;">
                <h3 style="margin: 0; color: ${orden.estado === 'cerrado' ? '#238636' : '#58a6ff'};">
                    📂 ${orden.cliente} ${orden.estado === 'cerrado' ? ' (ENTREGADO ✅)' : ''}
                </h3>
                <p style="margin: 5px 0;"><strong>Vehículo:</strong> ${orden.marca} ${orden.modelo} (${orden.placas})</p>
                
                <div class="mini-evidencias" style="display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px;">
                    ${orden.evidencias.map(ev => {
                        if (ev.tipo === 'foto') return `<img src="${ev.contenido}" style="width:40px; height:40px; border-radius:4px; object-fit:cover; border: 1px solid #30363d;">`;
                        return `<span title="${ev.contenido}" style="cursor:help; background:#30363d; padding:2px 6px; border-radius:4px; font-size:0.7em;">📝</span>`;
                    }).join('')}
                </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px;">
                <button onclick="prepararPDF(${orden.id}, 'descargar')" style="background: #ffcc00; color: #000; font-weight: bold; border-radius: 4px; padding: 6px 10px; cursor: pointer; border:none;">📥 Descargar</button>
                <button onclick="prepararPDF(${orden.id}, 'ver')" style="background: #58a6ff; color: #fff; font-weight: bold; border-radius: 4px; padding: 6px 10px; cursor: pointer; border:none;">👁️ Ver Nota</button>
                <button onclick="eliminarOrden(${orden.id})" style="background: #da3633; color: #fff; font-weight: bold; border-radius: 4px; padding: 6px 10px; cursor: pointer; border:none; margin-top: 5px; font-size: 0.8em;">🗑️ Eliminar</button>
                
                ${orden.estado !== 'cerrado' ? `
                    <button onclick="agregarEvidencia(${orden.id})" style="background: #30363d; color: #fff; border-radius: 4px; padding: 6px 10px; cursor: pointer; border:none; font-size: 0.8em;">+ Nota/Foto</button>
                    <button onclick="cerrarOrden(${orden.id})" style="background: #238636; color: #fff; font-weight: bold; border-radius: 4px; padding: 6px 10px; cursor: pointer; border:none;">Terminar</button>
                ` : ''}
            </div>
        </div>
    `;
    destino.appendChild(div);
}

// 4. FUNCIONES DE ACTUALIZACIÓN
async function agregarEvidencia(id) {
    const inputFoto = document.createElement('input');
    inputFoto.type = 'file';
    inputFoto.accept = 'image/*';

    inputFoto.onchange = async (e) => {
        const file = e.target.files[0];
        const nota = prompt("Escribe una nota sobre el avance o daño encontrado:");
        if (nota === null && !file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Image = file ? reader.result : null;
            const orden = todasLasOrdenes.find(o => o.id === id);
            
            if (nota && nota.trim() !== "") orden.evidencias.push({ tipo: 'nota', contenido: nota });
            if (base64Image) orden.evidencias.push({ tipo: 'foto', contenido: base64Image });

            await actualizarBD(id, orden.evidencias, 'abierto');
            location.reload();
        };
        if (file) reader.readAsDataURL(file);
        else {
            const orden = todasLasOrdenes.find(o => o.id === id);
            if (nota) {
                orden.evidencias.push({ tipo: 'nota', contenido: nota });
                await actualizarBD(id, orden.evidencias, 'abierto');
                location.reload();
            }
        }
    };
    inputFoto.click();
}

async function cerrarOrden(id) {
    if (confirm("¿Marcar trabajo como TERMINADO?")) {
        const orden = todasLasOrdenes.find(o => o.id === id);
        await actualizarBD(id, orden.evidencias, 'cerrado');
        location.reload();
    }
}

async function actualizarBD(id, evidencias, estado) {
    try {
        await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ evidencias: JSON.stringify(evidencias), estado: estado })
        });
    } catch (error) { alert("Error al conectar con el servidor."); }
}

async function eliminarOrden(id) {
    if (confirm("⚠️ ¿Eliminar esta orden permanentemente?")) {
        try {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            location.reload();
        } catch (error) { alert("Error al eliminar."); }
    }
}

// 5. GENERADOR DE PDF
function prepararPDF(id, accion) {
    const orden = todasLasOrdenes.find(o => o.id === id);
    if (orden) ejecutarGenerarPDF(orden, accion);
}

function ejecutarGenerarPDF(orden, accion) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // ENCABEZADO Y LOGO
    doc.setFillColor(33, 38, 45);
    doc.rect(0, 0, 130, 45, 'F'); 
    doc.setTextColor(88, 166, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("TALLER MECÁNICO", 15, 18);
    doc.text("EL MILAGRO", 15, 30);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("Transmisiones Automáticas y Mecánica General", 15, 38);

    try {
        const imgLogo = new Image();
        imgLogo.src = 'logo.png'; 
        doc.addImage(imgLogo, 'PNG', 135, 2, 65, 40); 
    } catch (e) { console.error("Logo no encontrado"); }

    doc.setDrawColor(88, 166, 255);
    doc.line(15, 48, 195, 48);
    
    // DATOS CLIENTE
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`REPORTE FINAL - ESTADO: ${orden.estado.toUpperCase()}`, 15, 58);
    doc.line(15, 60, 195, 60);

    doc.setFont("helvetica", "normal");
    doc.text(`Cliente: ${orden.cliente}`, 15, 68);
    doc.text(`Vehículo: ${orden.marca} ${orden.modelo} (${orden.año || 'N/A'})`, 15, 76);
    doc.text(`Placas: ${orden.placas} | KM: ${orden.km}`, 15, 84);
    doc.text(`VIN: ${orden.vin}`, 15, 92);
    
    // DIAGNÓSTICO
    doc.setFont("helvetica", "bold");
    doc.text("DIAGNÓSTICO DE ENTRADA:", 15, 105);
    doc.setFont("helvetica", "normal");
    const motivo = doc.splitTextToSize(orden.motivo || "Sin motivo registrado", 180);
    doc.text(motivo, 15, 112);

    let y = 115 + (motivo.length * 5);
    doc.line(15, y, 195, y);
    
    // EVIDENCIAS
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("HISTORIAL DE TRABAJO Y EVIDENCIAS:", 15, y);
    y += 10;

    if (orden.evidencias && orden.evidencias.length > 0) {
        orden.evidencias.forEach((ev) => {
            if (y > 240) { doc.addPage(); y = 20; }
            if (ev.tipo === 'nota') {
                doc.setFont("helvetica", "italic");
                const nota = doc.splitTextToSize(`- ${ev.contenido}`, 175);
                doc.text(nota, 20, y);
                y += (nota.length * 5) + 5;
            } else if (ev.tipo === 'foto') {
                try {
                    doc.addImage(ev.contenido, 'JPEG', 20, y, 90, 55);
                    y += 65;
                } catch (e) { }
            }
        });
    }

    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Evidencia Digital - Sistema de Gestión El Milagro", 105, 285, { align: "center" });

    if (accion === 'ver') window.open(doc.output('bloburl'), '_blank');
    else doc.save(`Reporte_${orden.placas}.pdf`);
}

function actualizarContadores() {
    const abiertos = todasLasOrdenes.filter(o => o.estado !== 'cerrado').length;
    const cerrados = todasLasOrdenes.filter(o => o.estado === 'cerrado').length;
    document.getElementById('total-abiertos').innerText = abiertos;
    document.getElementById('total-cerrados').innerText = cerrados;
}
function cerrarSesion() {
    // Borramos la validación de la memoria
    sessionStorage.removeItem('autenticado');
    // Mandamos al usuario de vuelta al login
    window.location.href = 'login.html';
}