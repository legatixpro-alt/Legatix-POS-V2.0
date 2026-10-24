import React, { useState } from 'react';
import { Lock, User, AlertCircle, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PWAInstallButton } from './PWAInstallButton';
import { isUserBlocked, recordFailedAttempt, resetFailedAttempts } from '../utils/securityManager';

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translateAuthError = (message: string): string => {
    if (!message) return 'Ocurrió un error en la autenticación.';
    const lower = message.toLowerCase();

    if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
      return 'Credenciales incorrectas. Verifica tu correo y contraseña.';
    }
    if (lower.includes('email not confirmed')) {
      return 'Tu cuenta requiere confirmación de correo. Revisa tu bandeja de entrada o spam.';
    }
    if (lower.includes('security purposes') || lower.includes('rate limit')) {
      return 'Por motivos de seguridad, debes esperar unos segundos antes de intentar nuevamente.';
    }
    if (lower.includes('network') || lower.includes('failed to fetch')) {
      return 'Error de conexión con el servidor. Verifica tu conexión a internet.';
    }
    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Por favor, ingresa un correo electrónico válido.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    // 1. Verificación previa de seguridad: ¿Usuario bloqueado?
    if (isUserBlocked(cleanEmail)) {
      setError('USUARIO BLOQUEADO: Se superó el límite de 3 intentos fallidos. Comunícate con el servicio técnico para el desbloqueo.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        // Registrar intento fallido
        const { isNowBlocked, remainingAttempts } = recordFailedAttempt(cleanEmail);
        if (isNowBlocked) {
          setError('USUARIO BLOQUEADO: Has colocado 3 veces mal la contraseña. Tu usuario ha sido bloqueado por seguridad. Comunícate con el servicio técnico.');
        } else {
          setError(`Contraseña incorrecta. Te quedan ${remainingAttempts} intento(s) antes de que la cuenta sea bloqueada.`);
        }
        return;
      }

      if (data?.session) {
        resetFailedAttempts(cleanEmail);
        onLogin();
      }
    } catch (err: any) {
      setError(translateAuthError(err?.message || 'Error al iniciar sesión'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#090A0D] text-white w-full overflow-y-auto">
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 pb-20 w-full max-w-md mx-auto my-auto">
        
        {/* Emblem - Moneda Dorada Legatix recortada sin fondo */}
        <div 
          className="w-28 h-28 sm:w-32 sm:h-32 mb-4 rounded-full shadow-[0_0_45px_rgba(212,175,55,0.5)] flex items-center justify-center relative shrink-0 border-2 border-[#D4AF37] overflow-hidden bg-black"
        >
          <img 
            src="/legatix-coin.jpg" 
            alt="Legatix Coin" 
            className="w-full h-full object-cover scale-[1.24] pointer-events-none select-none"
          />
        </div>

        {/* Legatix Title */}
        <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF0BA] via-[#D4AF37] to-[#A88120] tracking-wider mb-1 text-center font-display drop-shadow-[0_0_15px_rgba(212,175,55,0.35)]">
          LEGATIX
        </h1>
        <p className="text-[10px] sm:text-[11px] text-[#A0A5B5] font-mono tracking-widest uppercase mb-6 text-center">
          El estándar definitivo
        </p>

        {/* Form Container */}
        <div className="w-full bg-[#111216] border border-[#D4AF37]/40 p-5 sm:p-6 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-md animate-fadeIn">
          
          <div className="mb-4 text-center">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Iniciar Sesión
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {error && (
              <div className={`p-3 rounded-xl flex items-start gap-2.5 text-xs ${
                error.includes('BLOQUEADO') 
                  ? 'bg-red-500/20 border-2 border-red-500 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse'
                  : 'bg-red-500/10 border border-red-500/50 text-red-400'
              }`}>
                {error.includes('BLOQUEADO') ? (
                  <ShieldAlert size={20} className="shrink-0 text-red-400 mt-0.5" />
                ) : (
                  <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />
                )}
                <div className="leading-relaxed font-mono">
                  {error}
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 font-mono">
                CORREO ELECTRÓNICO:
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-[#D4AF37]/70" size={16} />
                <input
                  type="email"
                  required
                  placeholder="usuario@minegocio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0D0E12] border border-[#232530] focus:border-[#D4AF37] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 outline-none font-mono transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 font-mono">
                CONTRASEÑA:
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-[#D4AF37]/70" size={16} />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0D0E12] border border-[#232530] focus:border-[#D4AF37] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 outline-none font-mono transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 gold-gradient-btn hover:brightness-110 active:scale-95 text-black py-3 rounded-xl text-xs font-black tracking-widest uppercase shadow-[0_0_20px_rgba(212,175,55,0.35)] transition-all font-mono disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Verificando credenciales...' : 'Ingresar al Sistema'}
            </button>

          </form>
        </div>

        {/* Instalar como app nativa */}
        <div className="w-full">
          <PWAInstallButton />
        </div>

      </div>

      <div className="py-4 text-center">
        <p className="text-[10px] text-gray-500 font-mono">
          © {new Date().getFullYear()} LEGATIX • SISTEMA FINANCIERO SEGURO
        </p>
      </div>

    </div>
  );
};
