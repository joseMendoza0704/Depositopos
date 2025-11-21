// En: src/components/ModalCierreZ.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

function ModalCierreZ({ cajaActual, onClose, onConfirmarCierreZ }) {
  // Estados de datos
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ventasNormales, setVentasNormales] = useState(0);
  const [ventasPedidos, setVentasPedidos] = useState(0);
  const [totalPedidosRecibidos, setTotalPedidosRecibidos] = useState(0);
  const [totalPedidosPagados, setTotalPedidosPagados] = useState(0);
  const [totalVentas, setTotalVentas] = useState(0);
  const [totalCostos, setTotalCostos] = useState(0);
  const [dineroContado, setDineroContado] = useState('');
  const [diferencia, setDiferencia] = useState(0);

  // Estados "Congelados"
  const [cajaIdParaReporte] = useState(cajaActual?.id);
  const [montoInicialCongelado] = useState(cajaActual?.montoInicial || 0);

  // Estados para controlar el flujo de botones
  const [isConfirmando, setConfirmando] = useState(false);
  const [isConfirmado, setConfirmado] = useState(false);

  // Lógica de carga de datos
  useEffect(() => {
    if (!cajaIdParaReporte) {
      setLoading(false); 
      setError("No se pudo identificar la caja actual."); 
      return; 
    }
    const fetchVentas = async () => {
      try {
        setLoading(true);
        const ventasRef = collection(db, 'ventas');
        const qVentas = query(ventasRef, where('cajaId', '==', cajaIdParaReporte));
        const ventasSnapshot = await getDocs(qVentas);
        let sumaVentasNormales = 0, sumaCostos = 0;
        ventasSnapshot.forEach((doc) => {
          const venta = doc.data();
          sumaVentasNormales += venta.totalVenta || 0;
          sumaCostos += (venta.items || []).reduce((acc, item) => acc + (item.costoTotalItem || 0), 0);
        });
        
        const pedidosRef = collection(db, 'pedidos');
        const pedidosSnapshot = await getDocs(pedidosRef);
        let contadorRecibidos = 0, contadorPagados = 0, sumaVentasPedidos = 0, sumaCostosPedidos = 0;
        pedidosSnapshot.forEach((doc) => {
          const pedido = doc.data();
          if (pedido.estado === 'recibido') contadorRecibidos++;
          if (pedido.estado === 'pagado') {
            contadorPagados++;
            sumaVentasPedidos += pedido.total || 0;
            sumaCostosPedidos += (pedido.items || []).reduce((acc, item) => acc + ((item.costo || 0) * item.cantidad), 0);
          }
        });
        
        setTotalPedidosRecibidos(contadorRecibidos);
        setTotalPedidosPagados(contadorPagados);
        setVentasNormales(sumaVentasNormales);
        setVentasPedidos(sumaVentasPedidos);
        setTotalVentas(sumaVentasNormales + sumaVentasPedidos);
        setTotalCostos(sumaCostos + sumaCostosPedidos);
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
  }, [cajaIdParaReporte]); 

  // Cálculos derivados
  const gananciaBruta = totalVentas - totalCostos;
  const donacion = Math.round(totalVentas * 0.01); 
  const totalEsperado = montoInicialCongelado + totalVentas; 
  const efectivoFinalEsperado = totalEsperado - donacion; 

  useEffect(() => {
    const contadoNum = Number(dineroContado) || 0;
    setDiferencia(contadoNum - efectivoFinalEsperado);
  }, [dineroContado, efectivoFinalEsperado]);

  // Lógica de archivado
  const archivarVentasYPedidos = async () => {
    try {
      if (!cajaIdParaReporte) throw new Error("No hay ID de caja para archivar.");
      const batch = writeBatch(db);
      const fechaArchivado = new Date();
      const cierreZId = fechaArchivado.toISOString().split('T')[0];
      
      // 1. Archivar Pedidos
      const pedidosRef = collection(db, 'pedidos');
      const pedidosQuery = query(pedidosRef);
      const pedidosSnapshot = await getDocs(pedidosQuery);
      const archivosPedidosRef = collection(db, 'pedidosArchivados');
      pedidosSnapshot.forEach((pedidoDoc) => {
        batch.set(doc(archivosPedidosRef), { ...pedidoDoc.data(), id: pedidoDoc.id, fechaArchivado: fechaArchivado, cierreZ: cierreZId });
        batch.delete(pedidoDoc.ref);
      });

      // 2. Archivar Ventas
      const ventasRef = collection(db, 'ventas');
      const qVentas = query(ventasRef, where('cajaId', '==', cajaIdParaReporte));
      const ventasSnapshot = await getDocs(qVentas);
      const archivosVentasRef = collection(db, 'ventasArchivadas');
      ventasSnapshot.forEach((ventaDoc) => {
        batch.set(doc(archivosVentasRef), { ...ventaDoc.data(), id: ventaDoc.id, fechaArchivado: fechaArchivado, cierreZ: cierreZId });
        batch.delete(ventaDoc.ref);
      });

      // 3. Archivar CajaTransacciones
      const transaccionesRef = collection(db, 'cajaTransacciones');
      const startOfDay = new Date(new Date().setHours(0,0,0,0));
      const qTransacciones = query( transaccionesRef, where('fecha', '>=', startOfDay), where('tipo', '==', 'pedido') );
      const transaccionesSnapshot = await getDocs(qTransacciones);
      const archivosTransaccionesRef = collection(db, 'cajaTransaccionesArchivadas'); 
      transaccionesSnapshot.forEach((transDoc) => {
        batch.set(doc(archivosTransaccionesRef), { ...transDoc.data(), id: transDoc.id, fechaArchivado: fechaArchivado, cierreZ: cierreZId });
        batch.delete(transDoc.ref);
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error al archivar ventas y pedidos:', error);
      throw new Error('Error al archivar los documentos');
    }
  };

  const handleConfirmar = async () => {
    const contadoNum = Number(dineroContado) || 0;
    if (contadoNum <= 0) {
      alert("Por favor, ingrese el monto contado en caja.");
      return;
    }
  
    setConfirmando(true);
  
    try {
      const datosCierre = {
          fecha: new Date(),
          totalVentas: totalVentas,
          totalCostos: totalCostos,
          gananciaBruta: gananciaBruta,
          donacion: donacion, 
          efectivoContado: contadoNum,
          diferencia: diferencia,
          efectivoFinalEsperado: efectivoFinalEsperado,
          montoInicial: montoInicialCongelado, 
          resumenPedidos: { totalPedidosRecibidos, totalPedidosPagados, ventasPedidos }
      };

      await archivarVentasYPedidos();
      handlePrint();
      await onConfirmarCierreZ(datosCierre);
      setConfirmado(true);

    } catch (error) {
      console.error('Error al realizar el cierre Z:', error);
      alert('Error al realizar el cierre Z. Por favor, intente nuevamente.');
  
    } finally {
      setConfirmando(false);
    }
  };

  const handlePrint = () => {
    document.title = `Cierre_Z_${new Date().toLocaleDateString()}`;
    window.print();
  };

  return (
    <div className="modal-backdrop">
      {/* AQUI ESTA EL CAMBIO PRINCIPAL: 
         Se agregan estilos inline (style={{...}}) para FORZAR el comportamiento 
         flexbox y el límite de altura, ignorando conflictos externos.
      */}
      <div 
        className="modal-content cierre-modal"
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden'
        }}
      >
        
        {/* Contenedor con scroll - FORZAMOS EL SCROLL AQUÍ */}
        <div 
          className="cierre-modal-scroll" 
          id="reporte-imprimible"
          style={{
            flex: 1,             /* Ocupa todo el espacio disponible */
            overflowY: 'auto',   /* Habilita el scroll vertical */
            minHeight: 0         /* Vital para que flexbox no expanda el contenedor */
          }}
        >
          <h3>Reporte Cierre Z (Final del Día)</h3>
          <p>Fecha/Hora: {new Date().toLocaleString()}</p>
          
          {loading ? (
            <p>Calculando...</p>
          ) : error ? (
            <p style={{ color: 'red' }}>{error}</p>
          ) : (
            <div className="cierre-details">
              <p><span>Monto Inicial:</span> <strong>L. {montoInicialCongelado.toFixed(2)}</strong></p>
              
              <div className="seccion-ventas">
                <h4>Ventas Directas</h4>
                <p><span>Total Ventas Directas:</span> <strong>L. {ventasNormales.toFixed(2)}</strong></p>
              </div>

              <div className="seccion-pedidos">
                <h4>Resumen de Pedidos</h4>
                <p><span>Pedidos Recibidos:</span> <strong>{totalPedidosRecibidos}</strong></p>
                <p><span>Pedidos Pagados:</span> <strong>{totalPedidosPagados}</strong></p>
                <p><span>Total Ventas Pedidos:</span> <strong>L. {ventasPedidos.toFixed(2)}</strong></p>
              </div>

              <hr />
              <p><span>(=) Total Ventas:</span> <strong>L. {totalVentas.toFixed(2)}</strong></p>
              <p><span>(-) Total Costos:</span> <strong>L. {totalCostos.toFixed(2)}</strong></p>
              <hr />
              <p><span>(=) Ganancia Bruta:</span> <strong>L. {gananciaBruta.toFixed(2)}</strong></p>
              <hr />
              <p><span>Total Esperado (Inicial + Ventas):</span> <strong>L. {totalEsperado.toFixed(2)}</strong></p>
              <p><span>(-) Donación (1% Ventas Redondeado):</span> <strong>L. {donacion.toFixed(0)}</strong></p> 
              <p className="cierre-total"><span>(=) Efectivo Final Esperado:</span> <strong>L. {efectivoFinalEsperado.toFixed(2)}</strong></p>
              
              <div className="form-group no-print ocultar-en-impresion">
                <label>Dinero Contado Físicamente:</label>
                <input 
                  type="number" 
                  className="cobro-input"
                  value={dineroContado}
                  onChange={(e) => setDineroContado(e.target.value)}
                  placeholder="Ingrese el monto contado..."
                  disabled={isConfirmado || isConfirmando}
                />
              </div>
              <p className={`cierre-diferencia ${diferencia < 0 ? 'faltante' : 'sobrante'}`}>
                <span>Diferencia:</span> 
                <strong>L. {diferencia.toFixed(2)} {diferencia < 0 ? '(Faltante)' : diferencia > 0 ? '(Sobrante)' : ''}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Botones fijos en la parte inferior - FORZAMOS QUE NO SE ENCOJAN */}
        <div 
          className="modal-botones-fijos no-print ocultar-en-impresion"
          style={{ flexShrink: 0 }}
        >
          {isConfirmado ? (
            <>
              <button 
                onClick={handlePrint}
                className="boton-modal-imprimir"
              >
                Imprimir Reporte
              </button>
              <button 
                onClick={onClose} 
                className="boton-modal-cancelar"
              >
                Cerrar
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleConfirmar}
                className="boton-modal-confirmar-cierre" 
                disabled={loading || error || dineroContado === '' || isConfirmando}
              >
                {isConfirmando ? 'Confirmando...' : 'Confirmar Cierre'}
              </button>
              <button 
                onClick={onClose} 
                className="boton-modal-cancelar"
                disabled={isConfirmando}
              >
                Cancelar
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

export default ModalCierreZ;