# Personal Finance Dashboard (SPA)

Dashboard estatico para gestionar holdings personales con edicion inline, graficos y persistencia local. Listo para GitHub Pages.

## Inicio rapido (modo dummy)
Si solo queres levantarlo y probar:

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
- reducer/store (add/edit/delete)

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
- Carga seed demo al primer inicio
- Inline edit funciona (Enter guarda, Esc cancela)
- Agregar fila funciona
- Eliminar fila con confirmacion funciona
- Search por cuenta/subactivo funciona
- Filtros por tipo/moneda/tipo de subactivo/subactivo funcionan
- Sort por columnas funciona
- Cambiar tasas en Ajustes recalcula USD
- Refresh mantiene datos (persistencia local)
- Graficos reaccionan a cambios
- Donut por subactivo muestra porcentaje + valor USD financiero

## Login restringido (solo deploy)
En deploy (GitHub Pages), la app exige login de Google y permite solo `VITE_ALLOWED_EMAIL`.

En local (`localhost`, `127.0.0.1`, `::1`, `npm run dev`) el login se saltea automaticamente.

### Variables de entorno
Copiar ejemplo:

```bash
cp .env.example .env.local
```

Contenido esperado:

```bash
VITE_GOOGLE_CLIENT_ID=tu-google-oauth-client-id.apps.googleusercontent.com
VITE_ALLOWED_EMAIL=tu-email@gmail.com
# Opcional en local
# VITE_BASE_PATH=/NOMBRE_REPO/
```

### Configuracion Google Cloud (OAuth)
1. Crear OAuth Client ID (tipo Web application).
2. En `Authorized JavaScript origins` agregar:
   - `http://localhost:5173`
   - `https://<usuario>.github.io`
3. Guardar Client ID y usarlo como `VITE_GOOGLE_CLIENT_ID`.

Importante: al no haber backend, esta restriccion protege UX/frontend, no recursos de servidor.

## Deploy en GitHub Pages
El workflow esta en `.github/workflows/deploy.yml` y deploya al hacer push a `main`.

### Setup del repo
1. GitHub -> `Settings` -> `Pages` -> `Source: GitHub Actions`.
2. GitHub -> `Settings` -> `Secrets and variables` -> `Actions`:
   - Secret: `VITE_GOOGLE_CLIENT_ID`
   - Variable: `VITE_ALLOWED_EMAIL`
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
- localStorage con versionado de esquema
- Google Identity Services (solo requerido en deploy)

## Estructura principal
- `src/components`: componentes UI
- `src/hooks/useHoldingsStore.ts`: store + autosave debounce
- `src/store/holdingsReducer.ts`: acciones CRUD
- `src/utils/conversion.ts`: conversion y agregaciones para charts
- `src/utils/number.ts`: parseo/formato de numeros
- `src/utils/storage.ts`: persistencia versionada
- `src/data/demo.ts`: seed demo

## Extensibilidad
La capa de persistencia esta desacoplada para agregar import/export CSV/JSON sin reescribir reducer ni UI.
