import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Home, ListChecks, ClipboardCheck, LayoutGrid, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import MustHavesTab from './MustHavesTab';
import WalkThroughTab from './WalkThroughTab';
import DecisionScorecard from './DecisionScorecard';
import DecisionComparison from './DecisionComparison';
import { loadProperties, upsertProperty, removeProperty, type PropertyProfile } from '@/lib/home-buying/decision/walkthrough-store';

export default function DecisionRoot() {
  const [tab, setTab] = useState<'must' | 'walk' | 'score' | 'compare'>('must');
  const [properties, setProperties] = useState<PropertyProfile[]>(() => loadProperties());
  const [activeId, setActiveId] = useState<string | null>(() => loadProperties()[0]?.id ?? null);

  const active = properties.find(p => p.id === activeId) || null;

  const addProperty = (data: Omit<PropertyProfile,'id'>) => {
    const p: PropertyProfile = { id: `prop-${Date.now()}`, ...data };
    setProperties(upsertProperty(p));
    setActiveId(p.id);
    toast.success('Property added');
  };
  const removeActive = () => {
    if (!active) return;
    const next = removeProperty(active.id);
    setProperties(next);
    setActiveId(next[0]?.id ?? null);
    toast.success('Property removed');
  };

  return (
    <div className="space-y-4">
      <PropertyPicker
        properties={properties}
        activeId={activeId}
        setActiveId={setActiveId}
        onAdd={addProperty}
        onRemove={removeActive}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto">
          <TabsTrigger value="must" className="text-xs gap-1.5"><ListChecks className="h-3.5 w-3.5" />Must-Haves</TabsTrigger>
          <TabsTrigger value="walk" className="text-xs gap-1.5"><ClipboardCheck className="h-3.5 w-3.5" />Walk-Through</TabsTrigger>
          <TabsTrigger value="score" className="text-xs gap-1.5"><Home className="h-3.5 w-3.5" />Scorecard</TabsTrigger>
          <TabsTrigger value="compare" className="text-xs gap-1.5"><LayoutGrid className="h-3.5 w-3.5" />Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="must" className="mt-4"><MustHavesTab /></TabsContent>

        <TabsContent value="walk" className="mt-4">
          {active ? <WalkThroughTab property={active} /> : <EmptyState message="Add a property above to start a walk-through." action="Complete a property walk-through before making a final decision." />}
        </TabsContent>

        <TabsContent value="score" className="mt-4">
          {active ? <DecisionScorecard property={active} /> : <EmptyState message="Add a property above to run the scorecard." action="This property has not been compared with your preferences yet." />}
        </TabsContent>

        <TabsContent value="compare" className="mt-4">
          <DecisionComparison properties={properties} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PropertyPicker({ properties, activeId, setActiveId, onAdd, onRemove }: {
  properties: PropertyProfile[]; activeId: string | null;
  setActiveId: (id: string) => void;
  onAdd: (p: Omit<PropertyProfile,'id'>) => void;
  onRemove: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState<number>(185000);
  const [bedrooms, setBedrooms] = useState<number>(3);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [garage, setGarage] = useState('2-car');

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">Properties</CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-3 w-3" /> Add property
          </Button>
          {activeId && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1 text-red-400"><Trash2 className="h-3 w-3"/>Remove</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this property?</AlertDialogTitle>
                  <AlertDialogDescription>All walk-through data, photos, and repair estimates for this property will be lost.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onRemove}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {properties.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No properties yet. Add one to start.</p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {properties.map(p => (
              <button key={p.id} onClick={() => setActiveId(p.id)}
                className={`text-xs rounded border px-2 py-1 transition ${activeId === p.id ? 'bg-prism-teal/20 border-prism-teal/60' : 'border-border/50 hover:border-prism-teal/40'}`}>
                <span className="font-medium">{p.address}</span>
                <span className="ml-1.5 text-muted-foreground">${(p.price/1000).toFixed(0)}k</span>
              </button>
            ))}
          </div>
        )}

        {showAdd && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 pt-3 border-t border-border/40">
            <div className="md:col-span-2"><Label className="text-xs">Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Elm St, Akron, OH" /></div>
            <div><Label className="text-xs">Price</Label><Input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} /></div>
            <div><Label className="text-xs">Beds</Label><Input type="number" value={bedrooms} onChange={(e) => setBedrooms(+e.target.value)} /></div>
            <div><Label className="text-xs">Baths</Label><Input type="number" step="0.5" value={bathrooms} onChange={(e) => setBathrooms(+e.target.value)} /></div>
            <div><Label className="text-xs">Garage</Label><Input value={garage} onChange={(e) => setGarage(e.target.value)} /></div>
            <div className="md:col-span-6 flex gap-2">
              <Button size="sm" onClick={() => {
                if (!address.trim()) { toast.error('Address required'); return; }
                onAdd({ address: address.trim(), price, bedrooms, bathrooms, garage });
                setShowAdd(false); setAddress('');
              }}>Save property</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message, action }: { message: string; action: string }) {
  return (
    <Card><CardContent className="p-8 text-center space-y-2">
      <Home className="h-8 w-8 mx-auto text-muted-foreground" />
      <p className="text-sm">{action}</p>
      <p className="text-xs text-muted-foreground">{message}</p>
    </CardContent></Card>
  );
}
