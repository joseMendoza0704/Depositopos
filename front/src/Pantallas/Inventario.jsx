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
import { storage } from '../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import '../styles/Inventario.css';
import RetiroInventario from '../components/RetiroInventario';
import ModalTransformarProducto from '../components/ModalTransformarProducto';
import { useNotification } from '../context/NotificationContext';
import { Search, Trash2, X, Package, AlertTriangle, CheckCircle, RotateCcw, Download, Plus, Edit, Loader } from 'lucide-react';

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

  // --- Estados de Imagen ---
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);


  // --- Estados de Categorías ---
  const [categorias, setCategorias] = useState([]);
  const [categoriaId, setCategoriaId] = useState('');

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

  // --- Suscripción a categorías en tiempo real ---
  useEffect(() => {
    const categoriasCollection = collection(db, 'categorias');

    const unsubscribe = onSnapshot(
      categoriasCollection,
      (snapshot) => {
        const listaDeCategorias = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCategorias(listaDeCategorias);
      },
      (error) => {
        console.error("Error al cargar categorías:", error);
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
    setCategoriaId('');
    setProductoIdSeleccionado(null);
    setImageFile(null);
    setImagePreview(null);
    setCurrentImageUrl(null);

  }, []);

  // --- Selecciona un producto para editar ---
  const handleSelectProducto = useCallback((producto) => {
    setProductoIdSeleccionado(producto.id);
    setNombre(producto.nombre ?? '');
    setTamaño(producto.tamaño ?? '');
    setStock(producto.stockUnidades ?? '');
    setCosto(producto.precioCostoUnidad ?? '');
    setPrecioUnidad(producto.formatosVenta?.[0]?.precio ?? '');
    setCategoriaId(producto.categoriaId ?? '');

    if (producto.fechaCaducidad) {
      const fecha = producto.fechaCaducidad.toDate();
      const fechaFormateada = fecha.toISOString().split('T')[0];
      setFechaCaducidad(fechaFormateada);
    } else {
      setFechaCaducidad('');
    }
    setCurrentImageUrl(producto.imagen || null);
    setImagePreview(producto.imagen || null);

    setImageFile(null);
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

    // Obtener el nombre de la categoría seleccionada
    const categoriaSeleccionada = categorias.find(c => c.id === categoriaId);
    const categoriaNombre = categoriaSeleccionada ? categoriaSeleccionada.nombre : null;

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
      activo: true,
      imagen: currentImageUrl || null,
      categoriaId: categoriaId || null,
      categoriaNombre: categoriaNombre
    };

    if (fechaCaducidad) {
      const fecha = new Date(fechaCaducidad);
      fecha.setHours(0, 0, 0, 0);
      datosProducto.fechaCaducidad = Timestamp.fromDate(fecha);
    } else {
      datosProducto.fechaCaducidad = null;
    }

    try {
      let finalImageUrl = currentImageUrl;

      // Subir imagen si hay una nueva seleccionada
      if (imageFile) {
        const imageRef = ref(storage, `productos/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(imageRef, imageFile);
        finalImageUrl = await getDownloadURL(snapshot.ref);
        datosProducto.imagen = finalImageUrl;
      }

      if (productoIdSeleccionado) {
        const productoDoc = doc(db, 'productos', productoIdSeleccionado);
        await updateDoc(productoDoc, datosProducto);
        showAlert("Producto actualizado con éxito!", 'exito');
      } else {
        showAlert("Producto agregado con éxito!", 'exito');
      }
    } catch (error) {
      console.error("Error al guardar el producto:", error);
      showAlert("Error al guardar el producto.", 'error');
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
            <RotateCcw size={18} /> Transformar / Mezclar
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
            <Download size={18} className="inline-block mr-1" /> Retiro de Productos
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
          {productoIdSeleccionado ? <><Edit size={18} /> Editar Producto</> : <><Plus size={18} /> Añadir Nuevo Producto</>}
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

          <div className="form-group">
            <label htmlFor="categoria">Categoría</label>
            <select
              id="categoria"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="select-categoria"
            >
              <option value="">Sin categoría</option>
              {categorias.map(categoria => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </div>














          <div className="form-group">
            <label>Imagen del Producto</label>
            <div className="image-upload-container">
              {imagePreview ? (
                <div className="image-preview">
                  <img src={imagePreview} alt="Vista previa" />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); setCurrentImageUrl(null); }} className="btn-remove-image">
                    Remover
                  </button>
                </div>
              ) : (
                <div className="image-placeholder" onClick={() => document.getElementById('imageInput').click()}>
                  <span>Seleccionar Imagen</span>
                </div>
              )}
              <input
                id="imageInput"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }
                }}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </div>

        <div className="form-botones">
          <button type="submit" disabled={cargandoForm} className="btn-submit">
            {cargandoForm ? <><Loader size={18} className="animate-spin" /> Guardando...</> : (productoIdSeleccionado ? 'Actualizar Producto' : 'Añadir Producto')}
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
                  <Trash2 size={18} /> Eliminar
                </button>
              )}
              <button
                type="button"
                onClick={limpiarFormulario}
                disabled={cargandoForm}
                className="btn-cancelar"
              >
                <X size={18} /> Cancelar
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
            placeholder="Buscar por nombre o tamaño..."
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
        <h3><Package size={20} /> Productos Actuales</h3>
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
                  <th>Categoría</th>
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
                        <span className="categoria-badge">
                          {producto.categoriaNombre || '—'}
                        </span>
                      </td>
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
                        {vencido && <span className="badge badge-vencido"><X size={14} /> Vencido</span>}
                        {proximo && !vencido && <span className="badge badge-proximo"><AlertTriangle size={14} /> Próximo</span>}
                        {!vencido && !proximo && producto.fechaCaducidad && <span className="badge badge-ok"><CheckCircle size={14} /> OK</span>}
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
