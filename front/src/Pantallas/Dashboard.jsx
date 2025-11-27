// En: src/pantallas/Dashboard.j
import '../styles/Dashboard.css';
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig.js';
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

import Inventario from './Inventario.jsx';
import PuntoDeVenta from './PuntoDeVenta.jsx';
import GestionClientes from './GestionClientes.jsx';
import GestionPedidos from './GestionPedidos.jsx';

import ModalApertura from '../components/ModalApertura.jsx';
import ModalCierreZ from '../components/ModalCierreZ.jsx';
import ModalMensaje from '../components/ModalMensaje.jsx';

import iconPos from '../assets/poslogo.png';
import iconInventario from '../assets/inventario.png';
import iconReportes from '../assets/reportes.png';
import iconClientes from '../assets/clientes.png';
import iconPedidos from '../assets/pedidos.png';

function VistaPrincipal() {
  return (
    <div className="vista-principal">
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
  const [sidebarColapsada, setSidebarColapsada] = useState(false); // Estado para colapsar sidebar

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
      console.error("Error en listener de caja (¿Falta índice?): ", error);
      setCargandoCaja(false);
    });
    return () => unsubscribe();
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
    if (!auth.currentUser) {
      setMensajeModal({ texto: "Error: Usuario no autenticado.", tipo: 'error' });
      return;
    }
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
      case 'clientes':
        return <GestionClientes />;
      case 'pedidos':
        return <GestionPedidos cajaActual={cajaActual} />;
      case 'reportes':
        return <VistaPrincipal />;
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

  return (
    <div className="dashboard-container">
      {/* Sidebar con clase condicional para colapsar */}
      <div className={`sidebar ${sidebarColapsada ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h3><span className="header-icon">🛒</span> Depósito Mendoza</h3>
        </div>
        <ul className="sidebar-menu">
          <li>
            <button
              onClick={() => setVistaActual('pos')}
              className={vistaActual === 'pos' ? 'active' : ''}
            >
              <span className="menu-icon-badge">💰</span>
              <span className="menu-text">POS</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => setVistaActual('inventario')}
              className={vistaActual === 'inventario' ? 'active' : ''}
            >
              <span className="menu-icon-badge">📦</span>
              <span className="menu-text">Inventario</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => setVistaActual('clientes')}
              className={vistaActual === 'clientes' ? 'active' : ''}
            >
              <span className="menu-icon-badge">👥</span>
              <span className="menu-text">Clientes</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => setVistaActual('pedidos')}
              className={vistaActual === 'pedidos' ? 'active' : ''}
            >
              <span className="menu-icon-badge">📋</span>
              <span className="menu-text">Pedidos</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => setVistaActual('reportes')}
              className={vistaActual === 'reportes' ? 'active' : ''}
            >
              <span className="menu-icon-badge">📊</span>
              <span className="menu-text">Reportes</span>
            </button>
          </li>
        </ul>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button">
            <span className="menu-text">Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Contenido Principal con animación de entrada */}
      <div className="main-content">
        <div className="content-fade-in" key={vistaActual}>
          {renderizarVista()}
        </div>
      </div>

      {/* Modales */}
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
