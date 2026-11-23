import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
// Firebase AI Logic (Gemini) — chatbot del asistente de IA
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-ai.js";

const firebaseConfig = {
  apiKey: "AIzaSyDvGluVQ5zM2qv0Hnl0f4CVCZ8zuZKBOU0",
  authDomain: "kilobyte-sl.firebaseapp.com",
  projectId: "kilobyte-sl",
  storageBucket: "kilobyte-sl.firebasestorage.app",
  messagingSenderId: "902398298253",
  appId: "1:902398298253:web:1eaa57aa2e5ed38e25fac4",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Segundo destino: bandeja interna de Kilobyte Central.
// La web mantiene su proyecto público para cuentas y pedidos, pero copia
// formularios y pedidos a la base de datos privada del software.
const internalApp = initializeApp({
  apiKey: "AIzaSyBl2p7Rc_4e2qny7ODb6CZtmR5p362En-Y",
  authDomain: "software-kilobyte-sl.firebaseapp.com",
  projectId: "software-kilobyte-sl",
  storageBucket: "software-kilobyte-sl.firebasestorage.app",
  messagingSenderId: "734816414072",
  appId: "1:734816414072:web:b7b3a8535fafd8050a808d",
}, "kilobyte-central-internal");
const internalDb = getFirestore(internalApp);

/* ============================================================
   Helpers públicos — window.KBDB
   ============================================================ */

// Guarda un documento nuevo en la colección indicada con fecha de servidor.
async function guardar(coleccion, datos) {
  const ref = await addDoc(collection(db, coleccion), {
    ...datos,
    fecha: serverTimestamp(),
  });
  return ref.id;
}

// Copia pública hacia la bandeja de entradas del software interno.
async function guardarInterno(datos) {
  const ref = await addDoc(collection(internalDb, "web_inbox"), {
    origen: "web-publica",
    tipo: datos.tipo,
    estado: "Pendiente",
    nombre: datos.nombre || "",
    email: datos.email || "",
    empresa: datos.empresa || "",
    telefono: datos.telefono || "",
    motivo: datos.motivo || "",
    mensaje: datos.mensaje || "",
    pedido: datos.pedido || "",
    total: Number(datos.total || 0),
    fecha: serverTimestamp(),
  });
  return ref.id;
}

// Crea o actualiza un documento con id fijo (p. ej. un usuario por email).
async function guardarConId(coleccion, id, datos) {
  await setDoc(doc(db, coleccion, id), { ...datos, fecha: serverTimestamp() }, { merge: true });
  return id;
}

// Marca de tiempo del servidor (para fechaRegistro, pedidos, etc.).
function fechaServidor() {
  return serverTimestamp();
}



/* ============================================================
   Autenticación — window.KBAUTH (Firebase Authentication)
   Las contraseñas NUNCA se guardan en localStorage: Firebase
   las gestiona de forma segura en el servidor.
   ============================================================ */

// Guarda el perfil del usuario autenticado en users/{uid}.
// Cumple la regla de Firestore: request.auth.uid == userId.
async function guardarUsuario(user, extra = {}) {
  try {
    await setDoc(
      doc(db, "users", user.uid),
      {
        userId: user.uid,            // coherente con orders (userId == auth.uid)
        correo: user.email || null,
        nombre: user.displayName || (user.email ? user.email.split("@")[0] : "Usuario"),
        ...extra,
        fecha: serverTimestamp(),
      },
      { merge: true } // no sobrescribe campos previos (p. ej. direccion)
    );
  } catch (err) {
    console.error("Error al guardar el usuario en Firestore:", err);
  }
  return user;
}

window.KBAUTH = {
  auth,
  // Registro con email/contraseña: crea el usuario y guarda su perfil en users/{uid}.
  crearUsuario: (email, pass, nombre) =>
    createUserWithEmailAndPassword(auth, email, pass).then(({ user }) =>
      Promise.resolve(nombre ? updateProfile(user, { displayName: nombre }) : user)
        .then(() => guardarUsuario(user, nombre ? { nombre } : {}))
        .then(() => user)
    ),
  // Inicio de sesión con email/contraseña: guarda/actualiza el perfil y el último acceso.
  iniciarSesion: (email, pass) =>
    signInWithEmailAndPassword(auth, email, pass).then(({ user }) =>
      guardarUsuario(user, { ultimoMetodoAcceso: "email" }).then(() => user)
    ),
  // Inicio de sesión con Google: guarda/actualiza el perfil (con displayName de Google) y el último acceso.
  google: () =>
    signInWithPopup(auth, new GoogleAuthProvider()).then(({ user }) =>
      guardarUsuario(user, { ultimoMetodoAcceso: "google" }).then(() => user)
    ),
  cerrarSesion: () => signOut(auth),
  alCambiar: (cb) => onAuthStateChanged(auth, cb),
};

window.KBDB = { app, db, auth, guardar, guardarInterno, guardarConId, fechaServidor, guardarUsuario };

// Aviso para el resto de la aplicación
window.dispatchEvent(new Event("firestore-ready"));

/* ============================================================
   Firebase AI Logic (Gemini) — window.KBAI
   El chatbot responde con Gemini en vez de con respuestas
   programadas. Si falla, script.js usa su fallback local.
   ============================================================ */

const SYSTEM_INSTRUCTION = `Eres el asistente virtual de KILOBYTE S.L., una empresa informática del proyecto de Proyecto Intermodular de 2º SMR del IES Ribera del Tajo (autor: Gonzalo Elez Villar). Tu lema: "Tu negocio pasa de KB a GB".

INFORMACIÓN DE LA EMPRESA:
- Tres frentes: (1) Soporte informático completo (incidencias, teleasistencia, mantenimiento de equipos y sistemas, configuración de red); (2) Seguridad con Sophos Firewall (protección perimetral, control de accesos y tráfico); (3) Equipos y servidores con asesoría personalizada.
- DF Server: software de servidor a medida para empresas (dominios, archivos compartidos, servicios de red, Active Directory) que se instala sobre Windows Server en máquinas virtuales, adaptado al tamaño del cliente.
- Infraestructura propia: servidor web (aloja esta web), servidor de datos con base de datos MySQL/MariaDB (8 tablas) gestionada mediante el cliente HeidiSQL, todo virtualizado y con SAIs. La versión pública de la web se sirve desde Firebase Hosting y los datos de la web (contactos, cuentas, pedidos) se guardan en Firestore.
- Próximamente: servicios de IA para automatizar procesos en empresas. Este chatbot es una muestra de esa apuesta.
- Contacto: formulario en contacto.html, email info@kilobyte.es, teléfono 900 000 000 (24/7).
- Proyecto educativo en 5 fases: diseño → servidores y red → web y chatbot → seguridad y nube → pruebas y entrega.

CATÁLOGO DE LA TIENDA (precios exactos):
- KILOBYTE Home PC: 449 € (16GB/512GB: 549 €; 16GB/1TB: 639 €) — sobremesa para casa y estudios, teclado y ratón inalámbricos incluidos, Windows 11 Home.
- KILOBYTE Laptop 14: 599 € (16GB/512GB: 699 €; 16GB/1TB: 779 €) — portátil 14" ligero (1,3 kg), batería 12 h, Windows 11 + Office incluido.
- KILOBYTE Mini PC: 329 € (16GB/512GB: 419 €) — formato palm 12×12 cm, silencioso (15 dB), montaje VESA, doble HDMI 4K.
- KILOBYTE Box NAS: 389 € (2x2TB: 519 €; 2x4TB: 629 €) — dos bahías, RAID 1, acceso desde móvil y PC, copias automáticas.
- Servidor Small: 1190 € (32GB/2x2TB: 1490 €; 64GB/2x2TB SSD: 1890 €) — servidor de entrada para pymes: archivos, impresión y dominio con Windows Server preconfigurado.
- Servidor Pro: 2490 € (64GB/4TB: 3190 €; 128GB/8TB: 4290 €) — rack 2U, fuentes redundantes, virtualización de varias VM, SSD NVMe.
- Rack 19": 790 € (con regleta PDU: 870 €) — armario 12U con puerta de cristal y dos ventiladores.
- Switch 24 puertos: 129 € (28 puertos + 4 SFP: 219 €) — gestionable, VLANs, QoS, rack 1U.
- Router Enterprise: 249 € (con módulo Wi-Fi 6: 329 €) — doble WAN con balanceo, VPN IPsec/OpenVPN, firewall integrado.
- Firewall Hardware: 449 € (hasta 250 usuarios: 689 €) — IPS, portal cautivo, informes de amenazas, VPN sitio a sitio.
- Patch Panel 24 puertos: 59 € (Cat6A blindado: 89 €).
- Cable Fibra Óptica: 35 € (10 m: 49 €; 20 m: 79 €) — OM4, LC dúplex, hasta 40 Gbps.
- Rack PDU: 119 € (monitorizada por IP: 219 €) — 8 tomas IEC C13, formato vertical 0U.
- Transceptor SFP+: 45 € (10G-LR 10 km: 89 €).
- SAI 700VA: 89 € · SAI 1500VA: 269 € (batería ampliada 349 €) · SAI 3000VA Rack: 849 € (con tarjeta de red 999 €).

TU MISIÓN PRINCIPAL — ASESORAR EQUIPOS POR TIPO DE NEGOCIO O PROYECTO:
Cuando alguien cuente qué tipo de negocio, proyecto o uso tiene, diseña un PACK completo con productos del catálogo y explica por qué encaja cada pieza:
- Negocio de barrio (bar, tienda, peluquería, taller…): Mini PC para el TPV + SAI 700VA + soporte; Router si hay wifi para clientes.
- Despacho o consultorio (abogados, asesorías, clínicas): equipos por puesto + Servidor Small con DF Server (dominio y archivos) + Firewall Hardware + NAS para copias. Énfasis en confidencialidad.
- Pyme en crecimiento: equipos por puesto + Servidor Pro con virtualización + Switch 24 + Rack 19" + Sophos Firewall + SAI 3000VA Rack.
- Estudiante: Home PC si es fijo en casa, Laptop 14 si lo lleva a clase, Mini PC si el espacio es mínimo.
- Gaming o creación de contenido: Home PC 16 GB · 1 TB SSD (639 €), NAS para archivar proyectos, SAI para evitar sustos.
- Teletrabajo o autónomo: Laptop 14 + Router Enterprise con VPN + soporte.
- Tienda online: hosting sobre nuestra infraestructura + Sophos Firewall + NAS; énfasis en disponibilidad (SAIs) y seguridad.
- Copias de seguridad: Box NAS para casa o despacho pequeño, Servidor Small con varios usuarios; explica RAID 1.
- Montar una red de oficina: Switch 24 + Router Enterprise + Patch Panel + Rack 19" + Firewall; ofrecemos cableado y configuración.
- Media center o servidor casero: Mini PC (silencioso, VESA, doble HDMI 4K) + Box NAS si quiere almacén.
Si faltan datos clave (uso concreto, número de puestos, presupuesto), pregunta UNA cosa a la vez antes de recomendar. Ajusta el pack al presupuesto y ofrece alternativas más económicas si las hay.
Además de los packs, responde con criterio cualquier pregunta general de tecnología, informática, redes o mantenimiento, y conéctala cuando pueda con los servicios de KILOBYTE.

REGLAS DE RESPUESTA:
- Responde SIEMPRE en español, cercano y útil (2-6 frases).
- Usa solo HTML simple: <strong> para negritas y <a href="..."> para enlaces internos (servicios.html#soporte, servicios.html#sophos, servicios.html#dfserver, servicios.html#equipos, tienda.html, empresa.html, contacto.html, infraestructura.html, planificacion.html).
- NO uses Markdown (nada de **, #, ni guiones de lista): solo HTML. Emojis con moderación.
- Recomienda SIEMPRE productos concretos del catálogo con su precio exacto cuando hables de equipos.
- Si no sabes algo, sé honesto y redirige al <a href="contacto.html">formulario de contacto</a> o a la tienda.`;

let chatSession = null;

function getModel() {
  const ai = getAI(app, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: { maxOutputTokens: 512, temperature: 0.7 },
  });
}

// Envía un mensaje del usuario a Gemini y devuelve el texto (HTML) de la respuesta.
async function preguntar(texto) {
  if (!chatSession) chatSession = getModel().startChat();
  const result = await chatSession.sendMessage(texto);
  return result.response.text();
}

window.KBAI = { preguntar };
