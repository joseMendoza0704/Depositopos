import React, { useState, useEffect } from 'react';
// Asegúrate de que las rutas sean correctas
import { db, auth } from '../firebaseConfig.js'; 
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import ModalNuevoPedido from '../components/ModalNuevoPedido.jsx';
import PedidoCard from '../components/PedidoCard.jsx';
import '../styles/pedidos.css';

// Componente principal de la pantalla de Pedidos
// Recibe 'cajaActual' desde el Dashboard para saber si puede crear pedidos
function GestionPedidos({ cajaActual }) {
  const [loading, setLoading] = useState(false); // Empezamos en false, se activará al cargar datos
  const [pedidos, setPedidos] = useState([]);
  const [filtro, setFiltro] = useState(''); // Para el buscador
  const [showNuevoPedido, setShowNuevoPedido] = useState(false);
  const [pedidoParaEditar, setPedidoParaEditar] = useState(null);

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
    
    const nombreMatch = p.cliente.nombre ? 
      p.cliente.nombre.toLowerCase().includes(filtro.toLowerCase()) : 
      false;
    
    const telefonoMatch = p.cliente.telefono ? 
      String(p.cliente.telefono).includes(filtro) : 
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

      {/* --- Tablero de 3 Columnas --- */}
      <div className="columnas-pedidos">
        
        {/* Columna Recibido */}
        <div className="columna-pedido">
          <div className="columna-header" style={{ backgroundColor: '#ffc107', color: '#333' }}>
            <h3>Recibido ({pedidosRecibidos.length})</h3>
          </div>
          <div className="columna-body">
            {pedidosRecibidos.map((pedido) => (
              <PedidoCard
                key={pedido.id}
                pedido={pedido}
                onEdit={handleEditarPedido}
                onRecargarPedidos={() => {
                  // La recarga es automática por el onSnapshot
                }}
              />
            ))}
            {pedidosRecibidos.length === 0 && <p className="columna-vacia-msg">No hay pedidos recibidos.</p>}
          </div>
        </div>
        
        {/* Columna Enviado */}
        <div className="columna-pedido">
          <div className="columna-header" style={{ backgroundColor: '#007bff' }}>
            <h3>Enviado ({pedidosEnviados.length})</h3>
          </div>
          <div className="columna-body">
            {pedidosEnviados.map((pedido) => (
              <PedidoCard
                key={pedido.id}
                pedido={pedido}
                onEdit={handleEditarPedido}
                onRecargarPedidos={() => {
                  // La recarga es automática por el onSnapshot
                }}
              />
            ))}
            {pedidosEnviados.length === 0 && <p className="columna-vacia-msg">No hay pedidos en ruta.</p>}
          </div>
        </div>
        
        {/* Columna Pagado (Hoy) */}
        <div className="columna-pedido">
          <div className="columna-header" style={{ backgroundColor: '#28a745' }}>
            <h3>Pagado (Hoy) ({pedidosPagados.length})</h3>
          </div>
          <div className="columna-body">
            {pedidosPagados.map((pedido) => (
              <PedidoCard
                key={pedido.id}
                pedido={pedido}
                onEdit={handleEditarPedido}
                onRecargarPedidos={() => {
                  // La recarga es automática por el onSnapshot
                }}
              />
            ))}
            {pedidosPagados.length === 0 && <p className="columna-vacia-msg">No hay pedidos pagados hoy.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GestionPedidos;