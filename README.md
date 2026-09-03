# ComVibes

Tienda en línea de bolsos y accesorios. Proyecto completo: catálogo con
búsqueda y filtros, carrito, checkout con factura y envío, panel de
administración, soporte (PQR) y módulo de reportes.

El repositorio contiene dos aplicaciones que corren por separado:

| Carpeta | Qué es | Puerto |
|---|---|---|
| `comvibes/` | Frontend — React + Vite + Bootstrap 5 | 5173 |
| `comvibes-backend/` | API REST — Node.js + Express + MySQL | 4000 |

## Stack

**Frontend:** React 19, Vite, React Router 7, Bootstrap 5, Axios, Recharts,
SweetAlert2, Lucide.

**Backend:** Express 4, MySQL2, JWT, bcryptjs, Multer, Sharp, Nodemailer,
express-rate-limit.

**Base de datos:** MySQL 8 o MariaDB 10.6+ (`combives_db`, 25 tablas).

## Puesta en marcha

Necesitas Node.js 18+ y un servidor MySQL o MariaDB corriendo.

### 1. Base de datos

```bash
cd comvibes-backend
mysql -u root -p --default-character-set=utf8mb4 < sql/Comvibes_db_final.sql
mysql -u root -p combives_db < sql/02_email_real.sql
mysql -u root -p combives_db < sql/03_soporte_seguimiento.sql
```

Las migraciones `02` y `03` son idempotentes: se pueden correr varias veces
sin romper nada.

### 2. Backend

```bash
cd comvibes-backend
npm install
cp .env.example .env      # y completa los valores (ver más abajo)
npm run seed:hash         # hashea las contraseñas de prueba del SQL
npm run dev
```

Al arrancar deberías ver:

```
✅ Conectado a MySQL (combives_db)
🚀 ComVibes API corriendo en http://localhost:4000
[mailer] SMTP listo (smtp.gmail.com como ...)
```

### 3. Frontend

```bash
cd comvibes
npm install
cp .env.example .env
npm run dev
```

Abre http://localhost:5173

## Configuración

Cada aplicación tiene su `.env.example` con todas las variables comentadas.
**Los `.env` reales no se versionan** — están en `.gitignore` porque
contienen la contraseña de la base de datos y la del servicio de correo.

El registro y la recuperación de contraseña envían correos reales con
Nodemailer, así que el backend no funciona del todo sin `SMTP_USER` y
`SMTP_PASS`. Con Gmail se necesita una *contraseña de aplicación*, no la
contraseña de la cuenta. Para trabajar sin internet, `MAIL_TRANSPORT=console`
imprime los correos en la terminal.

## Usuarios de prueba

| Correo | Contraseña | Rol |
|---|---|---|
| admin@combives.com | admin123 | admin |
| cliente@test.com | cliente123 | cliente |

Vienen en texto plano en el SQL; `npm run seed:hash` los convierte a bcrypt.
Las dos cuentas quedan con el correo ya verificado, así que entran directo.

## Estructura

```
comvibes/                     # Frontend
├── src/
│   ├── api/                  # capa de servicios (axios)
│   ├── components/           # layout, products, ui, modals
│   ├── context/              # 14 Contexts (Auth, Products, Orders, ...)
│   ├── pages/                # cliente + admin
│   ├── routes/               # AppRoutes y ProtectedRoute
│   └── assets/css/           # variables.css y global.css
└── vite.config.js

comvibes-backend/             # API
├── src/
│   ├── config/db.js          # pool mysql2/promise
│   ├── controllers/          # uno por recurso
│   ├── middleware/           # auth, rate limit, uploads, errores
│   ├── routes/               # uno por recurso
│   └── utils/                # jwt, mailer, imagen, respuestas
├── sql/                      # esquema y migraciones
├── scripts/                  # seed:hash, fix:imagenes
└── uploads/productos/        # imágenes subidas desde el panel admin
```

La documentación detallada del API (endpoints, flujo de checkout, PQR,
recuperación de contraseña) está en `comvibes-backend/README.md`.
