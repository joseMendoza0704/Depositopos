// En: src/pantallas/Inventario.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebaseConfig';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import '../styles/Inventario.css';
import RetiroInventario from '../components/RetiroInventario';
import ModalTransformarProducto from '../components/ModalTransformarProducto'; // <--- NUEVO IMPORT
import { useNotification } from '../context/NotificationContext';

/**
 * Componente de Gestión de Inventario
 */
function Inventario({ usuario }) {
  const { showAlert } = useNotification();

  // --- Estados del Formulario ---
  const [nombre, setNombre] = useState('');
  const [tamaño, setTamaño] = useState('');
  const [stock, setStock] = useState('');
  const [costo, setCosto] = useState('');
  const [precioUnidad, setPrecioUnidad] = useState('');
  const [fechaCaducidad, setFechaCaducidad] = useState('');

  // --- Estados de UI ---
  const [cargandoForm, setCargandoForm] = useState(false);
  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [productoIdSeleccionado, setProductoIdSeleccionado] = useState(null);

  const [mostrarRetiro, setMostrarRetiro] = useState(false);
  const [mostrarTransformar, setMostrarTransformar] = useState(false); // <--- NUEVO ESTADO

  // --- Estados de Filtros ---
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroVencidos, setFiltroVencidos] = useState(false);

  // --- Suscripción a productos en tiempo real ---
  useEffect(() => {
    const productosCollection = collection(db, 'productos');

    const unsubscribe = onSnapshot(
      productosCollection,
      (snapshot) => {
        const listaDeProductos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProductos(listaDeProductos);
        setCargandoProductos(false);
      },
      (error) => {
        console.error("Error al cargar productos:", error);
        setCargandoProductos(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // --- Limpia el formulario ---
  const limpiarFormulario = useCallback(() => {
    setNombre('');
    setTamaño('');
    setStock('');
    setCosto('');
    setPrecioUnidad('');
    setFechaCaducidad('');
    setProductoIdSeleccionado(null);
  }, []);

  // --- Selecciona un producto para editar ---
  const handleSelectProducto = useCallback((producto) => {
    setProductoIdSeleccionado(producto.id);
    setNombre(producto.nombre ?? '');
    setTamaño(producto.tamaño ?? '');
    setStock(producto.stockUnidades ?? '');
    setCosto(producto.precioCostoUnidad ?? '');
    setPrecioUnidad(producto.formatosVenta?.[0]?.precio ?? '');

    if (producto.fechaCaducidad) {
      const fecha = producto.fechaCaducidad.toDate();
      const fechaFormateada = fecha.toISOString().split('T')[0];
      setFechaCaducidad(fechaFormateada);
    } else {
      setFechaCaducidad('');
    }
  }, []);

  // --- Valida el formulario ---
  const validarFormulario = () => {
    if (!nombre.trim()) {
      showAlert('El nombre del producto es requerido', 'error');
      return false;
    }
    if (!tamaño.trim()) {
      showAlert('El tamaño del producto es requerido', 'error');
      return false;
    }
    if (!stock || Number(stock) < 0) {
      showAlert('El stock debe ser un número válido mayor o igual a 0', 'error');
      return false;
    }
    if (!costo || Number(costo) < 0) {
      showAlert('El costo debe ser un número válido mayor o igual a 0', 'error');
      return false;
    }
    if (!precioUnidad || Number(precioUnidad) < 0) {
      showAlert('El precio de venta debe ser un número válido mayor o igual a 0', 'error');
      return false;
    }
    return true;
  };

  // --- Maneja el envío del formulario ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (cargandoForm) return;
    if (!validarFormulario()) return;

    setCargandoForm(true);

    const datosProducto = {
      nombre: nombre.trim(),
      tamaño: tamaño.trim(),
      stockUnidades: Number(stock),
      precioCostoUnidad: Number(costo),
      formatosVenta: [
        {
          nombre: "Unidad",
          precio: Number(precioUnidad),
          unidades: 1
        }
      ],
      activo: true
    };

    if (fechaCaducidad) {
      const fecha = new Date(fechaCaducidad);
      fecha.setHours(0, 0, 0, 0);
      datosProducto.fechaCaducidad = Timestamp.fromDate(fecha);
    } else {
      datosProducto.fechaCaducidad = null;
    }

    try {
      if (productoIdSeleccionado) {
        const productoDoc = doc(db, 'productos', productoIdSeleccionado);
        await updateDoc(productoDoc, datosProducto);
        showAlert("✅ ¡Producto actualizado con éxito!", 'exito');
      } else {
        const productosCollection = collection(db, 'productos');
        await addDoc(productosCollection, datosProducto);
        showAlert("✅ ¡Producto agregado con éxito!", 'exito');
      }
      limpiarFormulario();
    } catch (error) {
      console.error("Error al guardar el producto:", error);
      showAlert("❌ Error al guardar el producto.", 'error');
    } finally {
      setCargandoForm(false);
    }
  };

  const handleDelete = async () => {
    if (!productoIdSeleccionado) return;
    if (!window.confirm(`¿Estás seguro de eliminar "${nombre}"?`)) return;

    setCargandoForm(true);
    try {
      const productoDoc = doc(db, 'productos', productoIdSeleccionado);
      await deleteDoc(productoDoc);
      showAlert("✅ ¡Producto eliminado con éxito!", 'exito');
      limpiarFormulario();
    } catch (error) {
      console.error("Error al eliminar el producto:", error);
      showAlert("❌ Error al eliminar el producto.", 'error');
    } finally {
      setCargandoForm(false);
    }
  };

  // --- Estados de Paginación ---
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina] = useState(20);

  const productosFiltrados = useMemo(() => {
    return productos.filter(producto => {
      if (filtroTexto) {
        const textoLower = filtroTexto.toLowerCase();
        const nombreMatch = producto.nombre?.toLowerCase().includes(textoLower);
        const tamañoMatch = producto.tamaño?.toLowerCase().includes(textoLower);
        if (!nombreMatch && !tamañoMatch) return false;
      }

      if (filtroVencidos && producto.fechaCaducidad) {
        const ahora = new Date();
        const fechaCad = producto.fechaCaducidad.toDate();
        if (fechaCad >= ahora) return false;
      }

      return true;
    });
  }, [productos, filtroTexto, filtroVencidos]);

  // Resetear a página 1 cuando cambian los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroTexto, filtroVencidos]);

  // Lógica de Paginación
  const indiceUltimoItem = paginaActual * itemsPorPagina;
  const indicePrimerItem = indiceUltimoItem - itemsPorPagina;
  const productosPaginados = productosFiltrados.slice(indicePrimerItem, indiceUltimoItem);
  const totalPaginas = Math.ceil(productosFiltrados.length / itemsPorPagina);

  const cambiarPagina = (numeroPagina) => setPaginaActual(numeroPagina);

  const estaVencido = (fechaCaducidad) => {
    if (!fechaCaducidad) return false;
    const ahora = new Date();
    const fechaCad = fechaCaducidad.toDate();
    return fechaCad < ahora;
  };

  const proximoAVencer = (fechaCaducidad) => {
    if (!fechaCaducidad) return false;
    const ahora = new Date();
    const fechaCad = fechaCaducidad.toDate();
    const diasDiferencia = Math.ceil((fechaCad - ahora) / (1000 * 60 * 60 * 24));
    return diasDiferencia > 0 && diasDiferencia <= 7;
  };

  return (
    <div className="inventario-container">
      <div className="inventario-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2>Gestión de Inventario</h2>

        <div style={{ display: 'flex', gap: '10px' }}>
          {/* BOTÓN NUEVO: Transformar */}
          <button
            onClick={() => setMostrarTransformar(true)}
            style={{
              backgroundColor: '#3498db', // Azul
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            🔄 Transformar / Mezclar
          </button>

          <button
            className="btn-retiro"
            onClick={() => setMostrarRetiro(true)}
            style={{
              backgroundColor: '#ffc107', // Amarillo
              color: '#333',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            📤 Retiro de Productos
          </button>
        </div>
      </div>

      {/* --- Modales --- */}
      {mostrarRetiro && (
        <RetiroInventario onClose={() => setMostrarRetiro(false)} />
      )}

      {/* --- Nuevo Modal --- */}
      {mostrarTransformar && (
        <ModalTransformarProducto
          onClose={() => setMostrarTransformar(false)}
          productos={productos}
        />
      )}

      {/* --- Formulario --- */}
      <form onSubmit={handleSubmit} className="producto-form">
        <h3>
          {productoIdSeleccionado ? '✏️ Editar Producto' : '➕ Añadir Nuevo Producto'}
        </h3>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="nombre">Nombre del Producto*</label>
            <input
              id="nombre"
              type="text"
              placeholder="Ej: Coca-Cola"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="tamaño">Tamaño*</label>
            <input
              id="tamaño"
              type="text"
              placeholder="Ej: ml o Lts"
              value={tamaño}
              onChange={(e) => setTamaño(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="stock">Stock </label>
            <input
              id="stock"
              type="number"
              placeholder="Cantidad en inventario"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              min="0"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="costo">Precio Costo </label>
            <input
              id="costo"
              type="number"
              placeholder="Costo unitario"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="precioVenta">Precio Venta </label>
            <input
              id="precioVenta"
              type="number"
              placeholder="Precio de venta"
              value={precioUnidad}
              onChange={(e) => setPrecioUnidad(e.target.value)}
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="fechaCaducidad">Fecha de Vencimiento</label>
            <input
              id="fechaCaducidad"
              type="date"
              value={fechaCaducidad}
              onChange={(e) => setFechaCaducidad(e.target.value)}
            />
          </div>
        </div>

        <div className="form-botones">
          <button type="submit" disabled={cargandoForm} className="btn-submit">
            {cargandoForm ? '⏳ Guardando...' : (productoIdSeleccionado ? '💾 Actualizar Producto' : '➕ Añadir Producto')}
          </button>

          {productoIdSeleccionado && (
            <>
              {usuario?.rol === 'admin' && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={cargandoForm}
                  className="btn-eliminar"
                >
                  🗑️ Eliminar
                </button>
              )}
              <button
                type="button"
                onClick={limpiarFormulario}
                disabled={cargandoForm}
                className="btn-cancelar"
              >
                ❌ Cancelar
              </button>
            </>
          )}
        </div>
      </form>

      {/* --- Filtros y Tabla --- */}
      <div className="filtros-inventario">
        <h3>Filtrar Productos</h3>
        <div className="filtros-grupo">
          <input
            type="text"
            placeholder="🔍 Buscar por nombre o tamaño..."
            className="input-filtro"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
          />
          <div className="filtro-checkbox">
            <input
              id="filtro-vencidos"
              type="checkbox"
              checked={filtroVencidos}
              onChange={(e) => setFiltroVencidos(e.target.checked)}
            />
            <label htmlFor="filtro-vencidos">Solo productos vencidos</label>
          </div>
        </div>
        <p className="filtros-info">
          Mostrando <strong>{productosFiltrados.length}</strong> de <strong>{productos.length}</strong> productos
        </p>
      </div>

      <div className="lista-productos">
        <h3>📦 Productos Actuales</h3>
        {cargandoProductos ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Cargando productos...</p>
          </div>
        ) : productosFiltrados.length === 0 ? (
          <p className="mensaje-vacio">No hay productos que coincidan con los filtros.</p>
        ) : (
          <div className="tabla-responsive">
            <table className="productos-tabla">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Tamaño</th>
                  <th>Stock (Uds.)</th>
                  <th>Costo (U.)</th>
                  <th>Precio Venta (U.)</th>
                  <th>Fecha Vencimiento</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {productosPaginados.map(producto => {
                  const vencido = estaVencido(producto.fechaCaducidad);
                  const proximo = proximoAVencer(producto.fechaCaducidad);

                  return (
                    <tr
                      key={producto.id}
                      onClick={() => handleSelectProducto(producto)}
                      className={`
                        ${productoIdSeleccionado === producto.id ? 'fila-seleccionada' : ''}
                        ${vencido ? 'fila-vencido' : ''}
                        ${proximo ? 'fila-proximo-vencer' : ''}
                      `}
                    >
                      <td>{producto.nombre}</td>
                      <td>{producto.tamaño}</td>
                      <td>
                        <span className={producto.stockUnidades < 10 ? 'stock-bajo' : ''}>
                          {producto.stockUnidades}
                        </span>
                      </td>
                      <td>L. {producto.precioCostoUnidad?.toFixed(2) ?? 'N/A'}</td>
                      <td>L. {producto.formatosVenta?.[0]?.precio?.toFixed(2) ?? 'N/A'}</td>
                      <td>
                        {producto.fechaCaducidad ? (
                          <span className={vencido ? 'fecha-vencida' : proximo ? 'fecha-proxima' : ''}>
                            {producto.fechaCaducidad.toDate().toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="sin-fecha">Sin fecha</span>
                        )}
                      </td>
                      <td>
                        {vencido && <span className="badge badge-vencido">❌ Vencido</span>}
                        {proximo && !vencido && <span className="badge badge-proximo">⚠️ Próximo</span>}
                        {!vencido && !proximo && producto.fechaCaducidad && <span className="badge badge-ok">✅ OK</span>}
                        {!producto.fechaCaducidad && <span className="badge badge-sin-fecha">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Controles de Paginación */}
        {!cargandoProductos && productosFiltrados.length > 0 && totalPaginas > 1 && (
          <div className="pagination-container">
            <button
              className="pagination-btn"
              onClick={() => cambiarPagina(paginaActual - 1)}
              disabled={paginaActual === 1}
            >
              Anterior
            </button>
            <span className="pagination-info">
              Página {paginaActual} de {totalPaginas}
            </span>
            <button
              className="pagination-btn"
              onClick={() => cambiarPagina(paginaActual + 1)}
              disabled={paginaActual === totalPaginas}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Inventario;
