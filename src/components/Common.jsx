import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Loader2, X } from 'lucide-react';

export function Spinner({ label = 'טוען…' }) {
  return <div className="center-fill"><Loader2 className="spin" size={28} /><span className="muted">{label}</span></div>;
}

export function NotFound({ code }) {
  return (
    <div className="center-fill">
      <h2>לא מצאנו את הניוזלטר</h2>
      <p className="muted">בדקו שהקוד <span className="mono">{code}</span> נכון, או בקשו מהמנחה קישור חדש.</p>
      <a className="btn btn-primary" href="#/">לדף הבית</a>
    </div>
  );
}

export function QR({ text, size = 180 }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(text, { margin: 1, width: size * 2, color: { dark: '#0a1330', light: '#ffffff' } }).then(setSrc).catch(() => {});
  }, [text, size]);
  return src ? <img src={src} width={size} height={size} alt="קוד QR לכניסה" className="qr" /> : <div style={{ width: size, height: size }} />;
}

export function Modal({ onClose, children, wide, label }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose} role="dialog" aria-modal="true" aria-label={label}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <button className="modal-x" onClick={onClose} aria-label="סגירה"><X size={22} /></button>
        {children}
      </div>
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), msg.kind === 'err' ? 5000 : 2500);
    return () => clearTimeout(t);
  }, [msg]);
  const el = msg ? <div className={msg.kind === 'err' ? 'toast-err floating' : 'toast-ok floating'} role="status">{msg.text}</div> : null;
  return [el, (text, kind = 'ok') => setMsg({ text, kind })];
}

export function copy(text) {
  try { navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export const baseUrl = () => window.location.href.split('#')[0].split('?')[0];
