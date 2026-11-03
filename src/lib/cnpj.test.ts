import { describe, expect, it } from 'vitest';
import { isValidCnpj } from './cnpj';

describe('isValidCnpj', () => {
  it.each(['11222333000181', '11444777000161', '45997418000153'])('aceita CNPJ válido %s', (v) => expect(isValidCnpj(v)).toBe(true));
  it.each(['11222333000182', '11444777000160', '12345678000190'])('recusa dígito verificador errado %s', (v) => expect(isValidCnpj(v)).toBe(false));
  it.each(['00000000000000', '11111111111111'])('recusa sequência repetida %s', (v) => expect(isValidCnpj(v)).toBe(false));
  it.each(['', '123', '1122233300018', '112223330001811', '11.222.333/0001-81', 'abcdefghijklmn'])('recusa formato inválido (%j)', (v) =>
    expect(isValidCnpj(v)).toBe(false),
  );
});
