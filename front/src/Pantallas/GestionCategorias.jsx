import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import '../styles/GestionCategorias.css';
import { useNotification } from '../context/NotificationContext';

const GestionCategorias = () => {
    const { showAlert } = useNotification();
    
    // Estados para categorías
    const [categorias, setCategorias] = useState([]);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
    
    // Estados para formulario
    const [nombreCategoria, setNombreCategoria] = useState('');
    const [descripcionCategoria, setDescripcionCategoria] = useState('');
    
    // Estados para productos
    const [productos, setProductos] = useState([]);
    const [filtroProductos, setFiltroProductos] = useState('');
    
    const [cargando, setCargando] = useState(false);

    // Cargar categorías en tiempo real
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'categorias'), (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCategorias(docs);
        });
        return () => unsubscribe();
    }, []);

    // Cargar productos en tiempo real
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'productos'), (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setProductos(docs);
        });
        return () => unsubscribe();
    }, []);

    // Productos de la categoría seleccionada
    const productosDeCategoria = categoriaSeleccionada 
        ? productos.filter(p => p.categoriaId === categoriaSeleccionada.id)
        : [];

    // Productos disponibles para agregar
    const productosDisponibles = productos.filter(p => {
        if (!categoriaSeleccionada) return false;
        
        if (p.categoriaId === categoriaSeleccionada.id) return false;
        
        if (filtroProductos.trim()) {
            const texto = filtroProductos.toLowerCase();
            return p.nombre.toLowerCase().includes(texto) ||
                   (p.tamaño && p.tamaño.toLowerCase().includes(texto));
        }
        
        return !p.categoriaId;
    });

    const handleSeleccionarCategoria = (categoria) => {
        setCategoriaSeleccionada(categoria);
        setNombreCategoria(categoria.nombre);
        setDescripcionCategoria(categoria.descripcion || '');
    };

    const handleNuevaCategoria = () => {
        setCategoriaSeleccionada(null);
        setNombreCategoria('');
        setDescripcionCategoria('');
        // No necesitamos cambiar el estado visual aquí, ya que el formulario 
        // se mostrará siempre que no haya una categoría seleccionada en la vista de edición
        // o simplemente mostraremos los campos vacíos.
    };

    const handleGuardarCategoria = async (e) => {
        e.preventDefault();
        if (!nombreCategoria.trim()) {
            showAlert('El nombre de la categoría es requerido', 'error');
            return;
        }

        setCargando(true);
        try {
            if (categoriaSeleccionada) {
                // Editar categoría existente
                const categoriaDoc = doc(db, 'categorias', categoriaSeleccionada.id);
                await updateDoc(categoriaDoc, {
                    nombre: nombreCategoria.trim(),
                    descripcion: descripcionCategoria.trim()
                });
                showAlert('✅ Categoría actualizada correctamente', 'exito');
            } else {
                // Crear nueva categoría
                const nuevaCategoriaRef = await addDoc(collection(db, 'categorias'), {
                    nombre: nombreCategoria.trim(),
                    descripcion: descripcionCategoria.trim(),
                    activo: true,
                    createdAt: new Date()
                });
                showAlert('✅ Categoría creada correctamente', 'exito');
                // Seleccionar la nueva categoría automáticamente
                setCategoriaSeleccionada({
                    id: nuevaCategoriaRef.id,
                    nombre: nombreCategoria.trim(),
                    descripcion: descripcionCategoria.trim()
                });
            }
        } catch (error) {
            console.error('Error al guardar categoría:', error);
            showAlert('❌ Error al guardar categoría', 'error');
        } finally {
            setCargando(false);
        }
    };

    const handleEliminarCategoria = async () => {
        if (!categoriaSeleccionada) return;
        if (!window.confirm(`¿Estás seguro de eliminar la categoría "${categoriaSeleccionada.nombre}"? Todos los productos perderán la referencia a esta categoría.`)) return;

        try {
            // Remover la categoría de todos los productos
            const productosDeCat = productos.filter(p => p.categoriaId === categoriaSeleccionada.id);
            for (const producto of productosDeCat) {
                const productoDoc = doc(db, 'productos', producto.id);
                await updateDoc(productoDoc, { 
                    categoriaId: null,
                    categoriaNombre: null 
                });
            }

            // Eliminar la categoría
            const categoriaDoc = doc(db, 'categorias', categoriaSeleccionada.id);
            await deleteDoc(categoriaDoc);
            
            showAlert('✅ Categoría eliminada correctamente', 'exito');
            handleNuevaCategoria();
        } catch (error) {
            console.error('Error al eliminar categoría:', error);
            showAlert('❌ Error al eliminar categoría', 'error');
        }
    };

    const agregarProductoACategoria = async (producto) => {
        if (!categoriaSeleccionada) return;

        try {
            const productoDoc = doc(db, 'productos', producto.id);
            await updateDoc(productoDoc, {
                categoriaId: categoriaSeleccionada.id,
                categoriaNombre: categoriaSeleccionada.nombre
            });
            showAlert(`✅ ${producto.nombre} agregado a ${categoriaSeleccionada.nombre}`, 'exito');
        } catch (error) {
            console.error('Error al agregar producto:', error);
            showAlert('❌ Error al agregar producto', 'error');
        }
    };

    const removerProductoDeCategoria = async (producto) => {
        if (!categoriaSeleccionada) return;

        try {
            const productoDoc = doc(db, 'productos', producto.id);
            await updateDoc(productoDoc, {
                categoriaId: null,
                categoriaNombre: null
            });
            showAlert(`✅ ${producto.nombre} removido de ${categoriaSeleccionada.nombre}`, 'exito');
        } catch (error) {
            console.error('Error al remover producto:', error);
            showAlert('❌ Error al remover producto', 'error');
        }
    };

    return (
        <div className="gestion-categorias-container">
            <div className="categorias-sidebar">
                <div className="sidebar-header">
                    <h3>Categorías</h3>
                    <button className="btn-nueva" onClick={handleNuevaCategoria}>
                        ➕ Nueva
                    </button>
                </div>
                
                <div className="categorias-lista">
                    {categorias.length === 0 ? (
                        <p className="no-items-sidebar">No hay categorías</p>
                    ) : (
                        categorias.map(categoria => (
                            <div
                                key={categoria.id}
                                className={`categoria-item-sidebar ${categoriaSeleccionada?.id === categoria.id ? 'seleccionada' : ''}`}
                                onClick={() => handleSeleccionarCategoria(categoria)}
                            >
                                <span className="cat-name">{categoria.nombre}</span>
                                <span className="cat-count">
                                    {productos.filter(p => p.categoriaId === categoria.id).length}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="categorias-main">
                {/* Header con título y botón eliminar (solo si hay categoría seleccionada) */}
                {categoriaSeleccionada && (
                    <div className="main-header">
                        <div>
                            <h2>{categoriaSeleccionada.nombre}</h2>
                            <p className="cat-desc">{categoriaSeleccionada.descripcion || 'Sin descripción'}</p>
                        </div>
                        <button className="btn-eliminar-categoria" onClick={handleEliminarCategoria}>
                            🗑️ Eliminar Categoría
                        </button>
                    </div>
                )}

                {/* Formulario de edición/creación */}
                <div className="main-form">
                    <h4>{categoriaSeleccionada ? '✏️ Editar Categoría' : '➕ Nueva Categoría'}</h4>
                    <form onSubmit={handleGuardarCategoria}>
                        <div className="form-group">
                            <label>Nombre *</label>
                            <input
                                type="text"
                                value={nombreCategoria}
                                onChange={(e) => setNombreCategoria(e.target.value)}
                                placeholder="Ej: Bebidas, Snacks, etc."
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Descripción</label>
                            <textarea
                                value={descripcionCategoria}
                                onChange={(e) => setDescripcionCategoria(e.target.value)}
                                placeholder="Descripción opcional"
                                rows="3"
                            />
                        </div>
                        <button type="submit" disabled={cargando} className="btn-guardar">
                            {cargando ? 'Guardando...' : categoriaSeleccionada ? 'Guardar Cambios' : 'Crear Categoría'}
                        </button>
                    </form>
                </div>

                {/* Gestión de productos (solo si hay categoría seleccionada) */}
                {categoriaSeleccionada && (
                    <div className="main-products">
                        <h4>📦 Productos en esta Categoría ({productosDeCategoria.length})</h4>
                        
                        {/* Buscador */}
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="Buscar productos para agregar..."
                                value={filtroProductos}
                                onChange={(e) => setFiltroProductos(e.target.value)}
                            />
                        </div>

                        <div className="products-grid">
                            {/* Productos ya agregados */}
                            <div className="products-list">
                                <h5>En esta categoría:</h5>
                                {productosDeCategoria.length === 0 ? (
                                    <p className="no-products">No hay productos en esta categoría</p>
                                ) : (
                                    productosDeCategoria.map(producto => (
                                        <div key={producto.id} className="product-card added" onClick={() => removerProductoDeCategoria(producto)}>
                                            <span className="prod-name">{producto.nombre}</span>
                                            <span className="prod-size">{producto.tamaño}</span>
                                            <span className="prod-action">−</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Productos disponibles */}
                            <div className="products-list">
                                <h5>Disponibles para agregar:</h5>
                                {productosDisponibles.length === 0 ? (
                                    <p className="no-products">
                                        {filtroProductos ? "No hay coincidencias" : "Todos los productos ya están asignados"}
                                    </p>
                                ) : (
                                    productosDisponibles.map(producto => (
                                        <div key={producto.id} className="product-card available" onClick={() => agregarProductoACategoria(producto)}>
                                            <span className="prod-name">{producto.nombre}</span>
                                            <span className="prod-size">{producto.tamaño}</span>
                                            <span className="prod-action">+</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GestionCategorias;