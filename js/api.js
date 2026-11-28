/* Cliente de la Api. */
(function (App) {
  'use strict';

  class ErrorApi extends Error {
    constructor(mensaje, status, campos) {
      super(mensaje);
      this.status = status;
      this.campos = campos || null;
    }
  }

  /** Errores por campo de la Api: { campo: [mensaje] } → { campo: mensaje }. */
  function campos(datos) {
    if (!datos || !datos.errors) return null;
    const res = {};
    for (const [k, v] of Object.entries(datos.errors)) res[k] = Array.isArray(v) ? v[0] : String(v);
    return Object.keys(res).length ? res : null;
  }

  async function pedir(metodo, ruta, cuerpo, token) {
    const headers = {};
    if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;
    let res;
    try {
      res = await fetch(App.config.apiUrl + ruta, {
        method: metodo,
        headers,
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      });
    } catch {
      throw new ErrorApi('No se pudo conectar con el servidor.', 0);
    }
    const datos = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw new ErrorApi((datos && datos.title) || 'El servidor respondió con un error.', res.status, campos(datos));
    return datos;
  }

  App.api = {
    ErrorApi,
    get: (ruta, token) => pedir('GET', ruta, undefined, token),
    post: (ruta, cuerpo, token) => pedir('POST', ruta, cuerpo, token),
    put: (ruta, cuerpo, token) => pedir('PUT', ruta, cuerpo, token),
    del: (ruta, token) => pedir('DELETE', ruta, undefined, token),
  };
})(window.App = window.App || {});
