
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { HourComparison, WebhookData } from '@/types/webhook';
import { CheckCircle, AlertTriangle, XCircle, Webhook, RefreshCw } from 'lucide-react';

// Mock data
const mockWebhookData: WebhookData[] = [
  {
    id: '1',
    technicianId: '2',
    date: '2024-06-15',
    hoursWorked: 8,
    receivedAt: '2024-06-15T17:00:00Z',
    verified: true
  },
  {
    id: '2',
    technicianId: '3',
    date: '2024-06-15',
    hoursWorked: 7.5,
    receivedAt: '2024-06-15T16:30:00Z',
    verified: false
  }
];

const mockComparisons: HourComparison[] = [
  {
    technicianId: '2',
    technicianName: 'Jan de Vries',
    date: '2024-06-15',
    manualHours: 8,
    webhookHours: 8,
    difference: 0,
    status: 'match'
  },
  {
    technicianId: '3',
    technicianName: 'Pieter Jansen',
    date: '2024-06-15',
    manualHours: 7.5,
    webhookHours: 6.5,
    difference: 1,
    status: 'discrepancy'
  },
  {
    technicianId: '2',
    technicianName: 'Jan de Vries',
    date: '2024-06-14',
    manualHours: 9,
    webhookHours: 0,
    difference: 9,
    status: 'missing_webhook'
  }
];

const HourComparisonComponent = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWebhookSetup, setShowWebhookSetup] = useState(false);

  const isAdmin = user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-white">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
              <p className="text-gray-600">Only administrators can access hour comparison data.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'match':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'discrepancy':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'missing_webhook':
      case 'missing_manual':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'match':
        return 'bg-green-100 text-green-800';
      case 'discrepancy':
        return 'bg-yellow-100 text-yellow-800';
      case 'missing_webhook':
      case 'missing_manual':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleWebhookSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Please enter a webhook URL",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Test webhook connection
      const testData = {
        test: true,
        message: 'JukoTechniek webhook test',
        timestamp: new Date().toISOString()
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify(testData),
      });

      toast({
        title: "Success",
        description: "Webhook configured successfully"
      });

      setShowWebhookSetup(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to configure webhook",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Refreshed",
        description: "Hour comparison data updated"
      });
    }, 1000);
  };

  const matchCount = mockComparisons.filter(c => c.status === 'match').length;
  const discrepancyCount = mockComparisons.filter(c => c.status === 'discrepancy').length;
  const missingCount = mockComparisons.filter(c => c.status.includes('missing')).length;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Hour Verification</h1>
            <p className="text-gray-600">Compare manual entries with webhook data</p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => setShowWebhookSetup(!showWebhookSetup)}
              variant="outline"
              className="border-gray-300"
            >
              <Webhook className="h-4 w-4 mr-2" />
              Webhook Setup
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Matches</p>
                  <p className="text-2xl font-bold text-green-600">{matchCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Discrepancies</p>
                  <p className="text-2xl font-bold text-yellow-600">{discrepancyCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Missing Data</p>
                  <p className="text-2xl font-bold text-red-600">{missingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Webhook Setup */}
        {showWebhookSetup && (
          <Card className="bg-white mb-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Webhook Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleWebhookSetup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook">Webhook URL for Hour Data</Label>
                  <Input
                    id="webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-system.com/webhook/hours"
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                  <p className="text-sm text-gray-600">
                    This webhook will receive hour data for verification against manual entries.
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isLoading ? 'Testing...' : 'Configure Webhook'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Hour Comparison Table */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Hour Comparison Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="pb-3 text-sm font-medium text-gray-600">Status</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Technician</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Date</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Manual Hours</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Webhook Hours</th>
                    <th className="pb-3 text-sm font-medium text-gray-600">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {mockComparisons.map((comparison, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(comparison.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(comparison.status)}`}>
                            {comparison.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 font-medium text-gray-900">{comparison.technicianName}</td>
                      <td className="py-3 text-gray-700">
                        {new Date(comparison.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-gray-700">{comparison.manualHours}h</td>
                      <td className="py-3 text-gray-700">
                        {comparison.webhookHours > 0 ? `${comparison.webhookHours}h` : 'No data'}
                      </td>
                      <td className="py-3">
                        <span className={`font-medium ${
                          comparison.difference === 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {comparison.difference === 0 ? 'Perfect match' : `${Math.abs(comparison.difference)}h difference`}
                        </span>
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
