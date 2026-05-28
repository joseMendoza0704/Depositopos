import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Eye, EyeOff, Save } from 'lucide-react';
import Loading from '../components/Loading';

const esElectron = typeof window !== 'undefined' && window.electronAPI;

function Login({ alIniciarSesion }) {
  const [email, setEmail] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [error, setError] = useState('');
  const [mostrarContraseña, setMostrarContraseña] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recordarme, setRecordarme] = useState(false);

  useEffect(() => {

    const savedEmail = localStorage.getItem('depositpos_email');
    const savedPassword = localStorage.getItem('depositpos_password');
    const savedRecordarme = localStorage.getItem('depositpos_recordarme');
    
    if (savedEmail && savedPassword && savedRecordarme === 'true') {
      setEmail(savedEmail);
      setContraseña(savedPassword);
      setRecordarme(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (recordarme) {
        localStorage.setItem('depositpos_email', email);
        localStorage.setItem('depositpos_password', contraseña);
        localStorage.setItem('depositpos_recordarme', 'true');
      } else {
        localStorage.removeItem('depositpos_email');
        localStorage.removeItem('depositpos_password');
        localStorage.removeItem('depositpos_recordarme');
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, contraseña);
      const user = userCredential.user;

      const docRef = doc(db, "usuarios", user.uid);
      const docSnap = await getDoc(docRef);

      let rol = 'cajero';
      if (docSnap.exists()) {
        rol = docSnap.data().rol;
      }

      alIniciarSesion({ uid: user.uid, email: user.email, displayName: user.displayName, rol });
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
            {mostrarContraseña ? <EyeOff size={18} /> : <Eye size={18} />}
          </span>
        </div>

        <label className="recordarme-checkbox">
          <input
            type="checkbox"
            checked={recordarme}
            onChange={(e) => setRecordarme(e.target.checked)}
          />
          <Save size={16} />
          <span>Recordar credenciales</span>
        </label>

        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" className="login-button">Ingresar</button>
      </form>

      <a href="#" className="forgot-password">¿Olvidaste tu contraseña?</a>
    </div>
  );
}

export default Login;