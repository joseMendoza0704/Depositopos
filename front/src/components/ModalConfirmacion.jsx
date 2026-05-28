import React from 'react';
import { AlertTriangle } from 'lucide-react';
import '../styles/styles.css';

function ModalConfirmacion({ mensaje, onConfirm, onCancel, textoConfirmar = 'Confirmar', textoCancelar = 'Cancelar' }) {
  return (
    <div className="modal-backdrop" style={{ zIndex: 2000 }}>
      <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px', borderTop: '5px solid #e74c3c' }}>
        <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'center' }}>
          <AlertTriangle size={48} color="#e74c3c" />
        </div>
        <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>¿Estás seguro?</h3>
        <p style={{ fontSize: '1.1em', color: '#555', margin: '0 0 20px 0' }}>{mensaje}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            className="boton-modal-cancelar"
            style={{ flex: 1, padding: '10px', fontSize: '1em' }}
          >
            {textoCancelar}
          </button>
          <button
            onClick={onConfirm}
            className="boton-modal-guardar"
            style={{ flex: 1, padding: '10px', fontSize: '1em', background: '#e74c3c' }}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalConfirmacion;
