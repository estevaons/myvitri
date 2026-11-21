"use client";

import { useLocale, useTranslations } from "next-intl";
import { ddmm, isDay, isExpired, todayBR } from "@/lib/vitrine/pricing";
import { COUPON_EXTRA, type Coupon } from "@/lib/vitrine/types";
import { Field, Group, MoneyInput, PercentInput, Segmented, TextInput, UrlInput, inputCls, labelCls, newId } from "./ui";

export const newCoupon = (): Coupon => ({
  id: newId(),
  brand: "",
  code: "",
  kind: "percent",
  value: 10,
  condition: "",
  expiresAt: null,
  storeUrl: "",
  ...COUPON_EXTRA,
});

/** Cupom novo que a pessoa abriu e fechou sem preencher: sai do rascunho. */
export const isBlankCoupon = (c: Coupon) => !c.brand.trim() && !c.code.trim();

/** Os campos de um cupom, dentro da janela de edição. Cada mudança vai direto para o rascunho. */
export function CouponForm({ coupon: c, onChange }: { coupon: Coupon; onChange: (patch: Partial<Coupon>) => void }) {
  const t = useTranslations("editor.coupons");
  const locale = useLocale();
  return (
    <>
      <Group title={t("groupCoupon")}>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label={t("brand")}>
            <TextInput value={c.brand} onChange={(brand) => onChange({ brand })} maxLength={60} placeholder={t("brandPlaceholder")} data-autofocus={!c.brand || undefined} />
          </Field>
          <Field label={t("code")}>
            <TextInput
              value={c.code}
              onChange={(code) => onChange({ code: code.toUpperCase().replace(/\s/g, "") })}
              maxLength={40}
              placeholder={t("codePlaceholder")}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className={`${inputCls} font-mono tracking-wider`}
            />
          </Field>
        </div>
        <div className={`flex flex-col gap-1.5 ${labelCls}`}>
          {t("discount")}
          <div className="flex gap-2">
            <div className="w-[104px] flex-none">
              <Segmented
                label={t("kind")}
                options={[
                  ["percent", "%"],
                  ["fixed", "R$"],
                ]}
                value={c.kind}
                onChange={(kind) => onChange({ kind, value: kind === "percent" ? 10 : 2000 })}
              />
            </div>
            <div className="min-w-0 flex-1">
              {c.kind === "percent" ? (
                <PercentInput key={c.id} value={c.value} onChange={(value) => onChange({ value })} />
              ) : (
                <MoneyInput key={c.id + c.kind} cents={c.value} onChange={(value) => onChange({ value: Math.max(1, value) })} />
              )}
            </div>
          </div>
        </div>
        <Field label={t("condition")}>
          <TextInput value={c.condition} onChange={(condition) => onChange({ condition })} maxLength={120} placeholder={t("conditionPlaceholder")} />
        </Field>
        <Field label={t("expiresAt")} hint={c.expiresAt && isExpired(c, todayBR()) ? t("expiredHint", { date: ddmm(c.expiresAt, locale) }) : t("expiresHint")}>
          {/* vazio = sem validade; o início agendado (`startsAt`) saiu do produto e é zerado junto para não travar a publicação */}
          <input
            type="date"
            value={c.expiresAt ?? ""}
            // `max` faz o Chrome parar o ano em 4 dígitos; o resto que não for data de verdade é ignorado
            max="9999-12-31"
            onChange={(e) => {
              const v = e.target.value;
              if (!v || isDay(v)) onChange({ expiresAt: v || null, startsAt: null });
            }}
            className={`${inputCls} [&::-webkit-date-and-time-value]:text-left`}
          />
        </Field>
      </Group>
      <Group title={t("groupStore")}>
        <Field label={t("storeUrl")}>
          <UrlInput value={c.storeUrl} onChange={(storeUrl) => onChange({ storeUrl })} />
        </Field>
        {/* "Como usar" fica recolhido; já abre se o cupom tiver os passos preenchidos. */}
        <details open={!!c.howTo} className="group flex flex-col">
          <summary className="-mx-1 flex min-h-11 cursor-pointer list-none items-center gap-1.5 px-1 text-[13px] font-medium text-[#5E5A52] hover:text-ink [&::-webkit-details-marker]:hidden">
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-open:rotate-90"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
            {t("howTo")}
          </summary>
          <div className="pt-3">
            <Field label={t("steps")} hint={t("stepsHint")}>
              <textarea
                value={c.howTo}
                onChange={(e) => onChange({ howTo: e.target.value })}
                maxLength={400}
                rows={3}
                placeholder={t("stepsPlaceholder")}
                className={`${inputCls} h-auto resize-y py-2.5 leading-snug`}
              />
            </Field>
          </div>
        </details>
      </Group>
    </>
  );
}
