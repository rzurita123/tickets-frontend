
import { useState } from 'react';
import { apiRequest } from '../services/api';
import logoOrmen from '../assets/logo-ormen.png';
import esferaOrmen from '../assets/esfera-ormen.svg';

function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!usuario.trim() || !contrasena) {
      setError('Ingresá tu usuario y contraseña.');
      return;
    }

    setCargando(true);

    try {
      const respuesta = await apiRequest('/api/auth/ingresar', {
        method: 'POST',
        body: JSON.stringify({
          usuario: usuario.trim().toLowerCase(),
          contrasena,
        }),
      });

      sessionStorage.setItem('token', respuesta.token);
      sessionStorage.setItem('usuario', JSON.stringify(respuesta.usuario));

      onLogin(respuesta.usuario);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="login">
      <section className="login-panel" aria-label="ORMEN">
        <div className="marca">
          <img
            className="marca-logo"
            src={logoOrmen}
            alt="ORMEN"
          />
        </div>

        <h1>
          Mesa de ayuda
          <span>Sistema de tickets</span>
        </h1>

        <img
          className="login-esfera"
          src={esferaOrmen}
          alt=""
          aria-hidden="true"
        />
      </section>

      <section className="login-contenido">
        <h2>Ingresar</h2>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <div className="login-campo">
            <label htmlFor="usuario">Usuario</label>
            <input
              id="usuario"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck="false"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
            />
          </div>

          <div className="login-campo">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              id="contrasena"
              type="password"
              autoComplete="current-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
          </div>

          <button type="submit" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;
