import { EB_Garamond, Inter } from "next/font/google";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Títulos: serifa editorial, no tom de joalheria e revista. A Cormorant ficaria parecida, mas no Google Fonts ela desloca os acentos (ê, ú, ç).
const garamond = EB_Garamond({ variable: "--font-garamond", subsets: ["latin"], style: ["normal", "italic"] });

/**
 * Variáveis das fontes do site, para o `<html>`. Ficam aqui porque, além do layout de app/[locale], as páginas que
 * montam o próprio documento (global-not-found e global-error) também precisam delas.
 */
export const fontVariables = `${inter.variable} ${garamond.variable}`;
