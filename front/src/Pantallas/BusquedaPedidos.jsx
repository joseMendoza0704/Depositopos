import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { useNotification } from '../context/NotificationContext';
import FacturaPedido from '../components/FacturaPedido';
import '../styles/busquedaPedidos.css';

function BusquedaPedidos() {
    const { showAlert } = useNotification();
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

    // Filtros
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [clienteBusqueda, setClienteBusqueda] = useState('');

    // Cargar pedidos archivados (con o sin filtros)
    const buscarPedidos = async () => {
        setLoading(true);
        try {
            const pedidosRef = collection(db, 'pedidosArchivados');
            let q = query(pedidosRef, orderBy('fechaCreacion', 'desc'));

            if (fechaInicio && fechaFin) {
                const start = new Date(fechaInicio);
                const end = new Date(fechaFin);
                end.setHours(23, 59, 59); // Final del día
                q = query(pedidosRef, where('fechaCreacion', '>=', start), where('fechaCreacion', '<=', end), orderBy('fechaCreacion', 'desc'));
            }

            const querySnapshot = await getDocs(q);
            const docs = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                // Convertir Timestamp a Date
                fechaCreacion: doc.data().fechaCreacion?.toDate ? doc.data().fechaCreacion.toDate() : (doc.data().fechaCreacion instanceof Date ? doc.data().fechaCreacion : new Date())
            }));

            // Filtrado en memoria por cliente (búsqueda parcial insensible a mayçusculas)
            let resultados = docs;
            if (clienteBusqueda.trim()) {
                const termino = clienteBusqueda.toLowerCase();
                resultados = docs.filter(p =>
                    p.cliente?.nombre?.toLowerCase().includes(termino) ||
                    (p.cliente?.telefono && String(p.cliente.telefono).includes(termino))
                );
            }

            setPedidos(resultados);

            if (resultados.length === 0) {
                showAlert('No se encontraron pedidos con esos criterios.', 'info');
            }

        } catch (error) {
            console.error("Error buscando pedidos:", error);
            showAlert('Error al buscar pedidos. Intente nuevamente.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Carga inicial
        buscarPedidos();
    }, []);

    const handleLimpiar = () => {
        setFechaInicio('');
        setFechaFin('');
        setClienteBusqueda('');
        buscarPedidos();
    };

    return (
        <div className="busqueda-pedidos-container">

            <div className="busqueda-header">
                <h2>Historial de Pedidos Archivados</h2>
                <p>Busque y filtre los pedidos que han sido archivados tras el Cierre Z.</p>
            </div>

            {/* Panel de Filtros */}
            <div className="filtros-container">
                <div className="filtro-grupo">
                    <label>Desde:</label>
                    <input
                        type="date"
                        className="filtro-input"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                    />
                </div>

                <div className="filtro-grupo">
                    <label>Hasta:</label>
                    <input
                        type="date"
                        className="filtro-input"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                    />
                </div>

                <div className="filtro-grupo">
                    <label>Cliente:</label>
                    <input
                        type="text"
                        className="filtro-input"
                        placeholder="Ej: Juan Perez..."
                        value={clienteBusqueda}
                        onChange={(e) => setClienteBusqueda(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && buscarPedidos()}
                    />
                </div>

                <button className="boton-modal-agregar" onClick={buscarPedidos} disabled={loading} style={{ height: '42px', marginTop: '0' }}>
                    {loading ? 'Buscando...' : 'Buscar'}
                </button>

                <button className="btn-limpiar" onClick={handleLimpiar}>
                    Limpiar
                </button>
            </div>

            {/* Tabla de Resultados */}
            <div className="tabla-resultados-container">
                <table className="tabla-pedidos">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th>Teléfono</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th>Items</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>Cargando resultados...</td></tr>
                        ) : pedidos.length > 0 ? (
                            pedidos.map(pedido => (
                                <tr key={pedido.id}>
                                    <td>
                                        {pedido.fechaCreacion instanceof Date
                                            ? pedido.fechaCreacion.toLocaleDateString()
                                            : 'Fecha inválida'}
                                        {' '}
                                        {pedido.fechaCreacion instanceof Date
                                            ? pedido.fechaCreacion.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : ''}
                                    </td>
                                    <td>{pedido.cliente?.nombre || 'N/A'}</td>
                                    <td>{pedido.cliente?.telefono || '-'}</td>
                                    <td className="total-resumen">L. {Number(pedido.total || 0).toFixed(2)}</td>
                                    <td>
                                        <span className={`estado-badge estado-${pedido.estado}`}>
                                            {pedido.estado}
                                        </span>
                                    </td>
                                    <td>{pedido.items?.length || 0}</td>
                                    <td>
                                        <button
                                            className="btn-ver-detalle"
                                            onClick={() => setPedidoSeleccionado(pedido)}
                                            title="Ver Factura para Imprimir"
                                        >
                                            🖨️ Ver Factura
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="7" className="no-resultados">No se encontraron pedidos.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Factura para Imprimir */}
            {pedidoSeleccionado && (
                <FacturaPedido
                    pedido={pedidoSeleccionado}
                    onClose={() => setPedidoSeleccionado(null)}
                />
            )}

        </div>
    );
}

export default BusquedaPedidos;
