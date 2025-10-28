// En: src/components/ModalCierreZ.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Recibe datos de la caja y la función para confirmar el cierre
function ModalCierreZ({ cajaActual, onClose, onConfirmarCierreZ }) {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para cálculos
  const [totalVentas, setTotalVentas] = useState(0);
  const [totalCostos, setTotalCostos] = useState(0);
  const [dineroContado, setDineroContado] = useState('');
  const [diferencia, setDiferencia] = useState(0);

  // Calcula ventas y costos para la caja actual
  useEffect(() => {
    // Asegúrate de que cajaActual y su ID existan antes de proceder
    if (!cajaActual?.id) {
        setLoading(false); // Deja de cargar si no hay ID
        setError("No se pudo identificar la caja actual."); // Muestra un error
        return; // Detiene la ejecución del efecto
    }

    const fetchVentas = async () => {
      try {
        setLoading(true); // Reinicia loading por si acaso
        const ventasRef = collection(db, 'ventas');
        const q = query(ventasRef, where('cajaId', '==', cajaActual.id));
        
        const querySnapshot = await getDocs(q);
        let sumaVentas = 0;
        let sumaCostos = 0;
        const ventasData = []; 
        querySnapshot.forEach((doc) => {
          const venta = doc.data();
          sumaVentas += venta.totalVenta || 0; // Asegura que sea número
          // Suma costos solo si existen y son números
          sumaCostos += (venta.items || []).reduce((acc, item) => acc + (item.costoTotalItem || 0), 0);
          ventasData.push({ id: doc.id, ...venta });
        });
        
        setVentas(ventasData); 
        setTotalVentas(sumaVentas);
        setTotalCostos(sumaCostos);
        setError(null);
      } catch (err) {
        console.error("Error calculando Cierre Z: ", err);
        setError("Error al calcular las ventas.");
      } finally {
        setLoading(false);
      }
    };

    fetchVentas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cajaActual?.id]); // Depende del ID de la caja

  // --- Cálculos derivados (con redondeo) ---
  const montoInicialCaja = cajaActual?.montoInicial || 0; // Valor por defecto si no existe
  const gananciaBruta = totalVentas - totalCostos;
  const donacion = Math.round(totalVentas * 0.01); 
  const totalEsperado = montoInicialCaja + totalVentas;
  const efectivoFinalEsperado = totalEsperado - donacion; 

  // Calcula la diferencia
  useEffect(() => {
    const contadoNum = Number(dineroContado) || 0;
    setDiferencia(contadoNum - efectivoFinalEsperado);
  }, [dineroContado, efectivoFinalEsperado]);

  // Imprimir
  const handlePrint = () => {
    document.title = `Cierre_Z_${new Date().toLocaleDateString()}`;
    window.print();
    setTimeout(() => { document.title = 'Deposito POS'; }, 500);
  };

  // --- Confirmar Cierre (ASEGÚRATE DE QUE ESTA FUNCIÓN EXISTA Y SE LLAME ASÍ) ---
  const handleConfirmar = () => {
    const contadoNum = Number(dineroContado) || 0;
    if (contadoNum <= 0) {
        alert("Por favor, ingrese el monto contado en caja.");
        return;
    }
    
    const datosCierre = {
        totalVentas: totalVentas,
        totalCostos: totalCostos,
        gananciaBruta: gananciaBruta,
        donacion: donacion, 
        efectivoContado: contadoNum,
        diferencia: diferencia,
        efectivoFinalEsperado: efectivoFinalEsperado
    };

    // 1. Llama a la función del Dashboard para guardar en Firebase
    onConfirmarCierreZ(datosCierre); 
    
    // 2. Inmediatamente después, llama a la función de imprimir
    handlePrint(); 
    
    // 3. Cierra el modal (opcional)
    // onClose(); 
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content cierre-modal" id="reporte-imprimible">
        <h3>Reporte Cierre Z (Final del Día)</h3>
        <p>Fecha/Hora: {new Date().toLocaleString()}</p>
        
        {loading ? (
          <p>Calculando...</p>
        ) : error ? (
          <p style={{ color: 'red' }}>{error}</p>
        ) : (
          <div className="cierre-details">
            <p><span>Monto Inicial:</span> <strong>L. {montoInicialCaja.toFixed(2)}</strong></p>
            <p><span>(+) Total Ventas:</span> <strong>L. {totalVentas.toFixed(2)}</strong></p>
            <p><span>(-) Total Costos:</span> <strong>L. {totalCostos.toFixed(2)}</strong></p>
            <hr />
            <p><span>(=) Ganancia Bruta:</span> <strong>L. {gananciaBruta.toFixed(2)}</strong></p>
            <hr />
            <p><span>Total Esperado (Inicial + Ventas):</span> <strong>L. {totalEsperado.toFixed(2)}</strong></p>
            <p><span>(-) Donación (1% Ventas Redondeado):</span> <strong>L. {donacion.toFixed(0)}</strong></p> 
             <p className="cierre-total"><span>(=) Efectivo Final Esperado:</span> <strong>L. {efectivoFinalEsperado.toFixed(2)}</strong></p>
            
            {/* Input y Diferencia */}
            <div className="form-group no-print">
              <label>Dinero Contado Físicamente:</label>
              <input 
                type="number" 
                className="cobro-input"
                value={dineroContado}
                onChange={(e) => setDineroContado(e.target.value)}
                placeholder="Ingrese el monto contado..."
              />
            </div>
            <p className={`cierre-diferencia ${diferencia < 0 ? 'faltante' : 'sobrante'}`}>
              <span>Diferencia:</span> 
              <strong>L. {diferencia.toFixed(2)} {diferencia < 0 ? '(Faltante)' : diferencia > 0 ? '(Sobrante)' : ''}</strong>
            </p>
          </div>
        )}

        {/* --- Botones --- */}
        <div className="modal-botones no-print">
           {/* Botón Confirmar llama a handleConfirmar */}
           <button 
             onClick={handleConfirmar} // ASEGÚRATE DE QUE ESTA LLAMADA SEA CORRECTA
             className="boton-modal-confirmar-cierre" 
             disabled={loading || error || dineroContado === ''}
           >
            Confirmar Cierre e Imprimir 
          </button>
          <button onClick={onClose} className="boton-modal-cancelar">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalCierreZ;