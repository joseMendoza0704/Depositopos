import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, getDocs, startAt, endAt } from 'firebase/firestore';
import '../styles/ModalBuscarCliente.css';

function ModalBuscarCliente({ onClose, onSelectCliente }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);

  const buscarClientes = async (term) => {
    setLoading(true);
    try {
      const clientesRef = collection(db, 'clientes');
      let q;
      
      if (term.trim()) {
        // Búsqueda por término
        const termLower = term.toLowerCase();
        q = query(
          clientesRef,
          orderBy('nombre'),
          startAt(termLower),
          endAt(termLower + '\uf8ff')
        );
      } else {
        // Si no hay término, muestra todos ordenados por nombre
        q = query(clientesRef, orderBy('nombre'));
      }
      
      const snapshot = await getDocs(q);
      const resultados = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setClientes(resultados);
    } catch (error) {
      console.error('Error buscando clientes:', error);
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar clientes inicialmente y cuando se busque
  useEffect(() => {
    const timer = setTimeout(() => {
      buscarClientes(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelectCliente = (cliente) => {
    onSelectCliente(cliente);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3>Buscar Cliente</h3>
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            autoFocus
          />
        </div>

        <div className="clientes-list">
          {loading ? (
            <div className="loading-message">Buscando clientes...</div>
          ) : clientes.length === 0 ? (
            <div className="empty-message">
              {searchTerm ? 'No se encontraron clientes' : 'Escriba para buscar un cliente'}
            </div>
          ) : (
            clientes.map(cliente => (
              <div 
                key={cliente.id} 
                className="cliente-item"
                onClick={() => handleSelectCliente(cliente)}
              >
                <div className="cliente-info-main">
                  <div className="cliente-nombre">{cliente.nombre}</div>
                  <div className="cliente-telefono">📞 {cliente.telefono}</div>
                </div>
                {cliente.direccion && (
                  <div className="cliente-direccion">
                    📍 {cliente.direccion}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="modal-botones">
          <button 
            onClick={onClose} 
            className="boton-modal-cancelar"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalBuscarCliente;