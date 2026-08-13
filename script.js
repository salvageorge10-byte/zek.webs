const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Fade-in + slide-up al entrar en el viewport ---------- */
(() => {
  // Grupos que entran escalonados: los hijos de un mismo grupo se retrasan entre sí.
  const groups = [
    '.stats-inner',
    '.steps',
    '.type-grid',
    '.testi-grid',
    '.portfolio-grid',
    '.faq-list',
    '.contact-cards',
  ];

  // Encabezados y bloques sueltos que entran de a uno.
  const singles = [
    '.process > .eyebrow', '.process > h2',
    '.types > .eyebrow', '.types > h2',
    '.testimonials > .eyebrow', '.testimonials > h2',
    '.faq > .eyebrow', '.faq > h2',
    '.portfolio-head', '.portfolio-cta',
    '.contact-inner > .eyebrow', '.contact-inner > h2', '.contact-inner > .contact-sub',
  ];

  const targets = [];

  groups.forEach((sel) => {
    const parent = document.querySelector(sel);
    if (!parent) return;
    Array.from(parent.children).forEach((child, i) => {
      // el escalonado se corta a los 4 para que nunca se sienta lento
      child.style.setProperty('--reveal-delay', `${Math.min(i, 3) * 80}ms`);
      targets.push(child);
    });
  });

  singles.forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) targets.push(el);
  });

  if (!targets.length) return;

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('in-view'));
    return;
  }

  targets.forEach((el) => el.classList.add('reveal'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -50px 0px' }
  );

  targets.forEach((el) => observer.observe(el));
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

    const setHeight = (to) => {
      wrap.style.height = `${to}px`;
    };

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
        setHeight(0);
        requestAnimationFrame(() => setHeight(wrap.scrollHeight));
      } else {
        setHeight(wrap.scrollHeight);
        requestAnimationFrame(() => setHeight(0));
      }

      const done = () => {
        wrap.removeEventListener('transitionend', done);
        if (isOpen) item.removeAttribute('open');
        else wrap.style.height = 'auto'; // permite que el texto refluya al cambiar de tamaño
        animating = false;
      };

      wrap.addEventListener('transitionend', done);
    });

    // si la ventana cambia de ancho, el alto fijo dejaría de servir
    window.addEventListener('resize', () => {
      if (item.hasAttribute('open') && !animating) wrap.style.height = 'auto';
    }, { passive: true });
  });
})();

/* ---------- Previews del portfolio: se cargan solo al acercarse ---------- */
(() => {
  const frames = document.querySelectorAll('.work-viewport iframe[data-src]');
  if (!frames.length) return;

  const load = (frame) => {
    if (frame.dataset.loaded) return;
    frame.dataset.loaded = '1';
    frame.src = frame.dataset.src;
    frame.addEventListener('load', () => frame.classList.add('is-loaded'), { once: true });
  };

  if (!('IntersectionObserver' in window)) {
    frames.forEach(load);
    return;
  }

  // margen amplio: el preview ya está listo cuando la tarjeta entra en pantalla
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        load(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '300px 0px' }
  );

  frames.forEach((frame) => observer.observe(frame));
})();

/* ---------- Help chat (client-side FAQ assistant, no external calls) ---------- */
(() => {
  const toggle = document.getElementById('chatToggle');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatClose');
  const log = document.getElementById('chatLog');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const chips = document.getElementById('chatChips');

  if (!toggle || !panel || !form || !input || !log) return;

  const WHATSAPP_URL = 'https://wa.me/5492216438512?text=Hola%20ZEK%2C%20tengo%20una%20consulta';

  const responses = [
    { keys: ['proceso', 'como trabajan', 'cómo trabajan', 'pasos', 'estrategia', 'diseño', 'desarrollo'], text: 'Trabajamos en 4 pasos: analizamos tu negocio para definir estrategia, creamos un diseño visual único, construimos un sitio rápido y optimizado, y lo lanzamos con soporte completo. Podés ver más en "Proceso".' },
    { keys: ['precio', 'presupuesto', 'costo', 'cuanto sale', 'cuánto sale', 'vale', 'plata', 'tarifa'], text: 'Cada proyecto se cotiza a medida. El rango típico para webs profesionales es de $2.000 a $8.000 USD según funcionalidades e integraciones. Ofrecemos consulta gratuita sin compromiso. Escribinos por WhatsApp.' },
    { keys: ['tiempo', 'tarda', 'demora', 'cuando', 'cuándo', 'plazo', '48', '2 a 4 semanas'], text: 'La propuesta inicial la tenés en 48 horas. El sitio completo tarda entre 2 a 4 semanas según complejidad. E-commerce y plataformas especiales pueden tomar más tiempo, pero lo definimos desde el inicio.' },
    { keys: ['tipos', 'rubro', 'tienda', 'restaurante', 'gastro', 'ecommerce', 'servicio', 'portfolio', 'personal', 'web'], text: 'Hacemos e-commerce, sitios de servicios/lead generation, restaurantes, y portfolios personales. Si tu rubro es otro, contanos igual. Cada proyecto es único y estratégico para tu negocio.' },
    { keys: ['dominio', 'hosting', 'mantenimiento', 'soporte', 'lanzamiento', 'después'], text: 'El dominio, hosting y código fuente quedan 100% a tu nombre. Incluimos soporte técnico por 30 días post-lanzamiento. Mantenimiento y actualizaciones se contratan aparte en planes mensuales.' },
    { keys: ['plantilla', 'template', 'genérico', 'custom', 'original', 'diseño'], text: '100% diseño original. No usamos plantillas genéricas. Cada web es única, diseñada estratégicamente para tu negocio, marca y objetivos de conversión.' },
    { keys: ['hola', 'buenas', 'buen dia', 'buenas tardes', 'buenas noches'], text: '¡Hola! Soy el asistente de ZEK. ¿En qué te ayudo? Preguntame sobre proceso, presupuesto, tiempos o tipos de sitios.' },
    { keys: ['gracias'], text: '¡De nada! Cualquier otra consulta, acá estoy para ayudarte.' },
  ];

  const chipQuestions = {
    proceso: '¿Cómo es el proceso de trabajo?',
    precio: '¿Cuál es el presupuesto?',
    tiempos: '¿Cuánto tarda un proyecto?',
    tipos: '¿Qué tipos de web hacen?',
  };

  function findResponse(text) {
    const t = text.toLowerCase();
    const hit = responses.find((r) => r.keys.some((k) => t.includes(k)));
    return hit ? hit.text : null;
  }

  function addMessage(role, text) {
    const bubble = document.createElement('div');
    bubble.className = `chat-msg chat-msg--${role}`;
    bubble.textContent = text;
    log.appendChild(bubble);
    log.scrollTop = log.scrollHeight;
    return bubble;
  }

  function addFallback() {
    const bubble = document.createElement('div');
    bubble.className = 'chat-msg chat-msg--bot';
    bubble.textContent = 'No tengo una respuesta puntual para eso. Escribinos directo y te ayudamos personalmente: ';
    const link = document.createElement('a');
    link.href = WHATSAPP_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'abrir WhatsApp';
    bubble.appendChild(link);
    log.appendChild(bubble);
    log.scrollTop = log.scrollHeight;
  }

  function respondTo(question) {
    addMessage('user', question);
    const answer = findResponse(question);
    window.setTimeout(() => {
      if (answer) {
        addMessage('bot', answer);
      } else {
        addFallback();
      }
    }, 300);
  }

  function openChat() {
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    if (!log.dataset.greeted) {
      addMessage('bot', '¡Hola! Soy el asistente de ZEK 👋 Preguntame sobre el proceso, tiempos, precios o tipos de sitio.');
      log.dataset.greeted = 'true';
    }
    input.focus();
  }

  function closeChat() {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }

  toggle.addEventListener('click', () => {
    if (panel.hidden) openChat();
    else closeChat();
  });

  closeBtn.addEventListener('click', closeChat);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) closeChat();
  });

  chips.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-q]');
    if (!btn) return;
    const question = chipQuestions[btn.dataset.q];
    if (question) respondTo(question);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    respondTo(value);
    input.value = '';
  });
})();
