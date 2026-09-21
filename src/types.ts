/**
 * Type declarations for Quanto application.
 */

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  category: string;
}

export interface ReceiptData {
  storeName: string;
  date: string;
  total: number;
  category: string;
  items: ReceiptItem[];
  whatsappMessage: string;
}

export interface ScanResult {
  success: boolean;
  isReceipt: boolean;
  message?: string;
  data?: ReceiptData;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  image?: string;
  result: ReceiptData;
}
