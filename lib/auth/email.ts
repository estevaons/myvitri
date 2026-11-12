/**
 * Quantos segundos depois de um envio o botão "Reenviar e-mail" de confirmação libera. É o intervalo mínimo
 * padrão do Supabase Auth entre dois e-mails para o mesmo endereço: antes disso o reenvio daria erro de limite.
 */
export const RESEND_AFTER_SECONDS = 60;
