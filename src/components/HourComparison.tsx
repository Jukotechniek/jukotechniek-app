import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { HourComparison } from '@/types/webhook';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';

interface TechnicianProfile {
  id: string;
  full_name: string;
}

const HourComparisonComponent: React.FC = () => {
  const [comparisons, setComparisons] = useState<HourComparison[]>([]);
  const [allComparisons, setAllComparisons] = useState<HourComparison[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const [selectedTech, setSelectedTech] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (!allComparisons) return;
    setComparisons(
      allComparisons.filter(c => {
        if (selectedTech !== 'all' && c.technicianId !== selectedTech) return false;
        if (selectedMonth !== 'all') {
          const [year, month] = selectedMonth.split('-').map(Number);
          const d = new Date(c.date);
          if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return false;
        }
        return true;
      })
    );
  }, [selectedTech, selectedMonth, allComparisons]);

  if (!isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900">Toegang Geweigerd</h1>
          <p className="text-gray-600">Alleen beheerders kunnen urenvergelijking bekijken.</p>
        </div>
      </div>
    );
  }

  const fetchComparisons = async () => {
    setLoading(true);
    try {
      // Haal monteurs
      const { data: techs } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'technician');
      setTechnicians(techs || []);

      // Haal handmatige uren inclusief manual_verified
      const { data: manualRaw } = await supabase
        .from('work_hours')
        .select('id, technician_id, date, hours_worked, start_time, end_time, is_manual_entry, manual_verified')
        .eq('is_manual_entry', true);

      // Haal webhook uren inclusief webhook_verified
      const { data: webhookRaw } = await supabase
        .from('webhook_hours')
        .select('id, technician_id, date, hours_worked, webhook_start, webhook_end, webhook_verified');

      // Haal profielen
      const { data: profilesRaw } = await supabase
        .from('profiles')
        .select('id, full_name');

      const profilesMap = new Map<string, string>(
        (profilesRaw || []).map(p => [p.id, p.full_name || p.id])
      );

      // Mapping voor grouping
      const manualData = (manualRaw || []).map(e => ({
        ...e,
        source: 'manual' as const,
        startTimes: e.start_time ? [e.start_time] : [],
        endTimes: e.end_time ? [e.end_time] : [],
        manual_verified: Boolean(e.manual_verified), // <-- Belangrijk!
      }));

      const webhookData = (webhookRaw || []).map(e => ({
        ...e,
        source: 'webhook' as const,
        startTimes: e.webhook_start ? [e.webhook_start] : [],
        endTimes: e.webhook_end ? [e.webhook_end] : [],
        webhook_verified: Boolean(e.webhook_verified),
      }));

      const all = [...manualData, ...webhookData];

      type Slot = {
        technicianId: string;
        technicianName: string;
        date: string;
        manualHours: number;
        webhookHours: number;
        manualIds: string[];
        webhookIds: string[];
        manualStartTimes: string[];
        manualEndTimes: string[];
        webhookStartTimes: string[];
        webhookEndTimes: string[];
        manualVerified: boolean;
        webhookVerified: boolean;
      };
      const map = new Map<string, Slot>();

      all.forEach(e => {
        const key = `${e.technician_id}-${e.date}`;
        if (!map.has(key)) {
          map.set(key, {
            technicianId: e.technician_id,
            technicianName: profilesMap.get(e.technician_id) || 'Onbekend',
            date: e.date,
            manualHours: 0,
            webhookHours: 0,
            manualIds: [],
            webhookIds: [],
            manualStartTimes: [],
            manualEndTimes: [],
            webhookStartTimes: [],
            webhookEndTimes: [],
            manualVerified: false,
            webhookVerified: false,
          });
        }
        const slot = map.get(key)!;
        if (e.source === 'manual') {
          slot.manualHours += e.hours_worked;
          slot.manualIds.push(e.id);
          slot.manualStartTimes.push(...e.startTimes);
          slot.manualEndTimes.push(...e.endTimes);
          slot.manualVerified = slot.manualVerified || Boolean(e.manual_verified);
        } else {
          slot.webhookHours += e.hours_worked;
          slot.webhookIds.push(e.id);
          slot.webhookStartTimes.push(...e.startTimes);
          slot.webhookEndTimes.push(...e.endTimes);
          slot.webhookVerified = slot.webhookVerified || Boolean(e.webhook_verified);
        }
      });

      const comps: HourComparison[] = Array.from(map.values()).map(it => ({
        technicianId: it.technicianId,
        technicianName: it.technicianName,
        date: it.date,
        manualHours: it.manualHours,
        webhookHours: it.webhookHours,
        manualIds: it.manualIds,
        webhookIds: it.webhookIds,
        manualStartTimes: it.manualStartTimes,
        manualEndTimes: it.manualEndTimes,
        webhookStartTimes: it.webhookStartTimes,
        webhookEndTimes: it.webhookEndTimes,
        // verified op basis van het type!
        verified: it.webhookIds.length > 0
          ? it.webhookVerified
          : it.manualIds.length > 0
            ? it.manualVerified
            : false,
        difference: it.webhookHours - it.manualHours,
        status:
          it.manualHours === it.webhookHours ? 'match'
            : it.manualHours === 0 ? 'missing_manual'
              : it.webhookHours === 0 ? 'missing_webhook'
                : 'discrepancy'
      }));

      setAllComparisons(comps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch comparison data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparisons();
    // eslint-disable-next-line
  }, []);

  const handleRefresh = () => fetchComparisons();

  const handleVerify = async (comp: HourComparison) => {
    console.log('Verifying:', comp);

    if (comp.webhookIds && comp.webhookIds.length > 0) {
      try {
        const { error } = await supabase
          .from('webhook_hours')
          .update({
            webhook_verified: true,
            verified_by: user?.id ?? null,
            verified_at: new Date().toISOString()
          } as any)
          .in('id', comp.webhookIds);

        if (error) throw error;
        toast({
          title: "Success",
          description: `Webhook uren geverifieerd voor ${comp.technicianName}`,
        });
        fetchComparisons();
      } catch (err) {
        console.error('Failed to verify webhook hours:', err);
        toast({ title: "Error", description: `Failed to verify webhook hours: ${err?.message || err}`, variant: "destructive" });
      }
    } else if (comp.manualIds && comp.manualIds.length > 0) {
      try {
        console.log('Manual IDs:', comp.manualIds);

        const { error } = await supabase
          .from('work_hours')
          .update({
            manual_verified: true,
          } as any)
          .in('id', comp.manualIds);

        if (error) throw error;
        toast({
          title: "Success",
          description: `Handmatige uren geverifieerd voor ${comp.technicianName}`,
        });
        fetchComparisons();
      } catch (err) {
        console.error('Failed to verify manual hours:', err);
        toast({ title: "Error", description: `Failed to verify manual hours: ${err?.message || err}`, variant: "destructive" });
      }
    } else {
      toast({ title: "Error", description: "Geen te verifiëren handmatige uren gevonden.", variant: "destructive" });
    }
  };

  const handleUnverify = async (comp: HourComparison) => {
    if (comp.webhookIds?.length > 0) {
      try {
        const { error } = await supabase
          .from('webhook_hours')
          .update({
            webhook_verified: false,
          } as any)
          .in('id', comp.webhookIds);
        if (error) throw error;
        toast({
          title: "Success",
          description: `Webhook uren onverifieerd voor ${comp.technicianName}`,
        });
        fetchComparisons();
      } catch (err) {
        console.error('Failed to unverify webhook hours:', err);
        toast({ title: "Error", description: `Failed to unverify webhook hours: ${err?.message || err}`, variant: "destructive" });
      }
    } else if (comp.manualIds?.length > 0) {
      try {
        const { error } = await supabase
          .from('work_hours')
          .update({
            manual_verified: false,
          } as any)
          .in('id', comp.manualIds);
        if (error) throw error;
        toast({
          title: "Success",
          description: `Handmatige uren onverifieerd voor ${comp.technicianName}`,
        });
        fetchComparisons();
      } catch (err) {
        console.error('Failed to unverify manual hours:', err);
        toast({ title: "Error", description: `Failed to unverify manual hours: ${err?.message || err}`, variant: "destructive" });
      }
    }
  };

  const getStatusIcon = (s: string) =>
    s === 'match' ? <CheckCircle className="h-5 w-5 text-green-600" />
      : s === 'discrepancy' ? <AlertTriangle className="h-5 w-5 text-yellow-600" />
        : <XCircle className="h-5 w-5 text-red-600" />;

  const getStatusColor = (s: string) =>
    s === 'match' ? 'bg-green-100 text-green-800'
      : s === 'discrepancy' ? 'bg-yellow-100 text-yellow-800'
        : 'bg-red-100 text-red-800';

  const getStatusText = (s: string) => {
    switch (s) {
      case 'match': return 'MATCH';
      case 'discrepancy': return 'DISCREPANTIE';
      case 'missing_manual': return 'MISSENDE MANUALE UREN';
      case 'missing_webhook': return 'MISSENDE WEBHOOK';
      default: return s.toUpperCase();
    }
  };

  function renderTimes(starts: string[], ends: string[]) {
    if (!starts.length) return '-';
    return starts.map((start, idx) => {
      const end = ends[idx] || '';
      if (!start && !end) return '';
      return `${start?.slice(0, 5) || '-'}${end ? ' - ' + end.slice(0, 5) : ''}`;
    }).filter(Boolean).join(' / ');
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Uren verificatie</h1>
            <p className="text-gray-600">Vergelijk en verifieer handmatige vs webhook uren</p>
          </div>
          <Button onClick={handleRefresh} className="bg-red-600 hover:bg-red-700 text-white">
            <RefreshCw className="h-4 w-4 mr-2" /> Vernieuwen
          </Button>
        </div>

        {/* FILTERS */}
        <div className="mb-4 flex flex-col gap-y-2 sm:flex-row sm:items-center sm:space-x-4 sm:gap-y-0">
          <select
            value={selectedTech}
            onChange={e => setSelectedTech(e.target.value)}
            className="p-2 border rounded w-full sm:w-auto"
          >
            <option value="all">Alle monteurs</option>
            {technicians.map(t => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
          <Input
            type="month"
            value={selectedMonth === 'all' ? '' : selectedMonth}
            onChange={e => setSelectedMonth(e.target.value || 'all')}
            className="p-2 border rounded w-full sm:w-auto"
          />
          <Button
            onClick={() => setSelectedMonth('all')}
            className="bg-red-600 text-white w-full sm:w-auto"
          >
            Alles
          </Button>
        </div>

        {/* Results Table */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Vergelijk resultaat ({comparisons.length} entries)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 text-sm font-medium text-gray-600">Status</th>
                    <th className="py-3 text-sm font-medium text-gray-600">Monteur</th>
                    <th className="py-3 text-sm font-medium text-gray-600">Datum</th>
                    <th className="py-3 text-sm font-medium text-gray-600">Handmatig</th>
                    <th className="py-3 text-sm font-medium text-gray-600">Webhook</th>
                    <th className="py-3 text-sm font-medium text-gray-600">Verschil</th>
                    <th className="py-3 text-sm font-medium text-gray-600">Acties</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((c) => (
                    <tr
                      key={`${c.technicianId}-${c.date}`}
                      className={`border-b border-gray-100 hover:bg-gray-50 ${c.verified ? 'bg-green-50' : ''}`}
                    >
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(c.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(c.status)}`}>
                            {getStatusText(c.status)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 font-medium text-gray-900">{c.technicianName}</td>
                      <td className="py-3 text-gray-700">{new Date(c.date).toLocaleDateString('nl-NL')}</td>
                      <td className="py-3 text-gray-700">
                        {c.manualHours.toFixed(1)}h
                        <br />
                        <span className="text-xs text-gray-500">{renderTimes(c.manualStartTimes, c.manualEndTimes)}</span>
                      </td>
                      <td className="py-3 text-gray-700">
                        {c.webhookHours.toFixed(1)}h
                        <br />
                        <span className="text-xs text-gray-500">{renderTimes(c.webhookStartTimes, c.webhookEndTimes)}</span>
                      </td>
                      <td className={`py-3 font-medium ${
                        c.difference > 0 ? 'text-green-600' : 
                        c.difference < 0 ? 'text-red-600' : 'text-gray-700'
                      }`}>
                        {c.difference > 0 ? `+${c.difference.toFixed(1)}h` : `${c.difference.toFixed(1)}h`}
                      </td>
                      <td className="py-3">
                        {c.webhookIds && c.webhookIds.length > 0 ? (
                          c.verified ? (
                            <div className="flex items-center space-x-2">
                              <span className="text-green-700 font-medium flex items-center">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Verified
                              </span>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleUnverify(c)}
                                className="border-red-600 text-red-600 hover:bg-red-50"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Unverify
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleVerify(c)}
                              className="border-blue-600 text-blue-600 hover:bg-blue-50"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Verify
                            </Button>
                          )
                        ) : c.manualIds && c.manualIds.length > 0 ? (
                          c.verified ? (
                            <div className="flex items-center space-x-2">
                              <span className="text-green-700 font-medium flex items-center">
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Verified
                              </span>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleUnverify(c)}
                                className="border-red-600 text-red-600 hover:bg-red-50"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Unverify
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleVerify(c)}
                              className="border-blue-600 text-blue-600 hover:bg-blue-50"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Verify
                            </Button>
                          )
                        ) : (
                          <span className="text-gray-500">Geen uren gevonden</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {comparisons.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        Geen vergelijkingsgegevens beschikbaar
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HourComparisonComponent;
