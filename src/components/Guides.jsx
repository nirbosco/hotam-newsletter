import { useState } from 'react';
import { HelpCircle, PlayCircle } from 'lucide-react';
import { Modal } from './Common.jsx';

// הטקסטים אושרו בידי ניר ב-8.11.2026 (output/ניוזלטר-שיתופי/20-draft/guides-and-video-script.md)

export const VIDEO_SRC = './guide-video.mp4';
export const VIDEO_POSTER = './guide-poster.jpg';

export function ParticipantGuide({ compact }) {
  return (
    <div className={`guide ${compact ? 'compact' : ''}`}>
      <h3>איך כותבים בניוזלטר</h3>
      <ol className="guide-steps">
        <li>נכנסים עם הקוד שעל המסך, או סורקים את ה-QR.</li>
        <li>כותבים את שם הקבוצה ומי בה.</li>
        <li>בוחרים מה לכתוב: כתבה, טור דעה, ראיון, תשבץ, סרטון ועוד.</li>
        <li>כותבים. אם רוצים, ה-AI מציע כותרת, מתקן ניסוח או יוצר תמונה.</li>
        <li>לוחצים על "פרסום בניוזלטר", והכתבה עולה למסך מול כולם.</li>
      </ol>
      <h4>כדאי לדעת</h4>
      <ul className="guide-tips">
        <li>הטיוטה נשמרת בטלפון, גם אם יצאתם באמצע.</li>
        <li>אפשר לתקן כתבה אחרי שפרסמתם אותה.</li>
        <li>בניוזלטר אפשר לפתוח כל כתבה, לעשות לייק ולהגיב.</li>
      </ul>
    </div>
  );
}

export function FacilitatorGuide() {
  return (
    <div className="guide">
      <h3>מדריך למנחים</h3>
      <div className="guide-phases">
        <section>
          <h4>לפני המפגש</h4>
          <ol className="guide-steps" start={1}>
            <li>פותחים ניוזלטר בדף הבית, נותנים לו שם ובוחרים עיצוב.</li>
            <li>שומרים את קישור הניהול. איתו חוזרים לניהול מכל מחשב.</li>
            <li>בלשונית "עיצוב והגדרות" מחליטים אם להפעיל AI, סרטונים, לייקים ותגובות.</li>
          </ol>
        </section>
        <section>
          <h4>במפגש</h4>
          <ol className="guide-steps" start={4}>
            <li>פותחים את מסך ההקרנה במחשב שמחובר למקרן. הקוד וה-QR מופיעים בפינה.</li>
            <li>המשתתפים סורקים ומתחילים לכתוב. כל כתבה עולה למסך ברגע שהיא מתפרסמת.</li>
            <li>בלשונית "כתבות" רואים מי כבר פרסם. אפשר להסתיר כתבה מהמסך, לשנות את הסדר ולמחוק.</li>
          </ol>
        </section>
        <section>
          <h4>אחרי המפגש</h4>
          <ol className="guide-steps" start={7}>
            <li>מורידים את הניוזלטר כ-PDF ושולחים לקבוצה, יחד עם הקישור.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}

export function GuideVideo() {
  return (
    <div className="guide-video">
      <video src={VIDEO_SRC} poster={VIDEO_POSTER} controls playsInline preload="none">
        <track kind="captions" srcLang="he" label="עברית" src="./guide-video.vtt" default />
      </video>
    </div>
  );
}

// כפתור "איך זה עובד?" למסכי הכתיבה
export function HelpButton({ who = 'participant' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-soft btn-sm" onClick={() => setOpen(true)} aria-label="איך זה עובד?"><HelpCircle size={16} /> <span className="hide-sm">איך זה עובד?</span></button>
      {open && (
        <Modal onClose={() => setOpen(false)} label="איך זה עובד" wide>
          {who === 'participant' ? <ParticipantGuide /> : <FacilitatorGuide />}
          <h4 className="guide-video-title"><PlayCircle size={18} /> סרטון הסבר (דקה)</h4>
          <GuideVideo />
        </Modal>
      )}
    </>
  );
}
