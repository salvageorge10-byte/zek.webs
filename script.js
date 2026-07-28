(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealTargets = document.querySelectorAll('.steps li, .type-card, .testi-card, .contact-card, .ig-card');

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((el) => el.classList.add('in-view'));
  } else {
    revealTargets.forEach((el) => el.classList.add('reveal'));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -40px 0px' }
    );

    revealTargets.forEach((el) => observer.observe(el));
  }
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
    { keys: ['proceso', 'como trabajan', 'cómo trabajan', 'pasos', 'trabajan'], text: 'Trabajamos en 4 pasos: nos contás tu idea, armamos una propuesta a medida, construimos el sitio y lo lanzamos. Podés ver el detalle en la sección "Proceso".' },
    { keys: ['precio', 'costo', 'cuanto sale', 'cuánto sale', 'presupuesto', 'vale', 'plata'], text: 'Cada proyecto se cotiza a medida según lo que necesite tu negocio. Escribinos por WhatsApp y te pasamos un presupuesto sin compromiso.' },
    { keys: ['tiempo', 'tarda', 'demora', 'cuando', 'cuándo', 'plazo'], text: 'La primera propuesta de diseño la tenés en 72 horas. El sitio completo, según la complejidad, entre 1 y 3 semanas.' },
    { keys: ['tipos', 'rubro', 'tienda', 'restaurante', 'gastro', 'servicio', 'portfolio', 'personal'], text: 'Hacemos tiendas online, sitios de servicios, restaurantes y portfolios personales. Si tu rubro es otro, contanos igual.' },
    { keys: ['dominio', 'hosting', 'mantenimiento', 'soporte'], text: 'El dominio, el hosting y el contenido quedan 100% a tu nombre, y ofrecemos soporte y actualizaciones después del lanzamiento.' },
    { keys: ['hola', 'buenas', 'buen dia', 'buenas tardes', 'buenas noches'], text: '¡Hola! ¿En qué te puedo ayudar? Preguntame sobre el proceso, tiempos, precios o tipos de sitio.' },
    { keys: ['gracias'], text: '¡De nada! Cualquier otra duda, acá estoy.' },
  ];

  const chipQuestions = {
    proceso: '¿Cómo es el proceso de trabajo?',
    precio: '¿Cuánto cuesta una web?',
    tiempos: '¿Cuánto tarda el proyecto?',
    tipos: '¿Con qué tipos de sitio trabajan?',
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
