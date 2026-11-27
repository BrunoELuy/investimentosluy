import { describe, it, expect } from 'vitest';
import {
  filterSuggestions,
  isSuggestionAdmin,
  SUGGESTION_ADMIN_EMAIL,
  type UserSuggestion,
} from '@/types/suggestion';

function makeSuggestion(overrides: Partial<UserSuggestion> = {}): UserSuggestion {
  return {
    id: 'sug-1',
    user_id: 'user-1',
    user_email: 'user@example.com',
    type: 'FEATURE',
    title: 'Adicionar Tesouro Direto',
    description: 'Suporte completo para Tesouro Selic e IPCA+',
    status: 'NAO_INICIADO',
    created_at: '2026-11-27T18:00:00Z',
    updated_at: '2026-11-27T18:00:00Z',
    ...overrides,
  };
}

describe('isSuggestionAdmin', () => {
  it('reconhece o email admin configurado', () => {
    expect(isSuggestionAdmin(SUGGESTION_ADMIN_EMAIL)).toBe(true);
    expect(isSuggestionAdmin('  BRUNOLUY.E10@GMAIL.COM ')).toBe(true);
  });

  it('rejeita outros emails e valores vazios', () => {
    expect(isSuggestionAdmin('outro@gmail.com')).toBe(false);
    expect(isSuggestionAdmin(null)).toBe(false);
    expect(isSuggestionAdmin(undefined)).toBe(false);
    expect(isSuggestionAdmin('')).toBe(false);
  });
});

describe('filterSuggestions', () => {
  const items: UserSuggestion[] = [
    makeSuggestion({ id: '1', type: 'FEATURE', status: 'NAO_INICIADO' }),
    makeSuggestion({ id: '2', type: 'FIX', status: 'EM_ANDAMENTO' }),
    makeSuggestion({ id: '3', type: 'FEATURE', status: 'CONCLUIDO' }),
  ];

  it('retorna todos quando filtros são ALL', () => {
    expect(filterSuggestions(items, 'ALL', 'ALL')).toHaveLength(3);
  });

  it('filtra por status corretamente', () => {
    expect(filterSuggestions(items, 'EM_ANDAMENTO', 'ALL').map((i) => i.id)).toEqual(['2']);
    expect(filterSuggestions(items, 'CONCLUIDO', 'ALL').map((i) => i.id)).toEqual(['3']);
  });

  it('filtra por tipo e status combinados', () => {
    expect(filterSuggestions(items, 'NAO_INICIADO', 'FEATURE').map((i) => i.id)).toEqual(['1']);
    expect(filterSuggestions(items, 'NAO_INICIADO', 'FIX')).toHaveLength(0);
  });
});
