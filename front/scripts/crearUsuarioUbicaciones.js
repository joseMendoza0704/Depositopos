/**
 * Script para crear un usuario con acceso SOLO a Ubicaciones
 * 
 * USO: node scripts/crearUsuarioUbicaciones.js
 * 
 * Este script:
 * 1. Crea el usuario en Firebase Auth via REST API
 * 2. Crea el documento en Firestore con rol 'ubicaciones'
 */

const API_KEY = "AIzaSyCzKH2oJ1FIUeFGYz_s-lH1ortjH1B8m8Y";
const PROJECT_ID = "deposito-mendoza-98e71";

// ========= CONFIGURA AQUÍ EL NUEVO USUARIO =========
const NUEVO_USUARIO = {
  email: "ubicaciones@deposito.com",
  password: "Ubicaciones2026",
  nombre: "Usuario Ubicaciones"
};
// ====================================================

async function crearUsuario() {
  console.log("🔄 Creando usuario en Firebase Auth...");
  console.log(`   Email: ${NUEVO_USUARIO.email}`);
  console.log(`   Password: ${NUEVO_USUARIO.password}`);
  console.log("");

  try {
    // 1. Crear usuario en Firebase Auth via REST API
    const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;
    
    const authResponse = await fetch(signUpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: NUEVO_USUARIO.email,
        password: NUEVO_USUARIO.password,
        returnSecureToken: true
      })
    });

    const authData = await authResponse.json();

    if (authData.error) {
      if (authData.error.message === 'EMAIL_EXISTS') {
        console.error("❌ Este email ya está registrado. Usa otro email o elimina el usuario existente.");
      } else {
        console.error("❌ Error al crear usuario:", authData.error.message);
      }
      return;
    }

    const uid = authData.localId;
    const idToken = authData.idToken;
    console.log(`✅ Usuario creado en Auth. UID: ${uid}`);

    // 2. Crear documento en Firestore con rol 'ubicaciones'
    console.log("🔄 Creando documento en Firestore con rol 'ubicaciones'...");

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/usuarios?documentId=${uid}`;

    const firestoreResponse = await fetch(firestoreUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        fields: {
          rol: { stringValue: "ubicaciones" },
          nombre: { stringValue: NUEVO_USUARIO.nombre },
          email: { stringValue: NUEVO_USUARIO.email },
          creadoEn: { timestampValue: new Date().toISOString() }
        }
      })
    });

    const firestoreData = await firestoreResponse.json();

    if (firestoreData.error) {
      console.error("❌ Error al crear documento en Firestore:", firestoreData.error.message);
      console.log("⚠️  El usuario fue creado en Auth pero NO en Firestore.");
      console.log("   Puedes crear el documento manualmente en la consola de Firebase.");
      return;
    }

    console.log(`✅ Documento creado en Firestore (usuarios/${uid})`);
    console.log("");
    console.log("═══════════════════════════════════════════");
    console.log("  ✅ USUARIO CREADO EXITOSAMENTE");
    console.log("═══════════════════════════════════════════");
    console.log(`  📧 Email:    ${NUEVO_USUARIO.email}`);
    console.log(`  🔑 Password: ${NUEVO_USUARIO.password}`);
    console.log(`  🏷️  Rol:      ubicaciones`);
    console.log(`  🆔 UID:      ${uid}`);
    console.log("═══════════════════════════════════════════");
    console.log("");
    console.log("  Este usuario solo podrá ver el módulo");
    console.log("  de UBICACIONES en el sidebar.");
    console.log("═══════════════════════════════════════════");

  } catch (error) {
    console.error("❌ Error de conexión:", error.message);
  }
}

crearUsuario();
