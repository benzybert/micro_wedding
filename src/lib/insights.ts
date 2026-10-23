// The "what needs attention" list on the dashboard. Pure: state and today in, alerts out.

import { RABBINATE, MICRO_MAX_GUESTS } from "@/config/benchmarks";
import { summarizeBudget } from "./budget";
import { checkDate, earliestAfterPriorMarriage } from "./date-rules";
import { addDays, diffDays, formatLongDate } from "./hebrew-calendar";
import { planningHeadcount, summarizeGuests } from "./guests";
import type { AppState } from "./state";
import { buildTimeline } from "./timeline";
import { summarizeVendors } from "./vendors";

export type AlertLevel = "red" | "amber" | "info";

export interface Alert {
  id: string;
  level: AlertLevel;
  text: string;
  href?: string;
}

const ORDER: Record<AlertLevel, number> = { red: 0, amber: 1, info: 2 };

const money = (n: number) => `${Math.round(n).toLocaleString("he-IL")} ₪`;

export function buildAlerts(state: AppState, today: string): Alert[] {
  const { profile } = state;
  const alerts: Alert[] = [];
  const add = (a: Alert) => alerts.push(a);

  const guests = summarizeGuests(state.guests);
  const headcount = planningHeadcount(guests, profile.plannedGuests);
  const budget = summarizeBudget(state.budget, { headcount, route: profile.route, discount40: profile.discount40 });
  const vendors = summarizeVendors(state.vendors);

  // The date
  if (!profile.weddingDate) {
    add({ id: "no-date", level: "info", text: "עוד לא בחרתם תאריך. התחילו בבדיקת תאריכים פנויים.", href: "/date" });
  } else {
    const report = checkDate(profile.weddingDate, { custom: profile.custom, route: profile.route });
    if (report.status === "blocked") {
      add({
        id: "date-blocked",
        level: "red",
        text: `התאריך שבחרתם לא זמין: ${report.findings.map((f) => f.title).join(", ")}.`,
        href: "/date",
      });
    } else if (report.status === "caution") {
      add({
        id: "date-caution",
        level: "amber",
        text: `התאריך דורש בירור: ${report.findings.map((f) => f.title).join(", ")}.`,
        href: "/date",
      });
    }
    if (diffDays(today, profile.weddingDate) < 0) {
      add({ id: "date-past", level: "info", text: "תאריך החתונה כבר עבר. עדכנו אם התאריך זז.", href: "/" });
    }

    if (profile.previouslyMarried && profile.priorEndDate) {
      const earliest = earliestAfterPriorMarriage(profile.priorEndDate);
      if (profile.weddingDate < earliest) {
        add({
          id: "waiting-period",
          level: "red",
          text: `המועד המוקדם ביותר אחרי 90 הימים להבחנה הוא ${formatLongDate(earliest)}. אשרו מול הלשכה.`,
          href: "/date",
        });
      }
    }

    // Statutory deadlines
    if (profile.route === "rabbinate" && !state.done["task:rabbinate-open"]) {
      const latest = addDays(profile.weddingDate, -RABBINATE.latestOpenDaysBefore);
      const left = diffDays(today, latest);
      if (left < 0) {
        add({
          id: "rabbinate-late",
          level: "red",
          text: "עבר המועד האחרון לפתיחת תיק נישואין (45 יום לפני). פנו היום ללשכה ושאלו מה אפשרי.",
          href: "/route",
        });
      } else if (left <= 14) {
        add({
          id: "rabbinate-soon",
          level: "amber",
          text: `נשארו ${left} ימים לפתוח תיק נישואין (המועד האחרון ${formatLongDate(latest)}).`,
          href: "/route",
        });
      }
    }
    const acumLeft = diffDays(today, addDays(profile.weddingDate, -3));
    if (!state.done["task:acum"] && acumLeft >= 0 && acumLeft <= 11) {
      add({ id: "acum", level: "amber", text: "רישיון אקו״ם צריך להיות משולם ומדווח 72 שעות לפני האירוע.", href: "/timeline" });
    }

    const upcoming = diffDays(today, profile.weddingDate) >= 0;
    const overdue = upcoming ? buildTimeline(profile, state.done, today).filter((t) => t.status === "missed") : [];
    for (const t of overdue) {
      if (t.id === "rabbinate-open") continue;
      add({ id: `missed-${t.id}`, level: "red", text: `פספסתם מועד אחרון: ${t.title}`, href: "/timeline" });
    }
  }

  if (profile.needsBerur) {
    add({ id: "berur", level: "amber", text: "ברור יהדות: אין זמן מפורסם, ולכן מתחילים עכשיו.", href: "/route" });
  }
  if (profile.foreignSpouse) {
    add({ id: "foreign", level: "info", text: "בן או בת זוג שאינם אזרחים: הרישום אינו מעמד, וההליך מדורג.", href: "/route" });
  }

  // Guests
  if (guests.invited > MICRO_MAX_GUESTS) {
    add({
      id: "micro-limit",
      level: "info",
      text: `ברשימה ${guests.invited} מוזמנים, מעל ${MICRO_MAX_GUESTS}. זה כבר לא מיקרו.`,
      href: "/guests",
    });
  }

  // Budget and venue
  if (budget.venue.emptyPlates > 0) {
    add({
      id: "empty-plates",
      level: "amber",
      text: `המקום מחייב מינימום של ${budget.venue.chargedPlates} צלחות, ולכן ${budget.venue.emptyPlates} מהן ריקות ועולות כסף.`,
      href: "/budget",
    });
  }
  if (!state.budget.venue.includesVat && (state.budget.venue.perPlate ?? 0) > 0) {
    add({
      id: "venue-vat",
      level: "info",
      text: `מחיר הצלחת שהזנתם ללא מע״מ: המחיר בפועל גבוה ב־${money(budget.venue.vatPerPlate)} לצלחת. ודאו בכתב מה הציטוט כולל.`,
      href: "/budget",
    });
  }
  if (budget.over && budget.remaining !== null) {
    add({ id: "over-budget", level: "red", text: `התכנון חורג מהתקציב ב־${money(-budget.remaining)}.`, href: "/budget" });
  }

  // Vendors
  if (vendors.bookedWithoutContract.length > 0) {
    add({
      id: "no-contract",
      level: "amber",
      text:
        vendors.bookedWithoutContract.length === 1
          ? "ספק אחד סגור בלי חוזה חתום."
          : `${vendors.bookedWithoutContract.length} ספקים סגורים בלי חוזה חתום.`,
      href: "/vendors",
    });
  }
  const thin = vendors.categories.filter((c) => c.needsMoreQuotes).length;
  if (thin > 0) {
    add({
      id: "quotes",
      level: "info",
      text: `${thin === 1 ? "בקטגוריה אחת" : `ב־${thin} קטגוריות`} יש פחות משלוש הצעות מחיר בכתב.`,
      href: "/vendors",
    });
  }

  return alerts.sort((a, b) => ORDER[a.level] - ORDER[b.level]);
}
