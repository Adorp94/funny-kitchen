import pandas as pd
import numpy as np
from datetime import datetime, timedelta
try:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.linear_model import LinearRegression
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("Sklearn no disponible - usando métodos básicos de predicción")

import warnings
warnings.filterwarnings('ignore')

# Datos de ventas extraídos de la base de datos
sales_data = [
    {"fecha": "2025-01-02", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 325380.00, "mes": 1, "dia_semana": 4, "dia_mes": 2},
    {"fecha": "2025-01-03", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 70064.00, "mes": 1, "dia_semana": 5, "dia_mes": 3},
    {"fecha": "2025-01-06", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 2830.40, "mes": 1, "dia_semana": 1, "dia_mes": 6},
    {"fecha": "2025-01-07", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 55847.04, "mes": 1, "dia_semana": 2, "dia_mes": 7},
    {"fecha": "2025-01-10", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 84680.00, "mes": 1, "dia_semana": 5, "dia_mes": 10},
    {"fecha": "2025-01-15", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 4287.36, "mes": 1, "dia_semana": 3, "dia_mes": 15},
    {"fecha": "2025-01-17", "cotizaciones_por_dia": 4, "ventas_totales_mxn": 115868.54, "mes": 1, "dia_semana": 5, "dia_mes": 17},
    {"fecha": "2025-01-20", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 40110.48, "mes": 1, "dia_semana": 1, "dia_mes": 20},
    {"fecha": "2025-01-24", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 30537.00, "mes": 1, "dia_semana": 5, "dia_mes": 24},
    {"fecha": "2025-01-25", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 29974.40, "mes": 1, "dia_semana": 6, "dia_mes": 25},
    {"fecha": "2025-01-27", "cotizaciones_por_dia": 5, "ventas_totales_mxn": 110932.61, "mes": 1, "dia_semana": 1, "dia_mes": 27},
    {"fecha": "2025-01-28", "cotizaciones_por_dia": 3, "ventas_totales_mxn": 56215.00, "mes": 1, "dia_semana": 2, "dia_mes": 28},
    {"fecha": "2025-01-29", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 54747.07, "mes": 1, "dia_semana": 3, "dia_mes": 29},
    {"fecha": "2025-01-30", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 38241.73, "mes": 1, "dia_semana": 4, "dia_mes": 30},
    {"fecha": "2025-01-31", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 2816.03, "mes": 1, "dia_semana": 5, "dia_mes": 31},
    {"fecha": "2025-02-05", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 93648.00, "mes": 2, "dia_semana": 3, "dia_mes": 5},
    {"fecha": "2025-02-06", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 54856.00, "mes": 2, "dia_semana": 4, "dia_mes": 6},
    {"fecha": "2025-02-10", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 18038.96, "mes": 2, "dia_semana": 1, "dia_mes": 10},
    {"fecha": "2025-02-12", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 35461.20, "mes": 2, "dia_semana": 3, "dia_mes": 12},
    {"fecha": "2025-02-13", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 66990.00, "mes": 2, "dia_semana": 4, "dia_mes": 13},
    {"fecha": "2025-02-14", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 33686.40, "mes": 2, "dia_semana": 5, "dia_mes": 14},
    {"fecha": "2025-02-18", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 96160.09, "mes": 2, "dia_semana": 2, "dia_mes": 18},
    {"fecha": "2025-02-19", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 11484.00, "mes": 2, "dia_semana": 3, "dia_mes": 19},
    {"fecha": "2025-02-20", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 39277.60, "mes": 2, "dia_semana": 4, "dia_mes": 20},
    {"fecha": "2025-02-24", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 48720.00, "mes": 2, "dia_semana": 1, "dia_mes": 24},
    {"fecha": "2025-02-25", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 14061.52, "mes": 2, "dia_semana": 2, "dia_mes": 25},
    {"fecha": "2025-02-26", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 10440.00, "mes": 2, "dia_semana": 3, "dia_mes": 26},
    {"fecha": "2025-03-01", "cotizaciones_por_dia": 4, "ventas_totales_mxn": 245826.24, "mes": 3, "dia_semana": 6, "dia_mes": 1},
    {"fecha": "2025-03-05", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 36431.00, "mes": 3, "dia_semana": 3, "dia_mes": 5},
    {"fecha": "2025-03-06", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 28150.00, "mes": 3, "dia_semana": 4, "dia_mes": 6},
    {"fecha": "2025-03-08", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 22304.48, "mes": 3, "dia_semana": 6, "dia_mes": 8},
    {"fecha": "2025-03-10", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 80736.00, "mes": 3, "dia_semana": 1, "dia_mes": 10},
    {"fecha": "2025-03-12", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 37231.00, "mes": 3, "dia_semana": 3, "dia_mes": 12},
    {"fecha": "2025-03-13", "cotizaciones_por_dia": 3, "ventas_totales_mxn": 38520.12, "mes": 3, "dia_semana": 4, "dia_mes": 13},
    {"fecha": "2025-03-20", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 46980.00, "mes": 3, "dia_semana": 4, "dia_mes": 20},
    {"fecha": "2025-03-21", "cotizaciones_por_dia": 4, "ventas_totales_mxn": 165840.75, "mes": 3, "dia_semana": 5, "dia_mes": 21},
    {"fecha": "2025-03-25", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 32176.08, "mes": 3, "dia_semana": 2, "dia_mes": 25},
    {"fecha": "2025-03-26", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 100346.40, "mes": 3, "dia_semana": 3, "dia_mes": 26},
    {"fecha": "2025-03-28", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 57239.04, "mes": 3, "dia_semana": 5, "dia_mes": 28},
    {"fecha": "2025-03-31", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 23490.00, "mes": 3, "dia_semana": 1, "dia_mes": 31},
    {"fecha": "2025-04-02", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 68237.00, "mes": 4, "dia_semana": 3, "dia_mes": 2},
    {"fecha": "2025-04-11", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 36500.00, "mes": 4, "dia_semana": 5, "dia_mes": 11},
    {"fecha": "2025-04-15", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 45490.33, "mes": 4, "dia_semana": 2, "dia_mes": 15},
    {"fecha": "2025-04-16", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 50417.36, "mes": 4, "dia_semana": 3, "dia_mes": 16},
    {"fecha": "2025-04-22", "cotizaciones_por_dia": 3, "ventas_totales_mxn": 172591.57, "mes": 4, "dia_semana": 2, "dia_mes": 22},
    {"fecha": "2025-04-25", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 78330.00, "mes": 4, "dia_semana": 5, "dia_mes": 25},
    {"fecha": "2025-04-29", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 150497.60, "mes": 4, "dia_semana": 2, "dia_mes": 29},
    {"fecha": "2025-04-30", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 6344.40, "mes": 4, "dia_semana": 3, "dia_mes": 30},
    {"fecha": "2025-05-01", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 39448.19, "mes": 5, "dia_semana": 4, "dia_mes": 1},
    {"fecha": "2025-05-12", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 35082.96, "mes": 5, "dia_semana": 1, "dia_mes": 12},
    {"fecha": "2025-05-13", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 308524.00, "mes": 5, "dia_semana": 2, "dia_mes": 13},
    {"fecha": "2025-05-14", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 16192.00, "mes": 5, "dia_semana": 3, "dia_mes": 14},
    {"fecha": "2025-05-15", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 98837.00, "mes": 5, "dia_semana": 4, "dia_mes": 15},
    {"fecha": "2025-05-17", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 37819.76, "mes": 5, "dia_semana": 6, "dia_mes": 17},
    {"fecha": "2025-05-20", "cotizaciones_por_dia": 3, "ventas_totales_mxn": 72973.36, "mes": 5, "dia_semana": 2, "dia_mes": 20},
    {"fecha": "2025-05-21", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 20256.80, "mes": 5, "dia_semana": 3, "dia_mes": 21},
    {"fecha": "2025-05-22", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 79726.00, "mes": 5, "dia_semana": 4, "dia_mes": 22},
    {"fecha": "2025-05-23", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 69969.00, "mes": 5, "dia_semana": 5, "dia_mes": 23},
    {"fecha": "2025-05-26", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 38628.00, "mes": 5, "dia_semana": 1, "dia_mes": 26},
    {"fecha": "2025-05-28", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 23490.00, "mes": 5, "dia_semana": 3, "dia_mes": 28},
    {"fecha": "2025-05-29", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 51040.00, "mes": 5, "dia_semana": 4, "dia_mes": 29},
    {"fecha": "2025-06-02", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 45232.20, "mes": 6, "dia_semana": 1, "dia_mes": 2},
    {"fecha": "2025-06-03", "cotizaciones_por_dia": 3, "ventas_totales_mxn": 140983.28, "mes": 6, "dia_semana": 2, "dia_mes": 3},
    {"fecha": "2025-06-04", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 41887.60, "mes": 6, "dia_semana": 3, "dia_mes": 4},
    {"fecha": "2025-06-11", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 66874.00, "mes": 6, "dia_semana": 3, "dia_mes": 11},
    {"fecha": "2025-06-12", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 32310.80, "mes": 6, "dia_semana": 4, "dia_mes": 12},
    {"fecha": "2025-06-13", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 320414.00, "mes": 6, "dia_semana": 5, "dia_mes": 13},
    {"fecha": "2025-06-16", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 16660.88, "mes": 6, "dia_semana": 1, "dia_mes": 16},
    {"fecha": "2025-06-17", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 4453.00, "mes": 6, "dia_semana": 2, "dia_mes": 17},
    {"fecha": "2025-06-19", "cotizaciones_por_dia": 5, "ventas_totales_mxn": 130826.92, "mes": 6, "dia_semana": 4, "dia_mes": 19},
    {"fecha": "2025-06-20", "cotizaciones_por_dia": 3, "ventas_totales_mxn": 20040.32, "mes": 6, "dia_semana": 5, "dia_mes": 20},
    {"fecha": "2025-06-23", "cotizaciones_por_dia": 4, "ventas_totales_mxn": 30262.16, "mes": 6, "dia_semana": 1, "dia_mes": 23},
    {"fecha": "2025-06-24", "cotizaciones_por_dia": 3, "ventas_totales_mxn": 20390.04, "mes": 6, "dia_semana": 2, "dia_mes": 24},
    {"fecha": "2025-06-25", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 17325.40, "mes": 6, "dia_semana": 3, "dia_mes": 25},
    {"fecha": "2025-06-26", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 52432.00, "mes": 6, "dia_semana": 4, "dia_mes": 26},
    {"fecha": "2025-06-27", "cotizaciones_por_dia": 3, "ventas_totales_mxn": 147097.64, "mes": 6, "dia_semana": 5, "dia_mes": 27},
    {"fecha": "2025-06-28", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 13302.40, "mes": 6, "dia_semana": 6, "dia_mes": 28},
    {"fecha": "2025-06-29", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 9466.00, "mes": 6, "dia_semana": 0, "dia_mes": 29},
    {"fecha": "2025-06-30", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 75637.00, "mes": 6, "dia_semana": 1, "dia_mes": 30},
    {"fecha": "2025-07-01", "cotizaciones_por_dia": 6, "ventas_totales_mxn": 60581.40, "mes": 7, "dia_semana": 2, "dia_mes": 1},
    {"fecha": "2025-07-02", "cotizaciones_por_dia": 9, "ventas_totales_mxn": 310353.52, "mes": 7, "dia_semana": 3, "dia_mes": 2},
    {"fecha": "2025-07-04", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 4517.20, "mes": 7, "dia_semana": 5, "dia_mes": 4},
    {"fecha": "2025-07-07", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 93606.40, "mes": 7, "dia_semana": 1, "dia_mes": 7},
    {"fecha": "2025-07-09", "cotizaciones_por_dia": 3, "ventas_totales_mxn": 34210.80, "mes": 7, "dia_semana": 3, "dia_mes": 9},
    {"fecha": "2025-07-10", "cotizaciones_por_dia": 3, "ventas_totales_mxn": 69910.80, "mes": 7, "dia_semana": 4, "dia_mes": 10},
    {"fecha": "2025-07-11", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 20374.40, "mes": 7, "dia_semana": 5, "dia_mes": 11},
    {"fecha": "2025-07-12", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 23556.00, "mes": 7, "dia_semana": 6, "dia_mes": 12},
    {"fecha": "2025-07-14", "cotizaciones_por_dia": 4, "ventas_totales_mxn": 356440.28, "mes": 7, "dia_semana": 1, "dia_mes": 14},
    {"fecha": "2025-07-15", "cotizaciones_por_dia": 4, "ventas_totales_mxn": 402162.67, "mes": 7, "dia_semana": 2, "dia_mes": 15},
    {"fecha": "2025-07-16", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 15400.00, "mes": 7, "dia_semana": 3, "dia_mes": 16},
    {"fecha": "2025-07-17", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 17792.00, "mes": 7, "dia_semana": 4, "dia_mes": 17},
    {"fecha": "2025-07-18", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 26227.00, "mes": 7, "dia_semana": 5, "dia_mes": 18},
    {"fecha": "2025-07-22", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 244090.24, "mes": 7, "dia_semana": 2, "dia_mes": 22},
    {"fecha": "2025-07-23", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 9452.00, "mes": 7, "dia_semana": 3, "dia_mes": 23},
    {"fecha": "2025-07-26", "cotizaciones_por_dia": 2, "ventas_totales_mxn": 22990.00, "mes": 7, "dia_semana": 6, "dia_mes": 26},
    {"fecha": "2025-07-28", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 42189.99, "mes": 7, "dia_semana": 1, "dia_mes": 28},
    {"fecha": "2025-07-29", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 19392.00, "mes": 7, "dia_semana": 2, "dia_mes": 29},
    {"fecha": "2025-08-04", "cotizaciones_por_dia": 1, "ventas_totales_mxn": 29008.00, "mes": 8, "dia_semana": 1, "dia_mes": 4}
]

# Crear DataFrame
df = pd.DataFrame(sales_data)
df['fecha'] = pd.to_datetime(df['fecha'])

# Análisis de patrones y estacionalidad
print("=== ANÁLISIS DE PATRONES DE VENTAS FUNNY KITCHEN 2025 ===\n")

# Estadísticas básicas
print("1. ESTADÍSTICAS GENERALES:")
print(f"Total de días con ventas: {len(df)}")
print(f"Rango de fechas: {df['fecha'].min().strftime('%Y-%m-%d')} a {df['fecha'].max().strftime('%Y-%m-%d')}")
print(f"Total de cotizaciones: {df['cotizaciones_por_dia'].sum()}")
print(f"Ventas totales 2025: ${df['ventas_totales_mxn'].sum():,.2f} MXN")
print(f"Promedio diario: ${df['ventas_totales_mxn'].mean():,.2f} MXN")
print(f"Mediana diaria: ${df['ventas_totales_mxn'].median():,.2f} MXN")

# Análisis por mes
monthly_sales = df.groupby('mes').agg({
    'ventas_totales_mxn': ['sum', 'mean', 'count'],
    'cotizaciones_por_dia': 'sum'
}).round(2)

print("\n2. VENTAS POR MES:")
print("Mes | Ventas Totales | Promedio Diario | Días con Ventas | Cotizaciones")
for mes in range(1, 9):
    if mes in monthly_sales.index:
        total = monthly_sales.loc[mes, ('ventas_totales_mxn', 'sum')]
        avg = monthly_sales.loc[mes, ('ventas_totales_mxn', 'mean')]
        days = monthly_sales.loc[mes, ('ventas_totales_mxn', 'count')]
        cot = monthly_sales.loc[mes, ('cotizaciones_por_dia', 'sum')]
        print(f"{mes:2d}  | ${total:11,.0f} | ${avg:13,.0f} | {days:11d} | {cot:11d}")

# Análisis por día de la semana
weekly_pattern = df.groupby('dia_semana').agg({
    'ventas_totales_mxn': ['mean', 'count'],
    'cotizaciones_por_dia': 'mean'
}).round(2)

dias_semana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
print("\n3. PATRÓN SEMANAL:")
print("Día Semana    | Promedio Ventas | Días | Cotizaciones Prom")
for i in range(7):
    if i in weekly_pattern.index:
        avg = weekly_pattern.loc[i, ('ventas_totales_mxn', 'mean')]
        days = weekly_pattern.loc[i, ('ventas_totales_mxn', 'count')]
        cot_avg = weekly_pattern.loc[i, ('cotizaciones_por_dia', 'mean')]
        print(f"{dias_semana[i]:12} | ${avg:13,.0f} | {days:4d} | {cot_avg:14.1f}")

# Análisis de marzo específicamente
marzo_data = df[df['mes'] == 3]
print("\n4. ANÁLISIS ESPECÍFICO DE MARZO:")
print(f"Días con ventas en marzo: {len(marzo_data)}")
print(f"Total ventas marzo: ${marzo_data['ventas_totales_mxn'].sum():,.2f} MXN")
print(f"Promedio diario marzo: ${marzo_data['ventas_totales_mxn'].mean():,.2f} MXN")
print(f"Total cotizaciones marzo: {marzo_data['cotizaciones_por_dia'].sum()}")

# Datos históricos del 26 de marzo
marzo_26_historico = df[(df['mes'] == 3) & (df['dia_mes'] == 26)]
if not marzo_26_historico.empty:
    print(f"\n5. HISTÓRICO 26 DE MARZO:")
    for _, row in marzo_26_historico.iterrows():
        print(f"2025-03-26: {row['cotizaciones_por_dia']} cotizaciones, ${row['ventas_totales_mxn']:,.2f} MXN")

# Preparar datos para algoritmos de predicción
print("\n6. PREPARACIÓN DE MODELOS DE PREDICCIÓN:")

# Crear características para el modelo
df_model = df.copy()
df_model['day_of_year'] = df_model['fecha'].dt.dayofyear
df_model['week_of_year'] = df_model['fecha'].dt.isocalendar().week
df_model['is_weekend'] = df_model['dia_semana'].isin([0, 6]).astype(int)
df_model['days_since_start'] = (df_model['fecha'] - df_model['fecha'].min()).dt.days

# Features para el modelo
features = ['mes', 'dia_semana', 'dia_mes', 'day_of_year', 'week_of_year', 'is_weekend', 'days_since_start', 'cotizaciones_por_dia']
X = df_model[features]
y = df_model['ventas_totales_mxn']

if SKLEARN_AVAILABLE:
    # Split para validación (últimos 20% de datos para test)
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    # Modelo 1: Regresión Lineal
    print("\nProbando Regresión Lineal...")
    lr_model = LinearRegression()
    lr_model.fit(X_train, y_train)
    lr_pred = lr_model.predict(X_test)
    lr_mae = mean_absolute_error(y_test, lr_pred)
    lr_r2 = r2_score(y_test, lr_pred)

    # Modelo 2: Random Forest
    print("Probando Random Forest...")
    rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_model.fit(X_train, y_train)
    rf_pred = rf_model.predict(X_test)
    rf_mae = mean_absolute_error(y_test, rf_pred)
    rf_r2 = r2_score(y_test, rf_pred)
else:
    # Métodos básicos sin sklearn
    split_idx = int(len(df) * 0.8)
    train_data = df[:split_idx]
    test_data = df[split_idx:]
    
    # Calcular métricas básicas manualmente
    def manual_mae(actual, predicted):
        return np.mean(np.abs(actual - predicted))
    
    def manual_r2(actual, predicted):
        ss_res = np.sum((actual - predicted) ** 2)
        ss_tot = np.sum((actual - np.mean(actual)) ** 2)
        return 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
    
    # Modelo simple: promedio móvil
    lr_mae = lr_r2 = rf_mae = rf_r2 = 0
    print("\nUsando métodos básicos de predicción...")

# Modelo 3: Promedio móvil por día de la semana
print("Probando Promedio Móvil por Día de Semana...")
weekly_avg = df.groupby('dia_semana')['ventas_totales_mxn'].mean()

if SKLEARN_AVAILABLE:
    # Predicción basada en día de la semana
    ma_pred = []
    for _, row in X_test.iterrows():
        day_of_week = row['dia_semana']
        ma_pred.append(weekly_avg.get(day_of_week, weekly_avg.mean()))
    
    ma_mae = mean_absolute_error(y_test, ma_pred)
    ma_r2 = r2_score(y_test, ma_pred)
else:
    # Versión básica
    test_predictions = []
    actual_values = []
    
    for _, row in df[split_idx:].iterrows():
        day_of_week = row['dia_semana']
        predicted = weekly_avg.get(day_of_week, weekly_avg.mean())
        test_predictions.append(predicted)
        actual_values.append(row['ventas_totales_mxn'])
    
    ma_mae = manual_mae(np.array(actual_values), np.array(test_predictions))
    ma_r2 = manual_r2(np.array(actual_values), np.array(test_predictions))

print("\n7. COMPARACIÓN DE MODELOS:")
print("Modelo                    | MAE          | R²")

if SKLEARN_AVAILABLE:
    print(f"Regresión Lineal          | ${lr_mae:10,.0f} | {lr_r2:6.3f}")
    print(f"Random Forest             | ${rf_mae:10,.0f} | {rf_r2:6.3f}")
    print(f"Promedio Móvil Semanal    | ${ma_mae:10,.0f} | {ma_r2:6.3f}")
    
    # Seleccionar el mejor modelo
    models = [
        ('Regresión Lineal', lr_model, lr_mae, lr_r2),
        ('Random Forest', rf_model, rf_mae, rf_r2),
        ('Promedio Móvil Semanal', None, ma_mae, ma_r2)
    ]
else:
    print(f"Promedio Móvil Semanal    | ${ma_mae:10,.0f} | {ma_r2:6.3f}")
    
    # Solo modelo disponible
    models = [
        ('Promedio Móvil Semanal', None, ma_mae, ma_r2)
    ]

best_model = min(models, key=lambda x: x[2])
print(f"\nMEJOR MODELO: {best_model[0]} (MAE: ${best_model[2]:,.0f})")

# Predicción para marzo 26, 2026
print("\n8. PREDICCIÓN PARA 26 DE MARZO 2026:")

# Características para marzo 26, 2026
marzo_26_2026 = pd.to_datetime('2026-03-26')
day_of_week_2026 = marzo_26_2026.weekday() + 1 if marzo_26_2026.weekday() != 6 else 0

if SKLEARN_AVAILABLE:
    features_2026 = pd.DataFrame({
        'mes': [3],
        'dia_semana': [day_of_week_2026],
        'dia_mes': [26],
        'day_of_year': [marzo_26_2026.dayofyear],
        'week_of_year': [marzo_26_2026.isocalendar().week],
        'is_weekend': [1 if marzo_26_2026.weekday() >= 5 else 0],
        'days_since_start': [365 + (marzo_26_2026 - df['fecha'].min()).days],
        'cotizaciones_por_dia': [2]  # Estimación basada en promedio histórico
    })

    if best_model[0] == 'Random Forest':
        prediction = rf_model.predict(features_2026)[0]
    elif best_model[0] == 'Regresión Lineal':
        prediction = lr_model.predict(features_2026)[0]
    else:  # Promedio móvil
        prediction = weekly_avg.get(day_of_week_2026, weekly_avg.mean())
else:
    # Versión básica - usar promedio móvil por día de semana
    prediction = weekly_avg.get(day_of_week_2026, weekly_avg.mean())

# Cálculos adicionales
marzo_historical_avg = marzo_data['ventas_totales_mxn'].mean()
dia_26_historico_valor = marzo_26_historico['ventas_totales_mxn'].iloc[0] if not marzo_26_historico.empty else None

print(f"Algoritmo seleccionado: {best_model[0]}")
print(f"Predicción para 2026-03-26: ${prediction:,.0f} MXN")
print(f"Promedio histórico marzo: ${marzo_historical_avg:,.0f} MXN")
if dia_26_historico_valor:
    print(f"Valor histórico 2025-03-26: ${dia_26_historico_valor:,.0f} MXN")

# Rango de confianza
mae = best_model[2]
print(f"\nRango de confianza (±MAE): ${prediction-mae:,.0f} - ${prediction+mae:,.0f} MXN")

print("\n=== RESUMEN EJECUTIVO ===")
print(f"Para el 26 de marzo de 2026, el modelo {best_model[0]} predice:")
print(f"Ventas esperadas: ${prediction:,.0f} MXN")
print(f"Rango probable: ${prediction-mae:,.0f} - ${prediction+mae:,.0f} MXN")
print(f"Basado en {len(df)} días de datos históricos de 2025")