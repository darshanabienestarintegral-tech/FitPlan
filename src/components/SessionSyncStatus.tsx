import { useEffect } from 'react';
import { useUserStore } from '../store/useUserStore';
import { useRoutineStore } from '../store/useRoutineStore';

export function SessionSyncStatus() {
  const uid = useUserStore((state) => state.isAuthenticated ? state.currentUser?.uid : undefined);
  const syncing = useRoutineStore((state) => state.isSyncingSessions);
  const syncUserId = useRoutineStore((state) => state.sessionSyncUserId);
  const error = useRoutineStore((state) => state.sessionSyncError);
  const sync = useRoutineStore((state) => state.syncSessionHistory);
  useEffect(() => {
    if (!uid) return;
    void sync();
    const retry = () => { void sync(); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [uid, sync]);
  if (!uid || uid !== syncUserId) return null;
  return (
    <div role={error ? 'alert' : 'status'} className="bg-[#FAF7F2] border-b border-[#EAE3D9] px-4 py-2 text-center text-xs text-[#1C1917]">
      {syncing ? 'Sincronizando progreso con Internet…' : error || 'Progreso sincronizado con Internet.'}
      {!syncing && <button type="button" onClick={() => { void sync(); }} className="ml-3 underline font-bold">
        {error ? 'Reintentar' : 'Actualizar progreso'}
      </button>}
    </div>
  );
}
