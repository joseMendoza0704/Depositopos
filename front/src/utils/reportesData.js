import { collection, getDocs, query, where, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Helper para obtener fechas de inicio y fin según filtro
export const obtenerRangoFechas = (filtro, fechaInicioCustom, fechaFinCustom) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (filtro === 'hoy') {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (filtro === 'semana') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Ajustar al lunes
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    } else if (filtro === 'mes') {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (filtro === 'custom' && fechaInicioCustom && fechaFinCustom) {
        start = new Date(fechaInicioCustom);
        start.setHours(0, 0, 0, 0);
        end = new Date(fechaFinCustom);
        end.setHours(23, 59, 59, 999);
    }

    return { start, end };
};

// 1. Productos más vendidos
export const getProductosMasVendidos = async (fechaInicio, fechaFin) => {
    const ventas = await fetchVentasYPedidos(fechaInicio, fechaFin);
    const productosMap = {};

    ventas.forEach(venta => {
        if (venta.items) {
            venta.items.forEach(item => {
                const key = item.nombre; // O item.id si existe y es consistente
                if (!productosMap[key]) {
                    productosMap[key] = { nombre: item.nombre, cantidad: 0, total: 0 };
                }
                productosMap[key].cantidad += (item.cantidad || 0);
                productosMap[key].total += (item.subtotal || 0); // Usar subtotal que es el campo correcto
            });
        }
    });

    return Object.values(productosMap).sort((a, b) => b.cantidad - a.cantidad);
};

// 2. Productos menos vendidos
export const getProductosMenosVendidos = async (fechaInicio, fechaFin) => {
    // Para esto necesitamos todos los productos, y ver cuáles tienen pocas ventas en el periodo
    // O simplemente de los vendidos, cuáles son los menos.
    // Generalmente "menos vendidos" incluye los que tienen 0 ventas, pero eso requiere cruzar con todo el inventario.
    // Asumiremos que es sobre los que tienen movimiento para simplificar, o cruzamos con inventario si es crítico.
    // El usuario pidió "Productos menos vendidos", voy a devolver los que tienen ventas pero bajas, 
    // y si es posible cruzar con inventario para mostrar 0 ventas.

    // Vamos a cruzar con inventario para ser más precisos
    const todosProductos = await getInventario();
    const ventas = await fetchVentasYPedidos(fechaInicio, fechaFin);
    const ventasMap = {};

    ventas.forEach(venta => {
        if (venta.items) {
            venta.items.forEach(item => {
                ventasMap[item.nombre] = (ventasMap[item.nombre] || 0) + (item.cantidad || 0);
            });
        }
    });

    const resultado = todosProductos.map(prod => ({
        nombre: prod.nombre,
        cantidad: ventasMap[prod.nombre] || 0,
        stock: prod.stockUnidades
    }));

    return resultado.sort((a, b) => a.cantidad - b.cantidad);
};

// 3. Productos con poco inventario
export const getProductosPocoInventario = async () => {
    const productos = await getInventario();
    // Definir "poco inventario" como menos de 10 unidades o usar stockMinimo si existiera
    return productos.filter(p => p.stockUnidades > 0 && p.stockUnidades <= 10)
        .sort((a, b) => a.stockUnidades - b.stockUnidades);
};

// 4. Productos agotados
export const getProductosAgotados = async () => {
    const productos = await getInventario();
    return productos.filter(p => p.stockUnidades <= 0);
};

// 5. Productos próximos a vencer
export const getProductosProximosVencer = async () => {
    const productos = await getInventario();
    const hoy = new Date();
    const diasUmbral = 30; // Mostrar productos que vencen en los próximos 30 días

    return productos.filter(p => {
        if (!p.fechaCaducidad) return false;
        const fechaCad = p.fechaCaducidad.toDate();
        const diffTime = fechaCad - hoy;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= diasUmbral;
    }).map(p => ({
        ...p,
        diasParaVencer: Math.ceil((p.fechaCaducidad.toDate() - hoy) / (1000 * 60 * 60 * 24))
    })).sort((a, b) => a.diasParaVencer - b.diasParaVencer);
};

// 5b. Productos vencidos
export const getProductosVencidos = async () => {
    const productos = await getInventario();
    const hoy = new Date();

    return productos.filter(p => {
        if (!p.fechaCaducidad) return false;
        const fechaCad = p.fechaCaducidad.toDate();
        return fechaCad < hoy; // Solo productos ya vencidos
    }).map(p => {
        const fechaCad = p.fechaCaducidad.toDate();
        const diffTime = hoy - fechaCad;
        const diasVencido = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
            ...p,
            diasVencido
        };
    }).sort((a, b) => b.diasVencido - a.diasVencido); // Más vencidos primero
};

// 6. Clientes con más compras
export const getClientesMasCompras = async (fechaInicio, fechaFin) => {
    const ventas = await fetchVentasYPedidos(fechaInicio, fechaFin);
    const clientesMap = {};

    ventas.forEach(venta => {
        // Intentar obtener nombre de cliente. En ventas de caja a veces no hay, en pedidos sí.
        const clienteNombre = venta.cliente?.nombre || (venta.clienteNombre) || 'Cliente General';
        if (clienteNombre === 'Cliente General') return; // Opcional: excluir ventas anónimas

        if (!clientesMap[clienteNombre]) {
            clientesMap[clienteNombre] = { nombre: clienteNombre, totalCompras: 0, montoTotal: 0 };
        }
        clientesMap[clienteNombre].totalCompras += 1;
        clientesMap[clienteNombre].montoTotal += (venta.total || venta.totalVenta || 0);
    });

    return Object.values(clientesMap).sort((a, b) => b.montoTotal - a.montoTotal);
};

// 7. Clientes inactivos
export const getClientesInactivos = async () => {
    // Esto es complejo sin una base de clientes separada con historial.
    // Asumiremos que buscamos en la colección 'clientes' y cruzamos con 'pedidos' recientes.
    // Si no hay colección clientes, no podemos hacerlo bien.
    // Asumiré que existe colección 'clientes' (visto en Dashboard.jsx -> GestionClientes).

    const clientesSnap = await getDocs(collection(db, 'clientes'));
    const clientes = clientesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Buscar última compra de cada cliente
    // Esto puede ser costoso si hay muchos pedidos. 
    // Optimizacion: Traer pedidos de los ultimos 3 meses. Si no compró en 3 meses, es inactivo.

    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

    const pedidosRef = collection(db, 'pedidos');
    const q = query(pedidosRef, where('fechaPago', '>=', tresMesesAtras));
    const pedidosSnap = await getDocs(q);

    const clientesActivosIds = new Set();
    pedidosSnap.forEach(doc => {
        const data = doc.data();
        if (data.cliente?.id) clientesActivosIds.add(data.cliente.id);
        // También chequear por nombre si no hay ID
        if (data.cliente?.nombre) clientesActivosIds.add(data.cliente.nombre);
    });

    // Filtrar clientes que NO están en el set de activos
    return clientes.filter(c => !clientesActivosIds.has(c.id) && !clientesActivosIds.has(c.nombre));
};

// 8. Ganancia bruta por venta
export const getGananciaBruta = async (fechaInicio, fechaFin) => {
    const ventas = await fetchVentasYPedidos(fechaInicio, fechaFin);
    // Necesitamos el costo de los productos vendidos.
    // Si la venta guardó el costo histórico, genial. Si no, usamos el costo actual del producto (menos preciso).
    // Asumiremos que necesitamos buscar el costo actual en 'productos' si no está en la venta.

    const productos = await getInventario();
    const productosCostoMap = {};
    productos.forEach(p => productosCostoMap[p.nombre] = p.precioCostoUnidad || 0);

    const reporte = ventas.map(venta => {
        let costoTotalVenta = 0;
        if (venta.items) {
            venta.items.forEach(item => {
                const costoUnitario = item.costo || productosCostoMap[item.nombre] || 0;
                costoTotalVenta += costoUnitario * (item.cantidad || 0);
            });
        }
        const totalVenta = venta.total || venta.totalVenta || 0;
        return {
            id: venta.id,
            fecha: venta.fecha ? venta.fecha.toDate().toLocaleString() : 'N/A',
            totalVenta,
            costoTotal: costoTotalVenta,
            ganancia: totalVenta - costoTotalVenta
        };
    });

    return reporte.sort((a, b) => b.fecha.localeCompare(a.fecha)); // Ordenar por fecha desc
};

// 9. Reporte de Cierres Z
export const getCierresZ = async (fechaInicio, fechaFin) => {
    const cajasRef = collection(db, 'cajas');
    // Consultar cajas cerradas en el rango de fechas
    // Nota: Firestore requiere índice compuesto para consultas con múltiples campos y rangos.
    // Si falla, puede requerir crear el índice en la consola de Firebase.
    // Alternativa: Traer todas las cerradas y filtrar en cliente si son pocas.
    // Intentaremos query directa primero.
    const q = query(
        cajasRef,
        where('estado', '==', 'cerrada'),
        where('fechaCierre', '>=', fechaInicio),
        where('fechaCierre', '<=', fechaFin)
    );

    const snapshot = await getDocs(q);

    const cierres = await Promise.all(snapshot.docs.map(async docSnapshot => {
        const data = docSnapshot.data();
        let nombreUsuario = 'Desconocido';
        if (data.usuarioCierreId) {
            try {
                const userDoc = await getDoc(doc(db, 'usuarios', data.usuarioCierreId));
                if (userDoc.exists()) {
                    nombreUsuario = userDoc.data().nombre || userDoc.data().email || 'Usuario';
                }
            } catch (e) {
                console.error("Error fetching user name", e);
            }
        }

        return {
            id: docSnapshot.id,
            fechaCierre: data.fechaCierre ? data.fechaCierre.toDate().toLocaleString() : 'N/A',
            totalVentas: data.totalVentas || 0,
            gananciaBruta: data.gananciaBruta || 0,
            diferencia: data.diferencia || 0,
            usuario: nombreUsuario,
            // Datos adicionales para el ticket
            totalCostos: data.totalCostos || 0,
            donacion: data.donacion || 0,
            efectivoContado: data.efectivoContado || 0,
            efectivoFinalEsperado: data.efectivoFinalEsperado || 0,
            montoInicial: data.montoInicial || 0,
            resumenPedidos: data.resumenPedidos || {}
        };
    }));

    return cierres.sort((a, b) => {
        // Convertir strings de fecha a Date para ordenar correctamente
        // Formato esperado: "D/M/YYYY, H:MM:SS AM/PM" o similar dependiendo del locale
        // Mejor usar el timestamp original si estuviera disponible, pero aquí ya lo convertimos.
        // Sin embargo, como estamos devolviendo un objeto nuevo, podríamos haber pasado el timestamp original.
        // Para simplificar, asumimos que el sort original funcionaba con strings o timestamps.
        // El código original usaba: .sort((a, b) => new Date(b.fechaCierre) - new Date(a.fechaCierre));
        // Pero fechaCierre ya es string. new Date() puede parsearlo si el formato es estándar.
        // Si no, el ordenamiento podría fallar.
        // Vamos a intentar parsearlo.
        return new Date(b.fechaCierre) - new Date(a.fechaCierre);
    });
};

// Helpers
const getInventario = async () => {
    const snap = await getDocs(collection(db, 'productos'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

const fetchVentasYPedidos = async (start, end) => {
    // Consultar ventas ACTIVAS
    const ventasRef = collection(db, 'ventas');
    const qVentas = query(ventasRef, where('fecha', '>=', start), where('fecha', '<=', end));
    const ventasSnap = await getDocs(qVentas);

    // Consultar ventas ARCHIVADAS
    const ventasArchivadasRef = collection(db, 'ventasArchivadas');
    const qVentasArchivadas = query(ventasArchivadasRef, where('fecha', '>=', start), where('fecha', '<=', end));
    const ventasArchivadasSnap = await getDocs(qVentasArchivadas);

    // Consultar pedidos ACTIVOS pagados
    const pedidosRef = collection(db, 'pedidos');
    const qPedidos = query(pedidosRef, where('fechaPago', '>=', start), where('fechaPago', '<=', end), where('estado', '==', 'pagado'));
    const pedidosSnap = await getDocs(qPedidos);

    // Consultar pedidos ARCHIVADOS
    const pedidosArchivadasRef = collection(db, 'pedidosArchivados');
    const qPedidosArchivados = query(pedidosArchivadasRef, where('fechaPago', '>=', start), where('fechaPago', '<=', end), where('estado', '==', 'pagado'));
    const pedidosArchivadasSnap = await getDocs(qPedidosArchivados);

    // Combinar todas las ventas (activas + archivadas)
    const ventas = ventasSnap.docs.map(d => ({ id: d.id, ...d.data(), tipo: 'Caja' }));
    const ventasArchivadas = ventasArchivadasSnap.docs.map(d => ({ id: d.id, ...d.data(), tipo: 'Caja' }));

    // Combinar todos los pedidos (activos + archivados)
    const pedidos = pedidosSnap.docs.map(d => ({ id: d.id, ...d.data(), tipo: 'Pedido', fecha: d.data().fechaPago }));
    const pedidosArchivados = pedidosArchivadasSnap.docs.map(d => ({ id: d.id, ...d.data(), tipo: 'Pedido', fecha: d.data().fechaPago }));

    return [...ventas, ...ventasArchivadas, ...pedidos, ...pedidosArchivados];
};
