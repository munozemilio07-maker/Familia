/*
 * Conexión con el servidor.
 *  - Modo real: manda las acciones a la URL de Apps Script.
 *  - Modo prueba: corre la misma lógica (core.js) guardando todo en este celular.
 */
var API = (function () {
  var KEY_URL = 'familia_api_url';
  var KEY_DB = 'familia_prueba_db';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }

  function url() { return lsGet(KEY_URL); }
  function modo() { var u = url(); return !u ? null : (u === 'prueba' ? 'prueba' : 'real'); }

  // --- Modo prueba ---------------------------------------------------------
  var memoria = null; // por si el navegador no deja usar localStorage
  function aTexto(tab, o) {
    var r = {};
    Core.TABS[tab].forEach(function (k) { r[k] = o[k] == null ? '' : String(o[k]); });
    return r;
  }
  function cargarPrueba() {
    var data = memoria;
    if (!data) { try { data = JSON.parse(lsGet(KEY_DB)); } catch (e) {} }
    data = data || {};
    // Pestañas o claves nuevas que no existían cuando se crearon los datos de prueba
    Object.keys(Core.TABS).forEach(function (t) {
      if (!data[t]) data[t] = (Core.SEED[t] || []).map(function (r) { return aTexto(t, r); });
    });
    var claves = data.Config.map(function (r) { return r.clave; });
    (Core.SEED.Config || []).forEach(function (r) { if (claves.indexOf(r.clave) < 0) data.Config.push(aTexto('Config', r)); });
    memoria = data;
    return data;
  }
  function dbPrueba() {
    var data = cargarPrueba();
    function guardar() { lsSet(KEY_DB, JSON.stringify(data)); }
    return {
      rows: function (t) { return data[t]; },
      append: function (t, o) { data[t].push(aTexto(t, o)); guardar(); },
      upsert: function (t, k, o) {
        var rows = data[t], i = -1;
        for (var j = 0; j < rows.length; j++) if (rows[j][k] === String(o[k])) { i = j; break; }
        if (i < 0) { rows.push(aTexto(t, o)); }
        else {
          var m = {};
          Core.TABS[t].forEach(function (c) { m[c] = o[c] != null ? o[c] : rows[i][c]; });
          rows[i] = aTexto(t, m);
        }
        guardar();
      }
    };
  }
  function ahoraLocal() {
    if (window.__relojPrueba) return window.__relojPrueba; // solo para pruebas: fija la fecha del modo prueba
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  // --- Llamada común -------------------------------------------------------
  function call(action, payload) {
    var req = Object.assign({ action: action }, payload || {});
    if (modo() === 'prueba') {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          try {
            var out = Core.create(dbPrueba(), { now: ahoraLocal }).handle(req);
            resolve(JSON.parse(JSON.stringify(out)));
          } catch (e) { reject(e); }
        }, 250);
      });
    }
    if (!url()) return Promise.reject(new Error('Falta configurar la conexión'));
    // Texto plano (no application/json) para evitar el bloqueo CORS de Apps Script
    return fetch(url(), { method: 'POST', body: JSON.stringify(req) })
      .then(function (r) {
        if (!r.ok) throw new Error('El servidor respondió ' + r.status);
        return r.json();
      }, function () { throw new Error('Sin conexión con la Sheet'); })
      .then(function (j) {
        if (!j.ok) { var e = new Error(j.error); e.code = j.code; throw e; }
        return j.data;
      });
  }

  return {
    call: call,
    modo: modo,
    configurado: function () { return !!modo(); },
    usarUrl: function (u) { lsSet(KEY_URL, u); },
    borrarPrueba: function () { memoria = null; lsSet(KEY_DB, null); }
  };
})();
