/* Parte 3: frascos de pesos reales (Gastar, Ahorrar, Compartir), reparto del domingo y banco de papá.
   Es independiente de la moneda de conducta. */
(function () {
  'use strict';
  var A = window.App;
  var S = A.S, esc = A.esc, tile = A.tile, cell = A.cell;
  var F = Core.FRASCOS, NOMBRE = Core.NOMBRE_F, ICONO = Core.ICONO_F;
  var COLOR = { gastar: 'orange', ahorrar: 'green', compartir: 'pink' };

  function P() { return S.estado && S.estado.pesos; }
  function $(n) { return '$' + n; }
  function son(k) { if (A.SON) A.SON[k](); }

  // ---------- dibujos ----------
  function peso(cls, conTexto) {
    var m = P() ? P().cfg.domingo_moneda : 5;
    return '<span class="peso ' + (cls || '') + '">' + (conTexto ? '<b>$' + m + '</b>' : '') + '</span>';
  }

  // Frasco transparente que se llena de monedas según el saldo
  function jar(f, saldo, o) {
    o = o || {};
    var moneda = P() ? P().cfg.domingo_moneda : 5;
    var n = o.monedas != null ? o.monedas : Math.ceil(saldo / moneda);
    n = Math.min(n, 36);
    var coins = '';
    for (var i = 0; i < n; i++) {
      var row = Math.floor(i / 4), col = i % 4;
      var jit = ((i * 37) % 7) - 3; // pequeño desorden fijo, para que parezca montón
      coins += '<i style="left:' + (6 + col * 19 + (row % 2 ? 9 : 0) + jit) + 'px;bottom:' + (4 + row * 11) + 'px"></i>';
    }
    return '<div class="jar jar-' + f + (o.cls ? ' ' + o.cls : '') + '"' + (o.drop ? ' data-jar="' + f + '" data-act="repJar" data-f="' + f + '"' : '') + '>' +
      (o.triste ? '<span class="bubble">🥺</span>' : '') +
      '<div class="jar-lid"></div><div class="jar-glass"><div class="jar-coins">' + coins + '</div>' +
      '<span class="jar-label">' + ICONO[f] + '</span></div></div>';
  }

  // ---------- fechas ----------
  function semana() {
    var p = P(), hoy = p.hoy, dow = Core.diaSemana(hoy);
    var faltan = (7 - dow) % 7 || 7; // días hasta el próximo domingo
    var dias = [];
    for (var k = faltan - 6; k <= faltan; k++) { // los 7 días que terminan en el próximo domingo
      var fecha = Core.sumarDias(hoy, k);
      dias.push({ fecha: fecha, pasado: k < 0, hoy: k === 0, domingo: k === faltan });
    }
    return { faltan: faltan, dias: dias, proximo: Core.sumarDias(hoy, faltan) };
  }
  function fechaBonita(f) {
    var d = new Date(f + 'T12:00:00');
    return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });
  }

  function viejo() {
    return '<div class="panel-card"><span class="cell-body"><b>Falta actualizar el Apps Script</b>' +
      '<span class="cell-sub">Pega el Todo.gs nuevo y crea una nueva versión de la implementación para usar los frascos.</span></span></div>';
  }

  // ================= Vista de Ed =================
  A.miniFrascos = function () {
    var p = P();
    if (!p || !p.iniciado) return '';
    return '<button class="panel-card mini-jars' + (p.debido ? ' due' : '') + '" data-act="irFrascos">' +
      F.map(function (f) {
        return '<span class="mini-jar">' + jar(f, p.saldos[f], { cls: 'xs' }) + '<b>' + $(p.saldos[f]) + '</b></span>';
      }).join('') + (p.debido ? '<span class="due-dot">🪙</span>' : A.SVG.chev) + '</button>';
  };

  A.VIEWS.frascos = function () {
    var back = '<button class="nav-btn" data-act="edVolver">' + A.SVG.back + '<span>Ed</span></button>';
    var p = P();
    if (!S.estado) return A.nav('', back) + '<p class="empty">Cargando…</p>';
    if (!p) return A.nav('', back) + '<div class="ed">' + viejo() + '</div>';
    if (!p.iniciado) {
      return A.nav('', back) + '<div class="ed"><div class="jars-row">' +
        F.map(function (f) { return '<div class="jar-col">' + jar(f, 0, { cls: 'off' }) + '<b class="jar-amt">?</b></div>'; }).join('') +
        '</div><p class="subtitle" style="text-align:center">Papá o mamá: empiecen los frascos en Papás → Frascos.</p></div>';
    }
    var html = A.nav('', back) + '<div class="ed">';
    if (p.debido) {
      html += '<button class="pill-btn gold" data-act="irReparto"><span class="glass">' + peso('', true) + '</span>' +
        '<span class="coins">' + $(p.cfg.domingo_monto) + '</span>' +
        '<svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 8 8-8 8"/></svg></button>';
    }
    html += '<div class="jars-row">' + F.map(function (f) {
      return '<div class="jar-col">' + jar(f, p.saldos[f]) + '<b class="jar-amt">' + $(p.saldos[f]) + '</b></div>';
    }).join('') + '</div>';

    // Meta del frasco de ahorro
    var m = p.meta, ah = p.saldos.ahorrar;
    if (m) {
      var pct = Math.min(100, Math.round(ah / m.precio * 100)), falta = Math.max(0, m.precio - ah);
      html += '<div class="panel-card meta-card">' + tile(m.foto || '🎯', 'green', 'lg') +
        '<span class="meta-body"><span class="bar green"><i style="width:' + pct + '%"></i></span>' +
        '<span class="meta-num">' + (falta ? '🐷 ' + $(falta) : '✅') + '</span></span></div>';
    }

    // Cuenta regresiva al domingo
    if (!p.debido) {
      var s = semana();
      html += '<div class="panel-card countdown"><div class="cd-num"><b>' + s.faltan + '</b><span>' + (s.faltan === 1 ? 'día' : 'días') + '</span></div>' +
        '<div class="days">' + s.dias.map(function (d) {
          return '<span class="day' + (d.pasado ? ' past' : '') + (d.hoy ? ' today' : '') + (d.domingo ? ' sunday' : '') + '">' +
            (d.domingo ? '🎁' : d.pasado ? '🌙' : '☀️') + '</span>';
        }).join('') + '</div></div>';
    }
    return html + '</div>';
  };

  // ---------- Reparto del domingo: Ed arrastra las monedas a los frascos ----------
  function quedan() { var r = S.rep; return r.n - r.c.gastar - r.c.ahorrar - r.c.compartir; }

  A.VIEWS.reparto = function () {
    var p = P(), r = S.rep;
    if (!p || !r) return A.VIEWS.frascos();
    var q = quedan(), tray = '';
    // Cada moneda deja su hueco: así los frascos no se mueven mientras Ed arrastra
    for (var i = 0; i < r.n; i++) tray += i < q ? peso('drag' + (r.sel ? ' sel' : ''), true) : '<span class="peso-slot"></span>';
    return '' +
      A.nav('', '<button class="nav-btn" data-act="irFrascos">' + A.SVG.back + '<span>Frascos</span></button>') +
      '<div class="ed reparto">' +
      '<div class="panel-card tray">' + tray + '</div>' +
      '<div class="jars-row drop">' + F.map(function (f) {
        var c = r.c[f];
        return '<div class="jar-col">' + jar(f, 0, { drop: true, monedas: c, triste: r.tristes && r.tristes.indexOf(f) >= 0, cls: r.tristes && r.tristes.indexOf(f) >= 0 ? 'triste' : '' }) +
          '<b class="jar-amt">' + $(c * p.cfg.domingo_moneda) + '</b>' +
          (c ? '<button class="undo" data-act="repQuitar" data-f="' + f + '" aria-label="Regresar una moneda">↩</button>' : '<span class="undo-sp"></span>') +
          '</div>';
      }).join('') + '</div>' +
      '<button class="pill-btn green' + (q ? ' disabled' : '') + '" data-act="repListo"><span class="glass">✓</span></button>' +
      '</div>';
  };

  function meter(f) {
    if (!S.rep || quedan() <= 0) return;
    S.rep.c[f]++;
    S.rep.tristes = null;
    if (quedan() === 0) S.rep.sel = false;
    son('moneda');
    A.render();
    var j = document.querySelector('[data-jar="' + f + '"]');
    if (j) { j.classList.remove('gulp'); void j.offsetWidth; j.classList.add('gulp'); }
  }

  // Arrastrar con el dedo (Pointer Events); tocar una moneda y luego un frasco también funciona
  A.afterRender.reparto = function () {
    document.querySelectorAll('.tray .peso.drag').forEach(function (c) {
      c.addEventListener('pointerdown', function (ev) {
        ev.preventDefault();
        var x0 = ev.clientX, y0 = ev.clientY, movio = false, sobre = null;
        var ghost = c.cloneNode(true);
        ghost.classList.add('ghost');
        document.body.appendChild(ghost);
        function pos(e) { ghost.style.left = (e.clientX - 30) + 'px'; ghost.style.top = (e.clientY - 30) + 'px'; }
        pos(ev);
        c.style.opacity = '.25';
        try { c.setPointerCapture(ev.pointerId); } catch (e) {}
        function move(e) {
          if (Math.abs(e.clientX - x0) + Math.abs(e.clientY - y0) > 8) movio = true;
          pos(e);
          var el = document.elementFromPoint(e.clientX, e.clientY);
          var j = el && el.closest('[data-jar]');
          if (sobre && sobre !== j) sobre.classList.remove('over');
          if (j) j.classList.add('over');
          sobre = j;
        }
        function up(e) {
          c.removeEventListener('pointermove', move);
          c.removeEventListener('pointerup', up);
          c.removeEventListener('pointercancel', up);
          ghost.remove();
          c.style.opacity = '';
          if (sobre) sobre.classList.remove('over');
          if (!movio) { S.rep.sel = !S.rep.sel; A.render(); return; }
          var el = document.elementFromPoint(e.clientX, e.clientY);
          var j = el && el.closest('[data-jar]');
          if (j) meter(j.dataset.jar);
        }
        c.addEventListener('pointermove', move);
        c.addEventListener('pointerup', up);
        c.addEventListener('pointercancel', up);
      });
    });
  };

  A.ACT.irFrascos = function () { A.go('frascos'); };
  A.ACT.irReparto = function () {
    var p = P();
    if (!p || !p.debido) { A.toast('Hoy no toca reparto'); return; }
    S.rep = { n: p.cfg.domingo_monto / p.cfg.domingo_moneda, c: { gastar: 0, ahorrar: 0, compartir: 0 }, sel: false, tristes: null };
    A.go('reparto');
  };
  A.ACT.repJar = function (d) { if (S.rep && S.rep.sel) meter(d.f); };
  A.ACT.repQuitar = function (d) {
    if (!S.rep || !S.rep.c[d.f]) return;
    S.rep.c[d.f]--;
    A.render();
  };
  A.ACT.repListo = function () {
    var r = S.rep, p = P();
    if (!r || quedan() > 0) { son('no'); return; }
    var vacios = F.filter(function (f) { return !r.c[f]; });
    if (vacios.length) { // aviso amable: cada frasco necesita al menos una moneda
      r.tristes = vacios;
      son('no');
      A.render();
      A.toast('Cada frasco necesita al menos una moneda 🙂');
      return;
    }
    var m = p.cfg.domingo_moneda;
    var montos = { gastar: r.c.gastar * m, ahorrar: r.c.ahorrar * m, compartir: r.c.compartir * m };
    A.pedirPin({
      icono: '<div class="jars-row tiny">' + F.map(function (f) { return jar(f, 0, { monedas: r.c[f], cls: 'xs' }); }).join('') + '</div>',
      titulo: F.map(function (f) { return ICONO[f] + ' ' + $(montos[f]); }).join(' · '),
      volver: 'reparto',
      accion: function (pin) {
        return A.escribirDirecto('repartir', { pin: pin, quien: A.quien() || 'Papás', gastar: montos.gastar, ahorrar: montos.ahorrar, compartir: montos.compartir })
          .then(function (res) {
            S.estado = res.estado;
            S.repRes = { interes: res.interes };
            S.rep = null;
            A.go('repartoListo');
            son('exito');
            if (A.lluvia) A.lluvia(res.interes > 0 ? 24 : 16, peso('', false));
          });
      }
    });
  };

  A.VIEWS.repartoListo = function () {
    var p = P(), i = (S.repRes || {}).interes || 0;
    return '<div class="ed done-screen">' +
      (i > 0 ? '<div class="hero-card bank"><div class="bank-ico">🏦</div><div class="bank-plus">+' + $(i) + '</div><div class="bank-txt">¡Tu ahorro creció!</div></div>' : '') +
      '<div class="jars-row">' + F.map(function (f) {
        return '<div class="jar-col">' + jar(f, p.saldos[f], { cls: f === 'ahorrar' && i > 0 ? 'grow' : '' }) + '<b class="jar-amt">' + $(p.saldos[f]) + '</b></div>';
      }).join('') + '</div>' +
      '<button class="pill-btn" data-act="irFrascos"><span class="glass">👍</span></button></div>';
  };

  A.VIEWS.metaCumplida = function () {
    var m = S.metaCumplida || {};
    return '<div class="ed done-screen">' +
      '<div class="confirm-ico bounce">' + tile(m.foto || '🏆', 'green', 'xl') + '</div>' +
      '<h1 class="large-title" style="text-align:center">¡Meta cumplida!</h1>' +
      '<p class="subtitle" style="text-align:center">' + esc(m.nombre) + ' · ' + $(m.precio) + '</p>' +
      '<button class="btn" data-act="frNuevaMeta">Poner una meta nueva</button>' +
      '<button class="btn plain" data-act="frVolverPapas">Listo</button></div>';
  };

  // ================= Modo papás: pestaña Frascos =================
  A.TABS.frascos = function () {
    var p = P();
    if (!p) return '<div style="height:16px"></div>' + viejo();
    if (!p.iniciado) {
      return '<h2 class="group-header">Empezar</h2><div class="group">' +
        F.map(function (f) { return cell({ icon: tile(ICONO[f], COLOR[f]), title: NOMBRE[f], trail: '<span class="v">' + $(p.saldos[f]) + '</span>' }); }).join('') +
        cell({ act: 'frEmpezar', cls: 'link', title: 'Empezar los frascos con estos montos' }) + '</div>' +
        '<p class="group-footer">Cada frasco arranca con su monto inicial (lo puedes cambiar abajo antes de empezar). El primer reparto será el primer domingo después de hoy.</p>' +
        configFrascos(p);
    }
    var s = semana();
    var html = '<div class="balances">' + F.map(function (f) {
      return '<div class="bal">' + tile(ICONO[f], COLOR[f]) + '<span class="bal-n">' + NOMBRE[f] + '</span><b>' + $(p.saldos[f]) + '</b></div>';
    }).join('') + '</div>';

    html += '<h2 class="group-header">Domingo de reparto</h2><div class="group">' +
      (p.debido
        ? cell({ act: 'irReparto', icon: tile('🪙', 'yellow'), title: 'Hacer el reparto con Ed', sub: $(p.cfg.domingo_monto) + ' en monedas de ' + $(p.cfg.domingo_moneda) + ' · interés: ' + $(p.interesPreview), chev: true })
        : cell({ icon: tile('📅', 'blue'), title: 'Próximo: ' + fechaBonita(s.proximo), sub: 'Interés estimado del ahorro: ' + $(p.interesPreview) })) +
      '</div>';

    html += '<h2 class="group-header">Movimientos</h2><div class="group">' +
      cell({ act: 'frGasto', icon: tile('🛍️', 'orange'), title: 'Registrar un gasto', chev: true }) +
      cell({ act: 'frDonacion', icon: tile('💝', 'pink'), title: 'Donación o regalo', chev: true }) +
      cell({ act: 'frTraspaso', icon: tile('↔️', 'blue'), title: 'Pasar dinero entre frascos', chev: true }) +
      '</div>';

    var m = p.meta, ah = p.saldos.ahorrar;
    html += '<h2 class="group-header">Meta de ahorro</h2><div class="group">';
    if (m) {
      var pct = Math.min(100, Math.round(ah / m.precio * 100));
      html += cell({ icon: tile(m.foto || '🎯', 'green', 'lg'), cls: 'tall', title: esc(m.nombre), sub: 'Lleva ' + $(ah) + ' de ' + $(m.precio), trail: '<span class="v pos">' + pct + '%</span>' }) +
        (ah >= m.precio ? cell({ act: 'frCumplirMeta', cls: 'link', title: '🎉 ¡Meta cumplida!' }) : '') +
        cell({ act: 'frMeta', cls: 'link', title: 'Editar meta' });
    } else {
      html += cell({ act: 'frMeta', cls: 'link', title: 'Poner una meta' + (p.metasCumplidas ? ' nueva' : '') });
    }
    html += '</div>';
    if (p.metasCumplidas) html += '<p class="group-footer">Metas cumplidas: ' + p.metasCumplidas + ' 🏆</p>';

    // Historial por frasco
    var filtro = S.frFiltro || 'todos';
    html += '<h2 class="group-header">Estado de cuenta</h2>' +
      '<nav class="segmented" style="margin:0 0 12px">' + [['todos', 'Todos']].concat(F.map(function (f) { return [f, NOMBRE[f]]; })).map(function (t) {
        return '<button data-act="frFiltro" data-f="' + t[0] + '" class="' + (filtro === t[0] ? 'on' : '') + '">' + t[1] + '</button>';
      }).join('') + '</nav>';
    var lista = p.historial.filter(function (x) { return filtro === 'todos' || x.frasco === filtro; });
    if (!lista.length) html += '<p class="empty">Sin movimientos.</p>';
    var dia = null, abierto = false;
    lista.forEach(function (x) {
      var d = x.fecha.slice(0, 10);
      if (d !== dia) {
        if (abierto) html += '</div>';
        html += '<h2 class="group-header">' + esc(A.etiquetaDia(d)) + '</h2><div class="group">';
        dia = d; abierto = true;
      }
      var puede = !x.anulado && ['gasto', 'donacion', 'traspaso', 'meta'].indexOf(x.tipo) >= 0;
      html += cell({
        act: puede ? 'frMov' : null, data: { id: x.id }, icon: tile(x.icono, COLOR[x.frasco]), cls: x.anulado ? 'anulado' : '',
        title: esc(x.descripcion),
        sub: ICONO[x.frasco] + ' ' + NOMBRE[x.frasco] + ' · ' + esc(x.fecha.slice(11, 16)) + ' · ' + esc(x.quien) + (x.anulado ? ' · anulado' : ''),
        trail: '<span class="v ' + (x.monto > 0 ? 'pos' : x.monto < 0 ? 'neg' : 'zero') + '">' + (x.monto > 0 ? '+' : x.monto < 0 ? '−' : '') + $(Math.abs(x.monto)) + '</span><span class="s">' + $(x.saldo) + '</span>'
      });
    });
    if (abierto) html += '</div><p class="group-footer">Toca un gasto, donación, traspaso o meta para anularlo.</p>';

    return html + configFrascos(p);
  };

  function configFrascos(p) {
    var c = p.cfg;
    function campo(k, label) {
      return '<div class="cell field"><label for="cf_' + k + '">' + label + '</label><input id="cf_' + k + '" type="number" min="0" inputmode="numeric" value="' + c[k] + '"></div>';
    }
    return '<h2 class="group-header">Configuración de frascos</h2><div class="group">' +
      (p.iniciado ? '' : campo('frascos_inicial_gastar', '🛍️ Inicial Gastar') + campo('frascos_inicial_ahorrar', '🐷 Inicial Ahorrar') + campo('frascos_inicial_compartir', '💝 Inicial Compartir')) +
      campo('domingo_monto', 'Cada domingo ($)') + campo('domingo_moneda', 'Monedas de ($)') +
      campo('interes_cada', 'Interés: por cada ($)') + campo('interes_monto', 'Interés: gana ($)') +
      cell({ act: 'frGuardarCfg', cls: 'link', title: 'Guardar cambios' }) + '</div>' +
      '<p class="group-footer">Ejemplo: por cada $' + c.interes_cada + ' ahorrados gana $' + c.interes_monto + ' el domingo, antes del reparto.</p>';
  }

  // ---------- acciones de papás ----------
  A.ACT.frFiltro = function (d) { S.frFiltro = d.f; A.render(); };
  A.ACT.frEmpezar = function () {
    if (!confirm('¿Empezar los frascos? Se registra el dinero inicial de cada uno.')) return;
    A.escribir('empezarFrascos', {}).then(function () { A.toast('¡Frascos listos!'); }, function () {});
  };
  A.ACT.frGuardarCfg = function () {
    var cambios = {};
    ['frascos_inicial_gastar', 'frascos_inicial_ahorrar', 'frascos_inicial_compartir', 'domingo_monto', 'domingo_moneda', 'interes_cada', 'interes_monto'].forEach(function (k) {
      var el = document.getElementById('cf_' + k);
      if (el) cambios[k] = el.value;
    });
    A.escribir('guardarConfig', { cambios: cambios }).then(function () { A.toast('Guardado'); }, function () {});
  };

  function opciones(lista, sel) {
    return lista.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === sel ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('');
  }
  function optsFrascos(lista, sel) { return opciones(lista.map(function (f) { return [f, ICONO[f] + ' ' + NOMBRE[f] + ' (' + $(P().saldos[f]) + ')']; }), sel); }

  function hojaGasto(donacion) {
    var p = P();
    var cats = p.categorias.filter(function (c) { return donacion ? (c.id === 'donacion' || c.id === 'regalo') : c.id !== 'donacion'; });
    A.abrirHoja(donacion ? 'Donación o regalo' : 'Registrar gasto', '' +
      '<div class="group">' +
      (donacion ? '' : '<div class="cell field"><label>Frasco</label><select name="frasco">' + optsFrascos(['gastar', 'ahorrar'], 'gastar') + '</select></div>') +
      '<div class="cell field"><label>Monto ($)</label><input name="monto" type="number" min="1" required inputmode="numeric" placeholder="0"></div>' +
      '<div class="cell field"><label>En qué</label><select name="categoria">' + opciones(cats.map(function (c) { return [c.id, c.icono + ' ' + c.nombre]; }), cats[0].id) + '</select></div>' +
      '<div class="cell field"><input name="descripcion" class="left" maxlength="100" placeholder="' + (donacion ? 'Ej. juguete para el primo' : 'Ej. dulces en la tienda') + '"></div>' +
      '</div>' +
      (donacion ? '<p class="group-footer">Sale del frasco Compartir (' + $(p.saldos.compartir) + ').</p>' : ''),
      function (form) {
        var f = form.elements;
        return A.escribir('gastarPesos', {
          frasco: donacion ? 'compartir' : f.frasco.value, monto: Number(f.monto.value), categoria: f.categoria.value, descripcion: f.descripcion.value
        }).then(function () { A.toast('Registrado'); });
      });
  }
  A.ACT.frGasto = function () { hojaGasto(false); };
  A.ACT.frDonacion = function () { hojaGasto(true); };

  A.ACT.frTraspaso = function () {
    A.abrirHoja('Pasar entre frascos', '' +
      '<div class="group">' +
      '<div class="cell field"><label>De</label><select name="de">' + optsFrascos(F, 'gastar') + '</select></div>' +
      '<div class="cell field"><label>A</label><select name="a">' + optsFrascos(F, 'ahorrar') + '</select></div>' +
      '<div class="cell field"><label>Monto ($)</label><input name="monto" type="number" min="1" required inputmode="numeric" placeholder="0"></div>' +
      '</div>',
      function (form) {
        var f = form.elements;
        return A.escribir('traspasarPesos', { de: f.de.value, a: f.a.value, monto: Number(f.monto.value) })
          .then(function () { A.toast('Listo'); });
      });
  };

  // Foto de la meta: se achica en el celular para que quepa en una celda de la Sheet
  function fotoAData(file) {
    return new Promise(function (resolve, reject) {
      var rd = new FileReader();
      rd.onerror = reject;
      rd.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('No pude leer la foto')); };
        img.onload = function () {
          var lado = 240, k = Math.min(1, lado / Math.max(img.width, img.height));
          var cv = document.createElement('canvas');
          cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          var q = 0.75, url = cv.toDataURL('image/jpeg', q);
          while (url.length > 40000 && q > 0.3) { q -= 0.1; url = cv.toDataURL('image/jpeg', q); }
          if (url.length > 45000) reject(new Error('La foto es muy pesada')); else resolve(url);
        };
        img.src = rd.result;
      };
      rd.readAsDataURL(file);
    });
  }

  A.ACT.frMeta = function () {
    var m = P().meta || { nombre: '', precio: '', foto: '' };
    A.abrirHoja(P().meta ? 'Editar meta' : 'Meta de ahorro', '' +
      '<div class="foto-pick"><label>' + '<span id="fotoPrev">' + tile(m.foto || '📷', 'green', 'xl') + '</span>' +
      '<input type="file" name="archivo" accept="image/*" hidden></label><span class="cell-sub">Toca para poner la foto de lo que quiere</span></div>' +
      '<input type="hidden" name="foto" value="' + esc(m.foto) + '">' +
      '<div class="group">' +
      '<div class="cell field"><input name="nombre" class="left" required maxlength="80" placeholder="¿Qué quiere comprar?" value="' + esc(m.nombre) + '"></div>' +
      '<div class="cell field"><label>Cuesta ($)</label><input name="precio" type="number" min="1" required inputmode="numeric" value="' + esc(m.precio) + '"></div>' +
      '</div>',
      function (form) {
        var f = form.elements;
        return A.escribir('guardarMeta', { nombre: f.nombre.value, precio: Number(f.precio.value), foto: f.foto.value })
          .then(function () { A.toast('Meta guardada'); });
      });
    var dlg = document.getElementById('dlg');
    var input = dlg.querySelector('input[name=archivo]');
    input.addEventListener('change', function () {
      if (!input.files[0]) return;
      fotoAData(input.files[0]).then(function (url) {
        dlg.querySelector('input[name=foto]').value = url;
        document.getElementById('fotoPrev').innerHTML = tile(url, 'green', 'xl');
      }, function (e) { A.toast(e.message); });
    });
  };

  A.ACT.frCumplirMeta = function () {
    var m = P().meta;
    if (!confirm('¿' + m.nombre + ' cumplida? Se sacan ' + $(m.precio) + ' del frasco Ahorrar.')) return;
    A.escribir('cumplirMeta', {}).then(function (r) {
      S.metaCumplida = r.meta;
      A.go('metaCumplida');
      son('exito');
      if (A.lluvia) { A.lluvia(24, '🎉'); setTimeout(function () { A.lluvia(18, '⭐'); }, 500); }
    }, function () {});
  };
  A.ACT.frNuevaMeta = function () { S.tab = 'frascos'; A.go('papas'); setTimeout(A.ACT.frMeta, 50); };
  A.ACT.frVolverPapas = function () { S.tab = 'frascos'; A.go('papas'); };

  A.ACT.frMov = function (d) {
    var x = P().historial.filter(function (h) { return h.id === d.id; })[0];
    if (!x) return;
    if (!confirm('¿Anular “' + x.descripcion + '” (' + (x.monto > 0 ? '+' : '−') + $(Math.abs(x.monto)) + ')?' + (x.tipo === 'traspaso' ? '\nSe anulan las dos partes del traspaso.' : ''))) return;
    A.escribir('anularPesos', { movId: x.id }).then(function () { A.toast('Anulado'); }, function () {});
  };
})();
