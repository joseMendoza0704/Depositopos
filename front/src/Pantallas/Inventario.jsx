import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, onSnapshot } from 'firebase/firestore'; 

function Inventario() {
  // --- Estados para el formulario ---
  const [nombre, setNombre] = useState('');
  const [tamaño, setTamaño] = useState('');
  const [stock, setStock] = useState(0);
  const [costo, setCosto] = useState(0);
  const [precioUnidad, setPrecioUnidad] = useState(0);
  const [cargandoForm, setCargandoForm] = useState(false);

  // --- Estados para la lista de productos ---
  const [productos, setProductos] = useState([]); 
  const [cargandoProductos, setCargandoProductos] = useState(true); 

  // --- useEffect para LEER datos ---
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

  // --- Función para AÑADIR productos ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cargandoForm) return;
    setCargandoForm(true);

    try {
      const productosCollection = collection(db, 'productos');
      await addDoc(productosCollection, {
        nombre: nombre,
        tamaño: tamaño,
        stockUnidades: Number(stock),
        precioCostoUnidad: Number(costo),
        formatosVenta: [
          { nombre: "Unidad", precio: Number(precioUnidad), unidades: 1 }
        ],
        activo: true
      });

      alert("¡Producto agregado con éxito!");
      setNombre('');
      setTamaño('');
      setStock(0);
      setCosto(0);
      setPrecioUnidad(0);
    } catch (error) {
      console.error("Error al agregar el producto: ", error);
      alert("Error al agregar el producto. Revisa la consola.");
    } finally {
      setCargandoForm(false);
    }
  };

  return (
    <div>
      <h2>Gestión de Inventario</h2>
      
      {/* Formulario (sin cambios) */}
      <form onSubmit={handleSubmit} className="producto-form">
        <h3>Añadir Nuevo Producto</h3>
        <div className="form-grid">
          <input type="text" placeholder="Nombre (ej: Coca-Cola)" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          <input type="text" placeholder="Tamaño (ej: 600ml)" value={tamaño} onChange={(e) => setTamaño(e.target.value)} required />
          <input type="number" placeholder="Stock (unidades)" value={stock} onChange={(e) => setStock(e.target.value)} required />
          <input type="number" placeholder="Precio Costo (por unidad)" value={costo} onChange={(e) => setCosto(e.target.value)} required />
          <input type="number" placeholder="Precio Venta (por unidad)" value={precioUnidad} onChange={(e) => setPrecioUnidad(e.target.value)} required />
        </div>
        <button type="submit" disabled={cargandoForm}>
          {cargandoForm ? 'Guardando...' : 'Añadir Producto'}
        </button>
      </form>

      {/* Tabla de Productos (CON LOS CAMBIOS) */}
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
                <tr key={producto.id}>
                  <td>{producto.nombre}</td>
                  <td>{producto.tamaño}</td>
                  <td>{producto.stockUnidades}</td>
                  
                  {/* 👇 CAMBIO AQUÍ: Añadimos '?' y '??' para evitar el crash */}
                  <td>L. {producto.precioCostoUnidad?.toFixed(2) ?? 'N/A'}</td>
                  
                  {/* 👇 CAMBIO AQUÍ: Añadimos '?' y '??' para evitar el crash */}
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