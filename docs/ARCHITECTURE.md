# ארכיטקטורה

## מבנה

```
src/app/(auth)/          התחברות והרשמה
src/app/(workspace)/     האפליקציה (אחרי התחברות): home, guests, decisions, date, budget, vendors, tasks, timeline, settings
src/app/rsvp/[token]/    עמוד אישור הגעה ציבורי (בלי התחברות, סוד בקישור)
src/app/join/[token]/    הצטרפות בן/בת זוג להזמנה
src/app/actions/         Server Actions (כל אחת קוראת requireWorkspace ומצמצמת לפי weddingId)
src/components/          רכיבי UI (ui/ = בסיס, guests/, decisions/ ...)
src/db/                  סכמת Drizzle, חיבור, מיגרציות
src/lib/                 לוגיקה טהורה עם מבחנים (guests, decisions, budget, tasks, hebrew-calendar, plan-schedule, csv, phone, messages) ושירותים (wedding-service, session, queries)
src/data/                תבניות: משימות, החלטות, לו״ז, תקציב, ערים
drizzle/                 מיגרציות SQL (לא עורכים אחרי שהוחלו)
tools/whatsapp-pull/     כלי מקומי (לא חלק מהאפליקציה) שמכין קובץ שיחות וואטסאפ אחרונות לייבוא אורחים; תלויות משלו
```

## עקרונות

- **השרת הוא השער.** כל דף קורא `requireWorkspace()`. כל Server Action קורא אותה שוב ומוסיף `weddingId` לכל שאילתה, ולכן מזהה של חתונה אחרת פשוט לא נמצא. אין סיבה להאמין ל-UI.
- **לוגיקה טהורה בנפרד** (`src/lib`), עם Vitest, בלי DB ובלי Next. רק `wedding-service` ו-`schema` נבדקים מול PGlite.
- **תאריכים הם מחרוזות ISO** (`YYYY-MM-DD`) עם עיגון ל-12:00 UTC, כדי שאזור הזמן של השרת לא יזיז יום.
- **משימות והחלטות מתבנית נגזרות מתאריך החתונה** (`dueOffsetDays`). שינוי תאריך מזיז את כולן. תאריך שנערך ידנית (`dueDate`) תמיד גובר.
- **דחיסת לוח זמנים** (`plan-schedule.ts`): כשהחתונה קרובה מחצי שנה, אופסטים ארוכים נדחסים לזמן שנשאר, כך שלא מתחילים עם קיר של "באיחור". מועדים קשיחים (תיק ברבנות 45 יום, אקו״ם 72 שעות) לא מוזזים לכיוון החתונה.

## נתונים

אין מצב משותף בין בני הזוג מלבד מסד הנתונים. טבלאות לפי אזורים: חשבון (Better Auth), חתונה וחברים, אורחים (households, guests, seating_tables, guest_candidates: רשימת אישור זמנית לייבוא מוואטסאפ), החלטות (decisions, options, criteria, scores, comments), כסף (budget_items, vendors), משימות ולו״ז, activity.

- בכל הטבלאות RLS מופעל ללא מדיניות (האפליקציה מתחברת כבעלים). מיגרציה `0001` מסירה הרשאות מ-`anon`/`authenticated` אם קיימים.
- מזהה משק בית לאישור הגעה: `rsvp_token` אקראי (128 ביט). הזמנת בן/בת זוג: `token_hash` בלבד (SHA-256), תקף 7 ימים, חד-פעמי.

## פיתוח מקומי

`npm run dev` ללא `DATABASE_URL` מפעיל PGlite ב-`.data/pglite` (יוצר ומריץ מיגרציות ב-`instrumentation.ts`). עם `DATABASE_URL` משתמשים ב-Postgres אמיתי דרך `postgres-js`. לבדיקת נתיב הייצור מקומית: Postgres 16 רגיל, `npm run db:migrate`, `next build && next start`.

## פריסה

### Railway (הפריסה הנוכחית)

פרויקט `micro-wedding`, סביבת `production`, שני שירותים באותה רשת פרטית:

- **Postgres** (תבנית Railway, Postgres 18 עם SSL, כרך 500MB).
- **web**: מחובר ל-GitHub (`benzybert/micro_wedding`, ענף `claude/vibrant-bohr-l9tmm5`), נבנה עם Railpack (`npm run build`) ורץ `npm run start`. `railway.json` מגדיר healthcheck על `/login` ומדיניות הפעלה מחדש.

משתני סביבה בשירות `web`:

| משתנה | ערך |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (כתובת פרטית בתוך הפרויקט) |
| `BETTER_AUTH_SECRET` | סוד אקראי (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | כתובת הציבורית של השירות |
| `AUTO_MIGRATE` | `1`: מריץ מיגרציות בעליית השרת (`src/instrumentation.ts`) |
| `PORT` | `8080` (תואם לדומיין) |

דחיפה לענף מפעילה בנייה חדשה. המיגרציות נרשמות בטבלת `drizzle.__drizzle_migrations`, ולכן הרצה חוזרת בטוחה.

### Vercel (חלופה)

1. ייבוא הריפו ב-Vercel. `vercel.json` מגדיר אזור `fra1`.
2. משתני סביבה (Production): `DATABASE_URL` (מחרוזת **pooled**), `BETTER_AUTH_SECRET`.
3. `vercel-build` מריץ מיגרציות (`--if-configured`, מדלג אם אין `DATABASE_URL`) ואז `next build`. אל תגדירו `AUTO_MIGRATE` ב-Vercel.
4. ענף הייצור ב-Vercel צריך להיות הענף הדיפולטי של הריפו.

## נקודות פתוחות

אימות אימייל, איפוס סיסמה, Rate limit אמין (כרגע בזיכרון), CSP עם nonce, העלאת קבצים (חוזים, השראה), עדכון בזמן אמת, שליחת הודעות אוטומטית.
