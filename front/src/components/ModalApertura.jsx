// En: src/components/ModalApertura.jsx
import React, { useState, useEffect, useRef } from 'react';

function ModalApertura({ onClose, onConfirmarApertura }) {
  const [montoInicial, setMontoInicial] = useState('');

  // Este 'ref' es para auto-enfocar el input cuando el modal se abre
  const inputRef = useRef(null);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Maneja el Enter
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleConfirmClick();
    }
  };

  const handleConfirmClick = () => {
    const montoNum = Number(montoInicial) || 0;
    if (montoNum < 0) {
      alert("El monto no puede ser negativo.");
      return;
    }
    // Llama a la función de 'Dashboard' para guardar la apertura
    onConfirmarApertura(montoNum);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content cobro-modal">
        <h3>Apertura de Caja</h3>
        
        <div className="form-group">
          <label>Fondo de Caja Inicial:</label>
          <input 
            type="number" 
            className="cobro-input"
            value={montoInicial}
            onChange={(e) => setMontoInicial(e.target.value)}
            onKeyDown={handleKeyDown}
            ref={inputRef}
            placeholder="Ingrese el monto inicial..."
          />
        </div>

        <div className="modal-botones">
          <button 
            onClick={handleConfirmClick} 
            className="boton-modal-agregar"
          >
            Confirmar Apertura
          </button>
          <button onClick={onClose} className="boton-modal-cancelar">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalApertura;