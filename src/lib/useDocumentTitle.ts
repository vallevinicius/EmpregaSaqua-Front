import { useEffect } from 'react';

const BASE = 'EmpregaSaquá';

/** Título da aba (e og:title) por página: ajuda a achar a aba certa e o compartilhamento. `description` atualiza a meta description. */
export function useDocumentTitle(title?: string | null, description?: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} | ${BASE}` : BASE;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDesc = meta?.content;
    if (meta && description) meta.content = description;
    return () => {
      document.title = previous;
      if (meta && previousDesc !== undefined) meta.content = previousDesc;
    };
  }, [title, description]);
}

/** Injeta JSON-LD (dados estruturados) no <head> enquanto a página está montada. `json` nulo = nada. */
export function useJsonLd(json: string | null) {
  useEffect(() => {
    if (!json) return;
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.text = json;
    document.head.appendChild(el);
    return () => el.remove();
  }, [json]);
}
