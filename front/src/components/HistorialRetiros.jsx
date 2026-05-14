import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, getDocs, where, Timestamp } from 'firebase/firestore';
import { X, Printer, Calendar } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import '../styles/factura.css';

function HistorialRetiros({ onClose }) {
    const { showAlert } = useNotification();
    const [retiros, setRetiros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
    const [retiroIndividual, setRetiroIndividual] = useState(null);

    useEffect(() => {
        fetchRetiros();
    }, [fechaFiltro]);

    const fetchRetiros = async () => {
        try {
            setLoading(true);
            const retirosRef = collection(db, 'retirosInventario');
            
            const start = new Date(fechaFiltro + 'T00:00:00');
            const end = new Date(fechaFiltro + 'T23:59:59');

            const q = query(
                retirosRef,
                where('fecha', '>=', Timestamp.fromDate(start)),
                where('fecha', '<=', Timestamp.fromDate(end)),
                orderBy('fecha', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                fechaFormateada: doc.data().fecha.toDate()
            }));
            setRetiros(data);
        } catch (error) {
            console.error("Error al cargar historial de retiros:", error);
            showAlert("Error al cargar el historial.", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePrintSingle = (retiro) => {
        setRetiroIndividual(retiro);
        setTimeout(() => {
            window.print();
            setRetiroIndividual(null);
        }, 500);
    };

    const handlePrintAll = () => {
        setRetiroIndividual(null);
        setTimeout(() => {
            window.print();
        }, 500);
    };

    return (
        <div className="modal-backdrop">
            
            {/* SECCIÓN DE INTERFAZ (OCULTA AL IMPRIMIR) */}
            <div className="modal-content no-print" style={{ maxWidth: '1000px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '0' }}>
                <div className="modal-header" style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#2c3e50' }}>Historial de Retiros</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#95a5a6' }}>
                        <X size={28} />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'flex-end', backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '10px', border: '1px solid #eee' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#7f8c8d' }}>Seleccionar Fecha:</label>
                            <input 
                                type="date" 
                                value={fechaFiltro} 
                                onChange={(e) => setFechaFiltro(e.target.value)}
                                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '1rem', width: '200px' }}
                            />
                        </div>
                        
                        <button 
                            className="boton-modal-agregar"
                            onClick={handlePrintAll}
                            style={{ height: '42px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#2c3e50' }}
                            disabled={retiros.length === 0}
                        >
                            <Printer size={18} /> Imprimir Reporte Diario
                        </button>
                    </div>

                    <div className="tabla-resultados-container">
                        <table className="tabla-pedidos">
                            <thead>
                                <tr>
                                    <th>Hora</th>
                                    <th>Responsable</th>
                                    <th>Destino</th>
                                    <th>Productos</th>
                                    <th style={{ textAlign: 'center' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>Cargando datos...</td></tr>
                                ) : retiros.length === 0 ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#95a5a6' }}>No hay registros.</td></tr>
                                ) : (
                                    retiros.map(retiro => (
                                        <tr key={retiro.id}>
                                            <td style={{ fontWeight: '600' }}>{retiro.fechaFormateada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td>{retiro.responsable}</td>
                                            <td><span className="estado-badge" style={{ backgroundColor: '#ecf0f1', color: '#2c3e50' }}>{retiro.destino}</span></td>
                                            <td style={{ fontSize: '0.85rem' }}>
                                                {retiro.items.slice(0, 2).map((item, i) => (
                                                    <div key={i}>• {item.cantidad}x {item.nombre}</div>
                                                ))}
                                                {retiro.items.length > 2 && <div style={{ color: '#7f8c8d', fontStyle: 'italic' }}>...y {retiro.items.length - 2} más</div>}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button 
                                                    onClick={() => handlePrintSingle(retiro)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3498db' }}
                                                >
                                                    <Printer size={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* SECCIÓN IMPRIMIBLE (DIRECTA EN EL BACKDROP COMO COMPROBANTERETIRO) */}
            <div className="print-only">
                {retiroIndividual ? (
                    <div className="factura-container" id="factura-imprimible">
                        <div className="factura-empresa">
                            <div className="factura-logo">
                                <img src="/logo_fact.png" alt="Logo Depósito Mendoza" />
                            </div>
                            <p className="factura-empresa-info">Dirección: Barrio el centro 5ta calle en frente a pollolandia</p>
                            <p className="factura-empresa-info">Teléfono: +504 3390-6236</p>
                            <p className="factura-empresa-info">Email: mendozadeposito0704@gmail.com</p>
                        </div>

                        <div className="factura-info-section">
                            <div className="factura-info-cliente">
                                <p><strong>Retirado por:</strong> {retiroIndividual.responsable}</p>
                                <p><strong>Destino:</strong> {retiroIndividual.destino || 'Otro Negocio'}</p>
                            </div>
                            <div className="factura-info-datos">
                                <h3>COMPROBANTE DE RETIRO</h3>
                                <p><strong>Fecha:</strong> {retiroIndividual.fechaFormateada.toLocaleDateString()}</p>
                                <p><strong>Hora:</strong> {retiroIndividual.fechaFormateada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>

                        <hr className="factura-separador" />

                        <table className="factura-productos-tabla">
                            <thead>
                                <tr>
                                    <th className="col-producto">Producto</th>
                                    <th className="col-cantidad">Cant.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {retiroIndividual.items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="producto-nombre">
                                            {item.nombre}
                                            <span className="producto-formato">({item.formato})</span>
                                        </td>
                                        <td className="text-center">{item.cantidad}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="firma-section" style={{ marginTop: '50px', textAlign: 'center' }}>
                            <hr style={{ width: '50%', margin: '0 auto 10px auto', borderTop: '1px solid #000' }} />
                            <p>Firma de Recibido</p>
                        </div>

                        <div className="factura-footer">
                            <p className="factura-mensaje">Este documento es un comprobante de retiro de inventario.</p>
                        </div>
                    </div>
                ) : (
                    <div className="factura-container-wide" id="reporte-imprimible">
                        <div className="factura-empresa">
                            <div className="factura-logo">
                                <img src="/logo_fact.png" alt="Logo" />
                            </div>
                            <h2>REPORTE DIARIO DE RETIROS</h2>
                            <p style={{ fontSize: '1.2rem' }}>Fecha: <strong>{new Date(fechaFiltro + 'T00:00:00').toLocaleDateString('es-HN')}</strong></p>
                        </div>
                        
                        {retiros.map((retiro, idx) => (
                            <div key={retiro.id} style={{ marginBottom: '40px', border: '1px solid #000', padding: '15px', pageBreakInside: 'avoid' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', marginBottom: '10px' }}>
                                    <span><strong>Movimiento #{retiros.length - idx}</strong></span>
                                    <span><strong>Hora:</strong> {retiro.fechaFormateada.toLocaleTimeString()}</span>
                                    <span><strong>Responsable:</strong> {retiro.responsable}</span>
                                    <span><strong>Destino:</strong> {retiro.destino}</span>
                                </div>
                                <table className="factura-productos-tabla">
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th className="text-center">Cant.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {retiro.items.map((item, i) => (
                                            <tr key={i}>
                                                <td className="producto-nombre">{item.nombre} ({item.formato})</td>
                                                <td className="text-center">{item.cantidad}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style>
                {`
                .print-only { display: none; }

                @media print {
                    /* Ocultar UI */
                    .no-print, .modal-content {
                        display: none !important;
                    }

                    /* Resetear Backdrop */
                    .modal-backdrop {
                        position: static !important;
                        background: white !important;
                        display: block !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        visibility: visible !important;
                    }

                    /* Mostrar Imprimible */
                    .print-only {
                        display: block !important;
                        visibility: visible !important;
                    }

                    .factura-container, .factura-container-wide {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        box-shadow: none !important;
                        border: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        overflow: visible !important;
                        visibility: visible !important;
                    }

                    #factura-imprimible *, #reporte-imprimible * {
                        visibility: visible !important;
                    }
                }
                `}
            </style>
        </div>
    );
}

export default HistorialRetiros;
