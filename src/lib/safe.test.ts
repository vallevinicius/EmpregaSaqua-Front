import { describe, expect, it } from 'vitest';
import { decodeEntities, mailtoLink, safeAssetUrl, safeHttpUrl, whatsappLink } from './safe';
import { decodeJwt } from '@/auth/session';
import { safeRedirect } from '@/auth/guards';
import { parseChatTarget } from '@/features/chat/chatLink';

describe('safeHttpUrl', () => {
  it('aceita http/https', () => {
    expect(safeHttpUrl('https://drive.google.com/x')).toBe('https://drive.google.com/x');
  });
  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>', 'vbscript:x', 'file:///etc/passwd', '//evil.com', 'nota url'])(
    'bloqueia %s',
    (v) => expect(safeHttpUrl(v)).toBeNull(),
  );
});

describe('safeAssetUrl', () => {
  it('aceita caminhos sob /uploads', () => {
    expect(safeAssetUrl('/uploads/Logos/Padaria-1-ab.webp')).toBe('/uploads/Logos/Padaria-1-ab.webp');
  });
  it.each(['https://evil.com/x.png', '/uploads/../../etc/passwd', '//evil.com/uploads/x', 'javascript:alert(1)', '/uploads/a b.png', '/other/x.png'])(
    'bloqueia %s',
    (v) => expect(safeAssetUrl(v)).toBeNull(),
  );
});

describe('decodeEntities', () => {
  it('decodifica entidades sem produzir HTML executável', () => {
    expect(decodeEntities('Tom &amp; Jerry')).toBe('Tom & Jerry');
    expect(decodeEntities('&lt;img src=x onerror=alert(1)&gt;')).toBe('<img src=x onerror=alert(1)>');
  });
  it('remove tags reais (retorna só texto)', () => {
    expect(decodeEntities('<b>x</b> &amp; y')).toBe('x & y');
  });
});

describe('whatsappLink / mailtoLink', () => {
  it('só dígitos no wa.me e texto codificado', () => {
    expect(whatsappLink('+55 (22) 99999-9999', 'a&b=c')).toBe('https://wa.me/5522999999999?text=a%26b%3Dc');
    expect(whatsappLink('123')).toBeNull();
  });
  it('mailto rejeita injeção de headers', () => {
    expect(mailtoLink('a@b.com?cc=x@y.com')).toBeNull();
    expect(mailtoLink('a@b?bcc=x.com')).toBeNull();
    expect(mailtoLink('a%0A@b.com')).toBeNull();
    expect(mailtoLink('vagas@empresa.com.br', 'Oi & tchau')).toBe('mailto:vagas@empresa.com.br?subject=Oi%20%26%20tchau');
  });
});

describe('safeRedirect (open redirect)', () => {
  it.each(['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', 42])('bloqueia %s', (v) => {
    expect(safeRedirect(v, '/')).toBe('/');
  });
  it('aceita rotas internas', () => expect(safeRedirect('/vagas/1', '/')).toBe('/vagas/1'));
});

describe('decodeJwt', () => {
  const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const tok = (p: object) => `${enc({ alg: 'HS256' })}.${enc(p)}.sig`;
  it('lê payload válido', () => {
    const r = decodeJwt(tok({ sub: 'u1', email: 'a@b.com', role: 'EMPLOYER', exp: 2_000_000_000 }));
    expect(r?.user.role).toBe('EMPLOYER');
    expect(r?.expiresAt).toBe(2_000_000_000_000);
  });
  it('rejeita role desconhecido e payload malformado', () => {
    expect(decodeJwt(tok({ sub: 'u1', email: 'a@b.com', role: 'ROOT', exp: 1 }))).toBeNull();
    expect(decodeJwt('a.b')).toBeNull();
    expect(decodeJwt('x.!!!.y')).toBeNull();
  });
});

describe('parseChatTarget', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  it('aceita só UUIDs', () => {
    expect(parseChatTarget(new URLSearchParams({ vaga: id, empresa: id, candidato: id }))).not.toBeNull();
    expect(parseChatTarget(new URLSearchParams({ vaga: '1 OR 1=1', empresa: id, candidato: id }))).toBeNull();
  });
});
