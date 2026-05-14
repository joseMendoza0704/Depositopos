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
import HistorialRetiros from '../components/HistorialRetiros';
import { useNotification } from '../context/NotificationContext';
import { Search, Trash2, X, Package, AlertTriangle, CheckCircle, RotateCcw, Download, Plus, Edit, Loader, Eye, XCircle } from 'lucide-react';

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

  // --- Estados de Modales ---
  const [mostrarRetiro, setMostrarRetiro] = useState(false);
  const [mostrarTransformar, setMostrarTransformar] = useState(false);
  const [mostrarHistorialRetiros, setMostrarHistorialRetiros] = useState(false);

  // --- Estados de Filtros ---
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroVencidos, setFiltroVencidos] = useState(false);

  // --- Paginación ---
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina] = useState(20);

  // --- Suscripciones Firebase ---
  useEffect(() => {
    const unsubscribeProd = onSnapshot(collection(db, 'productos'), (snapshot) => {
      setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCargandoProductos(false);
    }, (err) => { console.error(err); setCargandoProductos(false); });

    const unsubscribeCat = onSnapshot(collection(db, 'categorias'), (snapshot) => {
      setCategorias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error(err));

    return () => { unsubscribeProd(); unsubscribeCat(); };
  }, []);

  const limpiarFormulario = useCallback(() => {
    setNombre(''); setTamaño(''); setStock(''); setCosto(''); setPrecioUnidad('');
    setFechaCaducidad(''); setCategoriaId(''); setProductoIdSeleccionado(null);
    setImageFile(null); setImagePreview(null); setCurrentImageUrl(null);
  }, []);

  const handleSelectProducto = useCallback((producto) => {
    setProductoIdSeleccionado(producto.id);
    setNombre(producto.nombre ?? '');
    setTamaño(producto.tamaño ?? '');
    setStock(producto.stockUnidades ?? '');
    setCosto(producto.precioCostoUnidad ?? '');
    setPrecioUnidad(producto.formatosVenta?.[0]?.precio ?? '');
    setCategoriaId(producto.categoriaId ?? '');
    if (producto.fechaCaducidad) {
      setFechaCaducidad(producto.fechaCaducidad.toDate().toISOString().split('T')[0]);
    } else {
      setFechaCaducidad('');
    }
    setCurrentImageUrl(producto.imagen || null);
    setImagePreview(producto.imagen || null);
    setImageFile(null);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cargandoForm) return;
    if (!nombre.trim()) { showAlert('Nombre requerido', 'error'); return; }

    setCargandoForm(true);
    try {
      let finalImageUrl = currentImageUrl;
      if (imageFile) {
        const imageRef = ref(storage, `productos/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(imageRef, imageFile);
        finalImageUrl = await getDownloadURL(snapshot.ref);
      }

      const categoria = categorias.find(c => c.id === categoriaId);
      const datos = {
        nombre: nombre.trim(),
        tamaño: tamaño.trim(),
        stockUnidades: Number(stock),
        precioCostoUnidad: Number(costo),
        formatosVenta: [{ nombre: "Unidad", precio: Number(precioUnidad), unidades: 1 }],
        activo: true,
        imagen: finalImageUrl,
        categoriaId: categoriaId || null,
        categoriaNombre: categoria ? categoria.nombre : null,
        fechaCaducidad: fechaCaducidad ? Timestamp.fromDate(new Date(fechaCaducidad)) : null
      };

      if (productoIdSeleccionado) {
        await updateDoc(doc(db, 'productos', productoIdSeleccionado), datos);
        showAlert("Actualizado!", 'exito');
      } else {
        await addDoc(collection(db, 'productos'), datos);
        showAlert("Agregado!", 'exito');
      }
      limpiarFormulario();
    } catch (error) {
      console.error(error);
      showAlert("Error al guardar", 'error');
    } finally {
      setCargandoForm(false);
    }
  };

  const handleDelete = async () => {
    if (!productoIdSeleccionado || !window.confirm('¿Eliminar producto?')) return;
    try {
      await deleteDoc(doc(db, 'productos', productoIdSeleccionado));
      showAlert("Eliminado", 'exito');
      limpiarFormulario();
    } catch (error) { console.error(error); showAlert("Error al eliminar", 'error'); }
  };

  const productosFiltrados = useMemo(() => {
    return productos.filter(p => {
      const matchTexto = !filtroTexto || p.nombre?.toLowerCase().includes(filtroTexto.toLowerCase()) || p.tamaño?.toLowerCase().includes(filtroTexto.toLowerCase());
      const matchVencido = !filtroVencidos || (p.fechaCaducidad && p.fechaCaducidad.toDate() < new Date());
      return matchTexto && matchVencido;
    });
  }, [productos, filtroTexto, filtroVencidos]);

  const totalPaginas = Math.ceil(productosFiltrados.length / itemsPorPagina);
  const productosPaginados = productosFiltrados.slice((paginaActual - 1) * itemsPorPagina, paginaActual * itemsPorPagina);
  const cambiarPagina = (n) => setPaginaActual(n);

  const estaVencido = (f) => f && f.toDate() < new Date();
  const proximoAVencer = (f) => {
    if (!f) return false;
    const dias = Math.ceil((f.toDate() - new Date()) / (1000 * 60 * 60 * 24));
    return dias > 0 && dias <= 7;
  };

  return (
    <div className="inventario-container">
      <div className="inventario-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2>Gestión de Inventario</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setMostrarTransformar(true)} style={{ backgroundColor: '#3498db', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <RotateCcw size={18} /> Transformar
          </button>
          <button onClick={() => setMostrarRetiro(true)} style={{ backgroundColor: '#ffc107', color: '#333', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Download size={18} /> Retiro
          </button>
          <button onClick={() => setMostrarHistorialRetiros(true)} style={{ backgroundColor: '#34495e', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Eye size={18} /> Historial
          </button>
        </div>
      </div>

      {mostrarRetiro && <RetiroInventario onClose={() => setMostrarRetiro(false)} />}
      {mostrarTransformar && <ModalTransformarProducto onClose={() => setMostrarTransformar(false)} productos={productos} />}
      {mostrarHistorialRetiros && <HistorialRetiros onClose={() => setMostrarHistorialRetiros(false)} />}

      <form onSubmit={handleSubmit} className="producto-form">
        <h3>{productoIdSeleccionado ? <><Edit size={18} /> Editar Producto</> : <><Plus size={18} /> Nuevo Producto</>}</h3>
        <div className="form-grid">
          <div className="form-group"><label>Nombre*</label><input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required /></div>
          <div className="form-group"><label>Tamaño*</label><input type="text" value={tamaño} onChange={e => setTamaño(e.target.value)} required /></div>
          <div className="form-group"><label>Stock</label><input type="number" value={stock} onChange={e => setStock(e.target.value)} required /></div>
          <div className="form-group"><label>Costo</label><input type="number" step="0.01" value={costo} onChange={e => setCosto(e.target.value)} required /></div>
          <div className="form-group"><label>Precio Venta</label><input type="number" step="0.01" value={precioUnidad} onChange={e => setPrecioUnidad(e.target.value)} required /></div>
          <div className="form-group"><label>Vencimiento</label><input type="date" value={fechaCaducidad} onChange={e => setFechaCaducidad(e.target.value)} /></div>
          <div className="form-group">
            <label>Categoría</label>
            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)}>
              <option value="">Sin categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Imagen</label>
            <div className="image-upload-container" onClick={() => !imagePreview && document.getElementById('fileInput').click()} style={{ cursor: 'pointer', border: '1px dashed #ccc', minHeight: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {imagePreview ? (
                <div className="image-preview">
                  <img src={imagePreview} alt="Preview" style={{ maxWidth: '100px' }} />
                  <button type="button" onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); setCurrentImageUrl(null); }}>X</button>
                </div>
              ) : <span>Subir Imagen</span>}
              <input id="fileInput" type="file" hidden onChange={e => { const f = e.target.files[0]; if(f){setImageFile(f); setImagePreview(URL.createObjectURL(f));} }} />
            </div>
          </div>
        </div>
        <div className="form-botones">
          <button type="submit" disabled={cargandoForm} className="btn-submit">{cargandoForm ? 'Guardando...' : (productoIdSeleccionado ? 'Actualizar' : 'Añadir')}</button>
          {productoIdSeleccionado && (
            <>
              {usuario?.rol === 'admin' && <button type="button" onClick={handleDelete} className="btn-eliminar">Eliminar</button>}
              <button type="button" onClick={limpiarFormulario} className="btn-cancelar">Cancelar</button>
            </>
          )}
        </div>
      </form>

      <div className="filtros-inventario">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
          <Search size={20} color="#2c3e50" />
          <h3 style={{ margin: 0 }}>Filtrar Inventario</h3>
        </div>
        <div className="filtros-grupo">
          <div style={{ position: 'relative', flex: 1 }}>
            <input 
              type="text" 
              className="input-filtro" 
              placeholder="Buscar por nombre, tamaño o categoría..." 
              value={filtroTexto} 
              onChange={e => setFiltroTexto(e.target.value)} 
            />
          </div>
          <label className="filtro-checkbox">
            <input 
              type="checkbox" 
              checked={filtroVencidos} 
              onChange={e => setFiltroVencidos(e.target.checked)} 
            /> 
            Ver solo Vencidos
          </label>
        </div>
      </div>

      <div className="lista-productos">
        {cargandoProductos ? <p>Cargando...</p> : (
          <div className="tabla-responsive">
            <table className="productos-tabla">
              <thead><tr><th>Descripción</th><th>Tamaño</th><th>Categoría</th><th>Stock</th><th>Costo</th><th>Venta</th><th>Vencimiento</th><th>Estado</th></tr></thead>
              <tbody>
                {productosPaginados.map(p => {
                  const vencido = estaVencido(p.fechaCaducidad);
                  const proximo = proximoAVencer(p.fechaCaducidad);
                  
                  let rowClass = '';
                  if (productoIdSeleccionado === p.id) rowClass = 'fila-seleccionada';
                  else if (vencido) rowClass = 'fila-vencido';
                  else if (proximo) rowClass = 'fila-proximo-vencer';

                  return (
                    <tr key={p.id} onClick={() => handleSelectProducto(p)} className={rowClass}>
                      <td style={{ color: '#2c3e50' }}>{p.nombre}</td>
                      <td style={{ color: '#555' }}>{p.tamaño}</td>
                      <td style={{ color: '#555' }}>{p.categoriaNombre || '—'}</td>
                      <td>
                        <span className={p.stockUnidades <= 5 ? 'stock-bajo' : ''}>
                          {p.stockUnidades}
                        </span>
                      </td>
                      <td style={{ color: '#555' }}>L. {p.precioCostoUnidad?.toFixed(2)}</td>
                      <td style={{ color: '#555' }}>L. {p.formatosVenta?.[0]?.precio?.toFixed(2)}</td>
                      <td>
                        <span className={vencido ? 'fecha-vencida' : proximo ? 'fecha-proxima' : ''} style={{ color: !vencido && !proximo ? '#555' : undefined }}>
                          {p.fechaCaducidad?.toDate().toLocaleDateString('es-HN') || '—'}
                        </span>
                      </td>
                      <td>
                        {vencido ? (
                          <span className="badge badge-vencido"><XCircle size={14} /> Vencido</span>
                        ) : proximo ? (
                          <span className="badge badge-proximo"><AlertTriangle size={14} /> Próximo</span>
                        ) : (
                          <span className="badge badge-ok"><CheckCircle size={14} /> OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPaginas > 1 && (
          <div className="pagination-container">
            <button className="pagination-btn" onClick={() => cambiarPagina(paginaActual - 1)} disabled={paginaActual === 1}>Anterior</button>
            <span className="pagination-info">{paginaActual} de {totalPaginas}</span>
            <button className="pagination-btn" onClick={() => cambiarPagina(paginaActual + 1)} disabled={paginaActual === totalPaginas}>Siguiente</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Inventario;
