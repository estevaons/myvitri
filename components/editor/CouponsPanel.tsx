"use client";

import { useState } from "react";
import { couponOff, couponStatus, daysLeft, ddmm, expiryLabel } from "@/lib/vitrine/pricing";
import { COUPON_EXTRA, type Coupon, type VitrineContent } from "@/lib/vitrine/types";
import { CouponDates } from "./CouponDates";
import { LogoPicker } from "./LogoPicker";
import type { Update } from "./panels";
import { AddButton, Empty, Field, FormActions, H, Hint, MoneyInput, PercentInput, Pill, Row, Segmented, TextInput, inputCls, labelCls, newId, reorder, useDragSort } from "./ui";

/** Situação do cupom na lista do editor: etiqueta quando pede atenção, senão só a validade no subtítulo. */
function status(c: Coupon, today: string) {
  const s = couponStatus(c, today);
  if (s === "agendado") return { pill: <Pill tone="off">Entra em {ddmm(c.startsAt!)}</Pill> };
  if (s === "vencido") return { pill: <Pill tone="bad">Vencido</Pill> };
  const days = daysLeft(c, today);
  if (days !== null && days <= 7) return { pill: <Pill tone="warn">{expiryLabel(c, today)}</Pill> };
  return { sub: c.expiresAt ? `até ${ddmm(c.expiresAt)}` : "" };
}

/** Cupons que pedem atenção: vencidos ou vencendo em até 7 dias. */
export function couponAlerts(coupons: Coupon[], today: string) {
  return coupons.filter((c) => {
    const days = daysLeft(c, today);
    return days !== null && days <= 7;
  });
}

export function CouponsPanel({ draft, update, today }: { draft: VitrineContent; update: Update; today: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const sort = useDragSort((from, to) => update((d) => ({ ...d, coupons: reorder(d.coupons, from, to) })));
  const coupons = draft.coupons;
  const alerts = couponAlerts(coupons, today).length;

  const setCoupon = (id: string, patch: Partial<Coupon>) =>
    update((d) => ({ ...d, coupons: d.coupons.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

  const add = () => {
    const c: Coupon = { id: newId(), brand: "", code: "", kind: "percent", value: 10, condition: "", expiresAt: null, storeUrl: "", ...COUPON_EXTRA };
    update((d) => ({ ...d, coupons: [...d.coupons, c] }));
    setOpenId(c.id);
  };

  const remove = (id: string) => {
    update((d) => ({
      ...d,
      coupons: d.coupons.filter((c) => c.id !== id),
      products: d.products.map((p) => (p.couponId === id ? { ...p, couponId: null } : p)),
    }));
    setOpenId(null);
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-1 pb-1">
        <H>Seus cupons</H>
        <Hint>Cadastre uma vez. Quando um cupom vence, ele sai da vitrine sozinho.</Hint>
      </div>
      {alerts > 0 && (
        <p role="status" className="m-0 flex items-start gap-2.5 rounded-[12px] bg-[#FFF8E6] px-3.5 py-3 text-[13px] leading-snug text-[#6B4A00]">
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-px flex-none">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span>
            <span className="font-semibold">{alerts === 1 ? "1 cupom vencendo." : `${alerts} cupons vencendo.`}</span> Renove a data ou troque o código.
          </span>
        </p>
      )}
      {coupons.length === 0 && <Empty>Nenhum cupom ainda. Comece pelo cupom que você mais divulga.</Empty>}
      {coupons.map((c, i) => {
        const st = status(c, today);
        return (
          <Row
            key={c.id}
            pos={i + 1}
            title={c.brand || "Novo cupom"}
            sub={[c.code, couponOff(c), st.sub].filter(Boolean).join(" · ")}
            badge={st.pill}
            thumb={
              <span
                aria-hidden="true"
                className="flex size-10 flex-none items-center justify-center overflow-hidden rounded-[10px] bg-[#F4F2EE] text-[15px] font-semibold text-[#8F897E]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- logo vem de URL arbitrária */}
                {c.logoUrl ? <img src={c.logoUrl} alt="" className="size-7 rounded-full bg-white object-contain" /> : c.brand.trim()[0]?.toUpperCase() || "%"}
              </span>
            }
            open={openId === c.id}
            onOpen={() => setOpenId(openId === c.id ? null : c.id)}
            sort={sort}
            total={coupons.length}
          >
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Marca">
                <TextInput value={c.brand} onChange={(brand) => setCoupon(c.id, { brand })} maxLength={60} placeholder="Ex.: Maré" autoFocus={!c.brand} />
              </Field>
              <Field label="Código">
                <TextInput
                  value={c.code}
                  onChange={(code) => setCoupon(c.id, { code: code.toUpperCase().replace(/\s/g, "") })}
                  maxLength={40}
                  placeholder="MARINA15"
                  className={`${inputCls} font-mono tracking-wider`}
                />
              </Field>
            </div>
            <div className={`flex flex-col gap-1.5 ${labelCls}`}>
              Desconto
              <div className="flex gap-2">
                <div className="w-[104px] flex-none">
                  <Segmented
                    label="Tipo de desconto"
                    options={[
                      ["percent", "%"],
                      ["fixed", "R$"],
                    ]}
                    value={c.kind}
                    onChange={(kind) => setCoupon(c.id, { kind, value: kind === "percent" ? 10 : 2000 })}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  {c.kind === "percent" ? (
                    <PercentInput key={c.id} value={c.value} onChange={(value) => setCoupon(c.id, { value })} />
                  ) : (
                    <MoneyInput key={c.id + c.kind} cents={c.value} onChange={(value) => setCoupon(c.id, { value: Math.max(1, value) })} />
                  )}
                </div>
              </div>
            </div>
            <Field label="Condição (opcional)">
              <TextInput value={c.condition} onChange={(condition) => setCoupon(c.id, { condition })} maxLength={120} placeholder="Ex.: Na primeira compra" />
            </Field>
            <CouponDates today={today} start={c.startsAt} end={c.expiresAt} onChange={(startsAt, expiresAt) => setCoupon(c.id, { startsAt, expiresAt })} />
            <Field label="Link da loja (opcional)">
              <TextInput value={c.storeUrl} onChange={(storeUrl) => setCoupon(c.id, { storeUrl })} placeholder="https://…" inputMode="url" />
            </Field>
            <LogoPicker storeUrl={c.storeUrl} logoUrl={c.logoUrl} onChange={(logoUrl) => setCoupon(c.id, { logoUrl })} />
            {/* "Como usar" fica recolhido; já abre se o cupom tiver os passos preenchidos. */}
            <details open={!!c.howTo} className="group flex flex-col">
              <summary className="-mx-1 flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg px-1 text-[13px] font-medium text-[#5E5A52] hover:text-ink [&::-webkit-details-marker]:hidden">
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-90">
                  <path d="m9 18 6-6-6-6" />
                </svg>
                Como usar (opcional)
              </summary>
              <div className="pt-3">
                <Field label="Passos" hint="Um passo por linha. Aparece no cupom como uma lista.">
                  <textarea
                    value={c.howTo}
                    onChange={(e) => setCoupon(c.id, { howTo: e.target.value })}
                    maxLength={400}
                    rows={3}
                    placeholder={"Ex.: Válido só no app\nNão acumula com outras promoções"}
                    className={`${inputCls} h-auto resize-y py-2.5 leading-snug`}
                  />
                </Field>
              </div>
            </details>
            <FormActions onDone={() => setOpenId(null)} onRemove={() => remove(c.id)} removeLabel="Excluir cupom" />
          </Row>
        );
      })}
      <AddButton onClick={add}>+ Adicionar cupom</AddButton>
    </div>
  );
}
