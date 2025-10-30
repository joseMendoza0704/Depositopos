// En: src/pantallas/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig'; // Asegúrate de que la ruta sea correcta (ej. ../firebaseConfig.js)
import { signOut } from 'firebase/auth';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy,
  doc,
  updateDoc
} from 'firebase/firestore';

// Asumiendo que estas pantallas están en la misma carpeta 'pantallas'
import Inventario from './Inventario';
import PuntoDeVenta from './PuntoDeVenta';
import GestionClientes from './GestionClientes'; // Importa la pantalla de Clientes

// Iconos del sidebar (desde la nueva carpeta src/assets/)
import iconPos from '../assets/poslogo.png';
import iconInventario from '../assets/inventario.png';
import iconReportes from '../assets/reportes.png';
import iconClientes from '../assets/clientes.png'; // Asegúrate que este archivo exista en src/assets/

// Componentes
import ModalApertura from '../components/ModalApertura';
import ModalCierreZ from '../components/ModalCierreZ';
import ModalMensaje from '../components/ModalMensaje';

function VistaPrincipal() {
  return (
    <div>
      <h1>Bienvenido</h1>
      <p>Selecciona una opción del menú para comenzar.</p>
    </div>
  );
}

function Dashboard({ alCerrarSesion }) {
  const [vistaActual, setVistaActual] = useState('principal');
  const [cajaActual, setCajaActual] = useState(null);
  const [cargandoCaja, setCargandoCaja] = useState(true);
  const [mostrandoModalApertura, setMostrandoModalApertura] = useState(false);
  const [mostrandoModalCierreZ, setMostrandoModalCierreZ] = useState(false);
  const [mensajeModal, setMensajeModal] = useState(null);

  // --- useEffect para chequear caja abierta ---
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cajasRef = collection(db, 'cajas');
    const q = query(cajasRef,
                    where('estado', '==', 'abierta'),
                    where('fechaApertura', '>=', today),
                    orderBy('fechaApertura', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const cajaDoc = snapshot.docs[0];
        setCajaActual({ id: cajaDoc.id, ...cajaDoc.data() });
      } else {
        setCajaActual(null);
      }
      setCargandoCaja(false);
    }, (error) => {
        console.error("Error en listener de caja: ", error);
        setCargandoCaja(false);
    });
    return () => {
        unsubscribe();
    }
  }, []);

  // --- handleLogout ---
  const handleLogout = async () => {
      try {
        await signOut(auth);
        alCerrarSesion();
      } catch (error) {
        console.error("Error al cerrar sesión:", error);
        setMensajeModal({ texto: "Error al cerrar sesión.", tipo: 'error' });
      }
  };

  // --- handleConfirmarApertura ---
  const handleConfirmarApertura = async (montoInicial) => {
    try {
      await addDoc(collection(db, 'cajas'), {
        fechaApertura: serverTimestamp(),
        montoInicial: Number(montoInicial),
        estado: "abierta",
        usuarioId: auth.currentUser.uid
      });
      setMostrandoModalApertura(false);
    } catch (error) {
      console.error("Error al abrir la caja: ", error);
      setMensajeModal({ texto: "Error al abrir la caja. Revise la consola.", tipo: 'error' });
    }
  };

  // --- handleCierreZ ---
  const handleCierreZ = () => {
      if (!cajaActual) return;
      setMostrandoModalCierreZ(true);
  };

  // --- handleConfirmarCierreZ ---
  const handleConfirmarCierreZ = async (datosCierre) => {
      if (!cajaActual?.id) {
          setMensajeModal({ texto: "Error: No se pudo identificar la caja actual.", tipo: 'error' });
          return;
      }
      try {
          const cajaRef = doc(db, 'cajas', cajaActual.id);
          await updateDoc(cajaRef, {
              ...datosCierre,
              fechaCierre: serverTimestamp(),
              estado: "cerrada",
              usuarioCierreId: auth.currentUser ? auth.currentUser.uid : 'desconocido'
          });
          setMostrandoModalCierreZ(false);
          setMensajeModal({ texto: "¡Caja cerrada exitosamente!", tipo: 'exito' });
      } catch (error) {
          console.error("Error al cerrar la caja: ", error);
          setMensajeModal({ texto: "Error al cerrar la caja. Revise la consola.", tipo: 'error' });
      }
  };

  // --- renderizarVista (MODIFICADO) ---
  const renderizarVista = () => {
    switch (vistaActual) {
      case 'pos':
        return <PuntoDeVenta
                  cajaActual={cajaActual}
                  onAbrirCaja={() => setMostrandoModalApertura(true)}
                  onCierreZ={handleCierreZ}
                />;
      case 'inventario':
        return <Inventario />;
      
      // AÑADE EL CASE PARA CLIENTES
      case 'clientes':
        return <GestionClientes />;
      
      // case 'reportes':
      //   return <VistaPrincipal />; // Temporal
        
      default:
        return <VistaPrincipal />;
    }
  };

  // --- Estado de Carga ---
  if (cargandoCaja) {
      return (
          <div className="loading-container">
              <h2>Cargando estado de la caja...</h2>
          </div>
      );
  }

  // --- JSX (MODIFICADO) ---
  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header"><h3>Depósito Mendoza</h3></div>
        
        <ul className="sidebar-menu">
          <li>
            <button onClick={() => setVistaActual('pos')}>
              <img src={iconPos} className="menu-icon" alt="POS" />
              POS
            </button>
          </li>
          <li>
            <button onClick={() => setVistaActual('inventario')}>
              <img src={iconInventario} className="menu-icon" alt="Inventario" />
              Inventario
            </button>
          </li>
          {/* --- Botón de Clientes Añadido --- */}
          <li>
            <button onClick={() => setVistaActual('clientes')}>
              <img src={iconClientes} className="menu-icon" alt="Clientes" />
              Clientes
            </button>
          </li>
          <li>
            <button onClick={() => setVistaActual('reportes')}>
              <img src={iconReportes} className="menu-icon" alt="Reportes" />
              Reportes
            </button>
          </li>
        </ul>
        <div className="sidebar-footer"><button onClick={handleLogout} className="logout-button"> Cerrar Sesión</button></div>
      </div>

      {/* Contenido Principal */}
      <div className="main-content">
        {renderizarVista()}
      </div>

      {/* --- Modales --- */}
      {mostrandoModalApertura && (
        <ModalApertura
          onClose={() => setMostrandoModalApertura(false)}
          onConfirmarApertura={handleConfirmarApertura}
        />
      )}
      {mostrandoModalCierreZ && cajaActual && (
        <ModalCierreZ
            cajaActual={cajaActual}
            onClose={() => setMostrandoModalCierreZ(false)}
            onConfirmarCierreZ={handleConfirmarCierreZ}
        />
      )}
      {mensajeModal && (
        <ModalMensaje
          mensaje={mensajeModal.texto}
          tipo={mensajeModal.tipo}
          onClose={() => setMensajeModal(null)}
        />
      )}
    </div>
  );
}

export default Dashboard;