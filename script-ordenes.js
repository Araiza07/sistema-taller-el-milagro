// script-ordenes.js - GESTIÓN DE HISTORIAL Y BÚSQUEDA (CON SEGUIMIENTO)

const API_URL = 'http://localhost:3000/api/ordenes';
const contenedorRecientes = document.getElementById('contenedor-recientes');
const contenedorBusqueda = document.getElementById('contenedor-busqueda');
const buscador = document.getElementById('buscador');

let todasLasOrdenes = [];

// 1. CARGAR DATOS AL INICIAR
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const respuesta = await fetch(API_URL);
        todasLasOrdenes = await respuesta.json();
        
        // CORRECCIÓN: Procesar las evidencias para que el programa las entienda
        todasLasOrdenes.forEach(o => {
            if (typeof o.evidencias === 'string') {
                try { 
                    o.evidencias = JSON.parse(o.evidencias); 
                } catch (e) { 
                    o.evidencias = []; 
                }
            }
            // Asegurar que el estado no sea null
            if (!o.estado) o.estado = 'abierto';
        });

        actualizarContadores(); // Ahora esta función sí existe al final del archivo
        mostrarUltimasCinco();
    } catch (error) {
        console.error("Error al cargar datos:", error);
        alert("No se pudo conectar con el servidor. Revisa la terminal.");
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

// 3. CREAR TARJETA (Modificada para pasar solo el ID)
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
                <button onclick="prepararPDF(${orden.id})" 
                    style="background: #ffcc00; color: #000; font-weight: bold; border-radius: 4px; padding: 6px 10px; cursor: pointer; border:none;">
                    📄 PDF
                </button>
                
                ${orden.estado !== 'cerrado' ? `
                    <button onclick="agregarEvidencia(${orden.id})" 
                        style="background: #58a6ff; color: #fff; font-weight: bold; border-radius: 4px; padding: 6px 10px; cursor: pointer; border:none;">
                        + Nota/Foto
                    </button>
                    <button onclick="cerrarOrden(${orden.id})" 
                        style="background: #238636; color: #fff; font-weight: bold; border-radius: 4px; padding: 6px 10px; cursor: pointer; border:none;">
                        Terminar
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    destino.appendChild(div);
}

// 4. FUNCIONES DE ACTUALIZACIÓN
async function agregarEvidencia(id) {
    const nota = prompt("Escribe una nota sobre el avance o daño encontrado:");
    if (nota === null) return;

    const inputFoto = document.createElement('input');
    inputFoto.type = 'file';
    inputFoto.accept = 'image/*';

    inputFoto.onchange = async (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onloadend = async () => {
            const base64Image = reader.result;
            const orden = todasLasOrdenes.find(o => o.id === id);
            
            if (nota.trim() !== "") {
                orden.evidencias.push({ tipo: 'nota', contenido: nota });
            }
            orden.evidencias.push({ tipo: 'foto', contenido: base64Image });

            await actualizarBD(id, orden.evidencias, 'abierto');
            location.reload();
        };
        if (file) reader.readAsDataURL(file);
        else {
            const orden = todasLasOrdenes.find(o => o.id === id);
            if (nota.trim() !== "") {
                orden.evidencias.push({ tipo: 'nota', contenido: nota });
                await actualizarBD(id, orden.evidencias, 'abierto');
                location.reload();
            }
        }
    };
    inputFoto.click();
}

async function cerrarOrden(id) {
    if (confirm("¿Marcar trabajo como TERMINADO? Ya no podrás agregar más evidencias.")) {
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
    } catch (error) {
        alert("Error al actualizar la base de datos.");
    }
}

// 5. GENERADOR DE PDF
function prepararPDF(id) {
    const ordenActualizada = todasLasOrdenes.find(o => o.id === id);
    if (ordenActualizada) {
        ejecutarGenerarPDF(ordenActualizada);
    }
}

function ejecutarGenerarPDF(orden) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFillColor(33, 38, 45);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(88, 166, 255);
    doc.setFontSize(22);
    doc.text("TALLER MECÁNICO EL MILAGRO", 15, 25);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`REPORTE FINAL - ESTADO: ${orden.estado.toUpperCase()}`, 15, 50);
    doc.line(15, 52, 195, 52);

    doc.setFont("helvetica", "normal");
    doc.text(`Cliente: ${orden.cliente}`, 15, 60);
    doc.text(`Vehículo: ${orden.marca} ${orden.modelo} (${orden.año})`, 15, 68);
    doc.text(`Placas: ${orden.placas} | KM: ${orden.km}`, 15, 76);
    doc.text(`VIN: ${orden.vin}`, 15, 84);
    
    doc.setFont("helvetica", "bold");
    doc.text("DIAGNÓSTICO DE ENTRADA:", 15, 95);
    doc.setFont("helvetica", "normal");
    doc.text(orden.motivo, 15, 102, { maxWidth: 180 });

    doc.line(15, 120, 195, 120);
    doc.setFont("helvetica", "bold");
    doc.text("HISTORIAL DE TRABAJO Y EVIDENCIAS:", 15, 128);
    
    let y = 138;
    orden.evidencias.forEach((ev) => {
        if (y > 240) { doc.addPage(); y = 20; }
        if (ev.tipo === 'nota') {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(10);
            doc.text(`- ${ev.contenido}`, 20, y);
            y += 10;
        } else if (ev.tipo === 'foto') {
            try {
                doc.addImage(ev.contenido, 'JPEG', 20, y, 60, 45);
                y += 55;
            } catch (e) { console.error("Error con la imagen:", e); }
        }
    });

    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Evidencia Digital - Sistema de Gestión El Milagro", 105, 285, { align: "center" });
    doc.save(`Reporte_Completo_${orden.placas}.pdf`);
}

// ESTA ES LA PARTE QUE TE FALTABA
function actualizarContadores() {
    const abiertos = todasLasOrdenes.filter(o => o.estado !== 'cerrado').length;
    const cerrados = todasLasOrdenes.filter(o => o.estado === 'cerrado').length;

    const elAbiertos = document.getElementById('total-abiertos');
    const elCerrados = document.getElementById('total-cerrados');
    
    if (elAbiertos) elAbiertos.innerText = abiertos;
    if (elCerrados) elCerrados.innerText = cerrados;
}