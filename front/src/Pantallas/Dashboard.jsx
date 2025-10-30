// En: src/pantallas/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
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

import Inventario from './Inventario';
import PuntoDeVenta from './PuntoDeVenta';
// Iconos del sidebar
import iconPos from '../assets/poslogo.png';
import iconInventario from '../assets/inventario.png';
import iconReportes from '../assets/reportes.png';
import ModalApertura from '../components/ModalApertura';
import ModalCierreZ from '../components/ModalCierreZ';
import ModalMensaje from '../components/ModalMensaje';

function VistaPrincipal() {
  return (
    <div>
      <h1>Bienvenido</h1>
      <p>Al sistema de Deposito Mendoza.</p>
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

  // Estado para el mensaje modal
  const [mensajeModal, setMensajeModal] = useState(null); // { texto: '', tipo: '' }

  // --- useEffect para chequear caja abierta ---
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cajasRef = collection(db, 'cajas');
    const q = query(cajasRef,
                    where('estado', '==', 'abierta'),
                    where('fechaApertura', '>=', today),
                    orderBy('fechaApertura', 'desc'));

    // console.log("Iniciando listener de caja..."); // Logs eliminados
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // console.log("Listener de caja recibi贸 datos. Vac铆o:", snapshot.empty);
      if (!snapshot.empty) {
        const cajaDoc = snapshot.docs[0];
        // console.log("隆Caja abierta encontrada!", cajaDoc.id, cajaDoc.data());
        setCajaActual({ id: cajaDoc.id, ...cajaDoc.data() });
      } else {
        // console.log("No se encontr贸 ninguna caja abierta para hoy.");
        setCajaActual(null);
      }
      setCargandoCaja(false);
    }, (error) => {
        console.error("Error en listener de caja: ", error);
        setCargandoCaja(false);
    });
    return () => {
        // console.log("Deteniendo listener de caja.");
        unsubscribe();
    }
  }, []);

  // --- handleLogout ---
  const handleLogout = async () => {
      try {
        await signOut(auth);
        alCerrarSesion();
      } catch (error) {
        console.error("Error al cerrar sesi贸n:", error);
      }
  };

  // --- handleConfirmarApertura ---
  const handleConfirmarApertura = async (montoInicial) => {
    try {
      await addDoc(collection(db, 'cajas'), {
        fechaApertura: serverTimestamp(),
        montoInicial: montoInicial,
        estado: "abierta",
        usuarioId: auth.currentUser.uid
      });
      setMostrandoModalApertura(false);
    } catch (error) {
      console.error("Error al abrir la caja: ", error);
      setMensajeModal({ texto: "Error al abrir la caja.", tipo: 'error' }); // Usar modal para error
    }
  };

  // --- handleCierreZ ---
  const handleCierreZ = () => {
      if (!cajaActual) return;
      setMostrandoModalCierreZ(true);
  };

  // --- handleConfirmarCierreZ (MODIFICADO para usar ModalMensaje) ---
  const handleConfirmarCierreZ = async (datosCierre) => {
      if (!cajaActual?.id) return;

      try {
          const cajaRef = doc(db, 'cajas', cajaActual.id);
          await updateDoc(cajaRef, {
              ...datosCierre,
              fechaCierre: serverTimestamp(),
              estado: "cerrada"
          });
          setMostrandoModalCierreZ(false); // Cierra el modal de Cierre Z
          // *** CAMBIO AQU脥: Usa ModalMensaje en lugar de alert ***
          setMensajeModal({ texto: "隆Caja cerrada exitosamente!", tipo: 'exito' });

      } catch (error) {
          console.error("Error al cerrar la caja: ", error);
          // *** CAMBIO AQU脥: Usa ModalMensaje en lugar de alert ***
          setMensajeModal({ texto: "Error al cerrar la caja.", tipo: 'error' });
      }
  };

  // --- renderizarVista ---
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

  // --- JSX ---
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

      {/* Renderiza el ModalMensaje */}
      {mensajeModal && (
        <ModalMensaje
          mensaje={mensajeModal.texto}
          tipo={mensajeModal.tipo}
          onClose={() => setMensajeModal(null)} // Funci贸n para cerrar
        />
      )}
    </div>
  );
}

export default Dashboard;