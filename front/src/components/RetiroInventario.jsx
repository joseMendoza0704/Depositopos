import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { doc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import ModalBuscarProducto from './ModalBuscarProducto';
import ComprobanteRetiro from './ComprobanteRetiro';
import { useNotification } from '../context/NotificationContext';
import '../styles/Inventario.css'; // Reutilizamos estilos o creamos nuevos si es necesario

function RetiroInventario({ onClose }) {
    const { showAlert } = useNotification();
    const [itemsRetiro, setItemsRetiro] = useState([]);
    const [responsable, setResponsable] = useState('');
    const [destino, setDestino] = useState('');
    const [mostrarBuscador, setMostrarBuscador] = useState(false);
    const [mostrarComprobante, setMostrarComprobante] = useState(false);
    const [datosRetiroFinal, setDatosRetiroFinal] = useState(null);
    const [procesando, setProcesando] = useState(false);

    // Agregar producto a la lista de retiro
    const agregarProducto = (producto) => {
        const existe = itemsRetiro.find(item => item.id === producto.id);
        if (existe) {
            showAlert('El producto ya está en la lista. Ajusta la cantidad si necesitas más.', 'info');
            return;
        }
        setItemsRetiro([...itemsRetiro, { ...producto, cantidad: 1 }]);
    };

    // Cambiar cantidad de un producto
    const cambiarCantidad = (id, nuevaCantidad) => {
        const cantidad = parseInt(nuevaCantidad);
        if (isNaN(cantidad) || cantidad < 1) return;

        setItemsRetiro(itemsRetiro.map(item => {
            if (item.id === id) {
                // Validar stock disponible
                if (cantidad > item.stock) {
                    showAlert(`Solo hay ${item.stock} unidades disponibles de ${item.nombre}`, 'error');
                    return item;
                }
                return { ...item, cantidad };
            }
            return item;
        }));
    };

    // Eliminar producto de la lista
    const eliminarProducto = (id) => {
        setItemsRetiro(itemsRetiro.filter(item => item.id !== id));
    };

    // Procesar el retiro
    const handleConfirmarRetiro = async () => {
        if (itemsRetiro.length === 0) {
            showAlert('Agrega al menos un producto para retirar.', 'error');
            return;
        }
        if (!responsable.trim()) {
            showAlert('Debes indicar quién retira los productos.', 'error');
            return;
        }

        if (!window.confirm('¿Estás seguro de procesar este retiro? Se descontará del inventario.')) {
            return;
        }

        setProcesando(true);

        try {
            // 1. Actualizar stock en Firebase
            const batchPromises = itemsRetiro.map(item => {
                const productoRef = doc(db, 'productos', item.id);
                return updateDoc(productoRef, {
                    stockUnidades: increment(-item.cantidad)
                });
            });

            await Promise.all(batchPromises);

            // 2. Preparar datos para el comprobante
            const datosRetiro = {
                fecha: new Date(),
                responsable: responsable,
                destino: destino,
                items: itemsRetiro
            };

            setDatosRetiroFinal(datosRetiro);
            setMostrarComprobante(true);

        } catch (error) {
            console.error("Error al procesar retiro:", error);
            showAlert("Hubo un error al procesar el retiro. Revisa la consola.", 'error');
        } finally {
            setProcesando(false);
        }
    };

    // Si se muestra el comprobante
    if (mostrarComprobante && datosRetiroFinal) {
        return (
            <ComprobanteRetiro
                retiro={datosRetiroFinal}
                onClose={() => {
                    setMostrarComprobante(false);
                    onClose(); // Cerrar todo al terminar
                }}
            />
        );
    }

    return (
        <div className="modal-backdrop">
            <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
                <div className="modal-header">
                    <h3>📦 Retiro de Inventario</h3>
                </div>

                <div className="modal-body" style={{ padding: '20px' }}>

                    {/* Datos del Retiro */}
                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                        <div className="form-group">
                            <label>Retirado por (Responsable)*</label>
                            <input
                                type="text"
                                value={responsable}
                                onChange={(e) => setResponsable(e.target.value)}
                                placeholder="Nombre de la persona"
                                className="input-form"
                            />
                        </div>
                        <div className="form-group">
                            <label>Destino / Negocio</label>
                            <select
                                value={destino}
                                onChange={(e) => setDestino(e.target.value)}
                                className="input-form"
                            >
                                <option value="">Seleccione un destino...</option>
                                <option value="Bodega Nissi">Bodega Nissi</option>
                                <option value="Supermercado Nissy">Supermercado Nissy</option>
                            </select>
                        </div>
                    </div>

                    {/* Botón Buscar Producto */}
                    <button
                        className="btn-agregar-producto"
                        onClick={() => setMostrarBuscador(true)}
                        style={{ width: '100%', padding: '10px', marginBottom: '15px', backgroundColor: '#4a90e2', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                    >
                        🔍 Buscar y Agregar Producto
                    </button>

                    {/* Lista de Productos */}
                    <div className="tabla-responsive">
                        <table className="productos-tabla">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Stock Actual</th>
                                    <th>Cantidad a Retirar</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itemsRetiro.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                            No hay productos seleccionados
                                        </td>
                                    </tr>
                                ) : (
                                    itemsRetiro.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.nombre} ({item.formato})</td>
                                            <td>{item.stock}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={item.stock}
                                                    value={item.cantidad}
                                                    onChange={(e) => cambiarCantidad(item.id, e.target.value)}
                                                    style={{ width: '80px', padding: '5px' }}
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => eliminarProducto(item.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }}
                                                    title="Eliminar"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>

                <div className="modal-botones">
                    <button
                        className="boton-modal boton-cancelar"
                        onClick={onClose}
                        disabled={procesando}
                    >
                        Cancelar
                    </button>
                    <button
                        className="boton-modal boton-confirmar"
                        onClick={handleConfirmarRetiro}
                        disabled={procesando || itemsRetiro.length === 0}
                        style={{ backgroundColor: '#28a745', color: 'white' }}
                    >
                        {procesando ? 'Procesando...' : '✅ Confirmar Retiro'}
                    </button>
                </div>
            </div>

            {mostrarBuscador && (
                <ModalBuscarProducto
                    onClose={() => setMostrarBuscador(false)}
                    onSelectProducto={agregarProducto}
                />
            )}
        </div>
    );
}

export default RetiroInventario;
