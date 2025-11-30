import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, getDocs } from 'firebase/firestore'; // Quitamos startAt/endAt
import '../styles/ModalBuscarCliente.css';

function ModalBuscarCliente({ onClose, onSelectCliente }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para guardar TODOS los clientes de la base de datos (sin filtrar)
  const [todosLosClientes, setTodosLosClientes] = useState([]);
  // Estado para lo que mostramos en pantalla
  const [clientesFiltrados, setClientesFiltrados] = useState([]);

  const [loading, setLoading] = useState(true);

  // 1. Cargar TODOS los clientes UNA SOLA VEZ al inicio
  useEffect(() => {
    const cargarClientes = async () => {
      try {
        const clientesRef = collection(db, 'clientes');
        // Traemos todos ordenados por nombre
        const q = query(clientesRef, orderBy('nombre'));

        const snapshot = await getDocs(q);
        const listaCompleta = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setTodosLosClientes(listaCompleta);
        setClientesFiltrados(listaCompleta); // Al principio mostramos todos
      } catch (error) {
        console.error('Error cargando clientes:', error);
        setClientesFiltrados([]);
      } finally {
        setLoading(false);
      }
    };

    cargarClientes();
  }, []);

  // 2. Filtrar en tiempo real cuando el usuario escribe (sin llamar a Firebase de nuevo)
  useEffect(() => {
    if (!searchTerm.trim()) {
      setClientesFiltrados(todosLosClientes);
      return;
    }

    const termino = searchTerm.toLowerCase();
    const resultados = todosLosClientes.filter(cliente => {
      // Buscamos por nombre O teléfono (convirtiendo todo a minúsculas para evitar errores)
      const nombre = cliente.nombre ? cliente.nombre.toLowerCase() : '';
      const telefono = cliente.telefono ? String(cliente.telefono) : '';

      return nombre.includes(termino) || telefono.includes(termino);
    });

    setClientesFiltrados(resultados);
  }, [searchTerm, todosLosClientes]);

  // Mantenemos tu handler original que funciona
  const handleSelectCliente = (cliente) => {
    onSelectCliente(cliente);
    // NOTA: No llamamos a onClose() aquí, dejamos que el padre maneje el cierre
    // como lo hacía tu versión original.
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3>Buscar Cliente</h3>

        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            autoFocus
          />
        </div>

        <div className="clientes-list">
          {loading ? (
            <div className="loading-message">Cargando clientes...</div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="empty-message">
              {searchTerm ? 'No se encontraron clientes' : 'Escriba para buscar un cliente'}
            </div>
          ) : (
            clientesFiltrados.map(cliente => (
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
