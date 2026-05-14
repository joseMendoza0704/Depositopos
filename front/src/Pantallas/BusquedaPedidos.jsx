import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { useNotification } from '../context/NotificationContext';
import FacturaPedido from '../components/FacturaPedido';
import '../styles/busquedaPedidos.css';
import { Printer } from 'lucide-react';

function BusquedaPedidos() {
    const { showAlert } = useNotification();
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Filtros
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [clienteBusqueda, setClienteBusqueda] = useState('');
    const [clientes, setClientes] = useState([]);
    const [clientesFiltrados, setClientesFiltrados] = useState([]);
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

    // Cargar clientes para el buscador
    useEffect(() => {
        const fetchClientes = async () => {
            try {
                const querySnapshot = await getDocs(query(collection(db, 'clientes'), orderBy('nombre')));
                const clientesData = querySnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(c => c.activo !== false);
                setClientes(clientesData);
            } catch (error) {
                console.error("Error al cargar clientes:", error);
            }
        };
        fetchClientes();
    }, []);

    // Filtrar clientes según búsqueda
    useEffect(() => {
        if (clienteBusqueda.trim()) {
            const termino = clienteBusqueda.toLowerCase();
            const filtrados = clientes.filter(c =>
                c.nombre?.toLowerCase().includes(termino) ||
                (c.telefono && String(c.telefono).includes(termino))
            ).slice(0, 10);
            setClientesFiltrados(filtrados);
        } else {
            setClientesFiltrados([]);
        }
    }, [clienteBusqueda, clientes]);

    // Cargar pedidos archivados (con o sin filtros)
    const buscarPedidos = async () => {
        setLoading(true);
        setHasSearched(true);
        try {
            const hasRange = fechaInicio && fechaFin;
            let start, end;
            if (hasRange) {
                const [y1, m1, d1] = fechaInicio.split('-').map(Number);
                start = new Date(y1, m1 - 1, d1, 0, 0, 0);
                const [y2, m2, d2] = fechaFin.split('-').map(Number);
                end = new Date(y2, m2 - 1, d2, 23, 59, 59);
            }

            const colecciones = ['pedidosArchivados', 'pedidos'];
            let todosLosDocs = [];

            for (const nombreCol of colecciones) {
                const colRef = collection(db, nombreCol);
                let q = query(colRef, orderBy('fechaCreacion', 'desc'));



                if (hasRange) {


                    q = query(colRef, where('fechaCreacion', '>=', start), where('fechaCreacion', '<=', end), orderBy('fechaCreacion', 'desc'));
                }

                const querySnapshot = await getDocs(q);
                const docs = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        isArchived: nombreCol === 'pedidosArchivados',
                        fechaCreacion: data.fechaCreacion?.toDate ? data.fechaCreacion.toDate() : (data.fechaCreacion instanceof Date ? data.fechaCreacion : new Date())
                    };
                });
                todosLosDocs = [...todosLosDocs, ...docs];
            }

            // Ordenar resultados combinados por fecha descendente
            todosLosDocs.sort((a, b) => b.fechaCreacion - a.fechaCreacion);

            // Filtrado en memoria por cliente
            let resultados = todosLosDocs;





            if (clienteBusqueda.trim()) {
        const termino = clienteBusqueda.toLowerCase();
        resultados = todosLosDocs.filter(p =>
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
    // buscarPedidos(); // Comentado por solicitud del usuario
}, []);

const handleLimpiar = () => {
    setFechaInicio('');
    setFechaFin('');
    setClienteBusqueda('');
    setPedidos([]);
    setHasSearched(false);
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
                    onChange={(e) => {
                        setClienteBusqueda(e.target.value);
                        setMostrarSugerencias(true);
                    }}
                    onFocus={() => setMostrarSugerencias(true)}
                    onBlur={() => setTimeout(() => setMostrarSugerencias(false), 200)}
                    onKeyDown={(e) => e.key === 'Enter' && buscarPedidos()}
                />
                {mostrarSugerencias && clientesFiltrados.length > 0 && (
                    <ul className="sugerencias-lista">
                        {clientesFiltrados.map(c => (
                            <li
                                key={c.id}
                                className="sugerencia-item"
                                onClick={() => {
                                    setClienteBusqueda(c.nombre);
                                    setMostrarSugerencias(false);
                                }}
                            >
                                <span className="sugerencia-nombre">{c.nombre}</span>
                                <span className="sugerencia-telefono">{c.telefono}</span>
                            </li>
                        ))}
                    </ul>
                )}
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
                    ) : !hasSearched ? (
                        <tr><td colSpan="7" className="no-resultados">Por favor, aplique filtros y haga clic en Buscar para ver el historial.</td></tr>
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
                                        <Printer size={16} /> Ver Factura
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan="7" className="no-resultados">No se encontraron pedidos con esos criterios.</td></tr>
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
