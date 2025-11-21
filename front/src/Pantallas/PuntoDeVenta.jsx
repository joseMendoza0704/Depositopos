// En: src/pantallas/PuntoDeVenta.jsx
import React, { useState, useEffect } from 'react';
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
import '../styles/PuntoDeVenta.css';

// Recibe cajaActual, onAbrirCaja y onCierreZ del Dashboard
function PuntoDeVenta({ cajaActual, onAbrirCaja, onCierreZ }) { 
  // --- Estados Principales ---
  const [productosDB, setProductosDB] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [total, setTotal] = useState(0);

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

  // --- Calcula el total ---
  useEffect(() => {
    const nuevoTotal = carrito.reduce((acc, item) => acc + item.subtotal, 0);
    setTotal(nuevoTotal);
  }, [carrito]);

  // --- Lógica de Búsqueda ---
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setTerminoBusqueda(query);
    if (query.length > 1) {
      const filtrados = productosDB.filter(p =>
        p.nombre.toLowerCase().includes(query.toLowerCase())
      );
      setResultadosBusqueda(filtrados);
    } else {
      setResultadosBusqueda([]);
    }
  };

  const handleSelectProductoBusqueda = (producto) => {
    setProductoModal(producto);
    setTerminoBusqueda('');
    setResultadosBusqueda([]);
  };

  // --- Lógica del Carrito ---
  const handleAgregarAlCarrito = (producto, formato, cantidad) => {
    const nuevoItem = {
      id: producto.id,
      nombre: producto.nombre,
      tamaño: producto.tamaño,
      formato: formato, // Guarda el objeto formato completo
      cantidad: cantidad,
      precio: formato.precio,
      subtotal: formato.precio * cantidad
    };
    setCarrito([...carrito, nuevoItem]);
  };

  const handleQuitarDelCarrito = (index) => {
    const nuevoCarrito = [...carrito];
    nuevoCarrito.splice(index, 1);
    setCarrito(nuevoCarrito);
  };
  
  // --- Lógica de Venta ---
  const handleRealizarVenta = () => {
    if (carrito.length === 0) {
      alert("El carrito está vacío.");
      return;
    }
    setMostrandoModalCobro(true); // Abre el modal de cobro
  };

  const handleConfirmarVenta = async (dineroRecibido, vuelto) => {
    // Verifica si cajaActual existe antes de intentar acceder a cajaActual.id
    if (!cajaActual?.id) {
      alert("Error: No se pudo identificar la caja actual. Por favor, intente recargar.");
      setCargandoVenta(false);
      return;
    }
      
    setCargandoVenta(true);
    setMostrandoModalCobro(false); 

    try {
      // 1. Restar Stock usando transacción CORRECTAMENTE
      await runTransaction(db, async (transaction) => {
        // PASO 1: Primero hacemos TODAS las lecturas
        const productosRefs = [];
        const productosData = [];
        
        for (const item of carrito) {
          const productoRef = doc(db, 'productos', item.id);
          productosRefs.push(productoRef);
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
        
        // PASO 2: Ahora hacemos TODAS las escrituras
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
        cajaId: cajaActual.id // Asocia la venta a la caja abierta
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
      alert(`Error: ${error.message}`);
    } finally {
      setCargandoVenta(false);
    }
  };

  const handleCerrarFactura = () => {
    setVentaCompleta(null);
  };

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
              disabled={!cajaActual} // Deshabilita si la caja está cerrada
            />
            {resultadosBusqueda.length > 0 && (
              <div className="search-results">
                {resultadosBusqueda.map(producto => (
                  <div
                    key={producto.id}
                    className="search-result-item"
                    onClick={() => handleSelectProductoBusqueda(producto)}
                  >
                    {producto.nombre} - {producto.tamaño}
                  </div>
                ))}
              </div>
            )}
          </div>
          <input 
            type="text"
            placeholder="Nombre del Cliente (Opcional)"
            className="pos-cliente-input"
            value={nombreCliente}
            onChange={(e) => setNombreCliente(e.target.value)}
            disabled={!cajaActual} // Deshabilita si la caja está cerrada
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
                <tr key={index}>
                  <td>{item.nombre} ({item.tamaño}) - <strong>{item.formato.nombre}</strong></td>
                  <td>{item.cantidad}</td>
                  <td>L. {item.precio.toFixed(2)}</td>
                  <td>L. {item.subtotal.toFixed(2)}</td>
                  <td>
                    <button 
                      onClick={() => handleQuitarDelCarrito(index)} 
                      className="boton-quitar"
                      disabled={!cajaActual} // Deshabilita si la caja está cerrada
                    >
                      X
                    </button>
                  </td>
                </tr>
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
          {cajaActual ? `Caja Abierta (L. ${cajaActual.montoInicial.toFixed(2)})` : 'Apertura'}
        </button>
        <button 
          className="pos-button" 
          disabled={!cajaActual} 
          onClick={() => setMostrandoCierreX(true)} 
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
          onClick={() => setMostrandoHistorial(true)}
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

      {/* --- Modales --- */}
      {productoModal && (
        <ModalAgregarProducto
          producto={productoModal}
          onClose={() => setProductoModal(null)}
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
          onClose={() => setMostrandoHistorial(false)}
        />
      )}
      {mostrandoModalCobro && (
        <ModalCobro 
          totalAPagar={total}
          onClose={() => setMostrandoModalCobro(false)}
          onConfirmarVenta={handleConfirmarVenta}
        />
      )}
      {mostrandoCierreX && cajaActual && (
        <ModalCierreX 
          cajaActualId={cajaActual.id} 
          montoInicial={cajaActual.montoInicial}
          onClose={() => setMostrandoCierreX(false)}
        />
      )}
    </div>
  );
}

export default PuntoDeVenta;
