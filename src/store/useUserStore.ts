import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Profile, Difficulty, Goal, Equipment, UserAccount } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  loginWithFirebase as fbLogin,
  registerWithFirebase as fbRegister,
  logoutFromFirebase as fbLogout,
  UserRole,
  fetchAllUsers,
  fetchUserProfile,
  FirebaseUserProfile,
} from '../lib/firebase';
import { assignCloudRoutine } from '../lib/routineCatalog';

export interface CurrentUserSession {
  uid?: string;
  email?: string;
  username: string;
  role: UserRole;
  isAdmin: boolean;
  accessCode: string;
  loginTime: string;
}

interface UserState {
  currentUser: CurrentUserSession | null;
  isAuthenticated: boolean;
  registeredAccounts: UserAccount[];
  adminAccessCodes: string[];

  profile: Profile | null;
  isOnboarded: boolean;
  isLoading: boolean;
  error: string | null;
  supabaseUserId: string | null;

  // Authentication Actions
  login: (username: string, password?: string) => { success: boolean; message?: string };
  register: (username: string, password: string, accessCode: string) => { success: boolean; message?: string };
  loginFirebase: (usernameOrEmail: string, password?: string) => Promise<{ success: boolean; message?: string; role?: UserRole }>;
  registerFirebase: (
    username: string,
    password: string,
    role: UserRole
  ) => Promise<{ success: boolean; message?: string; role?: UserRole }>;
  logout: () => void;
  createAdminCode: (code: string) => boolean;
  deleteAdminCode: (code: string) => void;
  assignRoutineToAccount: (username: string, routineId: string) => Promise<void>;
  syncCloudAccounts: () => Promise<void>;
  accountsSyncError: string | null;
  createAccountByAdmin: (accountData: {
    username: string;
    password?: string;
    accessCode?: string;
    fullName?: string;
    assignedRoutineId?: string;
  }) => { success: boolean; message?: string };
  deleteAccount: (username: string) => void;

  // Profile Actions
  setProfile: (profileData: Partial<Profile>) => Promise<void>;
  completeOnboarding: (data: {
    goal: Goal;
    days_per_week: number;
    session_duration: number;
    equipment: Equipment;
    name?: string;
    level?: Difficulty;
    age?: number;
    weight?: number;
    height?: number;
  }) => Promise<Profile>;
  resetUser: () => void;
  syncWithSupabase: () => Promise<void>;
}

function accountFromProfile(profile: FirebaseUserProfile): UserAccount {
  return {
    username: profile.username || profile.displayName,
    fullName: profile.displayName,
    profileId: profile.uid,
    role: profile.role,
    assignedRoutineId: profile.assignedRoutineId,
    createdAt: profile.createdAt,
    accessCode: 'FIREBASE-AUTH',
  };
}

const defaultAdminCodes = ['FITPLAN2026', 'ADMIN-2026', 'VIP-ATLETA', 'PRO-TRAIN'];

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      isAuthenticated: false,
      registeredAccounts: [],
      accountsSyncError: null,
      syncCloudAccounts: async () => {
        const user = get().currentUser;
        if (!user?.uid || !get().isAuthenticated) return;
        set({ accountsSyncError: null });
        try {
          const profiles = user.isAdmin ? await fetchAllUsers() : [await fetchUserProfile(user.uid)];
          if (get().currentUser?.uid !== user.uid) return;
          set({ registeredAccounts: profiles.filter((item): item is FirebaseUserProfile => item !== null)
            .map(accountFromProfile) });
        } catch (error) {
          console.warn('Could not load cloud accounts:', error);
          if (get().currentUser?.uid === user.uid) set({ accountsSyncError: 'No se pudo actualizar la lista de usuarios desde Internet. Reintenta.' });
        }
      },
      adminAccessCodes: defaultAdminCodes,

      profile: null,
      isOnboarded: false,
      isLoading: false,
      error: null,
      supabaseUserId: null,

      loginFirebase: async (usernameOrEmail, password = '') => {
        try {
          set({ isLoading: true, error: null });
          const cleanUsername = usernameOrEmail.trim().toLowerCase();

          // Direct bypass for administrator master key
          if ((cleanUsername === 'admin' || cleanUsername === 'administrador') && password === '260816') {
            set({
              currentUser: {
                username: 'admin',
                role: 'admin',
                isAdmin: true,
                accessCode: 'MASTER-ADMIN',
                loginTime: new Date().toISOString(),
              },
              profile: {
                id: 'admin-master',
                name: 'Administrador del Gimnasio',
                level: 'avanzado',
                goal: 'fuerza',
                days_per_week: 5,
                session_duration: 60,
                equipment: 'gimnasio',
              },
              isAuthenticated: true,
              isOnboarded: true,
              isLoading: false,
              error: null,
            });
            return { success: true, role: 'admin' };
          }

          const { profile: fbProfile } = await fbLogin(cleanUsername, password);

          const isAdmin = fbProfile.role === 'admin';
          set({
            registeredAccounts: [accountFromProfile(fbProfile)],
            currentUser: {
              uid: fbProfile.uid,
              email: fbProfile.email,
              username: fbProfile.username || fbProfile.displayName || cleanUsername,
              role: fbProfile.role,
              isAdmin,
              accessCode: isAdmin ? 'MASTER-ADMIN' : 'FIREBASE-AUTH',
              loginTime: new Date().toISOString(),
            },
            profile: {
              id: fbProfile.uid,
              name: fbProfile.displayName || cleanUsername,
              level: 'intermedio',
              goal: 'resistencia',
              days_per_week: 3,
              session_duration: 60,
              equipment: 'gimnasio',
            },
            isAuthenticated: true,
            isOnboarded: true,
            isLoading: false,
            error: null,
          });
          return { success: true, role: fbProfile.role };
        } catch (err: any) {
          console.error('Firebase login error:', err);
          let message = 'Error al iniciar sesión.';
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            message = 'Credenciales no encontradas. Regístrate en la pestaña "Nuevo Usuario".';
          } else if (err.code === 'app/firebase-timeout') {
            message = err.message;
          } else if (err.code === 'auth/network-request-failed') {
            message = 'No se pudo conectar con Firebase. Comprueba tu conexión.';
          } else if (err.code === 'auth/wrong-password') {
            message = 'Contraseña incorrecta.';
          }
          set({ isLoading: false, error: message });
          return { success: false, message };
        }
      },

      registerFirebase: async (username, password, role) => {
        try {
          set({ isLoading: true, error: null });
          const cleanUsername = username.trim();

          if (!cleanUsername) {
            set({ isLoading: false });
            return { success: false, message: 'Ingresa un nombre de usuario.' };
          }
          if (!password || password.length < 6) {
            set({ isLoading: false });
            return { success: false, message: 'La contraseña debe tener al menos 6 caracteres.' };
          }

          // Check if username already exists in registered accounts
          const existing = get().registeredAccounts.find(
            (acc) => acc.username.toLowerCase() === cleanUsername.toLowerCase()
          );
          if (existing) {
            set({ isLoading: false, error: 'Este usuario ya está registrado.' });
            return { success: false, message: 'Este nombre de usuario ya existe. Inicia sesión.' };
          }

          const res = await fbRegister(cleanUsername, password, role);
          const uid = res.user.uid;

          const isAdmin = role === 'admin';
          const newAccount: UserAccount = {
            username: cleanUsername,
            role,
            accessCode: isAdmin ? 'MASTER-ADMIN' : 'REGISTRADO',
            createdAt: new Date().toISOString(),
            profileId: uid,
            fullName: cleanUsername,
          };

          const newProfile: Profile = {
            id: uid,
            name: cleanUsername,
            level: 'principiante',
            goal: 'hipertrofia',
            days_per_week: 3,
            session_duration: 60,
            equipment: 'gimnasio',
            created_at: new Date().toISOString(),
          };

          // Store new registered user: now they figure in the user list!
          set((state) => ({
            registeredAccounts: [...state.registeredAccounts, newAccount],
            currentUser: {
              uid,
              username: cleanUsername,
              role,
              isAdmin,
              accessCode: newAccount.accessCode,
              loginTime: new Date().toISOString(),
            },
            profile: newProfile,
            isAuthenticated: true,
            isOnboarded: true,
            isLoading: false,
            error: null,
          }));

          return { success: true, role };
        } catch (err: any) {
          console.error('Registration error:', err);
          let message = 'No se pudo completar el registro. Si tu cuenta ya se creó, intenta iniciar sesión.';
          if (err.code === 'auth/email-already-in-use') {
            message = 'Este nombre de usuario ya está registrado en Firebase.';
          } else if (err.code === 'app/firebase-timeout') {
            message = err.message;
          } else if (err.code === 'auth/network-request-failed') {
            message = 'No se pudo conectar con Firebase. Comprueba tu conexión.';
          } else if (err.code === 'auth/operation-not-allowed') {
            message = 'El registro con contraseña no está habilitado en Firebase.';
          } else if (err.code === 'auth/weak-password') {
            message = 'La contraseña debe tener al menos 6 caracteres.';
          }
          set({ isLoading: false, error: message });
          return { success: false, message };
        }
      },

      login: (username, password) => {
        const cleanUsername = username.trim().toLowerCase();
        const accounts = get().registeredAccounts;

        // Admin direct login bypass with key 260816
        if ((cleanUsername === 'admin' || cleanUsername === 'administrador') && password === '260816') {
          set({
            currentUser: {
              username: 'admin',
              role: 'admin',
              isAdmin: true,
              accessCode: 'MASTER-ADMIN',
              loginTime: new Date().toISOString(),
            },
            isAuthenticated: true,
            error: null,
          });
          return { success: true };
        }

        const found = accounts.find((acc) => acc.username.toLowerCase() === cleanUsername);

        if (!found) {
          return {
            success: false,
            message: 'Usuario no registrado. Regístrate con el código otorgado por el administrador.',
          };
        }

        if (found.password && found.password !== password) {
          return {
            success: false,
            message: 'Contraseña incorrecta.',
          };
        }

        set({
          currentUser: {
            username: found.username,
            role: 'usuario',
            isAdmin: false,
            accessCode: found.accessCode,
            loginTime: new Date().toISOString(),
          },
          isAuthenticated: true,
          error: null,
        });

        return { success: true };
      },

      register: (username, password, accessCode) => {
        const cleanUsername = username.trim();
        const cleanCode = accessCode.trim().toUpperCase();

        if (!cleanUsername) {
          return { success: false, message: 'Ingresa un nombre de usuario.' };
        }

        if (!password || password.length < 3) {
          return { success: false, message: 'La contraseña debe tener al menos 3 caracteres.' };
        }

        if (!cleanCode) {
          return { success: false, message: 'Debes ingresar el código otorgado por el administrador.' };
        }

        // Validate administrator code
        const activeCodes = get().adminAccessCodes;
        const isValidCode = activeCodes.includes(cleanCode);

        if (!isValidCode) {
          return {
            success: false,
            message: 'Código de administrador no válido o caducado. Solicita un código válido.',
          };
        }

        // Check if username already exists
        const existing = get().registeredAccounts.find(
          (acc) => acc.username.toLowerCase() === cleanUsername.toLowerCase()
        );

        if (existing) {
          return {
            success: false,
            message: 'Ese nombre de usuario ya está registrado. Intenta con otro o inicia sesión.',
          };
        }

        const profileId = 'usr-' + Math.random().toString(36).substring(2, 9);
        const newAccount: UserAccount = {
          username: cleanUsername,
          password,
          accessCode: cleanCode,
          createdAt: new Date().toISOString(),
          profileId,
        };

        const newProfile: Profile = {
          id: profileId,
          name: cleanUsername,
          level: 'principiante',
          goal: 'hipertrofia',
          days_per_week: 3,
          session_duration: 45,
          equipment: 'mancuernas',
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          registeredAccounts: [...state.registeredAccounts, newAccount],
          currentUser: {
            username: cleanUsername,
            role: 'usuario',
            isAdmin: false,
            accessCode: cleanCode,
            loginTime: new Date().toISOString(),
          },
          isAuthenticated: true,
          profile: newProfile,
          isOnboarded: false, // New users will do onboarding
          error: null,
        }));

        return { success: true };
      },

      logout: () => {
        try {
          fbLogout();
        } catch {
          // ignore
        }
        set({
          currentUser: null,
          isAuthenticated: false,
          error: null,
        });
      },

      createAdminCode: (newCode) => {
        const clean = newCode.trim().toUpperCase();
        if (!clean) return false;
        const current = get().adminAccessCodes;
        if (current.includes(clean)) return false;
        set({ adminAccessCodes: [clean, ...current] });
        return true;
      },

      deleteAdminCode: (codeToDelete) => {
        set((state) => ({
          adminAccessCodes: state.adminAccessCodes.filter((c) => c !== codeToDelete),
        }));
      },

      assignRoutineToAccount: async (username, routineId) => {
        const user = get().currentUser;
        const account = get().registeredAccounts.find((item) => item.username.toLowerCase() === username.toLowerCase());
        if (!user?.uid || !account?.profileId) {
          const message = 'Actualiza la lista de usuarios y entra con una cuenta de Firebase para asignar rutinas.';
          set({ accountsSyncError: message });
          throw new Error(message);
        }
        if (!user.isAdmin && account.profileId !== user.uid) throw new Error('No puedes asignar rutinas a otra cuenta.');
        try {
          await assignCloudRoutine(account.profileId, routineId);
          if (get().currentUser?.uid !== user.uid) return;
          set((state) => ({
            accountsSyncError: null,
            registeredAccounts: state.registeredAccounts.map((item) => item.profileId === account.profileId
              ? { ...item, assignedRoutineId: routineId } : item),
          }));
        } catch (error) {
          if (get().currentUser?.uid === user.uid) set({ accountsSyncError: 'No se pudo guardar la asignación en Internet. Reintenta.' });
          throw error;
        }
      },

      createAccountByAdmin: (accountData) => {
        const cleanUsername = accountData.username.trim();
        if (!cleanUsername) {
          return { success: false, message: 'Ingresa un nombre de usuario válido.' };
        }

        const existing = get().registeredAccounts.find(
          (acc) => acc.username.toLowerCase() === cleanUsername.toLowerCase()
        );

        if (existing) {
          return { success: false, message: 'El usuario ya existe en el sistema.' };
        }

        const activeCodes = get().adminAccessCodes;
        const code = (accountData.accessCode && accountData.accessCode.trim()) || activeCodes[0] || 'FITPLAN2026';
        const profileId = 'usr-' + Math.random().toString(36).substring(2, 9);

        const newAccount: UserAccount = {
          username: cleanUsername,
          password: accountData.password || '123456',
          accessCode: code,
          createdAt: new Date().toISOString(),
          profileId,
          assignedRoutineId: accountData.assignedRoutineId,
          fullName: accountData.fullName || cleanUsername,
        };

        set((state) => ({
          registeredAccounts: [newAccount, ...state.registeredAccounts],
        }));

        return { success: true };
      },

      deleteAccount: (username) => {
        set((state) => ({
          registeredAccounts: state.registeredAccounts.filter(
            (acc) => acc.username.toLowerCase() !== username.toLowerCase()
          ),
        }));
      },

      setProfile: async (profileData) => {
        const current = get().profile || {
          id: 'usr-' + Date.now(),
          name: get().currentUser?.username || 'Atleta',
          level: 'intermedio' as Difficulty,
          goal: 'resistencia' as Goal,
          days_per_week: 3,
          session_duration: 60,
          equipment: 'gimnasio' as Equipment,
        };
        const updated: Profile = { ...current, ...profileData };
        set({ profile: updated });

        if (isSupabaseConfigured) {
          try {
            await supabase.from('profiles').upsert({
              id: updated.id,
              name: updated.name,
              age: updated.age,
              weight: updated.weight,
              height: updated.height,
              level: updated.level,
              goal: updated.goal,
              days_per_week: updated.days_per_week,
              session_duration: updated.session_duration,
              equipment: updated.equipment,
            });
          } catch (err) {
            console.warn('Could not sync profile to Supabase:', err);
          }
        }
      },

      completeOnboarding: async (data) => {
        set({ isLoading: true, error: null });
        const currentAccount = get().currentUser;
        const newProfile: Profile = {
          id: get().profile?.id || 'usr-' + Math.random().toString(36).substring(2, 9),
          name: data.name?.trim() || currentAccount?.username || 'Atleta',
          level: data.level || 'principiante',
          goal: data.goal,
          days_per_week: data.days_per_week,
          session_duration: data.session_duration,
          equipment: data.equipment,
          age: data.age,
          weight: data.weight,
          height: data.height,
          created_at: new Date().toISOString(),
        };

        set({ profile: newProfile, isOnboarded: true, isLoading: false });

        if (isSupabaseConfigured) {
          try {
            await supabase.from('profiles').upsert({
              id: newProfile.id,
              name: newProfile.name,
              age: newProfile.age,
              weight: newProfile.weight,
              height: newProfile.height,
              level: newProfile.level,
              goal: newProfile.goal,
              days_per_week: newProfile.days_per_week,
              created_at: newProfile.created_at,
            });
          } catch (e) {
            console.warn('Supabase profile save error:', e);
          }
        }

        return newProfile;
      },

      resetUser: () => {
        set({
          profile: null,
          isOnboarded: false,
          error: null,
        });
      },

      syncWithSupabase: async () => {
        if (!isSupabaseConfigured) return;
        const currentProfile = get().profile;
        if (!currentProfile) return;

        set({ isLoading: true });
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentProfile.id)
            .single();

          if (data && !error) {
            set({
              profile: {
                ...currentProfile,
                name: data.name || currentProfile.name,
                level: data.level || currentProfile.level,
                goal: data.goal || currentProfile.goal,
                days_per_week: data.days_per_week || currentProfile.days_per_week,
              },
              isLoading: false,
            });
          } else {
            set({ isLoading: false });
          }
        } catch {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'fitplan_user_storage',
    }
  )
);
