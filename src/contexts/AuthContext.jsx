import { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function register(displayName, email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: displayName.trim() });
    await set(ref(db, `users/${cred.user.uid}/stats`), {
      gamesPlayed: 0, gamesWon: 0, totalDistance: 0, currentStreak: 0, bestStreak: 0,
    });
    setUser({ ...cred.user, displayName: displayName.trim() });
  }

  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
  }

  const value = { user, loading, register, login, logout, mapError };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
