import React, { useState, useEffect } from 'react';

function ModalAgregarProducto({ producto, onClose, onAdd }) {
  const [cantidad, setCantidad] = useState(1);
  const [formatoSeleccionado, setFormatoSeleccionado] = useState(null);
  const [error, setError] = useState('');

  // Validar que el producto tenga la información necesaria
  if (!producto || !producto.formatosVenta || !Array.isArray(producto.formatosVenta) || producto.formatosVenta.length === 0) {
    return (
      <div className="modal-backdrop">
        <div className="modal-content">
          <h3>Error</h3>
          <p>El producto no tiene formatos de venta disponibles.</p>
          <div className="modal-botones">
            <button onClick={onClose} className="boton-modal-cancelar">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (producto && producto.formatosVenta && producto.formatosVenta.length > 0) {
      setFormatoSeleccionado(producto.formatosVenta[0]);
      setCantidad(1);
      setError('');
    }
  }, [producto]);

  const handleAddClick = () => {
    if (!producto || !formatoSeleccionado) {
      setError('No se puede agregar el producto. Información incompleta.');
      return;
    }

    const cantidadTotal = Number(cantidad) * (formatoSeleccionado.unidades || 1);
    const stockDisponible = producto.stockUnidades || 0;
    
    if (cantidadTotal > stockDisponible) {
      setError(`Stock insuficiente. Solo hay ${stockDisponible} unidades disponibles.`);
      return;
    }
    
    if (cantidadTotal <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    setError('');
    onAdd(producto, formatoSeleccionado, Number(cantidad));
    onClose(); 
  };

  const handleFormatoChange = (e) => {
    if (!producto || !producto.formatosVenta) return;
    const formato = producto.formatosVenta.find(f => f.nombre === e.target.value);
    if (formato) {
      setFormatoSeleccionado(formato);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3>{producto?.nombre || 'Producto'} {producto?.tamaño ? `- ${producto.tamaño}` : ''}</h3>
        
        <div className="form-group">
          <label>Formato:</label>
          <select 
            value={formatoSeleccionado?.nombre || ''} 
            onChange={handleFormatoChange}
          >
            {producto?.formatosVenta?.map(f => (
              <option key={f.nombre} value={f.nombre}>
                {f.nombre} (L. {(f.precio || 0).toFixed(2)})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Cantidad:</label>
          <input 
            type="number" 
            value={cantidad}
            onChange={(e) => {
              setCantidad(e.target.value);
              setError('');
            }}
            min="1"
            className="modal-input-cantidad"
          />
          <div className="stock-info">
            Stock disponible: {producto?.stockUnidades || 0} unidades
            <br/>
            {formatoSeleccionado?.unidades > 1 && (
              <small>
                Este formato requiere {formatoSeleccionado?.unidades} unidades por venta
              </small>
            )}
          </div>
          {error && <div className="error-message">{error}</div>}
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