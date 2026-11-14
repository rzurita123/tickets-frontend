/* Datos maestros de ejemplo. */
(function (App) {
  'use strict';

  const sistemas = [
    { id: 'sis-liquidacion', nombre: 'Liquidación' },
    { id: 'sis-caja', nombre: 'Caja' },
    { id: 'sis-control-terminales', nombre: 'Control Terminales' },
    { id: 'sis-online', nombre: 'On-Line' },
    { id: 'sis-envio-archivos', nombre: 'Envío Archivos' },
    { id: 'sis-correos', nombre: 'Correos Ormen' },
    { id: 'sis-correos-colectiviz', nombre: 'Correos Colectiviz.' },
    { id: 'sis-todos-terminales', nombre: 'Todos Terminales' },
    { id: 'sis-adm-usuarios', nombre: 'Adm. Usuarios' },
    { id: 'sis-instalaciones', nombre: 'Instalaciones' },
  ];

  // [id, sistemaId, nombre, ejemplo]
  const subsistemas = [
    ['sub-liq-diaria', 'sis-liquidacion', 'Liquidación diaria', true],
    ['sub-liq-premios', 'sis-liquidacion', 'Premios', true],
    ['sub-liq-reportes', 'sis-liquidacion', 'Reportes', true],
    ['sub-liq-otros', 'sis-liquidacion', 'Otros', false],
    ['sub-caja-apertura', 'sis-caja', 'Apertura', true],
    ['sub-caja-cierre', 'sis-caja', 'Cierre', true],
    ['sub-caja-movimientos', 'sis-caja', 'Movimientos', true],
    ['sub-caja-otros', 'sis-caja', 'Otros', false],
    ['sub-term-bloqueo', 'sis-control-terminales', 'Bloqueo', true],
    ['sub-term-sincro', 'sis-control-terminales', 'Sincronización', true],
    ['sub-term-alta', 'sis-control-terminales', 'Alta de terminal', true],
    ['sub-term-impresion', 'sis-control-terminales', 'Impresión', true],
    ['sub-term-otros', 'sis-control-terminales', 'Otros', false],
    ['sub-online-conexion', 'sis-online', 'Conexión', true],
    ['sub-online-jugadas', 'sis-online', 'Registro de jugadas', true],
    ['sub-online-otros', 'sis-online', 'Otros', false],
    ['sub-env-envio', 'sis-envio-archivos', 'Envío', true],
    ['sub-env-recepcion', 'sis-envio-archivos', 'Recepción', true],
    ['sub-env-otros', 'sis-envio-archivos', 'Otros', false],
    ['sub-correo-recepcion', 'sis-correos', 'Recepción', true],
    ['sub-correo-cuenta', 'sis-correos', 'Configuración de cuenta', true],
    ['sub-correo-otros', 'sis-correos', 'Otros', false],
    ['sub-colect-otros', 'sis-correos-colectiviz', 'Otros', false],
    ['sub-todos-otros', 'sis-todos-terminales', 'Otros', false],
    ['sub-usu-alta', 'sis-adm-usuarios', 'Alta de usuario', true],
    ['sub-usu-contrasena', 'sis-adm-usuarios', 'Contraseña', true],
    ['sub-usu-permisos', 'sis-adm-usuarios', 'Permisos', true],
    ['sub-usu-otros', 'sis-adm-usuarios', 'Otros', false],
    ['sub-inst-equipo', 'sis-instalaciones', 'Equipo nuevo', true],
    ['sub-inst-reinstalacion', 'sis-instalaciones', 'Reinstalación', true],
    ['sub-inst-otros', 'sis-instalaciones', 'Otros', false],
  ].map(([id, sistemaId, nombre, ejemplo]) => ({ id, sistemaId, nombre, ejemplo }));

  const tiposProblema = [
    { id: 'tp-nodef', nombre: 'No definido' },
    { id: 'tp-operacion', nombre: 'Operación' },
    { id: 'tp-software', nombre: 'Software' },
    { id: 'tp-equipamiento', nombre: 'Equipamiento' },
    { id: 'tp-configuracion', nombre: 'Configuración' },
  ];

  const criticidades = [
    { id: 'cri-alta', nombre: 'Alta', orden: 1, clase: 'cri-alta' },
    { id: 'cri-media', nombre: 'Media', orden: 2, clase: 'cri-media' },
    { id: 'cri-baja', nombre: 'Baja', orden: 3, clase: 'cri-baja' },
  ];

  /** Grupos a los que se puede elevar un ticket. */
  const gruposSoporte = [
    { id: 'gs-soporte-n2', nombre: 'Soporte técnico (2º nivel)' },
    { id: 'gs-infraestructura', nombre: 'Infraestructura y redes' },
    { id: 'gs-desarrollo', nombre: 'Desarrollo de sistemas' },
    { id: 'gs-proveedor-terminales', nombre: 'Proveedor de terminales' },
  ];

  /** Pesos provisorios de la sugerencia de soluciones. */
  const parametros = {
    pesoSistema: 3,
    pesoSubsistema: 2,
    pesoPalabraClave: 2,
    pesoLocalidad: 1,
    pesoPalabraComun: 1,
    maxResultados: 6,
  };

  App.catalogos = { sistemas, subsistemas, tiposProblema, criticidades, gruposSoporte, parametros };
})(window.App = window.App || {});
