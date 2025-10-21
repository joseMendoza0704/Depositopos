// En: src/pantallas/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig'; // Importa 'db'
import { signOut } from 'firebase/auth';
// Añade 'orderBy' a la lista (correcto):
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  orderBy // <-- ¡Añade esta línea!
} from 'firebase/firestore';

// Importa todas tus pantallas y modales
import Inventario from './Inventario';
import PuntoDeVenta from './PuntoDeVenta';
import ModalApertura from '../components/ModalApertura'; // 1. Importa el nuevo modal

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
  
  // --- 2. NUEVOS ESTADOS PARA MANEJAR LA CAJA ---
  const [cajaActual, setCajaActual] = useState(null); // Guarda los datos de la caja abierta
  const [cargandoCaja, setCargandoCaja] = useState(true); // Para saber si ya revisamos Firebase
  const [mostrandoModalApertura, setMostrandoModalApertura] = useState(false);

  
// --- 3. Revisa en Firebase si ya hay una caja abierta HOY ---
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 00:00:00 de hoy

    const cajasRef = collection(db, 'cajas');
    
    // 👇 ¡CÓDIGO ACTUALIZADO!
    // Añadimos 'orderBy' para que coincida con el índice de Firebase
    const q = query(cajasRef, 
                    where('estado', '==', 'abierta'),
                    where('fechaApertura', '>=', today),
                    orderBy('fechaApertura', 'desc')); // Ordena por fecha descendente

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // Si se encuentra una caja abierta
        const cajaDoc = snapshot.docs[0];
        setCajaActual({ id: cajaDoc.id, ...cajaDoc.data() });
      } else {
        // No hay caja abierta
        setCajaActual(null);
      }
      setCargandoCaja(false);
    }, (error) => {
        // Manejo de errores (importante para depuración)
        console.error("Error al escuchar estado de la caja: ", error);
        // Si hay un error (ej. permisos), dejamos de cargar
        setCargandoCaja(false); 
    });

    // Se ejecuta cuando el componente se desmonta para limpiar
    return () => unsubscribe();
  }, []); // El array vacío asegura que solo se ejecute una vez
 
  const handleLogout = async () => {
    try {
      await signOut(auth);
      alCerrarSesion();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // --- 4. NUEVA FUNCIÓN: Guarda la apertura en Firebase ---
  const handleConfirmarApertura = async (montoInicial) => {
    try {
      await addDoc(collection(db, 'cajas'), {
        fechaApertura: serverTimestamp(),
        montoInicial: montoInicial,
        estado: "abierta",
        usuarioId: auth.currentUser.uid // Guarda quién la abrió
      });
      setMostrandoModalApertura(false);
      // El 'useEffect' de arriba detectará este cambio y actualizará 'cajaActual'
    } catch (error) {
      console.error("Error al abrir la caja: ", error);
      alert("Error al abrir la caja.");
    }
  };

  // --- 5. Pasa el estado de la caja a las vistas ---
  const renderizarVista = () => {
    switch (vistaActual) {
      case 'pos':
        return <PuntoDeVenta 
                  cajaActual={cajaActual} 
                  onAbrirCaja={() => setMostrandoModalApertura(true)} 
                />;
      case 'inventario':
        return <Inventario />;
      // case 'reportes':
      //   return <Reportes />;
      default:
        return <VistaPrincipal />;
    }
  };

  // --- 6. Muestra un "Cargando..." mientras revisa la caja ---
  if (cargandoCaja) {
    return (
      <div className="loading-container">
        <h2>Cargando estado de la caja...</h2>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        {/* ... (tu sidebar-header y sidebar-menu no cambian) ... */}
        <div className="sidebar-header">
          <h3>Depósito Mendoza</h3>
        </div>
        <ul className="sidebar-menu">
          <li><button onClick={() => setVistaActual('pos')}>🛒 POS</button></li>
          <li><button onClick={() => setVistaActual('inventario')}>📦 Inventario Total</button></li>
          <li><button onClick={() => setVistaActual('reportes')}>📊 Reportes</button></li>
        </ul>
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-button">🚪 Cerrar Sesión</button>
        </div>
      </div>

      <div className="main-content">
        {renderizarVista()}
      </div>

      {/* --- 7. Renderiza el nuevo Modal de Apertura --- */}
      {mostrandoModalApertura && (
        <ModalApertura 
          onClose={() => setMostrandoModalApertura(false)}
          onConfirmarApertura={handleConfirmarApertura}
        />
      )}
    </div>
  );
}

export default Dashboard;