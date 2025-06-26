
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const Reports = () => {
  const { toast } = useToast();

  const handleExportExcel = (reportType: string) => {
    toast({
      title: "Export Started",
      description: `${reportType} report is being generated and will be downloaded shortly`
    });
  };

  const handleImportExcel = () => {
    toast({
      title: "Import Ready",
      description: "Please select an Excel file to import work hours"
    });
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Import/Export</h1>
          <p className="text-gray-600">Generate reports and manage data import/export</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Reports */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                📊 Export Reports
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button
                  onClick={() => handleExportExcel('Monthly Summary')}
                  className="w-full bg-red-600 hover:bg-red-700 text-white justify-start"
                >
                  Export Monthly Summary
                </Button>
                <Button
                  onClick={() => handleExportExcel('Technician Details')}
                  className="w-full bg-red-600 hover:bg-red-700 text-white justify-start"
                >
                  Export Technician Details
                </Button>
                <Button
                  onClick={() => handleExportExcel('All Work Hours')}
                  className="w-full bg-red-600 hover:bg-red-700 text-white justify-start"
                >
                  Export All Work Hours
                </Button>
                <Button
                  onClick={() => handleExportExcel('Manual vs Registered Hours')}
                  className="w-full bg-red-600 hover:bg-red-700 text-white justify-start"
                >
                  Export Manual vs Registered
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Import Data */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                📁 Import Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <div className="space-y-3">
                  <div className="text-3xl">📄</div>
                  <h3 className="text-sm font-medium text-gray-900">Import Excel File</h3>
                  <p className="text-xs text-gray-600">
                    Upload CSV or XLSX files with work hour data
                  </p>
                  <Button
                    onClick={handleImportExcel}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    Choose File
                  </Button>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <p><strong>Supported formats:</strong> .csv, .xlsx</p>
                <p><strong>Required columns:</strong> Technician Name, Date, Hours, Description</p>
              </div>
            </CardContent>
          </Card>

          {/* Report Statistics */}
          <Card className="bg-white md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Report Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">320</div>
                  <div className="text-sm text-gray-600">Total Hours This Month</div>
                </div>
                <div className="bg-black/5 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">45</div>
                  <div className="text-sm text-gray-600">Total Entries</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">78%</div>
                  <div className="text-sm text-gray-600">Registered Hours</div>
                </div>
                <div className="bg-black/5 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">22%</div>
                  <div className="text-sm text-gray-600">Manual Entries</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-white mt-6">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                📧 Email Reports
              </Button>
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                📅 Schedule Auto-Export
              </Button>
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                🔍 Data Validation Check
              </Button>
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                📋 Generate Summary Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
