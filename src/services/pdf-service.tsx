import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { pdf, PDFDownloadLink } from '@react-pdf/renderer';
import ReactPDFDocument from '@/components/cotizacion/react-pdf-document';
import React from 'react';

export interface PDFGenerationOptions {
  filename?: string;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  download?: boolean; // Option to force download instead of opening in new tab
}

const defaultOptions: PDFGenerationOptions = {
  filename: `${format(new Date(), 'dd-MM-yyyy')}.pdf`,
  format: 'letter',
  orientation: 'portrait',
  margin: {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10
  },
  download: false // Default to opening in new tab
};

/**
 * Generates a PDF from a DOM element
 * @param element DOM element to convert to PDF
 * @param options PDF generation options
 */
export const generatePDFFromElement = async (
  element: HTMLElement,
  options: PDFGenerationOptions = {}
): Promise<void> => {
  try {
    const mergedOptions = { ...defaultOptions, ...options };
    const { filename, format, orientation, margin } = mergedOptions;
    
    // Show a loading indicator or message if needed
    element.classList.add('generating-pdf');
    
    // Use html2canvas to render the element to a canvas
    const canvas = await html2canvas(element, {
      scale: 3, // Higher scale for better quality and text rendering
      useCORS: true, // Enable CORS for images
      logging: false, // Disable logging
      allowTaint: true, // Allow tainted canvas
      windowWidth: 1200, // Set a fixed window width for consistent rendering
      onclone: (clonedDoc) => {
        // Apply additional styles to the cloned document for PDF generation
        const style = clonedDoc.createElement('style');
        style.textContent = `
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          p, div {
            line-height: 1.2 !important;
            margin-top: 0 !important;
            margin-bottom: 0.25rem !important;
          }
          table {
            border-collapse: collapse !important;
          }
          th, td {
            padding-top: 0.125rem !important;
            padding-bottom: 0.125rem !important;
          }
          h1, h2 {
            margin-bottom: 0.25rem !important;
          }
          .leading-tight {
            line-height: 1.2 !important;
          }
          .space-y-0.5 > * + * {
            margin-top: 0.125rem !important;
          }
          .bg-gray-50 {
            background-color: #f9fafb !important;
            padding: 0.5rem !important;
            border-radius: 0.25rem !important;
          }
        `;
        clonedDoc.head.appendChild(style);
        
        // Find all links in the cloned document and make them absolute
        const links = clonedDoc.querySelectorAll('a');
        links.forEach(link => {
          // Store the original href as a data attribute
          const href = link.getAttribute('href');
          if (href && !href.startsWith('data:')) {
            // Make the link more visible in the PDF
            link.style.color = '#0891b2'; // Teal-600
            link.style.fontWeight = '500';
            link.style.textDecoration = 'underline';
          }
        });
        return clonedDoc;
      }
    });
    
    // Calculate PDF dimensions based on format
    const width = format === 'a4' ? 210 : 215.9; // A4 or Letter width in mm
    const height = format === 'a4' ? 297 : 279.4; // A4 or Letter height in mm
    
    // Initialize PDF document
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: format,
      compress: true // Enable compression for smaller file size
    });
    
    // Calculate positioning
    const imgWidth = orientation === 'portrait' ? width - (margin.left + margin.right) : height - (margin.top + margin.bottom);
    const imgHeight = canvas.height * imgWidth / canvas.width;
    
    // Add the canvas as an image to the PDF
    const imgData = canvas.toDataURL('image/png', 0.95); // Use slightly compressed image for better performance
    pdf.addImage(imgData, 'PNG', margin.left, margin.top, imgWidth, imgHeight);
    
    // Save the PDF
    if (mergedOptions.download) {
      // Force download
      pdf.save(filename);
    } else {
      // On desktop, open in a new tab first
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
    
    // Remove the loading indicator
    element.classList.remove('generating-pdf');
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Error generating PDF. Please try again.');
  }
};

/**
 * Formats a date for display in the PDF
 * @param date Date to format
 * @returns Formatted date string
 */
export const formatDateForPDF = (date: Date): string => {
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
};

/**
 * Formats currency for display in the PDF
 * @param amount Amount to format
 * @param currency Currency code (MXN or USD)
 * @returns Formatted currency string
 */
export const formatCurrencyForPDF = (amount: number, currency: 'MXN' | 'USD'): string => {
  const formatter = new Intl.NumberFormat(currency === 'MXN' ? 'es-MX' : 'en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  });
  
  return formatter.format(amount);
};

/**
 * Generate proper PDF from React component using @react-pdf/renderer
 * This creates a proper PDF with selectable text and working links
 */
export const generateReactPDF = async (
  cliente: any,
  folio: string | undefined,
  cotizacion: any,
  options: { download?: boolean, filename?: string } = {}
): Promise<void> => {
  try {
    console.log("PDF Service - generateReactPDF received:", { cliente, folio, cotizacion });
    console.log("PDF Service - tiempo_estimado:", cotizacion?.tiempo_estimado);
    
    const mergedOptions = { 
      download: true,
      filename: `${folio || format(new Date(), 'dd-MM-yyyy')}-${cliente?.nombre?.replace(/\s+/g, '-') || 'Cliente'}.pdf`,
      ...options
    };
    
    // Generate PDF blob
    const blob = await pdf(
      <ReactPDFDocument 
        cliente={cliente} 
        folio={folio} 
        cotizacion={cotizacion} 
      />
    ).toBlob();
    
    // Create URL and download
    const url = URL.createObjectURL(blob);
    
    if (mergedOptions.download) {
      // Create link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = mergedOptions.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Open in new tab
      window.open(url, '_blank');
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Error generating PDF. Please try again.');
  }
};

/**
 * Service for PDF generation
 */
export const PDFService = {
  generatePDFFromElement,
  formatDateForPDF,
  formatCurrencyForPDF,
  generateReactPDF
}; 