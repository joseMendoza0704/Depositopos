import React from 'react';

function FacturaPedido({ pedido, onClose }) {
  // Manejar la fecha que viene como Timestamp de Firestore
  const fechaPedido = pedido.fechaCreacion?.toDate 
    ? pedido.fechaCreacion.toDate().toLocaleString()
    : new Date().toLocaleString();

  const handlePrint = () => {
    document.title = `Factura - ${pedido.cliente.nombre}`;
    window.print();
    setTimeout(() => { document.title = 'Deposito POS'; }, 500);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content factura-modal" id="factura-imprimible">
        
        <div className="factura-header">
          <h3>Depósito Mendoza</h3>
          <p>FACTURA</p>
          <p>Fecha: {fechaPedido}</p>
          <p>Cliente: {pedido.cliente.nombre}</p>
          <p>Teléfono: {pedido.cliente.telefono}</p>
          {pedido.cliente.direccion && (
            <p>Dirección: {pedido.cliente.direccion}</p>
          )}
        </div>

        <table className="factura-tabla">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {pedido.items.map((item, index) => (
              <tr key={index}>
                <td>{item.nombre} ({item.formato})</td>
                <td>{item.cantidad}</td>
                <td>L. {item.precio.toFixed(2)}</td>
                <td>L. {item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="factura-total">
          <p>
            <span>Total:</span>
            <strong>L. {pedido.total.toFixed(2)}</strong>
          </p>
        </div>
        
        <div className="factura-botones no-print">
          <button onClick={handlePrint} className="boton-modal-agregar">
            Imprimir
          </button>
          <button onClick={onClose} className="boton-modal-cancelar">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default FacturaPedido;