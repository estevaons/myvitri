import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** No lugar de `next/link` e `next/navigation`: mantêm o prefixo do idioma atual nos links e redirecionamentos. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
