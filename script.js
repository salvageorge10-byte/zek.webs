const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Año del footer ---------- */
(() => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
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
