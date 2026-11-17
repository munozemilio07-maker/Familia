/* App familiar: navegación, PIN y modo papás (parte 1). */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var dlg = document.getElementById('dlg');
  var toastEl = document.getElementById('toast');

  function store(kind) {
    return {
      get: function (k) { try { return window[kind].getItem(k); } catch (e) { return null; } },
      set: function (k, v) { try { v == null ? window[kind].removeItem(k) : window[kind].setItem(k, v); } catch (e) {} }
    };
  }
  var LS = store('localStorage');
  var SS = store('sessionStorage');

  var PIN_MINUTOS = 15; // el modo papás se cierra solo tras 15 min sin usarlo

  var S = {
    estado: null,
    view: 'home',
    tab: 'registrar',
    pinTecleado: '',
    saldoMostrado: null
  };

  // ---------- íconos de línea (estilo SF Symbols) ----------
  var SVG = {
    back: '<svg width="13" height="21" viewBox="0 0 13 21" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2 3 10.5 11 19"/></svg>',
    chev: '<svg class="chev" width="8" height="13" viewBox="0 0 8 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m1.5 1.5 5 5-5 5"/></svg>',
    lock: '<svg width="20" height="22" viewBox="0 0 20 22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2.5" y="9.5" width="15" height="11" rx="2.5"/><path d="M6 9.5V6.5a4 4 0 0 1 8 0v3"/></svg>',
    del: '<svg width="28" height="20" viewBox="0 0 28 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" style="margin:auto"><path d="M9 2h15a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9l-7-8z"/><path d="m13 7 6 6m0-6-6 6"/></svg>'
  };

  // Telaraña decorativa (dibujo propio, se usa como textura tenue)
  SVG.web = (function () {
    var cx = 360, cy = 0, s = '';
    for (var a = 90; a <= 180; a += 15) {
      var r = a * Math.PI / 180;
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Math.cos(r) * 420).toFixed(1) + '" y2="' + (cy + Math.sin(r) * 420).toFixed(1) + '"/>';
    }
    for (var k = 1; k <= 7; k++) {
      var pts = [];
      for (var b = 90; b <= 180; b += 15) {
        var rr = b * Math.PI / 180, R = k * 52;
        pts.push((cx + Math.cos(rr) * R).toFixed(1) + ',' + (cy + Math.sin(rr) * R).toFixed(1));
      }
      s += '<polyline points="' + pts.join(' ') + '"/>';
    }
    return '<svg class="web" viewBox="0 0 360 300" preserveAspectRatio="xMaxYMin slice" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">' + s + '</svg>';
  })();

  // ---------- utilidades ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Un ícono puede ser emoji o URL de imagen
  function ico(v) {
    v = String(v || '');
    return /^https?:\/\//.test(v) ? '<img src="' + esc(v) + '" alt="">' : esc(v);
  }
  function moneda() {
    var c = (S.estado && S.estado.config) || {};
    return { nombre: c.moneda_nombre || 'Vanemisaurios coins', icono: c.moneda_icono || '🪙' };
  }
  // Moneda: la dorada dibujada por defecto; si los papás ponen otro emoji o una imagen, se usa ese
  function coin() {
    var i = moneda().icono;
    return (!i || i === '🪙') ? '<span class="coin" aria-hidden="true"></span>' : '<span class="coin-img">' + ico(i) + '</span>';
  }
  // Mosaico de color para un ícono (emoji o imagen)
  var PALETA = ['blue', 'orange', 'purple', 'pink', 'teal', 'yellow', 'indigo', 'green', 'red'];
  function tile(icono, color, tam) {
    if (typeof color === 'number') color = PALETA[color % PALETA.length];
    return '<span class="ti t-' + (color || 'gray') + (tam ? ' ' + tam : '') + '">' + ico(icono) + '</span>';
  }
  function signo(n) { return n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0'; }
  function quien() { return LS.get('familia_quien'); }

  function pinGuardado() {
    try {
      var p = JSON.parse(SS.get('familia_pin'));
      if (p && p.exp > Date.now()) return p.pin;
    } catch (e) {}
    return null;
  }
  function guardarPin(pin) {
    SS.set('familia_pin', JSON.stringify({ pin: pin, exp: Date.now() + PIN_MINUTOS * 60000 }));
  }
  function olvidarPin() { SS.set('familia_pin', null); }

  var toastTimer;
  function toast(msg, accion, alAccion, ms) {
    clearTimeout(toastTimer);
    toastEl.innerHTML = '<span class="msg">' + esc(msg) + '</span>' + (accion ? '<button type="button">' + esc(accion) + '</button>' : '');
    toastEl.hidden = false;
    if (accion) toastEl.querySelector('button').onclick = function () { toastEl.hidden = true; alAccion(); };
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, ms || (accion ? 6000 : 2800));
  }

  // ---------- datos ----------
  function aplicarEstado(e) {
    S.estado = e;
    render();
  }

  var refrescando = false;
  var escrituras = 0; // sube con cada escritura; una lectura vieja no debe pisar una escritura nueva
  function escribiendo() {
    var a = document.activeElement;
    return dlg.open || (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName));
  }
  function refrescar(silencioso) {
    if (refrescando || escribiendo()) return Promise.resolve();
    refrescando = true;
    var gen = escrituras;
    return API.call('estado').then(function (e) {
      if (gen !== escrituras || escribiendo()) return;
      if (JSON.stringify(e) !== JSON.stringify(S.estado)) aplicarEstado(e);
    }).catch(function (err) {
      if (!silencioso) toast(err.message);
    }).then(function () { refrescando = false; });
  }

  // Escritura protegida: agrega PIN y quién registra
  function escribir(action, payload) {
    var pin = pinGuardado();
    if (!pin) { go('pin'); return Promise.reject(new Error('Escribe el PIN')); }
    var req = Object.assign({ pin: pin, quien: quien() }, payload);
    escrituras++;
    return API.call(action, req).then(function (r) {
      escrituras++;
      guardarPin(pin); // renueva los 15 minutos
      if (r && r.estado) aplicarEstado(r.estado);
      return r;
    }, function (err) {
      if (err.code === 'PIN') { olvidarPin(); go('pin'); }
      toast(err.message);
      throw err;
    });
  }

  // Escritura que lleva su propio PIN (canje de Ed) o no lo necesita (meta de Ed)
  function escribirDirecto(action, payload) {
    escrituras++;
    return API.call(action, payload).then(function (r) { escrituras++; return r; });
  }

  // ---------- navegación ----------
  function go(view) {
    S.view = view;
    if (view === 'pin') S.pinTecleado = '';
    render();
    window.scrollTo(0, 0);
  }

  function render() {
    var v = S.view;
    if (!API.configurado()) v = 'conexion';
    else if (v === 'papas' && !pinGuardado()) v = 'pin';
    else if (v === 'papas' && !quien()) v = 'quien';
    var y = window.scrollY;
    app.innerHTML = VIEWS[v]();
    if (S.view === v) window.scrollTo(0, y);
    if (v === 'papas') animarSaldo();
    if (afterRender[v]) afterRender[v]();
    marcarNav();
  }

  function nav(titulo, izq, der) {
    return '<header class="nav">' +
      (izq || '<span></span>') +
      '<span class="nav-title">' + esc(titulo || '') + '</span>' +
      (der || '<span></span>') + '</header>';
  }
  function atras(texto) {
    return '<button class="nav-btn" data-act="home">' + SVG.back + '<span>' + esc(texto || 'Inicio') + '</span></button>';
  }

  // Celda de lista. o: {act, data, icon, title, sub, note, trail, chev, cls}
  function cell(o) {
    var attrs = o.act ? ' data-act="' + o.act + '"' : '';
    for (var k in (o.data || {})) attrs += ' data-' + k + '="' + esc(o.data[k]) + '"';
    var tag = o.act ? 'button' : 'div';
    return '<' + tag + ' class="cell' + (o.icon != null ? ' has-icon' : '') + (o.cls ? ' ' + o.cls : '') + '"' + attrs + '>' +
      (o.icon != null ? '<span class="cell-icon">' + o.icon + '</span>' : '') +
      '<span class="cell-body"><span class="cell-title">' + o.title + '</span>' +
      (o.sub ? '<span class="cell-sub">' + o.sub + '</span>' : '') +
      (o.note ? '<span class="cell-note">' + o.note + '</span>' : '') + '</span>' +
      (o.trail ? '<span class="cell-trail">' + o.trail + '</span>' : '') +
      (o.chev ? SVG.chev : '') +
      '</' + tag + '>';
  }

  // ---------- vistas ----------
  var VIEWS = {};

  VIEWS.conexion = function () {
    return '' +
      '<h1 class="large-title">Familia</h1>' +
      '<p class="subtitle">Pega la URL de tu Apps Script para conectar la app con tu Google Sheet.</p>' +
      '<div class="group"><div class="cell field">' +
      '  <input id="url" class="left" type="url" inputmode="url" autocomplete="off" placeholder="https://script.google.com/…/exec" value="' + esc(API.modo() === 'real' ? LS.get('familia_api_url') : '') + '">' +
      '</div></div>' +
      '<p class="group-footer">La URL termina en /exec. La encuentras en Apps Script → Implementar.</p>' +
      '<div style="height:24px"></div>' +
      '<button class="btn" data-act="conectar">Conectar</button>' +
      '<button class="btn plain" data-act="modoPrueba">Probar sin Sheet</button>';
  };

  VIEWS.home = function () {
    var saldo = S.estado ? S.estado.saldo : '–';
    var fecha = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    return '' +
      '<section class="home">' +
      '<p class="home-date">' + esc(fecha) + '</p>' +
      '<h1 class="large-title">Familia</h1>' +
      '<div class="kids">' +
      '  <button class="kid-tile ed" data-act="irEd">' + SVG.web +
      '    <span class="glass">🕷️</span>' +
      '    <span><span class="name">Ed</span><span class="meta-line">' + coin() + ' ' + esc(saldo) + '</span></span>' +
      '  </button>' +
      '  <button class="kid-tile liam" data-act="irLiam">' +
      '    <span class="glass">🎈</span>' +
      '    <span><span class="name">Liam</span><span class="meta-line">Rutinas</span></span>' +
      '  </button>' +
      '</div>' +
      '<div class="group parents-row">' +
      cell({ act: 'irPapas', icon: '<span class="ti t-indigo" style="color:#5e5ce6">' + SVG.lock + '</span>', title: 'Papás', sub: 'Registrar, historial y ajustes', chev: true }) +
      '</div>' +
      '</section>' +
      (API.modo() === 'prueba' ? '<p class="badge">Modo prueba · los datos viven solo en este celular</p>' : '');
  };

  VIEWS.pin = function () {
    var dots = '';
    for (var i = 0; i < 4; i++) dots += '<i class="' + (i < S.pinTecleado.length ? 'on' : '') + '"></i>';
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'x', '0', '<'];
    return '' +
      nav('', atras()) +
      '<section class="pin">' +
      '  <h1 class="large-title">Modo papás</h1>' +
      '  <p class="subtitle" style="text-align:center">Escribe el PIN</p>' +
      '  <div class="dots" id="dots">' + dots + '</div>' +
      '  <div class="keypad">' + keys.map(function (k) {
        if (k === 'x') return '<button class="key blank" tabindex="-1"></button>';
        if (k === '<') return '<button class="key text" data-act="pinBorrar" aria-label="Borrar">' + SVG.del + '</button>';
        return '<button class="key" data-act="pinTecla" data-k="' + k + '">' + k + '</button>';
      }).join('') + '</div>' +
      '</section>';
  };

  VIEWS.quien = function () {
    return '' +
      '<h1 class="large-title">¿Quién eres?</h1>' +
      '<p class="subtitle">El historial dirá quién registró cada cosa. Solo se pregunta una vez en este celular.</p>' +
      '<div class="group">' +
      cell({ act: 'setQuien', data: { q: 'Emilio' }, title: 'Emilio', chev: true }) +
      cell({ act: 'setQuien', data: { q: 'Vane' }, title: 'Vane', chev: true }) +
      '</div>';
  };

  VIEWS.papas = function () {
    var m = moneda();
    var e = S.estado;
    if (!e) return nav('Papás', atras()) + '<p class="empty">Cargando…</p>';
    var tabs = [['registrar', 'Registrar'], ['historial', 'Historial'], ['ajustes', 'Ajustes']];
    return '' +
      nav('Hola, ' + quien(), atras(), '<button class="nav-btn end" data-act="salir" aria-label="Cerrar modo papás">' + SVG.lock + '</button>') +
      '<div class="hero-card calm"><div class="hero">' +
      '  <div class="hero-caption">Saldo de Ed</div>' +
      '  <div class="hero-row">' + coin() + '<span class="hero-amount" id="saldo">' + e.saldo + '</span></div>' +
      '  <div class="hero-unit">' + esc(m.nombre) + '</div>' +
      '</div></div>' +
      '<nav class="segmented">' + tabs.map(function (t) {
        return '<button data-act="tab" data-tab="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>';
      }).join('') + '</nav>' +
      TABS[S.tab]();
  };

  var TABS = {};

  TABS.registrar = function () {
    var e = S.estado;
    var tope = Number(e.config.tope_deducciones_dia || 0);
    var bonos = e.reglas.filter(function (r) { return r.activa && r.tipo === 'bono'; });
    var deds = e.reglas.filter(function (r) { return r.activa && r.tipo === 'deduccion'; });
    var meter = '';
    for (var i = 0; i < tope; i++) meter += '<i class="' + (i < e.deduccionesHoy ? 'on' : '') + '"></i>';
    function fila(r) {
      var b = r.tipo === 'bono';
      return cell({
        act: 'registrar', data: { id: r.id }, icon: tile(r.icono, b ? 'green' : 'red'), title: esc(r.texto),
        trail: '<span class="v ' + (b ? 'pos' : 'neg') + '">' + (b ? '+' : '−') + r.valor + '</span>'
      });
    }
    return '' +
      '<h2 class="group-header">Bonos</h2>' +
      '<div class="group">' + bonos.map(fila).join('') + '</div>' +
      '<h2 class="group-header">Deducciones <span class="aside"><span class="meter">' + meter + '</span> hoy ' + e.deduccionesHoy + ' de ' + tope + '</span></h2>' +
      '<div class="group">' + deds.map(fila).join('') + '</div>' +
      '<p class="group-footer">Máximo −' + tope + ' por día. El saldo nunca baja de 0.</p>';
  };

  function etiquetaDia(fecha) {
    var d = new Date(fecha.slice(0, 10) + 'T12:00:00');
    var hoy = new Date(); hoy.setHours(12, 0, 0, 0);
    var dif = Math.round((hoy - d) / 86400000);
    if (dif === 0) return 'Hoy';
    if (dif === 1) return 'Ayer';
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
  }

  TABS.historial = function () {
    var h = S.estado.historial;
    if (!h.length) return '<p class="empty">Todavía no hay movimientos.</p>';
    var grupos = [], actual = null;
    h.forEach(function (m) {
      var d = m.fecha.slice(0, 10);
      if (!actual || actual.dia !== d) { actual = { dia: d, items: [] }; grupos.push(actual); }
      actual.items.push(m);
    });
    return grupos.map(function (g) {
      return '<h2 class="group-header">' + esc(etiquetaDia(g.dia)) + '</h2><div class="group">' +
        g.items.map(function (m) {
          var cls = m.aplicado > 0 ? 'pos' : m.aplicado < 0 ? 'neg' : 'zero';
          var puede = !m.anulado && m.tipo !== 'anulacion';
          return cell({
            act: puede ? 'movimiento' : null, data: { id: m.id },
            icon: tile(m.icono, { bono: 'green', deduccion: 'red', canje: 'purple', anulacion: 'gray' }[m.tipo] || 'blue'),
            cls: m.anulado ? 'anulado' : '',
            title: esc(m.descripcion),
            sub: esc(m.fecha.slice(11, 16)) + ' · ' + esc(m.quien) + (m.anulado ? ' · anulado' : ''),
            note: m.nota ? esc(m.nota) : '',
            trail: '<span class="v ' + cls + '">' + signo(m.aplicado) + '</span><span class="s">' + m.saldo + '</span>'
          });
        }).join('') + '</div>';
    }).join('') + '<p class="group-footer">Toca un movimiento para anularlo.</p>';
  };

  TABS.ajustes = function () {
    var e = S.estado, m = moneda();
    function lista(tipo) {
      var b = tipo === 'bono';
      return e.reglas.filter(function (r) { return r.tipo === tipo; }).map(function (r) {
        return cell({
          act: 'editarRegla', data: { id: r.id }, icon: tile(r.icono, b ? 'green' : 'red'), title: esc(r.texto), cls: r.activa ? '' : 'off',
          trail: '<span class="v ' + (b ? 'pos' : 'neg') + '">' + (b ? '+' : '−') + r.valor + '</span>', chev: true
        });
      }).join('') +
        cell({ act: 'editarRegla', data: { tipo: tipo }, cls: 'link', title: b ? 'Agregar bono' : 'Agregar deducción' });
    }
    return '' +
      '<h2 class="group-header">Moneda</h2>' +
      '<div class="group">' +
      '  <div class="cell field"><label for="cfgNombre">Nombre</label><input id="cfgNombre" value="' + esc(m.nombre) + '" maxlength="30"></div>' +
      '  <div class="cell field"><label for="cfgIcono">Ícono</label><input id="cfgIcono" value="' + esc(m.icono) + '"></div>' +
      '  <div class="cell field"><label for="cfgTope">Deducciones máx. por día</label><input id="cfgTope" type="number" min="0" max="20" inputmode="numeric" value="' + esc(e.config.tope_deducciones_dia) + '"></div>' +
      cell({ act: 'guardarMoneda', cls: 'link', title: 'Guardar cambios' }) +
      '</div>' +
      '<p class="group-footer">El ícono puede ser un emoji o la URL de una imagen.</p>' +
      '<h2 class="group-header">Premios de la tienda</h2><div class="group">' +
      e.premios.map(function (p, i) {
        var agotado = !p.repetible && p.canjeado > 0;
        return cell({
          act: 'editarPremio', data: { id: p.id }, icon: tile(p.icono, i), title: esc(p.nombre), cls: p.activo ? '' : 'off',
          sub: (p.repetible ? 'Varias veces' : 'Una sola vez') + (agotado ? ' · ya canjeado' : '') + (e.config.meta_premio === p.id ? ' · ⭐ meta de Ed' : ''),
          trail: '<span class="v price-line">' + coin() + ' ' + p.precio + '</span>', chev: true
        });
      }).join('') +
      cell({ act: 'editarPremio', cls: 'link', title: 'Agregar premio' }) +
      '</div>' +
      '<h2 class="group-header">Bonos</h2><div class="group">' + lista('bono') + '</div>' +
      '<h2 class="group-header">Deducciones</h2><div class="group">' + lista('deduccion') + '</div>' +
      '<h2 class="group-header">Este celular</h2>' +
      '<nav class="segmented" style="margin:0 0 12px">' + ['Emilio', 'Vane'].map(function (q) {
        return '<button data-act="setQuien" data-q="' + q + '" data-stay="1" class="' + (quien() === q ? 'on' : '') + '">' + q + '</button>';
      }).join('') + '</nav>' +
      '<div class="group">' +
      '  <div class="cell field"><label for="pinNuevo">Nuevo PIN</label><input id="pinNuevo" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*" autocomplete="off" placeholder="4 números"></div>' +
      cell({ act: 'cambiarPin', cls: 'link', title: 'Cambiar PIN' }) +
      '</div>' +
      '<h2 class="group-header">Conexión</h2>' +
      '<div class="group">' +
      cell({ title: API.modo() === 'prueba' ? 'Modo prueba' : 'Google Sheet', trail: API.modo() === 'prueba' ? 'Solo este celular' : 'Conectada' }) +
      cell({ act: 'cambiarConexion', cls: 'link', title: 'Cambiar conexión' }) +
      (API.modo() === 'prueba' ? cell({ act: 'borrarPrueba', cls: 'destructive', title: 'Borrar datos de prueba' }) : '') +
      '</div>';
  };

  // ---------- animación del saldo ----------
  function animarSaldo() {
    var el = document.getElementById('saldo');
    if (!el) return;
    var nuevo = S.estado.saldo, viejo = S.saldoMostrado;
    S.saldoMostrado = nuevo;
    if (viejo == null || viejo === nuevo) return;
    el.textContent = viejo;
    var pasos = Math.min(Math.abs(nuevo - viejo), 12), i = 0;
    var t = setInterval(function () {
      i++;
      el.textContent = Math.round(viejo + (nuevo - viejo) * i / pasos);
      if (i >= pasos) { clearInterval(t); el.textContent = nuevo; }
    }, 50);
    if (nuevo > viejo) {
      el.classList.add('up');
      setTimeout(function () { el.classList.remove('up'); }, 900);
    }
  }

  // Línea fina bajo la barra solo cuando hay scroll
  function marcarNav() {
    var n = app.querySelector('.nav');
    if (n) n.classList.toggle('scrolled', window.scrollY > 4);
  }
  window.addEventListener('scroll', marcarNav, { passive: true });

  // ---------- hoja inferior genérica ----------
  function abrirHoja(titulo, html, alGuardar) {
    dlg.innerHTML = '<form method="dialog">' +
      '<div class="sheet-bar">' +
      '  <button class="nav-btn" value="cancel" formnovalidate>Cancelar</button>' +
      '  <span class="nav-title">' + esc(titulo) + '</span>' +
      '  <button class="nav-btn end done" value="ok">Guardar</button>' +
      '</div>' + html + '</form>';
    dlg.onclick = null;
    var form = dlg.querySelector('form');
    form.onsubmit = function (ev) {
      if (ev.submitter && ev.submitter.value === 'cancel') return;
      ev.preventDefault();
      var btn = ev.submitter;
      if (btn) btn.disabled = true;
      Promise.resolve(alGuardar(form)).then(function () { dlg.close(); }, function () { if (btn) btn.disabled = false; });
    };
    dlg.showModal();
  }
  dlg.addEventListener('click', function (ev) { if (ev.target === dlg) dlg.close(); }); // tocar fuera cierra

  // ---------- acciones ----------
  var ACT = {};

  ACT.conectar = function () {
    var u = document.getElementById('url').value.trim();
    if (!/^https:\/\/script\.google(usercontent)?\.com\/.+\/exec/.test(u)) {
      toast('La URL debe empezar con https://script.google.com y terminar en /exec');
      return;
    }
    API.usarUrl(u);
    toast('Conectando…');
    API.call('estado').then(function (e) {
      S.estado = null; S.saldoMostrado = null;
      aplicarEstado(e); go('home'); toast('Conectado a la Sheet');
    }, function (err) {
      API.usarUrl(null);
      toast('No pude conectar: ' + err.message);
    });
  };
  ACT.modoPrueba = function () {
    API.usarUrl('prueba');
    S.estado = null; S.saldoMostrado = null;
    go('home');
    refrescar();
    toast('Modo prueba. El PIN es 1234');
  };
  ACT.cambiarConexion = function () {
    if (!confirm('¿Cambiar la conexión? Tendrás que volver a pegar la URL.')) return;
    API.usarUrl(null); olvidarPin(); S.estado = null; S.saldoMostrado = null; go('conexion');
  };
  ACT.borrarPrueba = function () {
    if (!confirm('¿Borrar todos los datos de prueba de este celular?')) return;
    API.borrarPrueba(); olvidarPin(); S.estado = null; S.saldoMostrado = null; go('home'); refrescar();
  };

  // Salir del modo papás siempre lo cierra, para que Ed no pueda entrar después
  ACT.home = function () { if (S.view === 'papas') olvidarPin(); go('home'); };
  ACT.irPapas = function () { S.pinTecleado = ''; go('papas'); };
  ACT.irLiam = function () { toast('La vista de Liam llega en la parte 4'); };
  ACT.salir = function () { olvidarPin(); go('home'); };
  ACT.tab = function (d) { S.tab = d.tab; render(); window.scrollTo(0, 0); };

  ACT.pinTecla = function (d) {
    if (S.pinTecleado.length >= 4) return;
    S.pinTecleado += d.k;
    render();
    if (S.pinTecleado.length === 4) {
      var pin = S.pinTecleado;
      API.call('login', { pin: pin }).then(function () {
        S.pinTecleado = '';
        guardarPin(pin);
        go('papas');
        if (!S.estado) refrescar();
      }, function (err) {
        S.pinTecleado = '';
        render();
        var dots = document.getElementById('dots');
        if (dots) dots.classList.add('shake');
        if (navigator.vibrate) navigator.vibrate(200);
        toast(err.message);
      });
    }
  };
  ACT.pinBorrar = function () { S.pinTecleado = S.pinTecleado.slice(0, -1); render(); };

  ACT.setQuien = function (d) {
    LS.set('familia_quien', d.q);
    if (d.stay) { render(); toast('Este celular es de ' + d.q); }
    else go('papas');
  };

  ACT.registrar = function (d, btn) {
    var regla = S.estado.reglas.filter(function (r) { return r.id === d.id; })[0];
    if (!regla) return;
    btn.classList.add('busy');
    toast('Guardando…');
    escribir('registrar', { reglaId: regla.id }).then(function (r) {
      var mov = r.movimiento;
      var txt = signo(mov.aplicado) + ' ' + mov.descripcion + (mov.nota ? ' (' + mov.nota + ')' : '');
      toast(txt, 'Deshacer', function () {
        escribir('anular', { movId: mov.id, nota: 'Deshacer' }).then(function () { toast('Listo, se deshizo'); }, function () {});
      });
    }, function () { btn.classList.remove('busy'); });
  };

  ACT.movimiento = function (d) {
    var m = S.estado.historial.filter(function (x) { return x.id === d.id; })[0];
    if (!m || m.anulado || m.tipo === 'anulacion') return;
    if (!confirm('¿Anular “' + m.descripcion + '” (' + signo(m.aplicado) + ')?\nQuedará registrado en el historial.')) return;
    escribir('anular', { movId: m.id }).then(function () { toast('Movimiento anulado'); }, function () {});
  };

  ACT.editarRegla = function (d) {
    var r = d.id ? S.estado.reglas.filter(function (x) { return x.id === d.id; })[0] : { tipo: d.tipo, texto: '', icono: '', valor: 1, activa: true };
    var esBono = r.tipo === 'bono';
    abrirHoja((d.id ? 'Editar ' : 'Nuevo ') + (esBono ? 'bono' : 'deducción'), '' +
      '<div class="group">' +
      '  <div class="cell field"><input name="texto" class="left" required maxlength="100" placeholder="Qué hizo" value="' + esc(r.texto) + '"></div>' +
      '  <div class="cell field"><label>Ícono</label><input name="icono" value="' + esc(r.icono) + '" placeholder="⭐"></div>' +
      '  <div class="cell field"><label>' + (esBono ? 'Gana' : 'Pierde') + '</label><input name="valor" type="number" min="1" max="50" required inputmode="numeric" value="' + esc(r.valor) + '"></div>' +
      '</div>' +
      '<div style="height:20px"></div>' +
      '<div class="group"><label class="cell field check-cell"><span class="cell-body">Activo</span><input type="checkbox" name="activa"' + (r.activa ? ' checked' : '') + '></label></div>' +
      '<p class="group-footer">Si lo desactivas, ya no aparece para registrar, pero el historial se conserva.</p>',
      function (form) {
        var f = form.elements;
        return escribir('guardarRegla', { regla: {
          id: r.id, tipo: r.tipo, texto: f.texto.value, icono: f.icono.value, valor: Number(f.valor.value), activa: f.activa.checked
        } }).then(function () { toast('Guardado'); });
      });
  };

  ACT.guardarMoneda = function () {
    escribir('guardarConfig', { cambios: {
      moneda_nombre: document.getElementById('cfgNombre').value,
      moneda_icono: document.getElementById('cfgIcono').value,
      tope_deducciones_dia: document.getElementById('cfgTope').value
    } }).then(function () { toast('Guardado'); }, function () {});
  };

  ACT.cambiarPin = function () {
    var p = document.getElementById('pinNuevo').value.trim();
    if (!/^\d{4}$/.test(p)) { toast('El PIN debe ser de 4 números'); return; }
    if (!confirm('¿Cambiar el PIN a ' + p + '? Avísale a ' + (quien() === 'Vane' ? 'Emilio' : 'Vane') + '.')) return;
    escribir('guardarConfig', { cambios: { pin_nuevo: p } }).then(function () {
      guardarPin(p); toast('PIN cambiado');
    }, function () {});
  };

  ACT.editarPremio = function (d) {
    var p = d.id ? S.estado.premios.filter(function (x) { return x.id === d.id; })[0] : { nombre: '', icono: '', precio: 10, repetible: true, activo: true, canjeado: 0 };
    abrirHoja(d.id ? 'Editar premio' : 'Nuevo premio', '' +
      '<div class="group">' +
      '  <div class="cell field"><input name="nombre" class="left" required maxlength="100" placeholder="Nombre del premio" value="' + esc(p.nombre) + '"></div>' +
      '  <div class="cell field"><label>Ícono</label><input name="icono" value="' + esc(p.icono) + '" placeholder="🎁"></div>' +
      '  <div class="cell field"><label>Precio</label><input name="precio" type="number" min="1" max="9999" required inputmode="numeric" value="' + esc(p.precio) + '"></div>' +
      '</div>' +
      '<p class="group-footer">El ícono puede ser un emoji o la URL de una imagen (por ejemplo, una foto del juguete).</p>' +
      '<div style="height:20px"></div>' +
      '<div class="group">' +
      '  <label class="cell field check-cell"><span class="cell-body">Se puede comprar varias veces</span><input type="checkbox" name="repetible"' + (p.repetible ? ' checked' : '') + '></label>' +
      '  <label class="cell field check-cell"><span class="cell-body">En la tienda</span><input type="checkbox" name="activo"' + (p.activo ? ' checked' : '') + '></label>' +
      '</div>' +
      (d.id ? '<p class="group-footer">Canjeado ' + p.canjeado + ' ' + (p.canjeado === 1 ? 'vez' : 'veces') + '.</p>' : ''),
      function (form) {
        var f = form.elements;
        return escribir('guardarPremio', { premio: {
          id: p.id, nombre: f.nombre.value, icono: f.icono.value, precio: Number(f.precio.value),
          repetible: f.repetible.checked, activo: f.activo.checked
        } }).then(function () { toast('Guardado'); });
      });
  };

  app.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act]');
    if (!b || !ACT[b.dataset.act]) return;
    ACT[b.dataset.act](b.dataset, b);
  });

  // Lo que necesitan las otras vistas (ed.js, y luego liam.js, dado.js…)
  var afterRender = {};
  window.App = {
    S: S, VIEWS: VIEWS, ACT: ACT, SVG: SVG, API: API, afterRender: afterRender,
    esc: esc, ico: ico, moneda: moneda, coin: coin, tile: tile, toast: toast, go: go, render: render, nav: nav, atras: atras,
    cell: cell, quien: quien, escribir: escribir, escribirDirecto: escribirDirecto, refrescar: refrescar
  };

  // ---------- arranque ----------
  render();
  if (API.configurado()) refrescar();
  setInterval(function () { if (document.visibilityState === 'visible' && API.configurado()) refrescar(true); }, 30000);
  document.addEventListener('visibilitychange', function () {
    // Si el celular se bloquea o cambias de app, el modo papás se cierra
    if (document.visibilityState === 'hidden' && (S.view === 'papas' || S.view === 'quien')) {
      olvidarPin();
      if (dlg.open) dlg.close();
      go('home');
    }
    if (document.visibilityState === 'visible' && API.configurado()) refrescar(true);
  });
})();
