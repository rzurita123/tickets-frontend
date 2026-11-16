/* Configuración por entorno. */
(function (App) {
  'use strict';

  const API_LOCAL = 'http://localhost:5277';
  // URL del App Service; vacía si la Api está en el mismo origen.
  const API_AZURE = '';

  const local = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);

  App.config = {
    apiUrl: (local ? API_LOCAL : API_AZURE).replace(/\/+$/, ''),
  };
})(window.App = window.App || {});
