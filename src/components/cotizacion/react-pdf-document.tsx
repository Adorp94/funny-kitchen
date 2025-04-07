import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image, Link } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Register fonts (optional - you can add custom fonts if needed)
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
    padding: 30,
    fontFamily: 'Roboto',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  logo: {
    width: 120,
    height: 50,
    objectFit: 'contain',
  },
  headerRight: {
    textAlign: 'right',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerText: {
    fontSize: 10,
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
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  clientInfo: {
    fontSize: 9,
    color: '#4b5563',
    lineHeight: 1.4,
  },
  clientName: {
    fontSize: 10,
    fontWeight: 'medium',
    color: '#111827',
    marginBottom: 2,
  },
  right: {
    textAlign: 'right',
  },
  table: {
    marginTop: 5,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 7,
    paddingHorizontal: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 7,
    paddingHorizontal: 5,
  },
  tableCol1: {
    width: '45%',
    fontSize: 9,
  },
  tableCol2: {
    width: '10%',
    textAlign: 'center',
    fontSize: 9,
  },
  tableCol3: {
    width: '20%',
    textAlign: 'right',
    fontSize: 9,
  },
  tableCol4: {
    width: '10%',
    textAlign: 'right',
    fontSize: 9,
  },
  tableCol5: {
    width: '15%',
    textAlign: 'right',
    fontSize: 9,
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  tableRowText: {
    fontSize: 9,
    color: '#374151',
  },
  productDescription: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
  },
  productSku: {
    fontSize: 8,
    color: '#9ca3af',
    marginTop: 1,
  },
  summaryContainer: {
    width: '50%',
    marginLeft: 'auto',
    marginBottom: 15,
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    textAlign: 'right',
    marginBottom: 5,
  },
  summaryBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    padding: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  summaryLabel: {
    fontSize: 9,
    color: '#4b5563',
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: 'medium',
    color: '#374151',
  },
  summaryNegative: {
    fontSize: 9,
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
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  bankInfoTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  bankInfoBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    padding: 10,
  },
  bankInfoText: {
    fontSize: 9,
    color: '#4b5563',
    marginBottom: 2,
  },
  bankInfoHighlight: {
    fontSize: 9,
    fontWeight: 'medium',
    color: '#1f2937',
    marginBottom: 2,
  },
  spacer: {
    flexGrow: 1,
  },
  notesAndTerms: {
    marginTop: 10,
    marginBottom: 15,
  },
  notesTermsBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    padding: 10,
  },
  notesTermsGrid: {
    flexDirection: 'row',
  },
  notesTermsColumn: {
    width: '48%',
  },
  notesTermsTitle: {
    fontSize: 9,
    fontWeight: 'medium',
    color: '#1f2937',
    marginBottom: 5,
  },
  notesList: {
    marginLeft: 10,
  },
  notesListItem: {
    fontSize: 8,
    color: '#4b5563',
    marginBottom: 2,
  },
  termsText: {
    fontSize: 8,
    color: '#4b5563',
    marginBottom: 3,
  },
  termsLink: {
    fontSize: 8,
    color: '#0891b2',
    textDecoration: 'underline',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
    marginTop: 5,
  },
  footerTitle: {
    fontSize: 9,
    fontWeight: 'medium',
    color: '#1f2937',
    marginBottom: 5,
  },
  footerGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
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
  nombre: string;
  cantidad: number;
  precio: number;
  precio_mxn?: number;
  descuento: number;
  subtotal: number;
  subtotal_mxn?: number;
  sku?: string;
  descripcion?: string;
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
  productos?: Producto[];
}

interface ReactPDFDocumentProps {
  cliente: Cliente;
  folio?: string;
  cotizacion: Cotizacion;
}

// Helper function to format currency
const formatCurrency = (amount: number, currency: 'MXN' | 'USD'): string => {
  if (currency === 'MXN') {
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } else {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
};

// PDF Document Component
const ReactPDFDocument: React.FC<ReactPDFDocumentProps> = ({ cliente, folio, cotizacion }) => {
  // Get today's date formatted
  const fechaActual = format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es });
  
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
  
  // Calculate total product discounts
  const totalProductDiscounts = productos.reduce((sum, producto) => {
    if (producto.descuento && producto.descuento > 0) {
      const discountAmount = producto.precio * producto.cantidad * (producto.descuento / 100);
      return sum + discountAmount;
    }
    return sum;
  }, 0);
  
  // Subtotal after product discounts
  const subtotalAfterProductDiscounts = subtotal - totalProductDiscounts;

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
                <Text style={styles.tableHeaderText}>Cant.</Text>
              </View>
              <View style={styles.tableCol3}>
                <Text style={styles.tableHeaderText}>P. Unitario</Text>
              </View>
              {productos.some(p => p.descuento && p.descuento > 0) && (
                <View style={styles.tableCol4}>
                  <Text style={styles.tableHeaderText}>Desc.</Text>
                </View>
              )}
              <View style={productos.some(p => p.descuento && p.descuento > 0) ? styles.tableCol5 : { ...styles.tableCol4, width: '25%' }}>
                <Text style={styles.tableHeaderText}>Subtotal</Text>
              </View>
            </View>
            
            {/* Table Rows */}
            {productos.map((producto) => (
              <View key={producto.id} style={styles.tableRow}>
                <View style={styles.tableCol1}>
                  <Text style={styles.tableRowText}>{producto.nombre}</Text>
                  {typeof producto.descripcion === 'string' && producto.descripcion && (
                    <Text style={styles.productDescription}>{producto.descripcion}</Text>
                  )}
                  {typeof producto.sku === 'string' && producto.sku && (
                    <Text style={styles.productSku}>SKU: {producto.sku}</Text>
                  )}
                </View>
                <View style={styles.tableCol2}>
                  <Text style={styles.tableRowText}>{producto.cantidad}</Text>
                </View>
                <View style={styles.tableCol3}>
                  <Text style={styles.tableRowText}>{formatCurrency(producto.precio, moneda)}</Text>
                </View>
                {productos.some(p => p.descuento && p.descuento > 0) && (
                  <View style={styles.tableCol4}>
                    <Text style={styles.tableRowText}>
                      {producto.descuento ? `${producto.descuento}%` : '-'}
                    </Text>
                  </View>
                )}
                <View style={productos.some(p => p.descuento && p.descuento > 0) ? styles.tableCol5 : { ...styles.tableCol4, width: '25%' }}>
                  <Text style={styles.tableRowText}>
                    {producto.descuento && producto.descuento > 0 
                      ? formatCurrency(producto.cantidad * producto.precio * (1 - producto.descuento/100), moneda)
                      : formatCurrency(producto.cantidad * producto.precio, moneda)
                    }
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        
        {/* Resumen */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Resumen</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(subtotal, moneda)}</Text>
            </View>
            
            {totalProductDiscounts > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Descuentos por producto:</Text>
                <Text style={styles.summaryNegative}>-{formatCurrency(totalProductDiscounts, moneda)}</Text>
              </View>
            )}
            
            {descuento_global > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Descuento global ({descuento_global}%):</Text>
                <Text style={styles.summaryNegative}>-{formatCurrency((subtotalAfterProductDiscounts) * (descuento_global / 100), moneda)}</Text>
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
                <Text style={styles.summaryLabel}>Costo de envío:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(costo_envio, moneda)}</Text>
              </View>
            )}
            
            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalLabel}>Total:</Text>
              <Text style={styles.summaryTotalValue}>{formatCurrency(total, moneda)}</Text>
            </View>
          </View>
        </View>
        
        {/* Datos Bancarios */}
        <View style={styles.section}>
          <Text style={styles.bankInfoTitle}>Datos bancarios</Text>
          <View style={styles.bankInfoBox}>
            {moneda === 'MXN' ? (
              <>
                <Text style={styles.bankInfoHighlight}>BBVA</Text>
                <Text style={styles.bankInfoText}>FUNNY KITCHEN S.A. DE C.V</Text>
                <Text style={styles.bankInfoText}>CUENTA: 012 244 0415</Text>
                <Text style={styles.bankInfoText}>CLABE: 012 320 00122440415 9</Text>
                <Text style={[styles.bankInfoHighlight, { marginTop: 5 }]}>ACEPTAMOS TODAS LAS TARJETAS DE CRÉDITO.</Text>
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
        
        {/* Spacer to push remaining content to bottom */}
        <View style={styles.spacer} />
        
        {/* Notas y Términos */}
        <View style={styles.notesAndTerms}>
          <Text style={styles.columnTitle}>Notas y términos</Text>
          <View style={styles.notesTermsBox}>
            <View style={styles.notesTermsGrid}>
              <View style={styles.notesTermsColumn}>
                <Text style={styles.notesTermsTitle}>NOTAS:</Text>
                <View style={styles.notesList}>
                  <Text style={styles.notesListItem}>• Precios sujetos a cambio sin previo aviso.</Text>
                  <Text style={styles.notesListItem}>• El servicio será pagado en {moneda === 'MXN' ? 'pesos mexicanos' : 'dólares americanos'}.</Text>
                  <Text style={styles.notesListItem}>• Fecha de la cotización: {fechaActual}</Text>
                  <Text style={styles.notesListItem}>• Tiempo de Entrega estimado: 6 semanas después de la confirmación de pago.</Text>
                </View>
              </View>
              
              <View style={styles.notesTermsColumn}>
                <Text style={styles.notesTermsTitle}>TÉRMINOS Y CUIDADOS:</Text>
                <Text style={styles.termsText}>TODAS LAS PIEZAS SON A PRUEBA DE MICROONDAS Y LAVAVAJILLA. NO APILAR PIEZAS MOJADAS, PODRÍAN DAÑAR ESMALTE.</Text>
                <Text style={styles.termsText}>TODAS LAS PIEZAS SON ARTESANALES, POR LO TANTO NO EXISTE NINGUNA PIEZA IDÉNTICA Y TODAS ELLAS PUEDEN TENER VARIACIÓN DE TAMAÑO, FORMA Y COLOR.</Text>
                <Text style={styles.termsText}>
                  Términos completos: 
                  <Link src="https://funnykitchen.mx/pages/terminos-y-condiciones" style={styles.termsLink}>
                    {" funnykitchen.mx/terminos-y-condiciones"}
                  </Link>
                </Text>
              </View>
            </View>
          </View>
        </View>
        
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