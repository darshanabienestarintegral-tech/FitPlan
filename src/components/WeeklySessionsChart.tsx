import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  Calendar,
  Flame,
  Clock,
  Dumbbell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Sparkles,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { SessionLog, Routine } from '../types';

export interface WeeklySessionsChartProps {
  sessionLogs: SessionLog[];
  weeklyTargetDays?: number;
  activeRoutine?: Routine | null;
  onQuickLogSession?: () => void;
  onSeedSampleData?: () => void;
  showCardWrapper?: boolean;
}

interface WeekDayData {
  dayKey: string; // 'lun', 'mar', etc.
  dayLabel: string; // 'Lun'
  fullDayName: string; // 'Lunes'
  dateStr: string; // '2026-10-12'
  displayDate: string; // '12 Oct'
  sessions: number; // count
  durationMin: number;
  exercisesCount: number;
  isToday: boolean;
  isFuture: boolean;
  logs: SessionLog[];
}

const DAY_NAMES_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const FULL_DAY_NAMES_ES = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

export const WeeklySessionsChart: React.FC<WeeklySessionsChartProps> = ({
  sessionLogs,
  weeklyTargetDays = 4,
  activeRoutine,
  onQuickLogSession,
  onSeedSampleData,
  showCardWrapper = true,
}) => {
  // weekOffset: 0 = current week, -1 = last week, etc.
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [chartMetric, setChartMetric] = useState<'sessions' | 'duration'>('sessions');

  // Compute 7 days of the selected week (Monday to Sunday)
  const weekData = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Day of week: 0 (Sun), 1 (Mon), ..., 6 (Sat)
    const currentDayOfWeek = now.getDay();
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

    const baseMonday = new Date(now);
    baseMonday.setDate(now.getDate() + distanceToMonday + weekOffset * 7);
    baseMonday.setHours(0, 0, 0, 0);

    const days: WeekDayData[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(baseMonday);
      d.setDate(baseMonday.getDate() + i);

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const monthName = d.toLocaleDateString('es-ES', { month: 'short' });
      const displayDate = `${d.getDate()} ${monthName}`;

      // Find matching session logs for this calendar date
      const matchingLogs = sessionLogs.filter((log) => {
        const logDateStr = log.date.split('T')[0];
        return logDateStr === dateStr;
      });

      const totalDuration = matchingLogs.reduce((acc, l) => acc + (l.duration_min || 0), 0);
      const totalExercises = matchingLogs.reduce(
        (acc, l) => acc + (l.completed_exercises ? l.completed_exercises.length : 0),
        0
      );

      const isToday = dateStr === todayStr;
      const isFuture = d.getTime() > now.getTime() && !isToday;

      days.push({
        dayKey: DAY_NAMES_ES[i].toLowerCase(),
        dayLabel: DAY_NAMES_ES[i],
        fullDayName: FULL_DAY_NAMES_ES[i],
        dateStr,
        displayDate,
        sessions: matchingLogs.length,
        durationMin: totalDuration,
        exercisesCount: totalExercises,
        isToday,
        isFuture,
        logs: matchingLogs,
      });
    }

    return days;
  }, [sessionLogs, weekOffset]);

  // Summary statistics for this selected week
  const weekSummary = useMemo(() => {
    const totalSessions = weekData.reduce((sum, d) => sum + d.sessions, 0);
    const totalMinutes = weekData.reduce((sum, d) => sum + d.durationMin, 0);
    const totalExercises = weekData.reduce((sum, d) => sum + d.exercisesCount, 0);
    const daysWithWorkout = weekData.filter((d) => d.sessions > 0).length;
    const progressPercent = Math.min(100, Math.round((daysWithWorkout / weeklyTargetDays) * 100));

    // Estimated calories: roughly 6-8 kcal per minute of strength/resistance workout
    const estimatedCalories = Math.round(totalMinutes * 7.5);

    const firstDate = weekData[0].displayDate;
    const lastDate = weekData[6].displayDate;

    return {
      totalSessions,
      totalMinutes,
      totalExercises,
      daysWithWorkout,
      progressPercent,
      estimatedCalories,
      rangeLabel: `${firstDate} - ${lastDate}`,
    };
  }, [weekData, weeklyTargetDays]);

  // Max value for YAxis domain
  const maxSessionsInWeek = Math.max(...weekData.map((d) => d.sessions), 2);
  const maxDurationInWeek = Math.max(...weekData.map((d) => d.durationMin), 60);

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: WeekDayData = payload[0].payload;
      return (
        <div className="bg-[#1C1917] text-white p-3 rounded-2xl shadow-xl border border-white/10 text-xs min-w-[170px] animate-scaleUp">
          <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-1.5 mb-2">
            <span className="font-black uppercase tracking-wider font-heading text-[#D99B6A]">
              {data.fullDayName}
            </span>
            <span className="text-[10px] text-white/60">{data.displayDate}</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Sesiones:</span>
              <span className="font-extrabold text-white font-mono">
                {data.sessions} {data.sessions === 1 ? 'sesión' : 'sesiones'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Tiempo:</span>
              <span className="font-extrabold text-white font-mono">{data.durationMin} min</span>
            </div>
            {data.exercisesCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-white/70">Ejercicios:</span>
                <span className="font-extrabold text-white font-mono">{data.exercisesCount} hechos</span>
              </div>
            )}
          </div>

          {data.logs.length > 0 ? (
            <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
              <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block">
                Entrenamientos realizados:
              </span>
              {data.logs.map((log) => (
                <div key={log.id} className="text-[11px] font-semibold text-white truncate">
                  • {log.routine_day_name || 'Sesión completada'}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-white/50 italic">
              {data.isFuture ? 'Día programado' : 'Día de descanso o sin registro'}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const content = (
    <div className="space-y-4">
      {/* Week Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9E5325] font-heading">
              SEGUIMIENTO SEMANAL CON RECHARTS
            </span>
            {weekOffset === 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                Semana Actual
              </span>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-black text-[#1C1917] font-heading uppercase tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#9E5325]" />
            <span>Sesiones Completadas ({weekSummary.rangeLabel})</span>
          </h3>
        </div>

        {/* Controls: Prev/Next week & Metric switch */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Metric switcher */}
          <div className="bg-[#FAF7F2] p-1 rounded-xl border border-[#EAE3D9] flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setChartMetric('sessions')}
              className={`px-2.5 py-1 rounded-lg font-bold font-heading text-[11px] uppercase transition-all ${
                chartMetric === 'sessions'
                  ? 'bg-[#9E5325] text-white shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              Sesiones
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('duration')}
              className={`px-2.5 py-1 rounded-lg font-bold font-heading text-[11px] uppercase transition-all ${
                chartMetric === 'duration'
                  ? 'bg-[#9E5325] text-white shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              Minutos
            </button>
          </div>

          {/* Week offset navigator */}
          <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-xl border border-[#EAE3D9]">
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="w-7 h-7 rounded-lg hover:bg-white text-[#78716C] hover:text-[#1C1917] flex items-center justify-center transition-colors"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {weekOffset !== 0 && (
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="text-[10px] font-bold text-[#9E5325] px-1.5 hover:underline font-heading uppercase"
              >
                Hoy
              </button>
            )}
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => Math.min(0, prev + 1))}
              disabled={weekOffset >= 0}
              className="w-7 h-7 rounded-lg hover:bg-white text-[#78716C] hover:text-[#1C1917] disabled:opacity-30 flex items-center justify-center transition-colors"
              title="Semana siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#EAE3D9]">
          <div className="flex items-center justify-between text-[#78716C] mb-1">
            <span className="text-[10px] font-bold uppercase font-heading">Meta Cumplida</span>
            <Award className="w-3.5 h-3.5 text-[#9E5325]" />
          </div>
          <div className="text-lg sm:text-xl font-black text-[#1C1917] font-heading">
            {weekSummary.daysWithWorkout} / {weeklyTargetDays}
          </div>
          <div className="text-[10px] text-[#78716C] font-semibold mt-0.5">
            {weekSummary.progressPercent}% de adherencia
          </div>
        </div>

        <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#EAE3D9]">
          <div className="flex items-center justify-between text-[#78716C] mb-1">
            <span className="text-[10px] font-bold uppercase font-heading">Sesiones Totales</span>
            <Dumbbell className="w-3.5 h-3.5 text-[#9E5325]" />
          </div>
          <div className="text-lg sm:text-xl font-black text-[#1C1917] font-heading">
            {weekSummary.totalSessions}
          </div>
          <div className="text-[10px] text-[#78716C] font-semibold mt-0.5">
            {weekSummary.totalExercises} ejercicios hechos
          </div>
        </div>

        <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#EAE3D9]">
          <div className="flex items-center justify-between text-[#78716C] mb-1">
            <span className="text-[10px] font-bold uppercase font-heading">Tiempo Total</span>
            <Clock className="w-3.5 h-3.5 text-[#9E5325]" />
          </div>
          <div className="text-lg sm:text-xl font-black text-[#1C1917] font-heading">
            {weekSummary.totalMinutes} min
          </div>
          <div className="text-[10px] text-[#78716C] font-semibold mt-0.5">
            ~{Math.round(weekSummary.totalMinutes / (weekSummary.totalSessions || 1))} min / sesión
          </div>
        </div>

        <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#EAE3D9]">
          <div className="flex items-center justify-between text-[#78716C] mb-1">
            <span className="text-[10px] font-bold uppercase font-heading">Calorías Est.</span>
            <Flame className="w-3.5 h-3.5 text-[#9E5325]" />
          </div>
          <div className="text-lg sm:text-xl font-black text-[#1C1917] font-heading">
            {weekSummary.estimatedCalories} kcal
          </div>
          <div className="text-[10px] text-emerald-700 font-bold mt-0.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>Gasto metabólico</span>
          </div>
        </div>
      </div>

      {/* Progress Bar towards weekly goal */}
      <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#EAE3D9] space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold font-heading uppercase">
          <span className="text-[#1C1917] flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#9E5325]" />
            Objetivo Semanal ({weekSummary.daysWithWorkout} de {weeklyTargetDays} días entrenados)
          </span>
          <span className="text-[#9E5325]">{weekSummary.progressPercent}%</span>
        </div>
        <div className="h-2.5 w-full bg-[#EAE3D9] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#9E5325] to-[#7B3A13] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${weekSummary.progressPercent}%` }}
          />
        </div>
      </div>

      {/* RECHARTS MAIN CONTAINER */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-[#EAE3D9] shadow-xs">
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartMetric === 'sessions' ? (
              <BarChart
                data={weekData}
                margin={{ top: 20, right: 12, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2EAE1" />
                <XAxis
                  dataKey="dayLabel"
                  axisLine={{ stroke: '#EAE3D9' }}
                  tickLine={false}
                  tick={({ x, y, payload }) => {
                    const item = weekData.find((d) => d.dayLabel === payload.value);
                    const isToday = item?.isToday;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={0}
                          y={0}
                          dy={14}
                          textAnchor="middle"
                          fill={isToday ? '#9E5325' : '#78716C'}
                          fontSize={11}
                          fontWeight={isToday ? 800 : 600}
                          fontFamily="sans-serif"
                        >
                          {payload.value}
                        </text>
                        {isToday && (
                          <circle cx={0} cy={22} r={2.5} fill="#9E5325" />
                        )}
                      </g>
                    );
                  }}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, Math.max(maxSessionsInWeek, 2)]}
                  axisLine={{ stroke: '#EAE3D9' }}
                  tickLine={false}
                  tick={{ fill: '#A8A29E', fontSize: 10, fontWeight: 600 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine
                  y={1}
                  stroke="#D8C5B3"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Meta diaria (1 sesión)',
                    position: 'insideTopRight',
                    fill: '#A8A29E',
                    fontSize: 9,
                    fontWeight: 600,
                  }}
                />
                <Bar
                  dataKey="sessions"
                  name="Sesiones Completadas"
                  radius={[8, 8, 2, 2]}
                  animationDuration={800}
                >
                  {weekData.map((entry, index) => {
                    const hasSession = entry.sessions > 0;
                    // Colors: terracotta gradient if completed, subtle if today, faint if empty
                    const fill = hasSession
                      ? entry.isToday
                        ? '#7B3A13'
                        : '#9E5325'
                      : entry.isToday
                      ? '#EAE3D9'
                      : '#F5EFE9';

                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={fill}
                        stroke={entry.isToday ? '#9E5325' : 'transparent'}
                        strokeWidth={entry.isToday ? 1.5 : 0}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            ) : (
              <AreaChart
                data={weekData}
                margin={{ top: 20, right: 12, left: -10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="durationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9E5325" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#9E5325" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F2EAE1" />
                <XAxis
                  dataKey="dayLabel"
                  axisLine={{ stroke: '#EAE3D9' }}
                  tickLine={false}
                  tick={{ fill: '#78716C', fontSize: 11, fontWeight: 600 }}
                />
                <YAxis
                  unit="m"
                  domain={[0, Math.max(maxDurationInWeek + 10, 60)]}
                  axisLine={{ stroke: '#EAE3D9' }}
                  tickLine={false}
                  tick={{ fill: '#A8A29E', fontSize: 10, fontWeight: 600 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="durationMin"
                  name="Minutos"
                  stroke="#9E5325"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#durationGradient)"
                  dot={{ r: 4, fill: '#9E5325', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#7B3A13', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend / Day Status Pills below chart */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 pt-3 border-t border-[#EAE3D9]/70 text-center">
          {weekData.map((day) => {
            const hasWorkout = day.sessions > 0;
            return (
              <div
                key={day.dayKey}
                className={`p-1.5 rounded-xl transition-all ${
                  day.isToday
                    ? 'bg-[#F2E7DC] ring-1 ring-[#9E5325]'
                    : hasWorkout
                    ? 'bg-[#FAF7F2]'
                    : 'bg-transparent'
                }`}
              >
                <div
                  className={`text-[10px] font-heading uppercase ${
                    day.isToday ? 'font-black text-[#9E5325]' : 'font-bold text-[#78716C]'
                  }`}
                >
                  {day.dayLabel}
                </div>
                <div className="text-[9px] text-[#A8A29E] font-medium">{day.displayDate.split(' ')[0]}</div>
                <div className="mt-1 flex justify-center">
                  {hasWorkout ? (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                      ✓
                    </span>
                  ) : day.isToday ? (
                    <span className="w-5 h-5 rounded-full border border-dashed border-[#9E5325] text-[#9E5325] flex items-center justify-center text-[9px] font-black">
                      •
                    </span>
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-[#FAF7F2] text-[#D8C5B3] flex items-center justify-center text-[10px]">
                      -
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Action Footer inside Chart component */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-1.5 text-xs text-[#78716C]">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#9E5325]" />
          <span>Completado</span>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600 ml-2" />
          <span>Cumplido</span>
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#EAE3D9] ml-2" />
          <span>Hoy / Pendiente</span>
        </div>

        <div className="flex items-center gap-2">
          {onSeedSampleData && (
            <button
              type="button"
              onClick={onSeedSampleData}
              className="px-2.5 py-1.5 rounded-xl text-xs bg-[#FAF7F2] hover:bg-[#F2E7DC] text-[#78716C] hover:text-[#9E5325] border border-[#EAE3D9] font-medium flex items-center gap-1 transition-all"
              title="Generar o alternar sesiones de ejemplo para probar el gráfico"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Datos de ejemplo</span>
            </button>
          )}

          {onQuickLogSession && (
            <button
              type="button"
              onClick={onQuickLogSession}
              className="px-3 py-1.5 rounded-xl text-xs bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] text-white font-bold font-heading uppercase tracking-wide flex items-center gap-1 shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Registrar Sesión</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (!showCardWrapper) {
    return content;
  }

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EAE3D9] shadow-sm">
      {content}
    </div>
  );
};
