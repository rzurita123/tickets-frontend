/* Catálogo inicial de soluciones. */
(function (App) {
  'use strict';

  const VERSION = 10;

  // ------------------------------------------------- Imágenes de ejemplo ---

  function svgDataUrl(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/\s{2,}/g, ' ').trim());
  }

  const IMG_PASOS = svgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="260" viewBox="0 0 720 260">
      <rect width="720" height="260" fill="#F7F9FB"/>
      <g font-family="Arial, Helvetica, sans-serif">
        <rect x="24" y="56" width="196" height="124" rx="12" fill="#FFFFFF" stroke="#C9D3DD"/>
        <circle cx="56" cy="90" r="17" fill="#1D78B4"/>
        <text x="56" y="96" text-anchor="middle" font-size="17" font-weight="bold" fill="#FFFFFF">1</text>
        <text x="40" y="138" font-size="17" fill="#1C3A5A">Apagar la</text>
        <text x="40" y="160" font-size="17" fill="#1C3A5A">terminal</text>
        <rect x="262" y="56" width="196" height="124" rx="12" fill="#FFFFFF" stroke="#C9D3DD"/>
        <circle cx="294" cy="90" r="17" fill="#1D78B4"/>
        <text x="294" y="96" text-anchor="middle" font-size="17" font-weight="bold" fill="#FFFFFF">2</text>
        <text x="278" y="138" font-size="17" fill="#1C3A5A">Retirar y volver</text>
        <text x="278" y="160" font-size="17" fill="#1C3A5A">a colocar el rollo</text>
        <rect x="500" y="56" width="196" height="124" rx="12" fill="#FFFFFF" stroke="#C9D3DD"/>
        <circle cx="532" cy="90" r="17" fill="#1D78B4"/>
        <text x="532" y="96" text-anchor="middle" font-size="17" font-weight="bold" fill="#FFFFFF">3</text>
        <text x="516" y="138" font-size="17" fill="#1C3A5A">Encender y hacer</text>
        <text x="516" y="160" font-size="17" fill="#1C3A5A">una prueba</text>
        <path d="M226 118h28M246 110l8 8-8 8M464 118h28M484 110l8 8-8 8" stroke="#D6B169" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="24" y="236" font-size="13" fill="#5F6E7C">Imagen de ejemplo (demo)</text>
      </g>
    </svg>`);

  // ------------------------------------------------ Catálogo de soluciones ---

  const CATALOGO = [
    {
      id: 'sol-liq-reprocesar', titulo: 'Reprocesar la liquidación diaria que no aparece',
      sistemaId: 'sis-liquidacion', subsistemaId: 'sub-liq-diaria',
      palabrasClave: ['liquidación', 'no aparece', 'no figura', 'liquidación del día'],
      descripcion: '1. Confirmar con la agencia la fecha de la liquidación que falta.\n2. Verificar en el sistema central si el proceso de liquidación terminó.\n3. Si no terminó o terminó con error, reprocesar la liquidación de esa fecha.\n4. Pedir a la agencia que vuelva a ingresar y confirme que la ve.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-liq-anulacion', titulo: 'Diferencia en la liquidación por anulación fuera de horario',
      sistemaId: 'sis-liquidacion', subsistemaId: 'sub-liq-diaria',
      palabrasClave: ['diferencia', 'no coincide', 'anulación', 'liquidación'],
      descripcion: 'Cuando una anulación se registra después del cierre, impacta en la liquidación del día siguiente.\n1. Pedir a la agencia la fecha y el importe de la diferencia.\n2. Buscar anulaciones registradas después del cierre de ese día.\n3. Mostrar al cliente en qué liquidación figura.',
      creadaPorId: 'u-scabrera', revisadaPorId: 'u-scabrera',
    },
    {
      id: 'sol-liq-premio', titulo: 'Premio pagado después del cierre',
      sistemaId: 'sis-liquidacion', subsistemaId: 'sub-liq-premios',
      palabrasClave: ['premio', 'pagado', 'no figura', 'descontado'],
      descripcion: 'Los premios pagados después del cierre figuran en la liquidación del día siguiente.\n1. Pedir fecha y hora del pago.\n2. Confirmar si fue posterior al cierre.\n3. Indicar al cliente en qué liquidación lo va a ver.',
      creadaPorId: 'u-nacosta', revisadaPorId: 'u-scabrera',
    },
    {
      id: 'sol-navegador', titulo: 'Borrar la caché del navegador',
      sistemaId: null, subsistemaId: null,
      palabrasClave: ['exportar', 'descargar', 'no carga', 'navegador', 'botón no responde', 'pantalla en blanco'],
      descripcion: 'Solución general: sirve cuando una pantalla no carga, un botón no responde o una descarga falla.\n1. Cerrar todas las ventanas del navegador.\n2. Borrar la caché y las cookies del último día.\n3. Volver a ingresar y repetir la operación.\n4. Si persiste, probar con otro navegador.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-caja-anterior', titulo: 'Caja del día anterior sin cerrar',
      sistemaId: 'sis-caja', subsistemaId: 'sub-caja-apertura',
      palabrasClave: ['abrir caja', 'apertura', 'caja anterior', 'sin cerrar'],
      descripcion: '1. Ingresar con el usuario encargado de la agencia.\n2. Verificar si quedó abierta la caja del día anterior.\n3. Hacer el cierre pendiente.\n4. Abrir la caja del día.',
      creadaPorId: 'u-scabrera', revisadaPorId: 'u-scabrera',
    },
    {
      id: 'sol-caja-duplicado', titulo: 'Movimiento duplicado en el cierre de caja',
      sistemaId: 'sis-caja', subsistemaId: 'sub-caja-cierre',
      palabrasClave: ['diferencia', 'cierre de caja', 'faltante', 'sobrante', 'duplicado'],
      descripcion: '1. Pedir a la agencia el importe de la diferencia.\n2. Revisar los movimientos del día buscando registros repetidos por ese importe.\n3. Anular el movimiento duplicado.\n4. Volver a hacer el cierre.',
      creadaPorId: 'u-vpereira', revisadaPorId: 'u-scabrera',
    },
    {
      id: 'sol-caja-anular', titulo: 'Anular y volver a ingresar un movimiento',
      sistemaId: 'sis-caja', subsistemaId: 'sub-caja-movimientos',
      palabrasClave: ['importe', 'movimiento', 'anular', 'corregir', 'equivocado'],
      descripcion: '1. Buscar el movimiento en el detalle del día.\n2. Anularlo indicando el motivo.\n3. Ingresarlo de nuevo con el importe correcto.',
      creadaPorId: 'u-scabrera', revisadaPorId: 'u-scabrera',
    },
    {
      id: 'sol-term-desbloqueo', titulo: 'Desbloquear una terminal por intentos fallidos',
      sistemaId: 'sis-control-terminales', subsistemaId: 'sub-term-bloqueo',
      palabrasClave: ['bloqueada', 'bloqueo', 'no permite vender', 'intentos'],
      descripcion: '1. Buscar la terminal en Control Terminales.\n2. Confirmar que el bloqueo es por intentos fallidos.\n3. Desbloquearla.\n4. Pedir a la agencia que ingrese con el usuario correcto.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-term-reinicio', titulo: 'Reiniciar la terminal y verificar la conexión',
      sistemaId: 'sis-control-terminales', subsistemaId: 'sub-term-sincro',
      palabrasClave: ['sincroniza', 'sincronización', 'desactualizada', 'reiniciar'],
      descripcion: '1. Apagar la terminal y esperar 30 segundos.\n2. Encenderla y verificar que tenga conexión.\n3. Forzar la sincronización.\n4. Si no sincroniza, revisar la conexión de la agencia.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-term-alta', titulo: 'Alta de una terminal nueva',
      sistemaId: 'sis-control-terminales', subsistemaId: 'sub-term-alta',
      palabrasClave: ['alta', 'terminal nueva', 'número de serie', 'habilitar'],
      descripcion: '1. Pedir el número de serie de la terminal.\n2. Registrarla en Control Terminales asociada a la agencia.\n3. Confirmar con la agencia la primera conexión.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-term-impresora', titulo: 'La impresora de la terminal no imprime',
      sistemaId: 'sis-control-terminales', subsistemaId: 'sub-term-impresion',
      palabrasClave: ['impresora', 'no imprime', 'imprime en blanco', 'papel', 'rollo', 'comprobante'],
      descripcion: '1. Apagar la terminal.\n2. Retirar el rollo y volver a colocarlo con el lado térmico hacia el cabezal.\n3. Encender la terminal y hacer una impresión de prueba.\n4. Si imprime en blanco, el rollo está colocado al revés.',
      creadaPorId: 'u-vpereira', revisadaPorId: 'u-scabrera', imagen: true,
    },
    {
      id: 'sol-online-router', titulo: 'Sin conexión: reiniciar el router de la agencia',
      sistemaId: 'sis-online', subsistemaId: 'sub-online-conexion',
      palabrasClave: ['sin conexión', 'conexión', 'internet', 'router', 'no conecta'],
      descripcion: '1. Confirmar si el problema ocurre en todas las terminales.\n2. Pedir a la agencia que apague el router, espere un minuto y lo vuelva a encender.\n3. Verificar la conexión con On-Line.\n4. Si sigue sin conexión, la agencia debe contactar a su proveedor de internet.',
      creadaPorId: 'u-nacosta', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-env-tamano', titulo: 'El archivo de cierre supera el tamaño permitido',
      sistemaId: 'sis-envio-archivos', subsistemaId: 'sub-env-envio',
      palabrasClave: ['archivo', 'envío', 'error de envío', 'tamaño'],
      descripcion: '1. Revisar si el archivo incluye días anteriores.\n2. Generarlo de nuevo sólo con el día actual.\n3. Enviarlo y confirmar la recepción.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-correo-spam', titulo: 'Los correos llegan a la carpeta de no deseado',
      sistemaId: 'sis-correos', subsistemaId: 'sub-correo-recepcion',
      palabrasClave: ['correo', 'no llegan', 'no deseado', 'spam', 'recibir'],
      descripcion: '1. Pedir a la agencia que revise la carpeta de correo no deseado.\n2. Marcar el remitente como seguro.\n3. Confirmar que el próximo correo llegue a la bandeja de entrada.',
      creadaPorId: 'u-vpereira', revisadaPorId: 'u-scabrera',
    },
    {
      id: 'sol-correo-config', titulo: 'Configurar la cuenta de correo en un equipo',
      sistemaId: 'sis-correos', subsistemaId: 'sub-correo-cuenta',
      palabrasClave: ['configurar', 'cuenta', 'correo', 'equipo nuevo'],
      descripcion: '1. Abrir el programa de correo del equipo.\n2. Agregar la cuenta con los datos de servidor de ORMEN.\n3. Enviar un correo de prueba y verificar la recepción.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-usu-desbloqueo', titulo: 'Desbloquear usuario y generar contraseña temporal',
      sistemaId: 'sis-adm-usuarios', subsistemaId: 'sub-usu-contrasena',
      palabrasClave: ['usuario bloqueado', 'contraseña', 'intentos', 'no puede ingresar'],
      descripcion: '1. Verificar la identidad del encargado de la agencia.\n2. Desbloquear el usuario.\n3. Generar una contraseña temporal.\n4. Indicar que la cambie en el primer ingreso.',
      creadaPorId: 'u-nacosta', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-usu-alta', titulo: 'Alta de usuario de agencia',
      sistemaId: 'sis-adm-usuarios', subsistemaId: 'sub-usu-alta',
      palabrasClave: ['alta', 'usuario nuevo', 'empleado', 'empleada'],
      descripcion: '1. Pedir nombre y documento de la persona al encargado.\n2. Crear el usuario con el perfil que corresponda.\n3. Enviar los datos de acceso al encargado.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
    {
      id: 'sol-inst-remota', titulo: 'Instalación del sistema por acceso remoto',
      sistemaId: 'sis-instalaciones', subsistemaId: 'sub-inst-equipo',
      palabrasClave: ['instalar', 'instalación', 'equipo nuevo', 'computadora', 'acceso remoto', 'formatear'],
      descripcion: '1. Coordinar el acceso remoto con la agencia.\n2. Instalar el sistema.\n3. Restaurar la configuración de la agencia.\n4. Verificar el ingreso con un usuario de la agencia.',
      creadaPorId: 'u-ralvarez', revisadaPorId: 'u-ralvarez',
    },
  ];

  function generar() {
    const { HORA, DIA } = App.util;
    const ahora = Date.now();
    const iso = (ms) => new Date(ms).toISOString();
    const soluciones = CATALOGO.map((c, i) => {
      const creadaMs = ahora - (300 - i * 2) * DIA;
      const revisadaMs = creadaMs + (c.creadaPorId === c.revisadaPorId ? 0 : 20 * HORA);
      return {
        id: c.id, titulo: c.titulo, descripcion: c.descripcion,
        sistemaId: c.sistemaId, subsistemaId: c.subsistemaId, palabrasClave: c.palabrasClave.slice(),
        estado: 'APROBADA', ticketOrigenId: null,
        creadaPorId: c.creadaPorId, creadaEn: iso(creadaMs),
        revisadaPorId: c.revisadaPorId, revisadaEn: iso(revisadaMs), motivoRechazo: null,
        actualizadaEn: iso(revisadaMs),
        adjuntos: c.imagen ? [{ id: 'img-' + c.id, nombre: 'pasos-impresora.png', dataUrl: IMG_PASOS, autorId: c.creadaPorId, fecha: iso(creadaMs) }] : [],
      };
    });
    return {
      version: VERSION,
      generadoEn: iso(ahora),
      soluciones,
      correos: [],
      auditoria: [],
      parametros: Object.assign({}, App.catalogos.parametros),
    };
  }

  App.semilla = { VERSION, generar };
})(window.App = window.App || {});
