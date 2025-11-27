// En: src/components/Factura.jsx
import React from 'react';
import '../styles/factura.css';

function Factura({ venta, onClose }) {
  // Manejar la fecha de venta
  const fechaVenta = venta.fecha.toLocaleDateString('es-HN');
  const horaVenta = venta.fecha.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' });

  const handlePrint = () => {
    document.title = `Recibo - ${venta.cliente}`;
    window.print();
    setTimeout(() => { document.title = 'Deposito POS'; }, 500);
  };

  return (
    <div className="modal-backdrop">
      <div className="factura-container" id="factura-imprimible">

        {/* Header con Logo y Datos de la Empresa */}
        <div className="factura-empresa">
          <div className="factura-logo">
            <img src="/logo_fact.png" alt="Logo Depósito Mendoza" />
          </div>
          <p className="factura-empresa-info">Dirección: Barrio el centro 5ta calle en frente a pollolandia</p>
          <p className="factura-empresa-info">Teléfono: +504 3390-6236</p>
          <p className="factura-empresa-info">Email: mendozadeposito0704@gmail.com</p>
        </div>

        {/* Información del Cliente y Recibo */}
        <div className="factura-info-section">
          <div className="factura-info-cliente">
            <p><strong>Cliente:</strong> {venta.cliente}</p>
            <p><strong>Método de pago:</strong> Efectivo</p>
          </div>
          <div className="factura-info-datos">
            <h3>RECIBO DE VENTA</h3>
            <p><strong>Fecha:</strong> {fechaVenta}</p>
            <p><strong>Hora:</strong> {horaVenta}</p>
          </div>
        </div>

        {/* Separador */}
        <hr className="factura-separador" />

        {/* Tabla de Productos */}
        <table className="factura-productos-tabla">
          <thead>
            <tr>
              <th className="col-producto">Producto</th>
              <th className="col-cantidad">Cant.</th>
              <th className="col-precio">Precio</th>
              <th className="col-subtotal">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {venta.items.map((item, index) => (
              <tr key={index}>
                <td className="producto-nombre">
                  {item.nombre}
                  <span className="producto-formato">({item.formato})</span>
                </td>
                <td className="text-center">{item.cantidad}</td>
                <td className="text-right">L. {item.precio.toFixed(2)}</td>
                <td className="text-right">L. {item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="factura-totales">
          <div className="factura-totales-row">
            <span>Total:</span>
            <strong>L. {venta.totalVenta.toFixed(2)}</strong>
          </div>
          <div className="factura-totales-row">
            <span>Recibido:</span>
            <strong>L. {venta.dineroRecibido.toFixed(2)}</strong>
          </div>
          <div className="factura-totales-row factura-total-final">
            <span>Vuelto:</span>
            <strong>L. {venta.vuelto.toFixed(2)}</strong>
          </div>
        </div>

        {/* Pie de Factura */}
        <div className="factura-footer">
          <p className="factura-agradecimiento">¡Gracias por su compra!</p>
          <p className="factura-mensaje">Todos nuestros productos cuentan con garantía.</p>
          <p className="factura-mensaje">Conserve esta factura como comprobante.</p>
        </div>

        {/* Botones (no se imprimen) */}
        <div className="factura-botones no-print">
          <button onClick={handlePrint} className="boton-modal-agregar">
            🖨️ Imprimir
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