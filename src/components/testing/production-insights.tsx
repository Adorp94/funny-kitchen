"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Target,
  Zap,
  BarChart3 
} from 'lucide-react';

interface ProductionInsight {
  type: 'deficit' | 'surplus' | 'balanced' | 'urgent' | 'capacity';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  value?: number;
  target?: number;
  products?: string[];
}

interface ProductionMetrics {
  totalActiveProducts: number;
  totalDeficit: number;
  totalSurplus: number;
  capacityUtilization: number;
  productionEfficiency: number;
  avgCompletionRate: number;
}

export const ProductionInsights: React.FC = () => {
  const [insights, setInsights] = useState<ProductionInsight[]>([]);
  const [metrics, setMetrics] = useState<ProductionMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const calculateInsights = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch real production data
      const activeResponse = await fetch('/api/production-active');
      const activeData = await activeResponse.json();
      
      // Fetch simulation data
      const testingResponse = await fetch('/api/testing-datos');
      const testingData = await testingResponse.json();

      const activeProducts = activeData.data || [];
      const testingProducts = testingData.data || [];

      // Calculate insights
      const newInsights: ProductionInsight[] = [];
      
      // 1. Critical Deficit Analysis
      const criticalDeficit = activeProducts.filter((p: any) => p.faltan_sobran < -50);
      if (criticalDeficit.length > 0) {
        newInsights.push({
          type: 'deficit',
          priority: 'high',
          title: 'Déficit Crítico Detectado',
          description: `${criticalDeficit.length} productos con déficit mayor a 50 piezas`,
          value: criticalDeficit.reduce((sum: number, p: any) => sum + Math.abs(p.faltan_sobran), 0),
          products: criticalDeficit.map((p: any) => p.producto_nombre).slice(0, 3)
        });
      }

      // 2. Production Efficiency
      const totalPedidos = activeProducts.reduce((sum: number, p: any) => sum + p.pedidos, 0);
      const totalEnProceso = activeProducts.reduce((sum: number, p: any) => sum + p.piezas_en_proceso, 0);
      const efficiency = totalPedidos > 0 ? (totalEnProceso / totalPedidos) * 100 : 0;
      
      newInsights.push({
        type: 'capacity',
        priority: efficiency < 50 ? 'high' : efficiency < 80 ? 'medium' : 'low',
        title: 'Eficiencia de Producción',
        description: `${efficiency.toFixed(1)}% de los pedidos están en proceso`,
        value: efficiency,
        target: 85
      });

      // 3. Bottleneck Analysis - Products with high "Por Detallar"
      const bottleneckProducts = activeProducts.filter((p: any) => p.por_detallar > 20);
      if (bottleneckProducts.length > 0) {
        newInsights.push({
          type: 'urgent',
          priority: 'medium',
          title: 'Cuello de Botella en Detallado',
          description: `${bottleneckProducts.length} productos con más de 20 piezas esperando detallado`,
          value: bottleneckProducts.reduce((sum: number, p: any) => sum + p.por_detallar, 0),
          products: bottleneckProducts.map((p: any) => p.producto_nombre).slice(0, 3)
        });
      }

      // 4. Excess Production Analysis
      const excessProducts = activeProducts.filter((p: any) => p.faltan_sobran > 30);
      if (excessProducts.length > 0) {
        newInsights.push({
          type: 'surplus',
          priority: 'low',
          title: 'Sobreproducción Detectada',
          description: `${excessProducts.length} productos con exceso mayor a 30 piezas`,
          value: excessProducts.reduce((sum: number, p: any) => sum + p.faltan_sobran, 0),
          products: excessProducts.map((p: any) => p.producto_nombre).slice(0, 3)
        });
      }

      // 5. Simulation vs Reality Comparison
      if (testingProducts.length > 0) {
        const simulationTotal = testingProducts.reduce((sum: number, p: any) => sum + p.cantidad, 0);
        const activeTotal = totalPedidos;
        const variance = ((activeTotal - simulationTotal) / simulationTotal) * 100;
        
        newInsights.push({
          type: variance > 0 ? 'surplus' : 'deficit',
          priority: Math.abs(variance) > 20 ? 'high' : 'medium',
          title: 'Comparación Simulación vs Realidad',
          description: `${variance > 0 ? 'Incremento' : 'Reducción'} del ${Math.abs(variance).toFixed(1)}% vs simulación`,
          value: activeTotal,
          target: simulationTotal
        });
      }

      // Calculate overall metrics
      const newMetrics: ProductionMetrics = {
        totalActiveProducts: activeProducts.length,
        totalDeficit: activeProducts.filter((p: any) => p.faltan_sobran < 0).length,
        totalSurplus: activeProducts.filter((p: any) => p.faltan_sobran > 0).length,
        capacityUtilization: efficiency,
        productionEfficiency: activeProducts.length > 0 ? 
          (activeProducts.filter((p: any) => p.faltan_sobran >= 0).length / activeProducts.length) * 100 : 0,
        avgCompletionRate: activeProducts.length > 0 ? 
          activeProducts.reduce((sum: number, p: any) => sum + ((p.terminado / Math.max(p.pedidos, 1)) * 100), 0) / activeProducts.length : 0
      };

      setInsights(newInsights);
      setMetrics(newMetrics);
    } catch (error) {
      console.error('Error calculating insights:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    calculateInsights();
  }, [calculateInsights]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'deficit': return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'surplus': return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'urgent': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'capacity': return <BarChart3 className="h-5 w-5 text-blue-500" />;
      default: return <CheckCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <div className="flex justify-center items-center space-x-2">
          <BarChart3 className="h-4 w-4 animate-pulse text-gray-400" />
          <span className="text-xs text-gray-500">Calculando insights...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact Metrics Bar */}
      {metrics && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="grid grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-sm font-medium text-gray-900">{metrics.capacityUtilization.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">Utilización</div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                <div 
                  className="bg-gray-600 h-1 rounded-full" 
                  style={{ width: `${Math.min(metrics.capacityUtilization, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-900">{metrics.productionEfficiency.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">Eficiencia</div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                <div 
                  className="bg-gray-600 h-1 rounded-full" 
                  style={{ width: `${Math.min(metrics.productionEfficiency, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{metrics.avgCompletionRate.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">Completado</div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                <div 
                  className="bg-gray-600 h-1 rounded-full" 
                  style={{ width: `${Math.min(metrics.avgCompletionRate, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-red-600">{metrics.totalDeficit}</div>
              <div className="text-xs text-gray-500">En déficit</div>
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xs font-medium text-gray-700">Insights de Producción</h3>
        </div>
        <div className="p-3 space-y-3">
          {insights.map((insight, index) => (
            <div 
              key={index} 
              className={`p-3 rounded border text-xs ${
                insight.priority === 'high' 
                  ? 'bg-red-50 border-red-200' 
                  : insight.priority === 'medium' 
                  ? 'bg-orange-50 border-orange-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      insight.priority === 'high' 
                        ? 'bg-red-100 text-red-700' 
                        : insight.priority === 'medium' 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {insight.priority === 'high' ? 'Alta' : insight.priority === 'medium' ? 'Media' : 'Baja'}
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">{insight.description}</p>
                  
                  {/* Progress bar for metrics with targets */}
                  {insight.target && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{insight.value?.toFixed(1)}</span>
                        <span>Meta: {insight.target}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div 
                          className="bg-gray-600 h-1 rounded-full" 
                          style={{ width: `${Math.min(((insight.value || 0) / insight.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Product list for specific insights */}
                  {insight.products && insight.products.length > 0 && (
                    <div className="mt-2">
                      <p className="text-gray-500 mb-1">Productos afectados:</p>
                      <div className="flex flex-wrap gap-1">
                        {insight.products.slice(0, 3).map((product, pIndex) => (
                          <span key={pIndex} className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs">
                            {product}
                          </span>
                        ))}
                        {insight.products.length > 3 && (
                          <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs">
                            +{insight.products.length - 3} más
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {insights.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">Sistema en Balance</h3>
          <p className="text-xs text-gray-500">
            No se detectaron problemas críticos en la producción actual.
          </p>
        </div>
      )}
    </div>
  );
}; 