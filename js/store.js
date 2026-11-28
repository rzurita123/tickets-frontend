/* Almacén: datos de la Api y reglas de negocio. */
(function (App) {
  'use strict';

  const U = App.util;
  const D = App.dominio;

  const CLASES_CRITICIDAD = ['cri-alta', 'cri-media', 'cri-baja'];

  // Llegan de la Api y no se guardan.
  let listaUsuarios = [];
  let listaLocalidades = [];
  let listaTickets = [];
  let listaSoluciones = [];
  let listaFavoritos = [];
  let listaCorreos = [];
  let listaAuditoria = [];
  let parametros = {};
  let cat = sinCatalogos();

  function sinCatalogos() {
    return { sistemas: [], subsistemas: [], tiposProblema: [], criticidades: [], gruposSoporte: [] };
  }

  function itemDesdeApi(tipo, x) {
    const item = { id: x.codigo, nombre: x.nombre, activo: x.activo !== false };
    if (tipo === 'subsistemas') item.sistemaId = x.sistema;
    if (tipo === 'criticidades') item.clase = CLASES_CRITICIDAD.includes(x.codigo) ? x.codigo : '';
    return item;
  }
  const oyentes = new Set();

  class ErrorDemo extends Error {
    constructor(mensaje, campos) {
      super(mensaje);
      this.name = 'ErrorDemo';
      this.campos = campos || null;
    }
  }

  function exigir(condicion, mensaje) {
    if (!condicion) throw new ErrorDemo(mensaje);
  }

  function errorDeCampos(campos) {
    const n = Object.keys(campos).length;
    return new ErrorDemo(n === 1 ? 'Revisá el campo marcado.' : 'Revisá los ' + n + ' campos marcados.', campos);
  }

  function emitir(info) {
    for (const fn of oyentes) {
      try { fn(info); } catch (e) { console.error(e); }
    }
  }

  // Datos de la Api con ids locales.
  function cargar(usuariosApi, localidadesApi, catalogosApi, ticketsApi, extras) {
    const x = extras || {};
    cat = sinCatalogos();
    for (const tipo of Object.keys(cat)) cat[tipo] = catalogosApi[tipo].map((x) => itemDesdeApi(tipo, x));
    listaLocalidades = localidadesApi.map((l) => ({ id: 'loc-' + l.id, nombre: l.nombre, activa: l.activa !== false }));
    listaUsuarios = usuariosApi.map((u) => ({
      id: 'u-' + u.usuario, usuario: u.usuario, nombre: u.nombre, email: u.email, rol: u.rol,
      cargo: u.cargo || '', localidadId: u.localidadId ? 'loc-' + u.localidadId : null, activo: u.activo !== false,
    }));
    listaSoluciones = (x.soluciones || []).map(solucionDesdeApi);
    listaFavoritos = (x.favoritos || []).map(favoritoDesdeApi);
    listaCorreos = (x.notificaciones || []).map(correoDesdeApi);
    listaAuditoria = (x.auditoria || []).map(auditoriaDesdeApi);
    parametros = Object.assign({}, x.parametros);
    listaTickets = ticketsApi.map(ticketDesdeApi);
  }

  function vaciar() {
    listaUsuarios = [];
    listaLocalidades = [];
    listaTickets = [];
    listaSoluciones = [];
    listaFavoritos = [];
    listaCorreos = [];
    listaAuditoria = [];
    parametros = {};
    cat = sinCatalogos();
  }

  function alCambiar(fn) {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
  }

  // ---------------------------------------------------------- Consultas ---

  const porId = (lista, id) => (id ? lista.find((x) => x.id === id) || null : null);

  const usuario = (id) => porId(listaUsuarios, id);
  const localidad = (id) => porId(listaLocalidades, id);
  const sistema = (id) => porId(cat.sistemas, id);
  const subsistema = (id) => porId(cat.subsistemas, id);
  const tipoProblema = (id) => porId(cat.tiposProblema, id);
  const criticidad = (id) => porId(cat.criticidades, id);
  const solucion = (id) => porId(listaSoluciones, id);
  const ticket = (id) => porId(listaTickets, id);

  /** Nombre de un elemento de catálogo, o `siNo` si no existe. */
  function nombre(coleccion, id, siNo) {
    const lista = coleccion === 'localidades' ? listaLocalidades : coleccion === 'soluciones' ? listaSoluciones : cat[coleccion] || [];
    const x = porId(lista, id);
    if (x) return x.nombre != null ? x.nombre : x.titulo;
    return siNo === undefined ? '—' : siNo;
  }

  function nombreEstado(e) {
    return D.ESTADOS[e] ? D.ESTADOS[e].nombre : e;
  }

  /** Nombre con localidad o área entre paréntesis. */
  function etiquetaUsuario(u) {
    if (!u) return 'Usuario eliminado';
    if (u.rol === 'CLIENTE') return u.nombre + ' (' + nombre('localidades', u.localidadId, 'sin localidad') + ')';
    return u.nombre + ' (' + (u.rol === 'OPERADOR' ? 'Mesa de ayuda' : 'ORMEN') + ')';
  }

  function activos(lista, campo) {
    return lista.filter((x) => x[campo || 'activo'] !== false);
  }

  const orden = (a, b) => a.nombre.localeCompare(b.nombre, 'es');

  function usuarios(filtro) {
    let l = listaUsuarios.slice();
    if (filtro && filtro.rol) l = l.filter((u) => u.rol === filtro.rol);
    if (filtro && filtro.activo) l = l.filter((u) => u.activo !== false);
    return l.sort(orden);
  }
  /** Quienes atienden tickets: Mesa de ayuda y administradores. */
  function operadores(soloActivos) {
    return usuarios({ activo: !!soloActivos }).filter(esOrmen);
  }
  function localidades(soloActivas) {
    const l = soloActivas ? activos(listaLocalidades, 'activa') : listaLocalidades.slice();
    return l.sort(orden);
  }
  function sistemas(soloActivos) {
    return soloActivos ? activos(cat.sistemas) : cat.sistemas.slice();
  }
  function subsistemasDe(sistemaId, soloActivos) {
    const l = cat.subsistemas.filter((x) => x.sistemaId === sistemaId);
    return soloActivos ? activos(l) : l;
  }
  function catalogo(tipo, soloActivos) {
    const l = cat[tipo].slice();
    return soloActivos ? activos(l) : l;
  }

  // ------------------------------------------------------------ Tickets ---

  /** Visibilidad: el cliente ve su localidad; ORMEN, todo. */
  function puedeVerTicket(t, u) {
    if (!t || !u) return false;
    if (t.estado === 'BORRADOR') return t.creadoPorId === u.id;
    // Un ticket privado es sólo de ORMEN: la localidad no sabe que existe.
    if (u.rol === 'CLIENTE') return !t.privado && !!u.localidadId && t.localidadId === u.localidadId;
    return true;
  }

  function ticketsVisibles(u) {
    return listaTickets.filter((t) => t.estado !== 'BORRADOR' && puedeVerTicket(t, u));
  }

  function borradoresDe(u) {
    return listaTickets
      .filter((t) => t.estado === 'BORRADOR' && t.creadoPorId === u.id)
      .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn));
  }

  function ticketPorNumero(numero) {
    const n = Number(numero);
    if (!Number.isInteger(n)) return null;
    return listaTickets.find((t) => t.numero === n) || null;
  }

  /** Busca un ticket por número respetando la visibilidad. */
  function ticketParaUsuario(numero, u) {
    const t = ticketPorNumero(numero);
    if (!t || t.estado === 'BORRADOR') return { error: 'no-existe' };
    // A un cliente, un ticket privado le figura como inexistente.
    if (t.privado && u && u.rol === 'CLIENTE') return { error: 'no-existe' };
    if (!puedeVerTicket(t, u)) return { error: 'sin-acceso', ticket: t };
    return { ticket: t };
  }

  function borradorParaUsuario(id, u) {
    const t = ticket(id);
    if (!t || t.estado !== 'BORRADOR' || t.creadoPorId !== u.id) return null;
    return t;
  }

  /** Lo privado sólo lo ve ORMEN. */
  const EVENTOS_SIN_TEXTO_PARA_CLIENTE = ['reapertura', 'cierre', 'elevado', 'desbloqueo'];
  function actividadVisible(t, u) {
    if (u.rol !== 'CLIENTE') return t.actividad.slice();
    return t.actividad
      .filter((ev) => !(ev.tipo === 'comentario' && ev.visibilidad === 'PRIVADO') && ev.tipo !== 'propuesta' && ev.tipo !== 'privacidad')
      .map((ev) => (EVENTOS_SIN_TEXTO_PARA_CLIENTE.includes(ev.tipo) || (ev.tipo === 'bloqueo' && ev.visibilidad === 'PRIVADO') ? Object.assign({}, ev, { texto: null }) : ev));
  }

  /** Imágenes del ticket y de los comentarios que el usuario puede ver. */
  function imagenesVisibles(t, u) {
    const lista = t.adjuntos.map((a) => Object.assign({ origen: 'Descripción' }, a));
    for (const ev of actividadVisible(t, u)) {
      if (ev.tipo === 'comentario' && ev.adjuntos && ev.adjuntos.length) {
        for (const a of ev.adjuntos) lista.push(Object.assign({ origen: ev.visibilidad === 'PRIVADO' ? 'Comentario privado' : 'Comentario público' }, a));
      }
    }
    if (u.rol !== 'CLIENTE' && t.solucion && t.solucion.adjuntos) {
      for (const a of t.solucion.adjuntos) lista.push(Object.assign({ origen: 'Resolución' }, a));
    }
    return lista;
  }

  function esOrmen(u) {
    return !!u && (u.rol === 'OPERADOR' || u.rol === 'ADMINISTRADOR');
  }

  // ----------------------------------------------- Auditoría y correos ---

  /** Pantalla que el rol no tiene: queda en la auditoría de la Api. */
  function avisarAccesoDenegado(pantalla) {
    App.api.post('/api/auditoria/acceso-denegado', { pantalla }, App.auth.token()).catch(() => {});
  }

  function correosPara(u) {
    if (u.rol === 'CLIENTE') return listaCorreos.filter((c) => c.paraUsuarioId === u.id);
    return listaCorreos.slice();
  }

  const recientes = {};

  /** Vuelve a pedir una lista; si cambió, avisa a la pantalla. Como mucho cada 5 segundos. */
  async function refrescarLista(clave, ruta, mapear, asignar, actual) {
    if (recientes[clave] && Date.now() - recientes[clave] < 5000) return false;
    recientes[clave] = Date.now();
    const nueva = (await App.api.get(ruta, App.auth.token())).map(mapear);
    if (JSON.stringify(nueva) === JSON.stringify(actual())) return false;
    asignar(nueva);
    emitir({ externo: true });
    return true;
  }

  const actualizarCorreos = () => refrescarLista('correos', '/api/notificaciones', correoDesdeApi, (l) => { listaCorreos = l; }, () => listaCorreos);
  const actualizarAuditoria = () => refrescarLista('auditoria', '/api/auditoria?limite=4000', auditoriaDesdeApi, (l) => { listaAuditoria = l; }, () => listaAuditoria);

  // -------------------------------------------------------- Validación ---

  const limpio = (v) => String(v == null ? '' : v).trim();

  /** Campos obligatorios para crear un ticket (HU01 y HU02). */
  function validarTicket(datos, u, opciones) {
    const op = opciones || {};
    const e = {};
    const loc = u.rol === 'CLIENTE' ? u.localidadId : datos.localidadId;
    const l = localidad(loc);
    if (!loc || !l) e.localidadId = 'Elegí la localidad.';
    else if (l.activa === false) e.localidadId = 'Esa localidad está inactiva.';
    const s = sistema(datos.sistemaId);
    if (!s || s.activo === false) e.sistemaId = 'Elegí el sistema o servicio afectado.';
    else if (datos.subsistemaId) {
      // ORMEN: "Subsistema en caso de corresponder" (no es obligatorio).
      const sub = subsistema(datos.subsistemaId);
      if (!sub || sub.sistemaId !== s.id || sub.activo === false) e.subsistemaId = 'Ese subsistema no corresponde al sistema elegido.';
    }
    if (!criticidad(datos.criticidadId)) e.criticidadId = 'Elegí la criticidad.';
    if (!limpio(datos.titulo)) e.titulo = 'Escribí un título.';
    else if (limpio(datos.titulo).length > 120) e.titulo = 'El título puede tener hasta 120 caracteres.';
    if (!limpio(datos.descripcion)) e.descripcion = 'Describí el problema.';
    return e;
  }

  function normalizarPalabras(lista) {
    const vistas = new Set();
    const res = [];
    for (const p of lista || []) {
      const t = limpio(p).replace(/\s+/g, ' ');
      const k = U.normalizar(t);
      if (!k || vistas.has(k)) continue;
      vistas.add(k);
      res.push(t.toLowerCase());
    }
    return res;
  }

  function validarPropuesta(p) {
    const e = {};
    if (!limpio(p.titulo)) e.propuestaTitulo = 'Escribí un título para la solución reutilizable.';
    if (!normalizarPalabras(p.palabrasClave).length) e.propuestaPalabras = 'Agregá al menos una palabra clave.';
    return e;
  }

  function copiarAdjuntos(lista, autorId, fecha) {
    return (lista || []).map((a) => ({ id: a.id || U.uid('img'), nombre: a.nombre || 'imagen', dataUrl: a.dataUrl, autorId, fecha }));
  }

  function datosTicket(datos, u) {
    return {
      titulo: limpio(datos.titulo),
      descripcion: limpio(datos.descripcion),
      localidadId: u.rol === 'CLIENTE' ? u.localidadId : datos.localidadId,
      sistemaId: datos.sistemaId,
      subsistemaId: datos.subsistemaId || null,
      criticidadId: datos.criticidadId,
      tipoProblemaId: esOrmen(u) && datos.tipoProblemaId ? datos.tipoProblemaId : 'tp-nodef',
    };
  }

  /** Propone la resolución de un ticket cerrado; sin imágenes, la Api copia las de la resolución. */
  async function crearPropuesta(t, propuesta, solucionTexto, adjuntos) {
    const s = await pedirApi((tk) => App.api.post('/api/soluciones/propuestas', {
      ticketId: idApi(t.id), titulo: limpio(propuesta.titulo), descripcion: limpio(solucionTexto),
      palabrasClave: normalizarPalabras(propuesta.palabrasClave), adjuntos: adjuntos ? imagenes(adjuntos) : null,
    }, tk));
    const nueva = guardarSolucionLocal(s);
    t.actividad.push({ id: 'a-' + nueva.id, tipo: 'propuesta', fecha: nueva.creadaEn, autorId: nueva.creadaPorId, solucionId: nueva.id });
    return nueva;
  }

  // ------------------------------------------------- Tickets en la Api ---

  const TIPOS_EVENTO = {
    Creacion: 'creado', Comentario: 'comentario', Asignacion: 'asignado', Liberacion: 'liberado', Elevacion: 'elevado',
    Bloqueo: 'bloqueo', Desbloqueo: 'desbloqueo', ModificacionDatos: 'datos', Cierre: 'cierre', Reapertura: 'reapertura',
    Privacidad: 'privacidad',
  };

  const idUsuario = (nombre) => (nombre ? 'u-' + nombre : null);
  const nombreUsuario = (id) => (id ? String(id).slice(2) : null);
  const idApi = (id) => Number(String(id).slice(2));
  const fecha = (v) => (v ? new Date(v).toISOString() : null);

  function imagenDesdeApi(a) {
    return { id: a.id, nombre: a.nombre, dataUrl: a.dataUrl, autorId: idUsuario(a.autor), fecha: fecha(a.fecha) };
  }

  function destinoDesdeApi(d) {
    return d ? { tipo: d.tipo, id: d.tipo === 'usuario' ? idUsuario(d.id) : d.id } : null;
  }

  function eventoDesdeApi(a) {
    const tipo = TIPOS_EVENTO[a.tipo] || a.tipo;
    const ev = { id: 'a-' + a.id, tipo, fecha: fecha(a.fecha), autorId: idUsuario(a.autor), texto: a.texto || null };
    if (a.de) ev.de = a.de;
    if (a.a) ev.a = a.a;
    if (a.operador) ev.operadorId = idUsuario(a.operador);
    if (a.destino) ev.destino = destinoDesdeApi(a.destino);
    if (tipo === 'comentario' || tipo === 'bloqueo') ev.visibilidad = a.privada ? 'PRIVADO' : 'PUBLICO';
    if (tipo === 'comentario') ev.adjuntos = (a.adjuntos || []).map(imagenDesdeApi);
    if (tipo === 'creado') Object.assign(ev, { estado: a.a || 'ABIERTO', desdeBorrador: a.detalle === 'borrador' });
    if (tipo === 'cierre') ev.registroDirecto = a.detalle === 'directo';
    if (tipo === 'privacidad') ev.privado = !!a.privada;
    if (tipo === 'datos') {
      try { ev.cambios = JSON.parse(a.detalle) || []; } catch { ev.cambios = []; }
    }
    return ev;
  }

  function solucionDesdeApi(x) {
    return {
      id: x.codigo, titulo: x.titulo, descripcion: x.descripcion,
      sistemaId: x.sistema || null, subsistemaId: x.subsistema || null, palabrasClave: x.palabrasClave || [],
      estado: x.estado, ticketOrigenId: x.ticketOrigenId ? 't-' + x.ticketOrigenId : null,
      creadaPorId: idUsuario(x.creadaPor), creadaEn: fecha(x.creadaEn),
      revisadaPorId: idUsuario(x.revisadaPor), revisadaEn: fecha(x.revisadaEn), motivoRechazo: x.motivoRechazo || null,
      actualizadaEn: fecha(x.actualizadaEn), adjuntos: (x.adjuntos || []).map(imagenDesdeApi), usos: x.usos || 0,
    };
  }

  function favoritoDesdeApi(x) {
    return { tipo: x.tipo, id: x.tipo === 'ticket' ? 't-' + x.ticketId : x.solucion, fecha: fecha(x.fecha) };
  }

  function correoDesdeApi(x) {
    return {
      id: 'mail-' + x.id, fecha: fecha(x.fecha), ticketId: x.ticketId ? 't-' + x.ticketId : null,
      paraUsuarioId: idUsuario(x.para), para: x.destino, asunto: x.asunto, cuerpo: x.cuerpo,
    };
  }

  function auditoriaDesdeApi(x) {
    return {
      id: 'aud-' + x.id, fecha: fecha(x.fecha), usuarioId: idUsuario(x.usuario), operacion: x.operacion,
      ticketId: x.ticketId ? 't-' + x.ticketId : null, detalle: x.detalle || '',
    };
  }

  function ticketDesdeApi(x) {
    const vacio = x.estado === 'BORRADOR' ? '' : null;
    const t = {
      id: 't-' + x.id, numero: x.numero, estado: x.estado, titulo: x.titulo, descripcion: x.descripcion,
      privado: !!x.privado, registroDirecto: !!x.registroDirecto,
      localidadId: x.localidadId ? 'loc-' + x.localidadId : vacio,
      sistemaId: x.sistema || vacio, subsistemaId: x.subsistema || vacio, criticidadId: x.criticidad || vacio,
      tipoProblemaId: x.tipoProblema || 'tp-nodef',
      creadoPorId: idUsuario(x.creadoPor), operadorId: idUsuario(x.operador), elevadoA: destinoDesdeApi(x.elevadoA),
      creadoEn: fecha(x.creadoEn), actualizadoEn: fecha(x.actualizadoEn), cerradoEn: fecha(x.cerradoEn),
      adjuntos: (x.adjuntos || []).map(imagenDesdeApi),
      solucion: x.solucion ? {
        texto: x.solucion.texto, enDescripcion: !!x.solucion.enDescripcion, solucionCatalogoId: x.solucion.solucionCatalogoId || null,
        autorId: idUsuario(x.solucion.autor), fecha: fecha(x.solucion.fecha), adjuntos: (x.solucion.adjuntos || []).map(imagenDesdeApi),
      } : null,
      actividad: (x.actividad || []).map(eventoDesdeApi),
    };
    for (const s of listaSoluciones) {
      if (s.ticketOrigenId === t.id) t.actividad.push({ id: 'a-' + s.id, tipo: 'propuesta', fecha: s.creadaEn, autorId: s.creadaPorId, solucionId: s.id });
    }
    t.actividad.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return t;
  }

  function guardarLocal(x) {
    const t = ticketDesdeApi(x);
    const i = listaTickets.findIndex((y) => y.id === t.id);
    if (i >= 0) listaTickets[i] = t;
    else listaTickets.push(t);
    return t;
  }

  /** Pedido a la Api; los errores por campo quedan marcados en el formulario. */
  async function pedirApi(fn) {
    try {
      return await fn(App.auth.token());
    } catch (e) {
      if (e instanceof ErrorDemo) throw e;
      throw new ErrorDemo(e.message, e.campos);
    }
  }

  function pedirTicket(metodo, ruta, cuerpo) {
    return pedirApi((tk) => (metodo === 'del' ? App.api.del('/api/tickets' + ruta, tk) : App.api[metodo]('/api/tickets' + ruta, cuerpo || {}, tk)));
  }

  /** Avisa a la pantalla que cambiaron los datos. */
  function asentar() {
    emitir({ externo: false });
  }

  /** Vuelve a pedir los tickets; devuelve si hubo cambios. */
  async function actualizarTickets() {
    const lista = await App.api.get('/api/tickets', App.auth.token());
    const firma = (l) => l.map((t) => t.id + ':' + t.actualizadoEn + ':' + t.estado).sort().join('|');
    const nuevos = lista.map(ticketDesdeApi);
    if (firma(nuevos) === firma(listaTickets)) return false;
    listaTickets = nuevos;
    emitir({ externo: true });
    return true;
  }

  const imagenes = (lista) => (lista || []).map((a) => ({ id: a.id || U.uid('img'), nombre: a.nombre || 'imagen', dataUrl: a.dataUrl }));

  function cuerpoTicket(datos) {
    return {
      titulo: limpio(datos.titulo), descripcion: limpio(datos.descripcion),
      localidadId: datos.localidadId ? Number(String(datos.localidadId).slice(4)) : null,
      sistema: datos.sistemaId || null, subsistema: datos.subsistemaId || null, criticidad: datos.criticidadId || null,
      tipoProblema: datos.tipoProblemaId || null, adjuntos: imagenes(datos.adjuntos),
    };
  }

  // ---------------------------------------------------- Alta de tickets ---

  /** Crea un ticket, abierto o ya cerrado. */
  async function crearTicket(datos, u, opciones) {
    const op = opciones || {};
    exigir(u && ['OPERADOR', 'CLIENTE', 'ADMINISTRADOR'].includes(u.rol), 'Tu rol no puede crear tickets.');
    exigir(!op.proponer || u.rol !== 'CLIENTE', 'Sólo ORMEN puede proponer soluciones reutilizables.');
    exigir(!op.registroDirecto || u.rol !== 'CLIENTE', 'El ticket de un cliente siempre queda Abierto.');
    exigir(!op.privado || u.rol !== 'CLIENTE', 'Sólo ORMEN puede crear tickets privados.');
    let errores = validarTicket(datos, u, op);
    if (op.registroDirecto && op.proponer) errores = Object.assign(errores, validarPropuesta(op.proponer));
    if (op.solucionCatalogoId) {
      const s = solucion(op.solucionCatalogoId);
      if (!s || s.estado !== 'APROBADA') errores.solucionTexto = 'La solución reutilizable elegida ya no está aprobada.';
    }
    if (Object.keys(errores).length) throw errorDeCampos(errores);
    if (op.borradorId) exigir(borradorParaUsuario(op.borradorId, u), 'El borrador ya no existe.');

    const t = guardarLocal(await pedirTicket('post', '', Object.assign(cuerpoTicket(datos), {
      borradorId: op.borradorId ? idApi(op.borradorId) : null,
      registroDirecto: !!op.registroDirecto,
      privado: !!op.privado,
      solucionTexto: limpio(op.solucionTexto),
      solucionCatalogoId: op.solucionCatalogoId || null,
      solucionAdjuntos: imagenes(op.solucionAdjuntos),
    })));
    if (op.registroDirecto && op.proponer) await crearPropuesta(t, op.proponer, t.solucion.texto, null);
    asentar();
    return t;
  }

  // ------------------------------------------------------- Borradores ---

  async function guardarBorrador(datos, u, id) {
    exigir(u && ['OPERADOR', 'CLIENTE', 'ADMINISTRADOR'].includes(u.rol), 'Tu rol no puede guardar borradores.');
    const tieneAlgo = ['titulo', 'descripcion', 'localidadId', 'sistemaId'].some((k) => limpio(datos[k])) || (datos.adjuntos && datos.adjuntos.length);
    if (!tieneAlgo) throw errorDeCampos({ descripcion: 'Para guardar un borrador escribí algo (por ejemplo, una nota en la descripción).' });
    exigir(!id || borradorParaUsuario(id, u), 'El borrador ya no existe.');
    const cuerpo = cuerpoTicket(Object.assign({}, datos, { localidadId: u.rol === 'CLIENTE' ? u.localidadId : datos.localidadId }));
    const b = guardarLocal(id
      ? await pedirTicket('put', '/borradores/' + idApi(id), cuerpo)
      : await pedirTicket('post', '/borradores', cuerpo));
    asentar();
    return b;
  }

  async function descartarBorrador(id, u) {
    const b = borradorParaUsuario(id, u);
    exigir(b, 'El borrador ya no existe.');
    await pedirTicket('del', '/borradores/' + idApi(id));
    listaTickets = listaTickets.filter((x) => x.id !== id);
    asentar();
    return true;
  }

  // ---------------------------------------------------- Tratamiento ---

  function ticketActivoParaOperador(ticketId, u) {
    const t = ticket(ticketId);
    exigir(t && t.estado !== 'BORRADOR', 'El ticket no existe.');
    exigir(esOrmen(u), 'Sólo ORMEN puede tratar tickets.');
    return t;
  }

  function evento(t, datos) {
    const ev = Object.assign({ id: U.uid('a'), fecha: U.isoAhora() }, datos);
    t.actividad.push(ev);
    return ev;
  }

  /** Envía la acción a la Api y deja el ticket actualizado. */
  async function accionTicket(t, ruta, cuerpo, metodo) {
    return guardarLocal(await pedirTicket(metodo || 'post', '/' + idApi(t.id) + '/' + ruta, cuerpo));
  }

  /** Comentario público o privado; también en tickets cerrados. */
  async function comentar(ticketId, u, datos) {
    const previo = ticket(ticketId);
    exigir(previo && previo.estado !== 'BORRADOR' && puedeVerTicket(previo, u), 'El ticket no existe o no tenés acceso.');
    const campos = {};
    const texto = limpio(datos.texto);
    if (!texto) campos.texto = 'Escribí el comentario.';
    const visibilidad = u.rol === 'CLIENTE' ? 'PUBLICO' : datos.visibilidad;
    if (visibilidad !== 'PUBLICO' && visibilidad !== 'PRIVADO') campos.visibilidad = 'Elegí si el comentario es público o privado.';
    if (Object.keys(campos).length) throw errorDeCampos(campos);
    const t = await accionTicket(previo, 'comentarios', { texto, privado: visibilidad === 'PRIVADO', adjuntos: imagenes(datos.adjuntos) });
    asentar();
    return t.actividad.filter((ev) => ev.tipo === 'comentario').pop();
  }

  /** Tomar o asignar: un ticket Abierto pasa a En proceso. */
  async function asignar(ticketId, u, operadorId) {
    const previo = ticketActivoParaOperador(ticketId, u);
    exigir(previo.estado !== 'CERRADO', 'El ticket está cerrado.');
    const op = usuario(operadorId);
    exigir(esOrmen(op) && op.activo !== false, 'Elegí una persona activa de ORMEN.');
    exigir(previo.operadorId !== operadorId, 'El ticket ya lo atiende ' + op.nombre + '.');
    const t = await accionTicket(previo, 'asignar', { operador: nombreUsuario(operadorId) });
    asentar();
    return t;
  }

  /** Devuelve el ticket a la cola: nadie lo atiende y vuelve a Abierto. */
  async function liberar(ticketId, u) {
    const previo = ticketActivoParaOperador(ticketId, u);
    exigir(previo.estado === 'EN_PROCESO', 'Sólo se puede devolver a la cola un ticket En proceso.');
    const t = await accionTicket(previo, 'liberar');
    asentar();
    return t;
  }

  /** Grupos de soporte y personas de Mesa de ayuda a las que se puede elevar. */
  function grupoSoporte(id) {
    return porId(cat.gruposSoporte, id);
  }

  function destinoDesdeClave(clave) {
    const [tipo, id] = String(clave || '').split(':');
    if (tipo === 'grupo' && grupoSoporte(id)) return { tipo, id };
    if (tipo === 'usuario' && usuario(id)) return { tipo, id };
    return null;
  }

  function nombreDestino(d) {
    if (!d) return '—';
    if (d.tipo === 'grupo') return nombre('gruposSoporte', d.id, 'Grupo eliminado');
    const x = usuario(d.id);
    return x ? x.nombre : 'Usuario eliminado';
  }

  const mismoDestino = (a, b) => !!a && !!b && a.tipo === b.tipo && a.id === b.id;

  /** Eleva el ticket a un grupo o a otra persona. */
  async function elevar(ticketId, u, datos) {
    const previo = ticketActivoParaOperador(ticketId, u);
    exigir(previo.estado !== 'ABIERTO', 'Primero tomá el ticket: sólo se eleva un ticket En proceso.');
    exigir(previo.estado !== 'BLOQUEADO', 'El ticket está bloqueado: desbloquealo antes de elevarlo.');
    exigir(previo.estado === 'EN_PROCESO', 'Sólo se eleva un ticket En proceso.');
    const destino = destinoDesdeClave(datos && datos.destino);
    const e = {};
    if (!destino) e.destino = 'Elegí a quién se eleva.';
    else if (destino.tipo === 'grupo' && grupoSoporte(destino.id).activo === false) e.destino = 'Ese grupo está inactivo.';
    else if (destino.tipo === 'usuario') {
      const p = usuario(destino.id);
      if (!esOrmen(p) || p.activo === false) e.destino = 'Elegí una persona activa de ORMEN.';
      else if (p.id === previo.operadorId) e.destino = 'Ya lo atiende ' + p.nombre + '.';
    }
    if (!e.destino && mismoDestino(destino, previo.elevadoA)) e.destino = 'El ticket ya está elevado a ' + nombreDestino(destino) + '.';
    const motivo = limpio(datos && datos.motivo);
    if (!motivo) e.motivo = 'Escribí por qué se eleva.';
    if (Object.keys(e).length) throw errorDeCampos(e);
    const t = await accionTicket(previo, 'elevar', destino.tipo === 'grupo' ? { grupo: destino.id, motivo } : { usuario: nombreUsuario(destino.id), motivo });
    asentar();
    return t;
  }

  /** Bloqueado: detenido por un factor externo. El motivo es obligatorio. */
  async function bloquear(ticketId, u, datos) {
    const previo = ticketActivoParaOperador(ticketId, u);
    exigir(previo.estado !== 'ABIERTO', 'Primero tomá el ticket: sólo se bloquea un ticket En proceso.');
    exigir(previo.estado === 'EN_PROCESO', 'El ticket ya está bloqueado.');
    const texto = limpio(datos && datos.texto);
    const e = {};
    if (!texto) e.texto = 'Escribí qué factor externo lo detiene.';
    if (datos.visibilidad !== 'PUBLICO' && datos.visibilidad !== 'PRIVADO') e.visibilidad = 'Elegí si el motivo es público o privado.';
    if (Object.keys(e).length) throw errorDeCampos(e);
    const t = await accionTicket(previo, 'bloquear', { texto, privado: datos.visibilidad === 'PRIVADO' });
    asentar();
    return t;
  }

  async function desbloquear(ticketId, u, datos) {
    const previo = ticketActivoParaOperador(ticketId, u);
    exigir(previo.estado === 'BLOQUEADO', 'El ticket no está bloqueado.');
    const texto = limpio(datos && datos.texto);
    const t = await accionTicket(previo, 'desbloquear', { texto });
    asentar();
    return t;
  }

  const CAMPOS_CLASIFICACION = [
    ['sistemaId', 'Sistema', 'sistemas'],
    ['subsistemaId', 'Subsistema', 'subsistemas'],
    ['criticidadId', 'Criticidad', 'criticidades'],
    ['tipoProblemaId', 'Tipo de problema', 'tiposProblema'],
  ];

  /** Reclasificación del ticket. */
  async function modificarClasificacion(ticketId, u, datos) {
    const previo = ticketActivoParaOperador(ticketId, u);
    exigir(previo.estado !== 'CERRADO', 'El ticket está cerrado: reabrilo para modificarlo.');
    const e = {};
    const s = sistema(datos.sistemaId);
    if (!s) e.sistemaId = 'Elegí el sistema o servicio afectado.';
    else if (datos.subsistemaId) {
      const sub = subsistema(datos.subsistemaId);
      if (!sub || sub.sistemaId !== s.id) e.subsistemaId = 'Ese subsistema no corresponde al sistema elegido.';
    }
    if (!criticidad(datos.criticidadId)) e.criticidadId = 'Elegí la criticidad.';
    if (!tipoProblema(datos.tipoProblemaId)) e.tipoProblemaId = 'Elegí el tipo de problema.';
    if (Object.keys(e).length) throw errorDeCampos(e);
    const cambios = [];
    for (const [campo, etiqueta, col] of CAMPOS_CLASIFICACION) {
      const nuevo = datos[campo] || null;
      if ((previo[campo] || null) !== nuevo) cambios.push({ campo, etiqueta, de: nombre(col, previo[campo], '—'), a: nombre(col, nuevo, '—') });
    }
    exigir(cambios.length, 'No hay cambios para guardar.');
    const t = await accionTicket(previo, 'clasificacion', {
      sistema: datos.sistemaId, subsistema: datos.subsistemaId || null, criticidad: datos.criticidadId, tipoProblema: datos.tipoProblemaId,
    }, 'put');
    asentar();
    return t;
  }

  /** Cierre con solución desde cualquier estado activo. */
  async function cerrar(ticketId, u, datos) {
    const previo = ticketActivoParaOperador(ticketId, u);
    exigir(previo.estado !== 'CERRADO', 'El ticket ya está cerrado.');
    let e = {};
    if (!limpio(datos.texto)) e.solucionTexto = 'Escribí la resolución.';
    if (datos.solucionCatalogoId) {
      const s = solucion(datos.solucionCatalogoId);
      if (!s || s.estado !== 'APROBADA') e.solucionTexto = 'La solución reutilizable elegida ya no está aprobada.';
    }
    if (datos.tipoProblemaId && !tipoProblema(datos.tipoProblemaId)) e.tipoProblemaId = 'Elegí el tipo de problema.';
    if (datos.proponer) e = Object.assign(e, validarPropuesta(datos.proponer));
    if (Object.keys(e).length) throw errorDeCampos(e);
    const mensaje = limpio(datos.mensajePublico);
    const t = await accionTicket(previo, 'cerrar', {
      texto: limpio(datos.texto), mensajePublico: mensaje, tipoProblema: datos.tipoProblemaId || null,
      solucionCatalogoId: datos.solucionCatalogoId || null, adjuntos: imagenes(datos.adjuntos),
    });
    const propuesta = datos.proponer ? await crearPropuesta(t, datos.proponer, datos.texto, null) : null;
    asentar();
    return { ticket: t, propuesta };
  }

  /** Reabrir: vuelve a En proceso y lo atiende quien lo reabre. */
  async function reabrir(ticketId, u, datos) {
    const previo = ticketActivoParaOperador(ticketId, u);
    exigir(previo.estado === 'CERRADO', 'Sólo se puede reabrir un ticket cerrado.');
    const motivo = limpio(datos && datos.motivo);
    const t = await accionTicket(previo, 'reabrir', { texto: motivo });
    asentar();
    return t;
  }

  /** Recorrido del ticket, armado a partir de la actividad. */
  const COLA = { tipo: 'cola', id: 'cola' };

  function recorrido(t) {
    const pasos = [];
    let resp = COLA;
    let estado = 'ABIERTO';
    function paso(ev, motivo) {
      const ult = pasos[pasos.length - 1];
      if (ult && ult.estado === estado && ult.responsable.tipo === resp.tipo && ult.responsable.id === resp.id) return;
      if (ult) ult.hasta = ev.fecha;
      pasos.push({ responsable: resp, estado, desde: ev.fecha, hasta: null, motivo, autorId: ev.autorId, texto: ev.texto || null, visibilidad: ev.visibilidad || null });
    }
    const persona = (id) => (id ? { tipo: 'usuario', id } : COLA);
    for (const ev of t.actividad) {
      if (ev.tipo === 'creado') {
        estado = ev.estado || 'ABIERTO';
        resp = estado === 'ABIERTO' ? COLA : persona(ev.operadorId || ev.autorId);
        paso(ev, 'creado');
      } else if (ev.tipo === 'asignado') {
        resp = persona(ev.operadorId);
        if (ev.a) estado = ev.a;
        paso(ev, ev.operadorId === ev.autorId ? 'tomado' : 'asignado');
      } else if (ev.tipo === 'liberado') {
        resp = COLA; estado = 'ABIERTO'; paso(ev, 'liberado');
      } else if (ev.tipo === 'elevado') {
        resp = ev.destino; paso(ev, 'elevado');
      } else if (ev.tipo === 'bloqueo') {
        estado = 'BLOQUEADO'; paso(ev, 'bloqueo');
      } else if (ev.tipo === 'desbloqueo') {
        estado = 'EN_PROCESO'; paso(ev, 'desbloqueo');
      } else if (ev.tipo === 'cierre') {
        resp = persona(ev.autorId); estado = 'CERRADO'; paso(ev, ev.registroDirecto ? 'registroDirecto' : 'cierre');
      } else if (ev.tipo === 'reapertura') {
        resp = persona(ev.operadorId || ev.autorId); estado = 'EN_PROCESO'; paso(ev, 'reapertura');
      }
    }
    const ult = pasos[pasos.length - 1];
    if (ult && ult.estado === 'CERRADO') ult.hasta = ult.desde;
    return pasos;
  }

  /** Nombre de quien tiene el ticket en un paso del recorrido. */
  function nombreResponsable(r) {
    if (!r || r.tipo === 'cola') return 'Cola de Mesa de ayuda';
    return nombreDestino(r);
  }

  // ------------------------------------------- Del ticket a la solución ---

  /** Duración: de la creación al cierre, o hasta ahora. */
  const UMBRALES_DURACION = { atencion: U.DIA, critico: 3 * U.DIA };

  function duracionTicket(t) {
    const fin = t.estado === 'CERRADO' && t.cerradoEn ? new Date(t.cerradoEn).getTime() : Date.now();
    return Math.max(0, fin - new Date(t.creadoEn).getTime());
  }

  function nivelDuracion(t) {
    if (t.estado === 'CERRADO') return 'cerrado';
    const ms = duracionTicket(t);
    return ms >= UMBRALES_DURACION.critico ? 'critico' : ms >= UMBRALES_DURACION.atencion ? 'atencion' : 'ok';
  }

  /** Ticket privado: sólo lo ve ORMEN. */
  async function cambiarPrivado(ticketId, u, privado) {
    const previo = ticket(ticketId);
    exigir(previo && previo.estado !== 'BORRADOR', 'El ticket no existe.');
    exigir(esOrmen(u), 'Sólo ORMEN puede cambiar si un ticket es privado.');
    const creador = usuario(previo.creadoPorId);
    exigir(!creador || creador.rol !== 'CLIENTE', 'Este ticket lo creó la localidad: ya lo conocen, no se puede hacer privado.');
    exigir(!!previo.privado !== !!privado, privado ? 'El ticket ya es privado.' : 'El ticket ya es visible para la localidad.');
    const t = await accionTicket(previo, 'privado', { privado: !!privado }, 'put');
    asentar();
    return t;
  }

  /** Imágenes de la resolución. */
  function adjuntosSolucion(t) {
    if (!t || !t.solucion) return [];
    return t.solucion.enDescripcion ? t.adjuntos || [] : t.solucion.adjuntos || [];
  }

  /** Solución pendiente o aprobada que surgió del ticket. */
  function propuestaDeTicket(t) {
    return listaSoluciones.find((s) => s.ticketOrigenId === t.id && s.estado !== 'RECHAZADA') || null;
  }

  /** Solución aprobada que surgió del ticket (para el destacado). */
  function solucionOriginadaPor(t) {
    return listaSoluciones.find((s) => s.ticketOrigenId === t.id && s.estado === 'APROBADA') || null;
  }

  /** Propone la resolución de un ticket cerrado como solución. */
  async function proponerSolucion(ticketId, u, datos) {
    const t = ticket(ticketId);
    exigir(t && t.estado !== 'BORRADOR', 'El ticket no existe.');
    exigir(esOrmen(u), 'Sólo ORMEN puede proponer soluciones reutilizables.');
    exigir(t.estado === 'CERRADO' && t.solucion, 'Sólo la resolución de un ticket cerrado puede dar origen a una solución reutilizable.');
    const previa = propuestaDeTicket(t);
    exigir(!previa, previa && previa.estado === 'APROBADA' ? 'La resolución de este ticket ya dio origen a una solución reutilizable.' : 'La resolución de este ticket ya tiene una solución reutilizable por aprobar.');
    const e = validarPropuesta({ titulo: datos.titulo, palabrasClave: datos.palabrasClave });
    if (!limpio(datos.descripcion)) e.propuestaDescripcion = 'Escribí la solución (los pasos a seguir).';
    if (Object.keys(e).length) throw errorDeCampos(e);
    const propuesta = await crearPropuesta(t, datos, datos.descripcion, datos.adjuntos || null);
    asentar();
    return propuesta;
  }

  // ---------------------------------------------------------- Favoritos ---

  /** Favoritos personales de tickets y soluciones. */
  function favoritosPropios(u) {
    return u && esOrmen(u) ? listaFavoritos : [];
  }

  function esFavorito(u, tipo, id) {
    return favoritosPropios(u).some((f) => f.tipo === tipo && f.id === id);
  }

  /** Favoritos visibles, del más nuevo al más viejo. */
  function favoritosDe(u) {
    return favoritosPropios(u)
      .map((f) => Object.assign({}, f, { item: f.tipo === 'ticket' ? ticket(f.id) : solucion(f.id) }))
      .filter((f) => f.item && (f.tipo !== 'ticket' || (f.item.estado !== 'BORRADOR' && puedeVerTicket(f.item, u))))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  /** Agrega o quita un favorito; devuelve si quedó marcado. */
  async function alternarFavorito(u, tipo, id) {
    exigir(esOrmen(u), 'Los favoritos son de ORMEN.');
    exigir(tipo === 'ticket' || tipo === 'solucion', 'Sólo se marcan tickets o soluciones reutilizables.');
    exigir(tipo === 'ticket' ? ticket(id) : solucion(id), 'Ya no existe.');
    const marcar = !esFavorito(u, tipo, id);
    const ruta = '/api/favoritos/' + (tipo === 'ticket' ? 'tickets/' + idApi(id) : 'soluciones/' + encodeURIComponent(id));
    await pedirApi((tk) => (marcar ? App.api.put(ruta, {}, tk) : App.api.del(ruta, tk)));
    listaFavoritos = marcar
      ? listaFavoritos.concat({ tipo, id, fecha: U.isoAhora() })
      : listaFavoritos.filter((f) => !(f.tipo === tipo && f.id === id));
    asentar();
    return marcar;
  }

  // --------------------------------------------------------- Soluciones ---

  function guardarSolucionLocal(x) {
    const s = solucionDesdeApi(x);
    const i = listaSoluciones.findIndex((y) => y.id === s.id);
    if (i >= 0) listaSoluciones[i] = s;
    else listaSoluciones.push(s);
    return s;
  }

  function soluciones(filtro) {
    let l = listaSoluciones.slice();
    if (filtro && filtro.estado) l = l.filter((s) => s.estado === filtro.estado);
    return l;
  }

  function usosDeSolucion(id) {
    return listaTickets.filter((t) => t.estado === 'CERRADO' && t.solucion && t.solucion.solucionCatalogoId === id);
  }

  function contarUsos() {
    const m = new Map();
    for (const t of listaTickets) {
      if (t.estado === 'CERRADO' && t.solucion && t.solucion.solucionCatalogoId) {
        m.set(t.solucion.solucionCatalogoId, (m.get(t.solucion.solucionCatalogoId) || 0) + 1);
      }
    }
    return m;
  }

  function validarSolucion(datos) {
    const e = {};
    if (!limpio(datos.titulo)) e.titulo = 'Escribí un título.';
    if (!limpio(datos.descripcion)) e.descripcion = 'Escribí la solución (los pasos a seguir).';
    if (datos.sistemaId && !sistema(datos.sistemaId)) e.sistemaId = 'El sistema no existe.';
    if (datos.subsistemaId) {
      const sub = subsistema(datos.subsistemaId);
      if (!sub || sub.sistemaId !== datos.sistemaId) e.subsistemaId = 'El subsistema no corresponde al sistema elegido.';
    }
    if (!normalizarPalabras(datos.palabrasClave).length) e.palabrasClave = 'Agregá al menos una palabra clave.';
    return e;
  }

  const cuerpoSolucion = (datos) => ({
    titulo: limpio(datos.titulo), descripcion: limpio(datos.descripcion),
    sistema: datos.sistemaId || null, subsistema: datos.subsistemaId || null,
    palabrasClave: normalizarPalabras(datos.palabrasClave),
    adjuntos: imagenes(datos.adjuntos),
  });

  /** Alta o edición de una solución reutilizable. */
  async function guardarSolucion(datos, u, id) {
    exigir(esOrmen(u), 'Las soluciones reutilizables son para Mesa de ayuda y gestión de ORMEN.');
    const e = validarSolucion(datos);
    if (Object.keys(e).length) throw errorDeCampos(e);
    const existente = id ? solucion(id) : null;
    exigir(!id || existente, 'La solución no existe.');
    exigir(!existente || u.rol === 'ADMINISTRADOR', 'Sólo un administrador puede modificar soluciones reutilizables.');
    const s = guardarSolucionLocal(await pedirApi((tk) => (existente
      ? App.api.put('/api/soluciones/' + encodeURIComponent(id), cuerpoSolucion(datos), tk)
      : App.api.post('/api/soluciones', cuerpoSolucion(datos), tk))));
    asentar();
    return s;
  }

  async function revisarSolucion(id, u, aprobar, motivo, cambios) {
    exigir(u && u.rol === 'ADMINISTRADOR', 'Sólo un administrador puede aprobar o rechazar soluciones reutilizables.');
    const s = solucion(id);
    exigir(s, 'La solución no existe.');
    exigir(s.estado === 'PENDIENTE', 'La solución ya fue revisada.');
    if (!aprobar && !limpio(motivo)) throw errorDeCampos({ motivo: 'Escribí el motivo del rechazo.' });
    if (aprobar && cambios) {
      const e = validarSolucion(Object.assign({}, s, cambios));
      if (Object.keys(e).length) throw errorDeCampos(e);
    }
    const ruta = '/api/soluciones/' + encodeURIComponent(id) + (aprobar ? '/aprobar' : '/rechazar');
    const r = guardarSolucionLocal(await pedirApi((tk) => App.api.post(ruta, aprobar ? (cambios ? cuerpoSolucion(cambios) : undefined) : { motivo: limpio(motivo) }, tk)));
    asentar();
    return r;
  }

  const aprobarSolucion = (id, u, cambios) => revisarSolucion(id, u, true, null, cambios);
  const rechazarSolucion = (id, u, motivo) => revisarSolucion(id, u, false, motivo);

  // ------------------------------------------------------ Administración ---

  function exigirAdmin(u) {
    exigir(u && u.rol === 'ADMINISTRADOR', 'Sólo un administrador puede hacer este cambio.');
  }

  const NOMBRES_CATALOGO = {
    sistemas: 'Sistemas',
    subsistemas: 'Subsistemas',
    tiposProblema: 'Tipos de problema',
    criticidades: 'Criticidades',
    gruposSoporte: 'Grupos de soporte',
  };

  async function pedirCatalogo(fn) {
    try {
      return await fn(App.auth.token());
    } catch (e) {
      if (e.status === 400) throw errorDeCampos({ nombre: e.message });
      throw new ErrorDemo(e.message);
    }
  }

  async function guardarItemCatalogo(tipo, datos, admin, id) {
    exigirAdmin(admin);
    exigir(NOMBRES_CATALOGO[tipo], 'Catálogo desconocido.');
    const existente = id ? porId(cat[tipo], id) : null;
    exigir(!id || existente, 'El elemento no existe.');
    const n = limpio(datos.nombre);
    if (!n) throw errorDeCampos({ nombre: 'Escribí el nombre.' });
    const ruta = '/api/catalogos/' + tipo;
    const r = await pedirCatalogo((tk) => (existente
      ? App.api.put(ruta + '/' + encodeURIComponent(id), { nombre: n }, tk)
      : App.api.post(ruta, { nombre: n, sistema: datos.sistemaId || null }, tk)));
    const item = itemDesdeApi(tipo, r);
    if (existente) Object.assign(existente, item);
    else cat[tipo].push(item);
    return existente || item;
  }

  async function cambiarActivoItem(tipo, id, admin, activo) {
    exigirAdmin(admin);
    const item = porId(cat[tipo] || [], id);
    exigir(item, 'El elemento no existe.');
    await pedirCatalogo((tk) => App.api.put('/api/catalogos/' + tipo + '/' + encodeURIComponent(id), { activo: !!activo }, tk));
    item.activo = !!activo;
    return item;
  }

  const LIMITES_PARAMETROS = {
    pesoSistema: [0, 10], pesoSubsistema: [0, 10], pesoPalabraClave: [0, 10],
    pesoLocalidad: [0, 10], pesoPalabraComun: [0, 10], maxResultados: [1, 15],
  };

  async function guardarParametros(p, admin) {
    exigirAdmin(admin);
    const e = {};
    const nuevos = {};
    for (const k of Object.keys(LIMITES_PARAMETROS)) {
      const [min, max] = LIMITES_PARAMETROS[k];
      const v = Number(p[k]);
      if (!Number.isFinite(v) || v < min || v > max || Math.round(v) !== v) e[k] = 'Usá un número entero entre ' + min + ' y ' + max + '.';
      else nuevos[k] = v;
    }
    if (Object.keys(e).length) throw errorDeCampos(e);
    parametros = await pedirApi((tk) => App.api.put('/api/parametros', nuevos, tk));
    asentar();
    return parametros;
  }

  App.store = {
    ErrorDemo,
    cargar, vaciar, actualizarTickets, actualizarCorreos, actualizarAuditoria, alCambiar, avisarAccesoDenegado,
    get datos() { return { tickets: listaTickets, soluciones: listaSoluciones, parametros, auditoria: listaAuditoria, correos: listaCorreos }; },
    // consultas
    usuario, localidad, sistema, subsistema, tipoProblema, criticidad, solucion, ticket,
    nombre, nombreEstado, etiquetaUsuario, esOrmen,
    usuarios, operadores, localidades, sistemas, subsistemasDe, catalogo,
    puedeVerTicket, ticketsVisibles, borradoresDe, ticketPorNumero, ticketParaUsuario, borradorParaUsuario,
    actividadVisible, imagenesVisibles, correosPara,
    grupoSoporte, nombreDestino, recorrido, nombreResponsable,
    soluciones, usosDeSolucion, contarUsos, propuestaDeTicket, solucionOriginadaPor,
    esFavorito, favoritosDe, alternarFavorito, adjuntosSolucion, cambiarPrivado, duracionTicket, nivelDuracion, UMBRALES_DURACION,
    validarTicket, normalizarPalabras,
    // tickets
    ticketDesdeApi, crearTicket, guardarBorrador, descartarBorrador,
    comentar, asignar, liberar, elevar, bloquear, desbloquear, modificarClasificacion, cerrar, reabrir,
    // soluciones
    proponerSolucion, guardarSolucion, aprobarSolucion, rechazarSolucion,
    // administración
    guardarItemCatalogo, cambiarActivoItem, guardarParametros,
    LIMITES_PARAMETROS, NOMBRES_CATALOGO,
  };
})(window.App = window.App || {});
