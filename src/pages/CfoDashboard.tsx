import { useState } from "react";
import Navbar from "@/components/Navbar";
import { useStartups } from "@/hooks/useStartups";
import {
  useFinancialEntries, useBurnCategories, useCashFlowEntries, useFinancialForecasts,
  useAddFinancialEntry, useDeleteFinancialEntry,
  useAddBurnCategory, useDeleteBurnCategory,
  useAddCashFlowEntry, useDeleteCashFlowEntry,
  useAddForecast, useDeleteForecast,
} from "@/hooks/useFinancialData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DollarSign, TrendingDown, TrendingUp, Wallet, Plus, Trash2,
  BarChart3, ArrowDownRight, ArrowUpRight, Sparkles, AlertTriangle,
} from "lucide-react";

const CfoDashboard = () => {
  const { dbStartups } = useStartups();
  const [selectedStartup, setSelectedStartup] = useState<string>("");
  const startupId = selectedStartup || dbStartups?.[0]?.id || "";

  const { data: entries = [] } = useFinancialEntries(startupId);
  const { data: burnCats = [] } = useBurnCategories(startupId);
  const { data: cashFlows = [] } = useCashFlowEntries(startupId);
  const { data: forecasts = [] } = useFinancialForecasts(startupId);

  const addEntry = useAddFinancialEntry();
  const deleteEntry = useDeleteFinancialEntry();
  const addBurn = useAddBurnCategory();
  const deleteBurn = useDeleteBurnCategory();
  const addCash = useAddCashFlowEntry();
  const deleteCash = useDeleteCashFlowEntry();
  const addForecast = useAddForecast();
  const deleteForecast = useDeleteForecast();

  // Form states
  const [entryForm, setEntryForm] = useState({ entry_type: "expense", category: "", description: "", amount: "" });
  const [burnForm, setBurnForm] = useState({ category_name: "", monthly_amount: "", trend: "stable" });
  const [cashForm, setCashForm] = useState({ flow_type: "outflow", source: "", amount: "" });
  const [forecastForm, setForecastForm] = useState({ forecast_month: "", projected_revenue: "", projected_expenses: "", assumptions: "" });

  // Summary calculations
  const totalExpenses = entries.filter(e => e.entry_type === "expense").reduce((s, e) => s + Number(e.amount), 0);
  const totalRevenue = entries.filter(e => e.entry_type === "revenue").reduce((s, e) => s + Number(e.amount), 0);
  const totalBurn = burnCats.reduce((s, b) => s + Number(b.monthly_amount), 0);
  const netCashFlow = cashFlows.reduce((s, c) => s + (c.flow_type === "inflow" ? Number(c.amount) : -Number(c.amount)), 0);

  const startupName = dbStartups?.find(s => s.id === startupId)?.name || "Select Startup";

  // KAI insights for CFO
  const kaiInsights = [
    totalBurn > 0 && totalRevenue > 0 && totalBurn > totalRevenue * 0.8
      ? { type: "warning", text: `Burn rate (₹${totalBurn.toLocaleString()}/mo) is ${Math.round((totalBurn / totalRevenue) * 100)}% of revenue. Consider cost optimization.` }
      : null,
    netCashFlow < 0
      ? { type: "alert", text: `Negative net cash flow of ₹${Math.abs(netCashFlow).toLocaleString()}. Review outflows.` }
      : null,
    burnCats.length > 0
      ? { type: "insight", text: `Top burn category: ${burnCats[0]?.category_name} at ₹${Number(burnCats[0]?.monthly_amount).toLocaleString()}/mo` }
      : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 pt-8 pb-16 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Financial Command Center</h1>
            <p className="text-sm text-muted-foreground">Manage expenses, cash flow, and forecasts</p>
          </div>
          <Select value={startupId} onValueChange={setSelectedStartup}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select startup" />
            </SelectTrigger>
            <SelectContent>
              {dbStartups?.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <DollarSign className="h-3.5 w-3.5" /> Total Expenses
              </div>
              <p className="text-xl font-bold text-foreground">₹{totalExpenses.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingUp className="h-3.5 w-3.5" /> Total Revenue
              </div>
              <p className="text-xl font-bold text-foreground">₹{totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingDown className="h-3.5 w-3.5" /> Monthly Burn
              </div>
              <p className="text-xl font-bold text-foreground">₹{totalBurn.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Wallet className="h-3.5 w-3.5" /> Net Cash Flow
              </div>
              <p className={`text-xl font-bold ${netCashFlow >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {netCashFlow >= 0 ? "+" : ""}₹{netCashFlow.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* KAI Insights */}
        {kaiInsights.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600" /> KAI Financial Intel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {kaiInsights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-600 shrink-0" />
                  <span className="text-foreground">{insight!.text}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="expenses" className="space-y-4">
          <TabsList>
            <TabsTrigger value="expenses">Expenses & Revenue</TabsTrigger>
            <TabsTrigger value="burn">Burn Categories</TabsTrigger>
            <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
            <TabsTrigger value="forecasts">Forecasts</TabsTrigger>
          </TabsList>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Add Entry</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 items-end">
                  <Select value={entryForm.entry_type} onValueChange={v => setEntryForm(p => ({ ...p, entry_type: v }))}>
                    <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="obligation">Obligation</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Category" className="w-[140px]" value={entryForm.category} onChange={e => setEntryForm(p => ({ ...p, category: e.target.value }))} />
                  <Input placeholder="Description" className="w-[180px]" value={entryForm.description} onChange={e => setEntryForm(p => ({ ...p, description: e.target.value }))} />
                  <Input placeholder="Amount" type="number" className="w-[120px]" value={entryForm.amount} onChange={e => setEntryForm(p => ({ ...p, amount: e.target.value }))} />
                  <Button size="sm" onClick={() => {
                    if (!entryForm.category || !entryForm.amount) return;
                    addEntry.mutate({ startup_id: startupId, ...entryForm, amount: Number(entryForm.amount) });
                    setEntryForm({ entry_type: "expense", category: "", description: "", amount: "" });
                  }}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No entries yet</TableCell></TableRow>
                    )}
                    {entries.map(e => (
                      <TableRow key={e.id}>
                        <TableCell>
                          <Badge variant={e.entry_type === "revenue" ? "default" : e.entry_type === "expense" ? "destructive" : "secondary"} className="text-xs">
                            {e.entry_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{e.category}</TableCell>
                        <TableCell className="text-muted-foreground">{e.description}</TableCell>
                        <TableCell className="text-right font-mono">₹{Number(e.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{e.entry_date}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteEntry.mutate(e.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Burn Categories Tab */}
          <TabsContent value="burn" className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Add Burn Category</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 items-end">
                  <Input placeholder="Category name" className="w-[180px]" value={burnForm.category_name} onChange={e => setBurnForm(p => ({ ...p, category_name: e.target.value }))} />
                  <Input placeholder="Monthly amount" type="number" className="w-[140px]" value={burnForm.monthly_amount} onChange={e => setBurnForm(p => ({ ...p, monthly_amount: e.target.value }))} />
                  <Select value={burnForm.trend} onValueChange={v => setBurnForm(p => ({ ...p, trend: v }))}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stable">Stable</SelectItem>
                      <SelectItem value="increasing">Increasing</SelectItem>
                      <SelectItem value="decreasing">Decreasing</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={() => {
                    if (!burnForm.category_name || !burnForm.monthly_amount) return;
                    addBurn.mutate({ startup_id: startupId, category_name: burnForm.category_name, monthly_amount: Number(burnForm.monthly_amount), trend: burnForm.trend });
                    setBurnForm({ category_name: "", monthly_amount: "", trend: "stable" });
                  }}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {burnCats.map(b => (
                <Card key={b.id}>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm text-foreground">{b.category_name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteBurn.mutate(b.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                    <p className="text-lg font-bold font-mono text-foreground">₹{Number(b.monthly_amount).toLocaleString()}/mo</p>
                    <div className="flex items-center gap-1 mt-1">
                      {b.trend === "increasing" && <ArrowUpRight className="h-3 w-3 text-destructive" />}
                      {b.trend === "decreasing" && <ArrowDownRight className="h-3 w-3 text-emerald-600" />}
                      {b.trend === "stable" && <BarChart3 className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground capitalize">{b.trend}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {burnCats.length === 0 && (
                <p className="col-span-full text-center text-muted-foreground py-8">No burn categories yet</p>
              )}
            </div>
          </TabsContent>

          {/* Cash Flow Tab */}
          <TabsContent value="cashflow" className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Add Cash Flow Entry</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 items-end">
                  <Select value={cashForm.flow_type} onValueChange={v => setCashForm(p => ({ ...p, flow_type: v }))}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inflow">Inflow</SelectItem>
                      <SelectItem value="outflow">Outflow</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Source" className="w-[180px]" value={cashForm.source} onChange={e => setCashForm(p => ({ ...p, source: e.target.value }))} />
                  <Input placeholder="Amount" type="number" className="w-[140px]" value={cashForm.amount} onChange={e => setCashForm(p => ({ ...p, amount: e.target.value }))} />
                  <Button size="sm" onClick={() => {
                    if (!cashForm.source || !cashForm.amount) return;
                    addCash.mutate({ startup_id: startupId, flow_type: cashForm.flow_type, source: cashForm.source, amount: Number(cashForm.amount) });
                    setCashForm({ flow_type: "outflow", source: "", amount: "" });
                  }}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashFlows.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No cash flow entries yet</TableCell></TableRow>
                    )}
                    {cashFlows.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Badge variant={c.flow_type === "inflow" ? "default" : "destructive"} className="text-xs">
                            {c.flow_type === "inflow" ? "↑ Inflow" : "↓ Outflow"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{c.source}</TableCell>
                        <TableCell className="text-right font-mono">₹{Number(c.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{c.entry_date}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCash.mutate(c.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forecasts Tab */}
          <TabsContent value="forecasts" className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Add Forecast</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 items-end">
                  <Input type="month" className="w-[160px]" value={forecastForm.forecast_month} onChange={e => setForecastForm(p => ({ ...p, forecast_month: e.target.value }))} />
                  <Input placeholder="Projected Revenue" type="number" className="w-[160px]" value={forecastForm.projected_revenue} onChange={e => setForecastForm(p => ({ ...p, projected_revenue: e.target.value }))} />
                  <Input placeholder="Projected Expenses" type="number" className="w-[160px]" value={forecastForm.projected_expenses} onChange={e => setForecastForm(p => ({ ...p, projected_expenses: e.target.value }))} />
                  <Input placeholder="Assumptions" className="w-[200px]" value={forecastForm.assumptions} onChange={e => setForecastForm(p => ({ ...p, assumptions: e.target.value }))} />
                  <Button size="sm" onClick={() => {
                    if (!forecastForm.forecast_month) return;
                    addForecast.mutate({
                      startup_id: startupId,
                      forecast_month: forecastForm.forecast_month + "-01",
                      projected_revenue: Number(forecastForm.projected_revenue),
                      projected_expenses: Number(forecastForm.projected_expenses),
                      assumptions: forecastForm.assumptions,
                    });
                    setForecastForm({ forecast_month: "", projected_revenue: "", projected_expenses: "", assumptions: "" });
                  }}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Proj. Revenue</TableHead>
                      <TableHead className="text-right">Proj. Expenses</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Assumptions</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecasts.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No forecasts yet</TableCell></TableRow>
                    )}
                    {forecasts.map(f => {
                      const net = Number(f.projected_revenue) - Number(f.projected_expenses);
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.forecast_month}</TableCell>
                          <TableCell className="text-right font-mono">₹{Number(f.projected_revenue).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">₹{Number(f.projected_expenses).toLocaleString()}</TableCell>
                          <TableCell className={`text-right font-mono ${net >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                            {net >= 0 ? "+" : ""}₹{net.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{f.assumptions}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteForecast.mutate(f.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default CfoDashboard;
