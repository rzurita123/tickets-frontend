
import { useState } from 'react';
import Login from './pages/Login';
import Inicio from './pages/Inicio';
import Header from './components/Header';

function App() {
  const [usuario, setUsuario] = useState(() => {
    const guardado = sessionStorage.getItem('usuario');
    return guardado ? JSON.parse(guardado) : null;
  });

  function cerrarSesion() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('usuario');
    setUsuario(null);
  }

  if (!usuario) {
    return <Login onLogin={setUsuario} />;
  }

  return (
    <>
      <Header usuario={usuario} onLogout={cerrarSesion} />
      <Inicio />
    </>
  );
}

export default App;
