# LifeOS Pro

LifeOS Pro es un sistema de gestión y control personal diseñado para centralizar la administración de documentos, vehículos, finanzas, salud, tareas y eventos en un único panel de control.

La aplicación adopta una arquitectura **Offline-First**, almacenando y cifrando la información localmente en el navegador mediante el estándar AES-GCM (256 bits). Adicionalmente, soporta sincronización opcional con Supabase Cloud para respaldo de datos y gestión de acceso multi-dispositivo.

## Módulos del Sistema

- **Bóveda de Documentos y Contraseñas:** Almacenamiento con cifrado simétrico en el cliente utilizando Web Crypto API (AES-GCM de 256 bits y derivación PBKDF2).
- **Calendario Unificado:** Consolidación mensual de cumpleaños, aniversarios, vencimientos de pólizas, mantenimientos vehiculares y cobros de servicios.
- **Bitácora Vehicular:** Registro de kilometraje, bitácora de servicios mecánicos, cargas de combustible y vencimiento de seguros.
- **Gestión Financiera:** Control presupuestal, registro de egresos por categoría y administración de suscripciones recurrentes.
- **Expediente de Salud:** Ficha médica de emergencia (ICE), registro de grupo sanguíneo, alergias, citas médicas y recetas.
- **Administración del Hogar y Envíos:** Inventario de propiedades, registro de servicios públicos y seguimiento de paquetería.
- **Notificaciones y PWA:** Aplicación web progresiva con entrega de notificaciones nativas en el sistema operativo sobre vencimientos próximos.
- **Sincronización Cloud y Panel Administrativo:** Respaldo distribuido en PostgreSQL (Supabase) con políticas de seguridad RLS (Row Level Security) y control de cuentas de usuario.

## Stack Tecnológico

- **Frontend:** React 19, TypeScript, Vite
- **Estilos:** Tailwind CSS v4
- **Persistencia Local:** Dexie.js (IndexedDB)
- **Persistencia Cloud:** Supabase (PostgreSQL + REST API)
- **Criptografía:** Web Crypto API (PBKDF2 + AES-GCM)
- **Despliegue:** Cloudflare Pages / Netlify / Vercel

## Requisitos del Sistema

- Node.js v18.0.0 o superior
- npm v9.0.0 o superior

## Instalación y Configuración Local

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/lifeospro.git
   cd lifeospro
   ```

2. Instalar las dependencias del proyecto:
   ```bash
   npm install
   ```

3. Configurar las variables de entorno creando un archivo `.env` en la raíz del proyecto:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsIn...
   ```

4. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Compilación para Producción

Para generar la distribución optimizada de producción:

```bash
npm run build
```

El comando generará los artefactos compilados en el directorio `dist/`, listos para su despliegue en entornos como Cloudflare Pages, Netlify o Vercel.

## Licencia

Este proyecto está bajo la Licencia MIT.
