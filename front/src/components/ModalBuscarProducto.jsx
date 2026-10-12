import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import '../styles/ModalBuscarProducto.css';

function ModalBuscarProducto({ onClose, onSelectProducto }) {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);

  // Cargar categorías desde la base de datos
  useEffect(() => {
    const cargarCategorias = async () => {
      try {
        const catRef = collection(db, 'categorias');
        const snapshot = await getDocs(catRef);
        const catsData = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            nombre: doc.data().nombre,
            ...doc.data()
          }))
          .filter((c) => c.nombre);
        setCategorias(catsData);
      } catch (error) {
        console.error('Error al cargar categorias:', error);
      }
    };

    cargarCategorias();
  }, []);

  // Cargar productos desde la base de datos
  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const productosRef = collection(db, 'productos');
        const snapshot = await getDocs(productosRef);

        const productosData = snapshot.docs
          .map((doc) => {
            const data = doc.data();

            const stock = data.stockUnidades || data.stock || 0;
            const formato = data.tamaño || data.formato || 'Unidad';
            const precio =
              data.formatosVenta && data.formatosVenta.length > 0
                ? Number(data.formatosVenta[0].precio) || 0
                : Number(data.precio) || 0;

            return {
              ...data,
              id: doc.id,
              nombre: data.nombre || 'Sin nombre',
              formato: formato,
              stock: Number(stock) || 0,
              precio: precio,
              categoriaId: data.categoriaId || '',
              categoriaNombre: data.categoriaNombre || data.categoria || ''
            };
          })
          .filter((producto) => producto.nombre);

        setProductos(productosData);
        setCargando(false);
      } catch (error) {
        console.error('Error al cargar productos:', error);
        setCargando(false);
      }
    };

    cargarProductos();
  }, []);

  // Filtrado de productos por búsqueda y categoría seleccionada
  const productosFiltrados = productos.filter((producto) => {
    // Filtro de búsqueda
    const query = busqueda.trim().toLowerCase();
    const coincideBusqueda =
      !query ||
      producto.nombre?.toLowerCase().includes(query) ||
      producto.formato?.toLowerCase().includes(query) ||
      (producto.formatosVenta &&
        producto.formatosVenta.some((f) =>
          f.nombre?.toLowerCase().includes(query)
        ));

    // Filtro de categoría
    let coincideCategoria = true;
    if (categoriaSeleccionada !== 'todos') {
      const catObj = categorias.find((c) => c.id === categoriaSeleccionada);
      const catNombre = catObj?.nombre?.toLowerCase() || '';

      coincideCategoria =
        producto.categoriaId === categoriaSeleccionada ||
        producto.categoriaNombre?.toLowerCase() === catNombre ||
        producto.categoria?.toLowerCase() === catNombre ||
        producto.categoria === categoriaSeleccionada;
    }

    return coincideBusqueda && coincideCategoria;
  });

  const handleProductoClick = (producto) => {
    if (!producto || !producto.id) return;
    if (producto.stock <= 0) return;

    onSelectProducto(producto);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content modal-buscar-producto-content">
        {/* Handle superior */}
        <div className="modal-top-handle"></div>

        {/* Encabezado */}
        <div className="buscar-producto-header">
          <div className="buscar-producto-titulo-col">
            <h3>Buscar Producto</h3>
            <p className="buscar-producto-subtitulo">
              Seleccione productos para agregarlos al pedido
            </p>
          </div>
          <button
            className="btn-cerrar-circulo"
            onClick={onClose}
            title="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Barra de búsqueda con icono */}
        <div className="buscar-input-container">
          <span className="buscar-icono">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre o formato..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            autoFocus
          />
          {busqueda && (
            <button
              className="btn-limpiar-busqueda"
              onClick={() => setBusqueda('')}
              title="Borrar búsqueda"
            >
              ✕
            </button>
          )}
        </div>

        {/* Pills de categorías cargadas desde la BD */}
        <div className="categorias-pills-row">
          <button
            className={`categoria-pill ${
              categoriaSeleccionada === 'todos' ? 'activa' : ''
            }`}
            onClick={() => setCategoriaSeleccionada('todos')}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              className={`categoria-pill ${
                categoriaSeleccionada === cat.id ? 'activa' : ''
              }`}
              onClick={() => setCategoriaSeleccionada(cat.id)}
            >
              {cat.nombre}
            </button>
          ))}
        </div>

        {/* Lista de productos */}
        <div className="productos-lista-moderna">
          {cargando ? (
            <div className="productos-estado-mensaje">Cargando productos...</div>
          ) : productosFiltrados.length > 0 ? (
            productosFiltrados.map((producto) => {
              const tieneStock = producto.stock > 0;
              const formatoTexto =
                producto.formatosVenta && producto.formatosVenta.length > 0
                  ? `Formato: ${producto.formatosVenta[0].nombre} (${producto.formatosVenta[0].unidades || 1} uds)`
                  : `Formato: ${producto.formato || 'Unidad'} (1 uds)`;

              return (
                <div
                  key={producto.id}
                  className={`producto-card-item ${
                    !tieneStock ? 'card-sin-stock' : ''
                  }`}
                >
                  <div className="producto-card-header">
                    <div className="producto-card-nombre-box">
                      <span className="producto-card-nombre">
                        {producto.nombre}
                      </span>
                      {!tieneStock && (
                        <span className="badge-sin-stock">Sin Stock</span>
                      )}
                    </div>
                    {tieneStock ? (
                      <span className="badge-stock-disponible">
                        Stock: {producto.stock}
                      </span>
                    ) : (
                      <span className="badge-stock-cero">Stock: 0</span>
                    )}
                  </div>

                  <div className="producto-card-formato">
                    {formatoTexto}
                  </div>

                  <div className="producto-card-footer">
                    <div className="producto-card-precio">
                      Precio:{' '}
                      <strong className="producto-card-precio-valor">
                        L. {producto.precio.toFixed(2)}
                      </strong>
                    </div>

                    {tieneStock ? (
                      <button
                        className="btn-agregar-producto-card"
                        onClick={() => handleProductoClick(producto)}
                      >
                        + Agregar
                      </button>
                    ) : (
                      <span className="badge-no-disponible">
                        No disponible
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="productos-estado-mensaje">
              No se encontraron productos que coincidan
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="modal-buscar-producto-footer">
          <button className="btn-buscar-cancelar" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-buscar-listo" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalBuscarProducto;