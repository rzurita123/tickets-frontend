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

  function fechaLocal(iso) {
    const fecha = new Date(iso);
    return [fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate()]
      .map((parte) => String(parte).padStart(2, '0')).join('-');
  }

  App.vistas.tickets = function (ctx) {
    const S = App.store;
    const ui = App.ui;
    const C = App.comun;
    const u = ctx.usuario;
    const esCliente = u.rol === 'CLIENTE';
    const loc = esCliente ? S.nombre('localidades', u.localidadId) : null;
    const todos = S.ticketsVisibles(u);
    const q = Object.assign({}, DEFECTOS, ctx.query);
    if (!ESTADOS_FILTRO.some((e) => e.clave === q.estado)) q.estado = DEFECTOS.estado;
    if (!Object.hasOwn(C.ORDENES, q.orden)) q.orden = DEFECTOS.orden;
    if (!TAMANOS_PAGINA.includes(q.cantidad)) q.cantidad = DEFECTOS.cantidad;
    const fechasCreacion = new Map(todos.map((t) => [t.id, fechaLocal(t.creadoEn)]));

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
      desde: h('input', { id: 'f-desde', type: 'date', class: 'control', value: q.desde || '' }),
      hasta: h('input', { id: 'f-hasta', type: 'date', class: 'control', value: q.hasta || '' }),
      orden: ui.select({ id: 'f-orden', valor: q.orden, opciones: Object.keys(C.ORDENES).map((k) => ({ valor: k, texto: C.ORDENES[k].texto })) }),
      cantidad: ui.select({ id: 'f-cantidad', valor: q.cantidad, opciones: TAMANOS_PAGINA.map((valor) => ({ valor, texto: valor })) }),
    };
    q.desde = controles.desde.value;
    q.hasta = controles.hasta.value;
    const ETIQUETAS = {
      loc: 'Localidad', sis: 'Sistema', cri: 'Criticidad', atiende: 'Atiende',
      desde: 'Creado desde', hasta: 'Creado hasta', orden: 'Orden', cantidad: 'Tickets por página',
    };

    // Filtros secundarios: se despliegan con el botón "Filtros".
    const filtros = h('div', { class: 'filtros filtros-grilla', id: 'panel-filtros', role: 'search', 'aria-label': 'Filtros de tickets' },
      Object.keys(controles).filter((k) => controles[k]).map((k) => ui.campo({ nombre: k, id: controles[k].id, etiqueta: ETIQUETAS[k], control: controles[k] })));
    filtros.hidden = !FILTROS.some((k) => q[k] && controles[k]) && q.orden === DEFECTOS.orden && q.cantidad === DEFECTOS.cantidad;
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

    // ---- filtrado ----
    function coincideTexto(t, texto) {
      const n = texto.replace(/^#/, '').trim();
      if (/^\d+$/.test(n)) return String(t.numero).indexOf(n) === 0;
      const norm = U.normalizar(n);
      return U.normalizar(t.titulo + ' ' + t.descripcion).indexOf(norm) >= 0;
    }

    function filtrar(sinEstado) {
      const est = ESTADOS_FILTRO.find((e) => e.clave === q.estado);
      return todos.filter((t) =>
        (sinEstado || est.fn(t)) &&
        (!q.q || coincideTexto(t, q.q)) &&
        (!q.loc || t.localidadId === q.loc) &&
        (!q.sis || t.sistemaId === q.sis) &&
        (!q.cri || t.criticidadId === q.cri) &&
        (!q.desde || fechasCreacion.get(t.id) >= q.desde) &&
        (!q.hasta || fechasCreacion.get(t.id) <= q.hasta) &&
        (!q.atiende || (q.atiende === 'sin' ? !t.operadorId : t.operadorId === q.atiende)));
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

    function pintar() {
      // chips de estado con cantidades
      const base = filtrar(true);
      U.vaciar(chips);
      ESTADOS_FILTRO.forEach((e) => {
        const n = base.filter(e.fn).length;
        chips.append(h('button', { type: 'button', 'aria-pressed': String(q.estado === e.clave), dataset: { tono: e.tono || null }, onClick: () => cambiar('estado', e.clave) },
          h('span', null, e.texto), h('span', { class: 'cuenta' }, U.formatoNumero(n))));
      });

      // filtros activos
      const nFiltros = FILTROS.filter((k) => q[k] && controles[k]).length;
      cuentaFiltros.textContent = nFiltros || '';
      cuentaFiltros.hidden = !nFiltros;
      U.vaciar(activos);
      activos.hidden = !nFiltros && !q.q;
      const quitables = [];
      if (q.q) quitables.push(['q', 'Búsqueda: «' + q.q + '»']);
      FILTROS.forEach((k) => {
        if (!q[k] || !controles[k]) return;
        const opt = controles[k].selectedOptions?.[0];
        const texto = opt ? opt.textContent : q[k].split('-').reverse().join('/');
        quitables.push([k, ETIQUETAS[k] + ': ' + texto]);
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

      // resultados
      U.vaciar(resultados);
      if (q.desde && q.hasta && q.desde > q.hasta) {
        resultados.append(ui.aviso('La fecha desde debe ser anterior o igual a la fecha hasta.', 'rojo'));
        return;
      }
      const ordenar = C.ORDENES[q.orden].fn;
      const lista = filtrar(false).sort((a, b) => ordenar(a, b) || a.numero - b.numero);
      const porPagina = Number(q.cantidad);
      const paginas = Math.max(1, Math.ceil(lista.length / porPagina));
      const solicitada = Number(q.p);
      const pagina = Number.isInteger(solicitada) ? Math.min(Math.max(1, solicitada), paginas) : 1;
      const pag = lista.slice((pagina - 1) * porPagina, pagina * porPagina);
      if (!lista.length) {
        resultados.append(ui.vacio({
          icono: 'buscar',
          titulo: todos.length ? 'No hay tickets con estos filtros' : 'Todavía no hay tickets',
        }));
        return;
      }
      const cols = esCliente
        ? ['numero', 'ticket', 'creador', 'estado', 'criticidad', 'creado', 'duracion', 'actualizado']
        : ['numero', 'ticket', 'localidad', 'estado', 'criticidad', 'atiende', 'creado', 'duracion', 'actualizado'];
      resultados.append(
        C.tablaTickets(pag, cols, { caption: 'Tickets' }),
        ui.paginador({ total: lista.length, pagina, porPagina, alCambiar: (p) => { cambiar('p', String(p)); document.getElementById('titulo-pagina').scrollIntoView({ block: 'start' }); } }));
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
