import { SupplierExportData } from '@/composables/useMultiplePDFExport';

/**
 * Supplier data structure from the API (similar to demo.ts)
 */
export interface SupplierData {
  id: string;
  supplierName: string;
  logo?: string;
  type?: string;
  [key: string]: any; // For other supplier fields
}

/**
 * Converts supplier data structure to the format required for export
 * @param suppliers Array of suppliers with the complete structure
 * @returns Array of SupplierExportData ready for export
 */
export function convertSuppliersToExportFormat(
  suppliers: SupplierData[]
): SupplierExportData[] {
  return suppliers.map((supplier) => ({
    supplierUuid: supplier.id, // The 'id' field is the supplier UUID
    supplierName: supplier.supplierName,
    dataSupplier: null // Will be obtained from the API automatically in the composable
  }));
}

/**
 * Converts a single supplier to the export format
 */
export function convertSingleSupplierToExportFormat(
  supplier: SupplierData
): SupplierExportData {
  return {
    supplierUuid: supplier.id,
    supplierName: supplier.supplierName,
    dataSupplier: null
  };
}

/**
 * If you already have the complete supplier data (like in demo.ts),
 * you can pass it directly without the composable needing to fetch it from the API
 */
export function convertSuppliersWithDataToExportFormat(
  suppliers: SupplierData[]
): SupplierExportData[] {
  return suppliers.map((supplier) => ({
    supplierUuid: supplier.id,
    supplierName: supplier.supplierName,
    dataSupplier: supplier // Pass complete data if you already have it
  }));
}

