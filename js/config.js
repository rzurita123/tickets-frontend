/* Configuración por entorno. */
(function (App) {
  'use strict';

  const API_LOCAL = 'http://localhost:5277';

  const local = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  // Vacía: la Api está en el mismo origen.
  const apiEntorno = (App.entorno && App.entorno.apiUrl) || '';

  App.config = {
    apiUrl: (local ? API_LOCAL : apiEntorno).replace(/\/+$/, ''),
  };
})(window.App = window.App || {});
