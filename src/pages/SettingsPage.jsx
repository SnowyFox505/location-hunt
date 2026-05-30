import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfile, DEFAULT_COLOR } from '../hooks/useUserProfile';

const COLORS = [
  '#3B82F6',
  '#22C55E',
  '#EF4444',
  '#F97316',
  '#A855F7',
  '#EC4899',
  '#EAB308',
  '#06B6D4',
  '#14B8A6',
  '#F43F5E',
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { profile, saveDisplayName, saveColor, savePhoto, removePhoto } = useUserProfile(user?.uid);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.displayName || user?.displayName || '');
    setColor(profile.color || DEFAULT_COLOR);
    if (profile.photoBase64) setPhotoPreview(profile.photoBase64);
  }, [profile]);

  function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function handleRemovePhoto() {
    setPhotoPreview(null);
    setPhotoFile(null);
    await removePhoto();
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (photoFile) await savePhoto(photoFile);
      const currentName = profile?.displayName || user?.displayName || '';
      if (name.trim() && name.trim() !== currentName) await saveDisplayName(name.trim());
      if (color !== (profile?.color || DEFAULT_COLOR)) await saveColor(color);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const initials = (name || '?').slice(0, 2).toUpperCase();

  return (
    <div className="pt-safe flex flex-col min-h-full bg-game-bg px-4 py-6 max-w-sm mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          style={{ color: '#8B949E', fontSize: 22, lineHeight: 1 }}
          className="hover:text-game-text transition-colors cursor-pointer"
        >
          ←
        </button>
        <h1 className="text-game-text text-xl font-bold">Profil</h1>
      </div>

      {/* Avatar preview */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            border: `3px solid ${color}`,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#161B22',
            boxShadow: `0 0 0 4px ${color}22`,
          }}
        >
          {photoPreview
            ? <img src={photoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Profilbild" />
            : <span style={{ color: 'white', fontWeight: 'bold', fontSize: 34 }}>{initials}</span>
          }
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-game-blue text-sm font-semibold cursor-pointer hover:opacity-80 transition-opacity"
          >
            {photoPreview ? 'Foto ändern' : 'Foto hochladen'}
          </button>
          {photoPreview && (
            <button
              onClick={handleRemovePhoto}
              className="text-game-red text-sm font-semibold cursor-pointer hover:opacity-80 transition-opacity"
            >
              Entfernen
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
        />
      </div>

      {/* Name */}
      <div className="mb-6">
        <label className="text-game-muted text-sm font-medium block mb-2">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="Dein Name"
          className="w-full bg-game-card border border-game-border rounded-xl px-4 py-3 text-game-text outline-none"
          style={{ caretColor: '#3B82F6' }}
          onFocus={(e) => (e.target.style.borderColor = '#3B82F6')}
          onBlur={(e) => (e.target.style.borderColor = '#30363D')}
        />
      </div>

      {/* Color picker */}
      <div className="mb-8">
        <label className="text-game-muted text-sm font-medium block mb-3">Statusfarbe</label>
        <div className="flex flex-wrap gap-3">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                background: c,
                width: 44,
                height: 44,
                borderRadius: '50%',
                border: c === color ? '3px solid white' : '3px solid transparent',
                boxShadow: c === color ? `0 0 0 2px ${c}` : 'none',
                transition: 'all 0.15s',
              }}
              className="cursor-pointer"
            />
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full font-bold py-3 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
        style={{ background: saved ? '#22C55E' : '#3B82F6', color: 'white' }}
      >
        {saved ? '✓ Gespeichert' : saving ? 'Speichert…' : 'Speichern'}
      </button>
    </div>
  );
}
