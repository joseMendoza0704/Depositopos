import React, { useState } from 'react';
import { collection, doc, updateDoc, deleteDoc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import FacturaPedido from './FacturaPedido';

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
      // Si tu item tiene formato.unidades, úsalo; si no, asegúrate que item.formato es el nombre y busca el número de unidades en la base según formato.
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
        metodoPago: 'efectivo', // o podrías tener esto como parte del pedido
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
      
      // Si el nuevo estado es 'pagado', actualizar inventario y registrar venta
      if (nuevoEstado === 'pagado') {
        // Primero verificar stock actual
        const productosPromises = items.map(async (item) => {
          const productoDoc = await getDoc(doc(db, 'productos', item.id));
          const stockActual = productoDoc.data().stock;
          
          if (stockActual < item.cantidad) {
            throw new Error(`Stock insuficiente para ${item.nombre}`);
          }
          
          return { ...item, stockActual };
        });

        const itemsConStock = await Promise.all(productosPromises);
        
        // Actualizar inventario
        await actualizarInventario(itemsConStock);
        
        // Registrar venta en caja
        await registrarVentaEnCaja(pedido);
      }

      // Actualizar estado del pedido
      await updateDoc(pedidoRef, {
        estado: nuevoEstado,
        fechaPago: nuevoEstado === 'pagado' ? new Date() : null
      });

      onRecargarPedidos(); // Recargar lista de pedidos
    } catch (error) {
      console.error('Error al mover pedido:', error);
      alert(error.message || 'Error al mover el pedido. Intente nuevamente.');
    }
  };

  const handleEliminar = async () => {
    if (!window.confirm('¿Está seguro de eliminar este pedido?')) return;
    
    try {
      await deleteDoc(doc(db, 'pedidos', id));
      onRecargarPedidos(); // Recargar lista de pedidos
    } catch (error) {
      console.error('Error al eliminar pedido:', error);
      alert('Error al eliminar el pedido. Intente nuevamente.');
    }
  };

  return (
    <div className="pedido-card">
      <div className="pedido-header">
        <h4>{cliente.nombre}</h4>
        <span>{cliente.telefono}</span>
      </div>
      
      <div className="pedido-items">
        {items.map((item, index) => (
          <div key={index} className="pedido-item">
            <span className="item-cantidad">{item.cantidad}x</span>
            <span className="item-nombre">{item.nombre}</span>
            <span className="item-formato">({item.formato})</span>
            <span className="item-subtotal">L. {item.subtotal.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="pedido-footer">
        <div className="pedido-total">
          <strong>Total: L. {total.toFixed(2)}</strong>
        </div>
        
        <div className="pedido-acciones">
          <button 
            onClick={() => onEdit(pedido)}
            className="btn-editar"
          >
            Editar
          </button>
          
          <button 
            onClick={handleEliminar}
            className="btn-eliminar"
          >
            Eliminar
          </button>

          {estado === 'recibido' && (
            <>
              <button 
                onClick={() => handleMoverPedido('enviado')}
                className="btn-mover"
              >
                → Enviado
              </button>
              <button 
                onClick={() => setMostrarFactura(true)}
                className="btn-imprimir"
              >
                Imprimir
              </button>
            </>
          )}

          {estado === 'enviado' && (
            <button 
              onClick={() => handleMoverPedido('pagado')}
              className="btn-mover"
            >
              → Pagado
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