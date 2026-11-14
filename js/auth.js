/* Sesión y permisos. */
(function (App) {
  'use strict';

  const CLAVE = 'ormen-tickets-demo:sesion';
  let memoria = null; // por si el navegador bloquea sessionStorage

  function guardarSesion(s) {
    memoria = s;
    try {
      if (s) sessionStorage.setItem(CLAVE, JSON.stringify(s));
      else sessionStorage.removeItem(CLAVE);
    } catch { /* queda en memoria */ }
  }

  function leerSesion() {
    try {
      const t = sessionStorage.getItem(CLAVE);
      if (t) return JSON.parse(t);
    } catch { /* usar memoria */ }
    return memoria;
  }

  function usuarioActual() {
    const s = leerSesion();
    if (!s || !s.token || new Date(s.expira) <= new Date()) return null;
    const u = App.store.usuario(s.usuarioId);
    if (!u || u.activo === false) return null;
    return u;
  }

  async function cargarUsuarios(tk) {
    const [usuarios, localidades, catalogos, tickets] = await Promise.all(['usuarios', 'localidades', 'catalogos', 'tickets'].map((r) => App.api.get('/api/' + r, tk)));
    App.store.cargar(usuarios, localidades, catalogos, tickets);
  }

  // Recupera la sesión al recargar la página.
  async function restaurar() {
    const s = leerSesion();
    if (!s) return;
    try {
      if (!s.token || new Date(s.expira) <= new Date()) throw new Error();
      await cargarUsuarios(s.token);
    } catch {
      guardarSesion(null);
    }
  }

  function token() {
    const s = leerSesion();
    return s ? s.token : null;
  }

  async function ingresar(nombreUsuario, contrasena) {
    const login = String(nombreUsuario || '').trim().toLowerCase();
    const errores = {};
    if (!login) errores.usuario = 'Escribí tu usuario.';
    if (!contrasena) errores.contrasena = 'Escribí la contraseña.';
    if (Object.keys(errores).length) return { ok: false, errores };
    let r;
    try {
      r = await App.api.post('/api/auth/ingresar', { usuario: login, contrasena });
    } catch (e) {
      return { ok: false, mensaje: e.status === 401 ? 'Usuario o contraseña incorrectos.' : e.message };
    }
    try {
      await cargarUsuarios(r.token);
    } catch (e) {
      return { ok: false, mensaje: e.message };
    }
    const u = App.store.usuario('u-' + r.usuario.usuario);
    guardarSesion({ usuarioId: u.id, token: r.token, expira: r.expira, inicio: new Date().toISOString() });
    App.store.registrarAuditoria(u.id, 'LOGIN', null, 'Usuario y contraseña');
    return { ok: true, usuario: u };
  }

  function salir() {
    const u = usuarioActual();
    if (u) App.store.registrarAuditoria(u.id, 'LOGOUT', null, '');
    guardarSesion(null);
    App.store.vaciar();
  }

  /** Permisos por rol. */
  const PERMISOS = {
    'tickets.crear': ['OPERADOR', 'CLIENTE', 'ADMINISTRADOR'],
    'tickets.tratar': ['OPERADOR', 'ADMINISTRADOR'],
    'tickets.comentar': ['OPERADOR', 'CLIENTE', 'ADMINISTRADOR'],
    'tickets.registrarResuelto': ['OPERADOR', 'ADMINISTRADOR'],
    borradores: ['OPERADOR', 'ADMINISTRADOR', 'CLIENTE'],
    'soluciones.ver': ['OPERADOR', 'ADMINISTRADOR'],
    'soluciones.proponer': ['OPERADOR'],
    favoritos: ['OPERADOR', 'ADMINISTRADOR'],
    'soluciones.gestionar': ['ADMINISTRADOR'],
    estadisticas: ['ADMINISTRADOR', 'CLIENTE'],
    administracion: ['ADMINISTRADOR'],
    auditoria: ['ADMINISTRADOR'],
  };

  function puede(permiso, u) {
    const usuario = u || usuarioActual();
    return !!usuario && (PERMISOS[permiso] || []).includes(usuario.rol);
  }

  App.auth = { usuarioActual, token, restaurar, ingresar, salir, puede, PERMISOS };
})(window.App = window.App || {});
