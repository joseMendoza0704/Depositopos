import React, { useState } from 'react';
import '../styles/Reportes.css';
import ModalReporte from '../components/ModalReporte';
import ModalVerCierreZ from '../components/ModalVerCierreZ';
import Loading from '../components/Loading';
import * as reportesData from '../utils/reportesData';

function Reportes() {
    const [loading, setLoading] = useState(false);
    const [modalConfig, setModalConfig] = useState(null); // { titulo, columnas, datos, tipoReporte }
    const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
    const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
    const [rangoPredefinido, setRangoPredefinido] = useState('hoy');
    const [cierreSeleccionado, setCierreSeleccionado] = useState(null);

    // Configuración de columnas para cada reporte
    const columnasConfig = {
        masVendidos: [
            { header: 'Producto', accessor: 'nombre' },
            { header: 'Cantidad Vendida', accessor: 'cantidad' },
            { header: 'Total Ingresos', accessor: 'total', render: row => `L. ${row.total.toFixed(2)}` }
        ],
        menosVendidos: [
            { header: 'Producto', accessor: 'nombre' },
            { header: 'Cantidad Vendida', accessor: 'cantidad' },
            { header: 'Stock Actual', accessor: 'stock' }
        ],
        pocoInventario: [
            { header: 'Producto', accessor: 'nombre' },
            { header: 'Stock Actual', accessor: 'stockUnidades' },
            { header: 'Precio Venta', accessor: 'precio', render: row => `L. ${(row.formatosVenta?.[0]?.precio || 0).toFixed(2)}` }
        ],
        agotados: [
            { header: 'Producto', accessor: 'nombre' },
            { header: 'Stock', accessor: 'stockUnidades' },
            { header: 'Último Precio', accessor: 'precio', render: row => `L. ${(row.formatosVenta?.[0]?.precio || 0).toFixed(2)}` }
        ],
        proximosVencer: [
            { header: 'Producto', accessor: 'nombre' },
            { header: 'Fecha Vencimiento', accessor: 'fechaCaducidad', render: row => row.fechaCaducidad ? row.fechaCaducidad.toDate().toLocaleDateString() : 'N/A' },
            { header: 'Días Restantes', accessor: 'diasParaVencer' },
            { header: 'Stock', accessor: 'stockUnidades' }
        ],
        vencidos: [
            { header: 'Producto', accessor: 'nombre' },
            { header: 'Fecha Vencimiento', accessor: 'fechaCaducidad', render: row => row.fechaCaducidad ? row.fechaCaducidad.toDate().toLocaleDateString() : 'N/A' },
            { header: 'Días Vencido', accessor: 'diasVencido' },
            { header: 'Stock Actual', accessor: 'stockUnidades' }
        ],
        mejoresClientes: [
            { header: 'Cliente', accessor: 'nombre' },
            { header: 'Compras Realizadas', accessor: 'totalCompras' },
            { header: 'Monto Total', accessor: 'montoTotal', render: row => `L. ${row.montoTotal.toFixed(2)}` }
        ],
        clientesInactivos: [
            { header: 'Cliente', accessor: 'nombre' },
            { header: 'Teléfono', accessor: 'telefono', render: row => row.telefono || 'N/A' },
            { header: 'Email', accessor: 'email', render: row => row.email || 'N/A' }
        ],
        gananciaBruta: [
            { header: 'Fecha', accessor: 'fecha' },
            { header: 'Total Venta', accessor: 'totalVenta', render: row => `L. ${row.totalVenta.toFixed(2)}` },
            { header: 'Costo Total', accessor: 'costoTotal', render: row => `L. ${row.costoTotal.toFixed(2)}` },
            { header: 'Ganancia', accessor: 'ganancia', render: row => `L. ${row.ganancia.toFixed(2)}` }
        ],
        cierresZ: [
            { header: 'Fecha Cierre', accessor: 'fechaCierre' },
            { header: 'Total Ventas', accessor: 'totalVentas', render: row => `L. ${row.totalVentas.toFixed(2)}` },
            { header: 'Ganancia Bruta', accessor: 'gananciaBruta', render: row => `L. ${row.gananciaBruta.toFixed(2)}` },
            { header: 'Diferencia Caja', accessor: 'diferencia', render: row => `L. ${row.diferencia.toFixed(2)}` },
            { header: 'Usuario', accessor: 'usuario' },
            {
                header: 'Acciones', accessor: 'acciones', render: row => (
                    <button className="btn-ver-cierre" onClick={() => setCierreSeleccionado(row)}>
                        👁️ Ver Ticket
                    </button>
                )
            }
        ]
    };

    const cargarDatosReporte = async (tipo, start = fechaInicio, end = fechaFin) => {
        setLoading(true);
        try {
            const { start: startDate, end: endDate } = reportesData.obtenerRangoFechas('custom', start, end);
            let datos = [];
            let titulo = '';
            let columnas = [];

            switch (tipo) {
                case 'masVendidos':
                    datos = await reportesData.getProductosMasVendidos(startDate, endDate);
                    titulo = 'Productos Más Vendidos';
                    columnas = columnasConfig.masVendidos;
                    break;
                case 'menosVendidos':
                    datos = await reportesData.getProductosMenosVendidos(startDate, endDate);
                    titulo = 'Productos Menos Vendidos';
                    columnas = columnasConfig.menosVendidos;
                    break;
                case 'pocoInventario':
                    datos = await reportesData.getProductosPocoInventario();
                    titulo = 'Productos con Poco Inventario';
                    columnas = columnasConfig.pocoInventario;
                    break;
                case 'agotados':
                    datos = await reportesData.getProductosAgotados();
                    titulo = 'Productos Agotados';
                    columnas = columnasConfig.agotados;
                    break;
                case 'proximosVencer':
                    datos = await reportesData.getProductosProximosVencer();
                    titulo = 'Productos Próximos a Vencer';
                    columnas = columnasConfig.proximosVencer;
                    break;
                case 'vencidos':
                    datos = await reportesData.getProductosVencidos();
                    titulo = 'Productos Vencidos';
                    columnas = columnasConfig.vencidos;
                    break;
                case 'mejoresClientes':
                    datos = await reportesData.getClientesMasCompras(startDate, endDate);
                    titulo = 'Clientes con Más Compras';
                    columnas = columnasConfig.mejoresClientes;
                    break;
                case 'clientesInactivos':
                    datos = await reportesData.getClientesInactivos();
                    titulo = 'Clientes Inactivos (+3 meses sin compra)';
                    columnas = columnasConfig.clientesInactivos;
                    break;
                case 'gananciaBruta':
                    datos = await reportesData.getGananciaBruta(startDate, endDate);
                    titulo = 'Ganancia Bruta por Venta';
                    columnas = columnasConfig.gananciaBruta;
                    break;
                case 'cierresZ':
                    datos = await reportesData.getCierresZ(startDate, endDate);
                    titulo = 'Historial de Cierres Z';
                    columnas = columnasConfig.cierresZ;
                    break;
                case 'top10MasVendidos':
                    datos = (await reportesData.getProductosMasVendidos(startDate, endDate)).slice(0, 10);
                    titulo = 'Top 10 Productos Más Vendidos';
                    columnas = columnasConfig.masVendidos;
                    break;
                case 'top10MenosVendidos':
                    datos = (await reportesData.getProductosMenosVendidos(startDate, endDate)).slice(0, 10);
                    titulo = 'Top 10 Productos Menos Vendidos';
                    columnas = columnasConfig.menosVendidos;
                    break;
                default:
                    break;
            }

            setModalConfig({
                tipoReporte: tipo,
                titulo,
                columnas,
                datos
            });
        } catch (error) {
            console.error("Error cargando reporte:", error);
            // alert("Error al cargar el reporte. Revise la consola."); // Removed alert
        } finally {
            setLoading(false);
        }
    };

    const handleAbrirReporte = (tipo) => {
        cargarDatosReporte(tipo);
    };

    const handleFiltroFechaChange = (e, campo) => {
        const valor = e.target.value;
        if (campo === 'inicio') setFechaInicio(valor);
        if (campo === 'fin') setFechaFin(valor);

        if (modalConfig) {
            const nuevoInicio = campo === 'inicio' ? valor : fechaInicio;
            const nuevoFin = campo === 'fin' ? valor : fechaFin;
            cargarDatosReporte(modalConfig.tipoReporte, nuevoInicio, nuevoFin);
        }
    };

    const handleRangoRapido = (rango) => {
        setRangoPredefinido(rango);
        const { start, end } = reportesData.obtenerRangoFechas(rango);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        setFechaInicio(startStr);
        setFechaFin(endStr);

        if (modalConfig) {
            cargarDatosReporte(modalConfig.tipoReporte, startStr, endStr);
        }
    };

    const renderFiltros = () => {
        const sinFecha = ['pocoInventario', 'agotados', 'proximosVencer', 'vencidos', 'clientesInactivos'];
        if (modalConfig && sinFecha.includes(modalConfig.tipoReporte)) return null;

        return (
            <div className="filtros-container">
                <div className="rango-rapido">
                    <button className={rangoPredefinido === 'hoy' ? 'active' : ''} onClick={() => handleRangoRapido('hoy')}>Hoy</button>
                    <button className={rangoPredefinido === 'semana' ? 'active' : ''} onClick={() => handleRangoRapido('semana')}>Semana</button>
                    <button className={rangoPredefinido === 'mes' ? 'active' : ''} onClick={() => handleRangoRapido('mes')}>Mes</button>
                </div>
                <div className="fechas-custom">
                    <label>Desde: <input type="date" value={fechaInicio} onChange={(e) => handleFiltroFechaChange(e, 'inicio')} /></label>
                    <label>Hasta: <input type="date" value={fechaFin} onChange={(e) => handleFiltroFechaChange(e, 'fin')} /></label>
                </div>
            </div>
        );
    };

    return (
        <div className="reportes-dashboard">
            <h1 className="dashboard-title">Panel de Reportes</h1>
            <p className="dashboard-subtitle">Selecciona un reporte para visualizar los detalles</p>

            {loading && <Loading />}

            <div className="botones-grid">
                <button className="btn-reporte" onClick={() => handleAbrirReporte('masVendidos')}>
                    <span className="icon">📈</span>
                    <span className="text">Productos Más Vendidos</span>
                </button>
                <button className="btn-reporte" onClick={() => handleAbrirReporte('menosVendidos')}>
                    <span className="icon">📉</span>
                    <span className="text">Productos Menos Vendidos</span>
                </button>
                <button className="btn-reporte warning" onClick={() => handleAbrirReporte('pocoInventario')}>
                    <span className="icon">⚠️</span>
                    <span className="text">Poco Inventario</span>
                </button>
                <button className="btn-reporte danger" onClick={() => handleAbrirReporte('agotados')}>
                    <span className="icon">🚫</span>
                    <span className="text">Productos Agotados</span>
                </button>
                <button className="btn-reporte info" onClick={() => handleAbrirReporte('proximosVencer')}>
                    <span className="icon">⏰</span>
                    <span className="text">Próximos a Vencer</span>
                </button>
                <button className="btn-reporte danger" onClick={() => handleAbrirReporte('vencidos')}>
                    <span className="icon">❌</span>
                    <span className="text">Productos Vencidos</span>
                </button>
                <button className="btn-reporte success" onClick={() => handleAbrirReporte('mejoresClientes')}>
                    <span className="icon">🥇</span>
                    <span className="text">Clientes VIP</span>
                </button>
                <button className="btn-reporte" onClick={() => handleAbrirReporte('clientesInactivos')}>
                    <span className="icon">💤</span>
                    <span className="text">Clientes Inactivos</span>
                </button>
                <button className="btn-reporte money" onClick={() => handleAbrirReporte('gananciaBruta')}>
                    <span className="icon">💰</span>
                    <span className="text">Ganancia Bruta</span>
                </button>
                <button className="btn-reporte" onClick={() => handleAbrirReporte('cierresZ')}>
                    <span className="icon">📑</span>
                    <span className="text">Reporte Cierres Z</span>
                </button>
                <button className="btn-reporte" onClick={() => handleAbrirReporte('top10MasVendidos')}>
                    <span className="icon">🔝</span>
                    <span className="text">Top 10 Más Vendidos</span>
                </button>
                <button className="btn-reporte" onClick={() => handleAbrirReporte('top10MenosVendidos')}>
                    <span className="icon">🔻</span>
                    <span className="text">Top 10 Menos Vendidos</span>
                </button>
            </div>

            {modalConfig && (
                <ModalReporte
                    titulo={modalConfig.titulo}
                    columnas={modalConfig.columnas}
                    datos={modalConfig.datos}
                    onClose={() => setModalConfig(null)}
                    filtros={renderFiltros()}
                />
            )}

            {cierreSeleccionado && (
                <ModalVerCierreZ
                    datosCierre={cierreSeleccionado}
                    onClose={() => setCierreSeleccionado(null)}
                />
            )}
        </div>
    );
}

export default Reportes;
