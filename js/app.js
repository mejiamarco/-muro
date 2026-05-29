import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, serverTimestamp, runTransaction, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBQdvDBqezHmwzYy5fXEi7M8sB8gzcFPKU",
    authDomain: "sistema-profe-puente.firebaseapp.com",
    projectId: "sistema-profe-puente",
    storageBucket: "sistema-profe-puente.appspot.com",
    messagingSenderId: "383416484351",
    appId: "1:383416484351:web:ca37a09d3bdf8fae8a6088"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Elementos de la interfaz del DOM
const pizarraCanvas = document.getElementById('pizarra-canvas');
const modalPublicar = document.getElementById('modal-publicar');
const modalAdmin = document.getElementById('modal-admin');
const modalPresentacion = document.getElementById('modal-presentacion');
const presentacionContentArea = document.getElementById('presentacion-content-area');

const btnAbrirPublicar = document.getElementById('btn-abrir-publicar');
const btnCerrarPublicar = document.getElementById('btn-cerrar-publicar');
const btnAbrirAdmin = document.getElementById('btn-abrir-admin');
const btnCerrarAdmin = document.getElementById('btn-cerrar-admin');
const btnCerrarPresentacion = document.getElementById('btn-cerrar-presentacion');
const chkModoProfesor = document.getElementById('chk-modo-profesor');

// Botones secuenciales añadidos al DOM
const btnPrevPresentacion = document.getElementById('btn-prev-presentacion');
const btnNextPresentacion = document.getElementById('btn-next-presentacion');

const formPost = document.getElementById('form-pizarra-multimedia');
const btnEnviarPost = document.getElementById('btn-enviar-post');
const btnAdjuntarArchivo = document.getElementById('btn-adjuntar-archivo');
const btnAdjuntarCamara = document.getElementById('btn-adjuntar-camara');
const inputFileHidden = document.getElementById('input-file-hidden');
const inputCamHidden = document.getElementById('input-cam-hidden');

const previsualizacionImg = document.getElementById('previsualizacion-img');
const imgPreviewSrc = document.getElementById('img-preview-src');
const previewLoadingText = document.getElementById('preview-loading-text');
const btnRemoverImg = document.getElementById('btn-remover-img');
const btnAplicarFondo = document.getElementById('btn-aplicar-fondo');
const fondoOptions = document.querySelectorAll('.fondo-option');

let imagenBase64Comprimida = ""; 
let fondoSeleccionado = "fondo-default";
let modoProfesorActivo = false;
let indicePresentacionActual = -1; // Rastreador de carrusel

// --- VENTANAS MODALES ---
btnAbrirPublicar.addEventListener('click', () => modalPublicar.classList.add('active'));
btnCerrarPublicar.addEventListener('click', () => { modalPublicar.classList.remove('active'); limpiarFormulario(); });
btnAbrirAdmin.addEventListener('click', () => modalAdmin.classList.add('active'));
btnCerrarAdmin.addEventListener('click', () => modalAdmin.classList.remove('active'));
btnCerrarPresentacion.addEventListener('click', () => { modalPresentacion.classList.remove('active'); presentacionContentArea.innerHTML = ""; indicePresentacionActual = -1; });

// --- GESTIÓN DE SEGURIDAD CON CONTRASEÑA "mejia" ---
chkModoProfesor.addEventListener('change', (e) => {
    if (e.target.checked) {
        const password = prompt("Ingrese la contraseña de moderación:");
        if (password === "mejia") {
            modoProfesorActivo = true;
            alert("Modo Profesor activado con éxito.");
        } else {
            alert("Contraseña incorrecta. Acceso denegado.");
            e.target.checked = false; // Desactiva el switch si falla
            modoProfesorActivo = false;
        }
    } else {
        modoProfesorActivo = false;
    }
    rahJ91ZuNL8Y2px8iYciYeHN8sfSh5eXH8();
});

// --- ELIMINAR PUBLICACIÓN ---
window.eliminarPublicacionSegura = async function(docId) {
    if (confirm("¿Está completamente seguro de que desea remover esta publicación por motivos de moderación?")) {
        try {
            await deleteDoc(doc(db, "pizarra_clase", docId));
        } catch (error) {
            console.error("Error al remover documento: ", error);
        }
    }
};

// --- RENDERIZAR ENTORNO DE PROYECCIÓN INDIVIDUAL ---
function renderizarContenidoPresentacion(data) {
    let renderImagenBig = "";
    if (data.imagen && data.imagen.trim() !== "") {
        renderImagenBig = `<img src="${data.imagen}" class="big-img" alt="Imagen Ampliada">`;
    }

    let fechaFormateada = "Reciente";
    if (data.fecha) {
        fechaFormateada = data.fecha.toDate().toLocaleDateString('es-BO', {
            day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
        });
    }

    presentacionContentArea.innerHTML = `
        <div class="expanded-card-show">
            <h2>${escapeHTML(data.titulo)}</h2>
            <p>${escapeHTML(data.contenido)}</p>
            ${renderImagenBig}
            <div class="big-footer">
                <span class="big-autor">Presentado por: ${escapeHTML(data.autor)}</span>
                <span>${fechaFormateada}</span>
            </div>
        </div>
    `;
}

// --- PANTALLA AMPLIADA (MODO PRESENTACIÓN INICIAL) ---
window.ampliarPublicacionMuro = function(docId) {
    // Localizar el índice dentro de nuestro array en caché
    const index = listadoPublicacionesCache.findIndex(item => item.id === docId);
    if (index !== -1) {
        indicePresentacionActual = index;
        renderizarContenidoPresentacion(listadoPublicacionesCache[indicePresentacionActual]);
        modalPresentacion.classList.add('active');
    }
};

// --- NAVEGACIÓN SECUENCIAL (SIGUIENTE / ANTERIOR) ---
btnPrevPresentacion.addEventListener('click', () => {
    if (listadoPublicacionesCache.length === 0 || indicePresentacionActual === -1) return;
    
    // Si está al inicio, salta al final del bucle secuencial
    if (indicePresentacionActual === 0) {
        indicePresentacionActual = listadoPublicacionesCache.length - 1;
    } else {
        indicePresentacionActual--;
    }
    renderizarContenidoPresentacion(listadoPublicacionesCache[indicePresentacionActual]);
});

btnNextPresentacion.addEventListener('click', () => {
    if (listadoPublicacionesCache.length === 0 || indicePresentacionActual === -1) return;
    
    // Si llegó al final, vuelve a la primera tarjeta
    if (indicePresentacionActual === listadoPublicacionesCache.length - 1) {
        indicePresentacionActual = 0;
    } else {
        indicePresentacionActual++;
    }
    renderizarContenidoPresentacion(listadoPublicacionesCache[indicePresentacionActual]);
});

// --- LOGICA DEL PROFESOR: CONTROL DE REPOSITORIO DE FONDOS ---
fondoOptions.forEach(option => {
    option.addEventListener('click', () => {
        fondoOptions.forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        fondoSeleccionado = option.getAttribute('data-fondo');
    });
});

btnAplicarFondo.addEventListener('click', async () => {
    try {
        await setDoc(doc(db, "configuracion", "pizarra"), { fondoClase: fondoSeleccionado });
        modalAdmin.classList.remove('active');
    } catch (e) { console.error("Error al guardar fondo: ", e); }
});

onSnapshot(doc(db, "configuracion", "pizarra"), (docSnap) => {
    if (docSnap.exists()) {
        pizarraCanvas.className = "canvas-slate " + docSnap.data().fondoClase;
    }
});

// --- PROCESAMIENTO MULTIMEDIA ---
btnAdjuntarArchivo.addEventListener('click', () => inputFileHidden.click());
btnAdjuntarCamara.addEventListener('click', () => inputCamHidden.click());

inputFileHidden.addEventListener('change', (e) => procesarImagenCamaraOArchivo(e.target.files[0]));
inputCamHidden.addEventListener('change', (e) => procesarImagenCamaraOArchivo(e.target.files[0]));

btnRemoverImg.addEventListener('click', () => {
    imagenBase64Comprimida = "";
    previsualizacionImg.classList.add('design-hidden');
    imgPreviewSrc.src = "";
    btnEnviarPost.disabled = false;
});

function procesarImagenCamaraOArchivo(file) {
    if (!file) {
        if (!imagenBase64Comprimida) {
            previsualizacionImg.classList.add('design-hidden');
            btnEnviarPost.disabled = false;
        }
        return;
    }
    
    previsualizacionImg.classList.remove('design-hidden');
    previewLoadingText.classList.remove('design-hidden');
    btnEnviarPost.disabled = true;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;
        img.onload = function() {
            const canvasVirtual = document.createElement('canvas');
            const maxAnchoPermitido = 640; 
            const ratioEscala = maxAnchoPermitido / img.width;
            
            canvasVirtual.width = maxAnchoPermitido;
            canvasVirtual.height = img.height * ratioEscala;
            
            const ctx = canvasVirtual.getContext('2d');
            ctx.drawImage(img, 0, 0, canvasVirtual.width, canvasVirtual.height);
            
            imagenBase64Comprimida = canvasVirtual.toDataURL('image/jpeg', 0.60);
            imgPreviewSrc.src = imagenBase64Comprimida;
            previewLoadingText.classList.add('design-hidden');
            btnEnviarPost.disabled = false;
        };
    };
    reader.readAsDataURL(file);
}

// --- ENVÍO DE DATOS CONTRA ERRORES DE DATOS ---
formPost.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const autor = document.getElementById('post-autor').value.trim() || "Anónimo";
    const titulo = document.getElementById('post-titulo').value.trim();
    const contenido = document.getElementById('post-contenido').value.trim();

    const datosPublicacion = {
        autor: autor,
        titulo: titulo,
        contenido: contenido,
        imagen: (imagenBase64Comprimida && imagenBase64Comprimida.trim() !== "") ? imagenBase64Comprimida : "",
        fecha: serverTimestamp(),
        likes: 0,
        upvotes: 0,
        downvotes: 0
    };

    try {
        await addDoc(collection(db, "pizarra_clase"), datosPublicacion);
        modalPublicar.classList.remove('active');
        limpiarFormulario();
    } catch (error) {
        console.error("Error al escribir en Firebase: ", error);
    }
});

function limpiarFormulario() {
    formPost.reset();
    imagenBase64Comprimida = "";
    previsualizacionImg.classList.add('design-hidden');
    imgPreviewSrc.src = "";
    inputFileHidden.value = "";
    inputCamHidden.value = "";
    btnEnviarPost.disabled = false;
}

// --- FUNCIÓN DE CONTROL DE REACCIONES ---
window.registrarReaccion = async function(docId, tipoReaccion) {
    const docRef = doc(db, "pizarra_clase", docId);
    try {
        await runTransaction(db, async (transaction) => {
            const sfDoc = await transaction.get(docRef);
            if (!sfDoc.exists()) return;
            const conteoActual = sfDoc.data()[tipoReaccion] || 0;
            transaction.update(docRef, { [tipoReaccion]: conteoActual + 1 });
        });
    } catch (e) { console.error(e); }
};

// --- ESCUCHA Y RENDERIZADO DEL MURO EN TIEMPO REAL ---
let listadoPublicacionesCache = [];
const q = query(collection(db, "pizarra_clase"), orderBy("fecha", "desc"));

onSnapshot(q, (snapshot) => {
    listadoPublicacionesCache = [];
    snapshot.forEach((docSnap) => {
        listadoPublicacionesCache.push({ id: docSnap.id, ...docSnap.data() });
    });
    rahJ91ZuNL8Y2px8iYciYeHN8sfSh5eXH8();
});

function rahJ91ZuNL8Y2px8iYciYeHN8sfSh5eXH8() {
    pizarraCanvas.innerHTML = "";
    
    if (listadoPublicacionesCache.length === 0) {
        pizarraCanvas.innerHTML = `<div style="color:inherit; opacity:0.75; text-align:center; grid-column: 1/-1; padding: 2rem;">La pizarra está vacía. ¡Comparte tus fotos e ideas!</div>`;
        return;
    }

    listadoPublicacionesCache.forEach((data) => {
        const tarjeta = document.createElement('div');
        tarjeta.classList.add('post-card-canvas');
        
        let renderImagen = "";
        if (data.imagen && data.imagen.trim() !== "") {
            renderImagen = `<img src="${data.imagen}" class="post-img" alt="Imagen Adjunta">`;
        }

        let fechaFormateada = "Reciente";
        if (data.fecha) {
            fechaFormateada = data.fecha.toDate().toLocaleDateString('es-BO', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
            });
        }

        let btnBorradoProfesor = "";
        if (modoProfesorActivo) {
            btnBorradoProfesor = `
                <button class="btn-card-action btn-delete-post" onclick="eliminarPublicacionSegura('${data.id}')" title="Remover publicación">
                    <span class="material-symbols-outlined" style="font-size: 1.25rem;">delete</span>
                </button>
            `;
        }

        tarjeta.innerHTML = `
            <div class="post-header-actions">
                <h3>${escapeHTML(data.titulo)}</h3>
                <div style="display:flex; gap:4px;">
                    <button class="btn-card-action" onclick="ampliarPublicacionMuro('${data.id}')" title="Presentar en pantalla completa">
                        <span class="material-symbols-outlined" style="font-size: 1.25rem;">fullscreen</span>
                    </button>
                    ${btnBorradoProfesor}
                </div>
            </div>
            <p>${escapeHTML(data.contenido)}</p>
            ${renderImagen}
            <div class="post-footer">
                <span class="autor">Por: ${escapeHTML(data.autor)}</span>
                <span>${fechaFormateada}</span>
            </div>
            <div class="reactions-bar">
                <button class="btn-react" onclick="registrarReaccion('${data.id}', 'likes')">❤️ <span>${data.likes || 0}</span></button>
                <button class="btn-react" onclick="registrarReaccion('${data.id}', 'upvotes')">👍 <span>${data.upvotes || 0}</span></button>
                <button class="btn-react" onclick="registrarReaccion('${data.id}', 'downvotes')">👎 <span>${data.downvotes || 0}</span></button>
            </div>
        `;
        pizarraCanvas.appendChild(tarjeta);
    });
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}
