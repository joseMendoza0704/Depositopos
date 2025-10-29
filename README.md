
# 🏪 Sistema POS para Depósito de Refrescos

Sistema de Punto de Venta (POS) desarrollado con React (Vite) y Firebase para la gestión de un depósito de refrescos. Incluye:
- Ventas al por mayor y menor
- Control de inventario 
- Gestión de caja

## 🚀 Instalación y Configuración

### Prerequisitos
- Node.js 
- npm
- Git

### Pasos de Instalación

1. **Clonar el Repositorio**
```bash
git clone [URL-DEL-REPOSITORIO]
cd DepositoPos/front
```

2. **Instalar Dependencias**
```bash
npm install
```

3. **Configurar Variables de Entorno**
- Crear archivo `.env.local` en la carpeta `front`
- Solicitar credenciales Firebase al administrador
- Añadir las siguientes variables:
```
VITE_API_KEY=
VITE_AUTH_DOMAIN=
VITE_PROJECT_ID=
VITE_STORAGE_BUCKET=
VITE_MESSAGING_SENDER_ID=
VITE_APP_ID=
VITE_MEASUREMENT_ID=
```

4. **Ejecutar la Aplicación**
```bash
npm run dev
```
Acceder a: http://localhost:5173

## 📜 Scripts Disponibles

- `npm run dev`: Inicia servidor de desarrollo
- `npm run build`: Genera build de producción
- `npm run preview`: Previsualiza build local

## ☁️ Despliegue

1. **Preparación**
```bash
npm install -g firebase-tools
firebase login
```

2. **Build y Deploy**
```bash
cd front
npm run build
cd ..
firebase deploy --only hosting
```

## 🤝 Flujo de Trabajo Git

### Ramas
- `main`: Código producción (protegida)
- `develop`: Rama principal desarrollo

### Proceso de Desarrollo
1. Actualizar develop:
```bash
git checkout develop
git pull origin develop
```

2. Crear rama feature/fix:
```bash
git checkout -b feature/nombre-funcionalidad
# o
git checkout -b fix/descripcion-arreglo
```

3. Desarrollar y subir cambios:
```bash
git push -u origin nombre-rama
```

4. Crear Pull Request hacia `develop`
5. Esperar revisión y aprobación
6. Para producción: PR de `develop` a `main`