import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, ref } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import OtpInput from '../components/OtpInput';

export default function VerifyEmailPage() {
  const { user, emailVerified, verifyCode, sendVerificationCode } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  // Once we've decided the user legitimately belongs here (emailVerified === false),
  // we set this ref so that subsequent emailVerified changes (caused by the
  // verification itself) never trigger the guard effect. Navigation after
  // successful verification is handled exclusively by the setTimeout below.
  const lockedInRef = useRef(false);

  // Guard effect: runs on every emailVerified change, but only acts before lock-in.
  useEffect(() => {
    if (emailVerified === null) return; // still loading, wait
    if (lockedInRef.current) return;   // user is actively verifying — hands off

    if (!user) { navigate('/auth', { replace: true }); return; }
    if (emailVerified === true) { navigate('/home', { replace: true }); return; }

    // emailVerified === false: user genuinely needs to verify. Lock in.
    lockedInRef.current = true;
  }, [user, emailVerified]);

  // Safety: handle logout at any point
  useEffect(() => {
    if (user === null) navigate('/auth', { replace: true });
  }, [user]);

  // Send a code if none exists or the existing one expired
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
    if (ok) {
      // Let the CSS merge animation play (~2s), then navigate
      setTimeout(() => navigate('/home', { replace: true }), 2500);
    }
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
