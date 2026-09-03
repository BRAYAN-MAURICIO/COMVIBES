# ComVibes — API REST (Node.js + Express + MySQL)

Backend que conecta el frontend React de ComVibes con la base de datos MySQL real
(`combives_db`). Probado de punta a punta: login, catálogo, carrito, checkout
completo (pedido + pago + factura + envío + notificación en una transacción),
direcciones, wishlist, reseñas, soporte (PQR) y reportes.

## 1. Requisitos

- Node.js 18+
- MySQL 8+ o MariaDB 10.6+

## 2. Instalación

```bash
cd comvibes-backend
npm install
cp .env.example .env
```

Edita `.env` con los datos de tu MySQL local (usuario, password, puerto). **No uses
el usuario `root` sin password en producción** — crea un usuario dedicado:

```sql
CREATE USER 'comvibes_app'@'localhost' IDENTIFIED BY 'tu_password_segura';
GRANT ALL PRIVILEGES ON combives_db.* TO 'comvibes_app'@'localhost';
FLUSH PRIVILEGES;
```

## 3. Cargar la base de datos

**Un solo archivo, todo incluido.** El archivo `sql/Comvibes_db_final.sql` contiene
las 25 tablas ya con todas las columnas correctas, datos de prueba, proveedores,
catálogo completo y métodos de pago — listo para importar directamente.

```bash
mysql -u root --default-character-set=utf8mb4 < sql/Comvibes_db_final.sql
```

> **Nota:** El archivo `sql/01_schema_updates.sql` ya no es necesario — todo está
> consolidado en el SQL final. Se mantiene en la carpeta solo como referencia.

## 4. Hashear las contraseñas de prueba

El SQL original inserta `admin123` y `cliente123` en texto plano. Este paso las
convierte a hash bcrypt (una sola vez):

```bash
npm run seed:hash
```

## 4b. Configurar el correo (Nodemailer) — OBLIGATORIO

El registro y la recuperación de contraseña envían correos reales. Sin esto,
`POST /api/auth/register` y `POST /api/auth/forgot-password` responden 502.

En `.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=tucuenta@gmail.com
SMTP_PASS=abcdefghijklmnop
MAIL_FROM=ComVibes <tucuenta@gmail.com>
APP_URL=http://localhost:5173
```

`SMTP_PASS` **no** es la contraseña de tu cuenta de Google: es una
*Contraseña de aplicación* de 16 caracteres.

1. Cuenta de Google → Seguridad → activar **Verificación en 2 pasos**.
2. https://myaccount.google.com/apppasswords → crear una para "Correo".
3. Pegar los 16 caracteres en `SMTP_PASS`.

Al arrancar el servidor verás `[mailer] SMTP listo (...)` si la conexión
funciona, o el error concreto si no.

> Para trabajar sin internet, `MAIL_TRANSPORT=console` imprime los correos en
> la terminal en vez de enviarlos. Solo para desarrollo — quítalo antes de
> entregar o desplegar.

## 5. Levantar el servidor

```bash
npm run dev      # con auto-reload
# o
npm start
```

Debe verse:
```
✅ Conectado a MySQL (combives_db)
🚀 ComVibes API corriendo en http://localhost:4000
```

Prueba rápida: `curl http://localhost:4000/api/health`

## 6. Usuarios de prueba

| Correo | Password | Rol |
|---|---|---|
| admin@combives.com | admin123 | admin |
| cliente@test.com | cliente123 | cliente |

## 7. Endpoints principales

Todas las respuestas tienen la forma `{ success, data }` o `{ success, message }`.
Las rutas protegidas requieren header `Authorization: Bearer <token>` (lo devuelve
`/api/auth/login`).

| Recurso | Rutas |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/verify-email`, `POST /api/auth/resend-verification`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` |
| Usuarios (admin) | `GET/PUT /api/usuarios`, `PATCH /api/usuarios/:id/rol`, `PATCH /api/usuarios/:id/estado` |
| Categorías | `GET` público, `POST/PUT/DELETE` admin |
| Productos | `GET /api/productos` (filtros: categoria, search, marca, color, minPrecio, maxPrecio), `PATCH /:id/stock`, `POST/DELETE /:id/imagenes` |
| Proveedores | CRUD, solo admin |
| Direcciones | CRUD del usuario autenticado (libreta de direcciones) |
| Carrito | `GET /api/carrito`, `POST/PUT/DELETE /items` |
| Wishlist | `GET/POST /api/wishlist` (POST hace toggle), `DELETE /:idPro` |
| Pedidos | `GET/POST /api/pedidos` (POST = checkout, toma el carrito), `PATCH /:id/estado` (admin) |
| Pagos | `GET /api/pagos/pedido/:idPed` |
| Métodos de pago | CRUD, lectura pública |
| Envíos | `GET/PUT /api/envios/pedido/:idPed` (PUT admin) |
| Facturas | `GET /api/facturas/pedido/:idPed` |
| Notificaciones | `GET /api/notificaciones`, `PATCH /:id/leida`, `PATCH /marcar-todas` |
| Opiniones | `GET /api/opiniones/producto/:idPro` (público), `POST`, `DELETE /:id` |
| Soporte (PQR) | `GET/POST /api/soporte`, `PATCH /:id/responder` (admin, envía correo), `PATCH /:id/estado` (admin) |
| Reportes | `GET /api/reportes/resumen` (admin) |

## 8. Cómo funciona el checkout (`POST /api/pedidos`)

Body: `{ "idDir": 1, "idMet": 1 }`. Toma lo que haya en el carrito del usuario
autenticado y, en una sola transacción:

1. Valida stock disponible de cada línea.
2. Crea el `pedido` + `detallepedido`.
3. Descuenta `inventario`.
4. Crea el `pago` (se asume completado, igual que el `CheckoutFlow` actual).
5. Crea la `factura` (numerada `FAC-00000X`).
6. Crea el `envio` en estado Pendiente.
7. Vacía el carrito.
8. Ya confirmada la transacción, dispara una `notificacion` al cliente.

Si algo falla en el camino, todo se revierte (`ROLLBACK`) y no queda nada a medias.

## 8b. Registro y recuperación de contraseña (flujo real)

**Registro con verificación obligatoria**

1. `POST /api/auth/register` crea la cuenta con `credencial.correo_verificado = FALSE`
   y **no devuelve token**. Genera un código de 6 dígitos, guarda su *hash bcrypt*
   en `email_verifications` y lo envía por correo. Si el correo no sale, se hace
   `ROLLBACK`: no quedan cuentas imposibles de activar.
2. `POST /api/auth/login` con una cuenta sin verificar responde **403** con
   `details.requiereVerificacion = true`; el frontend usa ese flag para llevar al
   usuario a `/verificar-correo`.
3. `POST /api/auth/verify-email { correo, codigo }` marca la cuenta como verificada
   y **devuelve el token**: el usuario entra directo sin volver a escribir la clave.
4. `POST /api/auth/resend-verification { correo }` invalida el código anterior y
   manda uno nuevo. Respuesta genérica siempre (no permite enumerar cuentas).

**Recuperación de contraseña**

- `POST /api/auth/forgot-password` guarda el hash del código en `password_resets`
  y lo envía por correo. La respuesta es idéntica exista o no la cuenta, y **ya no
  incluye el código** (la variable `SHOW_RESET_CODE` fue eliminada).
- `POST /api/auth/reset-password` valida el código con `bcrypt.compare`, actualiza
  `password_changed_at` (lo que invalida los JWT anteriores) y quema el código.

**Defensas comunes a los dos flujos**

| Defensa | Dónde |
|---|---|
| Código generado con `crypto.randomInt`, no `Math.random` | `auth.controller.js` |
| En BD solo el hash bcrypt del código, nunca el código en claro | `email_verifications`, `password_resets` |
| Vigencia de 10 minutos | `expira_en` |
| Máx. 5 intentos por código, luego se quema | columna `intentos` |
| Límite por IP: 5 envíos/hora, 15 verificaciones/15 min | `middleware/rateLimit.js` |
| Respuestas genéricas para no revelar qué correos existen | `forgot-password`, `resend-verification` |

## 8c. Flujo de PQR

Responder **no cierra** la solicitud. El cierre es una acción aparte, para que
el cliente pueda replicar sobre la misma PQR en vez de tener que abrir otra.

| Acción | Endpoint | Estado resultante | Correo al cliente |
|---|---|---|---|
| Cliente crea la PQR | `POST /api/soporte` | `Abierto` | — |
| Asesor responde | `PATCH /:id/responder` | `En Progreso` (por defecto) | Respuesta completa + quién atendió |
| Asesor cierra | `PATCH /:id/estado` con `Cerrado` | `Cerrado` | Aviso de cierre |

`responder` guarda además **quién** atendió (`atendido_por`) y **cuándo**
respondió (`fecha_respuesta`, distinta de `fecha_resolucion`, que solo se llena
al cerrar). El nombre del asesor va firmado en el correo y se muestra tanto en
el panel admin como en "Mis solicitudes" del cliente.

Si el envío del correo falla, la respuesta **igual queda guardada**: el endpoint
responde 200 con `correo_enviado: false` y un `aviso_correo`, y el panel lo
muestra como advertencia. Perder lo que el asesor escribió por un problema de
SMTP sería peor que no avisar al cliente.

Requiere la migración `sql/03_soporte_seguimiento.sql`.

## 9. Conectar el frontend

En el proyecto React (Vite), crea un `.env`:

```
VITE_API_URL=http://localhost:4000/api
```

Y usa `axios` (ya está en las dependencias del frontend) apuntando a esa URL,
mandando el token guardado por `AuthContext` en el header `Authorization`. Cada
Context (`ProductsContext`, `OrdersContext`, `CartContext`, etc.) pasaría de leer
`localStorage`/mocks a hacer estas llamadas — la forma de los datos que devuelve
la API ya está pensada para calzar con lo que esos Contexts esperan hoy.

## 10. Estructura del proyecto

```
comvibes-backend/
├── server.js                 # arranca el server, prueba conexión a MySQL
├── src/
│   ├── app.js                 # middlewares globales + monta las 17 rutas
│   ├── config/db.js           # pool mysql2/promise
│   ├── middleware/
│   │   ├── auth.js            # requireAuth, requireAdmin, requireOwnerOrAdmin
│   │   └── errorHandler.js    # traduce errores MySQL comunes a mensajes en español
│   ├── controllers/           # 1 por recurso (o genericCrud.factory.js para catálogos simples)
│   ├── routes/                # 1 por recurso
│   └── utils/
│       ├── asyncHandler.js
│       ├── jwt.js
│       ├── mailer.js          # Nodemailer: verificación de correo y reset
│       └── response.js        # ok(), created(), fail() — forma de respuesta consistente
├── sql/01_schema_updates.sql  # ejecutar DESPUÉS del SQL original
├── sql/02_email_real.sql      # verificación de correo + códigos hasheados
├── sql/03_soporte_seguimiento.sql # atendido_por + fecha_respuesta en PQR
└── scripts/hashPasswords.js   # npm run seed:hash
```
