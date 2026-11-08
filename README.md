# ניוזלטר שיתופי · חותם

כלי למפגשים חיים: מנחה פותח ניוזלטר, המשתתפים כותבים מהטלפון, והכתבות עולות למסך ההקרנה בזמן אמת.

- לקוח: Vite + React, נפרס ל-GitHub Pages בהרצת `./deploy.sh` (ענף gh-pages).
- שרת: Supabase (פרויקט hotamnemi), כל האובייקטים בקידומת `nl_`. הסכמה ב-`supabase/schema.sql`.
- AI: Edge Function `nl-ai` מול Gemini. הסוד `GEMINI_API_KEY` מוגדר ב-Supabase בלבד.
- בדיקות: `node tests/crossword.test.mjs`, `node tests/api.test.mjs`.

המפתח ב-`.env.production` הוא המפתח הציבורי (publishable) של Supabase. מותר שיהיה בריפו.
