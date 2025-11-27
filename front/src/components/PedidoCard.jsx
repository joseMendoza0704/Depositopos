import React, { useState } from 'react';
import { collection, doc, updateDoc, deleteDoc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import FacturaPedido from './FacturaPedido';
import '../styles/PedidoCard.css';

function PedidoCard({ pedido, onEdit, onRecargarPedidos }) {
  const [mostrarFactura, setMostrarFactura] = useState(false);

  // Validar que el pedido tenga todas las propiedades necesarias
  if (!pedido || !pedido.cliente || !pedido.items || !Array.isArray(pedido.items)) {
    console.error('Pedido inválido:', pedido);
    return null;
  }

  const { id, cliente, items, total, estado } = pedido;

  // Validar que los campos requeridos existan
  if (!id || !cliente.nombre || !items || typeof total === 'undefined' || !estado) {
    console.error('Pedido con campos faltantes:', pedido);
    return null;
  }

  const actualizarInventario = async (items) => {
    try {
      for (const item of items) {
        const productoRef = doc(db, 'productos', item.id);
        const productoDoc = await getDoc(productoRef);
        if (!productoDoc.exists()) throw new Error(`Producto no encontrado: ${item.nombre}`);
        const stockActualUnidades = productoDoc.data().stockUnidades || 0;
        const unidadesPorFormato = item.formato.unidades || 1;
        const cantidadARestar = unidadesPorFormato * item.cantidad;
        if (stockActualUnidades < cantidadARestar) {
          throw new Error(`Stock insuficiente para ${item.nombre}`);
        }
        await updateDoc(productoRef, {
          stockUnidades: stockActualUnidades - cantidadARestar
        });
      }
    } catch (error) {
      console.error('Error al actualizar inventario:', error);
      throw new Error('Error al actualizar el inventario');
    }
  };

  const registrarVentaEnCaja = async (pedido) => {
    try {
      const cajaDiariaRef = collection(db, 'cajaTransacciones');
      const ventaData = {
        tipo: 'pedido',
        fecha: new Date(),
        cliente: pedido.cliente.nombre,
        items: pedido.items,
        total: pedido.total,
        pedidoId: pedido.id,
        metodoPago: 'efectivo',
      };

      await addDoc(cajaDiariaRef, ventaData);
    } catch (error) {
      console.error('Error al registrar venta en caja:', error);
      throw new Error('Error al registrar la venta en caja');
    }
  };

  const handleMoverPedido = async (nuevoEstado) => {
    try {
      const pedidoRef = doc(db, 'pedidos', id);

      if (nuevoEstado === 'pagado') {
        const productosPromises = items.map(async (item) => {
          const productoDoc = await getDoc(doc(db, 'productos', item.id));
          const stockActual = productoDoc.data().stock;

          if (stockActual < item.cantidad) {
            throw new Error(`Stock insuficiente para ${item.nombre}`);
          }

          return { ...item, stockActual };
        });

        const itemsConStock = await Promise.all(productosPromises);
        await actualizarInventario(itemsConStock);
        await registrarVentaEnCaja(pedido);
      }

      await updateDoc(pedidoRef, {
        estado: nuevoEstado,
        fechaPago: nuevoEstado === 'pagado' ? new Date() : null
      });

      onRecargarPedidos();
    } catch (error) {
      console.error('Error al mover pedido:', error);
      alert(error.message || 'Error al mover el pedido. Intente nuevamente.');
    }
  };

  const handleEliminar = async () => {
    if (!window.confirm('¿Está seguro de eliminar este pedido?')) return;

    try {
      await deleteDoc(doc(db, 'pedidos', id));
      onRecargarPedidos();
    } catch (error) {
      console.error('Error al eliminar pedido:', error);
      alert('Error al eliminar el pedido. Intente nuevamente.');
    }
  };

  return (
    <div className="pedido-card-modern">
      {/* Header con gradiente */}
      <div className="pedido-card-header">
        <div className="cliente-info">
          <div className="cliente-nombre">
            <span className="icon-cliente">👤</span>
            <h4>{cliente.nombre}</h4>
          </div>
          <div className="cliente-contacto">
            <span className="icon-telefono">📱</span>
            <span>{cliente.telefono}</span>
          </div>
          {cliente.direccion && (
            <div className="cliente-direccion">
              <span className="icon-direccion">📍</span>
              <span>{cliente.direccion}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items del pedido */}
      <div className="pedido-card-body">
        <div className="items-header">
          <span className="icon-lista">📦</span>
          <span className="items-title">Productos</span>
        </div>
        <div className="pedido-items-list">
          {items.map((item, index) => (
            <div key={index} className="pedido-item-modern">
              <div className="item-info">
                <span className="item-cantidad-badge">{item.cantidad}x</span>
                <div className="item-detalles">
                  <span className="item-nombre-modern">{item.nombre}</span>
                  <span className="item-formato-modern">{item.formato}</span>
                </div>
              </div>
              <span className="item-subtotal-modern">L. {item.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer con total y acciones */}
      <div className="pedido-card-footer">
        <div className="pedido-total-modern">
          <span className="total-label">Total</span>
          <span className="total-monto">L. {total.toFixed(2)}</span>
        </div>

        <div className={estado === 'recibido' ? 'pedido-acciones-modern-grid' : 'pedido-acciones-modern'}>
          <button
            onClick={() => onEdit(pedido)}
            className="btn-modern btn-editar-modern"
            title="Editar pedido"
          >
            <span className="btn-icon">✏️</span>
            <span className="btn-text">Editar</span>
          </button>

          <button
            onClick={handleEliminar}
            className="btn-modern btn-eliminar-modern"
            title="Eliminar pedido"
          >
            <span className="btn-icon">🗑️</span>
            <span className="btn-text">Eliminar</span>
          </button>

          {estado === 'recibido' && (
            <>
              <button
                onClick={() => handleMoverPedido('enviado')}
                className="btn-modern btn-mover-modern"
                title="Marcar como enviado"
              >
                <span className="btn-icon">🚚</span>
                <span className="btn-text">Enviar</span>
              </button>
              <button
                onClick={() => setMostrarFactura(true)}
                className="btn-modern btn-imprimir-modern"
                title="Imprimir factura"
              >
                <span className="btn-icon">🖨️</span>
                <span className="btn-text">Imprimir</span>
              </button>
            </>
          )}

          {estado === 'enviado' && (
            <button
              onClick={() => handleMoverPedido('pagado')}
              className="btn-modern btn-pagar-modern"
              title="Marcar como pagado"
            >
              <span className="btn-icon">✅</span>
              <span className="btn-text">Marcar Pagado</span>
            </button>
          )}
        </div>
      </div>

      {mostrarFactura && (
        <FacturaPedido
          pedido={pedido}
          onClose={() => setMostrarFactura(false)}
        />
      )}
    </div>
  );
}

export default PedidoCard;