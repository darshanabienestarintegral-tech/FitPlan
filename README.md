# FitPlan ⚡ - Planificador de Rutinas Personalizadas

FitPlan es una Progressive Web App (PWA) mobile-first diseñada bajo la filosofía: **"abrir la app, ver mi rutina, entrenar"**. Permite a principiantes e intermedios crear su rutina óptima en menos de 60 segundos.

---

## 🚀 Tecnologías
- **React 18** + **Vite** + **TypeScript**
- **TailwindCSS** (Tema oscuro por defecto: cyan `#22D3EE`, fondo `#0F172A`, superficie `#1E293B`, acento `#F97316`)
- **Zustand** (Estado global persistente)
- **React Router v6** (Navegación SPA)
- **Supabase** (`@supabase/supabase-js`) para base de datos PostgreSQL y autenticación con RLS
- **lucide-react** (Iconografía deportiva de alta fidelidad)
- **vite-plugin-pwa** (Soporte offline e instalación móvil)

---

## 🛠️ Instalación y Ejecución Local

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd fitplan

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno (Opcional, funciona también 100% en modo local)
cp .env.example .env

# 4. Iniciar servidor de desarrollo
npm run dev
```

---

## 📦 Configuración de Supabase
1. Crea un proyecto en [Supabase](https://supabase.com).
2. Ve al **SQL Editor** en el panel de control de Supabase.
3. Copia y ejecuta todo el contenido de `supabase/schema.sql`.
4. En **Settings > API**, copia la `Project URL` y la clave pública `anon key`.
5. Agrégalas a tu archivo `.env`:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
   ```

---

## 📋 Reglas del Algoritmo de Rutinas
- **Fuerza**: 5x5 repeticiones, 180s descanso
- **Hipertrofia**: 4x10 repeticiones, 90s descanso
- **Pérdida de Grasa**: 3x15 repeticiones, 45s descanso
- **Resistencia**: 3x20 repeticiones, 30s descanso
- **Ejercicios por sesión**: `min(6, round(minutos / 10))`
- **Distribución por días**:
  - 2 días: Full Body A/B
  - 3 días: Push / Pull / Legs
  - 4 días: Upper / Lower x2
  - 5-6 días: PPL x2
- Filtrado estricto según equipamiento disponible: Corporal / Mancuernas / Gimnasio.
