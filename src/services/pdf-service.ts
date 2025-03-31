import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
}

const defaultOptions: PDFGenerationOptions = {
  filename: `cotizacion-${format(new Date(), 'dd-MM-yyyy')}.pdf`,
  format: 'letter',
  orientation: 'portrait',
  margin: {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10
  }
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
      scale: 2, // Higher scale for better quality
      useCORS: true, // Enable CORS for images
      logging: false, // Disable logging
      allowTaint: true, // Allow tainted canvas
      onclone: (clonedDoc) => {
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
      format: format
    });
    
    // Calculate positioning
    const imgWidth = orientation === 'portrait' ? width - (margin.left + margin.right) : height - (margin.top + margin.bottom);
    const imgHeight = canvas.height * imgWidth / canvas.width;
    
    // Add the canvas as an image to the PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', margin.left, margin.top, imgWidth, imgHeight);
    
    // Save the PDF
    pdf.save(filename);
    
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
 * Service for PDF generation
 */
export const PDFService = {
  generatePDFFromElement,
  formatDateForPDF,
  formatCurrencyForPDF
}; 