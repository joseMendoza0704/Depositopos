import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig.js';
import { Geolocation } from '@capacitor/geolocation';
import { registerPlugin } from '@capacitor/core';
const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { useNotification } from '../context/NotificationContext';
import { Search, Plus, Edit, Trash2, X, MapPin, Loader, Crosshair, Truck, Navigation, Package, User, Phone, CheckCircle, Map } from 'lucide-react';
import ModalConfirmacion from '../components/ModalConfirmacion';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/pedidos.css';
import '../styles/Ubicaciones.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const CENTRO_PARASO = [13.863397, -86.554473];
const ZOOM_DEFAULT = 15;

function MapaSelector({ lat, lng, onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return lat && lng ? <Marker position={[lat, lng]} /> : null;
}

function Ubicaciones({ usuario }) {
  const { showAlert } = useNotification();
  const rolUsuario = usuario?.rol || 'cajero';

  // Tab activa: 'ubicaciones' o 'entregas'
  const [tabActiva, setTabActiva] = useState(rolUsuario === 'ubicaciones' ? 'entregas' : 'ubicaciones');

  // Estados - Clientes para búsqueda
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientes, setClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);

  // Estados - Ubicaciones
  const [ubicaciones, setUbicaciones] = useState([]);
  const [cargandoUbicaciones, setCargandoUbicaciones] = useState(true);

  // Estados - Modal de Confirmación
  const [modalConfirm, setModalConfirm] = useState({ visible: false, mensaje: '', onConfirm: null });

  // Estados - Carrusel Entregas
  const [indiceEntrega, setIndiceEntrega] = useState(0);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Estados - Entregas
  const [pedidosRecibidos, setPedidosRecibidos] = useState([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(true);
  const [entregaData, setEntregaData] = useState(null); // Documento de la entrega activa
  const watchIdRef = useRef(null);
  const bgWatcherRef = useRef(null);

  // Cargar clientes activos
  useEffect(() => {
    const q = query(collection(db, 'clientes'), where('activo', '==', true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaClientes = [];
      snapshot.forEach((doc) => {
        listaClientes.push({ id: doc.id, ...doc.data() });
      });
      listaClientes.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      setClientes(listaClientes);
      setClientesFiltrados(listaClientes);
    });

    return () => unsubscribe();
  }, []);

  // Efecto para manejar el paginador de entregas
  useEffect(() => {
    if (pedidosRecibidos.length === 0) {
      setIndiceEntrega(0);
    } else if (indiceEntrega >= pedidosRecibidos.length) {
      setIndiceEntrega(Math.max(0, pedidosRecibidos.length - 1));
    }
  }, [pedidosRecibidos.length, indiceEntrega]);

  const handlePrevEntrega = () => setIndiceEntrega(prev => Math.max(0, prev - 1));
  const handleNextEntrega = () => setIndiceEntrega(prev => Math.min(pedidosRecibidos.length - 1, prev + 1));

  // Cargar ubicaciones
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'ubicaciones'), (snapshot) => {
      const listaUbicaciones = [];
      snapshot.forEach((doc) => {
        listaUbicaciones.push({ id: doc.id, ...doc.data() });
      });
      setUbicaciones(listaUbicaciones);
      setCargandoUbicaciones(false);
    });

    return () => unsubscribe();
  }, []);

  // Filtrar clientes
  useEffect(() => {
    if (busquedaCliente.trim() === '') {
      setClientesFiltrados(clientes);
    } else {
      const filtrados = clientes.filter(c =>
        (c.nombre || '').toLowerCase().includes(busquedaCliente.toLowerCase())
      );
      setClientesFiltrados(filtrados);
    }
  }, [busquedaCliente, clientes]);

  // 1. Cargar pedidos con estado 'recibido'
  useEffect(() => {
    const q = query(
      collection(db, 'pedidos'),
      where('estado', '==', 'recibido'),
      orderBy('fechaCreacion', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          clienteId: data.clienteId || data.cliente?.id || null,
          cliente: {
            nombre: data.cliente?.nombre || data.nombre || 'Sin nombre',
            direccion: data.cliente?.direccion || data.direccion || '',
            telefono: String(data.cliente?.telefono || data.telefono || ''),
          },
          items: (data.items || []).map(item => ({
            cantidad: Number(item.cantidad) || 0,
            nombre: item.nombre || '',
            formato: item.formato || '',
            subtotal: Number(item.subtotal) || 0,
          })),
          total: Number(data.total) || 0,
          fechaCreacion: data.fechaCreacion,
        };
      });
      setPedidosRecibidos(lista);
      setCargandoPedidos(false);
    });

    return () => unsubscribe();
  }, []);

  const isNative = window.Capacitor?.isNativePlatform?.();

  // Ref to always have the current entregaData inside watchPosition callback
  const entregaDataRef = useRef(null);
  useEffect(() => {
    entregaDataRef.current = entregaData;
  }, [entregaData]);

  // 2. Cargar la entrega activa de este repartidor
  useEffect(() => {
    if (!usuario?.uid) return;

    const q = query(
      collection(db, 'entregas'),
      where('repartidorId', '==', usuario.uid),
      where('estado', '==', 'en_camino')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setEntregaData({ id: docSnap.id, ...docSnap.data() });
      } else {
        setEntregaData(null);
      }
    });

    return () => unsubscribe();
  }, [usuario?.uid]);

  // 3. Monitorear el pedido de la entrega activa (para detener si se marca como pagado)
  useEffect(() => {
    if (!entregaData?.pedidoId) return;

    const unsubscribe = onSnapshot(doc(db, 'pedidos', entregaData.pedidoId), async (docSnap) => {
      if (docSnap.exists()) {
        const estadoPedido = docSnap.data().estado;
        if (estadoPedido === 'pagado') {
          showAlert('El pedido ha sido cobrado. Puedes realizar otra entrega.', 'success');
          try {
            await updateDoc(doc(db, 'entregas', entregaData.id), {
              estado: 'completado',
              fechaFin: serverTimestamp()
            });
          } catch(e) {
            console.error(e);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [entregaData?.pedidoId, entregaData?.id]);

  const detenerTracking = async () => {
    if (bgWatcherRef.current !== null) {
      try {
        await BackgroundGeolocation.removeWatcher({ id: bgWatcherRef.current });
      } catch (err) {
        console.error('Error deteniendo BackgroundGeolocation:', err);
      }
      bgWatcherRef.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const iniciarWebTracking = () => {
    if (!navigator.geolocation) {
      console.warn('navigator.geolocation not available');
      return;
    }
    console.log('Iniciando web GPS watch');
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const currentEntrega = entregaDataRef.current;
        if (!currentEntrega?.id) return;

        const punto = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date().toISOString(),
          accuracy: position.coords.accuracy,
        };

        try {
          await updateDoc(doc(db, 'entregas', currentEntrega.id), {
            ultimaUbicacion: punto,
            ultimaActualizacion: serverTimestamp(),
          });
          console.log('GPS web update sent:', punto.lat, punto.lng);
        } catch (err) {
          console.error('Error actualizando ubicación web:', err);
        }
      },
      (error) => console.error('Error GPS web:', error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  };

  const iniciarTracking = async (entregaId) => {
    if (isNative) {
      try {
        const watcherId = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: 'Rastreando tu ubicación para la entrega en curso.',
            backgroundTitle: 'Entrega en curso',
            requestPermissions: true,
            stale: false,
            distanceFilter: 10
          },
          async function callback(location, error) {
            if (error) {
              if (error.code === 'NOT_AUTHORIZED') {
                if (window.confirm('La app necesita permisos de ubicación. ¿Abrir configuración?')) {
                  BackgroundGeolocation.openSettings();
                }
              }
              console.error('Error BackgroundGeolocation:', error);
              return;
            }

            const currentEntrega = entregaDataRef.current;
            if (!currentEntrega?.id) return;

            const punto = {
              lat: location.latitude,
              lng: location.longitude,
              timestamp: new Date().toISOString(),
              accuracy: location.accuracy,
            };

            try {
              await updateDoc(doc(db, 'entregas', currentEntrega.id), {
                ultimaUbicacion: punto,
                ultimaActualizacion: serverTimestamp(),
              });
              console.log('Background GPS update sent:', punto.lat, punto.lng);
            } catch (err) {
              console.error('Error actualizando ubicación bg:', err);
            }
          }
        );
        bgWatcherRef.current = watcherId;
      } catch (err) {
        console.error('Error iniciando BackgroundGeolocation, usando web fallback:', err);
        iniciarWebTracking();
      }
    } else {
      iniciarWebTracking();
    }
  };

  useEffect(() => {
    if (entregaData?.id) {
      if (bgWatcherRef.current === null && watchIdRef.current === null) {
        iniciarTracking(entregaData.id);
      }
    } else {
      detenerTracking();
    }
  }, [entregaData?.id]);

  useEffect(() => {
    return () => {
      detenerTracking();
    };
  }, []);

  // Iniciar entrega
  const iniciarEntrega = async (pedido) => {
    if (entregaData) {
      showAlert('Ya hay una entrega en curso. Finalízala primero.', 'error');
      return;
    }

    if (!isNative && !navigator.geolocation) {
      showAlert('Tu navegador no soporta geolocalización', 'error');
      return;
    }

    try {
      // 1. Cambiar estado del pedido a 'enviado'
      await updateDoc(doc(db, 'pedidos', pedido.id), {
        estado: 'enviado'
      });

      // 2. Crear documento de entrega en Firestore
      const entregaRef = await addDoc(collection(db, 'entregas'), {
        pedidoId: pedido.id,
        clienteId: pedido.clienteId || null,
        clienteNombre: pedido.cliente.nombre,
        clienteDireccion: pedido.cliente.direccion,
        clienteTelefono: pedido.cliente.telefono,
        total: pedido.total,
        estado: 'en_camino',
        repartidorId: usuario?.uid,
        repartidorNombre: usuario?.displayName || usuario?.email || 'Repartidor',
        fechaInicio: serverTimestamp(),
        ubicaciones: [],
      });

      showAlert(`Entrega iniciada para ${pedido.cliente.nombre}. Rastreo GPS activo.`, 'success');
    } catch (error) {
      console.error('Error iniciando entrega:', error);
      showAlert('Error al iniciar la entrega', 'error');
    }
  };

  // Cancelar tracking
  const cancelarTracking = async () => {
    if (!entregaData) return;
    
    setModalConfirm({
      visible: true,
      mensaje: '¿Seguro que deseas cancelar esta entrega? El pedido volverá a estar "Recibido".',
      onConfirm: async () => {
        setModalConfirm({ visible: false, mensaje: '', onConfirm: null });
        try {
          await detenerTracking();

          // 1. Regresar pedido a "recibido" (con try/catch por si el pedido fue eliminado)
          try {
            await updateDoc(doc(db, 'pedidos', entregaData.pedidoId), {
              estado: 'recibido'
            });
          } catch (e) {
            console.warn('El pedido no se pudo actualizar o ya no existe:', e);
          }

          // 2. Cancelar la entrega
          await updateDoc(doc(db, 'entregas', entregaData.id), {
            estado: 'cancelado',
            fechaFin: serverTimestamp()
          });

          showAlert('Tracking cancelado/reseteado correctamente', 'info');
        } catch(e) {
          console.error(e);
          showAlert('Error al cancelar', 'error');
        }
      }
    });
  };

  const abrirFormularioNuevo = () => {
    setClienteSeleccionado(null);
    setBusquedaCliente('');
    setClientesFiltrados(clientes);
    setLatitud('');
    setLongitud('');
    setEditandoId(null);
    setMostrarFormulario(true);
    setMostrarListaClientes(true);
  };

  const seleccionarCliente = (cliente) => {
    const yaExiste = ubicaciones.some(u => u.clienteId === cliente.id);
    if (yaExiste) {
      showAlert('Este cliente ya tiene una ubicación registrada', 'error');
      return;
    }

    setClienteSeleccionado({
      id: cliente.id,
      nombre: cliente.nombre,
      direccion: cliente.direccion,
      telefono: cliente.telefono
    });
    setMostrarListaClientes(false);
    setLatitud('');
    setLongitud('');
  };

  const obtenerUbicacionActual = async () => {
    setObteniendoUbicacion(true);

    try {
      // Check if running on a native Capacitor platform
      const isNative = window.Capacitor?.isNativePlatform?.();

      if (isNative) {
        // Native: use Capacitor Geolocation API
        const permissionStatus = await Geolocation.checkPermissions();

        if (permissionStatus.location !== 'granted') {
          const requestResult = await Geolocation.requestPermissions();
          if (requestResult.location !== 'granted') {
            showAlert('Se necesita permiso de ubicación', 'error');
            setObteniendoUbicacion(false);
            return;
          }
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true
        });

        setLatitud(position.coords.latitude.toFixed(6));
        setLongitud(position.coords.longitude.toFixed(6));
        showAlert('Ubicación obtenida correctamente', 'success');
      } else {
        // Web: use browser's native Geolocation API
        if (!navigator.geolocation) {
          showAlert('Tu navegador no soporta geolocalización', 'error');
          setObteniendoUbicacion(false);
          return;
        }

        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          });
        });

        setLatitud(position.coords.latitude.toFixed(6));
        setLongitud(position.coords.longitude.toFixed(6));
        showAlert('Ubicación obtenida correctamente', 'success');
      }
    } catch (error) {
      console.error('Error geolocation:', error);
      // Provide user-friendly messages for common web geolocation errors
      let mensaje = error.message;
      if (error.code === 1) mensaje = 'Permiso de ubicación denegado';
      else if (error.code === 2) mensaje = 'Ubicación no disponible';
      else if (error.code === 3) mensaje = 'Tiempo de espera agotado';
      showAlert('No se pudo obtener la ubicación: ' + mensaje, 'error');
    } finally {
      setObteniendoUbicacion(false);
    }
  };

  const verUbicacion = (ubicacion) => {
    setClienteSeleccionado({
      id: ubicacion.clienteId,
      nombre: ubicacion.nombre,
      direccion: ubicacion.direccion,
      telefono: ubicacion.telefono
    });
    setLatitud(ubicacion.lat ? ubicacion.lat.toString() : '');
    setLongitud(ubicacion.lng ? ubicacion.lng.toString() : '');
    setEditandoId(ubicacion.id);
    setMostrarFormulario(true);
    setMostrarListaClientes(false);
  };

  const guardarUbicacion = async () => {
    if (!clienteSeleccionado) {
      showAlert('Selecciona un cliente', 'error');
      return;
    }

    const lat = parseFloat(latitud);
    const lng = parseFloat(longitud);

    if (isNaN(lat) || isNaN(lng)) {
      showAlert('Ingresa coordenadas válidas', 'error');
      return;
    }

    setGuardando(true);

    try {
      const datos = {
        nombre: clienteSeleccionado.nombre,
        direccion: clienteSeleccionado.direccion,
        telefono: clienteSeleccionado.telefono || '',
        lat: lat,
        lng: lng,
        clienteId: clienteSeleccionado.id,
        fechaCreacion: serverTimestamp(),
        usuarioId: usuario?.uid
      };

      if (editandoId) {
        await updateDoc(doc(db, 'ubicaciones', editandoId), datos);
        showAlert('Ubicación actualizada', 'success');
      } else {
        await addDoc(collection(db, 'ubicaciones'), datos);
        showAlert('Ubicación guardada', 'success');
      }

      cancelarFormulario();
    } catch (error) {
      console.error('Error guardando ubicación:', error);
      showAlert('Error al guardar ubicación', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarUbicacion = (id) => {
    setModalConfirm({
      visible: true,
      mensaje: '¿Estás seguro de eliminar esta ubicación?',
      onConfirm: async () => {
        setModalConfirm({ visible: false, mensaje: '', onConfirm: null });
        try {
          await deleteDoc(doc(db, 'ubicaciones', id));
          showAlert('Ubicación eliminada', 'success');
        } catch (error) {
          console.error('Error eliminando:', error);
          showAlert('Error al eliminar', 'error');
        }
      }
    });
  };

  const cancelarFormulario = () => {
    setMostrarFormulario(false);
    setClienteSeleccionado(null);
    setLatitud('');
    setLongitud('');
    setEditandoId(null);
    setMostrarListaClientes(false);
  };

  return (
    <div className="ubicaciones-container">
      <div className="ubicaciones-header">
        <h1><MapPin size={28} /> Ubicaciones de Pulperías</h1>
        <div className="header-actions">
          {/* Tabs */}
          <div className="ubicaciones-tabs">
              <button
                className={`tab-ubicaciones ${tabActiva === 'ubicaciones' ? 'active' : ''}`}
                onClick={() => setTabActiva('ubicaciones')}
              >
                <MapPin size={18} /> Ubicaciones
              </button>
            <button
              className={`tab-ubicaciones tab-entregas ${tabActiva === 'entregas' ? 'active' : ''}`}
              onClick={() => setTabActiva('entregas')}
            >
              <Truck size={18} /> Entregas
              {pedidosRecibidos.length > 0 && (
                <span className="entregas-badge">{pedidosRecibidos.length}</span>
              )}
            </button>
          </div>
          {tabActiva === 'ubicaciones' && !mostrarFormulario && (
            <button className="btn-nueva-ubicacion" onClick={abrirFormularioNuevo}>
              <Plus size={20} /> Nueva Ubicación
            </button>
          )}
        </div>
      </div>

      {/* ===== VISTA PRINCIPAL ===== */}
      {mostrarFormulario ? (
        <div className="formulario-view">
              <div className="form-header">
                <h3>{editandoId ? 'Editar' : 'Nueva'} Ubicación</h3>
                <button className="btn-cerrar" onClick={cancelarFormulario}>
                  <X size={20} />
                </button>
              </div>

              {clienteSeleccionado ? (
                <div className="cliente-datos-panel">
                  <div className="dato-item">
                    <span className="dato-label">Cliente:</span>
                    <span className="dato-value">{clienteSeleccionado.nombre}</span>
                  </div>
                  <div className="dato-item">
                    <span className="dato-label">Dirección:</span>
                    <span className="dato-value">{clienteSeleccionado.direccion}</span>
                  </div>
                  <div className="dato-item">
                    <span className="dato-label">Teléfono:</span>
                    <span className="dato-value">{clienteSeleccionado.telefono}</span>
                  </div>
                </div>
              ) : (
                <div className="busqueda-cliente-form">
                  <label>Buscar Cliente:</label>
                  <div className="busqueda-input-container">
                    <Search size={20} />
                    <input
                      type="text"
                      placeholder="Escribe el nombre del cliente..."
                      value={busquedaCliente}
                      onChange={(e) => {
                        setBusquedaCliente(e.target.value);
                        setMostrarListaClientes(true);
                      }}
                      onFocus={() => setMostrarListaClientes(true)}
                      className="busqueda-input"
                    />
                  </div>
                  {mostrarListaClientes && clientesFiltrados.length > 0 && (
                    <div className="clientes-dropdown">
                      {clientesFiltrados.map((cliente) => (
                        <div
                          key={cliente.id}
                          className="cliente-dropdown-item"
                          onClick={() => seleccionarCliente(cliente)}
                        >
                          <strong>{cliente.nombre}</strong>
                          <span>{cliente.direccion}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mapa-view">
                <div className="mapa-header">
                  <label>{editandoId ? 'Ubicación de la pulpería:' : 'Selecciona la ubicación en el mapa:'}</label>
                  {clienteSeleccionado && (
                    <button
                      className="btn-mi-ubicacion"
                      onClick={obtenerUbicacionActual}
                      disabled={obteniendoUbicacion}
                    >
                      <Crosshair size={16} />
                      {obteniendoUbicacion ? 'Obteniendo...' : 'Mi Ubicación Actual'}
                    </button>
                  )}
                </div>

                {clienteSeleccionado ? (
                  <>
                    <MapContainer
                      center={latitud && longitud ? [parseFloat(latitud), parseFloat(longitud)] : CENTRO_PARASO}
                      zoom={ZOOM_DEFAULT}
                      style={{ height: '400px', width: '100%', borderRadius: '8px' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <MapaSelector
                        lat={latitud ? parseFloat(latitud) : null}
                        lng={longitud ? parseFloat(longitud) : null}
                        onSelect={(lat, lng) => {
                          setLatitud(lat.toFixed(6));
                          setLongitud(lng.toFixed(6));
                        }}
                      />
                    </MapContainer>
                    <p className="mapa-instruccion">Haz click en el mapa para seleccionar la ubicación</p>
                  </>
                ) : (
                  <div className="mapa-deshabilitado">
                    <MapPin size={48} />
                    <p>Selecciona un cliente para ver el mapa</p>
                  </div>
                )}
              </div>

              {clienteSeleccionado && (
                <div className="coordenadas-inputs">
                  <div className="form-group">
                    <label>Latitud:</label>
                    <input type="number" step="any" value={latitud} onChange={(e) => setLatitud(e.target.value)} placeholder="Latitud" />
                  </div>
                  <div className="form-group">
                    <label>Longitud:</label>
                    <input type="number" step="any" value={longitud} onChange={(e) => setLongitud(e.target.value)} placeholder="Longitud" />
                  </div>
                </div>
              )}

              {clienteSeleccionado && (
                <div className="form-actions">
                  <button className="btn-cancelar" onClick={cancelarFormulario}>Cancelar</button>
                  <button className="btn-guardar" onClick={guardarUbicacion} disabled={guardando}>
                    {guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              )}
            </div>
      ) : (
        <>
          {/* ===== TAB UBICACIONES ===== */}
          {tabActiva === 'ubicaciones' && (
            <div className="ubicaciones-tabla">
              {cargandoUbicaciones ? (
                <div className="cargando"><Loader className="spinner" /> Cargando...</div>
              ) : ubicaciones.length === 0 ? (
                <div className="sin-datos">
                  <MapPin size={48} />
                  <p>No hay ubicaciones registradas</p>
                  <p>Haz click en "Nueva Ubicación" para agregar</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Dirección</th>
                      <th>Teléfono</th>
                      <th>Coordenadas</th>
                      <th>Navegar</th>
                      {rolUsuario !== 'ubicaciones' && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {ubicaciones.map((u) => (
                      <tr key={u.id} onClick={() => verUbicacion(u)} className="fila-clickeable">
                        <td>{u.nombre}</td>
                        <td>{u.direccion}</td>
                        <td>{u.telefono}</td>
                        <td>{u.lat?.toFixed(6)}, {u.lng?.toFixed(6)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <a 
                              href={u.lat && u.lng ? `https://waze.com/ul?ll=${u.lat},${u.lng}` : `https://waze.com/ul?q=${encodeURIComponent(u.direccion)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e3f2fd', color: '#1976d2', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', textDecoration: 'none' }}
                            >
                              <Navigation size={14} /> Waze
                            </a>
                            <a 
                              href={u.lat && u.lng ? `https://www.google.com/maps/dir/?api=1&destination=${u.lat},${u.lng}` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(u.direccion)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e8f5e9', color: '#2e7d32', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', textDecoration: 'none' }}
                            >
                              <Map size={14} /> Maps
                            </a>
                          </div>
                        </td>
                        {rolUsuario !== 'ubicaciones' && (
                          <td onClick={(e) => e.stopPropagation()}>
                            <button className="btn-accion btn-eliminar" onClick={() => eliminarUbicacion(u.id)}>
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ===== TAB ENTREGAS ===== */}
          {tabActiva === 'entregas' && (
            <div className="entregas-panel">
          {/* Banner de entrega activa */}
          {entregaData && (
            <div className="entrega-activa-banner">
              <div className="banner-info">
                <Navigation size={20} className="pulse-icon" />
                <span>Entregando a {entregaData.clienteNombre} — Rastreo GPS activo</span>
              </div>
              <button className="btn-cancelar-entrega" onClick={cancelarTracking} style={{background: '#d32f2f', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold'}}>
                <X size={18} />
                Cancelar Tracking
              </button>
            </div>
          )}

          {cargandoPedidos ? (
            <div className="cargando"><Loader className="spinner" /> Cargando pedidos...</div>
          ) : pedidosRecibidos.length === 0 && !entregaData ? (
            <div className="sin-datos">
              <Truck size={48} />
              <p>No hay pedidos pendientes de entrega</p>
              <p>Cuando se reciba un pedido, aparecerá aquí</p>
            </div>
          ) : (
            <div className="carrusel-container" style={{ maxWidth: '450px', margin: '0', width: '100%' }}>
              <div className="carrusel-controles">
                <button className="btn-carrusel" onClick={handlePrevEntrega} disabled={indiceEntrega === 0}>‹</button>
                <span className="carrusel-contador">{indiceEntrega + 1} / {pedidosRecibidos.length}</span>
                <button className="btn-carrusel" onClick={handleNextEntrega} disabled={indiceEntrega >= pedidosRecibidos.length - 1}>›</button>
              </div>

              {pedidosRecibidos.length > 0 && pedidosRecibidos[indiceEntrega] && (() => {
                const pedido = pedidosRecibidos[indiceEntrega];
                return (
                  <div key={pedido.id} className="pedido-card-modern" style={{ border: '1px solid #e0e0e0', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                    {/* Header */}
                    <div className="pedido-card-header">
                      <div className="cliente-info">
                        <div className="cliente-nombre">
                          <User size={18} className="icon-cliente" style={{ color: '#007bff' }} />
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#2c3e50' }}>{pedido.cliente.nombre}</h4>
                        </div>
                        {pedido.cliente.telefono && (
                          <div className="cliente-contacto" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '13px', marginTop: '6px' }}>
                            <Phone size={16} className="icon-telefono" />
                            <span>{pedido.cliente.telefono}</span>
                          </div>
                        )}
                        {pedido.cliente.direccion && (
                          <div className="cliente-direccion" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#666', fontSize: '13px', marginTop: '6px' }}>
                            <MapPin size={16} className="icon-direccion" style={{ marginTop: '2px' }} />
                            <span style={{ flex: 1 }}>{pedido.cliente.direccion}</span>
                            <a 
                              href={`https://waze.com/ul?q=${encodeURIComponent(pedido.cliente.direccion)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                background: '#e3f2fd', color: '#1976d2', padding: '4px 8px',
                                borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', textDecoration: 'none', marginLeft: '8px',
                                flexShrink: 0
                              }}
                            >
                              <Navigation size={14} /> Waze
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="pedido-card-body">
                      <div className="items-header" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: '#7f8c8d', fontSize: '12px', fontWeight: 600 }}>
                        <Package size={18} className="icon-lista" />
                        <span className="items-title" style={{ textTransform: 'uppercase' }}>PRODUCTOS</span>
                      </div>
                      <div className="pedido-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {pedido.items.map((item, idx) => (
                          <div key={idx} className="pedido-item-modern" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingBottom: '8px', borderBottom: '1px dashed #eee' }}>
                            <span className="item-cantidad-badge" style={{ backgroundColor: '#e3f2fd', color: '#1976d2', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, fontSize: '12px', minWidth: '24px', textAlign: 'center' }}>{item.cantidad}x</span>
                            <div className="item-detalles" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                              <span className="item-nombre-modern" style={{ color: '#34495e', fontWeight: 500, fontSize: '14px' }}>{item.nombre}</span>
                              <span className="item-formato-modern" style={{ color: '#95a5a6', fontSize: '12px' }}>Unidad</span>
                            </div>
                            <span className="item-subtotal-modern" style={{ color: '#27ae60', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap' }}>L. {item.subtotal ? item.subtotal.toFixed(2) : '0.00'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer y Botones */}
                    <div className="pedido-card-footer" style={{ backgroundColor: '#fcfcfc', borderTop: '1px solid #eee', padding: '16px' }}>
                      <div className="pedido-total-modern" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span className="total-label" style={{ color: '#7f8c8d', fontSize: '16px' }}>Total</span>
                        <span className="total-monto" style={{ color: '#2c3e50', fontWeight: 800, fontSize: '18px' }}>L. {pedido.total ? pedido.total.toFixed(2) : '0.00'}</span>
                      </div>

                      <button
                        onClick={() => iniciarEntrega(pedido)}
                        disabled={!!entregaData}
                        style={{
                          width: '100%',
                          padding: '12px',
                          fontSize: '15px',
                          backgroundColor: entregaData ? '#bdc3c7' : '#007bff',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 600,
                          cursor: entregaData ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Navigation size={18} />
                        {entregaData ? 'Otra entrega en curso' : 'Entregar'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
      </>
      )}

      {modalConfirm.visible && (
        <ModalConfirmacion
          mensaje={modalConfirm.mensaje}
          onConfirm={modalConfirm.onConfirm}
          onCancel={() => setModalConfirm({ visible: false, mensaje: '', onConfirm: null })}
        />
      )}
    </div>
  );
}

export default Ubicaciones;