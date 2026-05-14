// En: src/components/ModalCierreX.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Printer } from 'lucide-react';
import { formatearMoneda } from '../utils/formatoMoneda';
import '../styles/factura.css';

function ModalCierreX({ cajaActualId, montoInicial, onClose, usuario }) {
  const NUMERO_WHATSAPP = '50489534082';
  const nombreUsuario = usuario?.displayName || usuario?.email || 'Usuario';
  const [totalVentas, setTotalVentas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dineroContado, setDineroContado] = useState('');
  const [diferencia, setDiferencia] = useState(0);
  const [ventasNormales, setVentasNormales] = useState(0);
  const [ventasPedidos, setVentasPedidos] = useState(0);
  const [totalCostos, setTotalCostos] = useState(0);

  useEffect(() => {
    if (!cajaActualId) return;

    const fetchVentas = async () => {
      try {
        setLoading(true);

        const ventasRef = collection(db, 'ventas');
        const qVentas = query(ventasRef, where('cajaId', '==', cajaActualId));
        const ventasSnapshot = await getDocs(qVentas);
        let sumaVentasNormales = 0;
        let sumaCostos = 0;
        ventasSnapshot.forEach((doc) => {
          const venta = doc.data();
          sumaVentasNormales += venta.totalVenta || 0;
          sumaCostos += (venta.items || []).reduce((acc, item) => acc + (item.costoTotalItem || 0), 0);
        });
        setVentasNormales(sumaVentasNormales);
        setTotalCostos(sumaCostos);

        const cajaTransaccionesRef = collection(db, 'cajaTransacciones');
        const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
        const qPedidos = query(
          cajaTransaccionesRef,
          where('tipo', '==', 'pedido'),
          where('fecha', '>=', startOfDay)
        );
        const pedidosSnapshot = await getDocs(qPedidos);
        let sumaVentasPedidos = 0;
        let sumaCostosPedidos = 0;
        pedidosSnapshot.forEach((doc) => {
          const pedido = doc.data();
          const pedidoFecha = pedido.fecha.toDate();
          if (pedidoFecha <= new Date(new Date().setHours(23, 59, 59, 999))) {
            sumaVentasPedidos += pedido.total || 0;
            sumaCostosPedidos += (pedido.items || []).reduce((acc, item) => acc + ((item.costo || 0) * item.cantidad), 0);
          }
        });
        setVentasPedidos(sumaVentasPedidos);
        setTotalCostos(prev => prev + sumaCostosPedidos);

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

  useEffect(() => {
    const contadoNum = Number(dineroContado) || 0;
    setDiferencia(contadoNum - totalEsperado);
  }, [dineroContado, totalEsperado]);

  const fechaReporte = new Date().toLocaleDateString('es-HN');
  const horaReporte = new Date().toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });

  const handlePrint = () => {
    const gananciaBruta = totalVentas - totalCostos;
    const mensaje = `
*CIERRE X - Deposito Mendoza*

*Fecha:* ${fechaReporte}
*Hora:* ${horaReporte}
*Usuario:* ${nombreUsuario}

*RESUMEN DE VENTAS*
Ventas POS: L. ${formatearMoneda(ventasNormales)}
Ventas Pedidos: L. ${formatearMoneda(ventasPedidos)}
*Total Ventas: L. ${formatearMoneda(totalVentas)}*

*DETALLE DE CAJA*
Monto Inicial: L. ${formatearMoneda(montoInicial)}
Total Esperado: L. ${formatearMoneda(totalEsperado)}

*RESUMEN FINANCIERO*
Costos: L. ${formatearMoneda(totalCostos)}
*Ganancia Bruta: L. ${formatearMoneda(gananciaBruta)}*

*Cierre Parcial* - Caja permanece abierta`;
    
    // WhatsApp mensaje removido por solicitud del usuario para Cierre X
    // const urlWhatsApp = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
    // window.open(urlWhatsApp, '_blank');

    
    document.title = `Cierre_X_${new Date().toLocaleDateString()}`;
    window.print();
    setTimeout(() => { document.title = 'Deposito POS'; }, 500);
  };

  return (
    <div className="modal-backdrop">
      <div className="factura-container" id="reporte-imprimible">

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
            <p><strong>Tipo de reporte:</strong> Cierre X (Parcial)</p>
            <p><strong>Estado:</strong> Caja Abierta</p>
          </div>
          <div className="factura-info-datos">
            <h3>REPORTE CIERRE X</h3>
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
                  <td className="text-right">L. {montoInicial.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="producto-nombre">Ventas Directas</td>
                  <td className="text-right">L. {ventasNormales.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="producto-nombre">Ventas de Pedidos</td>
                  <td className="text-right">L. {ventasPedidos.toFixed(2)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid #2c3e50' }}>
                  <td className="producto-nombre"><strong>Total Ventas</strong></td>
                  <td className="text-right"><strong>L. {totalVentas.toFixed(2)}</strong></td>
                </tr>
              </tbody>
            </table>

            {/* Totales */}
            <div className="factura-totales">
              <div className="factura-totales-row factura-total-final">
                <span>TOTAL ESPERADO EN CAJA:</span>
                <strong>L. {totalEsperado.toFixed(2)}</strong>
              </div>
            </div>

            {/* Input de Dinero Contado */}
            <div className="form-group no-print" style={{ marginTop: '20px' }}>
              <label style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', display: 'block' }}>
                Dinero En Caja:
              </label>
              <input
                type="number"
                className="cobro-input"
                value={dineroContado}
                onChange={(e) => setDineroContado(e.target.value)}
                placeholder="Ingrese el monto en caja..."
                style={{ width: '100%', padding: '12px', fontSize: '16px' }}
              />
            </div>

            {dineroContado && (
              <div className="factura-totales" style={{ marginTop: '20px' }}>
                <div className={`factura-totales-row ${diferencia < 0 ? 'faltante' : 'sobrante'}`}>
                  <span>Diferencia:</span>
                  <strong style={{ color: diferencia < 0 ? '#e74c3c' : '#27ae60' }}>
                    L. {diferencia.toFixed(2)} {diferencia < 0 ? '(Faltante)' : '(Sobrante)'}
                  </strong>
                </div>
              </div>
            )}
          </>
        )}

        {/* Pie */}
        <div className="factura-footer">
          <p className="factura-mensaje">Este es un reporte parcial de caja.</p>
          <p className="factura-mensaje">La caja permanece abierta.</p>
        </div>

        {/* Botones */}
        <div className="factura-botones no-print">
          <button onClick={handlePrint} className="boton-modal-agregar">
            <Printer size={18} /> Imprimir
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