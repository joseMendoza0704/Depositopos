import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig.js';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  Truck,
  User,
  MapPin,
  Phone,
  Package,
  Loader,
  Navigation,
  Clock,
  Radio,
} from 'lucide-react';
import '../styles/Tracking.css';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom delivery icon
const deliveryIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

// Custom store (pulperia) icon - Standard Blue Marker
const storeIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to auto-pan the map when position updates
function MapUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);
  return null;
}

function Tracking() {
  const [entregas, setEntregas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [entregaSeleccionada, setEntregaSeleccionada] = useState(null);
  const [ubicaciones, setUbicaciones] = useState([]);

  // Ref to always have the current value of entregaSeleccionada inside the
  // onSnapshot callback without needing to re-subscribe on every change.
  const entregaSeleccionadaRef = useRef(null);
  useEffect(() => {
    entregaSeleccionadaRef.current = entregaSeleccionada;
  }, [entregaSeleccionada]);

  // Listen to active deliveries (estado === 'en_camino')
  useEffect(() => {
    const q = query(
      collection(db, 'entregas'),
      where('estado', '==', 'en_camino')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setEntregas(lista);
      setCargando(false);

      const currentSelected = entregaSeleccionadaRef.current;

      // Auto-select if only one delivery active and nothing selected
      if (lista.length === 1 && !currentSelected) {
        setEntregaSeleccionada(lista[0]);
      }
      // Update selected delivery data in real-time
      else if (currentSelected) {
        const updated = lista.find((e) => e.id === currentSelected.id);
        if (updated) {
          setEntregaSeleccionada(updated);
        } else {
          // Delivery finished or cancelled — select next available or clear
          setEntregaSeleccionada(lista.length > 0 ? lista[0] : null);
        }
      }
      // Auto-select first delivery if nothing selected and there are active deliveries
      else if (lista.length > 0 && !currentSelected) {
        setEntregaSeleccionada(lista[0]);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to ubicaciones
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'ubicaciones'), (snapshot) => {
      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setUbicaciones(lista);
    });
    return () => unsubscribe();
  }, []);

  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('es-HN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--:--';
    }
  };

  // Default center: Paraíso, El Paraíso
  const DEFAULT_CENTER = [13.863397, -86.554473];

  const selectedPosition =
    entregaSeleccionada?.ultimaUbicacion
      ? [
        entregaSeleccionada.ultimaUbicacion.lat,
        entregaSeleccionada.ultimaUbicacion.lng,
      ]
      : null;

  const destinationUbicacion = entregaSeleccionada
    ? ubicaciones.find(u => {
        // Primero intenta por clienteId (más confiable)
        if (entregaSeleccionada.clienteId && u.clienteId) {
          return u.clienteId === entregaSeleccionada.clienteId;
        }
        // Fallback por nombre normalizado
        return u.nombre?.trim().toLowerCase() === entregaSeleccionada.clienteNombre?.trim().toLowerCase();
      })
    : null;

  const destinationPosition = destinationUbicacion && destinationUbicacion.lat && destinationUbicacion.lng
    ? [parseFloat(destinationUbicacion.lat), parseFloat(destinationUbicacion.lng)]
    : null;

  // Always show the map when a delivery is selected, even if GPS hasn't reported yet
  const mapCenter = selectedPosition || destinationPosition || DEFAULT_CENTER;

  return (
    <div className="tracking-container">
      <div className="tracking-header">
        <h1>
          <Navigation size={28} /> Tracking en Tiempo Real
        </h1>
        <div className="tracking-status">
          <Radio size={16} className="live-dot" />
          <span>{entregas.length} entrega{entregas.length !== 1 ? 's' : ''} activa{entregas.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="tracking-content">
        {/* Sidebar with delivery cards */}
        <div className="tracking-sidebar">
          <h3 className="sidebar-title">
            <Truck size={18} /> Entregas en Curso
          </h3>

          {cargando ? (
            <div className="tracking-loading">
              <Loader className="spinner" size={24} />
              <span>Cargando entregas...</span>
            </div>
          ) : entregas.length === 0 ? (
            <div className="tracking-empty">
              <Truck size={40} />
              <p>No hay entregas activas</p>
              <p className="tracking-empty-sub">
                Cuando un repartidor inicie una entrega, aparecerá aquí
              </p>
            </div>
          ) : (
            <div className="tracking-cards-list">
              {entregas.map((entrega) => (
                <div
                  key={entrega.id}
                  className={`tracking-card ${entregaSeleccionada?.id === entrega.id ? 'selected' : ''
                    }`}
                  onClick={() => setEntregaSeleccionada(entrega)}
                >
                  <div className="tracking-card-top">
                    <div className="tracking-card-badge">
                      <Navigation size={14} className="pulse-nav" />
                      En ruta
                    </div>
                    <div className="tracking-card-time">
                      <Clock size={12} />
                      {formatTime(entrega.fechaInicio)}
                    </div>
                  </div>

                  <div className="tracking-card-client">
                    <User size={16} />
                    <strong>{entrega.clienteNombre}</strong>
                  </div>

                  {entrega.clienteDireccion && (
                    <div className="tracking-card-detail">
                      <MapPin size={13} />
                      <span>{entrega.clienteDireccion}</span>
                    </div>
                  )}

                  {entrega.clienteTelefono && (
                    <div className="tracking-card-detail">
                      <Phone size={13} />
                      <span>{entrega.clienteTelefono}</span>
                    </div>
                  )}

                  <div className="tracking-card-total">
                    <span>Total:</span>
                    <strong>L. {(entrega.total || 0).toFixed(2)}</strong>
                  </div>

                  <div className="tracking-card-driver">
                    <Truck size={13} />
                    <span>{entrega.repartidorNombre || 'Repartidor'}</span>
                  </div>

                  {entrega.ultimaUbicacion && (
                    <div className="tracking-card-coords">
                      <MapPin size={11} />
                      <span>
                        {entrega.ultimaUbicacion.lat?.toFixed(5)},{' '}
                        {entrega.ultimaUbicacion.lng?.toFixed(5)}
                      </span>
                      {entrega.ultimaUbicacion.accuracy && (
                        <span className="accuracy-badge">
                          ±{Math.round(entrega.ultimaUbicacion.accuracy)}m
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Map area */}
        <div className="tracking-map-area">
          {entregaSeleccionada ? (
            <>
              <MapContainer
                key={entregaSeleccionada.id}
                center={mapCenter}
                zoom={selectedPosition ? 16 : 14}
                style={{ height: '100%', width: '100%', borderRadius: '12px' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapUpdater position={selectedPosition || mapCenter} />
                {selectedPosition && (
                  <Marker position={selectedPosition} icon={deliveryIcon}>
                    <Popup>
                      <div style={{ textAlign: 'center' }}>
                        <strong>{entregaSeleccionada?.clienteNombre}</strong>
                        <br />
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          Repartidor: {entregaSeleccionada?.repartidorNombre}
                        </span>
                        <br />
                        <span style={{ fontSize: '11px', color: '#999' }}>
                          Última actualización:{' '}
                          {entregaSeleccionada?.ultimaUbicacion?.timestamp || '---'}
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                )}
                {destinationPosition && (
                  <Marker position={destinationPosition} icon={storeIcon}>
                    <Popup>
                      <div style={{ textAlign: 'center' }}>
                        <strong>{destinationUbicacion.nombre}</strong>
                        <br />
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          Destino de la entrega
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
              {/* Overlay: waiting for GPS signal */}
              {!selectedPosition && (
                <div className="tracking-gps-waiting">
                  <Loader className="spinner" size={24} />
                  <span>Esperando señal GPS del repartidor...</span>
                  <p>El mapa se actualizará automáticamente cuando se reciba la primera ubicación</p>
                </div>
              )}
            </>
          ) : (
            <div className="tracking-map-placeholder">
              <Navigation size={56} />
              <h3>
                {entregas.length > 0
                  ? 'Selecciona una entrega para ver el mapa'
                  : 'Sin entregas activas'}
              </h3>
              <p>
                {entregas.length > 0
                  ? 'Haz click en una entrega del panel izquierdo'
                  : 'El mapa se activará cuando un repartidor inicie una entrega'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Tracking;
