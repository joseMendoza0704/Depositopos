import React, { useState } from 'react';
import { collection, doc, updateDoc, deleteDoc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import FacturaPedido from './FacturaPedido';
import { useNotification } from '../context/NotificationContext';
import '../styles/PedidoCard.css'; // Asegúrate de que el CSS esté importado

function PedidoCard({ pedido, onEdit, onRecargarPedidos }) {
  const { showAlert } = useNotification();
  const [mostrarFactura, setMostrarFactura] = useState(false);

  if (!pedido || !pedido.cliente || !pedido.items || !Array.isArray(pedido.items)) {
    return null;
  }

  const { id, cliente, items, total, estado } = pedido;

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
      throw error;
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
      throw error;
    }
  };

  const handleMoverPedido = async (nuevoEstado) => {
    try {
      const pedidoRef = doc(db, 'pedidos', id);

      if (nuevoEstado === 'pagado') {
        // Validaciones y movimientos de inventario/caja solo al pagar
        const productosPromises = items.map(async (item) => {
          const productoDoc = await getDoc(doc(db, 'productos', item.id));
          if (!productoDoc.exists()) throw new Error(`Producto no encontrado: ${item.nombre}`);
          return item;
        });

        const itemsVerificados = await Promise.all(productosPromises);
        await actualizarInventario(itemsVerificados);
        await registrarVentaEnCaja(pedido);
      }

      await updateDoc(pedidoRef, {
        estado: nuevoEstado,
        fechaPago: nuevoEstado === 'pagado' ? new Date() : null
      });

      onRecargarPedidos();
    } catch (error) {
      console.error('Error al mover pedido:', error);
      showAlert(error.message || 'Error al mover el pedido.', 'error');
    }
  };

  const handleEliminar = async () => {
    if (!window.confirm('¿Está seguro de eliminar este pedido?')) return;
    try {
      await deleteDoc(doc(db, 'pedidos', id));
      onRecargarPedidos();
    } catch (error) {
      console.error('Error al eliminar pedido:', error);
      showAlert('Error al eliminar el pedido.', 'error');
    }
  };

  const isPagado = estado === 'pagado';

  return (
    <div className="pedido-card-modern">
      {/* Header */}
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

      {/* Items */}
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

      {/* Footer y Botones */}
      <div className="pedido-card-footer">
        <div className="pedido-total-modern">
          <span className="total-label">Total</span>
          <span className="total-monto">L. {total.toFixed(2)}</span>
        </div>

        <div className="pedido-acciones-modern-grid">
          {/* Botón Imprimir: Disponible SIEMPRE */}
          <button
            onClick={() => setMostrarFactura(true)}
            className="btn-modern btn-imprimir-modern"
            title="Imprimir factura"
          >
            <span className="btn-icon">🖨️</span>
            <span className="btn-text">Imprimir</span>
          </button>

          {/* Botón Eliminar: Disponible SIEMPRE */}
          <button
            onClick={handleEliminar}
            className="btn-modern btn-eliminar-modern"
            title="Eliminar pedido"
          >
            <span className="btn-icon">🗑️</span>
            <span className="btn-text">Eliminar</span>
          </button>

          {/* Botón Editar: NO disponible si está pagado */}
          {!isPagado && (
            <button
              onClick={() => onEdit(pedido)}
              className="btn-modern btn-editar-modern"
              title="Editar pedido"
            >
              <span className="btn-icon">✏️</span>
              <span className="btn-text">Editar</span>
            </button>
          )}

          {/* Acciones Específicas por Estado */}
          {estado === 'recibido' && (
            <button
              onClick={() => handleMoverPedido('enviado')}
              className="btn-modern btn-mover-modern"
              title="Marcar como enviado"
            >
              <span className="btn-icon">🚚</span>
              <span className="btn-text">Enviar</span>
            </button>
          )}

          {estado === 'enviado' && (
            <>
              <button
                onClick={() => handleMoverPedido('recibido')}
                className="btn-modern btn-regresar-modern"
                title="Regresar a Recibido"
              >
                <span className="btn-icon">↩️</span>
                <span className="btn-text">Regresar</span>
              </button>

              <button
                onClick={() => handleMoverPedido('pagado')}
                className="btn-modern btn-pagar-modern"
                title="Marcar como pagado"
              >
                <span className="btn-icon">✅</span>
                <span className="btn-text">Pagar</span>
              </button>
            </>
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
