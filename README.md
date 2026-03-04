# Personal Finance Dashboard (SPA)

Dashboard estatico para gestionar finanzas personales con modelo de movimientos (entrada/salida/transferencia), posiciones reconstruidas, graficos y persistencia local/cloud. Listo para GitHub Pages.

## Inicio rapido
Si solo queres levantarlo:

```bash
cd /Users/ramirocruz/Documents
npm install
npm run dev
```

Luego abrí la URL que te muestra Vite (normalmente `http://localhost:5173`).

## Requisitos previos
- Node.js 20+ (recomendado: 20 o 22)
- npm (viene con Node)

Chequeo rapido:

```bash
node -v
npm -v
```

Si alguno falla con `command not found`, instala Node o carga tu `nvm` antes de continuar.

## Levantar en local (paso a paso)
1. Entrar al proyecto:

```bash
cd /Users/ramirocruz/Documents
```

2. Instalar dependencias:

```bash
npm install
```

3. Ejecutar en desarrollo:

```bash
npm run dev
```

4. Abrir en navegador la URL local.

Nota: en local el login Google esta desactivado automaticamente para no molestar durante desarrollo.

## Testear (automatizado)
Ejecuta los tests de logica:

```bash
npm test
```

Incluye:
- conversion ARS -> USD
- parseo de montos con coma/punto
- reducer/store (movimientos + reconstruccion)

## Build de produccion
Generar build:

```bash
npm run build
```

Probar build localmente:

```bash
npm run preview
```

## Checklist manual (validacion MVP)
- Se ve bien en mobile (usar DevTools modo telefono)
- No carga seed demo (arranca vacio si no hay datos)
- Agregar movimiento (entrada/salida) funciona
- Transferencia entre cuentas funciona
- Eliminar movimiento con confirmacion funciona
- La tabla de posiciones se reconstruye automaticamente desde movimientos
- Columna `Cantidad` opcional (BTC, shares, etc.)
- Search por cuenta/subactivo funciona
- Filtros por tipo/moneda/tipo de subactivo/subactivo funcionan con seleccion multiple
- Los filtros globales impactan resumen + graficos + tabla
- Sort por columnas funciona
- Cambiar tasas en Ajustes recalcula USD
- Refresh mantiene datos (persistencia local y sync cloud en deploy)
- Graficos reaccionan a cambios
- Donut por subactivo muestra porcentaje + valor USD financiero
- Existe toggle de tema oscuro/claro
- Objetivos de asignación por Tipo/Subactivo con alertas de desvío
- Configuración de objetivos en modal separado y alertas resumidas en Home
- Snapshot manual diario de patrimonio (USD oficial/financiero)
- Gráfico histórico y variaciones diaria/semanal/mensual

## Login restringido y sync cloud (solo deploy)
En deploy (GitHub Pages), la app usa Firebase Auth (Google) y permite solo `VITE_ALLOWED_EMAIL`.

En local (`localhost`, `127.0.0.1`, `::1`, `npm run dev`) el login se saltea automaticamente y usa solo persistencia local.

### Variables de entorno
Copiar ejemplo:

```bash
cp .env.example .env.local
```

Contenido esperado:

```bash
VITE_ALLOWED_EMAIL=tu-email@gmail.com
VITE_FIREBASE_API_KEY=tu-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-project-id
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=tu-messaging-sender-id
VITE_FIREBASE_APP_ID=tu-app-id
# Opcional en local
# VITE_BASE_PATH=/NOMBRE_REPO/
```

### Configuracion Firebase (obligatoria para deploy)
1. Firebase Console -> `Project settings` -> `General` -> registrar app Web.
2. Firebase Console -> `Authentication` -> `Sign-in method` -> habilitar Google.
3. Firebase Console -> `Authentication` -> `Settings` -> `Authorized domains`:
   - `localhost`
   - `<usuario>.github.io`
4. Firebase Console -> `Firestore Database` -> crear DB (recomendado: `southamerica-east1`) en modo Production.
5. Reglas de Firestore para restringir lectura/escritura al usuario autenticado:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/dashboard/{docId} {
      allow read, write: if request.auth != null
        && request.auth.uid == userId
        && request.auth.token.email_verified == true
        && request.auth.token.email == "TU_EMAIL@gmail.com";
    }
  }
}
```

## Deploy en GitHub Pages
El workflow esta en `.github/workflows/deploy.yml` y deploya al hacer push a `main`.

### Setup del repo
1. GitHub -> `Settings` -> `Pages` -> `Source: GitHub Actions`.
2. GitHub -> `Settings` -> `Secrets and variables` -> `Actions`:
   - Variable: `VITE_ALLOWED_EMAIL`
   - Secrets:
     - `VITE_FIREBASE_API_KEY`
     - `VITE_FIREBASE_AUTH_DOMAIN`
     - `VITE_FIREBASE_PROJECT_ID`
     - `VITE_FIREBASE_STORAGE_BUCKET`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`
     - `VITE_FIREBASE_APP_ID`
     - `VITE_FIREBASE_MEASUREMENT_ID` (opcional)
3. Push a `main`.
4. Esperar workflow y abrir URL publicada.

## Base path de Vite
`vite.config.ts` calcula `base` automaticamente:
- En GitHub Actions: `/${repo}/`
- En local: `/`

Tambien puede forzarse:

```bash
VITE_BASE_PATH=/NOMBRE_REPO/ npm run build
```

## Stack
- React + TypeScript + Vite
- Recharts
- Vitest + Testing Library
- Firebase Auth (Google) + Firestore (deploy)
- localStorage con versionado de esquema + fallback local

## Estructura principal
- `src/components`: componentes UI
- `src/hooks/useHoldingsStore.ts`: store + autosave debounce
- `src/store/holdingsReducer.ts`: acciones de estado + movimientos
- `src/utils/conversion.ts`: conversion y agregaciones para charts
- `src/utils/number.ts`: parseo/formato de numeros
- `src/utils/transactions.ts`: reconstruccion de posiciones desde movimientos
- `src/utils/storage.ts`: persistencia local versionada
- `src/utils/firebaseStorage.ts`: persistencia remota en Firestore
- `src/utils/snapshots.ts`: logica de cierre manual y variaciones historicas
- `src/lib/firebase.ts`: inicializacion Firebase
- `src/data/demo.ts`: defaults de configuracion

## Extensibilidad
La capa de persistencia esta desacoplada para agregar import/export CSV/JSON sin reescribir reducer ni UI.
