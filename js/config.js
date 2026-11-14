/* Configuración por entorno. */
(function (App) {
  'use strict';

  const local = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);

  App.config = {
    // Vacío: la Api se sirve desde el mismo origen que el frontend.
    apiUrl: local ? 'http://localhost:5277' : '',
  };
})(window.App = window.App || {});
