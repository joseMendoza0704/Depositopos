import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { doc, runTransaction } from 'firebase/firestore';
import { useNotification } from '../context/NotificationContext';
import ModalBuscarProducto from './ModalBuscarProducto'; // <--- IMPORTAMOS TU MODAL EXISTENTE
import '../styles/ModalTransformar.css';

const ModalTransformarProducto = ({ onClose, productos }) => {
    const { showAlert } = useNotification();

    // --- Estados ---
    // Lista de productos origen
    const [itemsOrigen, setItemsOrigen] = useState([
        { id: '', nombre: '', tamaño: '', stockActual: 0, cantidadAUsar: 0 }
    ]);

    // Control del Modal de Búsqueda
    const [showModalBusqueda, setShowModalBusqueda] = useState(false);
    const [indexSeleccionando, setIndexSeleccionando] = useState(null); // Qué fila está buscando producto

    // Producto destino
    const [productoDestino, setProductoDestino] = useState(null);
    const [cantidadDestino, setCantidadDestino] = useState(0);
    const [busquedaDestino, setBusquedaDestino] = useState('');
    const [cargando, setCargando] = useState(false);

    // --- Efecto: Cálculo Automático y Sugerencia ---
    useEffect(() => {
        const totalUnidadesOrigen = itemsOrigen.reduce((sum, item) => sum + Number(item.cantidadAUsar || 0), 0);
        setCantidadDestino(totalUnidadesOrigen);

        const primerItem = itemsOrigen[0];
        if (primerItem && primerItem.id && !productoDestino) {
            const sugerencia = productos.find(p => {
                const nombreLower = p.nombre.toLowerCase();
                const esSurtido = nombreLower.includes('surtid') || nombreLower.includes('mix') || nombreLower.includes('variado');
                const mismoTamano = p.tamaño === primerItem.tamaño;
                return esSurtido && mismoTamano;
            });

            if (sugerencia) {
                setProductoDestino(sugerencia);
                setBusquedaDestino(sugerencia.nombre);
            }
        }
    }, [itemsOrigen, productos, productoDestino]);

    // --- Manejadores de Origen ---
    const agregarFilaOrigen = () => {
        setItemsOrigen([...itemsOrigen, { id: '', nombre: '', tamaño: '', stockActual: 0, cantidadAUsar: 0 }]);
    };

    const eliminarFilaOrigen = (index) => {
        const nuevosItems = itemsOrigen.filter((_, i) => i !== index);
        setItemsOrigen(nuevosItems);
    };

    // Abrir el modal para buscar producto en una fila específica
    const abrirBusquedaOrigen = (index) => {
        setIndexSeleccionando(index);
        setShowModalBusqueda(true);
    };

    // Callback cuando seleccionas producto desde el ModalBuscarProducto
    const handleProductoOrigenSeleccionado = (productoSeleccionado) => {
        if (indexSeleccionando === null) return;

        // Validar que no sea el mismo producto que ya está en otra fila (opcional, pero recomendado)
        const yaExiste = itemsOrigen.some((item, idx) => idx !== indexSeleccionando && item.id === productoSeleccionado.id);
        if (yaExiste) {
            showAlert('⚠️ Este producto ya está en la lista de origen.', 'error');
            return;
        }

        const nuevosItems = [...itemsOrigen];
        // Asegurarnos de usar el campo correcto para stock (tu modal devuelve 'stock' o 'stockUnidades')
        const stockReal = productoSeleccionado.stockUnidades || productoSeleccionado.stock || 0;

        nuevosItems[indexSeleccionando] = {
            ...nuevosItems[indexSeleccionando],
            id: productoSeleccionado.id,
            nombre: productoSeleccionado.nombre,
            tamaño: productoSeleccionado.tamaño || productoSeleccionado.formato || '', // Tu modal a veces usa 'formato'
            stockActual: stockReal,
            cantidadAUsar: 0
        };

        setItemsOrigen(nuevosItems);
        setShowModalBusqueda(false);
        setIndexSeleccionando(null);
    };

    const handleCantidadOrigenChange = (index, cantidad) => {
        const nuevosItems = [...itemsOrigen];
        nuevosItems[index].cantidadAUsar = Number(cantidad);
        setItemsOrigen(nuevosItems);
    };

    // --- Manejadores de Destino ---
    const filtrarProductosDestino = () => {
        if (!busquedaDestino) return [];
        return productos.filter(p =>
            p.nombre.toLowerCase().includes(busquedaDestino.toLowerCase()) ||
            p.tamaño.toLowerCase().includes(busquedaDestino.toLowerCase())
        );
    };

    const handleSelectDestino = (producto) => {
        setProductoDestino(producto);
        setBusquedaDestino(producto.nombre);
    };

    // --- Acción Principal: Transformar ---
    const handleTransformar = async () => {
        // Validaciones (Igual que antes)
        if (!productoDestino) {
            showAlert('Debes seleccionar un producto destino (ej. Surtida).', 'error');
            return;
        }
        if (cantidadDestino <= 0) {
            showAlert('La cantidad destino debe ser mayor a 0.', 'error');
            return;
        }

        const itemsValidos = itemsOrigen.filter(i => i.id && i.cantidadAUsar > 0);
        if (itemsValidos.length === 0) {
            showAlert('Debes seleccionar productos origen y definir cantidades.', 'error');
            return;
        }

        for (const item of itemsValidos) {
            if (item.cantidadAUsar > item.stockActual) {
                showAlert(`Stock insuficiente de ${item.nombre}. Tienes ${item.stockActual}, intentas usar ${item.cantidadAUsar}.`, 'error');
                return;
            }
        }

        setCargando(true);

        try {
            await runTransaction(db, async (transaction) => {
                const lecturasOrigen = [];
                for (const item of itemsValidos) {
                    const docRef = doc(db, 'productos', item.id);
                    const docSnap = await transaction.get(docRef);
                    if (!docSnap.exists()) throw new Error(`Producto ${item.nombre} no encontrado.`);
                    lecturasOrigen.push({ ref: docRef, data: docSnap.data(), cantidadRestar: item.cantidadAUsar, nombre: item.nombre });
                }

                const destinoRef = doc(db, 'productos', productoDestino.id);
                const destinoSnap = await transaction.get(destinoRef);
                if (!destinoSnap.exists()) throw new Error(`Producto destino ${productoDestino.nombre} no encontrado.`);

                for (const lectura of lecturasOrigen) {
                    if (lectura.data.stockUnidades < lectura.cantidadRestar) {
                        throw new Error(`Stock insuficiente en BD para ${lectura.nombre}.`);
                    }
                }

                for (const lectura of lecturasOrigen) {
                    const nuevoStock = lectura.data.stockUnidades - lectura.cantidadRestar;
                    transaction.update(lectura.ref, { stockUnidades: nuevoStock });
                }

                const nuevoStockDestino = (destinoSnap.data().stockUnidades || 0) + Number(cantidadDestino);
                transaction.update(destinoRef, { stockUnidades: nuevoStockDestino });
            });

            showAlert('✅ ¡Transformación realizada con éxito!', 'exito');
            onClose();

        } catch (error) {
            console.error("Error en transformación:", error);
            showAlert(`Error: ${error.message}`, 'error');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content modal-transformar">
                <div className="modal-header">
                    <h3>🔄 Mezclar / Transformar Productos</h3>
                    <button onClick={onClose} className="btn-cerrar-x">×</button>
                </div>

                <div className="modal-body-scroll">
                    {/* SECCIÓN ORIGEN */}
                    <div className="seccion-transformacion origen">
                        <h4>🔻 Productos a Utilizar (Origen)</h4>
                        <p className="hint">Selecciona las gaseosas que vas a mezclar (ej. Coca + Fanta)</p>

                        {itemsOrigen.map((item, index) => (
                            <div key={index} className="fila-origen">
                                {/* Botón para abrir el Modal de Búsqueda */}
                                <div className="input-producto-contenedor" style={{ flex: 2 }}>
                                    {item.id ? (
                                        <div
                                            className="producto-seleccionado-display"
                                            onClick={() => abrirBusquedaOrigen(index)}
                                            title="Clic para cambiar producto"
                                        >
                                            <strong>{item.nombre}</strong>
                                            <span className="detalle-stock">({item.tamaño}) | Stock: {item.stockActual}</span>
                                        </div>
                                    ) : (
                                        <button
                                            className="btn-buscar-producto-origen"
                                            onClick={() => abrirBusquedaOrigen(index)}
                                        >
                                            🔍 Buscar Producto
                                        </button>
                                    )}
                                </div>

                                <input
                                    type="number"
                                    placeholder="Cant."
                                    value={item.cantidadAUsar || ''}
                                    onChange={(e) => handleCantidadOrigenChange(index, e.target.value)}
                                    className="input-cantidad"
                                    min="0"
                                />

                                {itemsOrigen.length > 1 && (
                                    <button onClick={() => eliminarFilaOrigen(index)} className="btn-eliminar-fila">🗑️</button>
                                )}
                            </div>
                        ))}

                        <button onClick={agregarFilaOrigen} className="btn-agregar-fila">
                            + Agregar otro ingrediente
                        </button>
                    </div>

                    <div className="flecha-transformacion">
                        <div className="flecha-icono-azul">⬇</div>
                    </div>


                    {/* SECCIÓN DESTINO */}
                    <div className="seccion-transformacion destino">
                        <h4>✅ Producto Resultante (Destino)</h4>
                        <p className="hint">Busca el producto "Surtida" o el resultado de la mezcla</p>

                        <div className="buscador-destino-wrapper">
                            <input
                                type="text"
                                placeholder="🔍 Buscar producto destino (ej. Surtida)..."
                                value={busquedaDestino}
                                onChange={(e) => {
                                    setBusquedaDestino(e.target.value);
                                    setProductoDestino(null);
                                }}
                                className="input-buscador-destino"
                            />
                            {busquedaDestino && !productoDestino && (
                                <div className="sugerencias-lista">
                                    {filtrarProductosDestino().map(p => (
                                        <div
                                            key={p.id}
                                            className="sugerencia-item"
                                            onClick={() => handleSelectDestino(p)}
                                        >
                                            <strong>{p.nombre}</strong> - {p.tamaño}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {productoDestino && (
                            <div className="destino-seleccionado-info">
                                <p><strong>Producto:</strong> {productoDestino.nombre} ({productoDestino.tamaño})</p>
                                <div className="form-group-inline">
                                    <label>Cantidad Resultante:</label>
                                    <input
                                        type="number"
                                        value={cantidadDestino}
                                        onChange={(e) => setCantidadDestino(Number(e.target.value))}
                                        className="input-cantidad-grande"
                                    />
                                </div>
                                <small>Calculado automáticamente (Suma de orígenes)</small>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button onClick={onClose} className="btn-cancelar" disabled={cargando}>Cancelar</button>
                    <button
                        onClick={handleTransformar}
                        className="btn-confirmar-transformacion"
                        disabled={cargando || !productoDestino}
                    >
                        {cargando ? '🔄 Procesando...' : '✅ Confirmar Mezcla'}
                    </button>
                </div>
            </div>

            {/* --- INTEGRACIÓN DEL MODAL DE BÚSQUEDA REUTILIZADO --- */}
            {showModalBusqueda && (
                <ModalBuscarProducto
                    onClose={() => setShowModalBusqueda(false)}
                    onSelectProducto={handleProductoOrigenSeleccionado}
                />
            )}
        </div>
    );
};

export default ModalTransformarProducto;
