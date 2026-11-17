/*
 * Lógica compartida de la app familiar.
 *
 * Este archivo es IDÉNTICO en dos lugares:
 *   - web/js/core.js        → lo usa el "modo prueba" en el navegador
 *   - apps-script/Logica.gs → lo usa el servidor real (Google Apps Script)
 * Si cambias uno, copia el contenido al otro.
 *
 * Todas las reglas (PIN, tope diario, saldo nunca negativo) viven aquí,
 * así el modo prueba se comporta igual que la Sheet.
 */
var Core = (function () {
  // Columnas de cada pestaña de la Sheet
  var TABS = {
    Config: ['clave', 'valor'],
    Reglas: ['id', 'tipo', 'texto', 'icono', 'valor', 'activa', 'orden'],
    Premios: ['id', 'nombre', 'icono', 'precio', 'repetible', 'activo', 'canjeado', 'orden'],
    Historial: ['id', 'fecha', 'tipo', 'ref_id', 'icono', 'descripcion', 'delta', 'aplicado', 'quien', 'saldo', 'nota'],
    Actividades: ['id', 'categoria', 'texto', 'lugar', 'minutos', 'con_liam', 'activa'],
    Dado: ['id', 'fecha', 'actividad_id', 'categoria', 'estado', 'quien'],
    Liam: ['id', 'fecha', 'rutina', 'puso'],
    Silabas: ['letra', 'silabas', 'orden', 'dominada', 'fecha'],
    // Frascos de pesos reales (independiente de la moneda de conducta)
    Pesos: ['id', 'fecha', 'frasco', 'tipo', 'ref_id', 'icono', 'descripcion', 'monto', 'quien', 'saldo', 'reparto_id'],
    Metas: ['id', 'nombre', 'foto', 'precio', 'estado', 'fecha_inicio', 'fecha_cumplida'],
    Repartos: ['id', 'fecha', 'total', 'gastar', 'ahorrar', 'compartir', 'interes', 'quien']
  };

  var NUM = ['valor', 'orden', 'precio', 'canjeado', 'delta', 'aplicado', 'saldo', 'categoria', 'minutos',
    'monto', 'total', 'gastar', 'ahorrar', 'compartir', 'interes'];
  var BOOL = ['activa', 'activo', 'repetible', 'con_liam', 'dominada'];

  function regla(id, tipo, texto, icono, valor, orden) {
    return { id: id, tipo: tipo, texto: texto, icono: icono, valor: valor, activa: 'sí', orden: orden };
  }
  function act(id, cat, texto, lugar, min, liam) {
    return { id: id, categoria: cat, texto: texto, lugar: lugar, minutos: min, con_liam: liam, activa: 'sí' };
  }
  function sil(letra, orden, s) {
    return { letra: letra, silabas: s, orden: orden, dominada: 'no', fecha: '' };
  }

  // Datos iniciales (setup() los copia a la Sheet)
  var SEED = {
    Config: [
      { clave: 'pin', valor: '1234' },
      { clave: 'moneda_nombre', valor: 'Vanemisaurios coins' },
      { clave: 'moneda_icono', valor: '🪙' },
      { clave: 'tope_deducciones_dia', valor: '2' },
      { clave: 'meta_premio', valor: '' },
      // Frascos de pesos
      { clave: 'frascos_inicial_gastar', valor: '30' },
      { clave: 'frascos_inicial_ahorrar', valor: '30' },
      { clave: 'frascos_inicial_compartir', valor: '30' },
      { clave: 'domingo_monto', valor: '50' },
      { clave: 'domingo_moneda', valor: '5' },
      { clave: 'interes_cada', valor: '10' },
      { clave: 'interes_monto', valor: '1' }
    ],
    Reglas: [
      regla('b01', 'bono', 'Empieza la tarea a la hora acordada', '⏰', 1, 1),
      regla('b02', 'bono', 'Termina la tarea sin pelear', '✏️', 2, 2),
      regla('b03', 'bono', 'La hace él solito (sin copiar)', '💪', 2, 3),
      regla('b04', 'bono', 'Pide ayuda cuando no entiende algo', '🙋', 1, 4),
      regla('b05', 'bono', 'Lee un cuento con nosotros 10 minutos', '📖', 1, 5),
      regla('b06', 'bono', 'Prepara su mochila o guarda sus útiles', '🎒', 1, 6),
      regla('b07', 'bono', 'Hizo un mandado él solito', '🛒', 1, 7),
      regla('b08', 'bono', 'Ayudó o jugó bonito con Liam', '🤝', 1, 8),
      regla('b09', 'bono', 'Hizo las paces después de un berrinche o pelea', '🕊️', 1, 9),
      regla('b10', 'bono', 'Completó la actividad del dado', '🎲', 1, 10),
      regla('b11', 'bono', 'Recado bueno de la maestra', '🍎', 3, 11),
      regla('b12', 'bono', 'Le puso su calcomanía a Liam', '🌟', 1, 12),
      regla('d01', 'deduccion', 'Berrinche o se niega a hacer la tarea', '😤', 1, 1),
      regla('d02', 'deduccion', 'Dice una mentira', '🤥', 1, 2),
      regla('d03', 'deduccion', 'No guarda sus cosas después de 2 avisos', '🧸', 1, 3)
    ],
    Premios: [
      { id: 'p01', nombre: 'Escoge qué se cena', icono: '🍕', precio: 10, repetible: 'sí', activo: 'sí', canjeado: 0, orden: 1 },
      { id: 'p02', nombre: '30 minutos extra de juego', icono: '🎮', precio: 15, repetible: 'sí', activo: 'sí', canjeado: 0, orden: 2 },
      { id: 'p03', nombre: 'Salida al parque o por un helado', icono: '🍦', precio: 25, repetible: 'sí', activo: 'sí', canjeado: 0, orden: 3 },
      { id: 'p04', nombre: 'Un juguete pequeño', icono: '🧸', precio: 40, repetible: 'sí', activo: 'sí', canjeado: 0, orden: 4 }
    ],
    Actividades: [
      act('a01', 1, 'Saltar sílabas: hojas en el piso, papá dice una y Ed brinca encima', 'adentro', 10, 'no'),
      act('a02', 1, 'Pelota de sílabas: lanzar la pelota diciendo "m"... "a"... "¡MA!"', 'adentro', 10, 'no'),
      act('a03', 1, 'Memorama de sílabas', 'adentro', 15, 'no'),
      act('a04', 1, 'Buscar una letra por toda la casa', 'adentro', 10, 'no'),
      act('a05', 1, 'Leer un cuento donde Ed lee una palabra por página', 'adentro', 10, 'no'),
      act('a06', 1, 'Formar letras con plastilina', 'adentro', 15, 'no'),
      act('a07', 2, 'Carrera de obstáculos con cojines', 'adentro', 10, 'sí'),
      act('a08', 2, 'Congelados con música', 'adentro', 5, 'sí'),
      act('a09', 2, 'Futbol en el patio o parque', 'afuera', 15, 'sí'),
      act('a10', 2, 'Imitar animales y adivinar cuál es', 'adentro', 5, 'sí'),
      act('a11', 2, 'Twister de colores casero', 'adentro', 10, 'no'),
      act('a12', 3, 'Ed escoge el juego y papá o mamá juega sin celular 15 minutos', 'adentro', 15, 'no'),
      act('a13', 3, 'Cocinar algo sencillo juntos', 'adentro', 15, 'no'),
      act('a14', 3, 'Dibujar juntos y contar la historia del dibujo', 'adentro', 10, 'no'),
      act('a15', 3, 'Construir un fuerte con cobijas', 'adentro', 15, 'no'),
      act('a16', 4, 'Ed le enseña a Liam a armar una torre', 'adentro', 5, 'sí'),
      act('a17', 4, 'Ed le lee (o le inventa) un cuento a Liam con dibujos', 'adentro', 10, 'sí'),
      act('a18', 4, 'Juego de turnos entre los dos con pelota', 'afuera', 10, 'sí'),
      act('a19', 4, 'Ed ayuda a Liam con su rutina y le pone su calcomanía', 'adentro', 5, 'sí'),
      act('a20', 5, 'Ir por algo a otro cuarto solo (con la luz prendida)', 'adentro', 5, 'no'),
      act('a21', 5, 'Pedirle algo a un adulto él solito', 'afuera', 5, 'no'),
      act('a22', 5, 'Probar una comida nueva', 'adentro', 5, 'no'),
      act('a23', 5, 'Bajar por agua con papá esperando en la escalera', 'adentro', 5, 'no'),
      act('a24', 6, 'Respiración del globo (3 veces)', 'adentro', 5, 'sí'),
      act('a25', 6, 'Contar cómo se sintió hoy con el semáforo', 'adentro', 5, 'no'),
      act('a26', 6, 'Abrazo de oso de 10 segundos', 'adentro', 5, 'sí'),
      act('a27', 6, 'Dibujar cómo se ve el enojo y luego romper el dibujo', 'adentro', 10, 'no')
    ],
    Silabas: [
      sil('m', 1, 'ma me mi mo mu'), sil('p', 2, 'pa pe pi po pu'), sil('s', 3, 'sa se si so su'),
      sil('l', 4, 'la le li lo lu'), sil('t', 5, 'ta te ti to tu'), sil('n', 6, 'na ne ni no nu'),
      sil('d', 7, 'da de di do du'), sil('b', 8, 'ba be bi bo bu'), sil('f', 9, 'fa fe fi fo fu'),
      sil('r', 10, 'ra re ri ro ru'), sil('c', 11, 'ca co cu'), sil('g', 12, 'ga go gu'),
      sil('v', 13, 'va ve vi vo vu'), sil('j', 14, 'ja je ji jo ju'), sil('ch', 15, 'cha che chi cho chu'),
      sil('ñ', 16, 'ña ñe ñi ño ñu')
    ]
  };

  function str(v) { return v == null ? '' : String(v); }
  function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
  function bool(v) { return v === true || /^(s[ií]|true|verdadero|1|x)$/i.test(str(v).trim()); }
  function yn(b) { return b ? 'sí' : 'no'; }
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // Convierte una fila de texto de la Sheet a tipos reales (números, sí/no → true/false)
  function typed(row) {
    var o = {};
    for (var k in row) {
      if (NUM.indexOf(k) >= 0) o[k] = num(row[k]);
      else if (BOOL.indexOf(k) >= 0) o[k] = bool(row[k]);
      else o[k] = str(row[k]);
    }
    return o;
  }

  function err(msg, code) { var e = new Error(msg); e.code = code || ''; return e; }

  /*
   * db: { rows(tab) → [obj], append(tab, obj), upsert(tab, campoClave, obj) }
   * env: { now() → 'YYYY-MM-DDTHH:mm:ss' en la hora local de la familia }
   */
  function create(db, env) {
    function cfg() {
      var o = {};
      db.rows('Config').forEach(function (r) { o[r.clave] = str(r.valor); });
      return o;
    }
    function find(tab, key, val) {
      var rows = db.rows(tab);
      for (var i = 0; i < rows.length; i++) if (str(rows[i][key]) === str(val)) return rows[i];
      return null;
    }
    function hist() { return db.rows('Historial'); }
    function saldo() { var h = hist(); return h.length ? num(h[h.length - 1].saldo) : 0; }
    function checkPin(pin) {
      if (!/^\d{4}$/.test(str(pin)) || str(pin) !== cfg().pin) throw err('PIN incorrecto', 'PIN');
    }
    function quien(q) {
      q = str(q).trim();
      if (!q) throw err('Falta indicar quién registra');
      return q.slice(0, 30);
    }
    function anulados() {
      var s = {};
      hist().forEach(function (m) { if (m.tipo === 'anulacion') s[m.ref_id] = true; });
      return s;
    }
    function deduccionesHoy() {
      var hoy = env.now().slice(0, 10), an = anulados(), t = 0;
      hist().forEach(function (m) {
        if (m.tipo === 'deduccion' && str(m.fecha).slice(0, 10) === hoy && !an[m.id]) t += -num(m.aplicado);
      });
      return t;
    }
    // Agrega un movimiento al historial. El saldo nunca baja de 0.
    function mover(m) {
      var s = saldo();
      if (s + m.aplicado < 0) m.aplicado = -s;
      m.id = uid('m');
      m.fecha = env.now();
      m.saldo = s + m.aplicado;
      db.append('Historial', m);
      return m;
    }
    function porOrden(a, b) { return a.orden - b.orden; }

    function estado() {
      var an = anulados();
      var c = cfg();
      delete c.pin;
      return {
        config: c,
        reglas: db.rows('Reglas').map(typed).sort(porOrden),
        premios: db.rows('Premios').map(typed).sort(porOrden),
        saldo: saldo(),
        deduccionesHoy: deduccionesHoy(),
        historial: hist().slice(-300).reverse().map(function (m) {
          var t = typed(m);
          t.anulado = !!an[m.id];
          return t;
        })
      };
    }

    function guardarFila(tab, prefijo, datos, limpiar) {
      var existente = datos.id ? find(tab, 'id', datos.id) : null;
      var fila = limpiar(datos);
      fila.id = existente ? existente.id : uid(prefijo);
      if (!existente) fila.orden = db.rows(tab).length + 1;
      db.upsert(tab, 'id', fila);
      return fila;
    }

    var acciones = {
      estado: function () { return estado(); },

      login: function (r) { checkPin(r.pin); return { ok: true }; },

      registrar: function (r) {
        checkPin(r.pin);
        var regla = find('Reglas', 'id', r.reglaId);
        if (!regla) throw err('No encontré esa regla');
        var valor = Math.abs(num(regla.valor));
        var m = {
          tipo: regla.tipo, ref_id: regla.id, icono: regla.icono, descripcion: regla.texto,
          quien: quien(r.quien), nota: str(r.nota).slice(0, 200)
        };
        if (regla.tipo === 'bono') {
          m.delta = valor;
          m.aplicado = valor;
        } else if (regla.tipo === 'deduccion') {
          var tope = num(cfg().tope_deducciones_dia);
          var disponible = Math.max(0, tope - deduccionesHoy());
          var s = saldo();
          var real = Math.min(valor, disponible, s);
          m.delta = -valor;
          m.aplicado = -real;
          if (real < valor) {
            var motivo = disponible < valor ? 'Tope diario de -' + tope + ' alcanzado' : 'El saldo no baja de 0';
            m.nota = m.nota ? m.nota + ' · ' + motivo : motivo;
          }
        } else {
          throw err('Tipo de regla desconocido');
        }
        return { movimiento: typed(mover(m)), estado: estado() };
      },

      anular: function (r) {
        checkPin(r.pin);
        var m = find('Historial', 'id', r.movId);
        if (!m) throw err('No encontré ese movimiento');
        if (m.tipo === 'anulacion') throw err('No se puede anular una anulación');
        if (anulados()[m.id]) throw err('Ese movimiento ya estaba anulado');
        var mov = mover({
          tipo: 'anulacion', ref_id: m.id, icono: '↩️', descripcion: 'Anulado: ' + m.descripcion,
          delta: -num(m.aplicado), aplicado: -num(m.aplicado), quien: quien(r.quien), nota: str(r.nota).slice(0, 200)
        });
        if (m.tipo === 'canje') { // devolver el premio a la tienda
          var p = find('Premios', 'id', m.ref_id);
          if (p) db.upsert('Premios', 'id', { id: p.id, canjeado: Math.max(0, num(p.canjeado) - 1) });
        }
        return { movimiento: typed(mov), estado: estado() };
      },

      // Ed canjea un premio; un papá lo confirma con su PIN
      canjear: function (r) {
        checkPin(r.pin);
        var p = find('Premios', 'id', r.premioId);
        if (!p || !bool(p.activo)) throw err('Ese premio ya no está en la tienda');
        if (!bool(p.repetible) && num(p.canjeado) > 0) throw err('Ese premio ya se canjeó');
        var precio = num(p.precio), s = saldo();
        if (s < precio) throw err('Te faltan ' + (precio - s));
        var mov = mover({
          tipo: 'canje', ref_id: p.id, icono: p.icono, descripcion: 'Canjeó: ' + p.nombre,
          delta: -precio, aplicado: -precio, quien: quien(r.quien), nota: ''
        });
        db.upsert('Premios', 'id', { id: p.id, canjeado: num(p.canjeado) + 1 });
        if (cfg().meta_premio === p.id) db.upsert('Config', 'clave', { clave: 'meta_premio', valor: '' });
        return { movimiento: typed(mov), estado: estado() };
      },

      // Ed escoge (o quita) el premio que está ahorrando. No necesita PIN.
      elegirMeta: function (r) {
        var id = str(r.premioId);
        if (id) {
          var p = find('Premios', 'id', id);
          if (!p || !bool(p.activo)) throw err('Ese premio no está en la tienda');
        }
        db.upsert('Config', 'clave', { clave: 'meta_premio', valor: id });
        return { estado: estado() };
      },

      guardarRegla: function (r) {
        checkPin(r.pin);
        guardarFila('Reglas', 'r', r.regla || {}, function (d) {
          var tipo = d.tipo === 'deduccion' ? 'deduccion' : 'bono';
          var texto = str(d.texto).trim().slice(0, 100);
          if (!texto) throw err('Escribe qué hizo');
          var valor = Math.round(Math.abs(num(d.valor)));
          if (valor < 1 || valor > 50) throw err('El valor debe estar entre 1 y 50');
          return { tipo: tipo, texto: texto, icono: str(d.icono).trim().slice(0, 300) || '⭐', valor: valor, activa: yn(d.activa !== false) };
        });
        return { estado: estado() };
      },

      guardarPremio: function (r) {
        checkPin(r.pin);
        guardarFila('Premios', 'p', r.premio || {}, function (d) {
          var nombre = str(d.nombre).trim().slice(0, 100);
          if (!nombre) throw err('Escribe el nombre del premio');
          var precio = Math.round(Math.abs(num(d.precio)));
          if (precio < 1) throw err('El precio debe ser al menos 1');
          return { nombre: nombre, icono: str(d.icono).trim().slice(0, 300) || '🎁', precio: precio, repetible: yn(d.repetible !== false), activo: yn(d.activo !== false) };
        });
        return { estado: estado() };
      },

      guardarConfig: function (r) {
        checkPin(r.pin);
        var c = r.cambios || {};
        var permitidas = { moneda_nombre: 30, moneda_icono: 300, tope_deducciones_dia: 3, meta_premio: 40 };
        Object.keys(c).forEach(function (k) {
          if (k === 'pin_nuevo') {
            if (!/^\d{4}$/.test(str(c[k]))) throw err('El PIN debe ser de 4 números');
            db.upsert('Config', 'clave', { clave: 'pin', valor: str(c[k]) });
          } else if (permitidas[k]) {
            var v = str(c[k]).trim().slice(0, permitidas[k]);
            if (k === 'tope_deducciones_dia') v = String(Math.max(0, Math.round(num(v))));
            if (k === 'moneda_nombre' && !v) throw err('La moneda necesita un nombre');
            db.upsert('Config', 'clave', { clave: k, valor: v });
          }
        });
        return { estado: estado() };
      }
    };

    return {
      handle: function (req) {
        req = req || {};
        var f = acciones[req.action];
        if (!f) throw err('Acción desconocida: ' + str(req.action));
        return f(req);
      }
    };
  }

  return { TABS: TABS, SEED: SEED, create: create, typed: typed };
})();
