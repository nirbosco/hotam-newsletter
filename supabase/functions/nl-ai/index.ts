// nl-ai · כלי ה-AI של הניוזלטר השיתופי
// פעולות: headline, improve, crossword, image
// סודות: GEMINI_API_KEY. אופציונלי: NL_TEXT_MODEL, NL_IMAGE_MODEL
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";
const TEXT_MODEL = Deno.env.get("NL_TEXT_MODEL") ?? "gemini-2.5-flash";
const IMAGE_MODEL = Deno.env.get("NL_IMAGE_MODEL") ?? "gemini-2.5-flash-image";
const KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const AUDIENCE =
  "הקהל: משתתפים במפגש חינוכי (תלמידים, מורים, אנשי חינוך) שכותבים יחד ניוזלטר. התוכן מוקרן על מסך לכל הקבוצה, ולכן חייב להתאים לבית ספר: מכבד, בלי אלימות, בלי תוכן מיני, בלי פגיעה באנשים או בקבוצות.";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

async function gemini(model: string, body: unknown) {
  const r = await fetch(`${GEMINI}/${model}:generateContent?key=${KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`gemini_${r.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

function textOf(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: any) => p.text ?? "").join("").trim();
}

async function askJson(prompt: string, schema: unknown, temperature = 0.8) {
  const data = await gemini(TEXT_MODEL, {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature },
  });
  const t = textOf(data);
  if (!t) throw new Error("empty_or_blocked");
  return JSON.parse(t);
}

// ===== פעולות =====
async function headline(text: string) {
  const out = await askJson(
    `${AUDIENCE}
הנה כתבה לניוזלטר. הצע שלוש כותרות קצרות וקולעות בעברית (עד 8 מילים כל אחת). עברית טבעית, כמו שעיתונאי ישראלי היה כותב, בלי תרגום מאנגלית, בלי סימני קריאה ובלי מירכאות.

הכתבה:
${text.slice(0, 6000)}`,
    { type: "object", properties: { titles: { type: "array", items: { type: "string" } } }, required: ["titles"] },
  );
  const titles = (out.titles ?? []).map((s: string) => s.replace(/^["'״]+|["'״]+$/g, "").trim()).filter(Boolean).slice(0, 3);
  if (!titles.length) throw new Error("no_titles");
  return { titles };
}

async function improve(html: string) {
  const out = await askJson(
    `${AUDIENCE}
אתה עורך לשון של ניוזלטר. ערוך את הטקסט הבא: תקן שגיאות כתיב, דקדוק ופיסוק, והפוך אותו לזורם וקריא יותר. שמור על הקול, על התוכן ועל האורך של הכותבים. אל תוסיף עובדות, אל תוסיף כותרת ואל תוסיף סיכום. עברית טבעית ולא מתורגמת.
החזר HTML פשוט בלבד, עם התגים p, strong, em, ul, ol, li, blockquote. שמור תמונות (img) וציטוטים במקומם.

הטקסט:
${html.slice(0, 20000)}`,
    { type: "object", properties: { html: { type: "string" } }, required: ["html"] },
    0.4,
  );
  const clean = String(out.html ?? "").replace(/```html|```/g, "").trim();
  if (!clean) throw new Error("empty");
  return { html: clean };
}

const HEB = /^[א-ת]+$/;
async function crossword(topic: string, count: number) {
  const n = Math.min(Math.max(count || 8, 5), 12);
  for (let attempt = 0; attempt < 2; attempt++) {
    const out = await askJson(
      `${AUDIENCE}
צור ${n + 4} מילים לתשבץ בעברית בנושא: "${topic.slice(0, 200)}".
כללים למילים: מילה אחת בלבד (בלי רווחים, בלי מקפים, בלי ניקוד, בלי גרשיים), באורך 3 עד 9 אותיות, מילים מוכרות ולא נדירות, ובלי חזרות.
לכל מילה כתוב הגדרה קצרה וברורה בעברית (עד 8 מילים) שלא מכילה את המילה עצמה או את השורש שלה.`,
      {
        type: "object",
        properties: { words: { type: "array", items: { type: "object", properties: { word: { type: "string" }, clue: { type: "string" } }, required: ["word", "clue"] } } },
        required: ["words"],
      },
      0.9,
    );
    const seen = new Set<string>();
    const words = (out.words ?? [])
      .map((w: any) => ({ word: String(w.word ?? "").replace(/[֑-ׇ"'׳״\s-]/g, ""), clue: String(w.clue ?? "").trim() }))
      .filter((w: any) => HEB.test(w.word) && w.word.length >= 2 && w.word.length <= 12 && w.clue && !w.clue.includes(w.word))
      .filter((w: any) => (seen.has(w.word) ? false : (seen.add(w.word), true)));
    if (words.length >= 5) return { words: words.slice(0, n + 2) };
  }
  throw new Error("not_enough_words");
}

const STYLES: Record<string, string> = {
  realistic: "צילום ריאליסטי איכותי, תאורה טבעית",
  illustration: "איור דיגיטלי צבעוני ונקי",
  cartoon: "קריקטורה עיתונאית, קו חד והומור עדין",
  watercolor: "ציור בצבעי מים",
  "3d": "הדמיה תלת ממדית רכה",
};

async function image(prompt: string, style: string, workspaceId: string) {
  const styleText = STYLES[style] ?? STYLES.illustration;
  const data = await gemini(IMAGE_MODEL, {
    contents: [{
      role: "user",
      parts: [{ text: `${AUDIENCE}\nצור תמונה אחת לניוזלטר. סגנון: ${styleText}. בלי טקסט כתוב בתוך התמונה. יחס רוחב לגובה 4:3.\nהתיאור: ${prompt.slice(0, 1500)}` }],
    }],
    generationConfig: { responseModalities: ["IMAGE"] },
  });
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p: any) => p.inlineData?.data || p.inline_data?.data);
  if (!img) throw new Error("blocked_or_empty");
  const inline = img.inlineData ?? img.inline_data;
  const mime = inline.mimeType ?? inline.mime_type ?? "image/png";
  const ext = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
  const bytes = Uint8Array.from(atob(inline.data), (c) => c.charCodeAt(0));
  const path = `ai/${workspaceId}/${crypto.randomUUID()}.${ext}`;
  const up = await admin.storage.from("nl-media").upload(path, bytes, { contentType: mime, upsert: false });
  if (up.error) throw new Error("upload_failed: " + up.error.message);
  return { url: admin.storage.from("nl-media").getPublicUrl(path).data.publicUrl };
}

// ===== שרת =====
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!KEY) return json({ error: "not_configured" }, 503);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const { action, code } = body ?? {};
  if (!code || !action) return json({ error: "bad_request" }, 400);

  const kind = action === "image" ? "image" : "text";
  const { data: gate, error } = await admin.rpc("nl_ai_consume", { p_code: code, p_kind: kind });
  if (error) return json({ error: "gate_failed" }, 500);
  if (!gate?.ok) return json({ error: gate?.reason ?? "denied" }, gate?.reason === "not_found" ? 404 : 429);

  try {
    switch (action) {
      case "headline": return json(await headline(String(body.text ?? "")));
      case "improve": return json(await improve(String(body.html ?? "")));
      case "crossword": return json(await crossword(String(body.topic ?? ""), Number(body.count)));
      case "image": return json(await image(String(body.prompt ?? ""), String(body.style ?? ""), gate.workspace_id));
      default: return json({ error: "unknown_action" }, 400);
    }
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    console.error(action, msg);
    const blocked = /blocked|SAFETY|PROHIBITED/i.test(msg);
    return json({ error: blocked ? "blocked" : "ai_failed", detail: msg.slice(0, 200) }, blocked ? 422 : 502);
  }
});
