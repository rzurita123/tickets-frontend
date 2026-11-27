/* Consulta de tickets con filtros en la URL. */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;
  const D = App.dominio;

  const TAMANOS_PAGINA = ['15', '30', '50'];

  // Primero los cerrados.
  const ESTADOS_FILTRO = [
    { clave: 'CERRADO', texto: 'Cerrados', tono: 'verde', fn: (t) => t.estado === 'CERRADO' },
    { clave: 'en-curso', texto: 'En curso', fn: (t) => D.ESTADOS_ACTIVOS.includes(t.estado) },
    { clave: 'ABIERTO', texto: 'Abiertos', fn: (t) => t.estado === 'ABIERTO' },
    { clave: 'EN_PROCESO', texto: 'En proceso', fn: (t) => t.estado === 'EN_PROCESO' },
    { clave: 'BLOQUEADO', texto: 'Bloqueados', tono: 'rojo', fn: (t) => t.estado === 'BLOQUEADO' },
    { clave: 'todos', texto: 'Todos', fn: () => true },
  ];

  const DEFECTOS = { estado: 'CERRADO', orden: 'recientes', cantidad: '15' };
  const FILTROS = ['loc', 'sis', 'cri', 'atiende', 'desde', 'hasta'];
  const FECHA = /^\d{4}-\d{2}-\d{2}$/;

  // Día local a instante: desde las 00:00 del primer día hasta las 00:00 del día siguiente al último.
  function inicioDelDia(fecha, diasMas) {
    const d = new Date(fecha + 'T00:00:00');
    d.setDate(d.getDate() + (diasMas || 0));
    return d.toISOString();
  }

  App.vistas.tickets = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const C = App.comun;
    const u = ctx.usuario;
    const esCliente = u.rol === 'CLIENTE';
    const loc = esCliente ? S.nombre('localidades', u.localidadId) : null;
    const q = Object.assign({}, DEFECTOS, ctx.query);
    if (!ESTADOS_FILTRO.some((e) => e.clave === q.estado)) q.estado = DEFECTOS.estado;
    if (!C.ORDENES[q.orden]) q.orden = DEFECTOS.orden;
    if (!TAMANOS_PAGINA.includes(q.cantidad)) q.cantidad = DEFECTOS.cantidad;
    ['desde', 'hasta'].forEach((k) => { if (q[k] && !FECHA.test(q[k])) q[k] = ''; });

    // ---- controles ----
    const inBuscar = h('input', { id: 'f-buscar', class: 'control', type: 'search', placeholder: 'Buscar por número o texto', 'aria-label': 'Buscar tickets', value: q.q || '' });
    const opcionesAtiende = [{ valor: 'sin', texto: 'Sin asignar' }];
    if (App.store.esOrmen(u)) opcionesAtiende.push({ valor: u.id, texto: 'Yo (' + u.nombre + ')' });
    S.operadores().filter((o) => o.id !== u.id).forEach((o) => opcionesAtiende.push({ valor: o.id, texto: o.nombre + (o.activo === false ? ' (usuario inactivo)' : '') }));

    const controles = {
      loc: !esCliente && ui.select({ id: 'f-loc', vacio: 'Todas', valor: q.loc, opciones: S.localidades().map((l) => ({ valor: l.id, texto: l.nombre })) }),
      sis: ui.select({ id: 'f-sis', vacio: 'Todos', valor: q.sis, opciones: S.sistemas().map((s) => ({ valor: s.id, texto: s.nombre })) }),
      cri: ui.select({ id: 'f-cri', vacio: 'Todas', valor: q.cri, opciones: S.catalogo('criticidades').map((c) => ({ valor: c.id, texto: c.nombre })) }),
      atiende: !esCliente && ui.select({ id: 'f-atiende', vacio: 'Cualquiera', valor: q.atiende, opciones: opcionesAtiende }),
      desde: h('input', { id: 'f-desde', class: 'control', type: 'date', value: q.desde || '' }),
      hasta: h('input', { id: 'f-hasta', class: 'control', type: 'date', value: q.hasta || '' }),
      orden: ui.select({ id: 'f-orden', valor: q.orden, opciones: Object.keys(C.ORDENES).map((k) => ({ valor: k, texto: C.ORDENES[k].texto })) }),
      cantidad: ui.select({ id: 'f-cantidad', valor: q.cantidad, opciones: TAMANOS_PAGINA.map((n) => ({ valor: n, texto: n })) }),
    };
    const ETIQUETAS = {
      loc: 'Localidad', sis: 'Sistema', cri: 'Criticidad', atiende: 'Atiende',
      desde: 'Creado desde', hasta: 'Creado hasta', orden: 'Orden', cantidad: 'Tickets por página',
    };

    // Filtros secundarios: se despliegan con el botón "Filtros".
    const filtros = h('div', { class: 'filtros filtros-grilla', id: 'panel-filtros', role: 'search', 'aria-label': 'Filtros de tickets' },
      Object.keys(controles).filter((k) => controles[k]).map((k) => ui.campo({ nombre: k, id: controles[k].id, etiqueta: ETIQUETAS[k], control: controles[k] })));
    const hayFiltros = () => FILTROS.some((k) => q[k] && controles[k]);
    filtros.hidden = !hayFiltros();
    const cuentaFiltros = h('span', { class: 'contador' });
    const btnFiltros = h('button', { type: 'button', class: 'btn btn-neutro', 'aria-controls': 'panel-filtros', 'aria-expanded': String(!filtros.hidden), onClick: () => {
      filtros.hidden = !filtros.hidden;
      btnFiltros.setAttribute('aria-expanded', String(!filtros.hidden));
    } }, ui.icono('filtro', 'i-sm'), 'Filtros', cuentaFiltros);
    const barraLista = h('div', { class: 'barra-lista' },
      h('div', { class: 'buscar-lista' }, ui.icono('buscar'), inBuscar),
      btnFiltros);

    const chips = h('div', { class: 'cola-pestanas', role: 'group', 'aria-label': 'Estado' });
    const activos = h('div', { class: 'filtros-activos' });
    const resultados = h('div', { 'aria-live': 'polite' });

    // ---- consulta a la Api ----
    // La Api aplica la visibilidad (RNF2): un cliente solo recibe los tickets de su localidad.
    function params(conEstado) {
      const p = new URLSearchParams();
      if (conEstado) p.set('estado', q.estado);
      if (q.q) p.set('texto', q.q);
      if (q.sis) p.set('sistema', q.sis);
      if (q.cri) p.set('criticidad', q.cri);
      if (q.desde) p.set('desde', inicioDelDia(q.desde));
      if (q.hasta) p.set('hasta', inicioDelDia(q.hasta, 1));
      if (!esCliente) {
        if (q.loc) p.set('localidadId', q.loc.replace(/^loc-/, ''));
        if (q.atiende) p.set('atiende', q.atiende.replace(/^u-/, ''));
      }
      return p;
    }

    function sincronizar() {
      const limpio = {};
      Object.keys(q).forEach((k) => { if (q[k] && q[k] !== DEFECTOS[k] && !(k === 'p' && Number(q[k]) <= 1)) limpio[k] = q[k]; });
      App.router.actualizarQuery(limpio);
    }

    function cambiar(k, v) {
      q[k] = v || '';
      if (k !== 'p') q.p = '';
      sincronizar();
      pintar();
    }

    let conteos = {};
    let secuencia = 0;

    function pintarChips() {
      U.vaciar(chips);
      ESTADOS_FILTRO.forEach((e) => {
        chips.append(h('button', { type: 'button', 'aria-pressed': String(q.estado === e.clave), dataset: { tono: e.tono || null }, onClick: () => cambiar('estado', e.clave) },
          h('span', null, e.texto), h('span', { class: 'cuenta' }, U.formatoNumero(conteos[e.clave] || 0))));
      });
    }

    function pintarActivos() {
      const nFiltros = FILTROS.filter((k) => q[k] && controles[k]).length;
      cuentaFiltros.textContent = nFiltros || '';
      cuentaFiltros.hidden = !nFiltros;
      U.vaciar(activos);
      activos.hidden = !nFiltros && !q.q;
      const quitables = [];
      if (q.q) quitables.push(['q', 'Búsqueda: «' + q.q + '»']);
      FILTROS.forEach((k) => {
        if (!q[k] || !controles[k]) return;
        const opt = controles[k].options && Array.from(controles[k].options).find((o) => o.value === q[k]);
        quitables.push([k, ETIQUETAS[k] + ': ' + (opt ? opt.textContent : q[k].split('-').reverse().join('/'))]);
      });
      quitables.forEach(([k, texto]) => activos.append(h('span', { class: 'chip-activo' }, texto,
        h('button', { type: 'button', 'aria-label': 'Quitar filtro ' + texto, onClick: () => { if (k === 'q') inBuscar.value = ''; else controles[k].value = ''; cambiar(k, ''); } }, ui.icono('x', 'i-sm')))));
      if (quitables.length > 1) {
        activos.append(h('button', { type: 'button', class: 'enlace-boton chico', onClick: () => {
          inBuscar.value = '';
          FILTROS.forEach((k) => { if (controles[k]) controles[k].value = ''; q[k] = ''; });
          cambiar('q', '');
        } }, 'Limpiar filtros'));
      }
    }

    function pintarResultados(pagina) {
      U.vaciar(resultados);
      const lista = pagina.items.map((x) => S.ticketDesdeApi(Object.assign({ descripcion: '' }, x)));
      if (!lista.length) {
        resultados.append(ui.vacio({
          icono: 'buscar',
          titulo: conteos.todos || hayFiltros() || q.q ? 'No hay tickets con estos filtros' : 'Todavía no hay tickets',
        }));
        return;
      }
      const cols = esCliente
        ? ['numero', 'ticket', 'creador', 'estado', 'criticidad', 'duracion', 'actualizado']
        : ['numero', 'ticket', 'localidad', 'estado', 'criticidad', 'atiende', 'duracion', 'actualizado'];
      resultados.append(
        C.tablaTickets(lista, cols, { caption: 'Tickets' }),
        ui.paginador({ total: pagina.total, pagina: pagina.pagina, porPagina: pagina.porPagina, alCambiar: (p) => { cambiar('p', String(p)); document.getElementById('titulo-pagina').scrollIntoView({ block: 'start' }); } }));
    }

    async function pintar() {
      const mia = ++secuencia;
      pintarChips();
      pintarActivos();
      if (q.desde && q.hasta && q.desde > q.hasta) {
        secuencia++;
        conteos = {};
        pintarChips();
        U.vaciar(resultados);
        resultados.append(ui.vacio({ icono: 'buscar', titulo: 'La fecha desde no puede ser posterior a la fecha hasta' }));
        return;
      }
      const listado = params(true);
      listado.set('orden', q.orden);
      listado.set('pagina', String(Math.max(1, Number(q.p) || 1)));
      listado.set('porPagina', q.cantidad);
      try {
        const token = App.auth.token();
        const [resumen, pagina] = await Promise.all([
          App.api.get('/api/tickets/resumen?' + params(false), token),
          App.api.get('/api/tickets/listado?' + listado, token),
        ]);
        if (mia !== secuencia) return; // llegó una respuesta más nueva
        conteos = resumen;
        pintarChips();
        pintarResultados(pagina);
      } catch (e) {
        if (mia !== secuencia) return;
        U.vaciar(resultados);
        resultados.append(ui.vacio({ icono: 'buscar', titulo: 'No se pudieron cargar los tickets. ' + (e.message || '') }));
      }
    }

    inBuscar.addEventListener('input', U.debounce(() => cambiar('q', inBuscar.value.trim()), 220));
    Object.keys(controles).forEach((k) => { if (controles[k]) controles[k].addEventListener('change', () => cambiar(k, controles[k].value)); });
    pintar();

    ctx.titulo(esCliente ? 'Tickets de ' + loc : 'Tickets');
    return h('div', { class: 'pila' },
      ui.cabecera({
        titulo: esCliente ? 'Tickets de ' + loc : 'Tickets',
      }),
      h('section', { class: 'cola', 'aria-label': 'Listado de tickets' },
        h('div', { class: 'cola-cabeza' }, chips, barraLista),
        filtros,
        activos,
        resultados));
  };
})(window.App = window.App || {});
