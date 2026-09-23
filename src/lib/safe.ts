/**
 * Utilitários de saída segura. O React já escapa texto; estes helpers cobrem
 * os vetores que o escape NÃO cobre: atributos href/src e entidades HTML
 * que o sanitize-html do back devolve codificadas (ex.: "&amp;").
 */

/**
 * O back passa textos por sanitize-html, que codifica &, <, > como entidades.
 * Decodificamos para exibir o texto original via textContent (sem executar nada:
 * DOMParser não roda scripts e só lemos textContent). O resultado é renderizado
 * pelo React como texto, nunca como HTML.
 */
export function decodeEntities(input: string | null | undefined): string {
  if (!input) return '';
  if (!/&(#\d+|#x[\da-f]+|[a-z]+);/i.test(input)) return input;
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${input}`, 'text/html');
  return doc.body.textContent ?? '';
}

/** Aceita apenas http(s) absolutos. Bloqueia javascript:, data:, vbscript:, file: etc. */
export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * URLs de assets vindos do back (ex.: logo_url = "/uploads/Logos/x.webp").
 * Só aceitamos caminhos relativos sob /uploads/ sem traversal; qualquer outra coisa é descartada.
 */
export function safeAssetUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const path = raw.trim();
  if (!/^\/uploads\/[A-Za-z0-9_\-./]+$/.test(path)) return null;
  if (path.includes('..') || path.includes('//')) return null;
  return path;
}

export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

/** Link wa.me construído só com dígitos — impossível injetar parâmetros ou esquemas. */
export function whatsappLink(phone: string | null | undefined, text?: string): string | null {
  const digits = onlyDigits(phone);
  if (digits.length < 10 || digits.length > 15) return null;
  const q = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${q}`;
}

/** mailto seguro: valida formato básico e codifica o assunto. */
export function mailtoLink(email: string | null | undefined, subject?: string): string | null {
  if (!email) return null;
  const e = email.trim();
  if (e.length > 254 || !/^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(e)) return null;
  const q = subject ? `?subject=${encodeURIComponent(subject)}` : '';
  return `mailto:${e}${q}`;
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

/** Checagem de magic number no cliente (UX). O back também valida — esta não substitui aquela. */
export async function isPdfFile(file: File): Promise<boolean> {
  if (file.type !== 'application/pdf') return false;
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return PDF_MAGIC.every((b, i) => head[i] === b);
}

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
