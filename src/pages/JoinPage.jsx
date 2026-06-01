import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import jsQR from 'jsqr';
import { useAuth } from '../contexts/AuthContext';
import { useSession } from '../hooks/useSession';
import Button from '../components/UI/Button';

const GLASS = {
  background: 'rgba(22,27,34,0.72)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(48,54,61,0.8)',
  borderRadius: 16,
  padding: '24px',
};

function QrScanner({ onCode, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const [camError, setCamError] = useState('');

  useEffect(() => {
    let stream = null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scan();
      } catch {
        setCamError('Kamera konnte nicht geöffnet werden. Bitte Berechtigung prüfen.');
      }
    }

    function scan() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
      if (result) {
        const code = result.data.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);
        if (code.length === 6) { onCode(code); return; }
      }
      rafRef.current = requestAnimationFrame(scan);
    }

    start();
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease both' }}
    >
      <p className="text-white font-bold text-lg mb-5">QR-Code scannen</p>

      {camError ? (
        <p className="text-game-red text-sm text-center px-8">{camError}</p>
      ) : (
        <div style={{ position: 'relative', width: 280, height: 280 }}>
          <video ref={videoRef} playsInline muted style={{ display: 'none' }} />
          <canvas ref={canvasRef} style={{ width: 280, height: 280, borderRadius: 16, objectFit: 'cover' }} />
          {/* Scan frame overlay */}
          <div style={{ position: 'absolute', inset: 0, border: '3px solid #3B82F6', borderRadius: 16, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ width: 160, height: 160, border: '2px solid rgba(59,130,246,0.6)', borderRadius: 8 }} />
          </div>
        </div>
      )}

      <p className="text-game-muted text-sm mt-5 mb-6">Halte den QR-Code aus der Lobby in die Kamera</p>
      <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', cursor: 'pointer', background: 'none', border: 'none' }}>
        Abbrechen
      </button>
    </div>
  );
}

export default function JoinPage() {
  const { code: urlCode } = useParams();
  const [code, setCode] = useState(urlCode || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const { user } = useAuth();
  const { joinSession } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (urlCode) setCode(urlCode.toUpperCase());
  }, [urlCode]);

  async function handleJoin() {
    if (!code.trim()) return setError('Bitte gib einen Code ein.');
    setLoading(true);
    setError('');
    try {
      const displayName = user.displayName || user.email?.split('@')[0] || 'Spieler';
      const sessionId = await joinSession(code.trim(), user.uid, displayName);
      navigate(`/lobby/${sessionId}`);
    } catch (err) {
      setError(err.message || 'Fehler beim Beitreten.');
      setLoading(false);
    }
  }

  function handleScanned(scannedCode) {
    setShowScanner(false);
    setCode(scannedCode);
  }

  return (
    <>
      {showScanner && <QrScanner onCode={handleScanned} onClose={() => setShowScanner(false)} />}

      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'url(/bg-home.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, rgba(13,17,23,0.45) 0%, rgba(13,17,23,0.72) 50%, rgba(13,17,23,0.92) 100%)',
          pointerEvents: 'none',
        }} />

        <div className="pt-safe relative flex flex-col h-full px-4 py-6 max-w-sm mx-auto w-full overflow-y-auto" style={{ zIndex: 1 }}>
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => navigate('/home')} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22, lineHeight: 1 }} className="cursor-pointer">←</button>
            <h1 className="text-white font-bold text-xl" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>Spiel beitreten</h1>
          </div>

          <div style={GLASS}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', fontWeight: 500 }}>
                  Session-Code
                </label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                  placeholder="XK92PL"
                  autoComplete="off"
                  style={{
                    background: 'rgba(13,17,23,0.6)',
                    border: '1px solid rgba(48,54,61,0.8)',
                    borderRadius: 12,
                    padding: '16px',
                    color: 'white',
                    letterSpacing: '0.3em',
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    outline: 'none',
                    width: '100%',
                    minHeight: 64,
                    caretColor: '#3B82F6',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(59,130,246,0.8)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(48,54,61,0.8)')}
                />
              </div>

              {/* QR scanner button */}
              <button
                onClick={() => setShowScanner(true)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px', borderRadius: 12,
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.35)',
                  color: '#60A5FA', fontWeight: 600, fontSize: '0.9rem',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 18 }}>📷</span>
                QR-Code scannen
              </button>

              {error && (
                <div
                  key={error}
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.5)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    color: '#fca5a5',
                    fontSize: '0.875rem',
                    animation: 'shake 0.42s ease both',
                  }}
                >
                  {error}
                </div>
              )}

              <Button onClick={handleJoin} disabled={loading || !code.trim()}>
                {loading ? 'Wird beigetreten...' : 'Beitreten'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
