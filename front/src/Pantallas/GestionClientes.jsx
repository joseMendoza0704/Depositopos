import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.js'; // Asegúrate que la ruta sea correcta
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  query,
  orderBy
} from 'firebase/firestore'; 

function GestionClientes() {
  // --- Estados del Formulario ---
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState(''); // Para el teléfono formateado (ej: 9988-7766)
  const [email, setEmail] = useState(''); 
  const [direccion, setDireccion] = useState(''); // Vuelve el campo de dirección
  
  // --- Estados de Carga y Lista ---
  const [cargando, setCargando] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);

  // --- Estado de Edición ---
  const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState(null);

  // --- LEER Clientes (READ) ---
  useEffect(() => {
    const q = query(collection(db, 'clientes'), orderBy('nombre'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaDeClientes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setClientes(listaDeClientes);
      setCargandoClientes(false);
    }, (error) => {
      console.error("Error al cargar clientes: ", error);
      setCargandoClientes(false);
    });

    return () => unsubscribe();
  }, []);

  // --- Función para Limpiar Formulario ---
  const limpiarFormulario = () => {
    setNombre('');
    setTelefono('');
    setEmail('');
    setDireccion(''); // Limpia la dirección
    setClienteIdSeleccionado(null);
  };

  // --- Función para Seleccionar Cliente de la Tabla ---
  const handleSelectCliente = (cliente) => {
    setClienteIdSeleccionado(cliente.id);
    setNombre(cliente.nombre ?? '');
    
    // Formatea el teléfono guardado (ej: 99887766) a la vista (ej: 9988-7766)
    const digits = (cliente.telefono ?? '').replace(/\D/g, '').slice(0, 8);
    let formatted = '';
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    } else {
      formatted = digits;
    }
    setTelefono(formatted);
    
    setEmail(cliente.email ?? '');
    setDireccion(cliente.direccion ?? ''); // Carga la dirección
  };

  // --- Manejador para el formato de teléfono ---
  const handlePhoneChange = (e) => {
    let value = e.target.value;
    // 1. Quitar cualquier caracter que no sea un dígito
    let digits = value.replace(/\D/g, '');
    // 2. Limitar a 8 dígitos
    digits = digits.slice(0, 8);
    // 3. Aplicar el formato XXXX-XXXX
    let formatted = '';
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    } else {
      formatted = digits;
    }
    setTelefono(formatted);
  };
  
  // --- CREAR y ACTUALIZAR (CREATE / UPDATE) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cargando) return;
    setCargando(true);

    // Guarda el teléfono sin formato en la BD (solo números)
    const telefonoSinFormato = telefono.replace(/\D/g, '');

    const datosCliente = {
      nombre: nombre,
      telefono: telefonoSinFormato, // Guarda el número limpio
      email: email,
      direccion: direccion, // Guarda el texto de la dirección
      activo: true
    };

    try {
      if (clienteIdSeleccionado) {
        // --- MODO ACTUALIZAR ---
        const clienteDoc = doc(db, 'clientes', clienteIdSeleccionado);
        await updateDoc(clienteDoc, datosCliente);
        alert("¡Cliente actualizado con éxito!");
      } else {
        // --- MODO CREAR ---
        await addDoc(collection(db, 'clientes'), datosCliente);
        alert("¡Cliente agregado con éxito!");
      }
      limpiarFormulario();
    } catch (error) {
      console.error("Error al guardar el cliente: ", error);
      alert("Error al guardar el cliente.");
    } finally {
      setCargando(false);
    }
  };

  // --- ELIMINAR (DELETE - Lógico) ---
  const handleDelete = async () => {
    if (!clienteIdSeleccionado) return;
    if (!window.confirm(`¿Estás seguro de que quieres eliminar a "${nombre}"?`)) return;

    setCargando(true);
    try {
      const clienteDoc = doc(db, 'clientes', clienteIdSeleccionado);
      await updateDoc(clienteDoc, { activo: false });
      alert("¡Cliente eliminado con éxito!");
      limpiarFormulario();
    } catch (error) {
      console.error("Error al eliminar el cliente: ", error);
      alert("Error al eliminar el cliente.");
    } finally {
      setCargando(false);
    }
  };

  const clientesActivos = clientes.filter(cliente => cliente.activo !== false);

  return (
    <div>
      <h2>Gestión de Clientes</h2>
      
      <form onSubmit={handleSubmit} className="producto-form">
        <h3>{clienteIdSeleccionado ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}</h3>
        
        <div className="form-grid">
          <input 
            type="text" 
            placeholder="Nombre Completo" 
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required 
          />
          
          {/* --- Input de Teléfono con Prefijo Fijo --- */}
          <div className="phone-container">
            
            <input 
              type="tel" 
              placeholder="+504 0000-0000" 
              value={telefono}
              onChange={handlePhoneChange}
              className="phone-input"
              maxLength="9" 
            />
          </div>
          
          <input 
            type="email" 
            placeholder="Email (Opcional)" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          
          {/* --- Input de Dirección (Texto simple) --- */}
          <input 
            type="text" 
            placeholder="Dirección (Dirección completa)" 
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
          />

        </div>

        <div className="form-botones">
          <button type="submit" disabled={cargando}>
            {cargando ? 'Guardando...' : (clienteIdSeleccionado ? 'Actualizar Cliente' : 'Añadir Cliente')}
          </button>
          {clienteIdSeleccionado && (
            <>
              <button type="button" onClick={handleDelete} disabled={cargando} className="boton-eliminar">
                Eliminar
              </button>
              <button type="button" onClick={limpiarFormulario} disabled={cargando} className="boton-limpiar">
                Cancelar
              </button>
            </>
          )}
        </div>
      </form>

      {/* --- Tabla de Clientes (ACTUALIZADA) --- */}
      <div className="lista-productos">
        <h3>Clientes Registrados</h3>
        {cargandoClientes ? (
          <p>Cargando clientes...</p>
        ) : (
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
              {clientesActivos.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center' }}>No hay clientes registrados.</td></tr>
              )}
              {clientesActivos.map(cliente => (
                <tr key={cliente.id} onClick={() => handleSelectCliente(cliente)}>
                  <td>{cliente.nombre}</td>
                  <td>{cliente.telefono}</td>
                  <td>{cliente.direccion}</td> {/* Muestra la dirección como texto */}
                  <td>{cliente.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default GestionClientes;