import React from 'react';
import { Printer } from 'lucide-react';
import '../styles/factura.css';

function ModalVerCierreZ({ datosCierre, onClose }) {
    if (!datosCierre) return null;

    const {
        fechaCierre,
        totalVentas,
        totalCostos,
        gananciaBruta,
        donacion,
        efectivoContado,
        diferencia,
        efectivoFinalEsperado,
        montoInicial,
        resumenPedidos
    } = datosCierre;

    const ventasPedidos = resumenPedidos?.ventasPedidos || 0;
    const totalPedidosPagados = resumenPedidos?.totalPedidosPagados || 0;
    const totalPedidosRecibidos = resumenPedidos?.totalPedidosRecibidos || 0;
    const ventasNormales = totalVentas - ventasPedidos;

    // Parsear fechaCierre que viene como string en formato "DD/MM/YYYY, HH:MM:SS AM/PM"
    let fechaReporte = 'N/A';
    let horaReporte = 'N/A';

    try {
        // Si fechaCierre es un string, intentar parsearlo
        if (typeof fechaCierre === 'string' && fechaCierre !== 'N/A') {
            // El formato viene como "2/12/2025, 6:45:00 p. m." por ejemplo
            // Separar fecha y hora
            const partes = fechaCierre.split(', ');
            if (partes.length >= 2) {
                fechaReporte = partes[0]; // "2/12/2025"
                horaReporte = partes[1].substring(0, 5); // "6:45" (primeros 5 caracteres)
            }
        } else if (fechaCierre instanceof Date) {
            fechaReporte = fechaCierre.toLocaleDateString('es-HN');
            horaReporte = fechaCierre.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });
        }
    } catch (error) {
        console.error('Error parsing fechaCierre:', error);
    }

    const handlePrint = () => {
        document.title = `Cierre_Z_${fechaReporte.replace(/\//g, '-')}`;
        window.print();
    };

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
                        <p><strong>Tipo de reporte:</strong> Reimpresión</p>
                        <p><strong>Estado:</strong> Cerrada</p>
                    </div>
                    <div className="factura-info-datos">
                        <h3>REPORTE CIERRE Z</h3>
                        <p><strong>Fecha:</strong> {fechaReporte}</p>
                        <p><strong>Hora:</strong> {horaReporte}</p>
                    </div>
                </div>

                <hr className="factura-separador" />

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
                            <td className="text-right">L. {Number(montoInicial).toFixed(2)}</td>
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
                            <td className="text-right"><strong>L. {Number(totalVentas).toFixed(2)}</strong></td>
                        </tr>
                        <tr>
                            <td className="producto-nombre" style={{ color: '#e74c3c' }}>(-) Total Costos</td>
                            <td className="text-right" style={{ color: '#e74c3c' }}>L. {Number(totalCostos).toFixed(2)}</td>
                        </tr>
                        <tr style={{ borderTop: '2px solid #27ae60' }}>
                            <td className="producto-nombre" style={{ color: '#27ae60' }}><strong>Ganancia Bruta</strong></td>
                            <td className="text-right" style={{ color: '#27ae60' }}><strong>L. {Number(gananciaBruta).toFixed(2)}</strong></td>
                        </tr>
                        <tr style={{ borderTop: '1px dashed #ccc' }}>
                            <td className="producto-nombre">Total Esperado (Inicial + Ventas)</td>
                            <td className="text-right">L. {(Number(montoInicial) + Number(totalVentas)).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td style={{ paddingLeft: '20px' }}>(-) Donación (1% Ventas)</td>
                            <td className="text-right">L. {Number(donacion).toFixed(0)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Totales */}
                <div className="factura-totales">
                    <div className="factura-totales-row factura-total-final">
                        <span>EFECTIVO FINAL ESPERADO:</span>
                        <strong>L. {Number(efectivoFinalEsperado).toFixed(2)}</strong>
                    </div>
                </div>

                {/* Dinero Contado (Solo lectura) */}
                <div className="factura-totales" style={{ marginTop: '20px' }}>
                    <div className="factura-totales-row">
                        <span>Dinero Contado Físicamente:</span>
                        <strong>L. {Number(efectivoContado).toFixed(2)}</strong>
                    </div>
                    <div className={`factura-totales-row ${diferencia < 0 ? 'faltante' : 'sobrante'}`}>
                        <span>Diferencia:</span>
                        <strong style={{ color: diferencia < 0 ? '#e74c3c' : '#27ae60' }}>
                            L. {Number(diferencia).toFixed(2)} {diferencia < 0 ? '(Faltante)' : diferencia > 0 ? '(Sobrante)' : ''}
                        </strong>
                    </div>
                </div>

                {/* Resumen de Pedidos */}
                {totalPedidosRecibidos > 0 && (
                    <div className="factura-footer" style={{ borderTop: '1px dashed #ccc', marginTop: '20px', paddingTop: '15px' }}>
                        <p className="factura-mensaje">
                            <strong>Nota:</strong> Quedan {totalPedidosRecibidos} pedidos pendientes (estado: recibido)
                        </p>
                    </div>
                )}

                <div className="factura-botones no-print">
                    <button className="btn-imprimir" onClick={handlePrint}><Printer size={18} /> Imprimir Ticket</button>
                    <button className="btn-cerrar" onClick={onClose}>Cerrar</button>
                </div>

            </div>
        </div>
    );
}

export default ModalVerCierreZ;
