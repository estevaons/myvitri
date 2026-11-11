/**
 * Caminhos de /api que não existem. O proxy não passa por /api, então sem esta rota eles cairiam em
 * app/[locale] com "api" como idioma, e a validação do `instant` do Next acusaria o notFound() do layout.
 * Aqui respondem 404 em JSON, como o resto da API.
 */
const notFound = () => Response.json({ error: "not_found" }, { status: 404 });

export { notFound as GET, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE };
