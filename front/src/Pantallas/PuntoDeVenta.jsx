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

function PuntoDeVenta({ cajaActual, onAbrirCaja }) {
  // ... (Todos tus estados (useState) no cambian)
  const [productosDB, setProductosDB] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [total, setTotal] = useState(0);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [productoModal, setProductoModal] = useState(null);
  const [cargandoVenta, setCargandoVenta] = useState(false);
  const [ventaCompleta, setVentaCompleta] = useState(null);
  const [nombreCliente, setNombreCliente] = useState('');
  const [mostrandoHistorial, setMostrandoHistorial] = useState(false);
  const [mostrandoModalCobro, setMostrandoModalCobro] = useState(false);

  // ... (Todas tus funciones (useEffect, handle...) no cambian)
  useEffect(() => {
    const productosCollection = collection(db, 'productos');
    const unsubscribe = onSnapshot(productosCollection, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProductosDB(lista);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const nuevoTotal = carrito.reduce((acc, item) => acc + item.subtotal, 0);
    setTotal(nuevoTotal);
  }, [carrito]);

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
  const handleAgregarAlCarrito = (producto, formato, cantidad) => {
    const nuevoItem = {
      id: producto.id,
      nombre: producto.nombre,
      tamaño: producto.tamaño,
      formato: formato,
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
  
  const handleRealizarVenta = () => {
    if (carrito.length === 0) {
      alert("El carrito está vacío.");
      return;
    }
    setMostrandoModalCobro(true);
  };

  const handleConfirmarVenta = async (dineroRecibido, vuelto) => {
    setCargandoVenta(true);
    setMostrandoModalCobro(false); 
    try {
      // 1. Restar Stock
      await runTransaction(db, async (transaction) => {
        for (const item of carrito) {
          const cantidadARestar = item.formato.unidades * item.cantidad;
          const productoRef = doc(db, 'productos', item.id);
          const productoDoc = await transaction.get(productoRef);
          if (!productoDoc.exists()) throw new Error(`Producto no encontrado: ${item.nombre}`);
          const stockActual = productoDoc.data().stockUnidades;
          if (stockActual < cantidadARestar) throw new Error(`Stock insuficiente para: ${item.nombre}`);
          const nuevoStock = stockActual - cantidadARestar;
          transaction.update(productoRef, { stockUnidades: nuevoStock });
        }
      });
      // 2. Guardar Venta
      const ventaData = {
        fecha: serverTimestamp(),
        items: carrito.map(item => ({ ...item, formato: item.formato.nombre })),
        totalVenta: total,
        tipoPago: "efectivo",
        cliente: nombreCliente.trim() === '' ? "Consumidor Final" : nombreCliente,
        dineroRecibido: Number(dineroRecibido),
        vuelto: Number(vuelto),
        cajaId: cajaActual.id
      };
      const ventasCollection = collection(db, 'ventas');
      const docRef = await addDoc(ventasCollection, ventaData);
      // 3. Mostrar Factura y Limpiar
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
      
      {/* --- 1. NUEVO CONTENEDOR PRINCIPAL --- */}
      {/* Este div envuelve el header y la tabla */}
      <div className="pos-main-content">
      
        {/* --- 2. EL OVERLAY AHORA VIVE AQUÍ DENTRO --- */}
        {/* Al estar aquí, solo bloqueará esta sección, no los botones de abajo */}
        {!cajaActual && (
          <div className="pos-overlay-disabled">
            <h2>Caja Cerrada</h2>
            <p>Realiza la "Apertura" para empezar a vender.</p>
          </div>
        )}

        {/* El header y la tabla van dentro del nuevo contenedor */}
        <div className="pos-header">
          <div className="pos-search-container">
            <input
              type="text"
              placeholder="Buscar producto..."
              className="pos-search-bar"
              value={terminoBusqueda}
              onChange={handleSearchChange}
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
          />
          <div className="pos-total">
            <h2>TOTAL</h2>
            <span>L. {total.toFixed(2)}</span>
          </div>
        </div>
        
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
                    <button onClick={() => handleQuitarDelCarrito(index)} className="boton-quitar">
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div> {/* --- Fin del .pos-main-content --- */}


      {/* --- 3. EL FOOTER AHORA ESTÁ FUERA --- */}
      {/* Al estar fuera, el overlay ya no lo bloquea */}
      <div className="pos-footer">
        <button 
          className="pos-button" 
          onClick={onAbrirCaja}
          disabled={!!cajaActual}
        >
          {cajaActual ? `Caja Abierta (L. ${cajaActual.montoInicial.toFixed(2)})` : 'Apertura'}
        </button>
        <button className="pos-button" disabled={!cajaActual}>Cierre X</button>
        <button className="pos-button" disabled={!cajaActual}>Cierre Z</button>
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

      {/* --- Modales (sin cambios) --- */}
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
    </div>
  );
}

export default PuntoDeVenta;