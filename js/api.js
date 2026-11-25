/* Sesión y consultas del frontend servido por ASP.NET Core. */
(function (App) {
  'use strict';

  const activa = location.protocol !== 'file:';
  const clave = 'ormen-tickets:token';
  const tiposActividad = {
    Creacion: 'creado', Comentario: 'comentario', Asignacion: 'asignado',
    Liberacion: 'liberado', Elevacion: 'elevado', Bloqueo: 'bloqueo',
    Desbloqueo: 'desbloqueo', ModificacionDatos: 'datos', Cierre: 'cierre',
    Reapertura: 'reapertura', Privacidad: 'privacidad',
  };

  let usuario = null;
  let tokenSesion = null;

  async function consultar(ruta, token, datos, metodo = datos ? 'POST' : 'GET') {
    const headers = {};
    if (token) headers.Authorization = 'Bearer ' + token;
    if (datos) headers['Content-Type'] = 'application/json';
    const respuesta = await fetch(ruta, { method: metodo, headers, body: datos ? JSON.stringify(datos) : undefined });
    if (!respuesta.ok) {
      const problema = await respuesta.json().catch(() => null);
      const error = new Error(problema?.title || 'La API respondió con HTTP ' + respuesta.status + '.');
      error.estado = respuesta.status;
      throw error;
    }
    return respuesta.status === 204 ? null : respuesta.json();
  }

  const adaptarUsuario = (u) => ({
    ...u, id: u.usuario, localidadId: u.localidadId == null ? null : String(u.localidadId),
  });

  function adaptarTicket(t) {
    return {
      ...t, id: String(t.id),
      localidadId: t.localidadId == null ? null : String(t.localidadId),
      sistemaId: t.sistema, subsistemaId: t.subsistema, criticidadId: t.criticidad,
      tipoProblemaId: t.tipoProblema, creadoPorId: t.creadoPor, operadorId: t.operador,
      solucion: t.solucion && { ...t.solucion, autorId: t.solucion.autor },
      actividad: t.actividad.map((a) => ({
        ...a, tipo: tiposActividad[a.tipo] || a.tipo, autorId: a.autor, operadorId: a.operador,
        visibilidad: a.privada ? 'PRIVADO' : 'PUBLICO', privado: a.privada,
        estado: a.a, desdeBorrador: a.detalle === 'borrador', registroDirecto: a.detalle === 'directo',
      })),
    };
  }

  async function cargar(token, actual) {
    const [tickets, localidades, catalogos, usuarios] = await Promise.all([
      consultar('/api/tickets', token),
      consultar('/api/localidades', token),
      consultar('/api/catalogos', token),
      consultar('/api/usuarios', token),
    ]);
    const colecciones = Object.fromEntries(Object.entries(catalogos).map(([nombre, items]) => [
      nombre, items.map((item) => ({ ...item, id: item.codigo, sistemaId: item.sistema })),
    ]));
    App.store.cargarDesdeApi({
      ...colecciones,
      usuarios: usuarios.map(adaptarUsuario),
      localidades: localidades.map((l) => ({ ...l, id: String(l.id) })),
      tickets: tickets.map(adaptarTicket),
    });
    usuario = adaptarUsuario(actual);
    tokenSesion = token;
  }

  async function ingresar(nombreUsuario, contrasena) {
    const login = nombreUsuario.trim();
    const errores = {};
    if (!login) errores.usuario = 'Escribí tu usuario.';
    if (!contrasena) errores.contrasena = 'Escribí la contraseña.';
    if (Object.keys(errores).length) return { ok: false, errores };
    const sesion = await consultar('/api/auth/ingresar', null, { usuario: login, contrasena });
    await cargar(sesion.token, sesion.usuario);
    try { sessionStorage.setItem(clave, sesion.token); } catch { /* La sesión sigue activa en esta página. */ }
    return { ok: true, usuario };
  }

  function salir() {
    usuario = null;
    tokenSesion = null;
    App.store.cargarDesdeApi();
    try { sessionStorage.removeItem(clave); } catch { /* El navegador bloquea el almacenamiento. */ }
  }

  async function restaurar() {
    let token;
    try { token = sessionStorage.getItem(clave); } catch { return; }
    if (token) await cargar(token, await consultar('/api/auth/yo', token));
  }

  async function guardarTicket(ruta, datos, metodo, idDescartado) {
    const token = tokenSesion;
    let respuesta;
    try {
      respuesta = await consultar('/api/tickets' + ruta, token, datos, metodo);
    } catch (error) {
      if (error.estado === 401 && token === tokenSesion) {
        salir();
        App.router.descartarCambios();
        App.router.ir('/ingresar?volver=' + encodeURIComponent(location.hash.slice(1)), { reemplazar: true });
        App.ui.toast('Tu sesión venció. Volvé a ingresar.', { tipo: 'aviso' });
      }
      throw error;
    }
    if (token !== tokenSesion) throw new Error('La sesión cambió. Volvé a cargar los tickets.');

    const ticket = respuesta && adaptarTicket(respuesta);
    const tickets = App.store.datos.tickets;
    const indice = tickets.findIndex((t) => t.id === (ticket?.id ?? idDescartado));
    if (indice >= 0) tickets.splice(indice, 1, ...(ticket ? [ticket] : []));
    else if (ticket) tickets.push(ticket);
    return ticket;
  }

  const clasificacion = (d) => ({
    sistema: d.sistemaId || null, subsistema: d.subsistemaId || null,
    criticidad: d.criticidadId || null, tipoProblema: d.tipoProblemaId || null,
  });

  const datosTicket = (d) => ({
    ...clasificacion(d), localidadId: d.localidadId ? Number(d.localidadId) : null,
    titulo: d.titulo, descripcion: d.descripcion, adjuntos: d.adjuntos,
  });

  const accion = (id, ruta, datos = {}, metodo = 'POST') => guardarTicket('/' + id + '/' + ruta, datos, metodo);

  if (activa) Object.assign(App.store, {
    crearTicket: (d, _usuario, opciones) => guardarTicket('', {
      ...datosTicket(d), ...opciones, registroDirecto: !!opciones.registroDirecto,
      borradorId: opciones.borradorId == null ? null : Number(opciones.borradorId),
    }),
    guardarBorrador: (d, _usuario, id) => id == null
      ? guardarTicket('/borradores', datosTicket(d))
      : guardarTicket('/borradores/' + id, datosTicket(d), 'PUT'),
    descartarBorrador: (id) => guardarTicket('/borradores/' + id, null, 'DELETE', id),
    comentar: (id, _usuario, d) => accion(id, 'comentarios', {
      texto: d.texto, privado: d.visibilidad === 'PRIVADO', adjuntos: d.adjuntos,
    }),
    asignar: (id, _usuario, operador) => accion(id, 'asignar', { operador }),
    liberar: (id) => accion(id, 'liberar'),
    elevar: (id, _usuario, d) => {
      const [tipo, destino] = d.destino.split(':');
      return accion(id, 'elevar', {
        grupo: tipo === 'grupo' ? destino : null,
        usuario: tipo === 'usuario' ? destino : null, motivo: d.motivo,
      });
    },
    bloquear: (id, _usuario, d) => accion(id, 'bloquear', { texto: d.texto, privado: d.visibilidad === 'PRIVADO' }),
    desbloquear: (id, _usuario, d) => accion(id, 'desbloquear', { texto: d.texto }),
    modificarClasificacion: (id, _usuario, d) => accion(id, 'clasificacion', clasificacion(d), 'PUT'),
    cerrar: (id, _usuario, d) => accion(id, 'cerrar', {
      texto: d.texto, mensajePublico: d.mensajePublico, tipoProblema: d.tipoProblemaId,
      solucionCatalogoId: d.solucionCatalogoId, adjuntos: d.adjuntos,
    }),
    reabrir: (id, _usuario, d) => accion(id, 'reabrir', { texto: d.motivo }),
    cambiarPrivado: (id, _usuario, privado) => accion(id, 'privado', { privado }, 'PUT'),
  });

  App.api = { activa, ingresar, salir, restaurar, usuarioActual: () => usuario };
})(window.App = window.App || {});
