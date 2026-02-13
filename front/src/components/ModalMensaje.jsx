import React, { useEffect } from 'react';
import '../styles/styles.css'; // Aseguramos que los estilos estén disponibles

// Recibe: mensaje, tipo ('exito', 'error', 'info'), y función onClose
function ModalMensaje({ mensaje, tipo = 'exito', onClose }) {

  // Cierra el modal automáticamente después de unos segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // 3 segundos

    // Limpia el temporizador si el componente se desmonta antes
    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (tipo) {
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '✅';
    }
  };

  const getTitle = () => {
    switch (tipo) {
      case 'error': return 'Error';
      case 'info': return 'Información';
      default: return '¡Éxito!';
    }
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 2000 }}>
      <div className={`modal-content ${tipo === 'error' ? 'error-modal' : 'exito-modal'}`} style={{ maxWidth: '400px', textAlign: 'center', padding: '30px' }}>
        <div style={{ fontSize: '3em', marginBottom: '15px' }}>
          {getIcon()}
        </div>
        <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{getTitle()}</h3>
        <p style={{ fontSize: '1.1em', color: '#555', margin: '0 0 20px 0' }}>{mensaje}</p>
        <button
          onClick={onClose}
          className="boton-modal-cancelar"
          style={{ width: '100%', padding: '10px', fontSize: '1em' }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default ModalMensaje;
