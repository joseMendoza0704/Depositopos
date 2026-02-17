import React, { useState, useEffect } from 'react';
// Asegúrate de que las rutas sean correctas
import { db, auth } from '../firebaseConfig.js';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import ModalNuevoPedido from '../components/ModalNuevoPedido.jsx';
import PedidoCard from '../components/PedidoCard.jsx';
import '../styles/pedidos.css';

// --- Sub-componente para manejar el Carrusel de cada columna ---
const ColumnaCarrusel = ({ titulo, pedidos, colorHeader, onEdit, textoVacio }) => {
  const [indiceActual, setIndiceActual] = useState(0);

  // Resetear o ajustar índice si cambia la lista de pedidos
  useEffect(() => {
    if (pedidos.length === 0) {
      setIndiceActual(0);
    } else if (indiceActual >= pedidos.length) {
      // Si el índice actual se sale del rango (ej. borraste el último), regresa al anterior válido
      setIndiceActual(Math.max(0, pedidos.length - 1));
    }
  }, [pedidos.length, indiceActual]);

  const handlePrev = () => {
    setIndiceActual(prev => (prev > 0 ? prev - 1 : prev));
  };

  const handleNext = () => {
    setIndiceActual(prev => (prev < pedidos.length - 1 ? prev + 1 : prev));
  };

  // Obtener el pedido actual de forma segura
  const pedidoActual = pedidos[indiceActual];

  return (
    <div className="columna-pedido">
      <div className="columna-header" style={{ backgroundColor: colorHeader, color: colorHeader === '#ffc107' ? '#333' : 'white' }}>
        <h3>{titulo} ({pedidos.length})</h3>
      </div>

      <div className="carrusel-container">
        {/* CORRECCIÓN: Verificamos que pedidoActual exista antes de renderizar */}
        {pedidos.length > 0 && pedidoActual ? (
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
                disabled={indiceActual >= pedidos.length - 1}
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

//Componente principal de la pantalla de Pedidos
// Recibe 'cajaActual' desde el Dashboard para saber si puede crear pedidos
function GestionPedidos({ cajaActual }) {
  const [loading, setLoading] = useState(false); // Empezamos en false, se activará al cargar datos
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState(''); // Para el buscador
  const [showNuevoPedido, setShowNuevoPedido] = useState(false);
  const [pedidoParaEditar, setPedidoParaEditar] = useState(null);
  const [activeTab, setActiveTab] = useState('recibido'); // Estado para pestañas móviles

  // Función para manejar la edición de pedidos
  const handleEditarPedido = (pedido) => {
    setPedidoParaEditar(pedido);
    setShowNuevoPedido(true);
  };

  // Efecto para suscribirse a los cambios en pedidos
  useEffect(() => {
    setLoading(true);

    // Crear la consulta ordenada por fecha de creación descendente
    const pedidosRef = collection(db, 'pedidos');
    const q = query(pedidosRef, orderBy('fechaCreacion', 'desc'));

    // Suscribirse a los cambios
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const pedidosData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Validar que el documento tenga los campos necesarios
        if (!data.items || !Array.isArray(data.items)) {
          data.items = [];
        }

        // Construir el objeto pedido con la estructura correcta
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

    // Limpiar la suscripción al desmontar
    return () => unsubscribe();
  }, []);

  // Lógica para filtrar pedidos con validación
  const pedidosFiltrados = pedidos.filter(p => {
    if (!p || !p.cliente) return false;

    const termino = filtro.toLowerCase();
    const nombreMatch = p.cliente.nombre ?
      p.cliente.nombre.toLowerCase().includes(termino) :
      false;

    const telefonoMatch = p.cliente.telefono ?
      String(p.cliente.telefono).includes(termino) :
      false;

    return nombreMatch || telefonoMatch;
  });

  // Filtra por estado para las columnas
  const pedidosRecibidos = pedidosFiltrados.filter(p => p.estado === 'recibido');
  const pedidosEnviados = pedidosFiltrados.filter(p => p.estado === 'enviado');
  const pedidosPagados = pedidosFiltrados.filter(p => p.estado === 'pagado');

  return (
    <div className="tablero-pedidos">

      {/* Header: Título, Botón y Filtro */}
      <div className="controles-tablero">
        <h2>Gestión de Pedidos</h2>
        {/* Usamos el estilo del botón del POS pero lo personalizamos */}
        <button
          className="pos-button"
          style={{ backgroundColor: '#6c757d', borderColor: '#6c757d', color: 'white', flexGrow: 0.5 }}
          disabled={!cajaActual} // Deshabilitado si la caja está cerrada
          onClick={() => setShowNuevoPedido(true)}
        >
          + Nuevo Pedido
        </button>
      </div>

      {/* Filtro de Búsqueda */}
      <div className="controles-tablero-filtro">
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono de cliente..."
          className="pos-search-bar" // Reutilizamos el estilo del POS
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      </div>

      {/* Modal para crear/editar pedido */}
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

      {/* Mensaje de Caja Cerrada */}
      {loading && <p>Cargando pedidos...</p>}
      {!cajaActual && !loading && (
        <p className="advertencia-caja-cerrada">
          La caja está cerrada. No puedes crear nuevos pedidos ni marcarlos como pagados.
        </p>
      )}

      {/* --- Tablero de 3 Columnas (Carrusel) --- */}
      {/* --- Pestañas para Móvil --- */}
      <div className="tabs-movil">
        <button
          className={`tab-btn ${activeTab === 'recibido' ? 'active' : ''}`}
          onClick={() => setActiveTab('recibido')}
          style={{ borderColor: '#ffc107', color: activeTab === 'recibido' ? '#333' : '#666', backgroundColor: activeTab === 'recibido' ? '#ffc107' : 'transparent' }}
        >
          Recibido ({pedidosRecibidos.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'enviado' ? 'active' : ''}`}
          onClick={() => setActiveTab('enviado')}
          style={{ borderColor: '#007bff', color: activeTab === 'enviado' ? 'white' : '#666', backgroundColor: activeTab === 'enviado' ? '#007bff' : 'transparent' }}
        >
          Enviado ({pedidosEnviados.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'pagado' ? 'active' : ''}`}
          onClick={() => setActiveTab('pagado')}
          style={{ borderColor: '#28a745', color: activeTab === 'pagado' ? 'white' : '#666', backgroundColor: activeTab === 'pagado' ? '#28a745' : 'transparent' }}
        >
          Pagado ({pedidosPagados.length})
        </button>
      </div>


      {/* --- Tablero de Columnas (Responsive) --- */}
      <div className="columnas-pedidos">

        <div className={`columna-wrapper ${activeTab === 'recibido' ? 'active' : ''}`}>
          <ColumnaCarrusel
            titulo="Recibido"
            pedidos={pedidosRecibidos}
            colorHeader="#ffc107"
            onEdit={handleEditarPedido}
            textoVacio="No hay pedidos recibidos."
          />
        </div>

        <div className={`columna-wrapper ${activeTab === 'enviado' ? 'active' : ''}`}>
          <ColumnaCarrusel
            titulo="Enviado"
            pedidos={pedidosEnviados}
            colorHeader="#007bff"
            onEdit={handleEditarPedido}
            textoVacio="No hay pedidos en ruta."
          />
        </div>

        <div className={`columna-wrapper ${activeTab === 'pagado' ? 'active' : ''}`}>
          <ColumnaCarrusel
            titulo="Pagado (Hoy)"
            pedidos={pedidosPagados}
            colorHeader="#28a745"
            onEdit={handleEditarPedido}
            textoVacio="No hay pedidos pagados hoy."
          />
        </div>
      </div>
    </div>
  );
}

export default GestionPedidos;
