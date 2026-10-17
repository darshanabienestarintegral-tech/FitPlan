-- ==============================================================
-- FITPLAN - ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRESQL + RLS)
-- ==============================================================

-- 1. Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: profiles (perfiles de usuario vinculados a auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Atleta',
    age INTEGER,
    weight NUMERIC(5, 2),
    height NUMERIC(5, 2),
    level TEXT NOT NULL DEFAULT 'principiante' CHECK (level IN ('principiante', 'intermedio', 'avanzado')),
    goal TEXT NOT NULL DEFAULT 'hipertrofia' CHECK (goal IN ('fuerza', 'hipertrofia', 'perdida_grasa', 'resistencia')),
    days_per_week INTEGER NOT NULL DEFAULT 3 CHECK (days_per_week BETWEEN 2 AND 6),
    session_duration INTEGER NOT NULL DEFAULT 45,
    equipment TEXT NOT NULL DEFAULT 'mancuernas' CHECK (equipment IN ('ninguno', 'mancuernas', 'gimnasio')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: exercises (biblioteca completa de ejercicios)
CREATE TABLE IF NOT EXISTS public.exercises (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    muscle_group TEXT NOT NULL CHECK (muscle_group IN ('pecho', 'espalda', 'piernas', 'hombros', 'brazos', 'core')),
    equipment TEXT NOT NULL CHECK (equipment IN ('ninguno', 'mancuernas', 'gimnasio')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('principiante', 'intermedio', 'avanzado')),
    description TEXT NOT NULL,
    media_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: routines (rutinas generadas para los usuarios)
CREATE TABLE IF NOT EXISTS public.routines (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: routine_days (días específicos de cada rutina)
CREATE TABLE IF NOT EXISTS public.routine_days (
    id TEXT PRIMARY KEY,
    routine_id TEXT REFERENCES public.routines(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    exercise_ids TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: session_logs (registro histórico de entrenamientos completados)
CREATE TABLE IF NOT EXISTS public.session_logs (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    routine_day_id TEXT REFERENCES public.routine_days(id) ON DELETE SET NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_min INTEGER NOT NULL DEFAULT 45,
    completed_exercises TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================
-- POLÍTICAS DE SEGURIDAD A NIVEL DE FILA (ROW LEVEL SECURITY - RLS)
-- ==============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_logs ENABLE ROW LEVEL SECURITY;

-- 1. Reglas para exercises (Lectura pública para todos, escritura solo service_role)
CREATE POLICY "Ejercicios con lectura pública"
    ON public.exercises
    FOR SELECT
    USING (true);

-- 2. Reglas para profiles (Cada usuario gestiona únicamente su perfil)
CREATE POLICY "Los usuarios pueden ver su propio perfil"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden insertar su propio perfil"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- 3. Reglas para routines (Solo el creador ve y modifica su rutina)
CREATE POLICY "Los usuarios pueden ver sus propias rutinas"
    ON public.routines
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar sus propias rutinas"
    ON public.routines
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden modificar sus propias rutinas"
    ON public.routines
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propias rutinas"
    ON public.routines
    FOR DELETE
    USING (auth.uid() = user_id);

-- 4. Reglas para routine_days (Acceso a través de la rutina del usuario)
CREATE POLICY "Los usuarios pueden ver los días de sus rutinas"
    ON public.routine_days
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.routines
            WHERE public.routines.id = public.routine_days.routine_id
            AND public.routines.user_id = auth.uid()
        )
    );

CREATE POLICY "Los usuarios pueden crear los días de sus rutinas"
    ON public.routine_days
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.routines
            WHERE public.routines.id = public.routine_days.routine_id
            AND public.routines.user_id = auth.uid()
        )
    );

CREATE POLICY "Los usuarios pueden eliminar días de sus rutinas"
    ON public.routine_days
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.routines
            WHERE public.routines.id = public.routine_days.routine_id
            AND public.routines.user_id = auth.uid()
        )
    );

-- 5. Reglas para session_logs (Historial privado del usuario)
CREATE POLICY "Los usuarios pueden ver sus propios registros de entrenamiento"
    ON public.session_logs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar sus propios entrenamientos"
    ON public.session_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propios entrenamientos"
    ON public.session_logs
    FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger automático para crear perfil cuando un usuario se registra en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, level, goal, days_per_week)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', 'Atleta'), 'principiante', 'hipertrofia', 3)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
