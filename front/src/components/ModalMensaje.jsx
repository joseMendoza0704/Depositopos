import React, { useEffect } from 'react';
import { XCircle, Info, CheckCircle, X } from 'lucide-react';
import '../styles/styles.css';

function ModalMensaje({ mensaje, tipo = 'exito', onClose }) {

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getIcon = () => {
    switch (tipo) {
      case 'error': return <XCircle size={48} className="text-red-500" />;
      case 'info': return <Info size={48} className="text-blue-500" />;
      default: return <CheckCircle size={48} className="text-green-500" />;
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
        <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>
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
