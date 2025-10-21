// En: src/components/Factura.jsx
import React from 'react';

function Factura({ venta, onClose }) {
  const fechaVenta = venta.fecha.toLocaleString();

  const handlePrint = () => {
    // Título para la impresión
    document.title = `Factura - ${venta.cliente}`;
    window.print();
    // Restaura el título (opcional, pero buena práctica)
    setTimeout(() => { document.title = 'Deposito POS'; }, 500);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content factura-modal" id="factura-imprimible">
        
        <div className="factura-header">
          <h3>Depósito Mendoza</h3>
          <p>RECIBO DE VENTA</p>
          <p>Fecha: {fechaVenta}</p>
          <p>Cliente: {venta.cliente}</p>
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
            {venta.items.map((item, index) => (
              <tr key={index}>
                <td>{item.nombre} ({item.formato})</td>
                <td>{item.cantidad}</td>
                <td>L. {item.precio.toFixed(2)}</td>
                <td>L. {item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* --- 6. SECCIÓN DE TOTALES ACTUALIZADA --- */}
        <div className="factura-total">
          <p>
            <span>Total:</span>
            <strong>L. {venta.totalVenta.toFixed(2)}</strong>
          </p>
          <p>
            <span>Recibido:</span>
            <span>L. {venta.dineroRecibido.toFixed(2)}</span>
          </p>
          <p>
            <span>Vuelto:</span>
            <span>L. {venta.vuelto.toFixed(2)}</span>
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

export default Factura;