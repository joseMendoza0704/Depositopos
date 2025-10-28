// En: src/components/ModalMensaje.jsx
import React, { useEffect } from 'react';

// Recibe: mensaje, tipo ('exito' o 'error'), y función onClose
function ModalMensaje({ mensaje, tipo = 'exito', onClose }) {

  // Cierra el modal automáticamente después de unos segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2500); // Cierra después de 2.5 segundos

    // Limpia el temporizador si el componente se desmonta antes
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="modal-backdrop simple-modal-backdrop">
      <div className={`modal-content simple-modal-content ${tipo === 'error' ? 'error-modal' : 'exito-modal' }`}>
        <p>{mensaje}</p>
        <button onClick={onClose} className="simple-modal-close-button">Cerrar</button>
      </div>
    </div>
  );
}

export default ModalMensaje;
