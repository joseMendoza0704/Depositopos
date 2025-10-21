import React, { useState, useEffect } from 'react';

function ModalAgregarProducto({ producto, onClose, onAdd }) {
  const [cantidad, setCantidad] = useState(1);
  const [formatoSeleccionado, setFormatoSeleccionado] = useState(producto.formatosVenta[0]);

  useEffect(() => {
    setFormatoSeleccionado(producto.formatosVenta[0]);
    setCantidad(1);
  }, [producto]);

  const handleAddClick = () => {
    onAdd(producto, formatoSeleccionado, Number(cantidad));
    onClose(); 
  };

  const handleFormatoChange = (e) => {
    const formato = producto.formatosVenta.find(f => f.nombre === e.target.value);
    setFormatoSeleccionado(formato);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3>{producto.nombre} - {producto.tamaño}</h3>
        
        <div className="form-group">
          <label>Formato:</label>
          <select value={formatoSeleccionado.nombre} onChange={handleFormatoChange}>
            {producto.formatosVenta.map(f => (
              <option key={f.nombre} value={f.nombre}>
                {f.nombre} (L. {f.precio.toFixed(2)})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Cantidad:</label>
          <input 
            type="number" 
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            min="1"
            className="modal-input-cantidad"
          />
        </div>

        <div className="modal-botones">
          <button onClick={handleAddClick} className="boton-modal-agregar">
            Añadir al Carrito
          </button>
          <button onClick={onClose} className="boton-modal-cancelar">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalAgregarProducto;