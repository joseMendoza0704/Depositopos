import React, { useState } from 'react';
import Login from './Pantallas/Login';
import Dashboard from './Pantallas/Dashboard';
import './App.css';

function App() {
  const [usuario, setUsuario] = useState(null);

  // Creamos la función para cerrar sesión
  const handleLogout = () => {
    setUsuario(null); // Simplemente limpiamos el estado del usuario
  };

  if (!usuario) {
    return <Login alIniciarSesion={setUsuario} />;
  }

  // Ahora le pasamos la función de logout al Dashboard
  return (
    <div className="App">
      <Dashboard usuario={usuario} alCerrarSesion={handleLogout} />
    </div>
  );
}

export default App;