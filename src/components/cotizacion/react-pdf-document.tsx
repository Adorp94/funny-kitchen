import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image, Link } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';

// Register fonts
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 'normal' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 'medium' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 'bold' }
  ]
});

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    padding: 24,
    fontFamily: 'Roboto',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logo: {
    width: 110,
    height: 50,
    objectFit: 'contain',
  },
  headerRight: {
    textAlign: 'right',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerText: {
    fontSize: 8,
    color: '#4b5563',
    marginBottom: 2,
  },
  section: {
    marginBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    width: '48%',
  },
  columnTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  clientInfo: {
    fontSize: 8,
    color: '#4b5563',
    lineHeight: 1.4,
  },
  clientName: {
    fontSize: 9,
    fontWeight: 'medium',
    color: '#111827',
    marginBottom: 2,
  },
  right: {
    textAlign: 'right',
  },
  table: {
    marginTop: 4,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 3,
    paddingHorizontal: 4,
  },
  tableCol1: {
    width: '50%',
    fontSize: 8,
  },
  tableCol2: {
    width: '10%',
    textAlign: 'center',
    fontSize: 8,
  },
  tableCol3: {
    width: '20%',
    textAlign: 'right',
    fontSize: 8,
  },
  tableCol4: {
    width: '5%',
    textAlign: 'right',
    fontSize: 8,
  },
  tableCol5: {
    width: '15%',
    textAlign: 'right',
    fontSize: 8,
  },
  tableHeaderText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  tableHeaderTextCenter: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
    textAlign: 'center',
  },
  tableHeaderTextRight: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#6b7280',
    textAlign: 'right',
  },
  tableRowText: {
    fontSize: 7.5,
    color: '#374151',
  },
  threeColumnSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexGrow: 0,
  },
  threeColumnLeft: {
    width: '31%',
  },
  threeColumnCenter: {
    width: '31%',
  },
  threeColumnRight: {
    width: '31%',
  },
  summarySection: {
    marginBottom: 10,
    flexGrow: 0,
  },
  summaryRight: {
    width: '35%',
    marginLeft: 'auto',
  },
  twoColumnSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  twoColumnLeft: {
    width: '48%',
  },
  twoColumnRight: {
    width: '48%',
  },
  boxTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  box: {
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    padding: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#4b5563',
  },
  summaryValue: {
    fontSize: 8,
    fontWeight: 'medium',
    color: '#374151',
  },
  summaryNegative: {
    fontSize: 8,
    fontWeight: 'medium',
    color: '#dc2626',
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 3,
    marginTop: 3,
  },
  summaryTotalLabel: {
    fontSize: 9,
    fontWeight: 'medium',
    color: '#1f2937',
  },
  summaryTotalValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  bankInfoText: {
    fontSize: 8,
    color: '#4b5563',
    marginBottom: 2,
  },
  bankInfoHighlight: {
    fontSize: 8,
    fontWeight: 'medium',
    color: '#1f2937',
    marginBottom: 2,
  },
  termsBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
  },
  notesList: {
    marginLeft: 4,
  },
  notesListItem: {
    fontSize: 7,
    color: '#4b5563',
    marginBottom: 2,
    lineHeight: 1.3,
  },
  termsText: {
    fontSize: 7,
    color: '#4b5563',
    marginBottom: 2,
    lineHeight: 1.3,
  },
  termsLink: {
    fontSize: 7,
    color: '#0891b2',
    textDecoration: 'underline',
  },
  spacer: {
    flexGrow: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
    marginTop: 'auto',
  },
  footerTitle: {
    fontSize: 8,
    fontWeight: 'medium',
    color: '#1f2937',
    marginBottom: 3,
  },
  footerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: '#4b5563',
    marginBottom: 1,
  },
  footerRight: {
    textAlign: 'right',
  },
});

// Types for PDF data
interface Cliente {
  nombre: string;
  celular: string;
  correo: string | null;
  tipo_cliente: string | null;
  atencion: string | null;
  razon_social?: string | null;
  rfc?: string | null;
  direccion_envio?: string | null;
  recibe?: string | null;
}

interface Producto {
  id: string;
  descripcion: string;
  producto_nombre?: string;
  cantidad: number;
  precio_unitario: number;
  precio_mxn?: number;
  descuento: number;
  precio_total: number;
  subtotal_mxn?: number;
  sku?: string;
  colores?: string[];
}

interface Cotizacion {
  id?: string;
  folio?: string;
  moneda?: 'MXN' | 'USD';
  subtotal?: number;
  subtotal_mxn?: number;
  descuento_global?: number;
  iva?: boolean;
  monto_iva?: number;
  incluye_envio?: boolean;
  costo_envio?: number;
  costo_envio_mxn?: number;
  total?: number;
  total_mxn?: number;
  tipo_cambio?: number;
  tiempo_estimado?: number;
  tiempo_estimado_max?: number;
  productos?: Producto[];
}

interface ReactPDFDocumentProps {
  cliente: Cliente;
  folio?: string;
  cotizacion: Cotizacion;
}

// PDF Document Component
const ReactPDFDocument: React.FC<ReactPDFDocumentProps> = ({ cliente, folio, cotizacion }) => {
  // Get today's date formatted
  const fechaActual = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
  
  // Debug the incoming cotizacion data
  console.log("ReactPDFDocument - Raw cotizacion:", cotizacion);
  console.log("ReactPDFDocument - Currency:", cotizacion?.moneda);
  console.log("ReactPDFDocument - Exchange rate:", cotizacion?.tipo_cambio);
  console.log("ReactPDFDocument - Subtotal:", cotizacion?.subtotal);
  console.log("ReactPDFDocument - Total:", cotizacion?.total);
  
  // Use provided values or defaults
  const moneda = cotizacion?.moneda || 'MXN';
  const productos = cotizacion?.productos || [];
  const subtotal = cotizacion?.subtotal || 0;
  const descuento_global = cotizacion?.descuento_global || 0;
  const iva = cotizacion?.iva || false;
  const monto_iva = cotizacion?.monto_iva || 0;
  const incluye_envio = cotizacion?.incluye_envio || false;
  const costo_envio = cotizacion?.costo_envio || 0;
  const total = cotizacion?.total || 0;
  const displayFolio = cotizacion?.folio || folio || '';
  
  // Force the tiempo_estimado to be a number (could be undefined, string, etc.)
  let tiempoEstimado: number;
  if (typeof cotizacion?.tiempo_estimado === 'number') {
    tiempoEstimado = cotizacion.tiempo_estimado;
  } else if (typeof cotizacion?.tiempo_estimado === 'string') {
    tiempoEstimado = parseInt(cotizacion.tiempo_estimado, 10) || 6;
  } else {
    tiempoEstimado = 6; // Default value
  }
  
  // Handle tiempo_estimado_max
  let tiempoEstimadoMax: number;
  if (typeof cotizacion?.tiempo_estimado_max === 'number') {
    tiempoEstimadoMax = cotizacion.tiempo_estimado_max;
  } else if (typeof cotizacion?.tiempo_estimado_max === 'string') {
    tiempoEstimadoMax = parseInt(cotizacion.tiempo_estimado_max, 10) || 8;
  } else {
    tiempoEstimadoMax = 8; // Default value
  }
  
  // Ensure tiempoEstimadoMax is not less than tiempoEstimado
  if (tiempoEstimadoMax < tiempoEstimado) {
    tiempoEstimadoMax = tiempoEstimado;
  }
  
  console.log("ReactPDFDocument - Using tiempo_estimado:", tiempoEstimado);
  console.log("ReactPDFDocument - Using tiempo_estimado_max:", tiempoEstimadoMax);
  
  // Calculate total product discounts
  const totalProductDiscounts = productos.reduce((sum, producto) => {
    if (producto.descuento && producto.descuento > 0) {
      const discountAmount = producto.precio_unitario * producto.cantidad * (producto.descuento / 100);
      return sum + discountAmount;
    }
    return sum;
  }, 0);
  
  // Subtotal after product discounts
  const subtotalAfterProductDiscounts = subtotal - totalProductDiscounts;

  // Increase the product limit from 8 to 15
  const displayProductos = productos.slice(0, 15);
  const hasMoreProducts = productos.length > 15;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image 
            src="/logo.png" 
            style={styles.logo} 
          />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>COTIZACIÓN</Text>
            <Text style={styles.headerText}>Folio: {displayFolio}</Text>
            <Text style={styles.headerText}>Fecha: {fechaActual}</Text>
            <Text style={styles.headerText}>Divisa: {moneda}</Text>
          </View>
        </View>
        
        {/* Client and Company Information */}
        <View style={styles.grid}>
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Cliente</Text>
            <Text style={styles.clientName}>{cliente.nombre}</Text>
            {cliente.razon_social && (
              <Text style={styles.clientInfo}>{cliente.razon_social}</Text>
            )}
            {cliente.rfc && (
              <Text style={styles.clientInfo}>RFC: {cliente.rfc}</Text>
            )}
            <Text style={styles.clientInfo}>{cliente.celular}</Text>
            {cliente.correo && (
              <Text style={styles.clientInfo}>{cliente.correo}</Text>
            )}
            {cliente.atencion && (
              <Text style={styles.clientInfo}>Atención: {cliente.atencion}</Text>
            )}
            {cliente.direccion_envio && (
              <Text style={styles.clientInfo}>{cliente.direccion_envio}</Text>
            )}
            {cliente.recibe && (
              <Text style={styles.clientInfo}>Recibe: {cliente.recibe}</Text>
            )}
          </View>
          
          <View style={[styles.column, styles.right]}>
            <Text style={styles.columnTitle}>Emisor</Text>
            <Text style={styles.clientName}>Funny Kitchen S.A. de C.V.</Text>
            <Text style={styles.clientInfo}>Cmo. al Alemán, 45200 Nextipac, Jal.</Text>
            <Text style={styles.clientInfo}>Int 14, Elite Nextipac I Industrial.</Text>
            <Text style={styles.clientInfo}>(33) 1055 6554</Text>
            <Text style={styles.clientInfo}>hola@funnykitchen.mx</Text>
          </View>
        </View>
        
        {/* Products */}
        <View style={styles.section}>
          <Text style={styles.columnTitle}>Productos</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <View style={styles.tableCol1}>
                <Text style={styles.tableHeaderText}>Descripción</Text>
              </View>
              <View style={styles.tableCol2}>
                <Text style={styles.tableHeaderTextCenter}>Cant.</Text>
              </View>
              <View style={styles.tableCol3}>
                <Text style={styles.tableHeaderTextRight}>P. Unitario</Text>
              </View>
              {productos.some(p => p.descuento && p.descuento > 0) && (
                <View style={styles.tableCol4}>
                  <Text style={styles.tableHeaderTextRight}>Desc.</Text>
                </View>
              )}
              <View style={productos.some(p => p.descuento && p.descuento > 0) ? styles.tableCol5 : { ...styles.tableCol4, width: '20%' }}>
                <Text style={styles.tableHeaderTextRight}>Subtotal</Text>
              </View>
            </View>
            
            {/* Table Rows - Limited to fit single page */}
            {displayProductos.map((item, index) => (
              <View style={styles.tableRow} key={item.id || index} wrap={false}>
                <View style={styles.tableCol1}>
                  <Text style={styles.tableRowText}>{item.descripcion || item.producto_nombre || 'N/A'}</Text>
                </View>
                <Text style={[styles.tableCol2, styles.tableRowText]}>{item.cantidad}</Text>
                <Text style={[styles.tableCol3, styles.tableRowText]}>
                  {formatCurrency(item.precio_unitario, moneda)}
                </Text>
                {productos.some(p => p.descuento && p.descuento > 0) && (
                  <Text style={[styles.tableCol4, styles.tableRowText]}>
                    {item.descuento > 0 ? `${item.descuento}%` : '-'}
                  </Text>
                )}
                <Text style={[
                  productos.some(p => p.descuento && p.descuento > 0)
                    ? styles.tableCol5 // Has width: '15%', textAlign: 'right'
                    : { ...styles.tableCol4, width: '20%' }, // Ensures width: '20%', inherits textAlign: 'right' from tableCol4
                  styles.tableRowText
                ]}>
                  {formatCurrency(item.precio_total, moneda)}
                </Text>
              </View>
            ))}
            
            {/* Show a message if there are more products */}
            {hasMoreProducts && (
              <View style={styles.tableRow}>
                <View style={styles.tableCol1}>
                  <Text style={[styles.tableRowText, { fontStyle: 'italic' }]}>
                    Y {productos.length - 15} productos más...
                  </Text>
                </View>
                <View style={styles.tableCol2}></View>
                <View style={styles.tableCol3}></View>
                {productos.some(p => p.descuento && p.descuento > 0) && (
                  <View style={styles.tableCol4}></View>
                )}
                <View style={productos.some(p => p.descuento && p.descuento > 0) ? styles.tableCol5 : { ...styles.tableCol4, width: '20%' }}></View>
              </View>
            )}
          </View>
        </View>
        
        {/* Summary on the right */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRight}>
            <Text style={styles.boxTitle}>Resumen</Text>
            <View style={styles.box}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(subtotal, moneda)}</Text>
              </View>
              
              {descuento_global > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Descuento global ({descuento_global}%):</Text>
                  <Text style={styles.summaryNegative}>-{formatCurrency((subtotal) * (descuento_global / 100), moneda)}</Text>
                </View>
              )}
              
              {iva && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>IVA (16%):</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(monto_iva, moneda)}</Text>
                </View>
              )}
              
              {incluye_envio && costo_envio > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Envío:</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(costo_envio, moneda)}</Text>
                </View>
              )}
              
              <View style={styles.summaryTotal}>
                <Text style={styles.summaryTotalLabel}>Total:</Text>
                <Text style={styles.summaryTotalValue}>{formatCurrency(total, moneda)}</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Datos Bancarios and Notas in two columns */}
        <View style={styles.twoColumnSection}>
          {/* Datos Bancarios */}
          <View style={styles.twoColumnLeft}>
            <Text style={styles.boxTitle}>Datos bancarios</Text>
            <View style={styles.box}>
              {moneda === 'MXN' ? (
                <>
                  <Text style={styles.bankInfoHighlight}>BBVA</Text>
                  <Text style={styles.bankInfoText}>FUNNY KITCHEN S.A. DE C.V</Text>
                  <Text style={styles.bankInfoText}>CUENTA: 012 244 0415</Text>
                  <Text style={styles.bankInfoText}>CLABE: 012 320 00122440415 9</Text>
                  <Text style={[styles.bankInfoHighlight, { marginTop: 3 }]}>ACEPTAMOS TARJETAS DE CRÉDITO</Text>
                </>
              ) : (
                <>
                  <Text style={styles.bankInfoHighlight}>LEAD BANK</Text>
                  <Text style={styles.bankInfoText}>PABLO ANAYA</Text>
                  <Text style={styles.bankInfoText}>210319511130</Text>
                  <Text style={styles.bankInfoText}>ABA 101019644</Text>
                </>
              )}
            </View>
          </View>
          
          {/* Notas */}
          <View style={styles.twoColumnRight}>
            <Text style={styles.boxTitle}>Notas</Text>
            <View style={styles.box}>
              <View style={styles.notesList}>
                <Text style={styles.notesListItem}>• Precios sujetos a cambio sin previo aviso.</Text>
                <Text style={styles.notesListItem}>• Servicio pagado en {moneda === 'MXN' ? 'pesos mexicanos' : 'dólares americanos'}.</Text>
                <Text style={styles.notesListItem}>• Tiempo de Entrega: {tiempoEstimado === tiempoEstimadoMax 
                  ? `${tiempoEstimado} semanas` 
                  : `${tiempoEstimado} a ${tiempoEstimadoMax} semanas`} después de confirmación.</Text>
                <Text style={styles.notesListItem}>• Todas las piezas son artesanales y pueden variar.</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Términos Y Cuidados */}
        <View style={styles.section}>
          <Text style={styles.columnTitle}>Términos y cuidados</Text>
          <View style={styles.termsBox}>
            <Text style={styles.termsText}>TODAS LAS PIEZAS SON A PRUEBA DE MICROONDAS Y LAVAVAJILLA. NO APILAR PIEZAS MOJADAS, PODRÍAN DAÑAR ESMALTE. TODAS LAS PIEZAS SON ARTESANALES, POR LO TANTO NO EXISTE NINGUNA PIEZA IDÉNTICA Y TODAS ELLAS PUEDEN TENER VARIACIÓN DE TAMAÑO, FORMA Y COLOR.</Text>
            <Text style={styles.termsText}>
              Términos completos: 
              <Link src="https://funnykitchen.mx/pages/terminos-y-condiciones" style={styles.termsLink}>
                {" funnykitchen.mx/terminos-y-condiciones"}
              </Link>
            </Text>
          </View>
        </View>
        
        {/* Spacer to push footer to bottom */}
        <View style={styles.spacer} />
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>ATENTAMENTE:</Text>
          <View style={styles.footerGrid}>
            <View>
              <Text style={styles.footerText}>PABLO ANAYA - DIRECTOR GENERAL</Text>
              <Text style={styles.footerText}>pablo@funnykitchen.mx</Text>
              <Text style={styles.footerText}>(33) 1055 6554</Text>
            </View>
            <View style={styles.footerRight}>
              <Text style={styles.footerText}>HTTPS://FUNNYKITCHEN.MX</Text>
              <Text style={styles.footerText}>Cmo. al Alemán, 45200 Nextipac, Jal.</Text>
              <Text style={styles.footerText}>Int 14, Elite Nextipac I Industrial.</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ReactPDFDocument; 