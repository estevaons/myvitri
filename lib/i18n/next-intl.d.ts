import type messages from "@/messages/pt-BR.json";
import type { routing } from "./routing";

/** Chaves das mensagens tipadas a partir do português: `t("chave.errada")` não compila. */
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
