import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore'; 

function Inventario() {
  // --- Estados del Formulario ---
  const [nombre, setNombre] = useState('');
  const [tamaño, setTamaño] = useState('');
  const [stock, setStock] = useState(0);
  const [costo, setCosto] = useState(0);
  const [precioUnidad, setPrecioUnidad] = useState(0);
  
  // --- Estados de Carga y Lista ---
  const [cargandoForm, setCargandoForm] = useState(false);
  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);

  // --- Estado de Edición ---
  const [productoIdSeleccionado, setProductoIdSeleccionado] = useState(null);

  // --- useEffect para LEER datos (sin cambios) ---
  useEffect(() => {
    const productosCollection = collection(db, 'productos');
    const unsubscribe = onSnapshot(productosCollection, (snapshot) => {
      const listaDeProductos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProductos(listaDeProductos);
      setCargandoProductos(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Función para Limpiar Formulario (sin cambios) ---
  const limpiarFormulario = () => {
    setNombre('');
    setTamaño('');
    setStock(0);
    setCosto(0);
    setPrecioUnidad(0);
    setProductoIdSeleccionado(null);
  };

  // --- 5. FUNCIÓN CORREGIDA: Ahora es "defensiva" ---
  const handleSelectProducto = (producto) => {
    setProductoIdSeleccionado(producto.id);
    // Usamos '??' para poner un valor por defecto si el campo no existe
    setNombre(producto.nombre ?? '');
    setTamaño(producto.tamaño ?? '');
    setStock(producto.stockUnidades ?? 0);
    setCosto(producto.precioCostoUnidad ?? 0);
    setPrecioUnidad(producto.formatosVenta?.[0]?.precio ?? 0);
  };

  // --- Función 'handleSubmit' (sin cambios) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cargandoForm) return;
    setCargandoForm(true);

    const datosProducto = {
      nombre: nombre,
      tamaño: tamaño,
      stockUnidades: Number(stock),
      precioCostoUnidad: Number(costo),
      formatosVenta: [
        { nombre: "Unidad", precio: Number(precioUnidad), unidades: 1 }
      ],
      activo: true
    };

    try {
      if (productoIdSeleccionado) {
        // --- MODO ACTUALIZAR ---
        const productoDoc = doc(db, 'productos', productoIdSeleccionado);
        await updateDoc(productoDoc, datosProducto);
        alert("¡Producto actualizado con éxito!");
      } else {
        // --- MODO CREAR ---
        const productosCollection = collection(db, 'productos');
        await addDoc(productosCollection, datosProducto);
        alert("¡Producto agregado con éxito!");
      }
      limpiarFormulario();
    } catch (error) {
      console.error("Error al guardar el producto: ", error);
      alert("Error al guardar el producto. Revisa la consola.");
    } finally {
      setCargandoForm(false);
    }
  };

  // --- Función 'handleDelete' (sin cambios) ---
  const handleDelete = async () => {
    if (!productoIdSeleccionado) return;
    if (!window.confirm(`¿Estás seguro de que quieres eliminar "${nombre}"?`)) {
      return;
    }
    setCargandoForm(true);
    try {
      const productoDoc = doc(db, 'productos', productoIdSeleccionado);
      await deleteDoc(productoDoc);
      alert("¡Producto eliminado con éxito!");
      limpiarFormulario();
    } catch (error) {
      console.error("Error al eliminar el producto: ", error);
      alert("Error al eliminar el producto. Revisa la consola.");
    } finally {
      setCargandoForm(false);
    }
  };

  return (
    <div>
      <h2>Gestión de Inventario</h2>
      
      {/* --- Formulario (sin cambios) --- */}
      <form onSubmit={handleSubmit} className="producto-form">
        <h3>{productoIdSeleccionado ? 'Editar Producto' : 'Añadir Nuevo Producto'}</h3>
        <div className="form-grid">
          <input type="text" placeholder="Nombre (ej: Coca-Cola)" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          <input type="text" placeholder="Tamaño (ej: 600ml)" value={tamaño} onChange={(e) => setTamaño(e.target.value)} required />
          <input type="number" placeholder="Stock (unidades)" value={stock} onChange={(e) => setStock(e.target.value)} required />
          <input type="number" placeholder="Precio Costo (por unidad)" value={costo} onChange={(e) => setCosto(e.target.value)} required />
          <input type="number" placeholder="Precio Venta (por unidad)" value={precioUnidad} onChange={(e) => setPrecioUnidad(e.target.value)} required />
        </div>
        <div className="form-botones">
          <button type="submit" disabled={cargandoForm}>
            {cargandoForm ? 'Guardando...' : (productoIdSeleccionado ? 'Actualizar Producto' : 'Añadir Producto')}
          </button>
          {productoIdSeleccionado && (
            <>
              <button type="button" onClick={handleDelete} disabled={cargandoForm} className="boton-eliminar">
                Eliminar
              </button>
              <button type="button" onClick={limpiarFormulario} disabled={cargandoForm} className="boton-limpiar">
                Cancelar
              </button>
            </>
          )}
        </div>
      </form>

      {/* --- Tabla (sin cambios) --- */}
      <div className="lista-productos">
        <h3>Productos Actuales</h3>
        {cargandoProductos ? (
          <p>Cargando productos...</p>
        ) : (
          <table className="productos-tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tamaño</th>
                <th>Stock (Uds.)</th>
                <th>Costo (U.)</th>
                <th>Precio Venta (U.)</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(producto => (
                <tr key={producto.id} onClick={() => handleSelectProducto(producto)}>
                  <td>{producto.nombre}</td>
                  <td>{producto.tamaño}</td>
                  <td>{producto.stockUnidades}</td>
                  <td>L. {producto.precioCostoUnidad?.toFixed(2) ?? 'N/A'}</td>
                  <td>L. {producto.formatosVenta?.[0]?.precio?.toFixed(2) ?? 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Inventario;