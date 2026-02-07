import { useState } from 'react';
import { ArrowUpDown, Building2, Calendar, DollarSign, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type SortOption = 
  | 'default'
  | 'type'
  | 'institution'
  | 'value-desc'
  | 'maturity-asc'
  | 'maturity-desc';

const sortLabels: Record<SortOption, string> = {
  default: 'Padrão',
  type: 'Tipo de investimento',
  institution: 'Empresa / Banco',
  'value-desc': 'Maior valor investido',
  'maturity-asc': 'Vencimento mais próximo',
  'maturity-desc': 'Vencimento mais distante',
};

interface InvestmentSortMenuProps {
  currentSort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export function InvestmentSortMenu({ currentSort, onSortChange }: InvestmentSortMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ArrowUpDown className="h-4 w-4" />
          <span className="hidden sm:inline">
            Ordenar: {sortLabels[currentSort]}
          </span>
          <span className="sm:hidden">Ordenar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem
          onClick={() => onSortChange('type')}
          className={currentSort === 'type' ? 'bg-accent/20 font-medium' : ''}
        >
          <Tag className="h-4 w-4 mr-2" />
          Tipo de investimento
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSortChange('institution')}
          className={currentSort === 'institution' ? 'bg-accent/20 font-medium' : ''}
        >
          <Building2 className="h-4 w-4 mr-2" />
          Empresa / Banco
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onSortChange('value-desc')}
          className={currentSort === 'value-desc' ? 'bg-accent/20 font-medium' : ''}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Maior valor investido
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onSortChange('maturity-asc')}
          className={currentSort === 'maturity-asc' ? 'bg-accent/20 font-medium' : ''}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Vencimento mais próximo
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSortChange('maturity-desc')}
          className={currentSort === 'maturity-desc' ? 'bg-accent/20 font-medium' : ''}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Vencimento mais distante
        </DropdownMenuItem>
        {currentSort !== 'default' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSortChange('default')}>
              Limpar ordenação
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
