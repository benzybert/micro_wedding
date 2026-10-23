"use client";

import { useState } from "react";
import { newId, type Vendor, type VendorCategory, type VendorStatus } from "@/lib/state";
import { MIN_QUOTES, quoteWithVat, summarizeVendors, VENDOR_CATEGORIES, VENDOR_INFO } from "@/lib/vendors";
import { useAppState } from "../app-state";
import { Badge, Card, Check, Disclaimer, Field, Notice, NumberInput, PageHeader, Ready, Stat, shekel, type Tone } from "../ui";

const STATUS_LABEL: Record<VendorStatus, string> = {
  considering: "בבדיקה",
  quoted: "קיבלנו הצעה",
  booked: "סגרנו",
  rejected: "נפסל",
};
const STATUS_TONE: Record<VendorStatus, Tone> = { considering: "info", quoted: "caution", booked: "ok", rejected: "blocked" };

export function VendorsView() {
  return (
    <>
      <PageHeader
        title="ספקים"
        lead={`עקבו אחרי הצעות המחיר. הכלל מהמדריך: לפחות ${MIN_QUOTES} הצעות בכתב לכל קטגוריה, ובדקו אם כל אחת כוללת מע״מ.`}
      />
      <Ready>
        <Vendors />
      </Ready>
      <Disclaimer />
    </>
  );
}

function Vendors() {
  const [state, update] = useAppState();
  const [category, setCategory] = useState<VendorCategory>("venue");
  const summary = summarizeVendors(state.vendors);

  const patch = (id: string, p: Partial<Vendor>) =>
    update((s) => ({ ...s, vendors: s.vendors.map((v) => (v.id === id ? { ...v, ...p } : v)) }));

  function add() {
    const v: Vendor = {
      id: newId(),
      category,
      name: "",
      phone: "",
      status: "considering",
      quote: null,
      quoteIncludesVat: true,
      deposit: null,
      contractSigned: false,
      note: "",
    };
    update((s) => ({ ...s, vendors: [...s.vendors, v] }));
  }

  return (
    <>
      <Card title="סיכום">
        <div className="grid grid-3">
          <Stat label="קטגוריות עם ספק סגור" value={summary.categories.filter((c) => c.booked).length} sub={`מתוך ${summary.categories.length} שעוקבים אחריהן`} />
          <Stat label="סה״כ סגור" value={shekel(summary.bookedTotal)} sub="כולל מע״מ" />
          <Stat label="מקדמות ששולמו" value={shekel(summary.depositsPaid)} />
        </div>
        {summary.bookedWithoutContract.length > 0 ? (
          <Notice tone="caution">
            {summary.bookedWithoutContract.map((v) => v.name || VENDOR_INFO[v.category].label).join(", ")}: סגורים בלי חוזה
            חתום. חוזה בכתב הוא ההגנה שלכם.
          </Notice>
        ) : null}
      </Card>

      <Card title="הוספת ספק">
        <div className="row">
          <div className="grow">
            <Field label="קטגוריה">
              <select value={category} onChange={(e) => setCategory(e.target.value as VendorCategory)}>
                {VENDOR_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {VENDOR_INFO[c].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <button type="button" className="primary" onClick={add} style={{ alignSelf: "flex-end" }}>
            הוספה
          </button>
        </div>
      </Card>

      {VENDOR_CATEGORIES.map((c) => {
        const info = VENDOR_INFO[c];
        const cat = summary.categories.find((x) => x.category === c);
        if (!cat) return null;
        return (
          <Card
            key={c}
            title={
              <span className="row">
                {info.label}
                {cat.booked ? <Badge tone="ok">סגור</Badge> : cat.needsMoreQuotes ? <Badge tone="caution">{cat.quotes} מתוך {MIN_QUOTES} הצעות</Badge> : null}
              </span>
            }
          >
            {info.ask.length > 0 || info.redFlags.length > 0 ? (
              <details style={{ marginBlockEnd: 12 }}>
                <summary>מה לשאול ועל מה להיזהר</summary>
                {info.ask.length > 0 ? (
                  <ul>
                    {info.ask.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                ) : null}
                {info.redFlags.length > 0 ? (
                  <>
                    <h3 style={{ marginBlockStart: 10 }}>דגלים אדומים</h3>
                    <ul>
                      {info.redFlags.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </details>
            ) : null}

            {cat.vendors.map((v) => {
              const total = quoteWithVat(v);
              return (
                <div key={v.id} className={`item ${v.status === "rejected" ? "declined" : ""}`}>
                  <div className="row row-between" style={{ marginBlockEnd: 8 }}>
                    <div className="row">
                      <strong>{v.name || "ספק חדש"}</strong>
                      <Badge tone={STATUS_TONE[v.status]}>{STATUS_LABEL[v.status]}</Badge>
                      {cat.best?.id === v.id && cat.quotes > 1 ? <Badge tone="ok">הזול ביותר</Badge> : null}
                    </div>
                    <button
                      type="button"
                      className="link danger"
                      onClick={() => {
                        if (window.confirm("למחוק את הספק?")) update((s) => ({ ...s, vendors: s.vendors.filter((x) => x.id !== v.id) }));
                      }}
                    >
                      מחיקה
                    </button>
                  </div>
                  <div className="item-grid">
                    <Field label="שם">
                      <input type="text" value={v.name} onChange={(e) => patch(v.id, { name: e.target.value })} />
                    </Field>
                    <Field label="טלפון">
                      <input type="tel" inputMode="tel" value={v.phone} onChange={(e) => patch(v.id, { phone: e.target.value })} />
                    </Field>
                    <Field label="סטטוס">
                      <select value={v.status} onChange={(e) => patch(v.id, { status: e.target.value as VendorStatus })}>
                        {(Object.keys(STATUS_LABEL) as VendorStatus[]).map((k) => (
                          <option key={k} value={k}>
                            {STATUS_LABEL[k]}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="הצעת מחיר (₪)" hint={total !== null && !v.quoteIncludesVat ? `עם מע״מ: ${shekel(total)}` : undefined}>
                      <NumberInput value={v.quote} onChange={(q) => patch(v.id, { quote: q })} />
                    </Field>
                    <Field label="מקדמה ששולמה (₪)">
                      <NumberInput value={v.deposit} onChange={(q) => patch(v.id, { deposit: q })} />
                    </Field>
                    <Field label="הערה">
                      <input type="text" value={v.note} onChange={(e) => patch(v.id, { note: e.target.value })} />
                    </Field>
                  </div>
                  <div className="row" style={{ marginBlockStart: 10, gap: 18 }}>
                    <Check checked={v.quoteIncludesVat} onChange={(x) => patch(v.id, { quoteIncludesVat: x })}>
                      ההצעה כוללת מע״מ
                    </Check>
                    <Check checked={v.contractSigned} onChange={(x) => patch(v.id, { contractSigned: x })}>
                      חוזה חתום
                    </Check>
                  </div>
                </div>
              );
            })}
          </Card>
        );
      })}

      {state.vendors.length === 0 ? (
        <Card>
          <p className="muted" style={{ margin: 0 }}>
            עוד לא הוספתם ספקים. התחילו במקום ובאוכל: זה הסעיף הגדול בתקציב.
          </p>
        </Card>
      ) : null}
    </>
  );
}
