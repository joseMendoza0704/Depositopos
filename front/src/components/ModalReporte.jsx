import React from 'react';
import { Printer } from 'lucide-react';
import '../styles/ModalReporte.css';

const ModalReporte = ({ titulo, columnas, datos, onClose, filtros, onImprimir }) => {
    if (!datos) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content-reporte">
                <div className="modal-header">
                    <h2>{titulo}</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>

                {filtros && (
                    <div className="modal-filtros">
                        {/* Renderizar filtros dinámicamente si es necesario, o pasar componentes hijos */}
                        {filtros}
                    </div>
                )}

                <div className="modal-body" id="reporte-imprimible">
                    <div className="print-header">
                        <h1>{titulo}</h1>
                        <p>Fecha de impresión: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                    </div>
                    <table className="reporte-table">
                        <thead>
                            <tr>
                                {columnas.map((col, index) => (
                                    <th key={index}>{col.header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {datos.length > 0 ? (
                                datos.map((fila, rowIndex) => (
                                    <tr key={rowIndex}>
                                        {columnas.map((col, colIndex) => (
                                            <td key={colIndex}>
                                                {col.render ? col.render(fila) : fila[col.accessor]}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={columnas.length} className="no-data">No hay datos disponibles</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="modal-footer">
                    <button className="btn-imprimir" onClick={onImprimir || (() => window.print())}>
                        <Printer size={18} /> Imprimir
                    </button>
                    <button className="btn-cerrar" onClick={onClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalReporte;
