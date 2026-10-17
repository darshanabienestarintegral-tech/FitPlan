import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  Check,
  AlertCircle,
  Dumbbell,
  KeyRound,
  UserCheck,
} from 'lucide-react';
import { useUserStore } from '../store/useUserStore';
import { BrandLogo } from '../components/BrandLogo';
import { UserRole } from '../lib/firebase';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const loginFirebase = useUserStore((s) => s.loginFirebase);
  const registerFirebase = useUserStore((s) => s.registerFirebase);
  const registeredAccounts = useUserStore((s) => s.registeredAccounts);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('usuario');
  const [adminPin, setAdminPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMessage('Por favor ingresa tu nombre de usuario.');
      return;
    }

    if (!password) {
      setErrorMessage('Por favor ingresa tu contraseña.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        // Log in using username and password (NO email required)
        const res = await loginFirebase(cleanUsername, password);
        if (res.success) {
          if (res.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/dashboard');
          }
        } else {
          setErrorMessage(res.message || 'Usuario o contraseña incorrectos.');
        }
      } else {
        // Register new user with username and selected role
        if (selectedRole === 'admin' && adminPin.trim() !== '260816') {
          setErrorMessage('Clave maestra de administrador incorrecta. (Usa 260816 para autorizar el rol Administrador)');
          setIsSubmitting(false);
          return;
        }

        const res = await registerFirebase(cleanUsername, password, selectedRole);
        if (res.success) {
          setSuccessMessage(
            `¡Usuario "${cleanUsername}" registrado con éxito como ${
              selectedRole === 'admin' ? 'Administrador' : 'Usuario'
            }!`
          );
          setTimeout(() => {
            if (selectedRole === 'admin') {
              navigate('/admin');
            } else {
              navigate('/dashboard');
            }
          }, 900);
        } else {
          setErrorMessage(res.message || 'Error al registrar el usuario.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error inesperado durante la autenticación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto relative overflow-hidden">
      {/* Brand Header */}
      <header className="pt-4 pb-2 text-center">
        <div className="flex items-center justify-between border-b border-[#EAE3D9] pb-4 mb-3">
          <BrandLogo size="md" showSubtitle={true} />
          <div className="text-right">
            <div className="text-[9px] font-bold tracking-[0.2em] text-[#78716C] uppercase leading-tight font-heading">
              DARSHANA<br />
              FITNESS<br />
              SISTEMA
            </div>
            <div className="w-10 h-[2px] bg-[#9E5325] ml-auto mt-1" />
          </div>
        </div>

        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9E5325] font-heading">
          ACCESO POR USUARIO Y CONTRASEÑA
        </div>
      </header>

      {/* Main Login / Register Card */}
      <main className="my-auto py-2">
        <div className="bg-white border border-[#EAE3D9] rounded-3xl p-6 sm:p-7 shadow-sm">
          <div className="text-center mb-5">
            <h2 className="text-xl sm:text-2xl font-black text-[#1C1917] font-heading uppercase tracking-tight">
              {mode === 'login' ? 'Iniciar Sesión' : 'Nuevo Registro'}
            </h2>
            <p className="text-xs text-[#78716C] mt-1">
              {mode === 'login'
                ? 'Ingresa con tu usuario y contraseña (sin necesidad de correo)'
                : 'Registra tu usuario para figurar en la aplicación con tu rol'}
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 p-1 bg-[#FAF7F2] rounded-2xl mb-4 border border-[#EAE3D9]">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] font-heading uppercase tracking-wider ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white shadow-md'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all min-h-[40px] font-heading uppercase tracking-wider ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-[#9E5325] to-[#7B3A13] text-white shadow-md'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              Nuevo Usuario
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Username Input - ONLY username, NO email */}
            <div>
              <label className="text-xs font-bold text-[#1C1917] block mb-1 uppercase tracking-wide font-heading">
                Nombre de Usuario
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#9E5325] absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej. cristian_aguilera o tu usuario"
                  className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl pl-10 pr-3 py-2.5 text-xs text-[#1C1917] font-semibold focus:outline-none focus:border-[#9E5325]"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="text-xs font-bold text-[#1C1917] block mb-1 uppercase tracking-wide font-heading">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9E5325] absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu clave"
                  className="w-full bg-[#FAF7F2] border border-[#EAE3D9] rounded-xl pl-10 pr-3 py-2.5 text-xs text-[#1C1917] focus:outline-none focus:border-[#9E5325]"
                />
              </div>
            </div>

            {/* Role Selection on Register */}
            {mode === 'register' && (
              <div className="space-y-2 pt-1 animate-fadeIn">
                <label className="text-xs font-black text-[#1C1917] block uppercase tracking-wide font-heading">
                  Selecciona el Rol con el que te Registrarás
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('usuario')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      selectedRole === 'usuario'
                        ? 'border-[#9E5325] bg-[#9E5325]/5 ring-1 ring-[#9E5325]'
                        : 'border-[#EAE3D9] bg-[#FAF7F2]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs uppercase font-heading text-[#1C1917]">
                      <Dumbbell className="w-4 h-4 text-[#9E5325]" />
                      <span>Rol Usuario</span>
                    </div>
                    <p className="text-[10px] text-[#78716C] mt-1 leading-snug">
                      Visualizar rutinas disponibles y entrenar con registro de progreso.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('admin')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      selectedRole === 'admin'
                        ? 'border-[#9E5325] bg-[#9E5325]/5 ring-1 ring-[#9E5325]'
                        : 'border-[#EAE3D9] bg-[#FAF7F2]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs uppercase font-heading text-[#9E5325]">
                      <ShieldCheck className="w-4 h-4 text-[#9E5325]" />
                      <span>Administrador</span>
                    </div>
                    <p className="text-[10px] text-[#78716C] mt-1 leading-snug">
                      Gestión de archivos (PDF), creación y asignación de rutinas.
                    </p>
                  </button>
                </div>

                {selectedRole === 'admin' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 animate-fadeIn">
                    <label className="text-[11px] font-bold text-amber-900 block uppercase font-heading flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-amber-800" />
                      <span>Clave Maestra de Administrador</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value)}
                      placeholder="Ingresa clave (260816)"
                      className="w-full bg-white border border-amber-300 rounded-lg p-2 text-xs font-mono font-bold text-amber-900"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
                <Check className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[46px] bg-gradient-to-r from-[#9E5325] to-[#7B3A13] hover:from-[#8C4318] active:scale-[0.98] text-white font-bold text-xs uppercase tracking-wider font-heading px-4 py-3 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all mt-2"
            >
              <span>{isSubmitting ? 'Verificando...' : mode === 'login' ? 'INGRESAR' : 'REGISTRAR USUARIO'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Helper Note */}
          <div className="mt-4 pt-3 border-t border-[#EAE3D9] text-center">
            <p className="text-[11px] text-[#78716C]">
              {registeredAccounts.length === 0 ? (
                <span>No hay usuarios registrados aún. Registra tu usuario arriba para figurar en la aplicación.</span>
              ) : (
                <span>
                  Hay <strong className="text-[#1C1917]">{registeredAccounts.length}</strong> usuario(s) registrado(s) en el sistema.
                </span>
              )}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-2 text-center text-xs text-[#78716C]">
        <div className="font-script text-xl text-[#9E5325] tracking-wide">
          Más que una rutina, una comunidad.
        </div>
      </footer>
    </div>
  );
};
