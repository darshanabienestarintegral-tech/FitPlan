import { useCallback, useEffect, useState } from 'react';
import { useRoutineStore } from '../store/useRoutineStore';
import { useUserStore } from '../store/useUserStore';

export function RoutineCloudStatus() {
  const uid = useUserStore((state) => state.isAuthenticated ? state.currentUser?.uid : undefined);
  const accountError = useUserStore((state) => state.accountsSyncError);
  const routineError = useRoutineStore((state) => state.routineSyncError);
  const syncing = useRoutineStore((state) => state.isSyncingRoutines);
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await useUserStore.getState().syncCloudAccounts();
      await useRoutineStore.getState().syncRoutineCatalog();
    } finally { setRefreshing(false); }
  }, []);
  useEffect(() => {
    if (!uid) return;
    void refresh();
    const retry = () => { void refresh(); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [uid, refresh]);
  if (!uid) return null;
  const error = accountError || routineError;
  return <div role={error ? 'alert' : 'status'} className="bg-[#FAF7F2] border-b border-[#EAE3D9] px-4 py-2 text-center text-xs text-[#1C1917]">
    {refreshing || syncing ? 'Sincronizando rutinas y usuarios…' : error || 'Rutinas actualizadas desde Internet.'}
    <button type="button" disabled={refreshing || syncing} onClick={() => { void refresh(); }} className="ml-3 underline font-bold disabled:opacity-50">
      {error ? 'Reintentar' : 'Actualizar rutinas y usuarios'}
    </button>
  </div>;
}
