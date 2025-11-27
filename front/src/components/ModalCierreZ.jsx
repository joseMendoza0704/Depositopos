// En: src/components/ModalCierreZ.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import '../styles/factura.css';

function ModalCierreZ({ cajaActual, onClose, onConfirmarCierreZ }) {
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

  const [cajaIdParaReporte] = useState(cajaActual?.id);
  const [montoInicialCongelado] = useState(cajaActual?.montoInicial || 0);

  const [isConfirmando, setConfirmando] = useState(false);
  const [isConfirmado, setConfirmado] = useState(false);

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
  }, [cajaIdParaReporte]);

  const gananciaBruta = totalVentas - totalCostos;
  const donacion = Math.round(totalVentas * 0.01);
  const totalEsperado = montoInicialCongelado + totalVentas;
  const efectivoFinalEsperado = totalEsperado - donacion;

  useEffect(() => {
    const contadoNum = Number(dineroContado) || 0;
    setDiferencia(contadoNum - efectivoFinalEsperado);
  }, [dineroContado, efectivoFinalEsperado]);

  const archivarVentasYPedidos = async () => {
    try {
      if (!cajaIdParaReporte) throw new Error("No hay ID de caja para archivar.");
      const batch = writeBatch(db);
      const fechaArchivado = new Date();
      const cierreZId = fechaArchivado.toISOString().split('T')[0];

      const pedidosRef = collection(db, 'pedidos');
      const pedidosQuery = query(pedidosRef);
      const pedidosSnapshot = await getDocs(pedidosQuery);
      const archivosPedidosRef = collection(db, 'pedidosArchivados');
      pedidosSnapshot.forEach((pedidoDoc) => {
        batch.set(doc(archivosPedidosRef), { ...pedidoDoc.data(), id: pedidoDoc.id, fechaArchivado: fechaArchivado, cierreZ: cierreZId });
        batch.delete(pedidoDoc.ref);
      });

      const ventasRef = collection(db, 'ventas');
      const qVentas = query(ventasRef, where('cajaId', '==', cajaIdParaReporte));
      const ventasSnapshot = await getDocs(qVentas);
      const archivosVentasRef = collection(db, 'ventasArchivadas');
      ventasSnapshot.forEach((ventaDoc) => {
        batch.set(doc(archivosVentasRef), { ...ventaDoc.data(), id: ventaDoc.id, fechaArchivado: fechaArchivado, cierreZ: cierreZId });
        batch.delete(ventaDoc.ref);
      });

      const transaccionesRef = collection(db, 'cajaTransacciones');
      const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
      const qTransacciones = query(transaccionesRef, where('fecha', '>=', startOfDay), where('tipo', '==', 'pedido'));
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

  const fechaReporte = new Date().toLocaleDateString('es-HN');
  const horaReporte = new Date().toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="modal-backdrop">
      <div className="factura-container-wide" id="reporte-imprimible">

        {/* Header */}
        <div className="factura-empresa">
          <div className="factura-logo">
            <img src="/logo_fact.png" alt="Logo Depósito Mendoza" />
          </div>

          <p className="factura-empresa-info">Dirección: Barrio el centro 5ta calle en frente a pollolandia</p>
          <p className="factura-empresa-info">Teléfono: +504 3390-6236</p>
          <p className="factura-empresa-info">Email: mendozadeposito0704@gmail.com</p>
        </div>

        {/* Información del Reporte */}
        <div className="factura-info-section">
          <div className="factura-info-cliente">
            <p><strong>Tipo de reporte:</strong> Cierre Z (Final)</p>
            <p><strong>Estado:</strong> Cierre de Caja</p>
          </div>
          <div className="factura-info-datos">
            <h3>REPORTE CIERRE Z</h3>
            <p><strong>Fecha:</strong> {fechaReporte}</p>
            <p><strong>Hora:</strong> {horaReporte}</p>
          </div>
        </div>

        <hr className="factura-separador" />

        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>Calculando...</p>
        ) : error ? (
          <p style={{ color: 'red', textAlign: 'center', padding: '20px' }}>{error}</p>
        ) : (
          <>
            {/* Tabla de Resumen */}
            <table className="factura-productos-tabla">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th className="text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="producto-nombre">Monto Inicial</td>
                  <td className="text-right">L. {montoInicialCongelado.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '20px' }}>Ventas Directas</td>
                  <td className="text-right">L. {ventasNormales.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '20px' }}>
                    Ventas de Pedidos
                    <span className="producto-formato">({totalPedidosPagados} pagados)</span>
                  </td>
                  <td className="text-right">L. {ventasPedidos.toFixed(2)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid #2c3e50' }}>
                  <td className="producto-nombre"><strong>Total Ventas</strong></td>
                  <td className="text-right"><strong>L. {totalVentas.toFixed(2)}</strong></td>
                </tr>
                <tr>
                  <td className="producto-nombre" style={{ color: '#e74c3c' }}>(-) Total Costos</td>
                  <td className="text-right" style={{ color: '#e74c3c' }}>L. {totalCostos.toFixed(2)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid #27ae60' }}>
                  <td className="producto-nombre" style={{ color: '#27ae60' }}><strong>Ganancia Bruta</strong></td>
                  <td className="text-right" style={{ color: '#27ae60' }}><strong>L. {gananciaBruta.toFixed(2)}</strong></td>
                </tr>
                <tr style={{ borderTop: '1px dashed #ccc' }}>
                  <td className="producto-nombre">Total Esperado (Inicial + Ventas)</td>
                  <td className="text-right">L. {totalEsperado.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '20px' }}>(-) Donación (1% Ventas)</td>
                  <td className="text-right">L. {donacion.toFixed(0)}</td>
                </tr>
              </tbody>
            </table>

            {/* Totales */}
            <div className="factura-totales">
              <div className="factura-totales-row factura-total-final">
                <span>EFECTIVO FINAL ESPERADO:</span>
                <strong>L. {efectivoFinalEsperado.toFixed(2)}</strong>
              </div>
            </div>

            {/* Input de Dinero Contado */}
            <div className="form-group no-print" style={{ marginTop: '20px' }}>
              <label style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>
                Dinero Contado Físicamente:
              </label>
              <input
                type="number"
                className="cobro-input"
                value={dineroContado}
                onChange={(e) => setDineroContado(e.target.value)}
                placeholder="Ingrese el monto contado..."
                disabled={isConfirmado || isConfirmando}
                style={{ width: '100%', padding: '12px', fontSize: '16px' }}
              />
            </div>

            {dineroContado && (
              <div className="factura-totales" style={{ marginTop: '20px' }}>
                <div className={`factura-totales-row ${diferencia < 0 ? 'faltante' : 'sobrante'}`}>
                  <span>Diferencia:</span>
                  <strong style={{ color: diferencia < 0 ? '#e74c3c' : '#27ae60' }}>
                    L. {diferencia.toFixed(2)} {diferencia < 0 ? '(Faltante)' : diferencia > 0 ? '(Sobrante)' : ''}
                  </strong>
                </div>
              </div>
            )}

            {/* Resumen de Pedidos */}
            {totalPedidosRecibidos > 0 && (
              <div className="factura-footer" style={{ borderTop: '1px dashed #ccc', marginTop: '20px', paddingTop: '15px' }}>
                <p className="factura-mensaje">
                  <strong>Nota:</strong> Quedan {totalPedidosRecibidos} pedidos pendientes (estado: recibido)
                </p>
              </div>
            )}
          </>
        )}

        {/* Pie */}
        <div className="factura-footer">
          {!isConfirmado ? (
            <>
              <p className="factura-agradecimiento" style={{ color: '#e74c3c' }}>⚠️ Cierre Final del Día</p>
              <p className="factura-mensaje">Al confirmar, se archivará toda la información y se cerrará la caja.</p>
            </>
          ) : (
            <>
              <p className="factura-agradecimiento" style={{ color: '#27ae60' }}>✓ Cierre Z Completado</p>
              <p className="factura-mensaje">La caja ha sido cerrada exitosamente.</p>
            </>
          )}
        </div>

        {/* Botones */}
        <div className="factura-botones no-print">
          {isConfirmado ? (
            <>
              <button onClick={handlePrint} className="boton-modal-agregar">
                🖨️ Imprimir Reporte
              </button>
              <button onClick={onClose} className="boton-modal-cancelar">
                Cerrar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleConfirmar}
                className="boton-modal-agregar"
                disabled={loading || error || dineroContado === '' || isConfirmando}
                style={{ backgroundColor: '#e74c3c' }}
              >
                {isConfirmando ? 'Confirmando...' : 'Confirmar Cierre Z'}
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