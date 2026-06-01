import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, ref } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import OtpInput from '../components/OtpInput';

export default function VerifyEmailPage() {
  const { user, emailVerified, verifyCode, sendVerificationCode } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  // Guard: redirect if not logged in or already verified
  useEffect(() => {
    if (!user) { navigate('/auth', { replace: true }); return; }
    if (emailVerified === true) { navigate('/home', { replace: true }); return; }
  }, [user, emailVerified]);

  // On mount: send new code only if none exists or the existing one expired
  useEffect(() => {
    if (!user || emailVerified !== false) return;
    (async () => {
      const snap = await get(ref(db, `pendingVerifications/${user.uid}`));
      const pending = snap.val();
      if (!pending || Date.now() > pending.expiresAt) {
        await sendVerificationCode(user.uid, user.email, user.displayName);
      }
      setReady(true);
    })();
  }, [user, emailVerified]);

  async function handleComplete(code) {
    const ok = await verifyCode(code);
    if (ok) setTimeout(() => navigate('/home', { replace: true }), 2500);
    return ok;
  }

  async function handleResend() {
    await sendVerificationCode(user.uid, user.email, user.displayName);
  }

  if (!user || !ready) {
    return (
      <div className="flex items-center justify-center min-h-full bg-game-bg">
        <div className="w-8 h-8 border-2 border-game-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center min-h-full bg-game-bg px-4 py-8"
      style={{ animation: 'slideInUp 0.4s ease both' }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div className="text-center mb-6">
          <img
            src="/logo.png"
            alt="LocationHunt"
            style={{
              width: 56, height: 56, borderRadius: 14, objectFit: 'cover',
              margin: '0 auto 12px',
              boxShadow: '0 6px 24px rgba(59,130,246,0.25)',
            }}
          />
          <h1 className="text-game-text text-2xl font-black">E-Mail bestätigen</h1>
          <p className="text-game-muted text-sm mt-1">Schritt 2 von 2</p>
        </div>

        <OtpInput
          email={user.email}
          onComplete={handleComplete}
          onResend={handleResend}
        />
      </div>
    </div>
  );
}
