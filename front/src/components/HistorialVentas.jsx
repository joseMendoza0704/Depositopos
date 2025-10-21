// En: src/components/HistorialVentas.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import Factura from './Factura'; // Reutilizamos el modal de la factura

function HistorialVentas({ onClose }) {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null); // Para mostrar la factura

  // Cargar las ventas de HOY
  useEffect(() => {
    // 1. Define el rango de "hoy"
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Pone la hora a las 00:00:00

    // 2. Crea la consulta a Firebase
    const ventasRef = collection(db, 'ventas');
    const q = query(ventasRef, 
                    where('fecha', '>=', today), // Filtra ventas >= a las 00:00 de hoy
                    orderBy('fecha', 'desc')); // Las más nuevas primero

    // 3. Escucha los cambios
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaVentas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVentas(listaVentas);
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  // Función para ver la factura (que es un modal)
  const verFactura = (venta) => {
    // Firebase guarda 'fecha' como Timestamp. Debemos convertirla a Date
    // para que el componente Factura pueda leerla.
    const ventaConFechaJS = {
      ...venta,
      fecha: venta.fecha.toDate() // Convertimos Timestamp a Date
    };
    setVentaSeleccionada(ventaConFechaJS);
  };

  // --- Renderizado ---

  // Si el usuario seleccionó una venta, mostramos el Modal de Factura
  if (ventaSeleccionada) {
    return (
      <Factura 
        venta={ventaSeleccionada}
        // Al cerrar la factura, volvemos a la lista (poniendo el estado en null)
        onClose={() => setVentaSeleccionada(null)} 
      />
    );
  }

  // Si no, mostramos la lista de ventas del día
  return (
    <div className="modal-backdrop">
      <div className="modal-content historial-modal">
        <h3>Ventas de Hoy</h3>
        <div className="historial-lista-container">
          {loading ? (
            <p>Cargando ventas...</p>
          ) : (
            <ul className="historial-lista">
              {ventas.length === 0 ? (
                <p>No se han realizado ventas hoy.</p>
              ) : (
                ventas.map(venta => (
                  <li key={venta.id} onClick={() => verFactura(venta)}>
                    <span className="historial-cliente">Cliente: {venta.cliente}</span>
                    <span className="historial-total">L. {venta.totalVenta.toFixed(2)}</span>
                    <span className="historial-hora">{venta.fecha.toDate().toLocaleTimeString()}</span>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        <div className="modal-botones">
          <button onClick={onClose} className="boton-modal-cancelar">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default HistorialVentas;