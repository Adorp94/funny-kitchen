"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Target,
  TrendingUp,
  TrendingDown,
  Factory,
  Package
} from 'lucide-react';

interface SimpleInsight {
  type: 'warning' | 'success' | 'info' | 'urgent';
  icon: JSX.Element;
  title: string;
  message: string;
  action?: string;
  products?: string[];
  value?: number;
}

interface ProductionOverview {
  totalProducts: number;
  productsOnTrack: number;
  productsBehind: number;
  productsAhead: number;
  overallProgress: number;
}

export const ProductionInsights: React.FC = () => {
  const [insights, setInsights] = useState<SimpleInsight[]>([]);
  const [overview, setOverview] = useState<ProductionOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const generateSimpleInsights = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch real production data
      const response = await fetch('/api/production-active');
      const data = await response.json();
      
      if (!data.success || !data.data) {
        setLoading(false);
        return;
      }

      const products = data.data;
      const newInsights: SimpleInsight[] = [];

      // Calculate overview
      const productsOnTrack = products.filter((p: any) => p.faltan_sobran >= -10 && p.faltan_sobran <= 10).length;
      const productsBehind = products.filter((p: any) => p.faltan_sobran < -10).length;
      const productsAhead = products.filter((p: any) => p.faltan_sobran > 10).length;
      
      const totalPedidos = products.reduce((sum: number, p: any) => sum + p.pedidos, 0);
      const totalTerminado = products.reduce((sum: number, p: any) => sum + p.terminado, 0);
      const overallProgress = totalPedidos > 0 ? (totalTerminado / totalPedidos) * 100 : 0;

      const newOverview: ProductionOverview = {
        totalProducts: products.length,
        productsOnTrack,
        productsBehind,
        productsAhead,
        overallProgress
      };

      // 1. Products that need immediate attention (critical deficit)
      const criticalProducts = products.filter((p: any) => p.faltan_sobran < -50);
      if (criticalProducts.length > 0) {
        newInsights.push({
          type: 'urgent',
          icon: <AlertTriangle className="h-4 w-4" />,
          title: 'Atención Urgente Requerida',
          message: `${criticalProducts.length} productos necesitan más de 50 piezas para cumplir pedidos`,
          action: 'Revisar producción y priorizar estos productos',
          products: criticalProducts.map((p: any) => p.producto_nombre).slice(0, 3),
          value: criticalProducts.reduce((sum: number, p: any) => sum + Math.abs(p.faltan_sobran), 0)
        });
      }

      // 2. Bottlenecks in the pipeline
      const detallePendiente = products.filter((p: any) => p.por_detallar > 20);
      if (detallePendiente.length > 0) {
        newInsights.push({
          type: 'warning',
          icon: <Clock className="h-4 w-4" />,
          title: 'Productos Esperando Detallado',
          message: `${detallePendiente.length} productos tienen piezas acumuladas esperando ser detalladas`,
          action: 'Asignar más recursos al proceso de detallado',
          products: detallePendiente.map((p: any) => p.producto_nombre).slice(0, 3)
        });
      }

      // 3. Sancocho bottleneck
      const sancochoPendiente = products.filter((p: any) => p.detallado > 30);
      if (sancochoPendiente.length > 0) {
        newInsights.push({
          type: 'warning',
          icon: <Factory className="h-4 w-4" />,
          title: 'Cuello de Botella en Sancocho',
          message: `${sancochoPendiente.length} productos tienen piezas detalladas esperando sancocho`,
          action: 'Optimizar capacidad de hornos',
          products: sancochoPendiente.map((p: any) => p.producto_nombre).slice(0, 3)
        });
      }

      // 4. Overproduction warning
      const overProduced = products.filter((p: any) => p.faltan_sobran > 50);
      if (overProduced.length > 0) {
        newInsights.push({
          type: 'info',
          icon: <Package className="h-4 w-4" />,
          title: 'Sobreproducción Detectada',
          message: `${overProduced.length} productos tienen exceso de más de 50 piezas`,
          action: 'Considerar pausar producción y redistribuir recursos',
          products: overProduced.map((p: any) => p.producto_nombre).slice(0, 3)
        });
      }

      // 5. Good news - products on track
      if (productsOnTrack > productsBehind && overallProgress > 70) {
        newInsights.push({
          type: 'success',
          icon: <CheckCircle className="h-4 w-4" />,
          title: 'Producción en Buen Ritmo',
          message: `${productsOnTrack} productos están dentro del rango esperado`,
          action: 'Mantener el ritmo actual de producción'
        });
      }

      // 6. Overall production status
      if (overallProgress < 50) {
        newInsights.push({
          type: 'warning',
          icon: <TrendingDown className="h-4 w-4" />,
          title: 'Progreso General Bajo',
          message: `Solo ${overallProgress.toFixed(1)}% de todos los pedidos están completos`,
          action: 'Revisar capacidad general y cuellos de botella'
        });
      } else if (overallProgress > 80) {
        newInsights.push({
          type: 'success',
          icon: <TrendingUp className="h-4 w-4" />,
          title: 'Excelente Progreso',
          message: `${overallProgress.toFixed(1)}% de progreso general en pedidos`,
          action: 'Continuar con el buen trabajo'
        });
      }

      setOverview(newOverview);
      setInsights(newInsights);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    generateSimpleInsights();
    // Refresh every 30 seconds
    const interval = setInterval(generateSimpleInsights, 30000);
    return () => clearInterval(interval);
  }, [generateSimpleInsights]);

  const getInsightStyle = (type: string) => {
    switch (type) {
      case 'urgent': return 'bg-red-50 border-red-200 text-red-900';
      case 'warning': return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'success': return 'bg-green-50 border-green-200 text-green-900';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-900';
      default: return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'urgent': return 'text-red-600';
      case 'warning': return 'text-orange-600';
      case 'success': return 'text-green-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Simple Overview */}
      {overview && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Resumen de Producción</h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{overview.productsOnTrack}</div>
              <div className="text-xs text-gray-500">En Tiempo</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">{overview.productsBehind}</div>
              <div className="text-xs text-gray-500">Atrasados</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{overview.productsAhead}</div>
              <div className="text-xs text-gray-500">Adelantados</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">{overview.totalProducts}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progreso General</span>
              <span>{overview.overallProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gray-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(overview.overallProgress, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Simple Insights */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Recomendaciones</h3>
        </div>
        
        <div className="p-4 space-y-3">
          {insights.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">¡Todo en orden!</p>
              <p className="text-xs text-gray-500">No hay problemas críticos detectados</p>
            </div>
          ) : (
            insights.map((insight, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg border ${getInsightStyle(insight.type)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className={getIconColor(insight.type)}>
                    {insight.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium mb-1">{insight.title}</h4>
                    <p className="text-sm mb-2">{insight.message}</p>
                    
                    {insight.action && (
                      <p className="text-xs italic opacity-80 mb-2">
                        💡 {insight.action}
                      </p>
                    )}

                    {insight.products && insight.products.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {insight.products.map((product, pIndex) => (
                          <span 
                            key={pIndex} 
                            className="bg-white bg-opacity-50 px-2 py-1 rounded text-xs"
                          >
                            {product}
                          </span>
                        ))}
                      </div>
                    )}

                    {insight.value && (
                      <div className="text-xs font-medium">
                        Total: {insight.value} piezas
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}; 