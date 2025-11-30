import React, { useState } from 'react';
import ModalBuscarCliente from './ModalBuscarCliente';
import ModalBuscarProducto from './ModalBuscarProducto';
import ModalAgregarProducto from './ModalAgregarProducto';
import { collection, addDoc, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import FacturaPedido from './FacturaPedido';
import { useNotification } from '../context/NotificationContext';

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
      <div className="modal-content">
        {showBuscarCliente && (
          <ModalBuscarCliente
            onClose={onClose}
            onSelectCliente={handleSelectCliente}
          />
        )}

        {!showBuscarCliente && !showBuscarProducto && !showAgregarProducto && !showFactura && (
          <>
            <h3>Nuevo Pedido</h3>

            <div className="cliente-seleccionado">
              <div className="cliente-header">
                <h4>Cliente:</h4>
                <button
                  onClick={() => setShowBuscarCliente(true)}
                  className="boton-cambiar-cliente"
                >
                  Cambiar Cliente
                </button>
              </div>
              <p>{cliente.nombre} - {cliente.telefono}</p>
              <p>{cliente.direccion}</p>
            </div>

            <div className="items-list">
              {items.map((item, index) => (
                <div key={index} className="item-row">
                  <div className="item-info">
                    <span>{item.cantidad}x {item.nombre} ({item.formato})</span>
                    <span>L. {item.subtotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => {
                      const nuevosItems = items.filter((_, i) => i !== index);
                      setItems(nuevosItems);
                      setTotal(nuevosItems.reduce((acc, item) => acc + item.subtotal, 0));
                    }}
                    className="boton-quitar-item"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <div className="total-row">
                <strong>Total: L. {total.toFixed(2)}</strong>
              </div>
            </div>

            <div className="modal-botones">
              <button
                onClick={() => setShowBuscarProducto(true)}
                className="boton-modal-agregar"
              >
                + Agregar Producto
              </button>
              <button
                onClick={handleCrearPedido}
                className="boton-modal-agregar"
                disabled={items.length === 0}
              >
                Crear Pedido
              </button>
              <button onClick={onClose} className="boton-modal-cancelar">
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
