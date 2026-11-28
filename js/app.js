/* Arranque: rutas y sincronización entre pestañas. */
(function (App) {
  'use strict';

  const R = App.router;
  const V = App.vistas;
  const ORMEN = ['OPERADOR', 'ADMINISTRADOR'];
  const TODOS = ['OPERADOR', 'ADMINISTRADOR', 'CLIENTE'];

  // Las rutas fijas van antes que las que tienen parámetros.
  R.registrar('/ingresar', { vista: V.login, titulo: 'Ingresar', publica: true, sinMarco: true, soloSinSesion: true });
  R.registrar('/', { vista: V.inicio, titulo: 'Inicio' });

  R.registrar('/tickets', { vista: V.tickets, titulo: 'Tickets' });
  R.registrar('/tickets/nuevo', { vista: V.ticketNuevo, titulo: 'Crear ticket', roles: ['OPERADOR', 'CLIENTE', 'ADMINISTRADOR'] });
  R.registrar('/tickets/:numero', { vista: V.ticketDetalle, titulo: 'Ticket' });

  R.registrar('/borradores', { vista: V.borradores, titulo: 'Borradores', roles: TODOS });
  R.registrar('/borradores/:id', { vista: V.borrador, titulo: 'Borrador', roles: TODOS });

  R.registrar('/soluciones', { vista: V.soluciones, titulo: 'Soluciones reutilizables', roles: ORMEN });
  R.registrar('/soluciones/buscar', { vista: V.buscarSoluciones, titulo: 'Buscar una solución', roles: ORMEN });
  R.registrar('/soluciones/nueva', { vista: V.solucionForm, titulo: 'Nueva solución reutilizable', roles: ORMEN });
  R.registrar('/soluciones/:id', { vista: V.solucion, titulo: 'Solución reutilizable', roles: ORMEN });
  R.registrar('/soluciones/:id/editar', { vista: V.solucionForm, titulo: 'Editar solución', roles: ['ADMINISTRADOR'] });

  R.registrar('/estadisticas', { vista: V.estadisticas, titulo: 'Estadísticas', roles: ['ADMINISTRADOR', 'CLIENTE'] });

  // /admin/catalogos queda por los enlaces viejos.
  R.registrar('/catalogos', { vista: V.adminCatalogos, titulo: 'Catálogos', roles: ['ADMINISTRADOR'] });
  R.registrar('/admin/catalogos', { vista: V.adminCatalogos, titulo: 'Catálogos', roles: ['ADMINISTRADOR'] });
  R.registrar('/auditoria', { vista: V.auditoria, titulo: 'Auditoría', roles: ['ADMINISTRADOR'] });

  R.registrar('/buscar', { vista: V.buscar, titulo: 'Buscar' });
  R.registrar('/correos', { vista: V.correos, titulo: 'Correos simulados' });

  function hayModalAbierto() {
    return document.body.classList.contains('con-modal');
  }

  async function arrancar() {
    await App.auth.restaurar();

    // Otra pestaña cambió los datos: se redibuja.
    let avisoPendiente = null;
    App.store.alCambiar((info) => {
      if (info.aviso) App.ui.toast(info.aviso, { tipo: 'aviso', duracion: 10000 });
      if (!info.externo) return;
      if (R.estaSucio() || hayModalAbierto()) {
        if (avisoPendiente) avisoPendiente();
        avisoPendiente = App.ui.toast('Hubo cambios en los datos.', {
          tipo: 'aviso',
          accion: { texto: 'Actualizar', fn: () => { avisoPendiente = null; App.router.refrescar(); } },
          duracion: 12000,
        });
        return;
      }
      R.refrescar();
    });

    R.iniciar();

    // Trae los cambios de otros usuarios.
    setInterval(() => {
      if (App.auth.usuarioActual() && !document.hidden) App.store.actualizarTickets().catch(() => {});
    }, 30000);

  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})(window.App = window.App || {});
