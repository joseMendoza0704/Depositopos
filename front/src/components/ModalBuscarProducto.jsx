import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import '../styles/ModalBuscarProducto.css';

function ModalBuscarProducto({ onClose, onSelectProducto }) {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const productosRef = collection(db, 'productos');
        const snapshot = await getDocs(productosRef);
        
        const productosData = snapshot.docs.map(doc => {
          const data = doc.data();
          
          const stock = data.stockUnidades || data.stock || 0;
          const formato = data.tamaño || data.formato || 'Sin formato';
          const precio = (data.formatosVenta && data.formatosVenta.length > 0)
            ? data.formatosVenta[0].precio
            : (data.precio || 0);

          return {
            ...data, 
            id: doc.id,
            nombre: data.nombre || 'Sin nombre',
            formato: formato, 
            stock: stock,     
            precio: precio    
          };

        }).filter(producto => producto.nombre); 

        setProductos(productosData);
        setProductosFiltrados(productosData);
        setCargando(false);
      } catch (error) {
        console.error('Error al cargar productos:', error);
        setCargando(false);
      }
    };

    cargarProductos();
  }, []);

  useEffect(() => {
    // Filtrar productos basado en la búsqueda
    const resultados = productos.filter(producto => {
      if (!producto) return false;
      
      const nombreMatch = producto.nombre 
        ? producto.nombre.toString().toLowerCase().includes(busqueda.toLowerCase())
        : false;
        
      const formatoMatch = producto.formato
        ? producto.formato.toString().toLowerCase().includes(busqueda.toLowerCase())
        : false;
        
      return nombreMatch || formatoMatch;
    });
    setProductosFiltrados(resultados);
  }, [busqueda, productos]);

  // --- FUNCIÓN CORREGIDA ---
  const handleProductoClick = (producto) => {
    // 1. Validar que el producto sea un objeto válido
    if (!producto || !producto.id || typeof producto.stock === 'undefined') {
      console.error('Producto inválido o datos de stock faltantes:', producto);
      return;
    }

    // 2. No permitir seleccionar productos sin stock
    //    (La variable 'producto.stock' fue corregida en cargarProductos)
    if (producto.stock <= 0) {
      console.warn('Intento de seleccionar producto sin stock:', producto);
      return; // No hacer nada, la clase 'sin-stock' ya lo indica visualmente
    }
    
    // 3. Enviar el objeto 'producto' COMPLETO al componente padre.
    //    Este objeto ya contiene 'stock', 'stockUnidades', 'formatosVenta', 'tamaño', etc.
    onSelectProducto(producto); 
    onClose();
  };
  // --- FIN DE LA CORRECCIÓN ---

  const formatearPrecio = (precio) => {
    return typeof precio === 'number' ? `L. ${precio.toFixed(2)}` : 'Precio no disponible';
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Buscar Producto</h3>
        </div>

        <input
          type="text"
          className="search-input"
          placeholder="Buscar por nombre o formato..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          autoFocus
        />

        <div className="productos-lista">
          {cargando ? (
            <div className="cargando">Cargando productos...</div>
          ) : productosFiltrados.length > 0 ? (
            productosFiltrados.map((producto) => (
              <div
                key={producto.id}
                className={`producto-item ${producto.stock <= 0 ? 'sin-stock' : ''}`}
                onClick={() => handleProductoClick(producto)}
              >
                <div className="producto-info">
                  <div className="producto-nombre">
                    {producto.nombre}
                    {producto.stock <= 0 && (
                      <span className="sin-stock-badge">Sin Stock</span>
                    )}
                  </div>
                  <div className="producto-detalles">
                    {producto.formatosVenta && producto.formatosVenta.length > 0 ? (
                      producto.formatosVenta.map((formato, index) => (
                        <div key={index} className="formato-detalle">
                          <span>Formato: {formato.nombre} ({formato.unidades} uds)</span>
                          <span>Precio: L. {formato.precio.toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <span>Formato: {producto.formato}</span>
                        <span>Precio: {formatearPrecio(producto.precio)}</span>
                      </>
                    )}
                    <span>Stock: {producto.stock || 0}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="sin-resultados">
              No se encontraron productos que coincidan con la búsqueda
            </div>
          )}
        </div>

        <div className="modal-botones">
          <button 
            className="boton-modal boton-cancelar"
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalBuscarProducto;