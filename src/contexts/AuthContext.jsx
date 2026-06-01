import { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { ref, set, update, remove, get, onValue } from 'firebase/database';
import emailjs from '@emailjs/browser';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

const ERROR_MAP = {
  'auth/email-already-in-use': 'Diese E-Mail ist bereits registriert.',
  'auth/invalid-email': 'Ungültige E-Mail-Adresse.',
  'auth/weak-password': 'Passwort ist zu schwach (mind. 6 Zeichen).',
  'auth/user-not-found': 'Kein Konto mit dieser E-Mail gefunden.',
  'auth/wrong-password': 'Falsches Passwort.',
  'auth/invalid-credential': 'E-Mail oder Passwort falsch.',
  'auth/too-many-requests': 'Zu viele Versuche. Kurz warten.',
  'auth/network-request-failed': 'Kein Internet. Verbindung prüfen.',
};
function mapError(err) {
  return ERROR_MAP[err.code] || 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // null = loading, true = verified (or existing user), false = needs verification
  const [emailVerified, setEmailVerified] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setEmailVerified(null);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Reactive listener on users/{uid}/emailVerified
  useEffect(() => {
    if (!user) { setEmailVerified(null); return; }
    const unsub = onValue(ref(db, `users/${user.uid}/emailVerified`), (snap) => {
      const val = snap.val();
      // null/undefined = existing user created before this feature → treat as verified
      setEmailVerified(val === null || val === undefined ? true : Boolean(val));
    });
    return unsub;
  }, [user]);

  async function sendVerificationCode(uid, email, displayName) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const timeStr = new Date(expiresAt).toLocaleTimeString('de-DE', {
      hour: '2-digit', minute: '2-digit',
    });

    await set(ref(db, `pendingVerifications/${uid}`), { code, expiresAt });

    await emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      {
        to_email: email,
        to_name: displayName || 'Spieler',
        passcode: code,
        time: timeStr,
      },
      { publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY },
    );
  }

  async function verifyCode(enteredCode) {
    if (!user) return false;
    const snap = await get(ref(db, `pendingVerifications/${user.uid}`));
    const pending = snap.val();
    if (!pending) return false;
    if (Date.now() > pending.expiresAt) return false;
    if (pending.code !== enteredCode) return false;

    await Promise.all([
      update(ref(db, `users/${user.uid}`), { emailVerified: true }),
      remove(ref(db, `pendingVerifications/${user.uid}`)),
    ]);
    return true;
  }

  async function register(displayName, email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: displayName.trim() });
    await Promise.all([
      set(ref(db, `users/${cred.user.uid}/stats`), {
        gamesPlayed: 0, gamesWon: 0, totalDistance: 0, currentStreak: 0, bestStreak: 0,
      }),
      update(ref(db, `users/${cred.user.uid}`), { emailVerified: false }),
    ]);
    await sendVerificationCode(cred.user.uid, email, displayName.trim());
    setUser({ ...cred.user, displayName: displayName.trim() });
  }

  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
  }

  const value = {
    user, loading, emailVerified,
    register, login, logout, mapError,
    sendVerificationCode, verifyCode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
