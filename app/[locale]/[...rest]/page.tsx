import { notFound } from "next/navigation";

/** URLs que não são de nenhuma rota: 404 dentro do layout do idioma, em vez do global. */
export default function CatchAll() {
  notFound();
}
