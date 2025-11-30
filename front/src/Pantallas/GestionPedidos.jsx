import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.js';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import ModalNuevoPedido from '../components/ModalNuevoPedido.jsx';
import PedidoCard from '../components/PedidoCard.jsx';
import '../styles/pedidos.css';

// --- Sub-componente para manejar el Carrusel de cada columna ---
const ColumnaCarrusel = ({ titulo, pedidos, colorHeader, onEdit, textoVacio }) => {
  const [indiceActual, setIndiceActual] = useState(0);

  // Resetear índice si cambia la longitud de pedidos (ej. filtro o nuevos pedidos)
  useEffect(() => {
    setIndiceActual(0);
  }, [pedidos.length]);

  const handlePrev = () => {
    setIndiceActual(prev => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setIndiceActual(prev => (prev < pedidos.length - 1 ? prev + 1 : prev));
  };

  const pedidoActual = pedidos[indiceActual];

  return (
    <div className="columna-pedido">
      <div className="columna-header" style={{ backgroundColor: colorHeader, color: colorHeader === '#ffc107' ? '#333' : 'white' }}>
        <h3>{titulo} ({pedidos.length})</h3>
      </div>

      <div className="carrusel-container">
        {pedidos.length > 0 ? (
          <>
            <div className="carrusel-controles">
              <button
                className="btn-carrusel"
                onClick={handlePrev}
                disabled={indiceActual === 0}
                title="Anterior"
              >
                ‹
              </button>

              <span className="carrusel-contador">
                {indiceActual + 1} / {pedidos.length}
              </span>

              <button
                className="btn-carrusel"
                onClick={handleNext}
                disabled={indiceActual === pedidos.length - 1}
                title="Siguiente"
              >
                ›
              </button>
            </div>

            {/* Renderizamos solo el pedido actual */}
            <PedidoCard
              key={pedidoActual.id}
              pedido={pedidoActual}
              onEdit={onEdit}
              onRecargarPedidos={() => { }} // Automático por snapshot
            />
          </>
        ) : (
          <p className="columna-vacia-msg">{textoVacio}</p>
        )}
      </div>
    </div>
  );
};

// --- Componente Principal ---
function GestionPedidos({ cajaActual }) {
  const [loading, setLoading] = useState(false);
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [showNuevoPedido, setShowNuevoPedido] = useState(false);
  const [pedidoParaEditar, setPedidoParaEditar] = useState(null);

  const handleEditarPedido = (pedido) => {
    setPedidoParaEditar(pedido);
    setShowNuevoPedido(true);
  };

  useEffect(() => {
    setLoading(true);
    const pedidosRef = collection(db, 'pedidos');
    // Ordenamos por fecha para que salgan primero los nuevos
    const q = query(pedidosRef, orderBy('fechaCreacion', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const pedidosData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        if (!data.items || !Array.isArray(data.items)) data.items = [];

        return {
          id: doc.id,
          cliente: {
            nombre: data.cliente?.nombre || data.nombre || 'Cliente sin nombre',
            direccion: data.cliente?.direccion || data.direccion || '',
            telefono: String(data.cliente?.telefono || data.telefono || ''),
            mapa: data.cliente?.mapa || data.mapa || null
          },
          items: data.items.map(item => ({
            cantidad: Number(item.cantidad) || 0,
            costoTotalItem: Number(item.costoTotalItem) || 0,
            formato: item.formato || '',
            id: item.id || '',
            nombre: item.nombre || 'Producto sin nombre',
            precio: Number(item.precio) || 0,
            subtotal: Number(item.subtotal) || 0,
            tamaño: item.tamaño || '',
            unidades: Number(item.unidades) || 0
          })),
          estado: data.estado || 'pendiente',
          fechaCreacion: data.fechaCreacion || Timestamp.now(),
          total: Number(data.total) || 0
        };
      });

      setPedidos(pedidosData);
      setLoading(false);
    }, (error) => {
      console.error("Error al obtener pedidos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const pedidosFiltrados = pedidos.filter(p => {
    if (!p || !p.cliente) return false;
    const termino = filtro.toLowerCase();
    const nombreMatch = p.cliente.nombre ? p.cliente.nombre.toLowerCase().includes(termino) : false;
    const telefonoMatch = p.cliente.telefono ? String(p.cliente.telefono).includes(termino) : false;
    return nombreMatch || telefonoMatch;
  });

  const pedidosRecibidos = pedidosFiltrados.filter(p => p.estado === 'recibido');
  const pedidosEnviados = pedidosFiltrados.filter(p => p.estado === 'enviado');
  const pedidosPagados = pedidosFiltrados.filter(p => p.estado === 'pagado');

  return (
    <div className="tablero-pedidos">
      <div className="controles-tablero">
        <h2>Gestión de Pedidos</h2>
        <button
          className="pos-button"
          style={{ backgroundColor: '#6c757d', borderColor: '#6c757d', color: 'white', flexGrow: 0.5 }}
          disabled={!cajaActual}
          onClick={() => setShowNuevoPedido(true)}
        >
          + Nuevo Pedido
        </button>
      </div>

      <div className="controles-tablero-filtro">
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono de cliente..."
          className="pos-search-bar"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      {showNuevoPedido && (
        <ModalNuevoPedido
          pedidoParaEditar={pedidoParaEditar}
          onClose={() => {
            setShowNuevoPedido(false);
            setPedidoParaEditar(null);
          }}
          onCrear={() => {
            setShowNuevoPedido(false);
            setPedidoParaEditar(null);
          }}
        />
      )}

      {loading && <p>Cargando pedidos...</p>}
      {!cajaActual && !loading && (
        <p className="advertencia-caja-cerrada">
          La caja está cerrada. No puedes crear nuevos pedidos ni marcarlos como pagados.
        </p>
      )}

      <div className="columnas-pedidos">
        <ColumnaCarrusel
          titulo="Recibido"
          pedidos={pedidosRecibidos}
          colorHeader="#ffc107"
          onEdit={handleEditarPedido}
          textoVacio="No hay pedidos recibidos."
        />

        <ColumnaCarrusel
          titulo="Enviado"
          pedidos={pedidosEnviados}
          colorHeader="#007bff"
          onEdit={handleEditarPedido}
          textoVacio="No hay pedidos en ruta."
        />

        <ColumnaCarrusel
          titulo="Pagado (Hoy)"
          pedidos={pedidosPagados}
          colorHeader="#28a745"
          onEdit={handleEditarPedido}
          textoVacio="No hay pedidos pagados hoy."
        />
      </div>
    </div>
  );
}

export default GestionPedidos;
