/* Vista de Ed (parte 2): saldo, meta, rutina de la tarde y tienda de premios. */
(function () {
  'use strict';
  var A = window.App;
  var S = A.S, esc = A.esc, tile = A.tile, coin = A.coin;

  var RUTINA = [
    { i: '🍽️', t: 'Comer', c: 'orange' },
    { i: '⚽', t: 'Jugar', c: 'green' },
    { i: '✏️', t: 'Tarea', c: 'yellow' },
    { i: '🛁', t: 'Baño', c: 'teal' },
    { i: '📖', t: 'Cuento', c: 'purple' },
    { i: '😴', t: 'Dormir', c: 'indigo' }
  ];

  // ---------- sonidos (sin archivos, con el sintetizador del navegador) ----------
  var audio;
  // iPhone solo deja sonar si el audio se activa con un toque: lo activamos en el primero
  document.addEventListener('pointerdown', function desbloquear() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.resume) audio.resume();
      var b = audio.createBuffer(1, 1, 22050), src = audio.createBufferSource();
      src.buffer = b; src.connect(audio.destination); src.start(0);
    } catch (e) {}
    document.removeEventListener('pointerdown', desbloquear);
  });
  function sonar(notas, dur) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var t = audio.currentTime;
      notas.forEach(function (f, i) {
        var o = audio.createOscillator(), g = audio.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * dur);
        g.gain.exponentialRampToValueAtTime(0.25, t + i * dur + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (i + 1) * dur + 0.15);
        o.connect(g); g.connect(audio.destination);
        o.start(t + i * dur); o.stop(t + (i + 1) * dur + 0.2);
      });
    } catch (e) {}
  }
  var SON = {
    moneda: function () { sonar([988, 1319], 0.08); },
    paso: function () { sonar([660, 880], 0.07); },
    exito: function () { sonar([523, 659, 784, 1047], 0.11); },
    no: function () { sonar([330, 262], 0.12); }
  };

  // ---------- utilidades ----------
  function hoyLocal() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function premios() { return (S.estado ? S.estado.premios : []).filter(function (p) { return p.activo; }); }
  function premio(id) { return premios().filter(function (p) { return p.id === id; })[0]; }
  function colorDe(id) { var i = premios().map(function (p) { return p.id; }).indexOf(id); return i < 0 ? 0 : i; }
  function agotado(p) { return !p.repetible && p.canjeado > 0; }
  function meta() { var id = S.estado && S.estado.config.meta_premio; return id ? premio(id) : null; }

  function rutinaHecha() {
    try { return JSON.parse(lsGet('ed_rutina_' + hoyLocal())) || []; } catch (e) { return []; }
  }

  // ---------- efectos ----------
  function lluvia(n, html) {
    var capa = document.createElement('div');
    capa.className = 'rain';
    for (var i = 0; i < n; i++) {
      var c = document.createElement('span');
      c.innerHTML = html;
      c.style.left = (5 + Math.random() * 90) + '%';
      c.style.animationDelay = (Math.random() * 0.7).toFixed(2) + 's';
      c.style.fontSize = (26 + Math.random() * 22).toFixed(0) + 'px';
      capa.appendChild(c);
    }
    document.body.appendChild(capa);
    setTimeout(function () { capa.remove(); }, 2700);
  }

  function animarSaldoEd() {
    var el = document.getElementById('edSaldo');
    if (!el || !S.estado) return;
    var nuevo = S.estado.saldo;
    var visto = lsGet('ed_saldo_visto');
    lsSet('ed_saldo_visto', String(nuevo));
    if (visto == null || Number(visto) >= nuevo) return;
    var viejo = Number(visto), i = 0, pasos = Math.min(nuevo - viejo, 15);
    el.textContent = viejo;
    setTimeout(function () {
      var t = setInterval(function () {
        i++;
        el.textContent = Math.round(viejo + (nuevo - viejo) * i / pasos);
        SON.moneda();
        if (i >= pasos) {
          clearInterval(t);
          el.textContent = nuevo;
          el.classList.add('pop');
          var hero = document.querySelector('.ed-hero');
          if (hero) hero.classList.add('celebra');
          lluvia(14, coin());
        }
      }, 140);
    }, 400);
  }

  // ---------- vistas ----------
  A.VIEWS.ed = function () {
    if (!S.estado) return A.nav('', A.atras()) + '<p class="empty">Cargando…</p>';
    var m = meta(), s = S.estado.saldo;
    var hechos = rutinaHecha();
    var siguiente = 0;
    while (hechos.indexOf(siguiente) >= 0) siguiente++;

    var metaHtml;
    if (m) {
      var pct = Math.min(100, Math.round(s / m.precio * 100));
      var falta = Math.max(0, m.precio - s);
      metaHtml = '<button class="panel-card" data-act="edTienda">' + tile(m.icono, colorDe(m.id), 'lg') +
        '<span class="meta-body"><span class="bar"><i style="width:' + pct + '%"></i></span>' +
        '<span class="meta-num">' + (falta ? coin() + ' ' + falta : '✅') + '</span></span>' + A.SVG.chev + '</button>';
    } else {
      metaHtml = '<button class="panel-card empty-meta" data-act="edTienda">' + tile('⭐', 'yellow', 'lg') +
        '<span class="meta-body"><span class="bar"><i style="width:0"></i></span><span class="meta-num">?</span></span>' + A.SVG.chev + '</button>';
    }

    var rutina = RUTINA.map(function (r, i) {
      var hecho = hechos.indexOf(i) >= 0;
      return '<button class="step' + (hecho ? ' done' : '') + (i === siguiente ? ' next' : '') + '" data-act="edPaso" data-i="' + i + '" aria-label="' + r.t + '">' +
        tile(r.i, r.c) + (hecho ? '<span class="tick">✓</span>' : '') + '</button>';
    }).join('');

    return '' +
      A.nav('', A.atras()) +
      '<div class="ed">' +
      '<section class="hero-card ed-hero">' + A.SVG.web +
      '  <div>' + coin() + '</div>' +
      '  <div class="ed-amount" id="edSaldo">' + s + '</div>' +
      '  <div class="siuu">¡Siuuu!</div>' +
      '</section>' +
      metaHtml +
      '<section class="panel-card rutina">' + rutina + '</section>' +
      (A.miniFrascos ? A.miniFrascos() : '') +
      '<button class="pill-btn" data-act="edTienda"><span class="glass">🛍️</span>' +
      '<span class="coins">' + coin() + ' ' + s + '</span>' +
      '<svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 8 8-8 8"/></svg></button>' +
      '</div>';
  };

  A.VIEWS.tienda = function () {
    if (!S.estado) return A.nav('', A.atras()) + '<p class="empty">Cargando…</p>';
    var s = S.estado.saldo, metaId = S.estado.config.meta_premio;
    var cards = premios().map(function (p, i) {
      var no = agotado(p), puede = !no && s >= p.precio;
      var cls = no ? 'owned' : puede ? 'can' : 'cant';
      var pct = Math.min(100, Math.round(s / p.precio * 100));
      return '<button class="prize ' + cls + '" data-act="edVerPremio" data-id="' + esc(p.id) + '">' +
        (metaId === p.id ? '<span class="star">⭐</span>' : '') +
        tile(p.icono, i) +
        '<span class="prize-price">' + coin() + ' ' + p.precio + '</span>' +
        (cls === 'cant' ? '<span class="bar thin"><i style="width:' + pct + '%"></i></span><span class="prize-need">te faltan ' + (p.precio - s) + '</span>' : '') +
        (cls === 'owned' ? '<span class="prize-need">✓ ya es tuyo</span>' : '') +
        '</button>';
    }).join('');
    return '' +
      A.nav('', '<button class="nav-btn" data-act="edVolver">' + A.SVG.back + '<span>Ed</span></button>',
        '<span class="nav-btn end"><span class="saldo-chip">' + coin() + ' ' + s + '</span></span>') +
      '<div class="ed"><div class="shop-head">' + tile('🛍️', 'red', 'lg') + '</div>' +
      '<div class="prizes">' + (cards || '<p class="empty">Sin premios</p>') + '</div></div>';
  };

  A.VIEWS.canjeado = function () {
    var p = S.canjeListo || {};
    return '' +
      '<div class="ed done-screen">' +
      '  <div class="confirm-ico bounce">' + tile(p.icono, colorDe(p.id), 'xl') + '</div>' +
      '  <div class="done-check">✓</div>' +
      '  <button class="pill-btn" data-act="edVolver"><span class="glass">👍</span></button>' +
      '</div>';
  };

  // ---------- acciones ----------
  A.ACT.irEd = function () { A.go('ed'); };
  A.ACT.edVolver = function () { A.go('ed'); };
  A.ACT.edTienda = function () { A.go('tienda'); };

  A.ACT.edPaso = function (d) {
    var i = Number(d.i), h = rutinaHecha(), k = h.indexOf(i);
    if (k >= 0) h.splice(k, 1); else { h.push(i); SON.paso(); }
    lsSet('ed_rutina_' + hoyLocal(), JSON.stringify(h));
    A.render();
    if (k < 0 && h.length === RUTINA.length) { SON.exito(); lluvia(16, '⭐'); }
  };

  A.ACT.edVerPremio = function (d) {
    var p = premio(d.id);
    if (!p) return;
    var s = S.estado.saldo, puede = !agotado(p) && s >= p.precio;
    var esMeta = S.estado.config.meta_premio === p.id;
    var pct = Math.min(100, Math.round(s / p.precio * 100));
    var dlg = document.getElementById('dlg');
    dlg.innerHTML = '<div class="ed kid-sheet">' +
      '<div class="confirm-ico">' + tile(p.icono, colorDe(p.id), 'xl') + '</div>' +
      '<div class="sheet-price">' + coin() + ' ' + p.precio + '</div>' +
      (agotado(p) ? '<p class="sheet-need">✓ ya es tuyo</p>' :
        puede ? '' : '<span class="bar big"><i style="width:' + pct + '%"></i></span><p class="sheet-need">te faltan ' + coin() + ' ' + (p.precio - s) + '</p>') +
      '<div class="sheet-actions">' +
      (agotado(p) ? '' : '<button class="round-btn star-btn' + (esMeta ? ' on' : '') + '" data-meta="' + esc(p.id) + '" aria-label="Mi meta">⭐</button>') +
      (puede ? '<button class="round-btn buy" data-buy="' + esc(p.id) + '" aria-label="Lo quiero">✓</button>' : '') +
      '<button class="round-btn close" data-close="1" aria-label="Cerrar">✕</button>' +
      '</div></div>';
    dlg.onclick = function (ev) {
      var b = ev.target.closest('button');
      if (ev.target === dlg || (b && b.dataset.close)) { dlg.close(); return; }
      if (b && b.dataset.meta) {
        dlg.close();
        A.escribirDirecto('elegirMeta', { premioId: esMeta ? '' : p.id }).then(function (r) {
          S.estado = r.estado; A.render(); if (!esMeta) SON.paso();
        }, function (e) { A.toast(e.message); });
      }
      if (b && b.dataset.buy) {
        dlg.close();
        canjear(p);
      }
    };
    dlg.showModal();
  };

  function canjear(p) {
    A.pedirPin({
      icono: tile(p.icono, colorDe(p.id), 'lg'),
      titulo: esc(p.nombre) + ' · <span class="price-line">' + coin() + ' ' + p.precio + '</span>',
      volver: 'tienda',
      accion: function (pin) {
        return A.escribirDirecto('canjear', { pin: pin, premioId: p.id, quien: A.quien() || 'Papás' }).then(function (r) {
          S.estado = r.estado;
          lsSet('ed_saldo_visto', String(r.estado.saldo)); // que no festeje la baja de saldo
          S.canjeListo = p;
          A.go('canjeado');
          A.toast('¡Listo!', null, null, 1200);
          SON.exito();
          lluvia(22, coin());
        });
      }
    });
  }

  A.SON = SON;
  A.lluvia = lluvia;
  A.afterRender.ed = animarSaldoEd;
})();
