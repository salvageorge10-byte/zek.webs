const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Año del footer ---------- */
(() => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();

/* ---------- Apariciones ligadas al scroll ----------
   No es un disparo unico: cada bloque tiene un progreso 0..1 que depende
   de donde esta en pantalla, y se recalcula en cada cuadro mientras baja
   o sube. Para que no cueste, solo se calculan los que estan cerca del
   viewport; de eso se encarga el observer que llena "activos". */
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
  markAll('.steps li', 'up', 90);
  markAll('.inc-grid .inc', 'up', 80);
  markAll('.faq-list .faq-item', 'up', 70);
  markAll('.contact-cards .contact-card', 'up', 90);
  mark(document.querySelector('.contact-note'), 'up', 180);
  markAll('.footer-brand, .footer-links', 'up', 80);

  if (!targets.length) return;

  if (prefersReducedMotion) {
    targets.forEach((el) => el.style.setProperty('--p', '1'));
    return;
  }

  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

  // el bloque empieza a entrar cuando su borde superior cruza el 92% de
  // la pantalla y termina de acomodarse un 32% mas arriba
  const START = 0.92;
  const RUN = 0.32;

  let ticking = false;

  // Dos pasadas: primero se leen todas las posiciones y recien despues se
  // escriben los valores. Mezclarlas obligaria al navegador a recalcular
  // el layout en cada elemento.
  function update() {
    const vh = window.innerHeight;
    const doc = document.documentElement;

    // Al final de la pagina ya no queda scroll para completar la entrada:
    // lo que esta a la vista tiene que verse entero igual.
    const atBottom = window.scrollY + vh >= doc.scrollHeight - 2;

    const ps = targets.map((el) => {
      const top = el.getBoundingClientRect().top;
      if (atBottom && top < vh) return 1;
      return clamp((vh * START - top - (el._revShift || 0)) / (vh * RUN));
    });

    targets.forEach((el, i) => el.style.setProperty('--p', ps[i].toFixed(3)));
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

      // si no hay ninguna en la banda (ej. secciones que no estan en el
      // menu), se conserva la ultima marcada en vez de apagarlas todas
      if (!top) return;
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

      if (!isOpen) {
        item.setAttribute('open', '');
        wrap.style.height = '0px';
        requestAnimationFrame(() => { wrap.style.height = `${wrap.scrollHeight}px`; });
      } else {
        wrap.style.height = `${wrap.scrollHeight}px`;
        requestAnimationFrame(() => { wrap.style.height = '0px'; });
      }

      const done = () => {
        wrap.removeEventListener('transitionend', done);
        if (isOpen) item.removeAttribute('open');
        else wrap.style.height = 'auto'; // permite que el texto refluya al cambiar de tamaño
        animating = false;
      };

      wrap.addEventListener('transitionend', done);
    });

    window.addEventListener('resize', () => {
      if (item.hasAttribute('open') && !animating) wrap.style.height = 'auto';
    }, { passive: true });
  });
})();

/* ---------- Efectos ligados al scroll ----------
   Un solo listener con rAF para todo: el paneo de las capturas del
   portfolio y el parallax del mockup del hero. Se comporta igual en
   celular y en escritorio, así las portadas se ven siempre iguales. */
(() => {
  if (prefersReducedMotion) return;

  // En tactil el recorrido lo maneja la animacion "tour" (mas abajo), asi
  // que el paneo por scroll se deja de lado para que no se pisen.
  const tactil = window.matchMedia('(hover: none)').matches;

  const shots = tactil ? [] : Array.from(document.querySelectorAll('[data-work] .work-shot'));
  const stage = document.querySelector('.stage-inner');
  if (!shots.length && !stage) return;

  // Cuánto llega a desplazarse la captura. El recorrido completo es 70%;
  // usamos una fracción para que la portada nunca quede lejos.
  const PAN = 24;
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  let ticking = false;

  const update = () => {
    const vh = window.innerHeight;

    shots.forEach((shot) => {
      const card = shot.closest('[data-work]');
      const r = card.getBoundingClientRect();

      // fuera de pantalla: no gastamos cálculo
      if (r.bottom < -200 || r.top > vh + 200) return;

      const cardCenter = r.top + r.height / 2;
      const vpCenter = vh / 2;

      // 0 mientras la tarjeta entra o está centrada -> se ve la portada.
      // Crece solo cuando la tarjeta empieza a salir por arriba.
      const p = clamp((vpCenter - cardCenter) / (vh / 2 + r.height / 2), 0, 1);
      shot.style.setProperty('--pan', `${(-p * PAN).toFixed(2)}%`);
    });

    if (stage) {
      const r = stage.getBoundingClientRect();
      if (r.bottom > -200 && r.top < vh + 200) {
        // el mockup sube un poco más lento que la página
        const off = clamp((vh / 2 - (r.top + r.height / 2)) * 0.06, -40, 40);
        stage.style.setProperty('--par', `${off.toFixed(1)}px`);
      }
    }

    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });

  window.addEventListener('resize', update, { passive: true });
  update();
})();

/* ---------- Barra de progreso de lectura ---------- */
(() => {
  const bar = document.getElementById('progress');
  if (!bar) return;

  let ticking = false;

  const update = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    bar.style.transform = `scaleX(${max > 0 ? doc.scrollTop / max : 0})`;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });

  update();
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
