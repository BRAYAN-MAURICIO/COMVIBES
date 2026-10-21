# ComVibes — Frontend (React + Vite)

Tienda y panel de administración de ComVibes. La puesta en marcha completa
(backend, base de datos, variables de entorno) está en el README de la raíz.

## Comandos

```bash
npm run dev             # servidor de desarrollo en http://localhost:5173
npm run build           # compila a dist/
npm run lint            # ESLint (debe quedar en 0 problemas)
npm test                # pruebas con Vitest
npm run test:watch      # pruebas en modo observación mientras editas
npm run test:cobertura  # pruebas con reporte de cobertura en coverage/
```

## Pruebas

Las pruebas viven junto al código que prueban (`*.test.js` / `*.test.jsx`) y
usan Vitest con Testing Library y happy-dom. Corren con la zona horaria de
Colombia (`vite.config.js`) para que el error de fechas corridas un día no
pueda volver sin que una prueba falle.

## Cómo se cargan los datos

Los contexts y páginas que piden datos al API usan `src/hooks/useCarga.js`:
descarta respuestas viejas cuando cambian los filtros o la cuenta, y deja de
mostrar los datos de un usuario en cuanto entra otro. Las páginas se cargan
bajo demanda (`React.lazy` en `src/routes/AppRoutes.jsx`), así un cliente no
descarga el panel de administración.
