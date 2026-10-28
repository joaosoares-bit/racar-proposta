/* RACAR — comportamento do site. Sem bibliotecas. Tudo funciona sem isto; isto só melhora. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const raiz = document.documentElement;
  const WA = '351910765230', EMAIL = 'racar@racar.pt';

  /* ── Movimento reduzido: sistema + interruptor do rodapé (soma, nunca contraria) ── */
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const guardado = () => { try { return localStorage.getItem('racar-mov') === 'reduzido'; } catch { return false; } };
  const reduzido = () => mq.matches || guardado();
  const aplicaMov = () => {
    raiz.dataset.mov = reduzido() ? 'reduzido' : 'normal';
    $$('.mov').forEach((b) => { b.setAttribute('aria-pressed', String(reduzido())); });
    document.dispatchEvent(new CustomEvent('racar:mov'));
  };
  aplicaMov(); mq.addEventListener('change', aplicaMov);
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.mov'); if (!b) return;
    try { guardado() ? localStorage.removeItem('racar-mov') : localStorage.setItem('racar-mov', 'reduzido'); } catch {}
    aplicaMov();
  });

  /* ── Cabeçalho: sólido depois do topo, esconde a descer, volta a subir ── */
  const cab = $('.cab');
  if (cab) {
    let antes = 0;
    const ao = () => {
      const y = scrollY;
      const pin = $('.hero-pin'), lim = pin && !reduzido() ? pin.offsetHeight - innerHeight - 40 : 40;
      cab.classList.toggle('solido', y > lim);
      cab.classList.toggle('fora', y > 500 && y > antes && !$('.menu[data-aberto]'));
      antes = y;
    };
    ao(); addEventListener('scroll', ao, { passive: true });
  }

  /* ── Menu de telemóvel: é uma página, com foco preso e Esc ── */
  const menu = $('.menu'), abre = $('.menu-bt');
  if (menu && abre) {
    const fecha = () => { menu.removeAttribute('data-aberto'); menu.inert = true; abre.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; abre.focus(); };
    menu.inert = true;
    abre.addEventListener('click', () => { menu.dataset.aberto = ''; menu.inert = false; abre.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; setTimeout(() => $('.menu-fechar', menu).focus(), 60); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.hasAttribute('data-aberto')) fecha(); });
    $('.menu-fechar', menu).addEventListener('click', fecha);
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') { const f = $$('a,button', menu); const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
  }

  /* ── Revelações: títulos por linha, blocos, imagens ── */
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('[data-rev],[data-linhas],[data-img]').forEach((el) => io.observe(el));

  /* ── Números que contam (ano, km, cv) — o valor final já está no HTML ── */
  const fmt = { format: (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') };
  const ioN = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; ioN.unobserve(e.target);
    const el = e.target, fim = +el.dataset.conta, simples = el.dataset.simples === '1';
    if (reduzido() || !fim) return;
    const t0 = performance.now(), dur = 1200, ini = simples ? Math.max(0, fim - 60) : 0;
    const passo = (t) => { const p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 4), v = Math.round(ini + (fim - ini) * k); el.textContent = simples ? v : fmt.format(v); if (p < 1) requestAnimationFrame(passo); };
    requestAnimationFrame(passo);
  }), { threshold: 0.6 });
  $$('[data-conta]').forEach((el) => ioN.observe(el));

  /* ── Vídeo do hero: uma só fonte (a do ecrã) e arranque garantido. Se o browser recusar o arranque,
        volta a tentar quando o vídeo está pronto, quando o separador fica visível e ao primeiro gesto.
        Só pára com o interruptor «Reduzir movimento» do rodapé. ── */
  const v = $('.hero video');
  if (v) {
    const fonte = () => { const px = innerWidth * (devicePixelRatio || 1), d = v.dataset;      // píxeis reais do ecrã: serve-se a melhor versão que ele consegue mostrar
      if (matchMedia('(max-width: 760px) and (orientation: portrait)').matches) return px >= 1000 ? d.movelHd : d.movel;
      return px >= 3000 ? d['4k'] : px >= 2000 ? d['2k'] : px >= 1300 ? d.grande : d.medio; };
    v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    let fora = false, parado = false; const bt = $('.hero .pausa');
    const toca = () => {
      if (guardado() || fora || parado || document.hidden) return;
      if (!v.getAttribute('src')) { v.src = fonte(); v.load(); }
      const pr = v.play(); if (pr && pr.catch) pr.catch(() => {});
    };
    v.addEventListener('playing', () => v.classList.add('a-tocar'));
    /* abertura: o título nasce escondido e só entra quando o logótipo sai (4,3 s). Se o filme não arrancar
       em 3,5 s, ou com movimento reduzido, o título aparece logo. Em cada volta do filme repete-se. */
    const heroEl = v.closest('.hero'); let tocou = false, desistiu = false;
    const vez = () => { tocou = tocou || v.currentTime > 0.05;
      const noLogo = v.currentTime < 4.3 || (v.duration && v.currentTime > v.duration - 0.6);
      heroEl.classList.toggle('logo-a-frente', !reduzido() && !guardado() && (tocou ? (!v.paused && noLogo) : !desistiu)); };
    setTimeout(() => { desistiu = true; vez(); }, 3500); vez(); document.addEventListener('racar:mov', vez);
    v.addEventListener('timeupdate', vez); v.addEventListener('pause', vez); v.addEventListener('playing', vez);
    ['loadeddata', 'canplay', 'pause', 'stalled'].forEach((ev) => v.addEventListener(ev, () => { if (v.paused) setTimeout(toca, 150); }));
    document.addEventListener('visibilitychange', toca); addEventListener('pageshow', toca); addEventListener('focus', toca);
    const gesto = () => toca(); ['pointerdown', 'touchstart', 'keydown', 'scroll'].forEach((ev) => addEventListener(ev, gesto, { passive: true }));
    new IntersectionObserver(([e]) => { fora = !e.isIntersecting; if (fora) v.pause(); else toca(); }).observe(v);
    document.addEventListener('racar:mov', () => { if (guardado()) v.pause(); else toca(); });
    const sinal = () => { if (bt) { bt.setAttribute('aria-pressed', String(v.paused)); bt.setAttribute('aria-label', v.paused ? 'Retomar o filme' : 'Pausar o filme'); } };
    v.addEventListener('playing', sinal); v.addEventListener('pause', sinal);
    if (bt) bt.addEventListener('click', () => { parado = !v.paused; if (parado) v.pause(); else toca(); });
    toca(); setTimeout(toca, 800); setTimeout(toca, 2500);
  }

  /* ── Hero em ecrã inteiro que, ao descer, encolhe para uma moldura (o scroll conduz --p de 0 a 1) ── */
  const pinH = $('.hero-pin');
  if (pinH) {
    let pedido = false;
    const mede = () => { pedido = false; const d = pinH.offsetHeight - innerHeight; const p = reduzido() || d <= 0 ? 0 : Math.min(1, Math.max(0, (scrollY - pinH.offsetTop) / d)); pinH.style.setProperty('--p', p.toFixed(4)); };
    const ao = () => { if (!pedido) { pedido = true; requestAnimationFrame(mede); } };
    mede(); addEventListener('scroll', ao, { passive: true }); addEventListener('resize', ao); document.addEventListener('racar:mov', mede);
  }

  /* ── Planos de vídeo nas secções: só carregam à vista, têm pausa, e não tocam com movimento reduzido ── */
  $$('.citacao video[data-src]').forEach((vd) => {
    const bt = $('.pausa', vd.parentElement); let parado = false;
    const est = () => { const on = !vd.paused; vd.classList.toggle('a-tocar', on || vd.currentTime > 0); bt.setAttribute('aria-pressed', String(!on)); bt.setAttribute('aria-label', on ? 'Pausar o vídeo' : 'Retomar o vídeo'); };
    const toca2 = () => { if (!vd.src) vd.src = innerWidth * (devicePixelRatio || 1) >= 2400 && vd.dataset['2k'] ? vd.dataset['2k'] : vd.dataset.src; vd.play().then(est).catch(est); };
    bt.hidden = false; est();
    bt.addEventListener('click', () => { if (vd.paused) { parado = false; toca2(); } else { parado = true; vd.pause(); est(); } });
    new IntersectionObserver(([en]) => { if (en.isIntersecting && !parado && !reduzido() && !(navigator.connection && navigator.connection.saveData)) toca2(); else if (!vd.paused) { vd.pause(); est(); } }, { threshold: 0.25 }).observe(vd);
    document.addEventListener('racar:mov', () => { if (reduzido() && !vd.paused) { vd.pause(); est(); } });
  });

  /* ── Restauro preso ao scroll: a secção fica presa e os passos acendem à vez.
        Fluidez: em vez de trocar imagens, reproduz-se vídeo a 60 imagens por segundo. O scroll diz onde a
        montagem deve estar; o vídeo vai até lá a andar (mais depressa se estiver longe), para a frente ou,
        ao subir, num segundo vídeo igual mas invertido. Nunca há saltos de fotograma. ── */
  $$('[data-montagem]').forEach((sec) => {
    const vF = $('video.frente', sec), vR = $('video.tras', sec), nPassos = +sec.dataset.passos || 1;
    const movel = matchMedia('(max-width: 760px)').matches;
    let D = 0, dir = 1, activo = vF, troca = false, raf = 0, pedidas = false, mostrado = 0, primeira = true;
    const estatica = () => reduzido();
    const alvoP = () => { const d = sec.offsetHeight - innerHeight; return estatica() || d <= 0 ? 1 : Math.min(1, Math.max(0, (scrollY - sec.offsetTop) / d)); };
    const agora = () => (dir > 0 ? vF.currentTime : D - vR.currentTime);
    const carrega = () => { if (pedidas) return; pedidas = true;
      const nitido = innerWidth * (devicePixelRatio || 1) >= 2400;
      [vF, vR].forEach((v) => { v.muted = true; v.playsInline = true; v.src = movel ? v.dataset.movel : (nitido && v.dataset['2k'] ? v.dataset['2k'] : v.dataset.src); v.preload = 'auto'; v.load(); });
      vF.addEventListener('loadedmetadata', () => { D = vF.duration - 0.05; vF.classList.add('activo'); sec.classList.add('pronta'); pede(); }, { once: true }); };
    const passo = () => { raf = 0;
      const a = alvoP(); mostrado = primeira || estatica() ? a : mostrado + (a - mostrado) * 0.14; primeira = false;
      if (Math.abs(a - mostrado) < 0.0006) mostrado = a;
      sec.style.setProperty('--p', mostrado.toFixed(4));
      const pp = String(Math.min(nPassos - 1, Math.floor(mostrado * nPassos))); if (sec.dataset.passo !== pp) sec.dataset.passo = pp;
      let vivo = mostrado !== a;
      if (D && !estatica() && !troca) {
        const alvoT = Math.min(1, a / 0.9) * D, t = agora(), falta = alvoT - t, quer = falta >= 0 ? 1 : -1;
        if (Math.abs(falta) < 0.035 || (!activo.paused && falta * dir <= 0)) { if (!activo.paused) activo.pause(); }
        else if (quer !== dir) {                                                  // mudou o sentido do scroll: passa para o outro vídeo, no mesmo instante
          troca = true; activo.pause(); const outro = quer > 0 ? vF : vR, onde = quer > 0 ? t : D - t;
          const feito = () => { outro.classList.add('activo'); activo.classList.remove('activo'); activo = outro; dir = quer; troca = false; pede(); };
          outro.addEventListener('seeked', feito, { once: true }); outro.currentTime = Math.min(D, Math.max(0, onde));
        } else { activo.playbackRate = Math.min(6, Math.max(0.3, Math.abs(falta) * 2.4)); if (activo.paused) { const pr = activo.play(); if (pr && pr.catch) pr.catch(() => {}); } vivo = true; }
      }
      if (vivo || troca) pede(); };
    const pede = () => { if (!raf) raf = requestAnimationFrame(passo); };
    const modo = () => { sec.classList.toggle('estatica', estatica()); if (estatica()) [vF, vR].forEach((v) => v.pause()); primeira = true; pede(); };
    new IntersectionObserver(([en]) => { if (en.isIntersecting && !estatica()) carrega(); else if (!en.isIntersecting) [vF, vR].forEach((v) => v.pause()); }, { rootMargin: '120% 0px' }).observe(sec);
    modo(); addEventListener('scroll', pede, { passive: true }); addEventListener('resize', pede); document.addEventListener('racar:mov', modo);
  });

  /* ── Animação de restauro: arranca ao entrar no ecrã, toca uma vez e fica no carro pronto; ao voltar, recomeça ── */
  $$('[data-filme]').forEach((f) => {
    const vd = $('video', f), bt = $('.pausa', f); let parado = false, visto = false;
    const est = () => { bt.setAttribute('aria-pressed', String(vd.paused)); bt.setAttribute('aria-label', vd.paused ? 'Ver a animação' : 'Pausar a animação'); };
    const toca3 = (doInicio) => { if (!vd.getAttribute('src')) { vd.src = matchMedia('(max-width: 760px)').matches ? vd.dataset.movel : vd.dataset.src; vd.load(); } if (doInicio || vd.ended) vd.currentTime = 0; const pr = vd.play(); if (pr && pr.catch) pr.catch(() => {}); };
    vd.addEventListener('playing', () => { vd.classList.add('a-tocar'); est(); }); vd.addEventListener('pause', est); vd.addEventListener('ended', est);
    bt.hidden = false; est();
    bt.addEventListener('click', () => { if (vd.paused) { parado = false; toca3(false); } else { parado = true; vd.pause(); } });
    new IntersectionObserver(([en]) => { if (en.isIntersecting && !visto) { visto = true; if (!parado && !guardado()) toca3(true); } else if (!en.isIntersecting && visto && en.intersectionRatio === 0) { visto = false; vd.pause(); } }, { threshold: [0, 0.55] }).observe(f);
  });

  /* ── Linha do tempo da Collection: o scroll vertical conduz a pista horizontal ── */
  const ep = $('.epocas');
  if (ep) {
    const pista = $('.epocas-pista', ep), barra = $('.regua i', ep);
    let activo = null, dist = 0;
    const mede = () => {
      const pode = !reduzido() && matchMedia('(min-width: 761px) and (hover: hover)').matches;
      if (pode !== activo) { activo = pode; ep.classList.toggle('nativo', !pode); pista.style.transform = ''; if (!pode) ep.style.height = ''; }
      if (activo) { dist = Math.max(0, pista.scrollWidth - innerWidth); ep.style.height = `calc(100svh + ${dist}px)`; anda(); }
    };
    const anda = () => {
      if (activo) { const r = ep.getBoundingClientRect(), p = Math.min(1, Math.max(0, -r.top / (dist || 1))); pista.style.transform = `translate3d(${-p * dist}px,0,0)`; barra.style.transform = `scaleX(${p})`; }
      else { const m = pista.scrollWidth - pista.clientWidth; barra.style.transform = `scaleX(${m > 0 ? pista.scrollLeft / m : 0})`; }
    };
    mede(); addEventListener('resize', mede); addEventListener('load', mede); document.addEventListener('racar:mov', mede);
    addEventListener('scroll', anda, { passive: true }); pista.addEventListener('scroll', anda, { passive: true });
  }

  /* ── Publicações do Instagram: incorporação oficial, só pedida quando a secção se aproxima ── */
  const ig = $('[data-ig]');
  if (ig) new IntersectionObserver(([en], o) => { if (!en.isIntersecting) return; o.disconnect(); const sc = document.createElement('script'); sc.async = true; sc.src = 'https://www.instagram.com/embed.js'; document.body.appendChild(sc); }, { rootMargin: '60% 0px' }).observe(ig);

  /* ── Imagens que acompanham o rato: a posição do cursor (−1 a 1) vai para --mx / --my e o CSS desloca a imagem ── */
  if (matchMedia('(hover: hover)').matches) $$('.porta, .azulejo, .cartao').forEach((el) => {
    let pedido = 0, x = 0, y = 0;
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); x = ((e.clientX - r.left) / r.width - 0.5) * 2; y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!pedido) pedido = requestAnimationFrame(() => { pedido = 0; if (reduzido()) return; el.style.setProperty('--mx', x.toFixed(3)); el.style.setProperty('--my', y.toFixed(3)); }); }, { passive: true });
    el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', 0); el.style.setProperty('--my', 0); });
  });

  /* ── Mapa: só carrega quando pedem (privacidade e peso) ── */
  $$('.mapa button').forEach((b) => b.addEventListener('click', () => {
    const m = b.closest('.mapa'), f = document.createElement('iframe');
    f.src = m.dataset.src; f.title = 'Mapa: RACAR, Famões'; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
    m.replaceChildren(f); m.classList.add('carregado');
  }));

  /* ── Formulários: sem servidor. O pedido abre no WhatsApp ou no email do visitante, já escrito. ── */
  $$('form[data-pedido]').forEach((f) => {
    const erro = $('.form-erro', f);
    const texto = () => {
      const linhas = [f.dataset.pedido];
      $$('[name]', f).forEach((c) => {
        if (c.type === 'radio' && !c.checked) return;
        if (c.type === 'checkbox') return;
        const v2 = c.value.trim(); if (!v2) return;
        linhas.push(`${c.dataset.rotulo || c.name}: ${v2}`);
      });
      const marc = $$('input[type=checkbox][name]:checked', f).map((c) => c.value);
      if (marc.length) linhas.push(`Serviços: ${marc.join(', ')}`);
      return linhas.join('\n');
    };
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!f.checkValidity()) { f.reportValidity(); if (erro) erro.textContent = 'Faltam campos obrigatórios.'; return; }
      if (erro) erro.textContent = '';
      const via = (e.submitter && e.submitter.value) || 'whatsapp', t = texto();
      const url = via === 'email' ? `mailto:${EMAIL}?subject=${encodeURIComponent(f.dataset.pedido)}&body=${encodeURIComponent(t)}` : `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
      if (via === 'email') location.href = url; else open(url, '_blank', 'noopener');
      const ok = $('.form-ok', f); if (ok) ok.hidden = false;
    });
  });

  /* ── Collection: filtros, ordenação, contagem e endereço partilhável ── */
  const grelha = $('#grelha');
  if (grelha) {
    const cartoes = $$('.cartao', grelha), conta = $('#conta'), vazio = $('#vazio'), nFiltros = $('#n-filtros');
    const campos = { q: $('#f-q'), ordem: $('#f-ordem'), pmin: $('#f-pmin'), pmax: $('#f-pmax'), amin: $('#f-amin'), amax: $('#f-amax'), km: $('#f-km'), comb: $('#f-comb'), caixa: $('#f-caixa'), seg: $('#f-seg') };
    const marcas = $$('.marcas button');
    let marca = '';
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const ordens = {
      'marca-az': (a, b) => a.dataset.nome.localeCompare(b.dataset.nome, 'pt'), 'marca-za': (a, b) => b.dataset.nome.localeCompare(a.dataset.nome, 'pt'),
      'preco-asc': (a, b) => (+a.dataset.preco || 9e9) - (+b.dataset.preco || 9e9), 'preco-desc': (a, b) => (+b.dataset.preco || -1) - (+a.dataset.preco || -1),
      'ano-asc': (a, b) => a.dataset.ano - b.dataset.ano, 'ano-desc': (a, b) => b.dataset.ano - a.dataset.ano,
      'km-asc': (a, b) => a.dataset.km - b.dataset.km, 'km-desc': (a, b) => b.dataset.km - a.dataset.km,
    };
    const aplica = (escreveUrl = true) => {
      const c = Object.fromEntries(Object.entries(campos).map(([k, el]) => [k, el ? el.value : '']));
      const q = norm(c.q.trim());
      let n = 0, activos = 0;
      ['pmin', 'pmax', 'amin', 'amax', 'km', 'comb', 'caixa', 'seg'].forEach((k) => { if (c[k]) activos++; });
      cartoes.forEach((el) => {
        const d = el.dataset, p = +d.preco;
        const ok = (!marca || d.marca === marca) && (!q || norm(d.nome + ' ' + d.ano + ' ' + d.comb + ' ' + d.seg).includes(q))
          && (!c.pmin || (p && p >= +c.pmin)) && (!c.pmax || (p && p <= +c.pmax))
          && (!c.amin || +d.ano >= +c.amin) && (!c.amax || +d.ano <= +c.amax) && (!c.km || +d.km <= +c.km)
          && (!c.comb || d.comb === c.comb) && (!c.caixa || d.caixa === c.caixa) && (!c.seg || d.seg === c.seg);
        el.hidden = !ok; if (ok) n++;
      });
      [...cartoes].sort(ordens[c.ordem] || ordens['marca-az']).forEach((el) => grelha.appendChild(el));
      conta.innerHTML = `<b>${n}</b> ${n === 1 ? 'viatura' : 'viaturas'}${n !== cartoes.length ? ` de ${cartoes.length}` : ''}`;
      vazio.hidden = n > 0; nFiltros.textContent = activos ? `(${activos})` : '';
      marcas.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.marca === marca)));
      if (escreveUrl) {
        const u = new URLSearchParams(); if (marca) u.set('marca', marca);
        Object.entries(c).forEach(([k, v2]) => { if (v2 && !(k === 'ordem' && v2 === 'marca-az')) u.set(k, v2); });
        history.replaceState(null, '', u.toString() ? `?${u}` : location.pathname);
      }
    };
    const u = new URLSearchParams(location.search);
    marca = u.get('marca') || '';
    Object.entries(campos).forEach(([k, el]) => { if (el && u.get(k)) el.value = u.get(k); el && el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => aplica()); });
    marcas.forEach((b) => b.addEventListener('click', () => { marca = b.dataset.marca === marca ? '' : b.dataset.marca; aplica(); }));
    const painel = $('#filtros'), btF = $('#bt-filtros');
    btF.addEventListener('click', () => { const a = painel.toggleAttribute('data-aberto'); btF.setAttribute('aria-expanded', String(a)); });
    if (['pmin', 'pmax', 'amin', 'amax', 'km', 'comb', 'caixa', 'seg'].some((k) => u.get(k))) { painel.dataset.aberto = ''; btF.setAttribute('aria-expanded', 'true'); }
    $$('.limpar').forEach((b) => b.addEventListener('click', () => { marca = ''; Object.values(campos).forEach((el) => { if (el) el.value = el.id === 'f-ordem' ? 'marca-az' : ''; }); aplica(); }));
    const vistas = $$('.vista button');
    const poeVista = (vv) => { grelha.classList.toggle('lista', vv === 'lista'); vistas.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.vista === vv))); try { localStorage.setItem('racar-vista', vv); } catch {} };
    vistas.forEach((b) => b.addEventListener('click', () => poeVista(b.dataset.vista)));
    try { poeVista(localStorage.getItem('racar-vista') || 'grelha'); } catch { poeVista('grelha'); }
    aplica(false);
    /* segunda fotografia ao passar o rato: só se pede quando é precisa */
    if (matchMedia('(hover: hover)').matches) cartoes.forEach((el) => el.addEventListener('pointerenter', () => {
      const s = $('.segunda', el); if (s && !s.src && s.dataset.src) { s.src = s.dataset.src; s.addEventListener('load', () => s.classList.add('ok'), { once: true }); }
    }, { once: true }));
  }

  /* ── Ficha: galeria em ecrã inteiro (teclado, toque, contador) e barra de contacto ── */
  const luz = $('dialog.luz');
  if (luz) {
    const pista = $('.luz-pista', luz), conta = $('.conta', luz), figs = $$('figure', pista);
    const actual = () => Math.round(pista.scrollLeft / pista.clientWidth);
    const vai = (i, suave = true) => { const k = Math.max(0, Math.min(figs.length - 1, i)); pista.scrollTo({ left: k * pista.clientWidth, behavior: suave && !reduzido() ? 'smooth' : 'auto' }); };
    const escreve = () => { conta.textContent = `${String(actual() + 1).padStart(2, '0')} / ${String(figs.length).padStart(2, '0')}`; };
    let origem;
    $$('.galeria button').forEach((b) => b.addEventListener('click', () => {
      origem = b; figs.forEach((f) => { const im = $('img', f); if (!im.src) im.src = im.dataset.src; });
      luz.showModal(); vai(+b.dataset.i, false); escreve();
    }));
    pista.addEventListener('scroll', escreve, { passive: true });
    $('.x', luz).addEventListener('click', () => luz.close());
    $('.ant', luz).addEventListener('click', () => vai(actual() - 1));
    $('.seg', luz).addEventListener('click', () => vai(actual() + 1));
    luz.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') vai(actual() + 1); if (e.key === 'ArrowLeft') vai(actual() - 1); });
    luz.addEventListener('close', () => origem && origem.focus());
  }
  const bf = $('.barra-ficha');
  if (bf) {
    document.body.classList.add('com-barra');
    const alvo = $('.numeros') || $('.galeria'), ped = $('.pedido');
    let passou = false, noPedido = false;
    const poe = () => { const vis = passou && !noPedido; bf.classList.toggle('vis', vis); bf.inert = !vis; };
    const ve = () => { const agora = alvo.getBoundingClientRect().bottom < 0; if (agora !== passou) { passou = agora; poe(); } };
    addEventListener('scroll', ve, { passive: true }); ve();
    if (ped) new IntersectionObserver(([e]) => { noPedido = e.isIntersecting && innerWidth <= 1100; poe(); }, { threshold: 0.3 }).observe(ped);
    poe();
  }
  $$('.ler').forEach((b) => b.addEventListener('click', () => { const r = document.getElementById(b.getAttribute('aria-controls')); const a = r.classList.toggle('aberto'); b.setAttribute('aria-expanded', String(a)); b.textContent = a ? 'Mostrar menos' : b.dataset.rotulo; }));
})();
