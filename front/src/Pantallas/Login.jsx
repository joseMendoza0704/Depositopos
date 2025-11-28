import React, { useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Loading from '../components/Loading';

function Login({ alIniciarSesion }) {
  const [email, setEmail] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [error, setError] = useState('');
  const [mostrarContraseña, setMostrarContraseña] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, contraseña);
      // El componente se desmontará al iniciar sesión, así que no es estrictamente necesario setLoading(false)
      // pero por seguridad lo dejamos si la transición no es inmediata.
      const user = userCredential.user;

      // Obtener rol desde Firestore
      const docRef = doc(db, "usuarios", user.uid);
      const docSnap = await getDoc(docRef);

      let rol = 'cajero'; // Rol por defecto
      if (docSnap.exists()) {
        rol = docSnap.data().rol;
      }

      // Pasar usuario con rol
      alIniciarSesion({ ...user, rol });
    } catch (err) {
      console.error("Error al iniciar sesión:", err.message);
      setError("Error al iniciar sesión. Verifica tu email y contraseña.");
      setLoading(false);
    }
  };

  const toggleMostrarContraseña = () => {
    setMostrarContraseña(!mostrarContraseña);
  };

  return (
    <div className="login-container">
      {loading && <Loading />}
      <img src="/logo2.png" alt="Logo Depósito Mendoza" className="login-logo" />

      <form onSubmit={handleLogin} className="login-form">
        <input
          type="email"
          placeholder="Email"
          className="login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="password-container">
          <input
            type={mostrarContraseña ? "text" : "password"}
            placeholder="Contraseña"
            className="login-input"
            value={contraseña}
            onChange={(e) => setContraseña(e.target.value)}
            required
          />
          <span onClick={toggleMostrarContraseña} className="password-toggle-icon">
            👁️
          </span>
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" className="login-button">Ingresar</button>
      </form>

      <a href="#" className="forgot-password">¿Olvidaste tu contraseña?</a>
    </div>
  );
}

export default Login;