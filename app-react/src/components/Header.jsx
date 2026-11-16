
import { useState } from 'react';
import logoOrmen from '../assets/logo-ormen.png';

function Header({ usuario, onLogout }) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const fecha = new Intl.DateTimeFormat('es-UY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const opcionesPorRol = {
    CLIENTE: ['Inicio', 'Estadísticas'],
    OPERADOR: ['Inicio', 'Tickets', 'Soluciones'],
    ADMINISTRADOR: [
      'Inicio',
      'Estadísticas',
      'Soluciones',
      'Tickets',
      'Auditoría',
    ],
  };

  const opciones = opcionesPorRol[usuario.rol] || ['Inicio'];

  return (
    <header className="barra">
      <div className="barra-interior">
        <a className="marca" href="#/">
          <img className="marca-logo" src={logoOrmen} alt="ORMEN" />
          <span className="marca-sep" />
          <span className="marca-sistema">Sistema de tickets</span>
        </a>

        <time className="fecha-header">{fecha}</time>

        <nav className="nav" aria-label="Principal">
          {opciones.map((opcion) => (
            <a key={opcion} href="#">
              {opcion}
            </a>
          ))}
        </nav>

        <div className="barra-acciones">
          <div className="desplegable">
            <button
              className="boton-usuario"
              type="button"
              onClick={() => setMenuAbierto(!menuAbierto)}
              aria-expanded={menuAbierto}
            >
              <span className="avatar">
                {usuario.nombre?.charAt(0).toUpperCase()}
              </span>

              <span className="datos">
                <span className="nombre">{usuario.nombre}</span>
                <span className="rol">{usuario.rol}</span>
              </span>

              <span>⌄</span>
            </button>

            {menuAbierto && (
              <div className="menu">
                <div className="menu-cabecera">
                  <strong>{usuario.nombre}</strong>
                  <div>{usuario.email}</div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMenuAbierto(false);
                    onLogout();
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
