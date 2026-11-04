/** Sugestão de usuário a partir do e-mail: parte antes do @, em minúsculas, só [a-z0-9_.], 3 a 30 chars. Vazio se não der. */
export function suggestUsernameFromEmail(email: string): string {
  const local = email.trim().toLowerCase().split('@')[0] ?? '';
  const clean = local
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 30);
  return clean.length >= 3 ? clean : '';
}
