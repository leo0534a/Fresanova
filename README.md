# 🍓 Fresanova — Sistema de Pedidos por WhatsApp con IA

Sistema profesional de pedidos por WhatsApp para **Fresanova**, negocio de fresas con crema, bebidas y fresas con chocolate ubicado en Cartagena, Colombia.

## Características Principales

### Bot de WhatsApp con IA
- Chatbot conversacional con personalidad coqueta y amigable
- IA powered by DeepSeek para respuestas naturales
- Menús interactivos y flujo guiado de pedidos
- Selección de productos, toppings y salsas
- Cálculo dinámico de precios
- Factura automática tipo WhatsApp
- Tracking de pedidos en tiempo real
- Notificaciones automáticas de estado
- Memoria temporal de conversación

### Panel Administrativo
- Dashboard con estadísticas en tiempo real
- Gestión completa de pedidos (CRUD + estados)
- Gestión de productos, categorías, toppings y salsas
- Gestión de clientes
- Gráficas de ventas (Recharts)
- Dark/Light mode
- Diseño responsive premium
- Tema rosado elegante

### Seguridad
- JWT Authentication
- bcrypt para contraseñas
- Helmet (headers de seguridad)
- Rate Limiting
- Validaciones de entrada
- CORS configurado
- Manejo global de errores

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js, Express.js |
| Base de datos | MongoDB Atlas, Mongoose |
| IA | DeepSeek API |
| WhatsApp | Twilio WhatsApp Sandbox/API |
| Frontend | React 18, Vite, TailwindCSS |
| Gráficas | Recharts |
| Auth | JWT, bcrypt |
| Deploy | Render |

---

## Instalación Local

### Requisitos Previos
- Node.js >= 18
- npm o yarn
- Cuenta MongoDB Atlas
- Cuenta Twilio (WhatsApp Sandbox)
- API Key de DeepSeek

### 1. Clonar el repositorio
```bash
git clone <repo-url>
cd Fresanova
```

### 2. Configurar Backend
```bash
cd backend
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

### 3. Cargar datos iniciales
```bash
# Seed del catálogo (productos, toppings, salsas)
npm run seed

# Crear admin inicial
npm run seed:admin
```

### 4. Iniciar Backend
```bash
npm run dev
```
El servidor estará en `http://localhost:5000`

### 5. Configurar Frontend
```bash
cd ../frontend
npm install
npm run dev
```
El panel admin estará en `http://localhost:5173`

### 6. Configurar Twilio Webhook
En tu consola de Twilio, configura el webhook de WhatsApp:
```
POST https://tu-dominio.com/webhook
```

---

## Credenciales por Defecto

| Campo | Valor |
|-------|-------|
| Email Admin | admin@Fresanova.com |
| Contraseña | Admin123* |

---

## API Endpoints

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login admin |
| GET | `/api/auth/me` | Perfil actual |
| PUT | `/api/auth/update-password` | Cambiar contraseña |

### Pedidos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/orders` | Listar pedidos |
| GET | `/api/orders/:id` | Detalle pedido |
| PATCH | `/api/orders/:id/status` | Cambiar estado |
| DELETE | `/api/orders/:id` | Eliminar pedido |

### Productos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/products` | Listar productos |
| POST | `/api/products` | Crear producto |
| PUT | `/api/products/:id` | Actualizar producto |
| DELETE | `/api/products/:id` | Eliminar producto |

### Categorías, Toppings, Salsas
Misma estructura CRUD bajo `/api/products/categories`, `/api/products/toppings`, `/api/products/sauces`

### Dashboard
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/dashboard/stats` | Estadísticas generales |
| GET | `/api/dashboard/sales-chart` | Gráfica de ventas |
| GET | `/api/dashboard/orders-by-status` | Pedidos por estado |

### Clientes
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/customers` | Listar clientes |
| GET | `/api/customers/:id` | Detalle cliente |

### Webhook WhatsApp
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/webhook` | Recibir mensajes |
| GET | `/webhook` | Verificación |
| GET | `/health` | Health check |

---

## Deploy en Render

### Backend
1. Crear un **Web Service** en Render
2. Conectar repositorio Git
3. Configurar:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Agregar todas las variables de entorno del `.env`
5. Actualizar `RENDER_EXTERNAL_URL` y `BACKEND_URL`

### Frontend
1. Crear un **Static Site** en Render
2. Configurar:
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
3. Agregar variable de entorno:
   - `VITE_API_URL=https://tu-backend.onrender.com/api`

### Post-Deploy
1. Ejecutar seed desde la consola de Render o localmente apuntando al MongoDB de producción
2. Configurar webhook de Twilio con la URL del backend en Render

---

## Estructura del Proyecto

```
Fresanova/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuración de entorno y BD
│   │   ├── controllers/     # Controladores de rutas
│   │   ├── helpers/         # Funciones auxiliares
│   │   ├── jobs/            # Seeds y tareas
│   │   ├── middlewares/     # Auth, errores, rate limit
│   │   ├── models/          # Modelos Mongoose
│   │   ├── prompts/         # Prompts de IA
│   │   ├── routes/          # Definición de rutas
│   │   ├── services/        # Lógica de negocio
│   │   ├── utils/           # Logger, responses, errors
│   │   └── validations/     # Validadores de datos
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   ├── context/         # Auth y Theme contexts
│   │   ├── hooks/           # Custom hooks
│   │   ├── layouts/         # Layout admin con sidebar
│   │   ├── pages/           # Páginas del panel
│   │   ├── services/        # API client (Axios)
│   │   ├── styles/          # CSS con Tailwind
│   │   └── utils/           # Formateadores
│   └── package.json
└── README.md
```

---

## Información del Negocio

- **Nombre:** Fresanova
- **Ciudad:** Cartagena, Colombia
- **Horario:** 8:00 AM — 8:00 PM
- **Domicilio:** $10.000 COP fijo
- **Pagos:** Efectivo contra entrega / Transferencia

---

## Licencia

Proyecto privado — Fresanova © 2025
