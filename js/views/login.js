/* Ingreso con usuario y contraseña. */
(function (App) {
  'use strict';

  const U = App.util;
  const h = U.h;

  App.vistas.login = function (ctx) {
    const ui = App.ui;
    const volver = ctx.query.volver && ctx.query.volver.charAt(0) === '/' && ctx.query.volver.indexOf('/ingresar') !== 0 ? ctx.query.volver : '/';

    function entrar(resultado) {
      if (!resultado.ok) return false;
      ui.toast('Ingresaste como ' + resultado.usuario.nombre + '.');
      App.router.ir(volver, { reemplazar: true });
      return true;
    }

    // Panel de marca
    const panel = h('section', { class: 'login-panel', 'aria-label': 'ORMEN' },
      h('div', { class: 'marca' },
        h('img', { class: 'marca-logo', src: 'assets/logo-ormen.png', alt: 'ORMEN' })),
      h('h1', { id: 'titulo-pagina', tabindex: '-1' }, 'Mesa de ayuda', h('span', null, 'Sistema de tickets')),
      h('img', { class: 'login-esfera', src: 'assets/esfera-ormen.svg', alt: '', 'aria-hidden': 'true' }));

    // Formulario
    const errorGeneral = h('div', { role: 'alert' });
    const inUsuario = h('input', { id: 'login-usuario', class: 'control', type: 'text', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false' });
    const inClave = h('input', { id: 'login-clave', class: 'control', type: 'password', autocomplete: 'current-password' });
    const boton = h('button', { type: 'submit', class: 'btn btn-oscuro btn-lg' }, 'Ingresar');
    const form = h('form', { class: 'login-form', novalidate: true },
      errorGeneral,
      ui.campo({ nombre: 'usuario', id: 'login-usuario', etiqueta: 'Usuario', control: inUsuario }),
      ui.campo({ nombre: 'contrasena', id: 'login-clave', etiqueta: 'Contraseña', control: inClave }),
      boton);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      U.vaciar(errorGeneral);
      boton.disabled = true;
      const r = await App.auth.ingresar(inUsuario.value, inClave.value);
      boton.disabled = false;
      if (r.errores) { ui.mostrarErrores(form, r.errores); return; }
      ui.limpiarErrores(form);
      if (!r.ok) { errorGeneral.append(ui.aviso(r.mensaje, 'rojo')); inClave.select(); return; }
      entrar(r);
    });

    const contenido = h('section', { class: 'login-contenido', 'aria-labelledby': 'login-titulo' },
      h('h2', { id: 'login-titulo' }, 'Ingresar'),
      form);

    return h('div', { class: 'login' }, panel, contenido);
  };
})(window.App = window.App || {});
