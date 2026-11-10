"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { saveOnboardingAction, skipOnboardingAction, type OnboardingState } from "@/app/actions";
import { Wordmark } from "@/components/brand/Logo";
import { AUDIENCES, HEARD_FROM, NETWORKS, NICHES, PERSONAS } from "@/lib/onboarding/options";

/** Perguntas de /boas-vindas: 1 tela para escolher o caminho, depois 2 telas em cada caminho. */

const submit = "min-h-12 w-full cursor-pointer border-0 bg-ink px-6 text-[12px] font-medium tracking-[0.18em] text-white uppercase hover:bg-[#2b2925] disabled:opacity-60 sm:w-auto";
const secondary = "min-h-12 cursor-pointer border border-sand bg-white px-6 text-[12px] font-medium tracking-[0.18em] text-ink uppercase hover:border-ink";

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="min-h-11 cursor-pointer border border-sand bg-white px-4 text-[14px] text-ink transition-colors hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white"
    >
      {children}
    </button>
  );
}

function Question({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend className="m-0 flex flex-col gap-1 p-0 pb-1">
        <span className="text-[17px] font-medium">{title}</span>
        {hint && <span className="text-[14px] text-mute">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const t = useTranslations("onboarding");
  return (
    <button type="submit" disabled={pending} className={submit}>
      {pending ? t("saving") : label}
    </button>
  );
}

/** Campo de texto que aparece quando a opção "Outro" está marcada. Não tem `name`: quem envia é o hidden input. */
function OtherInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useTranslations("onboarding");
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[14px] text-mute">{t("other.label")}</span>
      <input
        type="text"
        value={value}
        maxLength={60}
        placeholder={t("other.placeholder")}
        onChange={(e) => onChange(e.target.value)}
        // Enter não pode enviar o formulário no meio do caminho: só os botões avançam ou concluem
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
        className="min-h-11 w-full border border-sand bg-white px-4 text-[15px] text-ink outline-none focus:border-ink"
      />
    </label>
  );
}

/** Tira um item de uma lista ou acrescenta, respeitando o máximo. */
function toggle(list: string[], value: string, max: number) {
  if (list.includes(value)) return list.filter((v) => v !== value);
  return list.length < max ? [...list, value] : list;
}

export function OnboardingFlow({ next }: { next: string }) {
  const t = useTranslations("onboarding");
  const [state, action] = useActionState<OnboardingState, FormData>(saveOnboardingAction, {});
  const [step, setStep] = useState(0);
  const [persona, setPersona] = useState<"creator" | "shopper" | null>(null);
  const [networks, setNetworks] = useState<string[]>([]);
  const [audience, setAudience] = useState<string | null>(null);
  const [niches, setNiches] = useState<string[]>([]);
  const [heardFrom, setHeardFrom] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [optIn, setOptIn] = useState(false);
  const [recording, setRecording] = useState(false);
  // texto de cada "Outro" (só vai para o banco se a opção estiver marcada)
  const [otherNetworks, setOtherNetworks] = useState("");
  const [otherAudience, setOtherAudience] = useState("");
  const [otherNiches, setOtherNiches] = useState("");
  const [otherHeardFrom, setOtherHeardFrom] = useState("");
  const [otherInterests, setOtherInterests] = useState("");

  // a última tela é a de salvar: os dois caminhos têm 2 telas depois da escolha
  const last = 2;
  const total = persona ? last + 1 : 1;
  const canContinue = step > 0 || persona !== null;
  const isLast = persona !== null && step === last;

  // "Como você conheceu" aparece nos dois caminhos (na última tela de cada um)
  // aceite de gravação de sessão: última tela das duas trilhas, sempre opcional
  const recordingCheckbox = (
    <label className="flex cursor-pointer items-start gap-3 border border-sand bg-white p-4">
      <input type="checkbox" checked={recording} onChange={(e) => setRecording(e.target.checked)} className="mt-1 size-4 accent-ink" />
      <span className="flex flex-col gap-1">
        <span className="text-[15px] font-medium">{t("recording.title")}</span>
        <span className="text-[14px] text-mute">{t("recording.hint")}</span>
      </span>
    </label>
  );

  const heardFromQuestion = (
    <Question title={t("heardFrom.title")}>
      <div className="flex flex-wrap gap-2">
        {HEARD_FROM.map((h) => (
          <Chip key={h} pressed={heardFrom === h} onClick={() => setHeardFrom(heardFrom === h ? null : h)}>
            {t(`options.heardFrom.${h}`)}
          </Chip>
        ))}
      </div>
      {heardFrom === "outro" && <OtherInput value={otherHeardFrom} onChange={setOtherHeardFrom} />}
    </Question>
  );

  return (
    <main className="min-h-dvh bg-white text-ink">
      <header className="flex items-center justify-between gap-4 px-5 py-6 md:px-12">
        <Wordmark label="" className="h-[19px] w-auto" />
        <form action={skipOnboardingAction}>
          <input type="hidden" name="next" value={next} />
          <button type="submit" className="cursor-pointer border-0 bg-transparent p-0 text-[13px] text-mute underline underline-offset-4 hover:text-ink">
            {t("skip")}
          </button>
        </form>
      </header>

      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-8 px-5 pt-4 pb-16 md:px-0">
        <div className="h-[2px] w-full bg-sand" aria-hidden>
          <div className="h-full bg-ink transition-[width] duration-300" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
        <p className="m-0 text-[12px] tracking-[0.18em] text-mute uppercase">{t("step", { current: step + 1, total })}</p>

        <form action={action} className="flex flex-col gap-8">
          {/* o que vai para o banco depende do caminho: respostas de outro caminho não são enviadas */}
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="persona" value={persona ?? ""} />
          {persona === "creator" && networks.map((v) => <input key={`n-${v}`} type="hidden" name="networks" value={v} />)}
          {persona === "creator" && networks.includes("outra") && <input type="hidden" name="otherNetworks" value={otherNetworks} />}
          {persona === "creator" && <input type="hidden" name="audience" value={audience ?? ""} />}
          {persona === "creator" && audience === "outro" && <input type="hidden" name="otherAudience" value={otherAudience} />}
          {persona === "creator" && niches.map((v) => <input key={`c-${v}`} type="hidden" name="niches" value={v} />)}
          {persona === "creator" && niches.includes("outro") && <input type="hidden" name="otherNiches" value={otherNiches} />}
          {persona && <input type="hidden" name="heardFrom" value={heardFrom ?? ""} />}
          {persona && heardFrom === "outro" && <input type="hidden" name="otherHeardFrom" value={otherHeardFrom} />}
          {persona === "creator" && optIn && <input type="hidden" name="marketingOptIn" value="on" />}
          {persona && recording && <input type="hidden" name="recording" value="on" />}
          {persona === "shopper" && interests.map((v) => <input key={`i-${v}`} type="hidden" name="interests" value={v} />)}
          {persona === "shopper" && interests.includes("outro") && <input type="hidden" name="otherInterests" value={otherInterests} />}

          {step === 0 && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <h1 className="m-0 font-display text-[clamp(40px,4.6vw,56px)] leading-[1] font-normal">{t("title")}</h1>
                <p className="m-0 text-[17px] text-mute">{t("intro")}</p>
              </div>
              <Question title={t("persona.question")}>
                <div className="grid gap-3">
                  {PERSONAS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={persona === p}
                      onClick={() => setPersona(p)}
                      className="flex cursor-pointer flex-col items-start gap-1 border border-sand bg-white p-4 text-left hover:border-ink aria-pressed:border-ink aria-pressed:bg-cream"
                    >
                      <span className="text-[16px] font-medium">{t(`persona.${p}`)}</span>
                      <span className="text-[14px] text-mute">{t(`persona.${p}Hint`)}</span>
                    </button>
                  ))}
                </div>
              </Question>
            </div>
          )}

          {persona === "creator" && step === 1 && (
            <div className="flex flex-col gap-8">
              <Question title={t("networks.title")} hint={t("networks.hint")}>
                <div className="flex flex-wrap gap-2">
                  {NETWORKS.map((n) => (
                    <Chip key={n} pressed={networks.includes(n)} onClick={() => setNetworks(toggle(networks, n, NETWORKS.length))}>
                      {t(`options.networks.${n}`)}
                    </Chip>
                  ))}
                </div>
                {networks.includes("outra") && <OtherInput value={otherNetworks} onChange={setOtherNetworks} />}
              </Question>
              <Question title={t("audience.title")} hint={t("audience.hint")}>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCES.map((a) => (
                    <Chip key={a} pressed={audience === a} onClick={() => setAudience(audience === a ? null : a)}>
                      {t(`options.audience.${a}`)}
                    </Chip>
                  ))}
                </div>
                {audience === "outro" && <OtherInput value={otherAudience} onChange={setOtherAudience} />}
              </Question>
            </div>
          )}

          {persona === "creator" && step === 2 && (
            <div className="flex flex-col gap-8">
              <Question title={t("niches.title")} hint={t("niches.hint")}>
                <div className="flex flex-wrap gap-2">
                  {NICHES.map((n) => (
                    <Chip key={n} pressed={niches.includes(n)} onClick={() => setNiches(toggle(niches, n, 3))}>
                      {t(`options.niches.${n}`)}
                    </Chip>
                  ))}
                </div>
                {niches.includes("outro") && <OtherInput value={otherNiches} onChange={setOtherNiches} />}
              </Question>
              {heardFromQuestion}
              <label className="flex cursor-pointer items-start gap-3 border border-sand bg-white p-4">
                <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="mt-1 size-4 accent-ink" />
                <span className="flex flex-col gap-1">
                  <span className="text-[15px] font-medium">{t("optIn.title")}</span>
                  <span className="text-[14px] text-mute">{t("optIn.hint")}</span>
                </span>
              </label>
              {recordingCheckbox}
            </div>
          )}

          {persona === "shopper" && step === 1 && (
            <Question title={t("interests.title")} hint={t("interests.hint")}>
              <div className="flex flex-wrap gap-2">
                {NICHES.map((n) => (
                  <Chip key={n} pressed={interests.includes(n)} onClick={() => setInterests(toggle(interests, n, 12))}>
                    {t(`options.niches.${n}`)}
                  </Chip>
                ))}
              </div>
              {interests.includes("outro") && <OtherInput value={otherInterests} onChange={setOtherInterests} />}
            </Question>
          )}

          {persona === "shopper" && step === 2 && <div className="flex flex-col gap-8">{heardFromQuestion}{recordingCheckbox}</div>}

          {state.error && (
            <p role="alert" className="m-0 text-sm font-semibold text-[#A3361B]">
              {state.error}
            </p>
          )}

          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            {step > 0 ? (
              <button type="button" onClick={() => setStep(step - 1)} className={secondary}>
                {t("back")}
              </button>
            ) : (
              <span />
            )}
            {isLast ? (
              <SubmitButton label={t("finish")} />
            ) : (
              <button type="button" disabled={!canContinue} onClick={() => setStep(step + 1)} className={`${submit} disabled:cursor-not-allowed disabled:opacity-40`}>
                {t("next")}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
