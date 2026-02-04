import { TrendingUp, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { StockInvestment } from '@/types/stock';

interface StockCardProps {
  stock: StockInvestment;
  onEdit: (stock: StockInvestment) => void;
  onDelete: (id: string) => void;
}

export function StockCard({ stock, onEdit, onDelete }: StockCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{stock.name}</h3>
                {stock.ticker && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {stock.ticker}
                  </Badge>
                )}
              </div>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(stock.amount)}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(stock)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(stock.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {stock.notes && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {stock.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
