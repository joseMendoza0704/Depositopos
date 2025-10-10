import React, { useState } from 'react';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';

function Login({ alIniciarSesion }) {
  const [email, setEmail] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [error, setError] = useState('');
  const [mostrarContraseña, setMostrarContraseña] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, contraseña);
      alIniciarSesion(userCredential.user);
    } catch (err) {
      console.error("Error al iniciar sesión:", err.message);
      setError("Error al iniciar sesión. Verifica tu email y contraseña.");
    }
  };

  const toggleMostrarContraseña = () => {
    setMostrarContraseña(!mostrarContraseña);
  };

  return (
    <div className="login-container">
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