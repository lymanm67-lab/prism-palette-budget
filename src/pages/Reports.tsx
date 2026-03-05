import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SPENDING_BY_CATEGORY, MONTHLY_CASHFLOW, NET_WORTH_HISTORY, formatCurrency } from '@/lib/seed-data';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area, LineChart, Line,
} from 'recharts';

const tooltipStyle = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

const Reports = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Colorful, filterable financial reports.</p>
      </div>

      <Tabs defaultValue="spending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="networth">Net Worth</TabsTrigger>
        </TabsList>

        <TabsContent value="spending">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={SPENDING_BY_CATEGORY} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {SPENDING_BY_CATEGORY.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Category Ranking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...SPENDING_BY_CATEGORY].sort((a, b) => b.value - a.value).map((cat, i) => {
                    const maxVal = SPENDING_BY_CATEGORY.reduce((m, c) => Math.max(m, c.value), 0);
                    const pct = (cat.value / maxVal) * 100;
                    return (
                      <div key={cat.name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-muted-foreground w-5">{i + 1}</span>
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span>{cat.name}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(cat.value)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cashflow">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Income vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={MONTHLY_CASHFLOW}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="income" fill="#2eb88a" radius={[6, 6, 0, 0]} name="Income" />
                  <Bar dataKey="expenses" fill="#e5547a" radius={[6, 6, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="networth">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Net Worth Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={NET_WORTH_HISTORY}>
                  <defs>
                    <linearGradient id="assetsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2eb88a" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2eb88a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="liabGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e5547a" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#e5547a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                  <Legend />
                  <Area type="monotone" dataKey="assets" stroke="#2eb88a" strokeWidth={2} fill="url(#assetsGrad)" name="Assets" />
                  <Area type="monotone" dataKey="liabilities" stroke="#e5547a" strokeWidth={2} fill="url(#liabGrad)" name="Liabilities" />
                  <Line type="monotone" dataKey="net" stroke="#7c5cf5" strokeWidth={2.5} dot={{ r: 4 }} name="Net Worth" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default Reports;
