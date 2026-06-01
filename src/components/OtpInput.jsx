import { useState, useRef, useEffect } from 'react';
import './OtpInput.css';

const LEN = 6;

export default function OtpInput({ email, onComplete, onResend }) {
  const [digits, setDigits] = useState(Array(LEN).fill(''));
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [cooldown, setCooldown] = useState(0);
  const refs = useRef([]);

  // Resend cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function submit(code) {
    setStatus('loading');
    onComplete(code).then(ok => {
      if (ok) {
        setStatus('success');
      } else {
        setStatus('error');
        setTimeout(() => {
          setStatus('idle');
          setDigits(Array(LEN).fill(''));
          refs.current[0]?.focus();
        }, 600);
      }
    });
  }

  function handleChange(i, e) {
    if (status !== 'idle') return;
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < LEN - 1) refs.current[i + 1]?.focus();
    if (val && next.every(d => d !== '')) submit(next.join(''));
  }

  function handleKeyDown(i, e) {
    if (status !== 'idle') return;
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e) {
    if (status !== 'idle') return;
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LEN);
    const next = Array(LEN).fill('');
    pasted.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    refs.current[Math.min(pasted.length, LEN - 1)]?.focus();
    if (pasted.length === LEN) submit(pasted);
  }

  function handleResend() {
    if (cooldown > 0 || status !== 'idle') return;
    setCooldown(60);
    onResend();
  }

  const cls = status === 'success' ? 'otp-success'
            : status === 'error'   ? 'otp-error'
            : status === 'loading' ? 'otp-loading'
            : '';

  return (
    <div className={`otp-wrap ${cls}`}>
      <div className="otp-header">
        <h2>{status === 'success' ? 'Erfolgreich verifiziert!' : 'Code eingeben'}</h2>
        <p>
          {status === 'success'
            ? 'Dein Konto ist jetzt verifiziert.'
            : <>Wir haben einen 6-stelligen Code an <strong>{email}</strong> gesendet.</>
          }
        </p>
      </div>

      <div className="otp-digits" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <div key={i} className="otp-box">
            <input
              ref={el => refs.current[i] = el}
              className="otp-input"
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleChange(i, e)}
              onKeyDown={e => handleKeyDown(i, e)}
              readOnly={status !== 'idle'}
              autoFocus={i === 0}
            />
            {i === 0 && (
              <svg viewBox="0 0 24 24" fill="none" className="otp-tick">
                <path
                  className="otp-tick-path"
                  d="M5 13l4 4L19 7"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        ))}
      </div>

      <div className="otp-foot">
        Code nicht erhalten?
        <button onClick={handleResend} disabled={cooldown > 0 || status !== 'idle'}>
          {cooldown > 0 ? `Erneut senden (${cooldown}s)` : 'Erneut senden'}
        </button>
      </div>
    </div>
  );
}
