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

  markAll('.values-inner .value', 'up', 90);

  // --- portfolio: primero la imagen, despues la ficha ---
  document.querySelectorAll('[data-work]').forEach((work) => {
    mark(work.querySelector('.work-visual'), 'zoom', 0);
    mark(work.querySelector('.work-info'), 'up', 150);
  });
  mark(document.querySelector('.portfolio-cta'), 'up', 0);

  markAll('.plan-grid .plan', 'up', 90);
  markAll('.about-body p', 'up', 90);
  mark(document.querySelector('.about-meta'), 'up', 220);
  markAll('.inc-grid .inc', 'up', 80);
  markAll('.faq-list .faq-item', 'up', 70);
  markAll('.contact-cards .contact-card', 'up', 90);
  mark(document.querySelector('.contact-note'), 'up', 180);
  markAll('.footer-brand, .footer-links', 'up', 80);

  const bar = document.getElementById('progress');

  if (prefersReducedMotion) {
    targets.forEach((el) => el.style.setProperty('--p', '1'));
    if (!bar) return;
  }

  // En tactil el recorrido de las capturas lo maneja la animacion "tour"
  // (mas abajo), asi que el paneo por scroll se deja de lado.
  const tactil = window.matchMedia('(hover: none)').matches;
  const shots = (prefersReducedMotion || tactil)
    ? []
    : Array.from(document.querySelectorAll('[data-work] .work-shot'));
  const stage = prefersReducedMotion ? null : document.querySelector('.stage-inner');
  const reveals = prefersReducedMotion ? [] : targets;

  if (!reveals.length && !shots.length && !stage && !bar) return;

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

  // el bloque empieza a entrar cuando su borde superior cruza el 92% de
  // la pantalla y termina de acomodarse un 32% mas arriba
  const START = 0.92;
  const RUN = 0.32;

  // Cuánto llega a desplazarse la captura. El recorrido completo es 70%;
  // usamos una fracción para que la portada nunca quede lejos.
  const PAN = 24;

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

    const pans = shots.map((shot) => {
      const r = shot.closest('[data-work]').getBoundingClientRect();
      // fuera de pantalla: no gastamos calculo
      if (r.bottom < -200 || r.top > vh + 200) return null;
      // 0 mientras la tarjeta entra o esta centrada -> se ve la portada.
      // Crece solo cuando la tarjeta empieza a salir por arriba.
      const p = clamp((vh / 2 - (r.top + r.height / 2)) / (vh / 2 + r.height / 2));
      return `${(-p * PAN).toFixed(2)}%`;
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
    for (let i = 0; i < shots.length; i++) {
      if (pans[i] !== null) shots[i].style.setProperty('--pan', pans[i]);
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

/* ---------- FAQ: despliegue animado por altura ---------- */
(() => {
  const items = document.querySelectorAll('.faq-item');
  if (!items.length) return;

  items.forEach((item) => {
    const summary = item.querySelector('summary');
    const body = item.querySelector('p');
    if (!summary || !body) return;

    // el ícono +/- se dibuja con CSS sobre este span
    const icon = document.createElement('span');
    icon.className = 'faq-icon';
    icon.setAttribute('aria-hidden', 'true');
    summary.appendChild(icon);

    // envolvemos el texto para poder animar su altura
    const wrap = document.createElement('div');
    wrap.className = 'faq-body';
    body.parentNode.insertBefore(wrap, body);
    wrap.appendChild(body);

    let animating = false;

    summary.addEventListener('click', (e) => {
      e.preventDefault();
      if (animating) return;

      const isOpen = item.hasAttribute('open');

      if (prefersReducedMotion) {
        item.toggleAttribute('open');
        wrap.style.height = isOpen ? '0px' : 'auto';
        return;
      }

      animating = true;

      // Se lee la altura una sola vez y se fuerza el recalculo antes de
      // pedir el valor final. Sin ese recalculo el navegador puede unir
      // los dos cambios en uno solo: al cerrar partiria de "auto", que no
      // se puede interpolar, no habria transicion y nunca llegaria el
      // transitionend que libera la tarjeta.
      const alto = wrap.scrollHeight;

      if (!isOpen) {
        item.setAttribute('open', '');
        wrap.style.height = '0px';
        void wrap.offsetHeight;
        wrap.style.height = `${alto}px`;
      } else {
        wrap.style.height = `${alto}px`;
        void wrap.offsetHeight;
        wrap.style.height = '0px';
      }

      let red;

      const done = (ev) => {
        // El parrafo de adentro tambien anima (opacidad y desplazamiento)
        // y sus eventos burbujean hasta aca: sin este filtro, el primero
        // que llega corta la animacion de altura por la mitad.
        if (ev && (ev.target !== wrap || ev.propertyName !== 'height')) return;

        clearTimeout(red);
        wrap.removeEventListener('transitionend', done);
        wrap.removeEventListener('transitioncancel', done);

        if (isOpen) item.removeAttribute('open');
        else wrap.style.height = 'auto'; // permite que el texto refluya al cambiar de tamaño
        animating = false;
      };

      // Red de seguridad: si por lo que sea no llega ningun evento, la
      // pregunta no puede quedar trabada para siempre.
      red = setTimeout(done, 600);

      wrap.addEventListener('transitionend', done);
      wrap.addEventListener('transitioncancel', done);
    });

    window.addEventListener('resize', () => {
      if (item.hasAttribute('open') && !animating) wrap.style.height = 'auto';
    }, { passive: true });
  });
})();

/* ---------- Armador de consulta ----------
   El visitante elige tipo, rubro y plan, y el mensaje de WhatsApp se
   escribe solo. El texto va precargado a proposito: lo redacta el que
   consulta con sus propias elecciones, no es un "hola" automatico.
   El boton flotante sigue abriendo el chat vacio. */
(() => {
  const caja = document.getElementById('armar');
  const salida = document.getElementById('b-msg');
  const enviar = document.getElementById('b-send');
  const contador = document.getElementById('b-done');
  if (!caja || !salida || !enviar) return;

  const TEL = '5492216715279';
  const elegido = { tipo: '', rubro: '', plan: '' };

  const redactar = () => {
    const t = elegido.tipo || 'una web';
    let m = `Hola ZEK, quiero ${t}`;
    m += elegido.rubro ? ` para mi negocio de ${elegido.rubro}.` : ' para mi negocio.';
    if (elegido.plan) m += ` Estaba mirando ${elegido.plan}.`;
    return m;
  };

  const refrescar = () => {
    const texto = redactar();
    salida.textContent = texto;
    enviar.href = `https://wa.me/${TEL}?text=${encodeURIComponent(texto)}`;
    if (contador) {
      contador.textContent = ['tipo', 'rubro', 'plan']
        .filter((k) => caja.querySelector(`[data-group="${k}"] .b-opt.is-on`)).length;
    }
  };

  caja.querySelectorAll('.b-group').forEach((grupo) => {
    const clave = grupo.dataset.group;
    grupo.querySelectorAll('.b-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        const yaEstaba = btn.classList.contains('is-on');
        grupo.querySelectorAll('.b-opt').forEach((o) => {
          o.classList.remove('is-on');
          o.setAttribute('aria-pressed', 'false');
        });
        // volver a tocar la misma opcion la deselecciona
        if (!yaEstaba) {
          btn.classList.add('is-on');
          btn.setAttribute('aria-pressed', 'true');
          elegido[clave] = btn.dataset.val;
        } else {
          elegido[clave] = '';
        }
        refrescar();
      });
      btn.setAttribute('aria-pressed', 'false');
    });
  });

  refrescar();
})();

/* ---------- Recorrido automático en pantallas táctiles ----------
   En la computadora alcanza con pasar el mouse por encima para que la
   captura recorra el sitio. En el celular no hay hover, así que el
   recorrido arranca solo cuando la tarjeta queda centrada, y se corta al
   salir: nunca hay más de una animando a la vez. */
(() => {
  if (prefersReducedMotion) return;
  if (!window.matchMedia('(hover: none)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  // Se observa la ventana del navegador, no la tarjeta entera: la tarjeta
  // completa mide mas que la pantalla de un celular y en equipos chicos
  // nunca llegaria a cumplir el umbral. La imagen mide ~320px y siempre
  // entra holgada.
  const frames = document.querySelectorAll('[data-work] .work-visual');
  if (!frames.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const card = entry.target.closest('[data-work]');
        if (!card) return;

        if (entry.isIntersecting) {
          card.classList.add('is-touring');
          return;
        }

        // Al salir se quita la clase para que, si volvés a subir, el
        // recorrido se vuelva a reproducir desde la portada.
        card.classList.remove('is-touring');
      });
    },
    { threshold: 0.6 }
  );

  frames.forEach((f) => observer.observe(f));
})();
