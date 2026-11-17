/* Parte 4: dado de actividades (solo papás). Un dado 3D con una cara por categoría. */
(function () {
  'use strict';
  var A = window.App;
  var S = A.S, esc = A.esc, tile = A.tile, cell = A.cell;
  var CATS = Core.CATS_DADO;

  function D() { return S.estado && S.estado.dado; }
  function cat(n) { return CATS.filter(function (c) { return c.n === Number(n); })[0] || CATS[0]; }
  function son(k) { if (A.SON) A.SON[k](); }

  // Filtros (se recuerdan en este celular)
  function filtros() {
    if (!S.dadoF) {
      try { S.dadoF = JSON.parse(localStorage.getItem('dado_filtros')); } catch (e) {}
      S.dadoF = S.dadoF || { cat: 0, lugar: '', minutos: 0, liam: '' };
    }
    return S.dadoF;
  }
  function guardarFiltros() { try { localStorage.setItem('dado_filtros', JSON.stringify(S.dadoF)); } catch (e) {} }

  // Orientación del cubo para mostrar cada cara (1 al frente, 2 derecha, 3 atrás, 4 izquierda, 5 arriba, 6 abajo)
  var CARA = { 1: [0, 0], 2: [0, -90], 3: [0, -180], 4: [0, 90], 5: [-90, 0], 6: [90, 0] };
  function rot(x, y) { return 'rotateX(' + x + 'deg) rotateY(' + y + 'deg)'; }

  function cubo() {
    var r = S.dadoRot || [-18, 24];
    return '<div class="dice-stage"><div class="dice" id="dice" style="transform:' + rot(r[0], r[1]) + '">' +
      CATS.map(function (c) {
        return '<div class="face f' + c.n + ' t-' + c.color + '"><span class="face-ico">' + c.icono + '</span><span class="face-n">' + c.n + '</span></div>';
      }).join('') + '</div><div class="dice-shadow"></div></div>';
  }

  function tarjetaResultado() {
    var res = S.dadoRes;
    if (!res) return '';
    var a = res.actividad, c = cat(a.categoria);
    var hecho = res.hecho;
    return '<div class="result t-' + c.color + '">' +
      '<div class="result-top">' + tile(c.icono, c.color) + '<span class="result-cat">' + esc(c.nombre) + '</span></div>' +
      '<div class="result-txt">' + esc(a.texto) + '</div>' +
      '<div class="chips"><span class="chip">' + (a.lugar === 'afuera' ? '🌳 Afuera' : '🏠 Adentro') + '</span>' +
      '<span class="chip">⏱️ ' + a.minutos + ' min</span>' + (a.con_liam ? '<span class="chip">🧒 Con Liam</span>' : '') + '</div>' +
      (hecho
        ? '<div class="result-done">✓ ¡Hecho! Ed ganó su estrella</div>'
        : '<div class="result-actions"><button class="btn" data-act="dadoHecho">¡Hecho! +⭐</button><button class="btn plain" data-act="dadoTirar">Tirar otra vez</button></div>') +
      '</div>';
  }

  function chips(nombre, opciones, actual) {
    return '<div class="chip-row">' + opciones.map(function (o) {
      return '<button class="chip-btn' + (String(o[0]) === String(actual) ? ' on' : '') + (o[2] ? ' t-' + o[2] : '') + '" data-act="dadoFiltro" data-k="' + nombre + '" data-v="' + o[0] + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }

  // ---------- Pantalla del dado ----------
  A.VIEWS.dado = function () {
    var d = D(), f = filtros();
    var back = '<button class="nav-btn" data-act="dadoVolver">' + A.SVG.back + '<span>Papás</span></button>';
    if (!S.estado) { A.refrescar(); return A.nav('Dado', back) + '<p class="empty">Cargando…</p>'; }
    if (!d) {
      return A.nav('Dado', back) + '<div class="panel-card"><span class="cell-body"><b>Falta actualizar el Apps Script</b>' +
        '<span class="cell-sub">Pega el Todo.gs nuevo en Apps Script y crea una nueva versión de la implementación (Implementar → Gestionar implementaciones → ✏️ → Nueva versión). Después vuelve a abrir el dado.</span></span></div>';
    }
    var html = A.nav('Dado de actividades', back) + '<div class="dado">' + cubo() +
      '<button class="pill-btn roll" data-act="dadoTirar" id="btnTirar"><span class="glass">🎲</span><span class="coins">Tirar el dado</span><span></span></button>' +
      '<div id="dadoRes">' + tarjetaResultado() + '</div>';

    // Filtros
    html += '<h2 class="group-header">Categoría</h2>' +
      chips('cat', [[0, 'Todas']].concat(CATS.map(function (c) { return [c.n, c.icono + ' ' + c.nombre, c.color]; })), f.cat) +
      '<h2 class="group-header">Filtros</h2>' +
      chips('lugar', [['', 'Donde sea'], ['adentro', '🏠 Adentro'], ['afuera', '🌳 Afuera']], f.lugar) +
      chips('minutos', [[0, 'Cualquier tiempo'], [5, '5 min'], [10, '10 min'], [15, '15 min']], f.minutos) +
      chips('liam', [['', 'Con o sin Liam'], ['con', '🧒 Con Liam'], ['sin', 'Sin Liam']], f.liam) +
      '<p class="group-footer">Las actividades que salieron en los últimos 3 días no se repiten.</p>';

    // Resumen semanal
    var sem = d.semana, max = 0, total = 0;
    CATS.forEach(function (c) { max = Math.max(max, sem[c.n] || 0); total += sem[c.n] || 0; });
    html += '<h2 class="group-header">Esta semana <span class="aside">' + total + ' hechas</span></h2><div class="group week">' +
      CATS.slice().sort(function (a, b) { return (sem[b.n] || 0) - (sem[a.n] || 0); }).map(function (c) {
        var n = sem[c.n] || 0, pct = max ? Math.round(n / max * 100) : 0;
        var tag = n && n === max ? '<span class="tag top">la que más</span>' : (!n ? '<span class="tag low">casi no</span>' : '');
        return '<div class="cell has-icon">' + '<span class="cell-icon">' + tile(c.icono, c.color) + '</span>' +
          '<span class="cell-body"><span class="cell-title">' + esc(c.nombre) + ' ' + tag + '</span>' +
          '<span class="bar thin t-' + c.color + '"><i style="width:' + pct + '%"></i></span></span>' +
          '<span class="cell-trail"><span class="v">' + n + '</span></span></div>';
      }).join('') + '</div>';

    // Últimas tiradas
    var rec = d.recientes.slice(0, 8);
    if (rec.length) {
      var acts = {};
      d.actividades.forEach(function (a) { acts[a.id] = a; });
      html += '<h2 class="group-header">Últimas tiradas</h2><div class="group">' + rec.map(function (t) {
        var c = cat(t.categoria), a = acts[t.actividad_id] || { texto: '(actividad borrada)' };
        var hecho = t.estado === 'hecho';
        return cell({
          act: hecho ? null : 'dadoHechoDe', data: { id: t.id }, icon: tile(c.icono, c.color), title: esc(a.texto),
          sub: esc(A.etiquetaDia(t.fecha.slice(0, 10))) + ' · ' + esc(t.fecha.slice(11, 16)) + ' · ' + esc(t.quien),
          trail: hecho ? '<span class="v pos">✓</span>' : '<span class="v link-txt">¡Hecho!</span>'
        });
      }).join('') + '</div><p class="group-footer">Si hicieron una actividad después, tócala para marcarla como hecha.</p>';
    }

    // Administrar actividades
    html += '<h2 class="group-header">Actividades</h2>';
    CATS.forEach(function (c) {
      var lista = d.actividades.filter(function (a) { return a.categoria === c.n; });
      html += '<div class="group act-group"><div class="cell has-icon cat-head">' + '<span class="cell-icon">' + tile(c.icono, c.color) + '</span>' +
        '<span class="cell-body"><span class="cell-title"><b>' + esc(c.nombre) + '</b></span></span></div>' +
        lista.map(function (a) {
          return cell({
            act: 'dadoEditar', data: { id: a.id }, cls: a.activa ? '' : 'off', title: esc(a.texto),
            sub: (a.lugar === 'afuera' ? 'Afuera' : 'Adentro') + ' · ' + a.minutos + ' min' + (a.con_liam ? ' · con Liam' : '') + (a.activa ? '' : ' · desactivada'),
            chev: true
          });
        }).join('') + cell({ act: 'dadoEditar', data: { cat: c.n }, cls: 'link', title: 'Agregar actividad' }) + '</div>';
    });
    return html + '</div>';
  };

  // Tarjeta de entrada en Papás → Registrar
  A.dadoCard = function () {
    return '<button class="panel-card dice-entry" data-act="irDado"><span class="ti t-purple lg">🎲</span>' +
      '<span class="cell-body"><span class="cell-title"><b>Dado de actividades</b></span><span class="cell-sub">Escoge una actividad al azar para hacer con Ed</span></span>' + A.SVG.chev + '</button>';
  };

  // ---------- acciones ----------
  A.ACT.irDado = function () { A.go('dado'); A.refrescar(true); };
  A.ACT.dadoVolver = function () { A.go('papas'); };
  A.ACT.dadoFiltro = function (dd) {
    var f = filtros(), v = dd.v;
    f[dd.k] = (dd.k === 'cat' || dd.k === 'minutos') ? Number(v) : v;
    guardarFiltros();
    A.render();
  };

  var rodando = false;
  A.ACT.dadoTirar = function () {
    if (rodando) return;
    var pin = A.pin();
    if (!pin) { A.go('pin'); return; }
    rodando = true; S.ocupado = true; // que la actualización automática no interrumpa el giro
    var f = filtros(), dice = document.getElementById('dice'), btn = document.getElementById('btnTirar');
    if (btn) btn.classList.add('disabled');
    // Empieza a girar de inmediato, sin esperar al servidor
    var r0 = S.dadoRot || [-18, 24];
    var giro = [r0[0] + 720 + Math.round(Math.random() * 180), r0[1] + 900 + Math.round(Math.random() * 180)];
    if (dice) { dice.style.transition = 'transform 3s cubic-bezier(.2,.6,.4,1)'; dice.style.transform = rot(giro[0], giro[1]); }
    son('paso');
    var inicio = Date.now();
    A.escribirDirecto('tirarDado', { pin: pin, quien: A.quien(), categoria: f.cat, lugar: f.lugar, minutos: f.minutos, liam: f.liam })
      .then(function (res) {
        S.estado = res.estado;
        var c = CARA[res.actividad.categoria];
        // Caer en la cara de la categoría, con unas vueltas extra
        var vueltasX = Math.ceil((giro[0] + 360) / 360) * 360, vueltasY = Math.ceil((giro[1] + 360) / 360) * 360;
        // Caras laterales: un poco inclinado para que se vea en 3D; arriba/abajo: de frente
        var fin = c[0] === 0 ? [vueltasX - 14, vueltasY + c[1]] : [vueltasX + c[0], vueltasY];
        S.dadoRot = fin;
        var espera = Math.max(0, 700 - (Date.now() - inicio));
        setTimeout(function () {
          var dz = document.getElementById('dice');
          if (dz) { dz.style.transition = 'transform 1.3s cubic-bezier(.15,.9,.25,1.05)'; dz.style.transform = rot(fin[0], fin[1]); }
          setTimeout(function () {
            rodando = false; S.ocupado = false;
            S.dadoRes = { tirada: res.tirada, actividad: res.actividad, hecho: false };
            son('exito');
            A.render();
            var el = document.getElementById('dadoRes');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 1350);
        }, espera);
      }, function (err) {
        rodando = false; S.ocupado = false;
        if (err.code === 'PIN') { A.go('pin'); }
        A.toast(err.message);
        A.render();
      });
  };

  function marcarHecho(id, alListo) {
    A.escribir('dadoHecho', { tiradaId: id }).then(function () {
      son('exito');
      if (A.lluvia) A.lluvia(12, '⭐');
      A.toast('¡Bien! +1 estrella para Ed');
      if (alListo) alListo();
      A.render();
    }, function () {});
  }
  A.ACT.dadoHecho = function () {
    if (!S.dadoRes || S.dadoRes.hecho) return;
    marcarHecho(S.dadoRes.tirada.id, function () { S.dadoRes.hecho = true; });
  };
  A.ACT.dadoHechoDe = function (dd) {
    if (!confirm('¿Marcar esta actividad como hecha? Ed gana su estrella.')) return;
    marcarHecho(dd.id, function () { if (S.dadoRes && S.dadoRes.tirada.id === dd.id) S.dadoRes.hecho = true; });
  };

  A.ACT.dadoEditar = function (dd) {
    var d = D();
    var a = dd.id ? d.actividades.filter(function (x) { return x.id === dd.id; })[0]
      : { texto: '', categoria: Number(dd.cat) || 1, lugar: 'adentro', minutos: 10, con_liam: false, activa: true };
    function opts(lista, sel) { return lista.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(sel) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join(''); }
    A.abrirHoja(dd.id ? 'Editar actividad' : 'Nueva actividad', '' +
      '<div class="group">' +
      '<div class="cell field"><input name="texto" class="left" required maxlength="160" placeholder="¿Qué van a hacer?" value="' + esc(a.texto) + '"></div>' +
      '<div class="cell field"><label>Categoría</label><select name="categoria">' + opts(CATS.map(function (c) { return [c.n, c.icono + ' ' + c.nombre]; }), a.categoria) + '</select></div>' +
      '<div class="cell field"><label>Dónde</label><select name="lugar">' + opts([['adentro', 'Adentro'], ['afuera', 'Afuera']], a.lugar) + '</select></div>' +
      '<div class="cell field"><label>Tiempo</label><select name="minutos">' + opts([[5, '5 min'], [10, '10 min'], [15, '15 min']], a.minutos) + '</select></div>' +
      '</div><div style="height:20px"></div><div class="group">' +
      '<label class="cell field check-cell"><span class="cell-body">Es con Liam</span><input type="checkbox" name="con_liam"' + (a.con_liam ? ' checked' : '') + '></label>' +
      '<label class="cell field check-cell"><span class="cell-body">Activa (puede salir en el dado)</span><input type="checkbox" name="activa"' + (a.activa ? ' checked' : '') + '></label>' +
      '</div>',
      function (form) {
        var f = form.elements;
        return A.escribir('guardarActividad', { actividad: {
          id: a.id, texto: f.texto.value, categoria: Number(f.categoria.value), lugar: f.lugar.value,
          minutos: Number(f.minutos.value), con_liam: f.con_liam.checked, activa: f.activa.checked
        } }).then(function () { A.toast('Guardado'); });
      });
  };
})();
