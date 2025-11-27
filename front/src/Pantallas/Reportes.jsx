
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import '../styles/Reportes.css';
import Loading from '../components/Loading';

function Reportes() {
    const [rangoTiempo, setRangoTiempo] = useState('mes'); // hoy, semana, mes, custom
    const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [loading, setLoading] = useState(true);
    const [metricas, setMetricas] = useState({
        ventasTotales: 0,
        pedidosCompletados: 0,
        ticketPromedio: 0,
        topProductos: [],
        topClientes: [],
        ventasPorDia: [],
        alertasInventario: []
    });

    useEffect(() => {
        fetchData();
    }, [rangoTiempo, mesSeleccionado]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const now = new Date();
            let startDate = new Date();
            let endDate = new Date();

            if (rangoTiempo === 'hoy') {
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
            } else if (rangoTiempo === 'semana') {
                startDate.setDate(now.getDate() - 7);
            } else if (rangoTiempo === 'mes') {
                // Usar el mes seleccionado
                const [year, month] = mesSeleccionado.split('-');
                startDate = new Date(year, month - 1, 1);
                endDate = new Date(year, month, 0, 23, 59, 59, 999);
            }

            // 1. Fetch Ventas (Caja)
            const ventasRef = collection(db, 'ventas');
            const qVentas = query(ventasRef, where('fecha', '>=', startDate), where('fecha', '<=', endDate));
            const ventasSnap = await getDocs(qVentas);

            // 2. Fetch Pedidos
            const pedidosRef = collection(db, 'pedidos');
            const qPedidos = query(pedidosRef, where('fechaPago', '>=', startDate), where('fechaPago', '<=', endDate), where('estado', '==', 'pagado'));
            const pedidosSnap = await getDocs(qPedidos);

            // 3. Fetch Productos (para alertas)
            const productosRef = collection(db, 'productos');
            const productosSnap = await getDocs(productosRef);

            let totalVentas = 0;
            let countTransacciones = 0;
            let productosMap = {};
            let clientesMap = {};
            let ventasDiaMap = {};

            // Procesar Ventas de Caja
            ventasSnap.forEach(doc => {
                const data = doc.data();
                totalVentas += data.totalVenta || 0;
                countTransacciones++;

                const fechaStr = data.fecha.toDate().toLocaleDateString();
                ventasDiaMap[fechaStr] = (ventasDiaMap[fechaStr] || 0) + (data.totalVenta || 0);

                if (data.items) {
                    data.items.forEach(item => {
                        productosMap[item.nombre] = (productosMap[item.nombre] || 0) + (item.cantidad || 1);
                    });
                }

                // Ventas de caja suelen ser "Cliente General" a menos que se especifique
                clientesMap['Cliente General'] = (clientesMap['Cliente General'] || 0) + (data.totalVenta || 0);
            });

            // Procesar Pedidos
            pedidosSnap.forEach(doc => {
                const data = doc.data();
                totalVentas += data.total || 0;
                countTransacciones++;

                const fechaStr = data.fechaPago.toDate().toLocaleDateString();
                ventasDiaMap[fechaStr] = (ventasDiaMap[fechaStr] || 0) + (data.total || 0);

                if (data.items) {
                    data.items.forEach(item => {
                        productosMap[item.nombre] = (productosMap[item.nombre] || 0) + (item.cantidad || 1);
                    });
                }

                // Top Clientes
                const nombreCliente = data.cliente?.nombre || 'Cliente Desconocido';
                clientesMap[nombreCliente] = (clientesMap[nombreCliente] || 0) + (data.total || 0);
            });

            // Calcular Top Productos
            const topProductos = Object.entries(productosMap)
                .map(([nombre, cantidad]) => ({ nombre, cantidad }))
                .sort((a, b) => b.cantidad - a.cantidad)
                .slice(0, 5);

            // Calcular Top Clientes
            const topClientes = Object.entries(clientesMap)
                .map(([nombre, total]) => ({ nombre, total }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 5);

            // Alertas de Inventario
            const alertasInventario = [];
            const hoy = new Date();
            productosSnap.forEach(doc => {
                const prod = doc.data();
                if (prod.fechaCaducidad) {
                    const fechaCad = prod.fechaCaducidad.toDate();
                    const diasDiff = Math.ceil((fechaCad - hoy) / (1000 * 60 * 60 * 24));

                    if (diasDiff < 0) {
                        alertasInventario.push({ ...prod, id: doc.id, estado: 'vencido', dias: Math.abs(diasDiff) });
                    } else if (diasDiff <= 7) {
                        alertasInventario.push({ ...prod, id: doc.id, estado: 'proximo', dias: diasDiff });
                    }
                }
            });

            // Formatear datos para gráfico
            const ventasPorDia = Object.entries(ventasDiaMap).map(([fecha, total]) => ({ fecha, total }));

            setMetricas({
                ventasTotales: totalVentas,
                pedidosCompletados: countTransacciones,
                ticketPromedio: countTransacciones > 0 ? totalVentas / countTransacciones : 0,
                topProductos,
                topClientes,
                ventasPorDia,
                alertasInventario
            });

        } catch (error) {
            console.error("Error fetching report data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="reportes-container">
            <div className="reportes-header">
                <h2>Reportes del Negocio</h2>
                <div className="filtros-tiempo">
                    <button
                        className={`btn-filtro ${rangoTiempo === 'hoy' ? 'active' : ''}`}
                        onClick={() => setRangoTiempo('hoy')}
                    >
                        Hoy
                    </button>
                    <button
                        className={`btn-filtro ${rangoTiempo === 'semana' ? 'active' : ''}`}
                        onClick={() => setRangoTiempo('semana')}
                    >
                        Esta Semana
                    </button>
                    <div className="filtro-mes-container">
                        <button
                            className={`btn-filtro ${rangoTiempo === 'mes' ? 'active' : ''}`}
                            onClick={() => setRangoTiempo('mes')}
                        >
                            Mes
                        </button>
                        {rangoTiempo === 'mes' && (
                            <input
                                type="month"
                                value={mesSeleccionado}
                                onChange={(e) => setMesSeleccionado(e.target.value)}
                                className="input-mes"
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Tarjetas de Resumen */}
            <div className="resumen-cards">
                <div className="card-reporte venta-total">
                    <h3>Ventas Totales</h3>
                    <p className="monto">L. {metricas.ventasTotales.toFixed(2)}</p>
                </div>
                <div className="card-reporte pedidos-total">
                    <h3>Transacciones</h3>
                    <p className="numero">{metricas.pedidosCompletados}</p>
                </div>
                <div className="card-reporte ticket-promedio">
                    <h3>Ticket Promedio</h3>
                    <p className="monto">L. {metricas.ticketPromedio.toFixed(2)}</p>
                </div>
            </div>

            <div className="reportes-grid-avanzado">

                {/* Columna Izquierda: Gráfico y Alertas */}
                <div className="columna-izquierda">
                    <div className="chart-section">
                        <h3>Tendencia de Ventas</h3>
                        <div className="simple-bar-chart">
                            {metricas.ventasPorDia.length > 0 ? (
                                metricas.ventasPorDia.map((dia, index) => (
                                    <div key={index} className="bar-container">
                                        <div
                                            className="bar"
                                            style={{ height: `${(dia.total / Math.max(...metricas.ventasPorDia.map(d => d.total))) * 100}% ` }}
                                            title={`L.${dia.total} `}
                                        ></div>
                                        <span className="bar-label">{dia.fecha.split('/')[0]}/{dia.fecha.split('/')[1]}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="no-data">No hay datos para este periodo.</p>
                            )}
                        </div>
                    </div>

                    <div className="alertas-section">
                        <h3>⚠️ Alertas de Inventario</h3>
                        {metricas.alertasInventario.length > 0 ? (
                            <ul className="alertas-list">
                                {metricas.alertasInventario.map(prod => (
                                    <li key={prod.id} className={`alerta-item ${prod.estado}`}>
                                        <span className="alerta-icon">{prod.estado === 'vencido' ? '❌' : '⚠️'}</span>
                                        <div className="alerta-info">
                                            <span className="alerta-nombre">{prod.nombre}</span>
                                            <span className="alerta-msg">
                                                {prod.estado === 'vencido'
                                                    ? `Venció hace ${prod.dias} días`
                                                    : `Vence en ${prod.dias} días`}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="no-data-ok">✅ Todo el inventario está en orden.</p>
                        )}
                    </div>
                </div>

                {/* Columna Derecha: Tops */}
                <div className="columna-derecha">
                    <div className="top-section">
                        <h3>🏆 Top Productos</h3>
                        <ul className="top-list">
                            {metricas.topProductos.map((prod, index) => (
                                <li key={index} className="top-item">
                                    <span className="rank">#{index + 1}</span>
                                    <span className="name">{prod.nombre}</span>
                                    <span className="value">{prod.cantidad} un.</span>
                                </li>
                            ))}
                            {metricas.topProductos.length === 0 && <p className="no-data">Sin datos.</p>}
                        </ul>
                    </div>

                    <div className="top-section">
                        <h3>🥇 Mejores Clientes</h3>
                        <ul className="top-list">
                            {metricas.topClientes.map((cliente, index) => (
                                <li key={index} className="top-item">
                                    <span className="rank">#{index + 1}</span>
                                    <span className="name">{cliente.nombre}</span>
                                    <span className="value">L. {cliente.total.toFixed(0)}</span>
                                </li>
                            ))}
                            {metricas.topClientes.length === 0 && <p className="no-data">Sin datos.</p>}
                        </ul>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Reportes;

