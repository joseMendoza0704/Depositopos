import React from 'react';
import { auth } from '../firebaseConfig'; // Importamos 'auth'
import { signOut } from 'firebase/auth';   // Importamos la función para cerrar sesión

// Recibimos la función 'alCerrarSesion' desde App.jsx
function Dashboard({ alCerrarSesion }) {

  const handleLogout = async () => {
    try {
      await signOut(auth); // Usamos la función de Firebase para cerrar sesión
      alCerrarSesion();      // Avisamos a App.jsx que la sesión se cerró
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <div className="dashboard-container">
      {/* --- BARRA LATERAL DE NAVEGACIÓN --- */}
      <div className="sidebar">
        <div className="sidebar-header">
          {/* Aquí puedes poner tu logo de nuevo si quieres */}
          <h3>Depósito Mendoza</h3>
        </div>
        <ul className="sidebar-menu">
          <li><button>🛒 POS</button></li>
          <li><button>📦 Inventario</button></li>
          <li><button>📊 Reportes</button></li>
        </ul>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button">🚪 Cerrar Sesión</button>
        </div>
      </div>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <div className="main-content">
        <h1>Bienvenido</h1>
        <p>Selecciona una opción del menú para comenzar.</p>
        {/* Aquí es donde más adelante mostraremos las diferentes pantallas (POS, Inventario, etc.) */}
      </div>
    </div>
  );
}

export default Dashboard;