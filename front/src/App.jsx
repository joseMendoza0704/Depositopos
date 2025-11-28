import React, { useState } from 'react';
import Login from './Pantallas/Login';
import Dashboard from './Pantallas/Dashboard';
import { NotificationProvider } from './context/NotificationContext';
import './App.css';

function App() {
  const [usuario, setUsuario] = useState(null);

  // Creamos la función para cerrar sesión
  const handleLogout = () => {
    setUsuario(null); // Simplemente limpiamos el estado del usuario
  };

  return (
    <NotificationProvider>
      <div className="App">
        {!usuario ? (
          <Login alIniciarSesion={setUsuario} />
        ) : (
          <Dashboard usuario={usuario} alCerrarSesion={handleLogout} />
        )}
      </div>
    </NotificationProvider>
  );
}

export default App;