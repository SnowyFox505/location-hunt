import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, set } from 'firebase/database';
import { db } from '../firebase';
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

const GLASS = {
  background: 'rgba(22,27,34,0.72)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(48,54,61,0.8)',
  borderRadius: 16,
};

export default function SettingsPage() {
  const { user, deleteAccount } = useAuth();
  const { profile, saveDisplayName, saveColor, savePhoto, removePhoto } = useUserProfile(user?.uid);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteAccount();
      navigate('/auth', { replace: true });
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        alert('Sicherheitshinweis: Bitte melde dich ab und erneut an, dann kannst du dein Konto löschen.');
      }
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  async function handleResetStats() {
    await set(ref(db, `users/${user.uid}/stats`), {
      gamesPlayed: 0, gamesWon: 0, totalDistance: 0, currentStreak: 0, bestStreak: 0,
    });
    setConfirmReset(false);
  }

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
    <div style={{
      position: 'fixed', inset: 0,
      backgroundImage: 'url(/bg-home.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }}>
      {/* Dark gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(160deg, rgba(13,17,23,0.45) 0%, rgba(13,17,23,0.72) 50%, rgba(13,17,23,0.92) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Scrollable content */}
      <div
        className="pt-safe relative flex flex-col h-full px-4 py-6 max-w-sm mx-auto w-full overflow-y-auto"
        style={{ zIndex: 1 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22, lineHeight: 1 }}
            className="cursor-pointer"
          >
            ←
          </button>
          <h1 className="text-white text-xl font-bold" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>
            Profil
          </h1>
        </div>

        {/* Avatar preview */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            border: `3px solid ${color}`,
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(22,27,34,0.85)',
            boxShadow: `0 0 0 4px ${color}33`,
            backdropFilter: 'blur(8px)',
          }}>
            {photoPreview
              ? <img src={photoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Profilbild" />
              : <span style={{ color: 'white', fontWeight: 'bold', fontSize: 34 }}>{initials}</span>
            }
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-semibold cursor-pointer hover:opacity-80 transition-opacity"
              style={{ color: '#60a5fa' }}
            >
              {photoPreview ? 'Foto ändern' : 'Foto hochladen'}
            </button>
            {photoPreview && (
              <button
                onClick={handleRemovePhoto}
                className="text-sm font-semibold cursor-pointer hover:opacity-80 transition-opacity"
                style={{ color: '#f87171' }}
              >
                Entfernen
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
        </div>

        {/* Name */}
        <div className="mb-5">
          <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: 500, display: 'block', marginBottom: 8 }}>
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            placeholder="Dein Name"
            style={{
              ...GLASS,
              width: '100%', padding: '12px 16px',
              color: 'white', outline: 'none',
              caretColor: '#3B82F6',
              fontSize: '1rem',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(59,130,246,0.8)')}
            onBlur={(e) => (e.target.style.borderColor = 'rgba(48,54,61,0.8)')}
          />
        </div>

        {/* Color picker */}
        <div className="mb-8">
          <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: 500, display: 'block', marginBottom: 12 }}>
            Statusfarbe
          </label>
          <div style={{ ...GLASS, padding: '16px', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  background: c,
                  width: 44, height: 44, borderRadius: '50%',
                  border: c === color ? '3px solid white' : '3px solid transparent',
                  boxShadow: c === color ? `0 0 0 2px ${c}` : 'none',
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>

        {/* Stats */}
        {profile?.stats && (
          <div className="mb-6">
            {/* Header row with reset button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: 500 }}>
                Statistiken
              </label>
              {!confirmReset ? (
                <button
                  onClick={() => setConfirmReset(true)}
                  style={{ color: 'rgba(239,68,68,0.7)', fontSize: '0.72rem', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                >
                  Zurücksetzen
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>Wirklich?</span>
                  <button
                    onClick={handleResetStats}
                    style={{ color: '#EF4444', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                  >
                    Ja
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                  >
                    Nein
                  </button>
                </div>
              )}
            </div>

            {/* 2×2 grid: Spiele, Siege, Strecke + placeholder */}
            <div style={{ ...GLASS, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '14px', marginBottom: 8 }}>
              {[
                { icon: '🎮', value: profile.stats.gamesPlayed ?? 0, label: 'Spiele' },
                { icon: '🏆', value: profile.stats.gamesWon ?? 0, label: 'Siege' },
                { icon: '🏃', value: `${((profile.stats.totalDistance ?? 0) / 1000).toFixed(1)} km`, label: 'Strecke' },
              ].map(({ icon, value, label }) => (
                <div key={label} style={{ textAlign: 'center', padding: '6px 2px' }}>
                  <div style={{ fontSize: '1.3rem', marginBottom: 3 }}>{icon}</div>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>{value}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Streak — full width with clear labels */}
            <div style={{ ...GLASS, padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: '1.1rem' }}>🔥</span>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Hider-Serie (nicht gefangen)
                </span>
              </div>
              <div style={{ display: 'flex', gap: 0 }}>
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(48,54,61,0.8)', paddingRight: 8 }}>
                  <div style={{ color: 'white', fontWeight: 700, fontSize: '1.6rem', lineHeight: 1 }}>{profile.stats.currentStreak ?? 0}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Aktuell</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', paddingLeft: 8 }}>
                  <div style={{ color: '#EAB308', fontWeight: 700, fontSize: '1.6rem', lineHeight: 1 }}>{profile.stats.bestStreak ?? 0}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.62rem', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Rekord</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            fontWeight: 700,
            padding: '14px',
            borderRadius: 14,
            cursor: 'pointer',
            opacity: saving ? 0.5 : 1,
            background: saved ? '#22C55E' : '#3B82F6',
            color: 'white',
            fontSize: '1rem',
            border: 'none',
            boxShadow: saved ? '0 4px 20px rgba(34,197,94,0.4)' : '0 4px 20px rgba(59,130,246,0.4)',
            transition: 'background 0.2s, box-shadow 0.2s',
          }}
        >
          {saved ? '✓ Gespeichert' : saving ? 'Speichert…' : 'Speichern'}
        </button>

        {/* Delete account button */}
        <button
          onClick={() => setShowDeleteModal(true)}
          style={{
            width: '100%', marginTop: 12,
            fontWeight: 600, padding: '13px',
            borderRadius: 14, cursor: 'pointer',
            background: 'rgba(239,68,68,0.08)',
            color: 'rgba(239,68,68,0.7)',
            fontSize: '0.95rem',
            border: '1px solid rgba(239,68,68,0.2)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#EF4444'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = 'rgba(239,68,68,0.7)'; }}
        >
          Konto löschen
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div
          onClick={() => !deleting && setShowDeleteModal(false)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 360,
              backgroundColor: '#161B22',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 20, padding: '28px 24px',
              animation: 'fadeInUp 0.25s ease both',
            }}
          >
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 16 }}>⚠️</div>
            <h2 style={{ color: '#E6EDF3', fontWeight: 700, fontSize: '1.15rem', textAlign: 'center', marginBottom: 10 }}>
              Konto wirklich löschen?
            </h2>
            <p style={{ color: '#8B949E', fontSize: '0.875rem', textAlign: 'center', lineHeight: 1.5, marginBottom: 24 }}>
              Dein Konto, alle gespeicherten Zonen und Statistiken werden <strong style={{ color: '#E6EDF3' }}>unwiderruflich</strong> gelöscht.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{
                  flex: 1, padding: '13px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.06)',
                  color: '#8B949E', fontWeight: 600,
                  border: '1px solid #30363D', cursor: 'pointer', fontSize: '0.95rem',
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{
                  flex: 1, padding: '13px', borderRadius: 12,
                  background: deleting ? 'rgba(239,68,68,0.4)' : '#EF4444',
                  color: 'white', fontWeight: 700,
                  border: 'none', cursor: deleting ? 'default' : 'pointer',
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 16px rgba(239,68,68,0.35)',
                  transition: 'background 0.2s',
                }}
              >
                {deleting ? 'Löschen…' : 'Ja, löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
