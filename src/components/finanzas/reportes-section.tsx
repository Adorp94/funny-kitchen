'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReportesSectionProps {
  onDownloadMonthly?: (year: number, month: number) => void;
  onDownloadBiMonthly?: (year: number, startMonth: number) => void;
  onDownloadTriMonthly?: (year: number, quarter: number) => void;
  onDownloadAnnual?: (year: number) => void;
  isDownloadingMonthly?: boolean;
  isDownloadingBiMonthly?: boolean;
  isDownloadingTriMonthly?: boolean;
  isDownloadingAnnual?: boolean;
}

export function ReportesSection({
  onDownloadMonthly,
  onDownloadBiMonthly,
  onDownloadTriMonthly,
  onDownloadAnnual,
  isDownloadingMonthly,
  isDownloadingBiMonthly,
  isDownloadingTriMonthly,
  isDownloadingAnnual
}: ReportesSectionProps) {
  const currentYear = new Date().getFullYear();
  
  // State for different report types
  const [monthlyYear, setMonthlyYear] = useState<string>(currentYear.toString());
  const [monthlyMonth, setMonthlyMonth] = useState<string>('1');
  
  const [biMonthlyYear, setBiMonthlyYear] = useState<string>(currentYear.toString());
  const [biMonthlyStartMonth, setBiMonthlyStartMonth] = useState<string>('1');
  
  const [triMonthlyYear, setTriMonthlyYear] = useState<string>(currentYear.toString());
  const [triMonthlyQuarter, setTriMonthlyQuarter] = useState<string>('1');
  
  const [annualYear, setAnnualYear] = useState<string>(currentYear.toString());

  // Generate year options (current year and past 5 years)
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Month options
  const monthOptions = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ];

  // Bi-monthly options (starting months for 2-month periods)
  const biMonthlyOptions = [
    { value: '1', label: 'Enero - Febrero' },
    { value: '3', label: 'Marzo - Abril' },
    { value: '5', label: 'Mayo - Junio' },
    { value: '7', label: 'Julio - Agosto' },
    { value: '9', label: 'Septiembre - Octubre' },
    { value: '11', label: 'Noviembre - Diciembre' }
  ];

  // Quarter options
  const quarterOptions = [
    { value: '1', label: 'Q1 (Enero - Marzo)' },
    { value: '2', label: 'Q2 (Abril - Junio)' },
    { value: '3', label: 'Q3 (Julio - Septiembre)' },
    { value: '4', label: 'Q4 (Octubre - Diciembre)' }
  ];

  const handleMonthlyDownload = () => {
    if (!onDownloadMonthly) return;
    const year = parseInt(monthlyYear);
    const month = parseInt(monthlyMonth);
    onDownloadMonthly(year, month);
  };

  const handleBiMonthlyDownload = () => {
    if (!onDownloadBiMonthly) return;
    const year = parseInt(biMonthlyYear);
    const startMonth = parseInt(biMonthlyStartMonth);
    onDownloadBiMonthly(year, startMonth);
  };

  const handleTriMonthlyDownload = () => {
    if (!onDownloadTriMonthly) return;
    const year = parseInt(triMonthlyYear);
    const quarter = parseInt(triMonthlyQuarter);
    onDownloadTriMonthly(year, quarter);
  };

  const handleAnnualDownload = () => {
    if (!onDownloadAnnual) return;
    const year = parseInt(annualYear);
    onDownloadAnnual(year);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Report */}
        <Card>
          <CardHeader>
            <CardTitle>Reporte Mensual</CardTitle>
            <CardDescription>
              Descarga las ventas de un mes específico
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Año</label>
                <Select value={monthlyYear} onValueChange={setMonthlyYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Mes</label>
                <Select value={monthlyMonth} onValueChange={setMonthlyMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={handleMonthlyDownload}
              disabled={isDownloadingMonthly}
              className="w-full"
            >
              {isDownloadingMonthly ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Descargar Mensual
            </Button>
          </CardContent>
        </Card>

        {/* Bi-Monthly Report */}
        <Card>
          <CardHeader>
            <CardTitle>Reporte Bimestral</CardTitle>
            <CardDescription>
              Descarga las ventas de un período de 2 meses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Año</label>
                <Select value={biMonthlyYear} onValueChange={setBiMonthlyYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Período</label>
                <Select value={biMonthlyStartMonth} onValueChange={setBiMonthlyStartMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {biMonthlyOptions.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={handleBiMonthlyDownload}
              disabled={isDownloadingBiMonthly}
              className="w-full"
            >
              {isDownloadingBiMonthly ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Descargar Bimestral
            </Button>
          </CardContent>
        </Card>

        {/* Tri-Monthly Report */}
        <Card>
          <CardHeader>
            <CardTitle>Reporte Trimestral</CardTitle>
            <CardDescription>
              Descarga las ventas de un trimestre (3 meses)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Año</label>
                <Select value={triMonthlyYear} onValueChange={setTriMonthlyYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Trimestre</label>
                <Select value={triMonthlyQuarter} onValueChange={setTriMonthlyQuarter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {quarterOptions.map((quarter) => (
                      <SelectItem key={quarter.value} value={quarter.value}>
                        {quarter.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button 
              onClick={handleTriMonthlyDownload}
              disabled={isDownloadingTriMonthly}
              className="w-full"
            >
              {isDownloadingTriMonthly ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Descargar Trimestral
            </Button>
          </CardContent>
        </Card>

        {/* Annual Report */}
        <Card>
          <CardHeader>
            <CardTitle>Reporte Anual</CardTitle>
            <CardDescription>
              Descarga todas las ventas de un año completo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Año</label>
              <Select value={annualYear} onValueChange={setAnnualYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleAnnualDownload}
              disabled={isDownloadingAnnual}
              className="w-full"
            >
              {isDownloadingAnnual ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Descargar Anual
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 