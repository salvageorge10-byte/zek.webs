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

