const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Año del footer ---------- */
(() => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();

/* ---------- Todo lo que depende del scroll, en un solo lugar ----------
   Antes eran tres modulos con su propio listener y su propio rAF: las
   apariciones, el paneo de las capturas con el parallax del hero, y la
   barra de progreso. Cada uno leia posiciones despues de que el anterior
   habia escrito estilos, y esa alternancia obliga al navegador a
   recalcular el layout entero en cada vuelta.
   Aca se hace una sola pasada de lecturas y despues una sola de
   escrituras, con un unico listener. */
(() => {
  const targets = [];

  // marca(el, variante, retraso) — el retraso se traduce a un desfasaje
  // en pixeles, que es lo que escalona la entrada cuando es por scroll
  const mark = (el, kind = 'up', delay = 0) => {
    if (!el || el.dataset.reveal) return;

    // La variante "mask" mueve un hijo, no la caja: si recortaramos el
    // propio elemento su area visible seria 0 y el observer no dispararia.
    if (kind === 'mask') {
      const inner = document.createElement('span');
      inner.className = 'mask-inner';
      while (el.firstChild) inner.appendChild(el.firstChild);
      el.appendChild(inner);
    }

    el.dataset.reveal = kind;
    el._revShift = delay * 0.45;   // ms -> px de desfasaje
    targets.push(el);
  };

  const markAll = (sel, kind = 'up', step = 90, base = 0, root = document) => {
    root.querySelectorAll(sel).forEach((el, i) => {
      // el escalonado se corta a los 4 para que nunca se sienta lento
      mark(el, kind, base + Math.min(i, 3) * step);
    });
  };

  // --- encabezado de cada seccion: volanta, filete, titulo y bajada ---
  document.querySelectorAll('.eyebrow').forEach((eyebrow) => {
    const rule = document.createElement('span');
    rule.className = 'eyebrow-rule';
    rule.setAttribute('aria-hidden', 'true');
    eyebrow.parentNode.insertBefore(rule, eyebrow);
    mark(rule, 'line', 0);
    mark(eyebrow, 'up', 90);

    const holder = eyebrow.parentNode;
    mark(holder.querySelector('.section-title'), 'mask', 160);
    mark(holder.querySelector('.section-lead'), 'up', 260);
  });

  // --- portfolio: primero la imagen, despues la ficha ---
  markAll('.pf-bento .pf-tile', 'up', 70);
  mark(document.querySelector('.portfolio-cta'), 'up', 0);

  mark(document.querySelector('.device-monitor'), 'zoom', 120);
  mark(document.querySelector('.showcase-link'), 'up', 260);

  mark(document.querySelector('.auto-cta'), 'up', 340);
  markAll('.auto-steps li', 'up', 90);
  mark(document.querySelector('.auto-outcome'), 'up', 320);
  mark(document.querySelector('.auto-phone'), 'zoom', 120);

  markAll('.contact-cards .contact-card', 'up', 90);
  mark(document.querySelector('.contact-note'), 'up', 180);
  markAll('.footer-brand, .footer-links', 'up', 80);

  const bar = document.getElementById('progress');

  if (prefersReducedMotion) {
    targets.forEach((el) => el.style.setProperty('--p', '1'));
    if (!bar) return;
  }

  const stage = prefersReducedMotion ? null : document.querySelector('.stage-inner');
  const reveals = prefersReducedMotion ? [] : targets;

  if (!reveals.length && !stage && !bar) return;

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

  // el bloque empieza a entrar cuando su borde superior cruza el 92% de
  // la pantalla y termina de acomodarse un 32% mas arriba
  const START = 0.92;
  const RUN = 0.32;

  let ticking = false;

  function update() {
    const vh = window.innerHeight;
    const doc = document.documentElement;

    /* ---- 1) lecturas: nada de escribir estilos en esta parte ---- */

    // Al final de la pagina ya no queda scroll para completar la entrada:
    // lo que esta a la vista tiene que verse entero igual.
    const atBottom = window.scrollY + vh >= doc.scrollHeight - 2;

    const ps = reveals.map((el) => {
      const top = el.getBoundingClientRect().top;
      if (atBottom && top < vh) return 1;
      return clamp((vh * START - top - (el._revShift || 0)) / (vh * RUN));
    });

    let par = null;
    if (stage) {
      const r = stage.getBoundingClientRect();
      if (r.bottom > -200 && r.top < vh + 200) {
        // el mockup sube un poco mas lento que la pagina
        par = `${clamp((vh / 2 - (r.top + r.height / 2)) * 0.06, -40, 40).toFixed(1)}px`;
      }
    }

    const max = doc.scrollHeight - doc.clientHeight;
    const avance = max > 0 ? doc.scrollTop / max : 0;

    /* ---- 2) escrituras ---- */

    for (let i = 0; i < reveals.length; i++) {
      reveals[i].style.setProperty('--p', ps[i].toFixed(3));
    }
    if (par !== null) stage.style.setProperty('--par', par);
    if (bar) bar.style.transform = `scaleX(${avance})`;

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });

  window.addEventListener('resize', update, { passive: true });

  update();
})();

/* ---------- Nav: se comprime al bajar ---------- */
(() => {
  const nav = document.getElementById('nav');
  if (!nav) return;

  let ticking = false;
  const update = () => {
    nav.classList.toggle('is-stuck', window.scrollY > 24);
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });

  update();
})();

/* ---------- Menu del celular ---------- */
(() => {
  const toggle = document.getElementById('nav-toggle');
  const panel = document.getElementById('nav-links');
  if (!toggle || !panel) return;

  const close = () => {
    toggle.setAttribute('aria-expanded', 'false');
    panel.classList.remove('is-open');
  };

  toggle.addEventListener('click', () => {
    const abierto = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!abierto));
    panel.classList.toggle('is-open', !abierto);
  });

  // al elegir una seccion el panel se cierra solo
  panel.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  // si se pasa a escritorio el panel deja de existir como panel
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 900) close();
  }, { passive: true });
})();

/* ---------- Nav: resalta la seccion que se esta leyendo ---------- */
(() => {
  const links = Array.from(document.querySelectorAll('.nav-link[href^="#"]'));
  if (!links.length || !('IntersectionObserver' in window)) return;

  const map = new Map();
  links.forEach((link) => {
    const section = document.querySelector(link.getAttribute('href'));
    if (section) map.set(section, link);
  });
  if (!map.size) return;

  const visible = new Set();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });

      // si hay varias a la vista, gana la que este mas arriba
      let top = null;
      visible.forEach((s) => {
        if (!top || s.getBoundingClientRect().top < top.getBoundingClientRect().top) top = s;
      });

      // Arriba de todo no se esta leyendo ninguna seccion del menu: hay
      // que apagarlas. Sin esto quedaba subrayada la ultima que se habia
      // visitado, aunque estuvieras de nuevo en la portada.
      if (!top) {
        if (window.scrollY < window.innerHeight * 0.6) {
          links.forEach((l) => l.classList.remove('is-current'));
        }
        // en el resto de los huecos (secciones que no estan en el menu)
        // se conserva la ultima marcada en vez de apagarlas todas
        return;
      }
      links.forEach((l) => l.classList.remove('is-current'));
      map.get(top).classList.add('is-current');
    },
    { rootMargin: '-84px 0px -55% 0px' }
  );

  map.forEach((_, section) => observer.observe(section));
})();

/* ---------- Logo: pulso al click + scroll suave al inicio ---------- */
(() => {
  const brand = document.querySelector('.brand');
  if (!brand) return;

  brand.addEventListener('click', (e) => {
    e.preventDefault();

    if (!prefersReducedMotion) {
      brand.classList.remove('is-tapped');
      // reinicia la animación aunque se hagan clicks seguidos
      void brand.offsetWidth;
      brand.classList.add('is-tapped');
    }

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });

    history.replaceState(null, '', '#inicio');
  });

  brand.addEventListener('animationend', () => brand.classList.remove('is-tapped'));
})();

/* ---------- Vitrina: la pista de "scrolleá" se apaga apenas se usa ---------- */
(() => {
  const viewport = document.querySelector('.monitor-viewport');
  const cue = document.querySelector('.monitor-scroll-cue');
  if (!viewport || !cue) return;

  viewport.addEventListener('scroll', () => {
    cue.classList.toggle('is-hidden', viewport.scrollTop > 24);
  }, { passive: true });
})();

/* ---------- Automatizaciones: demo respondible ----------------------------
   El visitante escribe y la automatizacion contesta. Es una demo del sitio,
   no hay backend: el motor compara palabras clave y elige una respuesta ya
   escrita. Todas las respuestas usan unicamente datos que el sitio afirma
   (plazos del hero, titularidad del dominio, tipos de proyecto y los nueve
   proyectos del portfolio). Los precios no salen: se derivan a WhatsApp,
   igual que en el sitio.
   -------------------------------------------------------------------------- */
(() => {
  const log = document.getElementById('demo-log');
  const form = document.getElementById('demo-form');
  const campo = document.getElementById('demo-text');
  const quick = document.getElementById('demo-quick');
  if (!log || !form || !campo) return;

  const WA = 'https://wa.me/5492216715279';

  /* --- base de respuestas. El orden importa solo ante empate de puntaje --- */
  const GUION = [
    {
      nivel: 2,
      claves: ['precio', 'precios', 'sale', 'salen', 'vale', 'cuesta', 'costo', 'presupuesto', 'cotiza', 'plata', 'barato', 'caro'],
      texto: [
        'El precio depende de lo que necesite tu negocio, así que no lo publicamos: lo pasamos armado sobre tu caso.',
        'Contame de qué es tu negocio y qué necesitás (carta digital, sitio de servicios o tienda online) y te lo paso por WhatsApp el mismo día.'
      ],
      cta: true
    },
    {
      nivel: 2,
      claves: ['tarda', 'tardan', 'demora', 'demoran', 'plazo', 'plazos', 'cuanto tiempo', 'rapido', 'cuando esta', 'tiempo'],
      texto: [
        'La primera propuesta de diseño la tenés en 72 horas.',
        'El sitio completo, según la complejidad, entre 1 y 3 semanas.'
      ]
    },
    {
      nivel: 2,
      claves: ['incluye', 'incluido', 'incluyen', 'trae', 'que tiene', 'viene con'],
      texto: [
        'Cada sitio incluye:',
        '\u2022 Diseño propio, sin plantillas\n\u2022 Responsive probado en celular, tablet y escritorio\n\u2022 Carga rápida\n\u2022 Preparada para Google\n\u2022 Dominio y hosting 100% a tu nombre',
        'Cuando el proyecto lo pide, la carta o el catálogo los editás vos.'
      ]
    },
    {
      nivel: 2,
      claves: ['dominio', 'hosting', 'a mi nombre', 'propiedad', 'es mio', 'me pertenece', 'atado'],
      texto: [
        'El dominio, el hosting y el contenido quedan 100% a tu nombre desde el día uno.',
        'No quedás atado a nosotros: si mañana te querés ir, te llevás todo.'
      ]
    },
    {
      nivel: 2,
      claves: ['tienda', 'vender', 'venta', 'carrito', 'ecommerce', 'comprar', 'catalogo', 'productos', 'stock'],
      texto: [
        'Sí, tienda online es uno de los tres tipos de proyecto que hacemos.',
        'FULLFARDO y SCRUM son dos casos de indumentaria que ya están online. Podés arrancar mostrando catálogo y sumar la venta después, sin rehacer el sitio.'
      ]
    },
    {
      nivel: 2,
      claves: ['turno', 'turnos', 'reserva', 'reservas', 'agenda', 'cita', 'citas'],
      texto: [
        'Sí, los turnos online se resuelven desde la web.',
        'Veinticinco Ocho, un estudio de imagen masculina en City Bell, toma turnos de 20 minutos directo desde el sitio. LUMEN hace lo mismo con la reserva de mesa.'
      ]
    },
    {
      nivel: 2,
      claves: ['carta', 'menu', 'restaurante', 'restoran', 'bar', 'cafeteria', 'cafe', 'comida', 'hamburgues', 'pizzeria', 'parrilla', 'gastronomia', 'delivery'],
      texto: [
        'La carta digital es uno de los tres tipos de proyecto que hacemos, y el rubro donde más trabajamos.',
        'LUMEN (cocina de autor en Palermo Soho, con reserva de mesa y menú online), Sancho (bar de tapas en City Bell, con pedido para retirar) y Brodog\u2019s (hamburguesería en City Bell) ya están funcionando.'
      ]
    },
    {
      nivel: 2,
      claves: ['ejemplo', 'ejemplos', 'proyecto', 'proyectos', 'portfolio', 'trabajos', 'casos', 'ver webs', 'hicieron'],
      texto: [
        'Tenemos 9 proyectos online, en 6 rubros y 3 ciudades.',
        'Indumentaria (FULLFARDO, SCRUM), gastronomía (LUMEN, Sancho, Brodog\u2019s), barbería (Veinticinco Ocho), fitness (ÍMPETU) y servicios legales (Iurisdictio, Escribanía Delavault Rocco).',
        'Los podés abrir todos desde la sección Proyectos de este sitio.'
      ]
    },
    {
      nivel: 1,
      proyecto: 'Veinticinco Ocho',
      extra: 'Y de tu rubro ya tenemos un caso: Veinticinco Ocho, en City Bell.',
      claves: ['barberia', 'barber', 'peluqueria', 'estetica', 'uñas', 'unas', 'salon'],
      texto: [
        'Ese rubro ya lo trabajamos: Veinticinco Ocho es un estudio de imagen masculina en City Bell.',
        'Tiene turnos online de 20 minutos y la carta de servicios visible, que es lo que más consultan los clientes antes de reservar.'
      ]
    },
    {
      nivel: 1,
      proyecto: 'ÍMPETU',
      extra: 'Y de tu rubro ya tenemos un caso: ÍMPETU, un club de rendimiento en Palermo.',
      claves: ['gimnasio', 'gym', 'fitness', 'entrenar', 'crossfit', 'pilates', 'yoga'],
      texto: [
        'Sí: ÍMPETU es un club de rendimiento en Palermo que ya está online.',
        'Ahí el sitio ordena las clases, los horarios y el contacto, que es lo que suele frenar a alguien que quiere arrancar.'
      ]
    },
    {
      nivel: 1,
      proyecto: 'Iurisdictio',
      extra: 'Y de servicios profesionales ya tenemos dos casos: Iurisdictio y la Escribanía Delavault Rocco, en La Plata.',
      claves: ['abogado', 'abogada', 'juridico', 'escribania', 'escribano', 'notarial', 'legal', 'estudio'],
      texto: [
        'Tenemos dos casos del rubro: Iurisdictio, un estudio jurídico que recibe las consultas por WhatsApp directo desde la web, y la Escribanía Delavault Rocco, en La Plata.',
        'En servicios profesionales lo que más rinde es que la consulta llegue en un clic y que el sitio transmita respaldo.'
      ]
    },
    {
      nivel: 1,
      proyecto: 'FULLFARDO',
      extra: 'Y de indumentaria ya tenemos dos casos: FULLFARDO, en Temperley, y SCRUM.',
      claves: ['ropa', 'indumentaria', 'local de ropa', 'boutique', 'remeras', 'zapatillas'],
      texto: [
        'Es uno de los rubros donde más trabajamos.',
        'FULLFARDO es una feria de ropa importada en Temperley: el cliente reserva por WhatsApp y retira en el local. SCRUM vende camisetas de rugby retro tejidas en Argentina.'
      ]
    },
    {
      nivel: 2,
      claves: ['whatsapp', 'pedido', 'pedidos', 'consulta directa', 'mensaje'],
      texto: [
        'Sí, el pedido o la consulta por WhatsApp se integra al sitio.',
        'En FULLFARDO el cliente reserva por WhatsApp y retira en el local; en Iurisdictio la consulta sale del sitio directo al chat. No hay formularios que nadie lee.'
      ]
    },
    {
      nivel: 2,
      claves: ['google', 'seo', 'buscador', 'aparecer', 'aparezco', 'posicion', 'buscan'],
      texto: [
        'Cada sitio sale preparado para Google: títulos, descripciones y los datos del negocio cargados para que aparezcas cuando te buscan.',
        'No vendemos posiciones garantizadas, pero el sitio arranca bien parado.'
      ]
    },
    {
      nivel: 2,
      claves: ['celular', 'mobile', 'movil', 'responsive', 'telefono', 'pantalla'],
      texto: [
        'Responsive de verdad: se prueba en celular, tablet y escritorio.',
        'No es la versión de computadora achicada, que es lo que suele pasar cuando el sitio sale de una plantilla.'
      ]
    },
    {
      nivel: 2,
      claves: ['plantilla', 'plantillas', 'wordpress', 'template', 'wix', 'generico'],
      texto: [
        'Cero plantillas: el sitio se dibuja para tu negocio, con tus colores y tu forma de vender.',
        'Por eso ningún proyecto del portfolio se parece a otro.'
      ]
    },
    {
      nivel: 2,
      claves: ['cambiar los precios', 'cambiar precios', 'actualizar precios', 'cargar precios', 'subir precios', 'editar', 'cambiar', 'actualizar', 'modificar', 'cms', 'administrar', 'cargar'],
      texto: [
        'Cuando el proyecto lo pide, el contenido lo administrás vos: cambiás un precio o sumás un producto y listo.',
        'Y después del lanzamiento el soporte sigue, no te quedás solo.'
      ]
    },
    {
      nivel: 2,
      claves: ['contacto', 'hablar', 'humano', 'persona', 'llamar', 'contactar', 'reunion', 'llamada'],
      texto: [
        'Te paso con una persona sin vueltas.',
        'Escribinos por WhatsApp y te respondemos el mismo día. También estamos en Instagram, en @zek.webs.'
      ],
      cta: true
    },
    {
      nivel: 0,
      claves: ['hola', 'buenas', 'buen dia', 'buenas tardes', 'buenas noches', 'que tal', 'holis'],
      texto: [
        '\u00a1Hola! Contame de qué es tu negocio y qué estás necesitando.',
        'Te puedo decir qué incluye una web, cuánto tarda, o mostrarte proyectos de tu rubro.'
      ]
    },
    {
      nivel: 0,
      claves: ['gracias', 'genial', 'perfecto', 'buenisimo', 'joya', 'dale'],
      texto: [
        '\u00a1Gracias a vos! Si te quedó alguna duda, preguntame.',
        'Y cuando quieras arrancar, escribinos por WhatsApp y lo vemos.'
      ],
      cta: true
    }
  ];

  const SIN_MATCH = {
    nivel: 2,
    texto: [
      'Esa no la tengo respondida en la demo del sitio.',
      'Sobre esto sí te puedo contar: qué incluye una web, cuánto tarda, cómo queda el dominio, o proyectos de tu rubro. La que conectamos a tu WhatsApp se arma con la información de tu negocio, así que ahí no hay preguntas fuera de tema.'
    ],
    cta: true
  };

  /* --- utilidades --- */

  const limpiar = (t) => t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // fuera tildes, para que "menú" matchee "menu"
    .replace(/\s+/g, ' ')
    .trim();

  const reloj = () => {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  /* Una pregunta concreta le gana a la mencion del rubro: "cuanto sale una
     web para mi barberia" tiene que contestar el precio, no describir el
     rubro. Por eso se elige primero entre los bloques de mayor nivel. */
  const elegir = (consulta) => {
    const t = limpiar(consulta);

    const puntuados = GUION.map((bloque) => {
      let puntos = 0;
      bloque.claves.forEach((k) => {
        const kk = limpiar(k);
        if (t.indexOf(kk) !== -1) puntos += kk.length;
      });
      return { bloque, puntos };
    }).filter((x) => x.puntos > 0);

    if (!puntuados.length) return SIN_MATCH;

    const techo = Math.max.apply(null, puntuados.map((x) => x.bloque.nivel));
    const finalistas = puntuados.filter((x) => x.bloque.nivel === techo);
    finalistas.sort((a, b) => b.puntos - a.puntos);
    const ganador = finalistas[0].bloque;

    /* si ademas nombro su rubro, se le suma la linea del rubro: la respuesta
       queda contestando la pregunta y reconociendo de que negocio habla */
    const rubro = puntuados
      .filter((x) => x.bloque.nivel === 1 && x.bloque.extra && x.bloque !== ganador)
      .sort((a, b) => b.puntos - a.puntos)[0];

    /* pero no se repite: si la respuesta ya nombro ese proyecto, el extra
       sobra y la burbuja queda diciendo dos veces lo mismo */
    if (rubro) {
      const yaEsta = ganador.texto.some(
        (p) => rubro.bloque.proyecto && p.indexOf(rubro.bloque.proyecto) !== -1
      );
      if (!yaEsta) {
        return {
          texto: ganador.texto.concat([rubro.bloque.extra]),
          cta: ganador.cta
        };
      }
    }

    return ganador;
  };

  /* --- pintar mensajes --- */

  const TILDES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12l4 4L14 8"/><path d="M9 12l4 4L21 8"/></svg>';

  const alFinal = () => { log.scrollTop = log.scrollHeight; };

  function burbuja(lado, parrafos, conCta) {
    const div = document.createElement('div');
    div.className = 'msg msg--' + lado;

    parrafos.forEach((p) => {
      const el = document.createElement('p');
      // los saltos de linea de las listas se respetan
      el.textContent = p;
      el.style.whiteSpace = 'pre-line';
      div.appendChild(el);
    });

    if (conCta) {
      const a = document.createElement('a');
      a.className = 'msg-cta';
      a.href = WA;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = 'Escribir por WhatsApp';
      div.appendChild(a);
    }

    const meta = document.createElement('span');
    meta.className = 'msg-meta';
    meta.innerHTML = '<time>' + reloj() + '</time>' + (lado === 'out' ? ' ' + TILDES : '');
    div.appendChild(meta);

    log.appendChild(div);
    alFinal();
    return div;
  }

  function escribiendo() {
    const s = document.createElement('span');
    s.className = 'chat-typing';
    s.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(s);
    alFinal();
    return s;
  }

  /* --- la columna del flujo acompana lo que pasa en el telefono --- */

  const pasos = Array.from(document.querySelectorAll('.auto-steps li'));

  function sincronizarFlujo(consulta) {
    const hora = reloj();
    if (pasos[0]) {
      const d = pasos[0].querySelector('.auto-step-desc');
      const t = pasos[0].querySelector('time');
      if (d) d.textContent = '\u201c' + consulta + '\u201d';
      if (t) t.textContent = hora;
    }
    if (pasos[1]) {
      const t = pasos[1].querySelector('time');
      if (t) t.textContent = hora;
    }
  }

  function cerrarFlujo() {
    if (pasos[2]) {
      const t = pasos[2].querySelector('time');
      if (t) t.textContent = reloj();
    }
  }

  /* --- ciclo de la conversacion --- */

  const lento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ocupado = false;

  function responder(consulta) {
    if (ocupado) return;
    const texto = consulta.trim();
    if (!texto) return;

    ocupado = true;
    form.setAttribute('aria-busy', 'true');

    burbuja('in', [texto], false);
    sincronizarFlujo(texto);
    campo.value = '';

    const puntos = escribiendo();
    const espera = lento ? 220 : 700 + Math.random() * 500;

    window.setTimeout(() => {
      puntos.remove();
      const r = elegir(texto);
      burbuja('out', r.texto, !!r.cta);
      cerrarFlujo();
      ocupado = false;
      form.removeAttribute('aria-busy');
    }, espera);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    responder(campo.value);
  });

  if (quick) {
    quick.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-q]');
      if (!b) return;
      responder(b.dataset.q);
      campo.focus();
    });
  }

  /* el reloj del telefono y el del saludo arrancan en la hora real, asi la
     conversacion no aparece fechada a una hora que no es */
  (() => {
    const hora = reloj();
    const sys = document.querySelector('.auto-sysbar__clock');
    if (sys) sys.textContent = hora;
    const primera = log.querySelector('.msg-meta time');
    if (primera) primera.textContent = hora;
  })();
})();

/* ---------- Armador de consulta ----------
   El visitante completa tipo, negocio, detalles y sus datos, y el mensaje
   de WhatsApp se escribe solo. El texto va precargado a proposito: lo
   redacta el que consulta con sus propias elecciones, no es un "hola"
   automatico. El envio sigue siendo un link de WhatsApp, sitio sin backend. */
(() => {
  const caja = document.getElementById('armar');
  const salida = document.getElementById('b-msg');
  const enviar = document.getElementById('b-send');
  const contador = document.getElementById('b-done');
  if (!caja || !salida || !enviar) return;

  const TEL = '5492216715279';
  const elegido = { tipo: '', rubro: '', detalles: '', nombre: '', contacto: '' };

  const redactar = () => {
    const t = elegido.tipo || 'una web';
    const nombre = elegido.nombre.trim();
    let m = nombre ? `Hola ZEK, soy ${nombre}. Quiero ${t}` : `Hola ZEK, quiero ${t}`;
    m += elegido.rubro.trim() ? ` para mi negocio de ${elegido.rubro.trim()}.` : ' para mi negocio.';
    if (elegido.detalles.trim()) m += ` ${elegido.detalles.trim()}`;
    if (elegido.contacto.trim()) m += ` Mi contacto: ${elegido.contacto.trim()}.`;
    return m;
  };

  const refrescar = () => {
    const texto = redactar();
    salida.textContent = texto;
    enviar.href = `https://wa.me/${TEL}?text=${encodeURIComponent(texto)}`;
    if (contador) {
      contador.textContent = [
        elegido.tipo,
        elegido.rubro.trim(),
        elegido.detalles.trim(),
        elegido.nombre.trim() && elegido.contacto.trim(),
      ].filter(Boolean).length;
    }
  };

  const grupoTipo = caja.querySelector('[data-group="tipo"]');
  if (grupoTipo) {
    grupoTipo.querySelectorAll('.b-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        const yaEstaba = btn.classList.contains('is-on');
        grupoTipo.querySelectorAll('.b-opt').forEach((o) => {
          o.classList.remove('is-on');
          o.setAttribute('aria-pressed', 'false');
        });
        // volver a tocar la misma opcion la deselecciona
        if (!yaEstaba) {
          btn.classList.add('is-on');
          btn.setAttribute('aria-pressed', 'true');
          elegido.tipo = btn.dataset.val;
        } else {
          elegido.tipo = '';
        }
        refrescar();
      });
      btn.setAttribute('aria-pressed', 'false');
    });
  }

  const camposTexto = {
    rubro: 'b-rubro',
    detalles: 'b-detalles',
    nombre: 'b-nombre',
    contacto: 'b-contacto',
  };

  Object.entries(camposTexto).forEach(([clave, id]) => {
    const campo = document.getElementById(id);
    if (!campo) return;
    campo.addEventListener('input', () => {
      elegido[clave] = campo.value;
      refrescar();
    });
  });

  refrescar();
})();

