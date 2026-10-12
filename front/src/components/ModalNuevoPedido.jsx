import React, { useState } from 'react';
import ModalBuscarCliente from './ModalBuscarCliente';
import ModalBuscarProducto from './ModalBuscarProducto';
import ModalAgregarProducto from './ModalAgregarProducto';
import { collection, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import FacturaPedido from './FacturaPedido';
import { useNotification } from '../context/NotificationContext';
import '../styles/ModalNuevoPedido.css';

function ModalNuevoPedido({ onClose, onCrear, pedidoParaEditar }) {
  const { showAlert } = useNotification();
  const [showBuscarCliente, setShowBuscarCliente] = useState(!pedidoParaEditar);
  const [showBuscarProducto, setShowBuscarProducto] = useState(false);
  const [showAgregarProducto, setShowAgregarProducto] = useState(false);
  const [showFactura, setShowFactura] = useState(false);

  // State to hold the finalized order data for the invoice
  const [pedidoGuardado, setPedidoGuardado] = useState(null);

  const [cliente, setCliente] = useState(pedidoParaEditar?.cliente || null);
  const [items, setItems] = useState(pedidoParaEditar?.items || []);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [total, setTotal] = useState(pedidoParaEditar?.total || 0);

  const handleSelectCliente = (clienteSeleccionado) => {
    setCliente(clienteSeleccionado);
    setShowBuscarCliente(false);
  };

  const handleAgregarProducto = (producto, formato, cantidad) => {
    const nuevoItem = {
      id: producto.id,
      nombre: producto.nombre,
      cantidad: Number(cantidad),
      formato: formato.nombre,
      precio: Number(formato.precio),
      subtotal: Number(formato.precio * cantidad),
      tamaño: producto.tamaño || '',
      unidades: Number(cantidad),
      costoTotalItem: 0
    };

    setItems(prev => [...prev, nuevoItem]);
    setTotal(prev => prev + nuevoItem.subtotal);
    setShowAgregarProducto(false);
  };

  const handleCrearPedido = async () => {
    if (!cliente || items.length === 0) {
      showAlert('Debe seleccionar un cliente y al menos un producto.', 'error');
      return;
    }

    try {
      // FIX 1: Sanitize data to avoid "undefined" values
      const pedidoData = {
        cliente: {
          // Use || '' (empty string) or || null to prevent 'undefined' error
          id: cliente.id || '',
          nombre: cliente.nombre || '',
          direccion: cliente.direccion || '',
          telefono: cliente.telefono || ''
        },
        items: items.map(item => ({
          cantidad: Number(item.cantidad),
          costoTotalItem: 0,
          formato: item.formato || '',
          id: item.id || '',
          nombre: item.nombre || '',
          precio: Number(item.precio),
          subtotal: Number(item.subtotal),
          tamaño: item.tamaño || '',
          unidades: Number(item.cantidad)
        })),
        estado: pedidoParaEditar?.estado || 'recibido',
        fechaCreacion: pedidoParaEditar?.fechaCreacion || Timestamp.now(),
        total: Number(total)
      };

      console.log('Guardando pedido:', pedidoData);

      try {
        if (pedidoParaEditar) {
          // Update existing document
          const pedidoRef = doc(db, 'pedidos', pedidoParaEditar.id);
          await updateDoc(pedidoRef, pedidoData);

          const pedidoEditado = { ...pedidoData, id: pedidoParaEditar.id };

          if (onCrear) {
            onCrear(pedidoEditado);
          }
          onClose();
        } else {
          // Create new document
          const pedidosRef = collection(db, 'pedidos');
          const docRef = await addDoc(pedidosRef, pedidoData);

          if (docRef.id) {
            console.log('Pedido guardado con ID:', docRef.id);
            const pedidoConId = { ...pedidoData, id: docRef.id };

            if (onCrear) {
              onCrear(pedidoConId);
            }

            // FIX 2: Save the complete object to state before showing invoice
            setPedidoGuardado(pedidoConId);
            setShowFactura(true);
          }
        }
      } catch (error) {
        console.error('Error al guardar pedido:', error);
        showAlert('Error al guardar el pedido: ' + error.message, 'error');
      }
    } catch (error) {
      console.error('Error al crear pedido:', error);
      showAlert('Error al crear el pedido. ' + error.message, 'error');
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content modal-nuevo-pedido-content">
        {showBuscarCliente && (
          <ModalBuscarCliente
            onClose={onClose}
            onSelectCliente={handleSelectCliente}
          />
        )}

        {!showBuscarCliente && !showBuscarProducto && !showAgregarProducto && !showFactura && (
          <>
            <div className="nuevo-pedido-header">
              <h3>{pedidoParaEditar ? 'Editar Pedido' : 'Nuevo Pedido'}</h3>
              <button className="btn-cerrar-modal" onClick={onClose} title="Cerrar modal">
                ✕
              </button>
            </div>

            {cliente && (
              <div className="cliente-card">
                <div className="cliente-card-header">
                  <div className="cliente-badge-label">
                    CLIENTE <span className="cliente-dot"></span>
                  </div>
                  <button
                    onClick={() => setShowBuscarCliente(true)}
                    className="btn-cambiar-cliente"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    Cambiar Cliente
                  </button>
                </div>
                <div className="cliente-card-body">
                  <span className="cliente-nombre-tel">
                    <strong>{cliente.nombre}</strong> {cliente.telefono && <span className="cliente-tel">• {cliente.telefono}</span>}
                  </span>
                  {cliente.direccion && (
                    <span className="cliente-direccion">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      {cliente.direccion}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="pedidos-articulos-card">
              <div className="articulos-card-header">
                <span className="articulos-titulo">Artículos en el pedido</span>
                <span className="articulos-badge-count">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
              </div>

              <div className="items-list">
                {items.length === 0 ? (
                  <div className="items-vacio">No hay artículos en el pedido</div>
                ) : (
                  items.map((item, index) => (
                    <div key={index} className="item-row">
                      <div className="item-cantidad-badge">
                        {item.cantidad}x
                      </div>
                      <div className="item-details">
                        <div className="item-nombre-texto">
                          {item.nombre}
                        </div>
                      </div>
                      <div className="item-precio-texto">
                        L. {item.subtotal.toFixed(2)}
                      </div>
                      <button
                        onClick={() => {
                          const nuevosItems = items.filter((_, i) => i !== index);
                          setItems(nuevosItems);
                          setTotal(nuevosItems.reduce((acc, item) => acc + item.subtotal, 0));
                        }}
                        className="boton-quitar-item"
                        title="Quitar artículo"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="resumen-card">
              <span className="resumen-label">RESUMEN</span>
              <span className="resumen-total">Total: L. {total.toFixed(2)}</span>
            </div>

            <div className="modal-botones">
              <button
                onClick={() => setShowBuscarProducto(true)}
                className="btn-modal-accion-verde"
              >
                <span className="btn-modal-icon-badge">+</span>
                <span className="btn-modal-text-stack">
                  <span>Agregar</span>
                  <span>Producto</span>
                </span>
              </button>
              <button
                onClick={handleCrearPedido}
                className="btn-modal-accion-verde"
                disabled={items.length === 0}
              >
                <span className="btn-modal-icon-badge">✓</span>
                <span className="btn-modal-text-stack">
                  <span>{pedidoParaEditar ? 'Guardar' : 'Crear'}</span>
                  <span>Pedido</span>
                </span>
              </button>
              <button onClick={onClose} className="btn-modal-cancelar-outline">
                Cancelar
              </button>
            </div>
          </>
        )}

        {showBuscarProducto && (
          <ModalBuscarProducto
            onClose={() => setShowBuscarProducto(false)}
            onSelectProducto={(producto) => {
              setProductoSeleccionado(producto);
              setShowBuscarProducto(false);
              setShowAgregarProducto(true);
            }}
          />
        )}

        {showAgregarProducto && (
          <ModalAgregarProducto
            producto={productoSeleccionado}
            onClose={() => setShowAgregarProducto(false)}
            onAdd={handleAgregarProducto}
          />
        )}

        {/* FIX 2: Use pedidoGuardado state here instead of the undefined pedidoData variable */}
        {showFactura && pedidoGuardado && (
          <FacturaPedido
            pedido={pedidoGuardado}
            onClose={() => {
              setShowFactura(false);
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}

export default ModalNuevoPedido;
