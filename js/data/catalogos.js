/* Pesos de la sugerencia de soluciones. */
(function (App) {
  'use strict';

  const parametros = {
    pesoSistema: 3,
    pesoSubsistema: 2,
    pesoPalabraClave: 2,
    pesoLocalidad: 1,
    pesoPalabraComun: 1,
    maxResultados: 6,
  };

  App.catalogos = { parametros };
})(window.App = window.App || {});
