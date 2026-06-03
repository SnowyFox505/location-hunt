import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';

export const DEFAULT_COLOR = '#3B82F6';

export function useUserProfile(uid) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!uid) return;
    const unsub = onValue(ref(db, `users/${uid}`), (snap) => {
      setProfile(snap.val() || {});
    });
    return unsub;
  }, [uid]);

  async function saveDisplayName(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    await updateProfile(auth.currentUser, { displayName: trimmed });
    await update(ref(db, `users/${uid}`), { displayName: trimmed });
  }

  async function saveColor(color) {
    await update(ref(db, `users/${uid}`), { color });
  }

  async function savePhoto(file) {
    const base64 = await compressToBase64(file, 96);
    await update(ref(db, `users/${uid}`), { photoBase64: base64 });
  }

  async function removePhoto() {
    await update(ref(db, `users/${uid}`), { photoBase64: null });
  }

  return { profile, saveDisplayName, saveColor, savePhoto, removePhoto };
}

function compressToBase64(file, size) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = url;
  });
}
