import React from 'react';
import { Printer } from 'lucide-react';
import '../styles/factura.css'; // Reutilizamos los estilos de factura para consistencia

function ComprobanteRetiro({ retiro, onClose }) {
    // Manejar la fecha de retiro
    const fechaRetiro = retiro.fecha ? retiro.fecha.toLocaleDateString('es-HN') : new Date().toLocaleDateString('es-HN');
    const horaRetiro = retiro.fecha ? retiro.fecha.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });

    const handlePrint = () => {
        document.title = `Retiro - ${retiro.responsable}`;
        window.print();
        setTimeout(() => { document.title = 'Deposito POS'; }, 500);
    };

    return (
        <div className="modal-backdrop">
            <div className="factura-container" id="factura-imprimible">

                {/* Header con Logo y Datos de la Empresa */}
                <div className="factura-empresa">
                    <div className="factura-logo">
                        <img src="/logo_fact.png" alt="Logo Depósito Mendoza" />
                    </div>
                    <p className="factura-empresa-info">Dirección: Barrio el centro 5ta calle en frente a pollolandia</p>
                    <p className="factura-empresa-info">Teléfono: +504 3390-6236</p>
                    <p className="factura-empresa-info">Email: mendozadeposito0704@gmail.com</p>
                </div>

                {/* Información del Retiro */}
                <div className="factura-info-section">
                    <div className="factura-info-cliente">
                        <p><strong>Retirado por:</strong> {retiro.responsable}</p>
                        <p><strong>Destino:</strong> {retiro.destino || 'Otro Negocio'}</p>
                    </div>
                    <div className="factura-info-datos">
                        <h3>COMPROBANTE DE RETIRO</h3>
                        <p><strong>Fecha:</strong> {fechaRetiro}</p>
                        <p><strong>Hora:</strong> {horaRetiro}</p>
                    </div>
                </div>

                {/* Separador */}
                <hr className="factura-separador" />

                {/* Tabla de Productos */}
                <table className="factura-productos-tabla">
                    <thead>
                        <tr>
                            <th className="col-producto">Producto</th>
                            <th className="col-cantidad">Cant.</th>
                            {/* Sin columnas de precio */}
                        </tr>
                    </thead>
                    <tbody>
                        {retiro.items.map((item, index) => (
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

                {/* Espacio para firma */}
                <div className="firma-section" style={{ marginTop: '50px', textAlign: 'center' }}>
                    <hr style={{ width: '50%', margin: '0 auto 10px auto', borderTop: '1px solid #000' }} />
                    <p>Firma de Recibido</p>
                </div>

                {/* Pie de Comprobante */}
                <div className="factura-footer">
                    <p className="factura-mensaje">Este documento es un comprobante de retiro de inventario.</p>
                </div>

                {/* Botones (no se imprimen) */}
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

export default ComprobanteRetiro;
