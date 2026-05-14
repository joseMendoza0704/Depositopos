// En: src/components/ModalCobro.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from '../context/NotificationContext';

function ModalCobro({ totalAPagar, onClose, onConfirmarVenta }) {
  const { showAlert } = useNotification();
  const [dineroRecibido, setDineroRecibido] = useState('');
  const [vuelto, setVuelto] = useState(0);

  // Este 'ref' es para auto-enfocar el input cuando el modal se abre
  const inputRef = useRef(null);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Calcula el vuelto cada vez que el dinero recibido cambia
  useEffect(() => {
    const recibidoNum = Number(dineroRecibido) || 0;
    setVuelto(recibidoNum - totalAPagar);
  }, [dineroRecibido, totalAPagar]);

  // Maneja el Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleConfirmClick();
    }
  };

  const handleConfirmClick = () => {
    const recibidoNum = Number(dineroRecibido) || 0;
    if (recibidoNum < totalAPagar) {
      showAlert("El monto recibido no puede ser menor al total.", 'error');
      return;
    }
    // Llama a la función de 'PuntoDeVenta' para guardar la venta
    onConfirmarVenta(recibidoNum, vuelto);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content cobro-modal">
        <h3>Realizar Cobro</h3>

        <div className="cobro-display">
          <div className="cobro-total">
            <span>Total a Pagar:</span>
            <strong>L. {totalAPagar.toFixed(2)}</strong>
          </div>
          <div className="cobro-vuelto">
            <span>Cambio:</span>
            <strong>L. {vuelto.toFixed(2)}</strong>
          </div>
        </div>

        <div className="form-group">
          <label>Dinero Recibido:</label>
          <input
            type="number"
            className="cobro-input"
            value={dineroRecibido}
            onChange={(e) => setDineroRecibido(e.target.value)}
            onKeyDown={handleKeyDown}
            ref={inputRef}
            placeholder="Ingrese el monto..."
          />
        </div>

        <div className="modal-botones">
          <button
            onClick={handleConfirmClick}
            className="boton-modal-agregar"
            // Deshabilita el botón si no se ha pagado completo
            disabled={Number(dineroRecibido) < totalAPagar}
          >
            Confirmar Venta
          </button>
          <button onClick={onClose} className="boton-modal-cancelar">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalCobro;