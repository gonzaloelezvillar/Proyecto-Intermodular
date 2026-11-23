/* ============================================================
   KILOBYTE S.L. — script.js
   Menú, navbar, animaciones, formulario de contacto y chatbot
   ============================================================ */
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  /* ---------- Aviso de proyecto educativo ---------- */
  const navbarEl = document.getElementById("navbar");
  if (navbarEl && !document.querySelector(".demo-notice")) {
    const notice = document.createElement("div");
    notice.className = "demo-notice";
    notice.setAttribute("role", "note");
    const noticeText = document.createElement("span");
    noticeText.textContent = "Proyecto educativo · Demostración sin ventas ni soporte reales";
    const noticeLink = document.createElement("a");
    noticeLink.href = "planificacion.html";
    noticeLink.textContent = "Ver proyecto";
    notice.append(noticeText, noticeLink);
    navbarEl.insertAdjacentElement("afterend", notice);
  }

  /* ---------- Menú móvil ---------- */
  const hamburger = document.getElementById("hamburger");
  const navbar = document.getElementById("navbar");
  if (hamburger && navbar) {
    hamburger.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      hamburger.setAttribute("aria-expanded", String(open));
    });
    // Cerrar el menú al pulsar un enlace
    navbar.querySelectorAll(".nav-links a").forEach((a) =>
      a.addEventListener("click", () => {
        document.body.classList.remove("nav-open");
        hamburger.setAttribute("aria-expanded", "false");
      })
    );
  }

  /* ---------- Sombra del navbar al hacer scroll ---------- */
  window.addEventListener("scroll", () => {
    if (window.scrollY > 10) navbar.classList.add("scrolled");
    else navbar.classList.remove("scrolled");
  }, { passive: true });

  /* ---------- Animaciones de aparición ---------- */
  const revealEls = document.querySelectorAll(".card, .service-block, .module-row, .timeline-item, .section-head, .soon-banner");
  revealEls.forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
    }),
    { threshold: 0.12 }
  );
  revealEls.forEach((el) => io.observe(el));

  /* ---------- Formulario de contacto ---------- */
  const form = document.getElementById("contactForm");
  if (form) {
    const success = document.getElementById("formSuccess");
    const setError = (input, message) => {
      const group = input.closest(".form-group");
      group.classList.toggle("invalid", Boolean(message));
      const err = group.querySelector(".error-msg");
      if (err) err.textContent = message || "";
      return !message;
    };
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const nombre = form.nombre, empresa = form.empresa, email = form.email;
      const telefono = form.telefono, motivo = form.motivo, mensaje = form.mensaje;
      const submitBtn = form.querySelector('button[type="submit"]');
      let ok = true;
      ok &= setError(nombre, nombre.value.trim() && nombre.value.trim().length <= 80 ? "" : "Introduce un nombre de hasta 80 caracteres.");
      ok &= setError(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) ? "" : "Introduce un email válido.");
      ok &= setError(motivo, motivo.value ? "" : "Selecciona un servicio.");
      ok &= setError(mensaje, mensaje.value.trim().length >= 10 && mensaje.value.trim().length <= 2000 ? "" : "Escribe entre 10 y 2.000 caracteres.");
      ok &= setError(form.privacidad, form.privacidad.checked ? "" : "Debes aceptar la política de privacidad.");
      if (!ok) return;

      success.hidden = true;
      success.classList.remove("is-error");
      if (!window.KBDB) {
        success.textContent = "No se ha podido conectar con el servicio. Inténtalo de nuevo en unos segundos.";
        success.classList.add("is-error");
        success.hidden = false;
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Enviando…";
      try {
        await Promise.all([
          window.KBDB.guardar("form_submissions", {
          nombre: nombre.value.trim(),
          empresa: empresa.value.trim(),
          email: email.value.trim().toLowerCase(),
          telefono: telefono.value.trim(),
          motivo: motivo.value,
          mensaje: mensaje.value.trim(),
          aceptaPrivacidad: true,
          }),
          window.KBDB.guardarInterno({
            tipo: "contacto",
            nombre: nombre.value.trim(),
            empresa: empresa.value.trim(),
            email: email.value.trim().toLowerCase(),
            telefono: telefono.value.trim(),
            motivo: motivo.value,
            mensaje: mensaje.value.trim(),
          }),
        ]);
        success.textContent = "✓ Mensaje enviado. Te contactaremos lo antes posible.";
        success.hidden = false;
        form.reset();
        setTimeout(() => (success.hidden = true), 6000);
      } catch (err) {
        console.error("Error al guardar el contacto:", err);
        success.textContent = "No hemos podido enviar el mensaje. Conserva tus datos e inténtalo de nuevo.";
        success.classList.add("is-error");
        success.hidden = false;
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Enviar mensaje";
      }
    });
  }

  /* ============================================================
     CHATBOT — "Asistente de IA"
     ============================================================ */
  const fab = document.getElementById("chatFab");
  const chatbot = document.getElementById("chatbot");
  const chatBody = document.getElementById("chatBody");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const suggestions = document.getElementById("chatSuggestions");

  if (!fab || !chatbot) return;

  /* ---------- Productos de la tienda (para recomendaciones) ----------
     Se derivan del catálogo PRODUCTS de la tienda (definido más abajo)
     para no duplicar los datos en dos arrays. */
  const SHOP_BEST = {
    "kb-home": ["estudiar", "ofimatica", "casa", "multimedia", "barato"],
    "kb-laptop": ["portatil", "mover", "viajar", "bateria", "ligero", "estudiar"],
    "kb-mini": ["pequeno", "silencioso", "media center", "espacio", "secundario"],
    "kb-nas": ["copia", "backup", "almacenamiento", "fotos", "archivos", "nas"],
    "kb-server-s": ["pyme", "archivos", "dominio", "impresion", "empezar", "sencillo"],
    "kb-server-m": ["virtualiza", "crecimiento", "base de datos", "grande", "potente", "redundancia"],
  };
  let SHOP = null;
  const shopProducts = () =>
    SHOP || (SHOP = PRODUCTS.map((p) => ({ id: p.id, name: p.name, price: p.price, cat: p.cat, icon: p.icon, desc: p.desc, best: SHOP_BEST[p.id] || [] })));

  /* ---------- Estado conversacional ---------- */
  let recommendationStage = 0; // fase de la conversación de "ayuda a elegir"
  let recPrefs = {};           // preferencias del usuario (presupuesto, uso, etc.)

  /* ---------- Utilidades ---------- */
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const appendSafeBotContent = (html, parent) => {
    const template = document.createElement("template");
    template.innerHTML = String(html);

    const copySafeNodes = (source, target) => {
      source.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          target.appendChild(document.createTextNode(node.textContent || ""));
          return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const tag = node.tagName.toLowerCase();
        if (tag === "br") {
          target.appendChild(document.createElement("br"));
          return;
        }
        if (tag === "strong") {
          const strong = document.createElement("strong");
          copySafeNodes(node, strong);
          target.appendChild(strong);
          return;
        }
        if (tag === "a") {
          const href = (node.getAttribute("href") || "").trim();
          if (/^(?:[a-z0-9-]+\.html(?:#[a-z0-9-]+)?|#[a-z0-9-]+)$/i.test(href)) {
            const link = document.createElement("a");
            link.href = href;
            copySafeNodes(node, link);
            target.appendChild(link);
            return;
          }
        }
        copySafeNodes(node, target);
      });
    };

    copySafeNodes(template.content, parent);
  };

  const addMsg = (content, who) => {
    const div = document.createElement("div");
    div.className = `msg msg-${who}`;
    if (who === "user") div.textContent = String(content);
    else appendSafeBotContent(content, div);
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
  };
  /* ---------- Intenciones: cada tema tiene PALABRAS CLAVE + VARIAS respuestas ----------
     La detección usa puntuación: cuenta cuántas palabras de la frase del usuario
     coinciden con las palabras clave del tema (no exige coincidencia exacta). */
  const INTENTS = [
    {
      id: "soporte",
      words: ["soporte", "incidencia", "problema", "averia", "ayuda", "tecnico", "tecnica", "error", "fallo", "roto", "ordenador no va", "no funciona", "reparar", "arreglar", "lento", "pantalla azul", "se ha bloqueado", "no arranca", "teleasistencia"],
      answers: [
        'Nuestro servicio principal es el <strong>soporte informático completo</strong>: atendemos incidencias, resolvemos problemas de software desde tu casa (teleasistencia), mantenemos equipos y configuramos tu red. 👉 <a href="servicios.html#soporte">Más información</a> o <a href="contacto.html">solicita soporte</a>.',
        '¿Tienes algún equipo o programa que no va bien? Con nuestro <strong>soporte completo</strong> lo miramos: incidencias con respuesta rápida, teleasistencia y mantenimiento. 👉 <a href="servicios.html#soporte">Ver detalles</a>',
        'Eso lo resolvemos con el <strong>soporte informático</strong>, nuestro servicio estrella 💬. Atendemos la incidencia de principio a fin. Si prefieres, <a href="contacto.html">cuéntanos tu caso</a> y te llamamos.',
      ],
    },
    {
      id: "seguridad",
      words: ["sophos", "firewall", "seguridad", "ataque", "virus", "hackeo", "proteger", "proteccion", "robar datos", "malware", "ciber", "phishing", "ransomware", "vpn"],
      answers: [
        'Con <strong>Sophos Firewall</strong> protegemos la red de tu empresa frente a ataques: protección perimetral, control de accesos y tráfico. 👉 <a href="servicios.html#sophos">Más información</a>',
        'La seguridad es uno de nuestros tres frentes 🔒: instalamos y mantenemos un <strong>firewall profesional Sophos</strong> que blinda la red corporativa. 👉 <a href="servicios.html#sophos">Ver detalles</a>',
        'Para proteger la red y los datos usamos <strong>Sophos Firewall</strong>, configurado por nuestro equipo: bloquea ataques y controla el tráfico. ¿Te preparamos un <a href="contacto.html">presupuesto</a>?',
      ],
    },
    {
      id: "servidor",
      words: ["df server", "dfserver", "servidor", "dominio", "archivos compartidos", "active directory", "centralizar", "windows server"],
      answers: [
        '<strong>DF Server</strong> es nuestro software de servidor: centraliza archivos, dominios y servicios de red de tu empresa desde un solo panel. Lo instalamos sobre Windows Server en máquinas virtuales, adaptado al tamaño de tu empresa. 👉 <a href="servicios.html#dfserver">Más información</a>',
        'Con <strong>DF Server</strong> centralizamos lo que tu empresa necesita: es un software de servidor de archivos y dominios, escalable y que se instala en entorno virtual. 👉 <a href="servicios.html#dfserver">Ver detalles</a>',
        'Si tu empresa necesita centralizar archivos, dominios y servicios de red, el <strong>software DF Server</strong> se adapta a ti: lo configuramos e instalamos nosotros. 🗄️',
      ],
    },
    {
      id: "equipos",
      words: ["equipo", "equipos", "ordenador", "ordenadores", "comprar", "material", "hardware", "puesto", "puestos", "pc", "portatil"],
      answers: [
        'Ofrecemos <strong>ordenadores, servidores y material</strong> para los puestos de trabajo, con asesoría para elegir lo adecuado. 👉 <a href="servicios.html#equipos">Más información</a> · <a href="tienda.html">Ver tienda</a>',
        'Tenemos <strong>equipos para personas y para empresas</strong>: sobremesa, portátiles, mini PCs y servidores. ¿Quieres que te <strong>ayude a elegir</strong>? Dime para qué lo necesitas y tu presupuesto. 🛒 <a href="tienda.html">Ver tienda</a>',
        'En la <a href="tienda.html">tienda</a> tienes todo el catálogo: Home PC, Laptop 14, Mini PC, Box NAS, servidores, material de red y SAIs. Dime tu uso y presupuesto y te recomiendo el mejor. 💻',
      ],
    },
    {
      id: "ia",
      words: ["ia", "inteligencia artificial", "automatiza", "automatizacion", "chatgpt", "bot", "ia para empresas"],
      answers: [
        '<strong>Próximamente</strong> ofreceremos servicios de IA para automatizar procesos en empresas. ¡Estate atento! 🤖',
        'Estamos desarrollando <strong>servicios de IA</strong> para empresas: automatizar tareas y procesos repetitivos. Aún no está disponible, pero puedes <a href="contacto.html">preguntarnos</a>.',
        'De hecho, ¡estás hablando con una muestra! 😄 Este asistente es parte de nuestra apuesta por la IA. Los servicios de IA para empresas llegarán pronto.',
      ],
    },
    {
      id: "empresa",
      words: ["quienes", "quien sois", "quienes sois", "empresa", "sobre vosotros", "kilobyte", "que haceis", "que hacen", "mision", "filosofia", "historia"],
      answers: [
        '<strong>KILOBYTE S.L.</strong> es una empresa informática que ayuda a otras empresas a crecer con la tecnología. Trabajamos en tres frentes: 🛠️ soporte, 🔒 seguridad y 🖥️ equipos y servidores. Tu negocio pasa de KB a GB con nosotros. 👉 <a href="empresa.html">Conócenos</a>',
        'Somos <strong>KILOBYTE S.L.</strong>: nos ocupamos de que la tecnología de tu empresa funcione (equipos que no fallen, redes seguras y alguien que responda cuando algo va mal), para que tú te centres en tu negocio. 👉 <a href="empresa.html">La empresa</a>',
        'Nuestro nombre resume la filosofía: cualquier negocio empieza siendo pequeño (KB), pero con la tecnología adecuada puede crecer sin límites (MB → GB). Ofrecemos soporte, seguridad y equipamiento. 👉 <a href="empresa.html">Conócenos</a>',
      ],
    },
    {
      id: "contacto",
      words: ["contact", "contactar", "correo", "email", "telefono", "llamar", "escribir", "hablar con alguien", "atencion al cliente", "servicio al cliente"],
      answers: [
        'Puedes usar nuestro <a href="contacto.html">formulario de contacto</a> o el botón «Servicio al cliente». También: 📧 <strong>info@kilobyte.es</strong> · 📞 <strong>900 000 000</strong> (24/7).',
        'Lo más rápido es el <a href="contacto.html">formulario de contacto</a>: cuéntanos qué necesitas y te preparamos una propuesta. Si lo prefieres, escríbenos a info@kilobyte.es o llama al 900 000 000.',
        'Estamos a un clic: <a href="contacto.html">formulario de contacto</a>, 📧 info@kilobyte.es o 📞 900 000 000. ¿Sobre qué servicio quieres que te contactemos?',
      ],
    },
    {
      id: "infraestructura",
      words: ["infraestructur", "base de datos", "heidisql", "sai", "nube", "cloud", "maquina virtual", "maquinas virtuales", "servidores web", "backup servidor", "disponibilidad"],
      answers: [
        'Trabajamos con un <strong>servidor web</strong> (aloja la web y este chatbot), un <strong>servidor de datos</strong> (base de datos MySQL/MariaDB gestionada con HeidiSQL, en 8 tablas), todo en <strong>máquinas virtuales</strong> y con <strong>SAIs</strong> que aseguran la disponibilidad. La versión pública de la web corre además en Firebase Hosting y los datos de la web se guardan en Firestore. 👉 <a href="infraestructura.html">Ver infraestructura</a>',
        'Nuestra infraestructura está pensada para la continuidad del servicio 🌐: servidores web y de datos virtualizados, base de datos MySQL/MariaDB administrada con HeidiSQL, y SAIs contra cortes de luz. La web pública se sirve desde Firebase y los datos se replican en nuestro servidor. 👉 <a href="infraestructura.html">Ver detalles</a>',
        'Todo lo que ves en esta web funciona sobre nuestra propia infraestructura: servidor web, servidor de datos (HeidiSQL), máquinas virtuales y SAIs para que nada se pare. ☁️',
      ],
    },
    {
      id: "precio",
      words: ["precio", "precios", "presupuesto", "coste", "cuanto cuesta", "tarifa", "cuanto vale", "caro", "barato"],
      answers: [
        'Cada proyecto es distinto: pide un <a href="contacto.html">presupuesto sin compromiso</a> contándonos qué necesita tu empresa y te preparamos una propuesta.',
        'Depende de lo que necesites. En la <a href="tienda.html">tienda</a> verás precios de los equipos (desde 329 €), y para servicios te preparamos un <a href="contacto.html">presupuesto a medida</a>.',
        'Los equipos tienen precio cerrado en la <a href="tienda.html">tienda</a>; los servicios se presupuestran según tu caso. <a href="contacto.html">Cuéntanos qué necesitas</a> y sin compromiso te decimos.',
      ],
    },
    {
      id: "proyecto",
      words: ["proyecto", "modulo", "fase", "planificacion", "fp", "smr", "ribera del tajo", "que queda por hacer"],
      answers: [
        'El proyecto se organiza en <strong>5 fases</strong>: diseño → servidores y red → web y chatbot → seguridad y nube → pruebas y entrega, aplicando los módulos de 2º SMR. 👉 <a href="planificacion.html">Ver el proyecto</a>',
        'Es un proyecto de <strong>Proyecto Intermodular de 2º SMR</strong> (IES Ribera del Tajo): planificación, infraestructura, web, chatbot y seguridad. 👉 <a href="planificacion.html">Ver planificación</a>',
      ],
    },
    {
      id: "tienda",
      words: ["tienda", "catalogo", "carrito", "producto", "productos", "comprar equipo", "donde compro", "nas", "mini pc", "laptop"],
      answers: [
        'En la <a href="tienda.html">tienda</a> tenemos: 🖥️ Home PC, 💻 Laptop 14, 📦 Mini PC, 🗃️ Box NAS, 🗄️ servidores, 🌐 material de red y 🔋 SAIs. ¿Quieres que te <strong>ayude a elegir</strong> uno? Dime uso y presupuesto.',
        'El catálogo está en la <a href="tienda.html">tienda</a>, con filtros para personas y empresas. Si no sabes cuál encaja mejor, cuéntame para qué lo quieres y te lo recomiendo. 🛒',
      ],
    },

    /* ---------- Guías por tipo de negocio / proyecto ---------- */
    {
      id: "negocio_tienda",
      words: ["tienda de barrio", "charcuteria", "panaderia", "fruteria", "carniceria", "bar", "cafeteria", "restaurante", "peluqueria", "barberia", "taller", "papeleria", "farmacia"],
      answers: [
        'Para un negocio pequeño de calle 🏪 te propongo un pack sencillo: un <strong>KILOBYTE Mini PC</strong> (329 €) para el TPV y la caja, un <strong>SAI 700VA</strong> (89 €) para que el corte de luz no te pare el cobro, y nuestro <strong>soporte</strong> para cuando algo falle. Si quieres wifi para clientes o seguridad, añade un <strong>Router Enterprise</strong> (249 €). ¿Cuántos puestos tienes?',
        'Los negocios de barrio lo que necesitan es fiabilidad: 📦 <strong>Mini PC</strong> (329 €) + 🔋 <strong>SAI 700VA</strong> (89 €) + nuestro <strong>soporte 24/7</strong>. Con eso tienes caja, facturación y tranquilidad. Si me dices el tipo de negocio afino más.',
      ],
    },
    {
      id: "negocio_despacho",
      words: ["despacho", "abogacia", "abogados", "asesoria", "gestoria", "consultora", "notaria", "arquitectura", "estudio", "clinica", "dentista", "fisioterapia", "veterinaria", "consultorio", "una asesoria", "mi despacho"],
      answers: [
        'Para un despacho o consultorio 🏥 lo importante es que los datos estén centralizados y protegidos: 💻 <strong>Laptop 14</strong> u <strong>Home PC</strong> (449-599 €) por puesto, un <strong>Servidor Small</strong> (1.190 €) con <strong>DF Server</strong> para archivos y dominio, <strong>Sophos Firewall</strong> por la confidencialidad, y <strong>Box NAS</strong> para copias de seguridad. ¿Cuántos profesionales trabajáis?',
        'Despachos y consultas manejan datos sensibles 🔐: te recomiendo <strong>equipos de trabajo</strong> (desde 449 €) + <strong>Servidor Small</strong> (1.190 €) + <strong>Firewall Hardware</strong> (449 €) + <strong>SAI</strong> para el servidor. Lo montamos, lo dejamos funcionando y luego lo mantenemos nosotros. ¿Te detallo el presupuesto?',
      ],
    },
    {
      id: "negocio_pyme",
      words: ["pyme", "empresa mediana", "fábrica", "fabrica", "almacen", "logistica", "transporte", "constructora", "inmobiliaria", "50 empleados", "100 empleados", "crecer", "expansion"],
      answers: [
        'Para una pyme en crecimiento 📈 el plan que suele funcionar: 💻 equipos por puesto (449-699 € según uso), 🗄️ <strong>Servidor Pro</strong> (2.490 €) con virtualización, 🌐 <strong>Switch 24 puertos</strong> + <strong>Rack 19"</strong> para ordenar la red, 🛡️ <strong>Sophos Firewall</strong> y 🔋 <strong>SAI 3000VA Rack</strong> para el servidor. Todo con nuestro mantenimiento. ¿Qué tamaño tiene la empresa?',
        'Empresas medianas necesitan de verdad un <strong>sistema</strong>, no equipos sueltos: servidor con dominio y archivos, red estructurada en rack, firewall y SAIs. Ese es justo nuestro terreno: te montamos la infraestructura completa y la mantenemos. Cuéntame en <a href="contacto.html">contacto</a> cuántos empleados tenéis. 🚀',
      ],
    },
    {
      id: "negocio_estudiante",
      words: ["estudiante", "estudiar", "universidad", "instituto", "clases", "apuntes", "examen", "colegio", "formacion", "curso online"],
      answers: [
        'Si es para estudiar 📚 lo mejor por precio es el <strong>KILOBYTE Home PC</strong> (449 €): sobremesa con teclado y ratón incluidos, perfecto para apuntes, ofimática y clases online. Si necesitas llevarlo a clase o la biblioteca, el <strong>Laptop 14</strong> (599 €) con batería de 12 h. Y si el espacio es mínimo, el <strong>Mini PC</strong> (329 €). ¿Lo llevarás de un sitio a otro?',
        'Para estudiar te recomiendo mirar dos: 🖥️ <strong>Home PC</strong> (449 €) si va fijo en casa, o 💻 <strong>Laptop 14</strong> (599 €) si lo quieres mover. Los dos vienen con Windows 11 y Office listos para trabajar. ¿Cuál te encaja mejor?',
      ],
    },
    {
      id: "negocio_gamer",
      words: ["gaming", "gamer", "jugar", "videojuegos", "juegos", "streaming", "montar videos", "edicion video", "diseno grafico", "render", "photoshop", "premiere"],
      answers: [
        'Para jugar o crear contenido 🎮 lo que importa es potencia y disco rápido: te sugiero el <strong>Home PC</strong> con la variante de <strong>16 GB RAM · 1 TB SSD</strong> (639 €) y, si vas a editar vídeo, la <strong>Box NAS</strong> (389 €) para archivar proyectos. El <strong>SAI 700VA</strong> evita sustos con los cortes de luz. ¿Jugar, editar o las dos cosas?',
        'Gaming y edición requieren equipo con holgura: 💻 <strong>Home PC 16 GB · 1 TB SSD</strong> (639 €) va sobrado para juegos y ofimática pesada. Si editas vídeo, añade 🗃️ <strong>Box NAS</strong> (389 €) para tener los proyectos y copias aparte. ¿Cuál es tu presupuesto?',
      ],
    },
    {
      id: "negocio_teletrabajo",
      words: ["teletrabajo", "trabajar en casa", "oficina en casa", "remoto", "home office", "freelance", "autonomo", "autonoma"],
      answers: [
        'Para teletrabajar o como autónomo 🏠 lo cómodo es un 💻 <strong>Laptop 14</strong> (599 €) que puedas mover entre casa y oficina, más un <strong>Router Enterprise</strong> (249 €) con VPN para conectarte con seguridad a la red de tu cliente o empresa. Si guardas documentos de clientes, la <strong>Box NAS</strong> (389 €) te da copias locales. ¿Trabajas solo o en equipo?',
        'Teletrabajo necesita sobre todo conexión segura 🔐: te recomiendo 💻 <strong>Laptop 14</strong> (599 €) + 🌐 <strong>Router Enterprise con VPN</strong> (249 €) + nuestro <strong>soporte</strong> para cuando algo se atasque. ¿Quieres que te arme el pack?',
      ],
    },
    {
      id: "negocio_tienda_online",
      words: ["tienda online", "ecommerce", "ecommerce", "vender por internet", "dropshipping", "web propia", "crear mi web", "pagina web para mi negocio"],
      answers: [
        'Para montar una tienda online 🛒 necesitas tres cosas: un sitio web estable, seguridad y copias. Nosotros lo cubrimos con <strong>hosting sobre nuestro servidor web</strong> (virtualizado y con SAI), <strong>Sophos Firewall</strong> para la tienda y el <strong>soporte</strong> para cuando quieras cambiar algo. Si además gestionas stock, un <strong>Box NAS</strong> (389 €) te sirve de almacén de datos. ¿Ya tienes la web o empezamos de cero?',
        'E-commerce: 🔒 seguridad + ☁️ disponibilidad + 💾 copias. Con nuestra <strong>infraestructura propia</strong> (servidor web y de datos con SAIs) tu tienda no se cae por un corte de luz, y con <strong>Sophos</strong> ni por un ataque. Cuéntame qué vas a vender y te oriento. 😊',
      ],
    },
    {
      id: "negocio_datos",
      words: ["copias de seguridad", "backup", "guardar archivos", "almacenamiento", "fotos", "documentos", "perder datos", "disco lleno", "espacio"],
      answers: [
        'Si lo que buscas es no perder datos nunca más 💾 la respuesta clara es la <strong>Box NAS</strong> (389 €, con 2 discos desde 519 €): copias automáticas de todos tus equipos, acceso desde el móvil y RAID 1 (los datos se duplican en dos discos). Para empresa, el <strong>Servidor Small</strong> añade control de accesos por usuario. ¿Sería para casa o para el trabajo?',
        'Guardado y copias de seguridad: 🗃️ <strong>Box NAS</strong> (389 €) para casa o despacho pequeño, 🗄️ <strong>Servidor Small</strong> (1.190 €) si son varios usuarios. Los dos configuramos nosotros las copias programadas el primer día. 👉 <a href="tienda.html">Ver en la tienda</a>',
      ],
    },
    {
      id: "negocio_red",
      words: ["montar una red", "red de la oficina", "montar la red", "mi red", "cablear", "cableado", "wifi", "wi-fi", "conectar ordenadores", "switch", "rack", "armario", "instalar una red", "red de oficina", "red en mi"],
      answers: [
        'Para montar la red de una oficina 🔧 la receta habitual: 🌐 <strong>Switch 24 puertos</strong> (129 €), <strong>Router Enterprise</strong> (249 €), <strong>Patch Panel</strong> (59 €) y <strong>Rack 19"</strong> (790 €) para tenerlo todo ordenado, con <strong>Firewall</strong> (449 €) cerrando el perímetro. Nosotros cableamos y configuramos si lo pides. ¿Cuántos puestos de red necesitas?',
        'Redes de oficina las montamos de arriba abajo: cableado, switch, router, firewall y rack. Materiales los tienes en la <a href="tienda.html">tienda</a> (switch desde 129 €, router 249 €, rack 790 €) y la instalación la hacemos nosotros. ¿Me dicas el tamaño de la oficina?',
      ],
    },
    {
      id: "negocio_servidor_casero",
      words: ["servidor casero", "media center", "kod", "kodi", "plex", "hometheater", "salón", "salon tv", "tv box", "htpc"],
      answers: [
        'Como media center o equipo de salón 📺 el <strong>KILOBYTE Mini PC</strong> (329 €) es ideal: silencioso (15 dB), cabe detrás del televisor con su montaje VESA y saca doble HDMI 4K. Consume menos de 15 W, así que puede estar encendido siempre. ¿Lo usarás también para algo más?',
        'Para un equipo de salón o servidor casero ligero: 📦 <strong>Mini PC</strong> (329 €) es silencioso y discreto. Si además quieres copias, combínalo con la <strong>Box NAS</strong> (389 €) y tienes cine y almacenamiento en uno. 🍿',
      ],
    },

    {
      id: "saludo",
      words: ["hola", "buenas", "buenos dias", "buenas tardes", "hey", "saludos", "que tal"],
      answers: [
        '¡Hola! 👋 ¿En qué puedo ayudarte? Puedo contarte sobre los servicios, ayudarte a <strong>elegir un equipo</strong> o decirte cómo contactarnos.',
        '¡Buenas! 😊 Soy el asistente de KILOBYTE S.L. ¿Buscas un servicio, un equipo o información de la empresa?',
        '¡Hola! Encantado de saludarte. Dime qué necesitas: soporte, seguridad, equipos… o escríbeme directamente tu duda.',
      ],
    },
    {
      id: "despedida",
      words: ["gracias", "adios", "hasta luego", "chao", "nos vemos", "vale gracias"],
      answers: [
        '¡De nada! 😊 Si necesitas algo más, aquí estaré. Que tu negocio pase de KB a GB muy pronto.',
        '¡Un placer! No dudes en volver cuando quieras. 👋',
        'Para eso estamos. ¡Hasta pronto! 🚀',
      ],
    },
    {
      id: "identidad",
      words: ["te llamas", "quien eres", "que eres", "eres un bot", "eres humano", "eres una ia", "como te llamas"],
      answers: [
        'Soy el <strong>asistente de IA de KILOBYTE S.L.</strong> 🤖 Conozco la empresa, los servicios y el catálogo de la tienda. Pregúntame lo que quieras.',
        'Soy un asistente virtual creado por KILOBYTE S.L. para ayudarte a conocer la web, resolver dudas y recomendarte equipos. No soy humano, pero para eso estoy. 😄',
      ],
    },
    {
      id: "ayudar_elegir",
      words: ["ayudame a elegir", "ayuda a elegir", "que me recomiendas", "que recomiendas", "cual compro", "cual es mejor", "no se cual", "recomendacion", "que necesito", "que equipo me va", "que me conviene"],
      answers: [], // se gestiona con el flujo conversacional de recomendación (ver abajo)
    },
  ];

  const DEFAULTS = [
    'No estoy seguro de haber entendido 🤔. Puedo contarte sobre nuestros <strong>servicios</strong>, la <strong>empresa</strong>, la <strong>infraestructura</strong>, ayudarte a <strong>elegir un equipo</strong> o decirte cómo <a href="contacto.html">contactarnos</a>.',
    'Mmm, esa no la tengo clara 😅. Prueba a preguntarme por los <strong>servicios</strong>, la <strong>tienda</strong>, la <strong>seguridad</strong> o cómo contactarnos. También te puedo aconsejar <strong>equipos para tu tipo de negocio</strong> (bar, despacho, pyme, teletrabajo…).',
    'No he pillado del todo la pregunta 🤖. ¿Te ayudo a elegir un equipo, te interesa algún servicio o quieres saber más de KILOBYTE?',
  ];

  /* ---------- Motor de comprensión: puntuación por palabras ---------- */
  const findAnswer = (text) => {
    const t = norm(text);
    let best = null, bestScore = 0;
    for (const intent of INTENTS) {
      let score = 0;
      for (const w of intent.words) {
        if (t.includes(norm(w))) score += w.includes(" ") ? 3 : 2; // frases pesan más
      }
      if (intent.id.startsWith("negocio_") && score > 0) score += 3; // asesoría por tipo de negocio: prioridad
      if (score > bestScore) { best = intent; bestScore = score; }
    }
    if (best && best.id === "ayudar_elegir") {
      recommendationStage = 1;
      recPrefs = {};
      return pick([
        '¡Vamos a ello! 🛒 Para recomendarte el mejor equipo, cuéntame: <strong>¿para qué lo vas a usar?</strong> (estudiar/ofimática en casa, trabajar con más potencia, guardar archivos o para una empresa con servidor).',
        'Perfecto, te ayudo a elegir 😊 Dime primero: <strong>¿qué uso le vas a dar?</strong> ¿Es para casa (estudios, ofimática, multimedia), para guardar copias, o para tu empresa (servidor)?',
      ]);
    }
    if (best) return pick(best.answers);
    return pick(DEFAULTS);
  };

  /* ---------- Flujo de ayuda para elegir (multi-paso) ---------- */
  const recommendFor = (prefs) => {
    const budget = prefs.budget || Infinity;
    const use = prefs.use || "hogar";
    const scored = shopProducts().map((p) => {
      let s = 0;
      if (budget >= p.price) s += 3; // cabe en presupuesto
      const useWords = { hogar: ["estudiar", "ofimatica", "casa", "multimedia"], movil: ["portatil", "mover", "viajar", "ligero", "bateria"], mini: ["pequeno", "silencioso", "espacio", "secundario", "media center"], almacen: ["copia", "backup", "almacenamiento", "fotos", "archivos", "nas"], empresa: ["pyme", "archivos", "dominio", "empezar", "sencillo", "servidor"] }[use] || [];
      s += useWords.filter((w) => p.best.includes(w)).length * 2;
      if (use === "empresa" && p.cat === "servidor") s += 2;
      if (use === "almacen" && p.id === "kb-nas") s += 3;
      s -= p.price / 3000; // empates: prefiere más barato
      return { p, s };
    }).sort((a, b) => b.s - a.s);
    const top = scored[0].p, alt = scored[1].p;
    return pick([
      `Para lo que me cuentas, mi recomendación es el <strong>${top.name}</strong> (${top.price} €): ${top.desc} 🛒 <a href="tienda.html">Verlo en la tienda</a>. También mira el <strong>${alt.name}</strong> (${alt.price} €) por si prefieres esa alternativa.`,
      `Yo te iría al <strong>${top.name}</strong> (${top.price} €) — ${top.desc} La otra opción que valdría es el <strong>${alt.name}</strong> (${alt.price} €). Los dos están en la <a href="tienda.html">tienda</a>.`,
      `Mi apuesta: <strong>${top.name}</strong>, por ${top.price} €. ${top.desc} Si quieres comparar, el <strong>${alt.name}</strong> (${alt.price} €) también encaja. ¿Te paso a la <a href="tienda.html">tienda</a>? 😊`,
    ]);
  };

  const replyTo = (text) => {
    addMsg("…", "bot");
    const typingEl = chatBody.lastChild;
    const respondeLocal = () => {
      typingEl.remove();
      const t = norm(text);
      if (recommendationStage === 1) {
        // Paso 1: detectar el uso
        let use = null;
        if (/(casa|estudi|ofimatic|multimedia|naveg)/.test(t)) use = "hogar";
        else if (/(portatil|viaj|mover|ligero|liviano)/.test(t)) use = "movil";
        else if (/(pequen|silencioso|espacio|mini|secundario)/.test(t)) use = "mini";
        else if (/(copia|backup|almacen|fotos|archivo|nas)/.test(t)) use = "almacen";
        else if (/(empresa|servidor|dominio|pyme|negocio|trabajo)/.test(t)) use = "empresa";
        if (use) {
          recPrefs.use = use;
          recommendationStage = 2;
          addMsg(pick([
            '¡Anotado! 📝 Y ¿qué <strong>presupuesto</strong> tienes aproximadamente? (p. ej. "unos 400 €", "hasta 600", "sin límite")',
            'Perfecto 😊 Ahora dime tu <strong>presupuesto aproximado</strong> para ajustar la recomendación.',
          ]), "bot");
          return;
        }
        addMsg('Ayúdame a afinar 🤔: ¿lo quieres para <strong>casa/estudios</strong>, algo <strong>portátil</strong>, para <strong>guardar copias</strong> o para una <strong>empresa</strong>?', "bot");
        return;
      }
      if (recommendationStage === 2) {
        const m = t.match(/(\d{2,5})/);
        recPrefs.budget = m ? parseInt(m[1], 10) : Infinity;
        recommendationStage = 0;
        addMsg(recommendFor(recPrefs), "bot");
        return;
      }
      addMsg(findAnswer(text), "bot");
    };
    // Chatbot con Gemini (Firebase AI Logic); fallback local si no está disponible.
    const preguntarIA = () => (window.KBAI ? window.KBAI.preguntar(text) : Promise.reject(new Error("no-ai")));
    preguntarIA()
      .then((respuesta) => {
        typingEl.remove();
        addMsg(respuesta, "bot");
      })
      .catch(() => {
        // Gemini no disponible (SDK aún cargando o error): respuesta programada
        setTimeout(respondeLocal, 450);
      });
  };

  const toggleChat = (open) => {
    chatbot.classList.toggle("open", open);
    fab.style.display = open ? "none" : "grid";
    if (open && !chatBody.childElementCount) {
      addMsg("¡Hola! 👋 Soy el asistente de IA de KILOBYTE S.L., potenciado con Gemini.", "bot");
      addMsg('Puedo contarte sobre los servicios, la empresa y la infraestructura, <strong>diseñarte un pack de equipos para tu tipo de negocio</strong> (bar, despacho, pyme, teletrabajo, tienda online…) o responder cualquier duda de informática. ¿Qué necesitas?', "bot");
    }
    if (open) chatInput.focus();
  };

  fab.addEventListener("click", () => toggleChat(true));
  document.getElementById("chatClose").addEventListener("click", () => toggleChat(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggleChat(false); });

  // Sugerencias rápidas
  const QUICK = [
    "Tengo un bar y necesito un equipo",
    "Equipos para una asesoría con 4 personas",
    "¿Qué PC me vale para estudiar?",
    "Quiero montar la red de mi oficina",
    "¿Qué servicios ofrecéis?",
    "¿Cómo contactaros?",
  ];
  QUICK.forEach((q) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = q;
    b.addEventListener("click", () => { addMsg(q, "user"); replyTo(q); });
    suggestions.appendChild(b);
  });

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    addMsg(text, "user");
    chatInput.value = "";
    replyTo(text);
  });

  /* ============================================================
     TIENDA — catálogo + carrito de la compra
     ============================================================ */
  const grid = document.getElementById("shopGrid");
  const PRODUCTS = [
    // Para personas
    {
        id: "kb-home", cat: "hogar", icon: "🖥️", name: "KILOBYTE Home PC", price: 449, tag: "Para personas",
        img: "images/productos/serversmall.png",
        desc: "Ordenador de sobremesa para casa y estudios: ofimática, navegación y multimedia sin complicaciones.",
        specs: ["Micro ATX con fuente 500W silenciosa", "Chasis compacto con frontal USB-C", "Windows 11 Home preinstalado", "Teclado y ratón inalámbricos incluidos"],
        variants: [
          { name: "8 GB RAM · 256 GB SSD", price: 449 },
          { name: "16 GB RAM · 512 GB SSD", price: 549 },
          { name: "16 GB RAM · 1 TB SSD", price: 639 },
        ],
      },
      {
        id: "kb-laptop", cat: "hogar", icon: "💻", name: "KILOBYTE Laptop 14", price: 599, tag: "Para personas",
        img: "images/productos/MiniPC.png",
        desc: "Portátil ligero de 14\" para trabajar o estudiar desde cualquier sitio, con SSD y batería para todo el día.",
        specs: ["Pantalla IPS Full HD de 14\"", "Batería de 12 h de autonomía", "Peso de 1,3 kg con cargador compacto", "Windows 11 Home + Office incluido"],
        variants: [
          { name: "8 GB RAM · 256 GB SSD", price: 599 },
          { name: "16 GB RAM · 512 GB SSD", price: 699 },
          { name: "16 GB RAM · 1 TB SSD", price: 779 },
        ],
      },
      {
        id: "kb-mini", cat: "mini", icon: "📦", name: "KILOBYTE Mini PC", price: 329, tag: "Equipo pequeño",
        img: "images/productos/MiniPC.png",
        desc: "Equipo pequeño y silencioso que cabe en la palma de la mano: perfecto para media center, oficina o puesto secundario.",
        specs: ["Formato palm de 12 × 12 cm, solo 15 dB", "Montaje VESA detrás del monitor", "Doble salida HDMI 4K", "Consumo de menos de 15 W en reposo"],
        variants: [
          { name: "8 GB RAM · 256 GB SSD", price: 329 },
          { name: "16 GB RAM · 512 GB SSD", price: 419 },
        ],
      },
      {
        id: "kb-nas", cat: "mini", icon: "🗃️", name: "KILOBYTE Box NAS", price: 389, tag: "Equipo pequeño",
        img: "images/productos/NAS.png",
        desc: "Caja compacta para tener tus archivos en casa: copias de seguridad, fotos y documentos siempre a mano.",
        specs: ["Dos bahías para discos de 3,5\" o 2,5\"", "RAID 1 por software para duplicar tus datos", "Acceso desde móvil y PC de casa", "Copias automáticas programadas"],
        variants: [
          { name: "Sin discos", price: 389 },
          { name: "Con 2 × 2 TB", price: 519 },
          { name: "Con 2 × 4 TB", price: 629 },
        ],
      },
      // Servidores
      {
        id: "kb-server-s", cat: "servidor", icon: "🗄️", name: "Servidor Small", price: 1190, tag: "Servidor",
        img: "images/productos/serversmall.png",
        desc: "Servidor de entrada para pymes: archivos, impresión y dominio con Windows Server preconfigurado.",
        specs: ["Chasis torre compacto y silencioso", "Gestión de hasta 4 discos (hot-swap)", "Red Gigabit doble con tolerancia a fallos", "Instalación y puesta en marcha incluidas"],
        variants: [
          { name: "Xeon E · 16 GB RAM · 2 TB HDD", price: 1190 },
          { name: "Xeon E · 32 GB RAM · 2 × 2 TB HDD", price: 1490 },
          { name: "Xeon E · 64 GB RAM · 2 × 2 TB SSD", price: 1890 },
        ],
      },
      {
        id: "kb-server-m", cat: "servidor", icon: "🗄️", name: "Servidor Pro", price: 2490, tag: "Servidor",
        img: "images/productos/ServerRack.png",
        desc: "Servidor rack para empresas en crecimiento: virtualización, bases de datos y servicios de red con redundancia.",
        specs: ["Formato rack 2U con fuentes redundantes", "Preparado para virtualización de varias VM", "Soporte para discos SSD NVMe en bases de datos", "Copias de seguridad configuradas el primer día"],
        variants: [
          { name: "Rack 2U · 64 GB RAM · 4 TB SSD", price: 2490 },
          { name: "Rack 2U · 128 GB RAM · 8 TB SSD", price: 3190 },
          { name: "Rack 2U · 256 GB RAM · 16 TB SSD", price: 4290 },
        ],
      },
      {
        id: "kb-rack", cat: "servidor", icon: "🏢", name: "Rack 19\"", price: 790, tag: "Servidor",
        img: "images/productos/Rack.png",
        desc: "Armario rack 19\" para montar tu servidor y la electrónica de red ordenados y ventilados.",
        specs: ["12 U útiles con puerta de cristal", "Dos ventiladores de extracción incluidos", "Bandeja deslizante para teclado y ratón", "Cierre con llave y patas regulables"],
        variants: [
          { name: "12 U · suelo", price: 790 },
          { name: "12 U · con regleta PDU", price: 870 },
        ],
      },
      // Redes
      {
        id: "kb-switch", cat: "red", icon: "🔀", name: "Switch 24 puertos", price: 129, tag: "Red",
        img: "images/productos/switch24-28.png",
        desc: "Switch gestionable de 24 puertos Gigabit para dar servicio a toda la red de tu empresa u oficina.",
        specs: ["24 puertos Gigabit RJ45", "Gestión con VLANs y QoS", "Formato rack 19\" de 1U", "Presupuesto de energía PoE opcional"],
        variants: [
          { name: "24 puertos", price: 129 },
          { name: "28 puertos · 4 SFP", price: 219 },
        ],
      },
      {
        id: "kb-router", cat: "red", icon: "🌐", name: "Router Enterprise", price: 249, tag: "Red",
        img: "images/productos/RouterEnterprise.png",
        desc: "Router profesional con firewall integrado para gestionar el tráfico y la seguridad de tu red empresarial.",
        specs: ["Doble WAN con balanceo de carga", "VPN IPsec / OpenVPN para teletrabajo", "Firewall y filtrado por contenido", "Puertos LAN Gigabit + SFP"],
        variants: [
          { name: "Estándar", price: 249 },
          { name: "Con módulo Wi-Fi 6", price: 329 },
        ],
      },
      {
        id: "kb-firewall", cat: "red", icon: "🛡️", name: "Firewall Hardware", price: 449, tag: "Red",
        img: "images/productos/firewall.png",
        desc: "Firewall perimetral para proteger tu red de intrusiones, malware y accesos no autorizados.",
        specs: ["IPS con actualizaciones automáticas", "Portal cautivo para invitados", "Informes de tráfico y amenazas", "Soporte para VPN sitio a sitio"],
        variants: [
          { name: "Hasta 50 usuarios", price: 449 },
          { name: "Hasta 250 usuarios", price: 689 },
        ],
      },
      {
        id: "kb-patchpanel", cat: "red", icon: "🔌", name: "Patch Panel 24 puertos", price: 59, tag: "Red",
        img: "images/productos/PatchPanel.png",
        desc: "Patch panel de 24 puertos Cat6 para ordenar y etiquetar todas las conexiones de tu rack.",
        specs: ["24 puertos RJ45 Cat6", "Formato rack 19\" de 1U", "Pasamuros incluido con etiquetas", "Toma de cable trasera con gestor"],
        variants: [
          { name: "Cat6 UTP", price: 59 },
          { name: "Cat6A blindado", price: 89 },
        ],
      },
      {
        id: "kb-cable-fibra", cat: "red", icon: "🧵", name: "Cable Fibra Óptica", price: 35, tag: "Red",
        img: "images/productos/Cable_FibraOptica.png",
        desc: "Cable de fibra óptica preconectorado para enlaces troncales entre switchs a alta velocidad.",
        specs: ["Fibra OM4 multimodo", "Conectores LC duplex", "Velocidad de hasta 40 Gbps", "Disponible en varias longitudes"],
        variants: [
          { name: "5 metros", price: 35 },
          { name: "10 metros", price: 49 },
          { name: "20 metros", price: 79 },
        ],
      },
      {
        id: "kb-pdu", cat: "red", icon: "⚡", name: "Rack PDU", price: 119, tag: "Red",
        img: "images/productos/RackPDU.png",
        desc: "Regleta vertical PDU para distribuir la alimentación de forma ordenada en tu armario rack.",
        specs: ["8 tomas IEC C13", "Formato vertical 0U", "Interruptor general con protección", "Monitorización opcional por IP"],
        variants: [
          { name: "Básica", price: 119 },
          { name: "Monitorizada por IP", price: 219 },
        ],
      },
      {
        id: "kb-transceptor", cat: "red", icon: "📡", name: "Transceptor SFP+", price: 45, tag: "Red",
        img: "images/productos/Transceptor.png",
        desc: "Módulo transceptor SFP+ 10G para enlaces de fibra entre switchs y routers a alta velocidad.",
        specs: ["Velocidad de 10 Gbps", "Compatible con OM3/OM4 multimodo", "Alcance de hasta 300 m", "Compatible con marcas principales"],
        variants: [
          { name: "SFP+ 10G-SR", price: 45 },
          { name: "SFP+ 10G-LR (10 km)", price: 89 },
        ],
      },
      // SAIs
      {
        id: "kb-sai-700", cat: "sai", icon: "🔋", name: "SAI KILOBYTE 700VA", price: 89, tag: "SAI",
        img: "images/productos/SAI.png",
        desc: "Sai de 700VA para proteger un equipo de escritorio de cortes y subidas de tensión.",
        specs: ["360 W de potencia de salida", "4 tomas protegidas + 2 de red", "Autonomía de unos 10 minutos", "Regulación AVR de la tensión"],
        variants: [
          { name: "700VA · estándar", price: 89 },
        ],
      },
      {
        id: "kb-sai-1500", cat: "sai", icon: "🔋", name: "SAI KILOBYTE 1500VA", price: 269, tag: "SAI",
        img: "images/productos/SAI1500.png",
        desc: "Sai de 1500VA con regulación por línea de interacción: ideal para servidores y equipos de red.",
        specs: ["900 W de potencia de salida", "6 tomas + protección de línea de red", "Puerto USB para apagado automático", "Panel LCD de estado y baterías sustituibles"],
        variants: [
          { name: "1500VA · torre", price: 269 },
          { name: "1500VA · batería ampliada", price: 349 },
        ],
      },
      {
        id: "kb-sai-3000", cat: "sai", icon: "🔋", name: "SAI KILOBYTE 3000VA Rack", price: 849, tag: "SAI",
        img: "images/productos/SAI3000.png",
        desc: "Sai rack de 3000VA para garantizar la disponibilidad de tu sala de servidores.",
        specs: ["2700 W de potencia de salida", "Formato rack 2U o torre", "8 tomas IEC con protección completa", "Baterías hot-swap sin apagar el equipo"],
        variants: [
          { name: "3000VA · rack 2U", price: 849 },
          { name: "3000VA · rack 2U + tarjeta de red", price: 999 },
        ],
      },
    ];

  if (grid) {
  const fmt = (n) =>
    new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })
      .format(n) + " €";
  let cart = [];
    try {
      const storedCart = JSON.parse(localStorage.getItem("kb-cart") || "[]");
      if (Array.isArray(storedCart)) {
        cart = storedCart.flatMap((item) => {
          const product = PRODUCTS.find((p) => p.id === item?.id);
          if (!product) return [];
          const variant = Number.isInteger(item.variant) && item.variant >= 0 && item.variant < product.variants.length
            ? item.variant
            : undefined;
          const qty = Math.min(99, Math.max(1, Number.parseInt(item.qty, 10) || 1));
          return [{ id: product.id, variant, qty, key: `${product.id}:${variant ?? "base"}` }];
        });
      }
    } catch {
      cart = [];
    }

    const saveCart = () => localStorage.setItem("kb-cart", JSON.stringify(cart));

    const cartCountEl = document.getElementById("cartCount");
    const cartItemsEl = document.getElementById("cartItems");
    const cartEmptyEl = document.getElementById("cartEmpty");
    const cartSummaryEl = document.getElementById("cartSummary");
    const cartPanel = document.getElementById("cartPanel");
    const cartOverlay = document.getElementById("cartOverlay");

    const updateCount = () => {
      const n = cart.reduce((s, i) => s + i.qty, 0);
      cartCountEl.textContent = n;
      cartCountEl.style.display = n ? "grid" : "none";
    };

    const renderCart = () => {
      cartItemsEl.querySelectorAll(".cart-item").forEach((el) => el.remove());
      cartEmptyEl.hidden = cart.length > 0;
      cartSummaryEl.hidden = cart.length === 0;
      cart.forEach((item) => {
        const p = PRODUCTS.find((x) => x.id === item.id);
        if (!p) return;
        const variant = item.variant !== undefined ? p.variants[item.variant] : null;
        const unitPrice = variant ? variant.price : p.price;
        const variantName = variant ? ` · ${variant.name}` : "";
        const div = document.createElement("div");
        div.className = "cart-item";
        div.innerHTML = `
          <span class="cart-item-icon">${p.icon}</span>
          <div class="cart-item-info">
            <strong>${p.name}${variantName}</strong>
            <small>${fmt(unitPrice)} / ud.</small>
          </div>
          <div class="cart-item-qty">
            <button data-act="dec" aria-label="Quitar una unidad">−</button>
            <span>${item.qty}</span>
            <button data-act="inc" aria-label="Añadir una unidad">+</button>
          </div>
          <strong class="cart-item-total">${fmt(unitPrice * item.qty)}</strong>
          <button class="cart-item-del" data-act="del" aria-label="Eliminar del carrito">🗑</button>`;
        div.querySelectorAll("[data-act]").forEach((b) =>
          b.addEventListener("click", () => {
            const act = b.dataset.act;
            if (act === "inc") item.qty++;
            if (act === "dec") item.qty = Math.max(0, item.qty - 1);
            if (act === "del" || item.qty === 0) cart = cart.filter((x) => x.key !== item.key);
            saveCart(); renderCart(); updateCount();
          })
        );
        cartItemsEl.appendChild(div);
      });
      const subtotal = cart.reduce((s, i) => {
        const p = PRODUCTS.find((x) => x.id === i.id);
        if (!p) return s;
        const unit = i.variant !== undefined ? p.variants[i.variant].price : p.price;
        return s + unit * i.qty;
      }, 0);
      const iva = subtotal * 0.21;
      document.getElementById("cartSubtotal").textContent = fmt(subtotal);
      document.getElementById("cartIva").textContent = fmt(iva);
      document.getElementById("cartTotal").textContent = fmt(subtotal + iva);
      updateCount();
    };

    // Catálogo
    const renderGrid = (cat) => {
      grid.innerHTML = "";
      const list = cat === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.cat === cat);
      document.getElementById("shopEmpty").hidden = list.length > 0;
      list.forEach((p, i) => {
        const card = document.createElement("article");
        card.className = "card product-card reveal visible";
        card.style.animationDelay = (i * 60) + "ms";
        const chips = p.specs.slice(0, 3).map((s) => `<li>${s}</li>`).join("");
        const desde = p.variants.length > 1 ? "Desde " : "";
        card.innerHTML = `
          <div class="product-media">
            ${p.img ? `<img src="${p.img}" alt="${p.name}" loading="lazy">` : `<span class="product-media-icon">${p.icon}</span>`}
            <span class="product-badge">${p.tag}</span>
          </div>
          <div class="product-body">
            <div class="product-titlerow">
              <h3>${p.name}</h3>
              <span class="product-price">${desde}${fmt(p.price)}</span>
            </div>
            <p class="product-desc">${p.desc}</p>
            <ul class="product-specs">${chips}</ul>
            <div class="product-foot">
              <button class="btn btn-primary btn-add-cart" data-id="${p.id}">Añadir al carrito 🛒</button>
              <button class="btn btn-ghost btn-details" data-id="${p.id}">Ver detalles</button>
            </div>
          </div>`;
        card.querySelector(".btn-details").addEventListener("click", () => openDetail(p));
        card.querySelector(".btn-add-cart").addEventListener("click", () => {
          addToCart(p.id);
          const b = card.querySelector(".btn-add-cart");
          b.textContent = "✓ Añadido";
          b.disabled = true;
          setTimeout(() => { b.textContent = "Añadir al carrito 🛒"; b.disabled = false; }, 1200);
        });
        grid.appendChild(card);
      });
    };

    // Filtros
    document.querySelectorAll(".filter-chip").forEach((chip) =>
      chip.addEventListener("click", () => {
        document.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        renderGrid(chip.dataset.cat);
      })
    );

    /* ---------- Panel de detalle del producto ---------- */
    const detailPanel = document.getElementById("productDetail");
    const detailOverlay = document.getElementById("detailOverlay");
    const addToCart = (id, variantIdx) => {
      const key = variantIdx === undefined ? id : `${id}#${variantIdx}`;
      const item = cart.find((x) => x.key === key);
      if (item) item.qty++;
      else cart.push({ key, id, variant: variantIdx, qty: 1 });
      saveCart(); renderCart();
    };

    const openDetail = (p) => {
      document.getElementById("detailIcon").innerHTML = p.img
        ? `<img src="${p.img}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;">`
        : p.icon;
      document.getElementById("detailTag").textContent = p.tag;
      document.getElementById("detailName").textContent = p.name;
      document.getElementById("detailDesc").textContent = p.desc;
      document.getElementById("detailSpecs").innerHTML =
        p.specs.map((s) => `<li>${s}</li>`).join("");
      const variantBox = document.getElementById("detailVariants");
      const variantTitle = document.getElementById("variantTitle");
      variantBox.innerHTML = p.variants
        .map(
          (v, i) => `
          <label class="variant-option">
            <input type="radio" name="variant" value="${i}" ${i === 0 ? "checked" : ""}>
            <span class="variant-name">${v.name}</span>
            <span class="variant-price">${fmt(v.price)}</span>
          </label>`
        )
        .join("");
      variantBox.style.display = p.variants.length > 1 ? "" : "none";
      variantTitle.style.display = p.variants.length > 1 ? "" : "none";
      const priceEl = document.getElementById("detailPrice");
      const updatePrice = () => {
        const idx = Number(variantBox.querySelector("input:checked").value);
        priceEl.textContent = fmt(p.variants[idx].price);
      };
      variantBox.querySelectorAll("input").forEach((r) => r.addEventListener("change", updatePrice));
      updatePrice();
      const addBtn = document.getElementById("detailAddBtn");
      addBtn.replaceWith(addBtn.cloneNode(true));
      document.getElementById("detailAddBtn").addEventListener("click", () => {
        const idx = Number(variantBox.querySelector("input:checked").value);
        addToCart(p.id, p.variants.length > 1 ? idx : undefined);
        const btn = document.getElementById("detailAddBtn");
        btn.textContent = "✓ Añadido";
        setTimeout(() => (btn.textContent = "Añadir al carrito 🛒"), 1200);
      });
      detailPanel.classList.add("open");
      detailOverlay.classList.add("show");
    };

    const closeDetail = () => {
      detailPanel.classList.remove("open");
      detailOverlay.classList.remove("show");
    };
    document.getElementById("detailClose").addEventListener("click", closeDetail);
    detailOverlay.addEventListener("click", closeDetail);

    // Abrir / cerrar carrito
    const openCart = (open) => {
      cartPanel.classList.toggle("open", open);
      cartOverlay.classList.toggle("show", open);
    };
    document.getElementById("cartBtn").addEventListener("click", () => { renderCart(); openCart(true); });
    document.getElementById("cartClose").addEventListener("click", () => openCart(false));
    cartOverlay.addEventListener("click", () => openCart(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { openCart(false); closeDetail(); }
    });

    /* ---------- Autenticación: se delega en el módulo global (window.KBAuth) ---------- */
    const auth = () => window.KBAuth;
    const getSession = () => (auth() ? auth().getSession() : null);
    const openAuth = (opts) => { if (auth()) auth().openAuth(opts); };

    const completeCheckout = async () => {
      const session = getSession();
      if (!window.KBDB || !session?.uid) {
        cartMsgEl.hidden = false;
        cartMsgEl.classList.add("is-error");
        cartMsgEl.textContent = "No se ha podido conectar con el servicio de pedidos. Inténtalo de nuevo.";
        return;
      }

      const checkoutBtn = document.getElementById("checkoutBtn");
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = "Tramitando…";
      cartMsgEl.hidden = false;
      cartMsgEl.classList.remove("is-error");
      cartMsgEl.textContent = "Guardando el pedido…";
      try {
        const items = cart.map((i) => {
          const p = PRODUCTS.find((x) => x.id === i.id);
          if (!p) throw new Error("Producto no válido");
          const variant = i.variant !== undefined ? p.variants[i.variant] : null;
          return { id: p.id, variante: variant ? variant.name : null, precio: variant ? variant.price : p.price, cantidad: i.qty };
        });
        const total = items.reduce((s, it) => s + it.precio * it.cantidad, 0) * 1.21;
        const orderData = {
          userId: session.uid,
          cliente: { nombre: session.name, email: session.email },
          items,
          total: Math.round(total * 100) / 100,
        };
        await Promise.all([
          window.KBDB.guardar("orders", orderData),
          window.KBDB.guardarInterno({
            tipo: "pedido",
            nombre: session.name,
            email: session.email,
            pedido: JSON.stringify(items),
            total: orderData.total,
          }),
        ]);
        cartMsgEl.textContent = "✓ Pedido registrado. Te contactaremos para confirmar la entrega.";
        cart = [];
        saveCart();
        renderCart();
        setTimeout(() => { cartMsgEl.hidden = true; openCart(false); }, 3000);
      } catch (err) {
        console.error("Error al guardar el pedido:", err);
        cartMsgEl.classList.add("is-error");
        cartMsgEl.textContent = "No se ha podido registrar el pedido. El carrito se conserva para que puedas reintentarlo.";
      } finally {
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = "Tramitar pedido";
      }
    };

    /* API pública para el módulo de autenticación global (script.js) */
    window.KBShop = {
      // Se llama tras iniciar sesión si el usuario quería tramitar un pedido
      afterLogin: () => { if (cart.length) void completeCheckout(); else showCartEmptyMsg(); },
    };

    /* ---------- Checkout protegido ---------- */
    const cartMsgEl = document.getElementById("checkoutMsg");
    const showCartEmptyMsg = () => {
      if (!cartMsgEl) return;
      cartMsgEl.textContent = "⚠️ Tu carrito está vacío. Añade algún producto antes de tramitar el pedido.";
      cartMsgEl.hidden = false;
      setTimeout(() => (cartMsgEl.hidden = true), 3000);
    };

    document.getElementById("checkoutBtn").addEventListener("click", () => {
      if (!cart.length) {
        showCartEmptyMsg();
        return;
      }
      const session = getSession();
      if (!session) {
        // Sin sesión: pedir registro o inicio de sesión antes de tramitar el pedido
        openAuth({ pendingCheckout: true });
        return;
      }
      void completeCheckout();
    });

    document.getElementById("clearCartBtn").addEventListener("click", () => {
      cart = [];
      saveCart(); renderCart();
    });

  renderGrid("all");
  renderCart();
  }

  /* ============================================================
     AUTENTICACIÓN GLOBAL — registro / inicio de sesión / perfiles
     Funciona en todas las páginas; inyecta el modal si la página
     no lo incluye y pinta los botones de sesión en el navbar.
     ============================================================ */
  const initAuth = () => {
    // Sesión en memoria; el estado real lo gestiona Firebase Authentication.
    // La sesión se restaura sola al cargar la página (onAuthStateChanged).
    let currentUser = null;

    const getSession = () => currentUser;
    const setSession = (user) => { currentUser = user; };

    // --- Modal: se reutiliza el de tienda.html o se inyecta en el resto de páginas ---
    let authModal = document.getElementById("authModal");
    if (!authModal) {
      document.body.insertAdjacentHTML("beforeend", `
      <div class="auth-overlay" id="authOverlay"></div>
      <div class="auth-modal" id="authModal" role="dialog" aria-modal="true" aria-label="Iniciar sesión o registrarse">
        <div class="auth-card">
          <button class="chat-close auth-close" id="authClose" aria-label="Cerrar">×</button>
          <div class="auth-head">
            <span class=\"logo-plate\"><img src=\"images/logos/Logotipo_KB_extendido.png\" alt=\"KILOBYTE S.L.\"></span>
            <h3 id="authTitle">Bienvenido a KILOBYTE S.L.</h3>
            <p class="auth-sub">Crea tu perfil o inicia sesión para acceder a tu cuenta.</p>
          </div>
          <div class="auth-tabs">
            <button class="auth-tab active" id="tabLogin" type="button">Iniciar sesión</button>
            <button class="auth-tab" id="tabRegister" type="button">Registrarse</button>
          </div>
          <form id="loginForm" novalidate>
            <div class="form-field">
              <label for="loginEmail">Email</label>
              <input type="email" id="loginEmail" maxlength="254" placeholder="tu@email.com" autocomplete="username" required>
            </div>
            <div class="form-field">
              <label for="loginPass">Contraseña</label>
              <input type="password" id="loginPass" maxlength="128" placeholder="Tu contraseña" autocomplete="current-password" required>
            </div>
            <p class="auth-error" id="loginError" hidden></p>
            <button class="btn btn-primary btn-block" type="submit">Entrar</button>
          </form>
          <div class="auth-divider">o</div>
          <button class="btn btn-google btn-block" id="googleLoginBtn" type="button">🔐 Continuar con Google</button>
          <form id="registerForm" hidden novalidate>
            <div class="form-field">
              <label for="regName">Nombre y apellidos</label>
              <input type="text" id="regName" maxlength="100" placeholder="Nombre completo" autocomplete="name" required>
            </div>
            <div class="form-field">
              <label for="regEmail">Email</label>
              <input type="email" id="regEmail" maxlength="254" placeholder="tu@email.com" autocomplete="email" required>
            </div>
            <div class="form-field">
              <label for="regPass">Contraseña</label>
              <input type="password" id="regPass" minlength="8" maxlength="128" placeholder="Mínimo 8 caracteres" autocomplete="new-password" required>
            </div>
            <div class="form-field">
              <label for="regPass2">Confirmar contraseña</label>
              <input type="password" id="regPass2" minlength="8" maxlength="128" placeholder="Repite la contraseña" autocomplete="new-password" required>
            </div>
            <p class="auth-error" id="registerError" hidden></p>
            <div class="form-field">
              <label class="consent-label">
                <input type="checkbox" id="regPrivacidad" required>
                <span>Acepto la <a href="privacidad.html" style="color:var(--primary);text-decoration:underline">política de
                    privacidad</a> y el tratamiento de mis datos. *</span>
              </label>
            </div>
            <p class="auth-error" id="registerError2" hidden></p>
            <button class="btn btn-primary btn-block" type="submit">Crear cuenta</button>
          </form>
          <div class="auth-divider">o</div>
          <button class="btn btn-google btn-block" id="googleRegisterBtn" type="button">🔐 Registrarse con Google</button>
        </div>
      </div>`);
      authModal = document.getElementById("authModal");
    }

    const authOverlay = document.getElementById("authOverlay");
    const tabLogin = document.getElementById("tabLogin");
    const tabRegister = document.getElementById("tabRegister");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const loginError = document.getElementById("loginError");
    const registerError = document.getElementById("registerError");

    // --- Botones de sesión en el navbar (se insertan si no existen) ---
    const navInner = document.querySelector(".navbar .nav-inner");
    if (navInner && !document.getElementById("navAuth")) {
      navInner.insertAdjacentHTML("beforeend", `<div class="nav-auth" id="navAuth">
        <button class="btn btn-outline-cyan" id="loginBtn">Iniciar sesión</button>
        <button class="btn btn-primary" id="registerBtn">Registrarse</button>
        <div class="user-chip" id="userChip" hidden>
          <span class="avatar" id="userAvatar"></span>
          <span class="chip-name" id="userName"></span>
          <div class="user-menu" id="userMenu">
            <div class="menu-head">
              <strong id="menuName"></strong>
              <small id="menuEmail"></small>
            </div>
            <button id="logoutBtn">Cerrar sesión</button>
          </div>
        </div>
      </div>`);
    }

    const loginBtn = document.getElementById("loginBtn");
    const registerBtn = document.getElementById("registerBtn");
    const userChip = document.getElementById("userChip");
    const userMenu = document.getElementById("userMenu");

    let pendingCheckout = false; // ¿el usuario quería tramitar pedido al abrir el modal?

    const openAuth = (opts = {}) => {
      pendingCheckout = Boolean(opts.pendingCheckout);
      authModal.classList.add("show");
      authOverlay.classList.add("show");
      loginForm.reset(); registerForm.reset();
      loginError.hidden = true; registerError.hidden = true;
      if (opts.tab === "register") switchTab("register");
      else switchTab("login");
    };
    const closeAuth = () => {
      authModal.classList.remove("show");
      authOverlay.classList.remove("show");
    };

    const switchTab = (mode) => {
      const isLogin = mode === "login";
      tabLogin.classList.toggle("active", isLogin);
      tabRegister.classList.toggle("active", !isLogin);
      loginForm.hidden = !isLogin;
      registerForm.hidden = isLogin;
      loginError.hidden = true; registerError.hidden = true;
    };
    tabLogin.addEventListener("click", () => switchTab("login"));
    tabRegister.addEventListener("click", () => switchTab("register"));
    document.getElementById("authClose").addEventListener("click", closeAuth);
    authOverlay.addEventListener("click", closeAuth);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAuth(); });

    const showAuthError = (el, msg) => {
      el.textContent = "⚠️ " + msg;
      el.hidden = false;
    };

    // Registro: crea la cuenta con Firebase Authentication (email + contraseña)
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("regName").value.trim();
      const email = document.getElementById("regEmail").value.trim().toLowerCase();
      const pass = document.getElementById("regPass").value;
      const pass2 = document.getElementById("regPass2").value;

      const acepta = document.getElementById("regPrivacidad");
      if (!name) return showAuthError(registerError, "Introduce tu nombre y apellidos.");
      if (!/^\S+@\S+\.\S+$/.test(email)) return showAuthError(registerError, "Introduce un email válido.");
      if (pass.length < 8) return showAuthError(registerError, "La contraseña debe tener al menos 8 caracteres.");
      if (pass !== pass2) return showAuthError(registerError, "Las contraseñas no coinciden.");
      if (acepta && !acepta.checked) return showAuthError(registerError, "Debes aceptar la política de privacidad.");

      if (!window.KBAUTH) return showAuthError(registerError, "Firebase no está disponible. Inténtalo de nuevo en unos segundos.");
      try {
        // crearUsuario devuelve el objeto user directamente
        const user = await window.KBAUTH.crearUsuario(email, pass, name);
        // Guardar el perfil (sin contraseña) en Firestore, con el UID como ID de documento
        if (window.KBDB) {
          window.KBDB
            .guardarConId("users", user.uid, {
              nombre: name,
              correo: email,
              fechaRegistro: window.KBDB.fechaServidor(),
            })
            .catch((err) => console.error("Error al guardar el usuario:", err));
        }
        closeAuth();
        registrarAcceso("email", user);
        notifyLogin();
      } catch (err) {
        const msgs = {
          "auth/email-already-in-use": "Ya existe una cuenta con este email. Inicia sesión.",
          "auth/invalid-email": "Introduce un email válido.",
          "auth/weak-password": "La contraseña debe tener al menos 8 caracteres.",
          "auth/network-request-failed": "No hay conexión con Firebase. Revisa tu conexión.",
        };
        showAuthError(registerError, msgs[err.code] || "No se ha podido crear la cuenta. Inténtalo de nuevo.");
      }
    });

    // Inicio de sesión: lo valida Firebase Authentication
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value.trim().toLowerCase();
      const pass = document.getElementById("loginPass").value;

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showAuthError(loginError, "Introduce un email válido.");
      if (!pass) return showAuthError(loginError, "Introduce tu contraseña.");

      if (!window.KBAUTH) return showAuthError(loginError, "Firebase no está disponible. Inténtalo de nuevo en unos segundos.");
      try {
        const user = await window.KBAUTH.iniciarSesion(email, pass);
        // Guardar/actualizar el perfil del usuario en Firestore (ID = UID)
        if (window.KBDB) {
          window.KBDB
            .guardarConId("users", user.uid, {
              nombre: user.displayName || email.split("@")[0],
              correo: user.email,
              ultimoAcceso: window.KBDB.fechaServidor(),
            })
            .catch((err) => console.error("Error al guardar el usuario:", err));
        }
        registrarAcceso("email", user);
        closeAuth();
        notifyLogin();
      } catch (err) {
        const msgs = {
          "auth/invalid-credential": "Email o contraseña incorrectos.",
          "auth/user-not-found": "No existe ninguna cuenta con este email. Regístrate primero.",
          "auth/wrong-password": "Contraseña incorrecta. Inténtalo de nuevo.",
          "auth/too-many-requests": "Demasiados intentos. Espera un momento e inténtalo de nuevo.",
          "auth/network-request-failed": "No hay conexión con Firebase. Revisa tu conexión.",
        };
        showAuthError(loginError, msgs[err.code] || "No se ha podido iniciar sesión. Inténtalo de nuevo.");
      }
    });

    /* ---------- Registro de accesos ---------- */
    // Las reglas de Firestore solo permiten users/orders/form_submissions,
    // así que el registro de accesos se guarda dentro del propio usuario
    // (campos ultimoAcceso y ultimoMetodoAcceso en users/{uid}).
    const registrarAcceso = (metodo, user) => {
      if (!window.KBDB || !user) return;
      window.KBDB
        .guardarConId("users", user.uid, {
          correo: user.email,
          ultimoAcceso: window.KBDB.fechaServidor(),
          ultimoMetodoAcceso: metodo,
        })
        .catch((err) => console.error("Error al registrar el acceso:", err));
    };

    /* ---------- Inicio de sesión con Google (Firebase Auth) ---------- */
    const googleBtns = [document.getElementById("googleLoginBtn"), document.getElementById("googleRegisterBtn")].filter(Boolean);
    const firebaseReady = () => window.KBAUTH && window.KBAUTH.google;

    const hideGoogleUi = () => document.querySelectorAll(".auth-divider, .btn-google").forEach((el) => (el.hidden = true));
    const showGoogleUi = () => document.querySelectorAll(".auth-divider, .btn-google").forEach((el) => (el.hidden = false));
    const syncGoogleUi = () => { if (firebaseReady()) showGoogleUi(); else hideGoogleUi(); };
    window.addEventListener("firestore-ready", syncGoogleUi);
    syncGoogleUi();
    // Reintento por si firebase.js (módulo ES) carga después de este script
    if (!firebaseReady()) {
      let intentos = 0;
      const esperandoFirebase = setInterval(() => {
        if (firebaseReady()) { clearInterval(esperandoFirebase); syncGoogleUi(); }
        else if (++intentos > 40) clearInterval(esperandoFirebase); // ~20 s máximo
      }, 500);
    }

    const finishAuth = (user) => {
      // Guardar/actualizar el perfil de Google en Firestore (colección "users", ID = UID)
      if (window.KBDB) {
        window.KBDB
          .guardarConId("users", user.uid, {
            nombre: user.displayName || user.email.split("@")[0],
            correo: user.email,
            fechaRegistro: window.KBDB.fechaServidor(),
          })
          .catch((err) => console.error("Error al guardar el usuario de Google:", err));
      }
      closeAuth();
      notifyLogin();
    };

    googleBtns.forEach((btn) =>
      btn.addEventListener("click", async () => {
        loginError.hidden = true; registerError.hidden = true;
        try {
          const user = await window.KBAUTH.google();
          registrarAcceso("google", user);
          finishAuth(user);
        } catch (err) {
          const msg =
            err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request"
              ? "Has cerrado la ventana de Google sin completar el inicio de sesión."
              : err.code === "auth/popup-blocked"
              ? "El navegador ha bloqueado la ventana emergente. Permite las ventanas emergentes e inténtalo de nuevo."
              : err.code === "auth/unauthorized-domain"
              ? "Este dominio no está autorizado en Firebase. Añádelo en Authentication → Settings → Authorized domains."
              : "No se ha podido iniciar sesión con Google. Inténtalo de nuevo.";
          showAuthError(btn.id === "googleLoginBtn" ? loginError : registerError, msg);
        }
      })
    );

    // Callbacks de otras partes de la app (p. ej. checkout de la tienda)
    const notifyLogin = () => {
      if (window.KBShop && window.KBShop.afterLogin) window.KBShop.afterLogin();
    };

    /* ---------- UI de sesión en el navbar ---------- */
    const renderAuthUi = () => {
      const session = getSession();
      if (loginBtn) loginBtn.hidden = Boolean(session);
      if (registerBtn) registerBtn.hidden = Boolean(session);
      if (userChip) userChip.hidden = !session;
      if (session && userChip) {
        const initials = session.name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
        document.getElementById("userAvatar").textContent = initials || "KB";
        document.getElementById("userName").textContent = session.name;
        document.getElementById("menuName").textContent = session.name;
        document.getElementById("menuEmail").textContent = session.email;
      }
      if (userMenu) userMenu.classList.remove("open");
    };

    if (loginBtn) loginBtn.addEventListener("click", () => openAuth({ tab: "login" }));
    if (registerBtn) registerBtn.addEventListener("click", () => openAuth({ tab: "register" }));
    if (userChip) {
      userChip.addEventListener("click", (e) => {
        e.stopPropagation();
        userMenu.classList.toggle("open");
      });
      document.addEventListener("click", (e) => {
        if (!userChip.contains(e.target)) userMenu.classList.remove("open");
      });
    }
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        if (window.KBAUTH) window.KBAUTH.cerrarSesion().catch(() => {});
        else setSession(null);
        renderAuthUi();
      });
    }

    // API pública para otras páginas/scripts
    window.KBAuth = { getSession, openAuth, logout: () => { if (window.KBAUTH) window.KBAUTH.cerrarSesion().catch(() => {}); setSession(null); } };

    // Restaurar la sesión automáticamente con Firebase Authentication
    if (window.KBAUTH) {
      window.KBAUTH.alCambiar((user) => {
        setSession(user ? { uid: user.uid, name: user.displayName || user.email.split("@")[0], email: user.email } : null);
        renderAuthUi();
      });
    }
    renderAuthUi();
  };
  initAuth();
});

