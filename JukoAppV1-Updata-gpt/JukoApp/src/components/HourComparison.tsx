import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { HourComparison } from '@/types/webhook';

const HourComparisonComponent: React.FC = () => {
  const [comparisons, setComparisons] = useState<HourComparison[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComparisons = async () => {
    setLoading(true);
    try {
      // 1. Haal alle handmatige uren
      const { data: manualRaw } = await supabase
        .from('work_hours')
        .select('id, technician_id, date, hours_worked')
        .eq('is_manual_entry', true);

      // 2. Haal alle webhook-uren
      const { data: webhookRaw } = await supabase
        .from('webhook_hours')
        .select('id, technician_id, date, hours_worked, verified');

      // 3. Haal namen van monteurs
      const { data: profilesRaw } = await supabase
        .from('profiles')
        .select('id, full_name');

      const profilesMap = new Map<string, string>(
        (profilesRaw || []).map(p => [p.id, p.full_name || p.id])
      );

      // 4. Zet data in één array met bronlabel
      const manualData = (manualRaw || []).map(e => ({ ...e, source: 'manual' as const }));
      const webhookData = (webhookRaw || []).map(e => ({ ...e, source: 'webhook' as const }));
      const all = [...manualData, ...webhookData];

      // 5. Groepeer per monteur+datum
      type Slot = {
        technicianId: string;
        technicianName: string;
        date: string;
        manualHours: number;
        webhookHours: number;
        manualIds: string[];
        webhookIds: string[];
        verified: boolean;
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
            verified: true, // start als true, en 'AND' met elke webhook-entry
          });
        }
        const slot = map.get(key)!;
        if (e.source === 'manual') {
          slot.manualHours += e.hours_worked;
          slot.manualIds.push(e.id);
        } else {
          slot.webhookHours += e.hours_worked;
          slot.webhookIds.push(e.id);
          slot.verified = slot.verified && Boolean(e.verified);
        }
      });

      // 6. Bouw de HourComparison-array
      const comps: HourComparison[] = Array.from(map.values()).map(it => ({
        technicianId: it.technicianId,
        technicianName: it.technicianName,
        date: it.date,
        manualHours: it.manualHours,
        webhookHours: it.webhookHours,
        manualIds: it.manualIds,
        webhookIds: it.webhookIds,
        verified: it.webhookIds.length > 0 && it.verified,
        difference: it.webhookHours - it.manualHours,
        status:
          it.manualHours === it.webhookHours ? 'match'
          : it.manualHours === 0         ? 'missing_manual'
          : it.webhookHours === 0        ? 'missing_webhook'
          : 'discrepancy'
      }));

      // Auto-verify matches
      for (const c of comps) {
        if (c.status === 'match' && c.webhookIds.length > 0 && !c.verified) {
          await supabase
            .from('webhook_hours')
            .update({ verified: true })
            .in('id', c.webhookIds);
          c.verified = true;
        }
      }

      setComparisons(comps);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparisons();
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full"></div>
      </div>
    );
  }

  const handleRefresh = () => fetchComparisons();

  const handleAgree = async (comp: HourComparison) => {
    if (comp.webhookIds.length === 0) return;
    await supabase
      .from('webhook_hours')
      .update({ verified: true })
      .in('id', comp.webhookIds);
    fetchComparisons();
  };

  const getStatusIcon = (s: string) =>
    s === 'match'       ? <CheckCircle className="h-5 w-5 text-green-600" />
  : s === 'discrepancy' ? <AlertTriangle className="h-5 w-5 text-yellow-600" />
  :                      <XCircle className="h-5 w-5 text-red-600" />;

  const getStatusColor = (s: string) =>
    s === 'match'       ? 'bg-green-100 text-green-800'
  : s === 'discrepancy' ? 'bg-yellow-100 text-yellow-800'
  :                      'bg-red-100 text-red-800';

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Hour Verification</h1>
          <Button onClick={handleRefresh} className="bg-red-600 text-white">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p>Matches</p>
                <p className="text-2xl">{comparisons.filter(c => c.status === 'match').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p>Discrepancies</p>
                <p className="text-2xl">{comparisons.filter(c => c.status === 'discrepancy').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p>Missing</p>
                <p className="text-2xl">{comparisons.filter(c => c.status.includes('missing')).length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Comparison Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="py-2">Status</th>
                    <th className="py-2">Technician</th>
                    <th className="py-2">Date</th>
                    <th className="py-2">Manual</th>
                    <th className="py-2">Webhook</th>
                    <th className="py-2">Diff</th>
                    <th className="py-2">Agree</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((c, i) => (
                    <tr
                      key={i}
                      className={`border-b hover:bg-gray-50 ${c.verified ? 'bg-green-50' : ''}`}
                    >
                      <td className="py-2 flex items-center space-x-2">
                        {getStatusIcon(c.status)}
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(c.status)}`}>
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2">{c.technicianName}</td>
                      <td className="py-2">{new Date(c.date).toLocaleDateString()}</td>
                      <td className="py-2">{c.manualHours}h</td>
                      <td className="py-2">{c.webhookHours}h</td>
                      <td className="py-2">{c.difference > 0 ? `+${c.difference}` : c.difference}</td>
                      <td className="py-2">
                        {c.verified ? (
                          <span className="text-green-700">Agreed</span>
                        ) : (
                          <Button variant="ghost" onClick={() => handleAgree(c)}>
                            Agree
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
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
