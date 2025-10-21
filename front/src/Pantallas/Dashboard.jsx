import React, { useState } from 'react'; // 1. ¡Importante! Importa useState
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';

// 2. Importa la pantalla de Inventario que creaste
import Inventario from './Inventario';

// 3. Un componente para la vista de bienvenida
function VistaPrincipal() {
  return (
    <div>
      <h1>Bienvenido</h1>
      <p>Selecciona una opción del menú para comenzar.</p>
    </div>
  );
}

function Dashboard({ alCerrarSesion }) {
  // 4. Se crea un "estado" para saber qué pantalla mostrar
  const [vistaActual, setVistaActual] = useState('principal'); 

  const handleLogout = async () => {
    try {
      await signOut(auth);
      alCerrarSesion();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // 5. Esta función decide qué componente mostrar
  const renderizarVista = () => {
    switch (vistaActual) {
      // case 'pos':
      //   return <PuntoDeVenta />; // Aún no lo creamos
      case 'inventario':
        return <Inventario />; // ¡Este sí!
      // case 'reportes':
      //   return <Reportes />; // Aún no lo creamos
      default:
        return <VistaPrincipal />; // La bienvenida
    }
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>Depósito Mendoza</h3>
        </div>
        <ul className="sidebar-menu">
          {/* 6. ¡IMPORTANTE! Los botones ahora tienen el 'onClick' */}
          <li><button onClick={() => setVistaActual('pos')}>🛒 POS</button></li>
          <li><button onClick={() => setVistaActual('inventario')}>📦 Inventario</button></li>
          <li><button onClick={() => setVistaActual('reportes')}>📊 Reportes</button></li>
        </ul>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button">🚪 Cerrar Sesión</button>
        </div>
      </div>

      {/* 7. El contenido principal ahora es dinámico */}
      <div className="main-content">
        {renderizarVista()}
      </div>
    </div>
  );
}

export default Dashboard;