import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.js';
import { Geolocation } from '@capacitor/geolocation';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { useNotification } from '../context/NotificationContext';
import { Search, Plus, Edit, Trash2, X, MapPin, Loader, Crosshair } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
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

  // Estados - Clientes para búsqueda
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientes, setClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [mostrarListaClientes, setMostrarListaClientes] = useState(false);

  // Estados - Ubicaciones
  const [ubicaciones, setUbicaciones] = useState([]);
  const [cargandoUbicaciones, setCargandoUbicaciones] = useState(true);

  // Estados - Formulario
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

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
    } catch (error) {
      console.error('Error geolocation:', error);
      showAlert('No se pudo obtener la ubicación: ' + error.message, 'error');
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

  const eliminarUbicacion = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta ubicación?')) return;

    try {
      await deleteDoc(doc(db, 'ubicaciones', id));
      showAlert('Ubicación eliminada', 'success');
    } catch (error) {
      console.error('Error eliminando:', error);
      showAlert('Error al eliminar', 'error');
    }
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
        {!mostrarFormulario && (
          <button className="btn-nueva-ubicacion" onClick={abrirFormularioNuevo}>
            <Plus size={20} /> Nueva Ubicación
          </button>
        )}
      </div>

      {mostrarFormulario ? (
        <div className="formulario-view">
          <div className="form-header">
            <h3>{editandoId ? 'Editar' : 'Nueva'} Ubicación</h3>
            <button className="btn-cerrar" onClick={cancelarFormulario}>
              <X size={20} />
            </button>
          </div>

          {/* Datos del cliente */}
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

          {/* Mapa */}
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

          {/* Coordenadas */}
          {clienteSeleccionado && (
            <div className="coordenadas-inputs">
              <div className="form-group">
                <label>Latitud:</label>
                <input
                  type="number"
                  step="any"
                  value={latitud}
                  onChange={(e) => setLatitud(e.target.value)}
                  placeholder="Latitud"
                />
              </div>
              <div className="form-group">
                <label>Longitud:</label>
                <input
                  type="number"
                  step="any"
                  value={longitud}
                  onChange={(e) => setLongitud(e.target.value)}
                  placeholder="Longitud"
                />
              </div>
            </div>
          )}

          {/* Acciones */}
          {clienteSeleccionado && (
            <div className="form-actions">
              <button className="btn-cancelar" onClick={cancelarFormulario}>
                Cancelar
              </button>
              <button
                className="btn-guardar"
                onClick={guardarUbicacion}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          )}
        </div>
      ) : (
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
                  <th>Acciones</th>
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
                      <button className="btn-accion btn-eliminar" onClick={() => eliminarUbicacion(u.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default Ubicaciones;