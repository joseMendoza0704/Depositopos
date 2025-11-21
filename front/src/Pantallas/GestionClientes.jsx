import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebaseConfig.js';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import '../styles/GestionClientes.css'; 

function GestionClientes() {
  // Estados formulario
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  
  // Carga y lista
  const [cargando, setCargando] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);

  // Edición
  const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState(null);

  // Filtrado búsqueda y Criterio
  const [busqueda, setBusqueda] = useState('');
  const [criterioBusqueda, setCriterioBusqueda] = useState('nombre'); // 'nombre', 'telefono', 'direccion'

  // Leer clientes y ordenarlos por nombre
  useEffect(() => {
    const q = query(collection(db, 'clientes'), orderBy('nombre'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setClientes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCargandoClientes(false);
    }, (error) => {
      console.error("Error al cargar clientes: ", error);
      setCargandoClientes(false);
    });

    return () => unsubscribe();
  }, []);

  // Limpiar formulario
  const limpiarFormulario = useCallback(() => {
    setNombre('');
    setTelefono('');
    setEmail('');
    setDireccion('');
    setClienteIdSeleccionado(null);
  }, []);

  // Formatea teléfono para mostrar
  const formatearTelefono = (tel) => {
    const digits = (tel ?? '').replace(/\D/g, '').slice(0,8);
    return digits.length > 4 ? `${digits.slice(0,4)}-${digits.slice(4)}` : digits;
  };

  // Seleccionar cliente para editar
  const handleSelectCliente = useCallback((cliente) => {
    setClienteIdSeleccionado(cliente.id);
    setNombre(cliente.nombre ?? '');
    setTelefono(formatearTelefono(cliente.telefono));
    setEmail(cliente.email ?? '');
    setDireccion(cliente.direccion ?? '');
  }, []);

  // Manejar input teléfono
  const handlePhoneChange = useCallback((e) => {
    let digits = e.target.value.replace(/\D/g, '').slice(0,8);
    setTelefono(digits.length > 4 ? `${digits.slice(0,4)}-${digits.slice(4)}` : digits);
  }, []);

  // Validar formulario
  const validarFormulario = () => {
    if (!nombre.trim()) {
      alert('El nombre es obligatorio');
      return false;
    }
    if (!telefono.replace(/\D/g, '').length) {
      alert('El teléfono debe contener números');
      return false;
    }
    return true;
  };

  // Guardar cliente
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cargando) return;
    if (!validarFormulario()) return;

    setCargando(true);

    const telefonoSinFormato = telefono.replace(/\D/g, '');

    const datosCliente = {
      nombre: nombre.trim(),
      telefono: telefonoSinFormato,
      email: email.trim(),
      direccion: direccion.trim(),
      activo: true
    };

    try {
      if (clienteIdSeleccionado) {
        const clienteRef = doc(db, 'clientes', clienteIdSeleccionado);
        await updateDoc(clienteRef, datosCliente);
        alert('✅ Cliente actualizado con éxito!');
      } else {
        await addDoc(collection(db, 'clientes'), datosCliente);
        alert('✅ Cliente agregado con éxito!');
      }
      limpiarFormulario();
    } catch (err) {
      console.error('Error al guardar cliente:', err);
      alert('❌ Error al guardar cliente');
    } finally {
      setCargando(false);
    }
  };

  // Eliminar cliente (lógico)
  const handleDelete = async () => {
    if (!clienteIdSeleccionado) return;
    if (!window.confirm(`¿Seguro que quieres eliminar a "${nombre}"?`)) return;

    setCargando(true);
    try {
      const clienteRef = doc(db, 'clientes', clienteIdSeleccionado);
      await updateDoc(clienteRef, { activo: false });
      alert('✅ Cliente eliminado con éxito!');
      limpiarFormulario();
    } catch (err) {
      console.error('Error al eliminar cliente:', err);
      alert('❌ Error al eliminar cliente');
    } finally {
      setCargando(false);
    }
  };

  // Lógica de filtrado actualizada con switch
  const clientesFiltrados = useMemo(() => {
    const textoBusqueda = busqueda.trim().toLowerCase();

    if (!textoBusqueda) {
      return clientes.filter(cliente => cliente.activo !== false);
    }

    return clientes.filter(cliente => {
      if (cliente.activo === false) return false;

      // Lógica según el radio button seleccionado
      switch (criterioBusqueda) {
        case 'nombre':
          return (cliente.nombre?.toLowerCase() || '').includes(textoBusqueda);
        
        case 'direccion':
          return (cliente.direccion?.toLowerCase() || '').includes(textoBusqueda);
        
        case 'telefono':
          // Para teléfono, limpiamos caracteres no numéricos tanto en la búsqueda como en el dato
          const busquedaNumeros = textoBusqueda.replace(/\D/g, '');
          const clienteTelefono = (cliente.telefono || '').replace(/\D/g, '');
          return clienteTelefono.includes(busquedaNumeros);
        
        default:
          return false;
      }
    });
  }, [clientes, busqueda, criterioBusqueda]);

  return (
    <div className="gestion-clientes-container">
      <h2>Gestión de Clientes</h2>

      <form onSubmit={handleSubmit} className="producto-form">
        <h3>{clienteIdSeleccionado ? '✏️ Editar Cliente' : '➕ Añadir Nuevo Cliente'}</h3>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="nombre">Nombre Completo*</label>
            <input 
              id="nombre" 
              type="text" 
              placeholder="Nombre completo" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group phone-container">
            <label htmlFor="telefono">Teléfono*</label>
            <input 
              id="telefono" 
              type="tel" 
              placeholder="0000-0000" 
              value={telefono} 
              onChange={handlePhoneChange} 
              maxLength={9} 
              required
              className="phone-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email (Opcional)</label>
            <input 
              id="email"
              type="email"
              placeholder="correo@dominio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="direccion">Dirección</label>
            <input 
              id="direccion"
              type="text"
              placeholder="Dirección completa"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
            />
          </div>
        </div>

        <div className="form-botones">
          <button type="submit" disabled={cargando} className="btn-submit">
            {cargando ? '⏳ Guardando...' : clienteIdSeleccionado ? '💾 Actualizar Cliente' : '➕ Añadir Cliente'}
          </button>

          {clienteIdSeleccionado && (
            <>
              <button type="button" onClick={handleDelete} disabled={cargando} className="btn-eliminar">
                🗑️ Eliminar
              </button>
              <button type="button" onClick={limpiarFormulario} disabled={cargando} className="btn-cancelar">
                ❌ Cancelar
              </button>
            </>
          )}
        </div>
      </form>

      <div className="filtro-busqueda-container">
        <h3>Buscar Clientes</h3>
        
        {/* SECCIÓN DE RADIO BUTTONS NUEVA */}
        <div className="criterios-busqueda">
            <label className={`radio-label ${criterioBusqueda === 'nombre' ? 'active' : ''}`}>
                <input 
                    type="radio" 
                    value="nombre" 
                    checked={criterioBusqueda === 'nombre'} 
                    onChange={() => setCriterioBusqueda('nombre')} 
                />
                Nombre
            </label>
            <label className={`radio-label ${criterioBusqueda === 'telefono' ? 'active' : ''}`}>
                <input 
                    type="radio" 
                    value="telefono" 
                    checked={criterioBusqueda === 'telefono'} 
                    onChange={() => setCriterioBusqueda('telefono')} 
                />
                Teléfono
            </label>
            <label className={`radio-label ${criterioBusqueda === 'direccion' ? 'active' : ''}`}>
                <input 
                    type="radio" 
                    value="direccion" 
                    checked={criterioBusqueda === 'direccion'} 
                    onChange={() => setCriterioBusqueda('direccion')} 
                />
                Dirección
            </label>
        </div>

        <input
          type="text"
          placeholder={`🔍 Buscar por ${criterioBusqueda}...`}
          className="input-filtro"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="lista-productos">
        <h3>Resultados ({clientesFiltrados.length})</h3>

        {cargandoClientes ? (
          <p className="loading-text">Cargando clientes...</p>
        ) : clientesFiltrados.length === 0 ? (
          <p className="empty-text">No se encontraron clientes con ese criterio.</p>
        ) : (
          <div className="tabla-responsive">
            <table className="productos-tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Dirección</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map(cliente => (
                  <tr 
                    key={cliente.id} 
                    onClick={() => handleSelectCliente(cliente)} 
                    className={clienteIdSeleccionado === cliente.id ? 'fila-seleccionada' : ''}
                    tabIndex={0}
                  >
                    <td>{cliente.nombre}</td>
                    <td>{cliente.telefono}</td>
                    <td>{cliente.direccion}</td>
                    <td>{cliente.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default GestionClientes;