import { supabase, isCloudAvailable } from '../lib/supabase';
import { getKV, setKV } from '../lib/storage';

export const SUPER_ADMIN_EMAIL = 'javiercol28@gmail.com';
const STORAGE_KEY_BLOCKED_USERS = 'legatix_blocked_users_v1';
const STORAGE_KEY_ATTEMPTS = 'legatix_login_attempts_v1';
export const SECURITY_EVENT = 'legatix_security_changed';

export interface BlockedUserInfo {
  email: string;
  blockedAt: string;
  reason: string;
  attemptsCount: number;
}

/**
 * Sincroniza la lista de usuarios bloqueados entre localStorage, IndexedDB y Supabase (si la tabla usuarios_bloqueados existe).
 */
export async function syncBlockedUsersFromCloud(): Promise<void> {
  try {
    const rawLocal = localStorage.getItem(STORAGE_KEY_BLOCKED_USERS);
    const localMap: Record<string, BlockedUserInfo> = rawLocal ? JSON.parse(rawLocal) : {};

    // 1. Hidratar desde IndexedDB por si localStorage fue limpiado parcialmente
    const idbMap = await getKV<Record<string, BlockedUserInfo>>(STORAGE_KEY_BLOCKED_USERS, {});
    const mergedMap: Record<string, BlockedUserInfo> = { ...idbMap, ...localMap };

    // 2. Consultar tabla usuarios_bloqueados en Supabase si hay conexión
    if (isCloudAvailable()) {
      const { data, error } = await supabase
        .from('usuarios_bloqueados')
        .select('email, blocked_at, reason, attempts_count');

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          if (row.email && row.email.trim().toLowerCase() !== SUPER_ADMIN_EMAIL) {
            const cleanEmail = row.email.trim().toLowerCase();
            mergedMap[cleanEmail] = {
              email: cleanEmail,
              blockedAt: row.blocked_at || new Date().toISOString(),
              reason: row.reason || 'Superó el límite de 3 intentos fallidos de contraseña',
              attemptsCount: Number(row.attempts_count) || 3,
            };
          }
        }
      }
    }

    localStorage.setItem(STORAGE_KEY_BLOCKED_USERS, JSON.stringify(mergedMap));
    await setKV(STORAGE_KEY_BLOCKED_USERS, mergedMap);
    window.dispatchEvent(new CustomEvent(SECURITY_EVENT));
  } catch {
    // Fallback silencioso si la tabla aún no existe o el navegador está offline
  }
}

/** Comprueba si un usuario (correo) está actualmente bloqueado */
export function isUserBlocked(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  // El Administrador General nunca puede ser bloqueado
  if (clean === SUPER_ADMIN_EMAIL) return false;

  try {
    const raw = localStorage.getItem(STORAGE_KEY_BLOCKED_USERS);
    if (!raw) return false;
    const list: Record<string, BlockedUserInfo> = JSON.parse(raw);
    return Boolean(list[clean]);
  } catch {
    return false;
  }
}

/** Devuelve la lista completa de usuarios actualmente bloqueados */
export function getBlockedUsersList(): BlockedUserInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BLOCKED_USERS);
    if (!raw) return [];
    const list: Record<string, BlockedUserInfo> = JSON.parse(raw);
    return Object.values(list);
  } catch {
    return [];
  }
}

/** Registra un intento fallido de contraseña. Al llegar a 3, bloquea la cuenta local y en la nube. */
export function recordFailedAttempt(email: string): { isNowBlocked: boolean; remainingAttempts: number } {
  const clean = email.trim().toLowerCase();
  if (clean === SUPER_ADMIN_EMAIL) return { isNowBlocked: false, remainingAttempts: 3 };

  try {
    const rawAttempts = localStorage.getItem(STORAGE_KEY_ATTEMPTS);
    const attemptsMap: Record<string, number> = rawAttempts ? JSON.parse(rawAttempts) : {};
    
    const count = (attemptsMap[clean] || 0) + 1;
    attemptsMap[clean] = count;
    localStorage.setItem(STORAGE_KEY_ATTEMPTS, JSON.stringify(attemptsMap));
    setKV(STORAGE_KEY_ATTEMPTS, attemptsMap).catch(() => {});

    if (count >= 3) {
      // Bloquear al usuario
      const rawBlocked = localStorage.getItem(STORAGE_KEY_BLOCKED_USERS);
      const blockedMap: Record<string, BlockedUserInfo> = rawBlocked ? JSON.parse(rawBlocked) : {};
      const blockInfo: BlockedUserInfo = {
        email: clean,
        blockedAt: new Date().toISOString(),
        reason: 'Superó el límite de 3 intentos fallidos de contraseña',
        attemptsCount: count,
      };
      blockedMap[clean] = blockInfo;
      localStorage.setItem(STORAGE_KEY_BLOCKED_USERS, JSON.stringify(blockedMap));
      setKV(STORAGE_KEY_BLOCKED_USERS, blockedMap).catch(() => {});

      if (isCloudAvailable()) {
        Promise.resolve(
          supabase.from('usuarios_bloqueados').upsert(
            [
              {
                email: clean,
                blocked_at: blockInfo.blockedAt,
                reason: blockInfo.reason,
                attempts_count: blockInfo.attemptsCount,
              },
            ],
            { onConflict: 'email' }
          )
        ).catch(() => {});
      }

      window.dispatchEvent(new CustomEvent(SECURITY_EVENT));
      return { isNowBlocked: true, remainingAttempts: 0 };
    }

    return { isNowBlocked: false, remainingAttempts: Math.max(0, 3 - count) };
  } catch (e) {
    console.error('Error registrando intento fallido:', e);
    return { isNowBlocked: false, remainingAttempts: 1 };
  }
}

/** Restablece el contador de intentos fallidos tras un inicio de sesión exitoso */
export function resetFailedAttempts(email: string): void {
  const clean = email.trim().toLowerCase();
  try {
    const rawAttempts = localStorage.getItem(STORAGE_KEY_ATTEMPTS);
    if (rawAttempts) {
      const attemptsMap: Record<string, number> = JSON.parse(rawAttempts);
      delete attemptsMap[clean];
      localStorage.setItem(STORAGE_KEY_ATTEMPTS, JSON.stringify(attemptsMap));
      setKV(STORAGE_KEY_ATTEMPTS, attemptsMap).catch(() => {});
    }
  } catch {}
}

/** 
 * Desbloquea a un usuario. 
 * Solo permitido para el Administrador General (Javiercol28@gmail.com) o sesión con isSuperAdmin.
 */
export function unblockUser(emailToUnblock: string, operatorEmail?: string, isSuperAdmin?: boolean): boolean {
  const op = (operatorEmail || '').trim().toLowerCase();
  const isAllowed = isSuperAdmin || op === SUPER_ADMIN_EMAIL;
  if (!isAllowed) {
    console.warn('Acceso denegado: solo el Administrador General (Javiercol28@gmail.com) puede desbloquear usuarios.');
    return false;
  }

  const clean = emailToUnblock.trim().toLowerCase();
  try {
    const rawBlocked = localStorage.getItem(STORAGE_KEY_BLOCKED_USERS);
    if (rawBlocked) {
      const blockedMap: Record<string, BlockedUserInfo> = JSON.parse(rawBlocked);
      delete blockedMap[clean];
      localStorage.setItem(STORAGE_KEY_BLOCKED_USERS, JSON.stringify(blockedMap));
      setKV(STORAGE_KEY_BLOCKED_USERS, blockedMap).catch(() => {});
    }
    if (isCloudAvailable()) {
      Promise.resolve(
        supabase.from('usuarios_bloqueados').delete().eq('email', clean)
      ).catch(() => {});
    }
    resetFailedAttempts(clean);
    window.dispatchEvent(new CustomEvent(SECURITY_EVENT));
    return true;
  } catch (e) {
    console.error('Error al desbloquear usuario:', e);
    return false;
  }
}
