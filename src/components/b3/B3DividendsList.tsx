import { useState, useMemo } from 'react';
import { Coins, Filter, Calendar, ArrowDownUp, TrendingUp, PieChart as PieIcon, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDividendPayments } from '@/hooks/useB3';
import { formatCurrency, formatDate } from '@/utils/investmentCalculations';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#6366f1'];

export function B3DividendsList() {
    const { data: dividends = [], isLoading } = useDividendPayments();
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');

    // Filtered list
    const filtered = useMemo(() => {
        return dividends.filter(d => {
            const matchSearch =
                d.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.institution.toLowerCase().includes(searchTerm.toLowerCase());
            const matchType = typeFilter === 'ALL' || d.type === typeFilter;
            return matchSearch && matchType;
        });
    }, [dividends, searchTerm, typeFilter]);

    // Aggregate totals
    const totalAmount = useMemo(() => dividends.reduce((acc, d) => acc + d.totalAmount, 0), [dividends]);

    // Aggregation by Ticker for Chart & Cards
    const byTicker = useMemo(() => {
        const map = new Map<string, { ticker: string; total: number; count: number }>();
        for (const d of dividends) {
            const current = map.get(d.ticker) || { ticker: d.ticker, total: 0, count: 0 };
            current.total += d.totalAmount;
            current.count += 1;
            map.set(d.ticker, current);
        }
        return Array.from(map.values()).sort((a, b) => b.total - a.total);
    }, [dividends]);

    // Aggregation by Month for Chart
    const byMonth = useMemo(() => {
        const map = new Map<string, { month: string; label: string; total: number }>();
        for (const d of dividends) {
            const monthKey = d.date.substring(0, 7); // YYYY-MM
            const parts = monthKey.split('-');
            const monthLabel = `${parts[1]}/${parts[0].slice(2)}`;
            const current = map.get(monthKey) || { month: monthKey, label: monthLabel, total: 0 };
            current.total += d.totalAmount;
            map.set(monthKey, current);
        }
        return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
    }, [dividends]);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground animate-pulse">
                    Carregando histórico de proventos...
                </CardContent>
            </Card>
        );
    }

    if (dividends.length === 0) {
        return null;
    }

    return (
        <Card className="space-y-4">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                            <Coins className="h-5 w-5 text-amber-500" />
                            Histórico de Proventos e JCPs Recebidos
                        </CardTitle>
                        <CardDescription>
                            Acompanhe todos os dividendos, juros sobre capital próprio e rendimentos importados da B3.
                        </CardDescription>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total Recebido Acumulado</p>
                        <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {formatCurrency(totalAmount)}
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* By Month Chart */}
                    <div className="p-4 border rounded-lg bg-card space-y-2">
                        <p className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                            <BarChart2 className="h-4 w-4 text-primary" />
                            Proventos Recebidos por Mês
                        </p>
                        <div className="h-48 w-full pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={byMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis dataKey="label" fontSize={11} />
                                    <YAxis fontSize={11} tickFormatter={v => `R$${v}`} />
                                    <Tooltip
                                        formatter={(value: number) => [formatCurrency(value), 'Total']}
                                        labelFormatter={label => `Mês: ${label}`}
                                    />
                                    <Bar dataKey="total" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* By Asset Chart / Ranking */}
                    <div className="p-4 border rounded-lg bg-card space-y-2">
                        <p className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            Maiores Pagadores de Proventos
                        </p>
                        <div className="h-48 w-full pt-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={byTicker.slice(0, 6)} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis type="number" fontSize={11} tickFormatter={v => `R$${v}`} />
                                    <YAxis dataKey="ticker" type="category" fontSize={11} width={50} />
                                    <Tooltip formatter={(value: number) => [formatCurrency(value), 'Recebido']} />
                                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                                        {byTicker.slice(0, 6).map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Filter controls */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
                    <div className="flex flex-1 w-full sm:w-auto gap-2">
                        <Input
                            placeholder="Buscar por ativo, nome ou corretora..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="max-w-xs"
                        />
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos os Tipos</SelectItem>
                                <SelectItem value="DIVIDENDO">Dividendo</SelectItem>
                                <SelectItem value="JCP">JCP</SelectItem>
                                <SelectItem value="RENDIMENTO">Rendimento</SelectItem>
                                <SelectItem value="JUROS_RF">Juros RF</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Exibindo {filtered.length} de {dividends.length} lançamentos
                    </p>
                </div>

                {/* Table of Dividends */}
                <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                        <thead>
                            <tr className="border-b bg-muted/50 text-muted-foreground text-left">
                                <th className="p-3">Data</th>
                                <th className="p-3">Ativo</th>
                                <th className="p-3">Tipo</th>
                                <th className="p-3">Instituição</th>
                                <th className="p-3 text-right">Qtd Base</th>
                                <th className="p-3 text-right">Valor Unitário</th>
                                <th className="p-3 text-right">Valor Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                                        Nenhum provento encontrado com os filtros selecionados.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((d, index) => (
                                    <tr key={d.id || index} className="border-b last:border-0 hover:bg-muted/20">
                                        <td className="p-3 font-mono">{formatDate(d.date)}</td>
                                        <td className="p-3">
                                            <span className="font-bold text-foreground">{d.ticker}</span>
                                            <span className="text-[11px] text-muted-foreground block truncate max-w-[180px]">
                                                {d.assetName}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300">
                                                {d.typeLabel}
                                            </Badge>
                                        </td>
                                        <td className="p-3 text-xs text-muted-foreground truncate max-w-[150px]">
                                            {d.institution}
                                        </td>
                                        <td className="p-3 text-right font-mono">
                                            {d.quantity > 0 ? d.quantity.toLocaleString('pt-BR') : '—'}
                                        </td>
                                        <td className="p-3 text-right font-mono">
                                            {d.unitPrice > 0 ? formatCurrency(d.unitPrice) : '—'}
                                        </td>
                                        <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                            {formatCurrency(d.totalAmount)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}

