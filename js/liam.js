/* Parte 5: vista de Liam (2-3 años). Tres rutinas, una calcomanía por cada una. Sin moneda. */
(function () {
  'use strict';
  var A = window.App;
  var S = A.S, esc = A.esc, tile = A.tile;

  function L() { return S.estado && S.estado.liam; }
  function son(k) { if (A.SON) A.SON[k](); }
  function deHoy() {
    var l = L(), m = {};
    l.semana.forEach(function (r) { if (r.fecha.slice(0, 10) === l.hoy) m[r.rutina] = r; });
    return m;
  }

  var NUBES = '<div class="clouds" aria-hidden="true"><i class="c1"></i><i class="c2"></i><i class="c3"></i></div>';

  A.VIEWS.liam = function () {
    var back = A.atras();
    if (!S.estado) return A.nav('', back) + '<p class="empty">Cargando…</p>';
    var l = L();
    if (!l) {
      return A.nav('', back) + '<div class="panel-card"><span class="cell-body"><b>Falta actualizar el Apps Script</b>' +
        '<span class="cell-sub">Pega el Todo.gs nuevo y crea una nueva versión de la implementación.</span></span></div>';
    }
    var hoy = deHoy(), hechas = Object.keys(hoy).length, todas = hechas === l.rutinas.length;

    var html = '<div class="liam-view">' + NUBES + A.nav('', back) +
      '<div class="liam-hero">' +
      '  <div class="balloon' + (todas ? ' party' : '') + '">🎈</div>' +
      '  <div class="liam-progress">' + l.rutinas.map(function (r) {
        return '<span class="dotsticker' + (hoy[r.id] ? ' on' : '') + '">' + (hoy[r.id] ? hoy[r.id].calcomania : '') + '</span>';
      }).join('') + '</div>' +
      '</div>';

    html += '<div class="routines">' + l.rutinas.map(function (r) {
      var h = hoy[r.id];
      return '<button class="routine t-' + r.color + (h ? ' done' : '') + '" data-act="liamRutina" data-r="' + r.id + '" aria-label="' + esc(r.nombre) + '">' +
        '<span class="routine-ico">' + r.icono + '</span>' +
        '<span class="routine-name">' + esc(r.nombre) + '</span>' +
        (h ? '<span class="sticker" id="st_' + r.id + '">' + h.calcomania + '</span>' + (h.puso === 'Ed' ? '<span class="by-ed">🕷️</span>' : '') : '<span class="sticker empty"></span>') +
        '</button>';
    }).join('') + '</div>';

    // Álbum de la semana
    var dias = [];
    for (var k = 6; k >= 0; k--) dias.push(Core.sumarDias(l.hoy, -k));
    html += '<div class="panel-card album">' + dias.map(function (d) {
      var del = l.semana.filter(function (r) { return r.fecha.slice(0, 10) === d; });
      var letra = 'DLMMJVS'.charAt(Core.diaSemana(d));
      return '<div class="album-day' + (d === l.hoy ? ' today' : '') + '"><b>' + letra + '</b>' +
        l.rutinas.map(function (r) {
          var x = del.filter(function (y) { return y.rutina === r.id; })[0];
          return '<span class="mini' + (x ? ' on' : '') + '">' + (x ? x.calcomania : '') + '</span>';
        }).join('') + '</div>';
    }).join('') + '</div>';

    return html + '</div>';
  };

  A.ACT.irLiam = function () { A.go('liam'); };

  // Tocar una rutina: ¿quién le puso la calcomanía?
  A.ACT.liamRutina = function (d) {
    var l = L(), r = l.rutinas.filter(function (x) { return x.id === d.r; })[0];
    if (!r) return;
    if (deHoy()[r.id]) { // ya está: solo vuelve a brincar
      var st = document.getElementById('st_' + r.id);
      if (st) { st.classList.remove('stamp'); void st.offsetWidth; st.classList.add('stamp'); }
      son('paso');
      return;
    }
    var dlg = document.getElementById('dlg');
    dlg.innerHTML = '<div class="kid-sheet liam-sheet">' +
      '<div class="confirm-ico">' + tile(r.icono, r.color, 'xl') + '</div>' +
      '<p class="subtitle" style="text-align:center;margin-top:14px">¿Quién le pone la calcomanía?</p>' +
      '<div class="who-row">' +
      '  <button class="who-btn ed" data-puso="Ed"><span>🕷️</span><b>Ed</b></button>' +
      '  <button class="who-btn papas" data-puso="Papás"><span>👨‍👩‍👦</span><b>Papá o mamá</b></button>' +
      '</div>' +
      '<button class="round-btn close" data-close="1" aria-label="Cerrar" style="margin:18px auto 4px">✕</button></div>';
    dlg.onclick = function (ev) {
      var b = ev.target.closest('button');
      if (ev.target === dlg || (b && b.dataset.close)) { dlg.close(); return; }
      if (!b || !b.dataset.puso || b.disabled) return;
      dlg.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
      A.escribirDirecto('calcomania', { rutina: r.id, puso: b.dataset.puso }).then(function (res) {
        dlg.close();
        S.estado = res.estado;
        A.render();
        var st = document.getElementById('st_' + r.id);
        if (st) st.classList.add('stamp');
        son('exito');
        if (A.lluvia) A.lluvia(14, res.calcomania);
        if (res.estrella) A.toast('+' + res.estrella + ' ⭐ para Ed por ayudar a Liam');
        if (Object.keys(deHoy()).length === L().rutinas.length) {
          setTimeout(function () { son('exito'); if (A.lluvia) { A.lluvia(20, '🎈'); A.lluvia(12, '⭐'); } }, 900);
        }
      }, function (e) {
        dlg.close();
        A.toast(e.message);
        A.refrescar();
      });
    };
    dlg.showModal();
  };
})();
