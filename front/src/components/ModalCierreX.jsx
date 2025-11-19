// En: src/components/ModalCierreX.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

function ModalCierreX({ cajaActualId, montoInicial, onClose }) {
  const [totalVentas, setTotalVentas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // --- NUEVO: Estados para conteo físico ---
  const [dineroContado, setDineroContado] = useState('');
  const [diferencia, setDiferencia] = useState(0);

  // Calcula ventas
  const [ventasNormales, setVentasNormales] = useState(0);
  const [ventasPedidos, setVentasPedidos] = useState(0);

  useEffect(() => {
    if (!cajaActualId) return;
    
    const fetchVentas = async () => {
      try {
        setLoading(true);
        
        // Obtener ventas normales
        const ventasRef = collection(db, 'ventas');
        const qVentas = query(ventasRef, where('cajaId', '==', cajaActualId));
        const ventasSnapshot = await getDocs(qVentas);
        let sumaVentasNormales = 0;
        ventasSnapshot.forEach((doc) => {
          sumaVentasNormales += doc.data().totalVenta;
        });
        setVentasNormales(sumaVentasNormales);

        // Obtener ventas de pedidos
        const cajaTransaccionesRef = collection(db, 'cajaTransacciones');
        const startOfDay = new Date(new Date().setHours(0,0,0,0));
        const qPedidos = query(
          cajaTransaccionesRef, 
          where('tipo', '==', 'pedido'),
          where('fecha', '>=', startOfDay)
        );
        const pedidosSnapshot = await getDocs(qPedidos);
        let sumaVentasPedidos = 0;
        pedidosSnapshot.forEach((doc) => {
          const pedido = doc.data();
          // Verificar si la fecha está dentro del día actual
          const pedidoFecha = pedido.fecha.toDate();
          if (pedidoFecha <= new Date(new Date().setHours(23,59,59,999))) {
            sumaVentasPedidos += pedido.total || 0;
          }
        });
        setVentasPedidos(sumaVentasPedidos);

        // Actualizar total general
        setTotalVentas(sumaVentasNormales + sumaVentasPedidos);
        setError(null);
      } catch (err) {
        console.error("Error calculando Cierre X: ", err);
        setError("Error al calcular las ventas.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchVentas();
  }, [cajaActualId]);

  const totalEsperado = montoInicial + totalVentas;

  // --- NUEVO: Calcula la diferencia cuando cambia el dinero contado ---
  useEffect(() => {
    const contadoNum = Number(dineroContado) || 0;
    setDiferencia(contadoNum - totalEsperado);
  }, [dineroContado, totalEsperado]);

  // --- NUEVO: Función para imprimir ---
  const handlePrint = () => {
    // Título temporal para la impresión
    document.title = `Cierre_X_${new Date().toLocaleDateString()}`;
    window.print();
    // Restaura título (opcional)
    setTimeout(() => { document.title = 'Deposito POS'; }, 500);
  };

  return (
    <div className="modal-backdrop">
      {/* Añadimos ID para los estilos de impresión */}
      <div className="modal-content cierre-modal" id="reporte-imprimible">
        <h3>Reporte Cierre X</h3>
        <p>Fecha/Hora: {new Date().toLocaleString()}</p>
        
        {loading ? (
          <p>Calculando...</p>
        ) : error ? (
          <p style={{ color: 'red' }}>{error}</p>
        ) : (
          <div className="cierre-details">
            <p><span>Monto Inicial:</span> <strong>L. {montoInicial.toFixed(2)}</strong></p>
            <p><span>Ventas Directas:</span> <strong>L. {ventasNormales.toFixed(2)}</strong></p>
            <p><span>Ventas de Pedidos:</span> <strong>L. {ventasPedidos.toFixed(2)}</strong></p>
            <p><span>Total Ventas:</span> <strong>L. {totalVentas.toFixed(2)}</strong></p>
            <hr />
            <p className="cierre-total"><span>Total Esperado en Caja:</span> <strong>L. {totalEsperado.toFixed(2)}</strong></p>
            
            {/* --- NUEVO: Input y Diferencia --- */}
            <div className="form-group no-print"> {/* no-print para ocultar al imprimir */}
              <label>Dinero En Caja:</label>
              <input 
                type="number" 
                className="cobro-input"
                value={dineroContado}
                onChange={(e) => setDineroContado(e.target.value)}
                placeholder="Ingrese el monto en caja..."
              />
            </div>
            <p className={`cierre-diferencia ${diferencia < 0 ? 'faltante' : 'sobrante'}`}>
              <span>Diferencia:</span> 
              <strong>L. {diferencia.toFixed(2)} {diferencia < 0 ? '(Faltante)' : '(Sobrante)'}</strong>
            </p>
            {/* --- Fin de lo nuevo --- */}
            
          </div>
        )}

        {/* --- NUEVO: Botones con Imprimir --- */}
        <div className="modal-botones no-print"> {/* no-print para ocultar al imprimir */}
           <button onClick={handlePrint} className="boton-modal-imprimir">
            Imprimir
           </button>
          <button onClick={onClose} className="boton-modal-cancelar">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalCierreX;