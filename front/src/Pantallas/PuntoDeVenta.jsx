// En: src/pantallas/PuntoDeVenta.jsx
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { db } from '../firebaseConfig';
import {
  collection,
  onSnapshot,
  runTransaction,
  doc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import ModalAgregarProducto from '../components/ModalAgregarProducto';
import Factura from '../components/Factura';
import HistorialVentas from '../components/HistorialVentas';
import ModalCobro from '../components/ModalCobro';
import ModalCierreX from '../components/ModalCierreX';
import { useNotification } from '../context/NotificationContext';
import '../styles/PuntoDeVenta.css';

// --- Componente de fila del carrito memoizado ---
const CartRow = memo(({ item, index, onRemove, disabled }) => (
  <tr>
    <td>{item.nombre} ({item.tamaño}) - <strong>{item.formato.nombre}</strong></td>
    <td>{item.cantidad}</td>
    <td>L. {item.precio.toFixed(2)}</td>
    <td>L. {item.subtotal.toFixed(2)}</td>
    <td>
      <button
        onClick={() => onRemove(index)}
        className="boton-quitar"
        disabled={disabled}
      >
        X
      </button>
    </td>
  </tr>
));
CartRow.displayName = 'CartRow';

// --- Componente de resultados de búsqueda memoizado ---
const SearchResults = memo(({ results, onSelect }) => {
  if (results.length === 0) return null;
  return (
    <div className="search-results">
      {results.map(producto => (
        <div
          key={producto.id}
          className="search-result-item"
          onClick={() => onSelect(producto)}
        >
          {producto.nombre} - {producto.tamaño}
        </div>
      ))}
    </div>
  );
});
SearchResults.displayName = 'SearchResults';

// Recibe cajaActual, onAbrirCaja y onCierreZ del Dashboard
function PuntoDeVenta({ cajaActual, onAbrirCaja, onCierreZ, usuario }) {
  const { showAlert } = useNotification();
  // --- Estados Principales ---
  const [productosDB, setProductosDB] = useState([]);
  const [carrito, setCarrito] = useState([]);

  // --- Estados de Búsqueda y Modal ---
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [productoModal, setProductoModal] = useState(null);

  // --- Estados de Venta ---
  const [cargandoVenta, setCargandoVenta] = useState(false);
  const [ventaCompleta, setVentaCompleta] = useState(null);
  const [nombreCliente, setNombreCliente] = useState('');

  // --- Estados de Modales ---
  const [mostrandoHistorial, setMostrandoHistorial] = useState(false);
  const [mostrandoModalCobro, setMostrandoModalCobro] = useState(false);
  const [mostrandoCierreX, setMostrandoCierreX] = useState(false);

  // --- Carga todos los productos de Firebase ---
  useEffect(() => {
    const productosCollection = collection(db, 'productos');
    const unsubscribe = onSnapshot(productosCollection, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProductosDB(lista);
    });
    return () => unsubscribe();
  }, []);

  // --- Calcula el total con useMemo ---
  const total = useMemo(() => {
    return carrito.reduce((acc, item) => acc + item.subtotal, 0);
  }, [carrito]);

  // --- Lógica de Búsqueda con useCallback y debounce ---
  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setTerminoBusqueda(query);
    if (query.length > 1) {
      const queryLower = query.toLowerCase();
      const filtrados = productosDB.filter(p =>
        p.nombre.toLowerCase().includes(queryLower)
      );
      setResultadosBusqueda(filtrados);
    } else {
      setResultadosBusqueda([]);
    }
  }, [productosDB]);

  const handleSelectProductoBusqueda = useCallback((producto) => {
    setProductoModal(producto);
    setTerminoBusqueda('');
    setResultadosBusqueda([]);
  }, []);

  // --- Lógica del Carrito con useCallback ---
  const handleAgregarAlCarrito = useCallback((producto, formato, cantidad) => {
    const nuevoItem = {
      id: producto.id,
      nombre: producto.nombre,
      tamaño: producto.tamaño,
      formato: formato,
      cantidad: cantidad,
      precio: formato.precio,
      subtotal: formato.precio * cantidad
    };
    setCarrito(prev => [...prev, nuevoItem]);
  }, []);

  const handleQuitarDelCarrito = useCallback((index) => {
    setCarrito(prev => {
      const nuevoCarrito = [...prev];
      nuevoCarrito.splice(index, 1);
      return nuevoCarrito;
    });
  }, []);

  // --- Lógica de Venta ---
  const handleRealizarVenta = useCallback(() => {
    if (carrito.length === 0) {
      showAlert("El carrito está vacío.", 'info');
      return;
    }
    setMostrandoModalCobro(true);
  }, [carrito.length, showAlert]);

  const handleConfirmarVenta = useCallback(async (dineroRecibido, vuelto) => {
    if (!cajaActual?.id) {
      showAlert("Error: No se pudo identificar la caja actual. Por favor, intente recargar.", 'error');
      setCargandoVenta(false);
      return;
    }

    setCargandoVenta(true);
    setMostrandoModalCobro(false);

    try {
      // 1. Restar Stock usando transacción
      await runTransaction(db, async (transaction) => {
        const productosData = [];

        for (const item of carrito) {
          const productoRef = doc(db, 'productos', item.id);
          const productoDoc = await transaction.get(productoRef);

          if (!productoDoc.exists()) {
            throw new Error(`Producto no encontrado: ${item.nombre}`);
          }

          productosData.push({
            ref: productoRef,
            data: productoDoc.data(),
            item: item
          });
        }

        for (const producto of productosData) {
          const cantidadARestar = producto.item.formato.unidades * producto.item.cantidad;
          const stockActual = producto.data.stockUnidades;

          if (stockActual < cantidadARestar) {
            throw new Error(`Stock insuficiente para: ${producto.item.nombre}`);
          }

          const nuevoStock = stockActual - cantidadARestar;
          transaction.update(producto.ref, { stockUnidades: nuevoStock });
        }
      });

      // 2. Preparar datos de la Venta (con costo)
      const itemsConCosto = carrito.map(item => {
        const productoData = productosDB.find(p => p.id === item.id);
        const costoUnidad = productoData ? productoData.precioCostoUnidad : 0;
        return {
          ...item,
          formato: item.formato.nombre,
          costoTotalItem: costoUnidad * item.formato.unidades * item.cantidad
        };
      });

      const ventaData = {
        fecha: serverTimestamp(),
        items: itemsConCosto,
        totalVenta: total,
        tipoPago: "efectivo",
        cliente: nombreCliente.trim() === '' ? "Consumidor Final" : nombreCliente,
        dineroRecibido: Number(dineroRecibido),
        vuelto: Number(vuelto),
        cajaId: cajaActual.id
      };

      // 3. Guardar la Venta
      const ventasCollection = collection(db, 'ventas');
      const docRef = await addDoc(ventasCollection, ventaData);

      // 4. Mostrar Factura y Limpiar
      setVentaCompleta({ id: docRef.id, ...ventaData, fecha: new Date() });
      setCarrito([]);
      setNombreCliente('');
    } catch (error) {
      console.error("Error al realizar la venta: ", error);
      showAlert(`Error: ${error.message}`, 'error');
    } finally {
      setCargandoVenta(false);
    }
  }, [cajaActual, carrito, productosDB, total, nombreCliente, showAlert]);

  const handleCerrarFactura = useCallback(() => {
    setVentaCompleta(null);
  }, []);

  const handleCloseModal = useCallback(() => setProductoModal(null), []);
  const handleCloseHistorial = useCallback(() => setMostrandoHistorial(false), []);
  const handleCloseCobro = useCallback(() => setMostrandoModalCobro(false), []);
  const handleCloseCierreX = useCallback(() => setMostrandoCierreX(false), []);
  const handleOpenHistorial = useCallback(() => setMostrandoHistorial(true), []);
  const handleOpenCierreX = useCallback(() => setMostrandoCierreX(true), []);
  const handleNombreClienteChange = useCallback((e) => setNombreCliente(e.target.value), []);

  // --- Texto del botón de caja memoizado ---
  const cajaButtonText = useMemo(() => {
    return cajaActual ? `Caja Abierta (L. ${cajaActual.montoInicial.toFixed(2)})` : 'Apertura';
  }, [cajaActual]);

  return (
    <div className="pos-container">

      {/* --- Contenedor Principal (Header y Carrito) --- */}
      <div className="pos-main-content">
        {/* Overlay si la caja está cerrada */}
        {!cajaActual && (
          <div className="pos-overlay-disabled">
            <h2>Caja Cerrada</h2>
            <p>Realiza la "Apertura" para empezar a vender.</p>
          </div>
        )}

        {/* Header (Búsqueda, Cliente, Total) */}
        <div className="pos-header">
          <div className="pos-search-container">
            <input
              type="text"
              placeholder="Buscar producto..."
              className="pos-search-bar"
              value={terminoBusqueda}
              onChange={handleSearchChange}
              disabled={!cajaActual}
            />
            <SearchResults
              results={resultadosBusqueda}
              onSelect={handleSelectProductoBusqueda}
            />
          </div>
          <input
            type="text"
            placeholder="Nombre del Cliente (Opcional)"
            className="pos-cliente-input"
            value={nombreCliente}
            onChange={handleNombreClienteChange}
            disabled={!cajaActual}
          />
          <div className="pos-total">
            <h2>TOTAL</h2>
            <span>L. {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Carrito de Compras */}
        <div className="pos-cart-container">
          <table className="pos-cart-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Precio</th>
                <th>Subtotal</th>
                <th>Quitar</th>
              </tr>
            </thead>
            <tbody>
              {carrito.length === 0 && (
                <tr><td colSpan="5" style={{ textAlign: 'center' }}>El carrito está vacío</td></tr>
              )}
              {carrito.map((item, index) => (
                <CartRow
                  key={`${item.id}-${index}`}
                  item={item}
                  index={index}
                  onRemove={handleQuitarDelCarrito}
                  disabled={!cajaActual}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div> {/* --- Fin del .pos-main-content --- */}

      {/* --- Botones de Acción --- */}
      <div className="pos-footer">
        <button
          className="pos-button"
          onClick={onAbrirCaja}
          disabled={!!cajaActual}
        >
          {cajaButtonText}
        </button>
        <button
          className="pos-button"
          disabled={!cajaActual}
          onClick={handleOpenCierreX}
        >
          Cierre X
        </button>
        <button
          className="pos-button"
          disabled={!cajaActual}
          onClick={onCierreZ}
        >
          Cierre Z
        </button>
        <button
          className="pos-button"
          onClick={handleOpenHistorial}
          disabled={!cajaActual}
        >
          Imprimir
        </button>
        <button
          className="pos-button venta"
          onClick={handleRealizarVenta}
          disabled={cargandoVenta || !cajaActual}
        >
          {cargandoVenta ? 'Guardando...' : 'Realizar VENTA'}
        </button>
      </div>

      {/* --- Modales (renderizado condicional evita montaje innecesario) --- */}
      {productoModal && (
        <ModalAgregarProducto
          producto={productoModal}
          onClose={handleCloseModal}
          onAdd={handleAgregarAlCarrito}
        />
      )}
      {ventaCompleta && (
        <Factura
          venta={ventaCompleta}
          onClose={handleCerrarFactura}
        />
      )}
      {mostrandoHistorial && (
        <HistorialVentas
          onClose={handleCloseHistorial}
        />
      )}
      {mostrandoModalCobro && (
        <ModalCobro
          totalAPagar={total}
          onClose={handleCloseCobro}
          onConfirmarVenta={handleConfirmarVenta}
        />
      )}
      {mostrandoCierreX && cajaActual && (
        <ModalCierreX
          cajaActualId={cajaActual.id}
          montoInicial={cajaActual.montoInicial}
          onClose={handleCloseCierreX}
          usuario={usuario}
        />
      )}
    </div>
  );
}

export default memo(PuntoDeVenta);
