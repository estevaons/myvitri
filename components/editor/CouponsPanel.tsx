"use client";

import { useState } from "react";
import { couponColor } from "@/lib/vitrine/look";
import { couponOff, couponStatus, daysLeft, ddmm, expiryLabel } from "@/lib/vitrine/pricing";
import { COUPON_EXTRA, type Coupon, type VitrineContent } from "@/lib/vitrine/types";
import type { Update } from "./panels";
import { AddButton, ColorPicker, Empty, Field, FormActions, Hint, MoneyInput, Row, Segmented, TextInput, inputCls, newId, reorder, useDragSort } from "./ui";

/** Situação do cupom na lista do editor. */
function statusLabel(c: Coupon, today: string) {
  const status = couponStatus(c, today);
  if (status === "agendado") return `Agendado · entra em ${ddmm(c.startsAt!)}`;
  if (status === "vencido") return "Vencido · fora da vitrine";
  return c.expiresAt ? expiryLabel(c, today) : "";
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
      <h2 className="m-0 text-sm font-bold">Seus cupons</h2>
      <Hint>Cadastre cada cupom uma vez e vincule aos produtos. Cupons agendados entram e vencidos saem da vitrine sozinhos.</Hint>
      {couponAlerts(coupons, today).map((c) => (
        <p key={c.id} role="status" className="m-0 rounded-[14px] bg-[#FFF4D6] px-3.5 py-3 text-[13px] leading-snug font-semibold text-[#6B4A00]">
          {c.code || c.brand}: {couponStatus(c, today) === "vencido" ? "venceu e saiu da vitrine." : `${expiryLabel(c, today).toLowerCase()}.`} Renove a data
          ou troque o código.
        </p>
      ))}
      {coupons.length === 0 && <Empty>Nenhum cupom ainda. Comece pelo cupom que você mais divulga.</Empty>}
      {coupons.map((c, i) => (
        <Row
          key={c.id}
          pos={i + 1}
          title={c.brand || "Novo cupom"}
          sub={[c.code, couponOff(c), statusLabel(c, today)].filter(Boolean).join(" · ")}
          thumb={
            <span aria-hidden="true" className="flex size-10 flex-none items-center justify-center overflow-hidden rounded-[10px]" style={{ background: couponColor(draft.look, c, i) }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- logo vem de URL arbitrária */}
              {c.logoUrl && <img src={c.logoUrl} alt="" className="size-7 rounded-full bg-white object-contain" />}
            </span>
          }
          open={openId === c.id}
          onOpen={() => setOpenId(openId === c.id ? null : c.id)}
          sort={sort}
          total={coupons.length}
        >
          <Field label="Marca">
            <TextInput value={c.brand} onChange={(brand) => setCoupon(c.id, { brand })} maxLength={60} placeholder="Ex.: Maré Moda Praia" autoFocus={!c.brand} />
          </Field>
          <Field label="Código do cupom">
            <TextInput
              value={c.code}
              onChange={(code) => setCoupon(c.id, { code: code.toUpperCase().replace(/\s/g, "") })}
              maxLength={40}
              placeholder="Ex.: MARINA15"
              className={`${inputCls} font-mono tracking-wider`}
            />
          </Field>
          <div className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Desconto
            <Segmented
              label="Tipo de desconto"
              options={[
                ["percent", "Porcentagem"],
                ["fixed", "Valor fixo"],
              ]}
              value={c.kind}
              onChange={(kind) => setCoupon(c.id, { kind, value: kind === "percent" ? 10 : 2000 })}
            />
            {c.kind === "percent" ? (
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={c.value}
                  onChange={(e) => setCoupon(c.id, { value: Math.max(1, Math.min(100, Math.round(Number(e.target.value) || 0))) })}
                  className={`${inputCls} pr-9`}
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[15px] text-[#5E5A52]">%</span>
              </div>
            ) : (
              <MoneyInput key={c.id + c.kind} cents={c.value} onChange={(value) => setCoupon(c.id, { value: Math.max(1, value) })} />
            )}
          </div>
          <Field label="Condição (opcional)">
            <TextInput value={c.condition} onChange={(condition) => setCoupon(c.id, { condition })} maxLength={120} placeholder="Ex.: Na primeira compra" />
          </Field>
          <Field label="Como usar (opcional)" hint="Um passo por linha. Aparece no cupom como uma lista.">
            <textarea
              value={c.howTo}
              onChange={(e) => setCoupon(c.id, { howTo: e.target.value })}
              maxLength={400}
              rows={3}
              placeholder={"Ex.: Válido só no app\nNão acumula com outras promoções"}
              className={`${inputCls} h-auto resize-y py-2.5 leading-snug`}
            />
          </Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Começa em" hint="Em branco: já vale.">
              <input type="date" value={c.startsAt ?? ""} onChange={(e) => setCoupon(c.id, { startsAt: e.target.value || null })} className={inputCls} />
            </Field>
            <Field label="Validade" hint="Em branco: não expira.">
              <input type="date" value={c.expiresAt ?? ""} onChange={(e) => setCoupon(c.id, { expiresAt: e.target.value || null })} className={inputCls} />
            </Field>
          </div>
          <Field label="Link da loja (opcional)">
            <TextInput value={c.storeUrl} onChange={(storeUrl) => setCoupon(c.id, { storeUrl })} placeholder="https://…" inputMode="url" />
          </Field>
          <Field label="Logo da marca (link da imagem, opcional)" hint="Uma imagem quadrada. Aparece ao lado do nome da marca.">
            <TextInput value={c.logoUrl} onChange={(logoUrl) => setCoupon(c.id, { logoUrl })} placeholder="https://…" inputMode="url" />
          </Field>
          <div className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Cor do cupom
            <ColorPicker
              label="Cor do cupom"
              look={draft.look}
              value={c.color}
              autoColor={couponColor(draft.look, { color: "auto" }, i)}
              onChange={(color) => setCoupon(c.id, { color })}
            />
          </div>
          <FormActions onDone={() => setOpenId(null)} onRemove={() => remove(c.id)} removeLabel="Excluir" />
        </Row>
      ))}
      <AddButton onClick={add}>+ Adicionar cupom</AddButton>
    </div>
  );
}
