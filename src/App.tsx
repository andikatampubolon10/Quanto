/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, 
  Upload, 
  Trash2, 
  Check, 
  Copy, 
  Share2, 
  FileText, 
  Calendar, 
  AlertCircle, 
  RefreshCw, 
  BarChart2, 
  Plus, 
  Sparkles, 
  Clock, 
  Store, 
  Wallet, 
  ArrowRight, 
  Smartphone, 
  Info,
  ChevronRight,
  ListFilter,
  Database,
  Grid,
  LogOut,
  FileSpreadsheet
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ReceiptData, ReceiptItem, ScanResult, HistoryItem } from "./types";
import { googleSignIn, googleSignOut, initAuth } from "./auth";
import { User } from "firebase/auth";

// PRE-BAKED DEMO RECEIPTS for instant testing UX
const DEMO_RECEIPTS = [
  {
    id: "demo-1",
    storeName: "Starbucks Plaza Indonesia",
    date: "2026-05-24",
    total: 99000,
    category: "Coffee",
    imagePlaceholder: "☕ Starbucks Coffee",
    items: [
      { name: "Caramel Macchiato Grande", quantity: 1, price: 64000, total: 64000, category: "Coffee" },
      { name: "Blueberry Muffin", quantity: 1, price: 35000, total: 35000, category: "Food" }
    ],
    whatsappMessage: `*QUANTO - ASISTEN KEUANGAN PRIBADI* ☕\n\nWah, habis nongkrong di *Starbucks Plaza Indonesia* ya? \n📅 *Tanggal:* 24 Mei 2026\n💰 *Total Pengeluaran:* Rp 99.000\n\n*Rincian Belanjaan:* \n- 1x Caramel Macchiato G. (Rp 64.000) ☕\n- 1x Blueberry Muffin (Rp 35.000) 🧁\n\n*💡 Analisis & Tip Hemat Quanto:*\nTotal nongkrong ini setara dengan belanja bahan dapur rumahan untuk 3 hari lho! Jika sering, cobalah trik *Bawa Tumbler Sendiri* di hari Kamis/tanggal khusus untuk mendapatkan potongan harga hingga 50%! Dompet aman, bumi tetap terjaga 🌿.`
  },
  {
    id: "demo-2",
    storeName: "Indomaret Juanda Raya",
    date: "2026-05-18",
    total: 47800,
    category: "Groceries",
    imagePlaceholder: "🛒 Indomaret Supermarket",
    items: [
      { name: "Indomie Goreng Spesial", quantity: 2, price: 3200, total: 6400, category: "Food" },
      { name: "Ultra Milk Cokelat 1L", quantity: 1, price: 22500, total: 22500, category: "Groceries" },
      { name: "Rinso Liquid Detergen", quantity: 1, price: 18900, total: 18900, category: "Groceries" }
    ],
    whatsappMessage: `*QUANTO - ASISTEN KEUANGAN PRIBADI* 🛒\n\nCatatan belanja harian dari *Indomaret Juanda Raya* terkontrol!\n📅 *Tanggal:* 18 Mei 2026\n💰 *Total Pengeluaran:* Rp 47.800\n\n*Rincian Belanjaan:* \n- 2x Indomie Goreng Spesial (Rp 6.400) 🍜\n- 1x Ultra Milk Cokelat 1L (Rp 22.500) 🥛\n- 1x Rinso Liquid Detergen (Rp 18.900) 🧴\n\n*💡 Analisis & Tip Hemat Quanto:*\nPengeluaran untuk bahan-bahan pokok di rumah (Indomie & Rinso) termasuk hemat! Untuk *Ultra Milk*, membeli kemasan karton 1 Liter seperti ini jauh lebih hemat sekitar 15% dibanding membeli 4 kotak mini ukuran 250ml. Pertahankan kebiasaan berbelanja cerdas ini! ⭐`
  },
  {
    id: "demo-3",
    storeName: "iBox Grand Indonesia",
    date: "2026-05-12",
    total: 478000,
    category: "Gadget",
    imagePlaceholder: "📱 Store Elektronik iBox",
    items: [
      { name: "Apple USB-C Adapter 20W", quantity: 1, price: 329000, total: 329000, category: "Gadget" },
      { name: "Tempered Glass Screen Guard", quantity: 1, price: 149000, total: 149000, category: "Gadget" }
    ],
    whatsappMessage: `*QUANTO - ASISTEN KEUANGAN PRIBADI* 📱\n\nInvestasi gadget baru dari *iBox Grand Indonesia* terdata.\n📅 *Tanggal:* 12 Mei 2026\n💰 *Total Pengeluaran:* Rp 478.000\n\n*Rincian Belanjaan:* \n- 1x Apple USB-C Adapter 20W (Rp 329.000) 🔌\n- 1x Tempered Glass Screen (Rp 149.000) 🛡️\n\n*💡 Analisis & Tip Hemat Quanto:*\nPengeluaran kategori Gadget kerap memakan porsi besar. Namun membeli aksesoris perlindungan seperti *Tempered Glass* senilai Rp 149.000 adalah asuransi yang cerdas daripada berisiko mengganti layar retak senilai jutaan rupiah! Pastikan pengisi daya selalu dicabut saat baterai penuh demi merawat kesehatan baterai jangka panjang ⚡.`
  }
];

export default function App() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "whatsapp" | "sheets">("details");
  const [copied, setCopied] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("6282163850914");

  // Google Sheets & Account state variables
  const [sheetUser, setSheetUser] = useState<User | null>(null);
  const [sheetToken, setSheetToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [spreadsheetId, setSpreadsheetId] = useState(localStorage.getItem("quanto_spreadsheet_id") || "");
  const [sheetName, setSheetName] = useState(localStorage.getItem("quanto_sheet_name") || "Sheet1");
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const scrollToResults = () => {
    // Scroll only on mobile device layout width
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        const element = document.getElementById("result-section");
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 150);
    }
  };

  useEffect(() => {
    localStorage.setItem("quanto_sheet_name", sheetName);
  }, [sheetName]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setSheetUser(user);
        setSheetToken(token);
        setNeedsAuth(false);
        setIsAuthLoading(false);
      },
      () => {
        setSheetUser(null);
        setSheetToken(null);
        setNeedsAuth(true);
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setIsAuthLoading(true);
      const result = await googleSignIn();
      if (result) {
        setSheetUser(result.user);
        setSheetToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      console.error("Gagal melakukan autentikasi Google:", err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleSignOut();
      setSheetUser(null);
      setSheetToken(null);
      setNeedsAuth(true);
    } catch (err) {
      console.error("Gagal keluar:", err);
    }
  };

  const handleExportToSheets = async () => {
    if (!sheetToken) {
      alert("Sesi login Anda tidak aktif. Silakan login ulang menggunakan Google.");
      setNeedsAuth(true);
      return;
    }

    if (!spreadsheetId.trim()) {
      alert("Silakan masukkan ID Spreadsheet atau klik 'Buat Spreadsheet Baru' terlebih dahulu.");
      return;
    }

    // Explicit confirmation requested for mutative data actions as per instructions in SKILL.md
    const confirmExport = window.confirm(
      `Apakah Anda yakin ingin mengirim ${scanResult?.data?.items.length || 0} baris data belanjaan ini ke Google Spreadsheet?`
    );
    if (!confirmExport) return;

    setIsExporting(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      const targetSheet = sheetName.trim() || "Sheet1";
      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${targetSheet}!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
      
      const itemsToExport = scanResult?.data?.items || [];
      if (itemsToExport.length === 0) {
        throw new Error("Tidak ada item belanjaan untuk diekspor.");
      }

      const rows = itemsToExport.map((item) => [
        scanResult?.data?.date || new Date().toISOString().split("T")[0],
        scanResult?.data?.storeName || "Tidak Diketahui",
        scanResult?.data?.category || "Others",
        item.name,
        item.quantity,
        item.price,
        item.total,
        item.category
      ]);

      const response = await fetch(appendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sheetToken}`
        },
        body: JSON.stringify({
          range: `${targetSheet}!A1`,
          majorDimension: "ROWS",
          values: rows
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Google Sheets Error:", errorData);
        if (response.status === 404) {
          throw new Error("Spreadsheet tidak ditemukan. Silakan periksa kembali Spreadsheet ID Anda.");
        } else if (response.status === 403) {
          throw new Error("Akses ditolak. Pastikan akun Google Anda memiliki izin mengedit spreadsheet tersebut.");
        }
        throw new Error(errorData?.error?.message || `Google Sheets API mengembalikan status ${response.status}`);
      }

      setExportSuccess(true);
    } catch (err: any) {
      console.error("Kesalahan penulisan sheet:", err);
      setExportError(err.message || "Gagal menyisipkan baris laporan ke Google Sheets Anda.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreateAutoSpreadsheet = async () => {
    if (!sheetToken) {
      alert("Silakan hubungkan akun Google Anda terlebih dahulu.");
      return;
    }

    setIsExporting(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      const targetSheet = sheetName.trim() || "Sheet1";
      const createResponse = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sheetToken}`
        },
        body: JSON.stringify({
          properties: {
            title: "Laporan Pengeluaran Struk Belanja - Quanto"
          },
          sheets: [
            {
              properties: {
                title: targetSheet
              }
            }
          ]
        })
      });

      if (!createResponse.ok) {
        const errDetail = await createResponse.json().catch(() => ({}));
        throw new Error(errDetail?.error?.message || `Status API ${createResponse.status}`);
      }

      const createdData = await createResponse.json();
      const newId = createdData.spreadsheetId;

      if (!newId) {
        throw new Error("Respons API Google tidak mengembalikan Spreadsheet ID yang valid.");
      }

      setSpreadsheetId(newId);
      localStorage.setItem("quanto_spreadsheet_id", newId);

      // Now set the headers in the sheet we created
      const headersRange = `${targetSheet}!A1:H1`;
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${newId}/values/${headersRange}?valueInputOption=USER_ENTERED`;
      
      const updateResponse = await fetch(updateUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sheetToken}`
        },
        body: JSON.stringify({
          range: headersRange,
          majorDimension: "ROWS",
          values: [
            ["Tanggal", "Nama Toko", "Kategori Utama", "Nama Barang", "Kuantitas", "Harga Satuan", "Subtotal", "Kategori Item"]
          ]
        })
      });

      if (!updateResponse.ok) {
        console.warn("Gagal mengeset header default pada baris pertama.");
      }

      alert("Sukses! Spreadsheet 'Laporan Pengeluaran Struk Belanja - Quanto' berhasil dibuat di Google Drive Anda.");
    } catch (err: any) {
      console.error("Gagal membuat spreadsheet otomatis:", err);
      setExportError("Gagal membuat spreadsheet baru: " + (err.message || "Kesalahan tidak dikenal."));
    } finally {
      setIsExporting(false);
    }
  };

  const getCleanedPhoneForWA = (phone: string) => {
    let cleaned = phone.replace(/[^0-9]/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = "62" + cleaned.slice(1);
    }
    return cleaned;
  };
  
  // Camera capture states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Manual Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editableData, setEditableData] = useState<ReceiptData | null>(null);

  // Drag over state
  const [isDragging, setIsDragging] = useState(false);

  // Scan progress titles
  const progressMessages = [
    "Mengunggah gambar struk belanja ke Quanto...",
    "OCR berjalan: Membaca teks detail dengan Gemini AI...",
    "Menganalisis item dan harga secara matematis...",
    "Mengelompokkan kategori (Coffee, Food, Gadget, Transport, dll)...",
    "Merumuskan tip finansial persuasif khusus dari asisten Quanto...",
    "Finishing: Menyusun ringkasan pesan WhatsApp & ekspor Google Sheets!"
  ];

  // Load Scan History from localStorage whenever sheetUser changes
  useEffect(() => {
    if (sheetUser) {
      const storageKey = `quanto_receipt_history_${sheetUser.uid}`;
      const cachedHistory = localStorage.getItem(storageKey);
      if (cachedHistory) {
        try {
          setHistory(JSON.parse(cachedHistory));
        } catch (err) {
          console.error("Failed to parse history caches", err);
          setHistory([]);
        }
      } else {
        setHistory([]);
      }
    } else {
      setHistory([]);
    }
  }, [sheetUser]);

  // Update localStorage when history changes (partitioned by Google Account UID)
  const saveHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    if (sheetUser) {
      const storageKey = `quanto_receipt_history_${sheetUser.uid}`;
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
    }
  };

  // Simulated scan progression for visual delight
  const runProgressSimulation = (onComplete: () => void) => {
    setProgressStep(0);
    const interval = setInterval(() => {
      setProgressStep((prev) => {
        if (prev >= progressMessages.length - 1) {
          clearInterval(interval);
          onComplete();
          return prev;
        }
        return prev + 1;
      });
    }, 900);
    return interval;
  };

  // Trigger Scanner through real API backend
  const handleRealFileScan = async (base64Data: string, fileType: string) => {
    setIsScanning(true);
    setScanResult(null);
    setIsEditing(false);
    scrollToResults();

    // Run simulated steps strictly for gorgeous visual loader progress
    const simInterval = runProgressSimulation(() => {});

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Data,
          mimeType: fileType
        })
      });

      const parsed: ScanResult = await response.json();
      clearInterval(simInterval);

      if (parsed.success && parsed.isReceipt && parsed.data) {
        setScanResult(parsed);
        setEditableData(parsed.data);
        setActiveTab("details");
        scrollToResults();

        // Save successfully scanned receipt to local history
        const newHistoryItem: HistoryItem = {
          id: `history-${Date.now()}`,
          timestamp: new Date().toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          }),
          image: base64Data,
          result: parsed.data
        };
        saveHistory([newHistoryItem, ...history]);
      } else {
        // Not a receipt or unreadable
        setScanResult(parsed);
        scrollToResults();
      }
    } catch (err: any) {
      clearInterval(simInterval);
      setScanResult({
        success: false,
        isReceipt: false,
        message: "Koneksi terputus atau backend offline. Silakan coba kembali sesaat lagi."
      });
      scrollToResults();
    } finally {
      setIsScanning(false);
    }
  };

  // Trigger Demo Scenario Loading - Fully offline/simulated
  const handleDemoScan = (demoId: string) => {
    const demo = DEMO_RECEIPTS.find((d) => d.id === demoId);
    if (!demo) return;

    setSelectedImage(null); // Clear manual upload
    setIsScanning(true);
    setScanResult(null);
    setIsEditing(false);
    scrollToResults();

    runProgressSimulation(() => {
      const receiptResult: ReceiptData = {
        storeName: demo.storeName,
        date: demo.date,
        total: demo.total,
        category: demo.category,
        items: demo.items,
        whatsappMessage: demo.whatsappMessage
      };

      const finalResult: ScanResult = {
        success: true,
        isReceipt: true,
        message: "Struk demo berhasil diproses oleh Asisten Quanto!",
        data: receiptResult
      };

      setScanResult(finalResult);
      setEditableData(receiptResult);
      setActiveTab("details");
      setIsScanning(false);
      scrollToResults();

      // Add to history
      const newHistoryItem: HistoryItem = {
        id: `history-${Date.now()}`,
        timestamp: new Date().toLocaleString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }),
        image: undefined,
        result: receiptResult
      };
      saveHistory([newHistoryItem, ...history]);
    });
  };

  // Handle Drag & Drop logic
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  // Read file as base64 helper
  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Mohon pilih file gambar (JPG, PNG, atau WEBP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      setSelectedImage(base64String);
      handleRealFileScan(base64String, file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processSelectedFile(files[0]);
    }
  };

  // Webcam Capture functionality
  const startCamera = async () => {
    setIsCameraActive(true);
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      alert("Gagal mengakses kamera. Silakan pastikan izin kamera diijinkan.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setSelectedImage(dataUrl);
        stopCamera();
        handleRealFileScan(dataUrl, "image/jpeg");
      }
    }
  };

  // Copy WhatsApp summary helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Load a historic scan back into the active panel
  const handleLoadHistory = (item: HistoryItem) => {
    setSelectedImage(item.image || null);
    setIsEditing(false);
    setScanResult({
      success: true,
      isReceipt: true,
      data: item.result,
      message: "Riwayat struk belanja dimuat kembali."
    });
    setEditableData(item.result);
    setActiveTab("details");
    
    if (window.innerWidth < 1024) {
      scrollToResults();
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Delete individual history
  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((h) => h.id !== id);
    saveHistory(updated);
  };

  // Clear total history cache
  const handleClearAllHistory = () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus semua daftar riwayat struk?")) {
      saveHistory([]);
    }
  };

  // Save changes from manual edit panel
  const handleSaveEdit = () => {
    if (editableData) {
      // Re-calculate row totals and main total
      const updatedItems = editableData.items.map((item) => ({
        ...item,
        total: item.quantity * item.price
      }));
      const newTotal = updatedItems.reduce((acc, curr) => acc + curr.total, 0);

      // Dynamically auto-generate an updated WhatsApp text based on edits
      const formattedDate = editableData.date;
      const itemListText = updatedItems.map(
        (item) => `- ${item.quantity}x ${item.name} (${formatIDR(item.price)}) [${item.category}]`
      ).join("\n");

      const newWA = `*QUANTO - ASISTEN KEUANGAN PRIBADI* (Revisi)\n\nStruk dari *${editableData.storeName}* telah diupdate harganya.\n📅 *Tanggal:* ${formattedDate}\n💰 *Total Pengeluaran:* ${formatIDR(newTotal)}\n\n*Rincian Belanjaan:* \n${itemListText}\n\n*💡 Tip Hemat Quanto:*\nPengeluaran kategori ${editableData.category} tercatat Rp ${newTotal.toLocaleString("id-ID")}. Tetap waspada dengan pengeluaran ritel kecil, kumpulkan struk Anda agar alokasi belanja seimbang!`;

      const finalizedData: ReceiptData = {
        ...editableData,
        items: updatedItems,
        total: newTotal,
        whatsappMessage: newWA
      };

      setScanResult({
        success: true,
        isReceipt: true,
        data: finalizedData,
        message: "Detail struk belanja berhasil diperbarui secara manual!"
      });
      setEditableData(finalizedData);
      setIsEditing(false);
    }
  };

  // Helper currency formatter
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(num);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#FFF8E7] font-sans flex flex-col items-center justify-center p-6 text-[#2D3436]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-[#FFE66D] rounded-3xl border-4 border-[#2D3436] flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] animate-bounce">
            <span className="text-3xl font-black">Q</span>
          </div>
          <p className="text-sm font-black uppercase tracking-wider text-[#2D3436] animate-pulse">Menghubungkan Sesi Anda...</p>
        </div>
      </div>
    );
  }

  if (!sheetUser) {
    return (
      <div className="min-h-screen bg-[#FFF8E7] font-sans text-slate-800 flex flex-col justify-between">
        {/* HEADER BAR IN VIBRANT THEME */}
        <header className="sticky top-0 z-40 bg-[#FFF8E7]/90 backdrop-blur-md px-6 py-5 border-b-4 border-[#2D3436]">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-[#FF6B6B] rounded-2xl flex items-center justify-center border-3 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] transform rotate-3">
                <span className="text-white font-black text-2xl">Q</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#2D3436]">
                  QUANTO
                </h1>
                <p className="text-[10px] font-black text-[#FF6B6B] uppercase tracking-widest leading-none mt-0.5">
                  Asisten Keuangan Pribadi
                </p>
              </div>
            </div>
            
            <div></div>
          </div>
        </header>

        {/* Center Card Container */}
        <main className="mx-auto max-w-md w-full px-4 py-8 flex-1 flex flex-col justify-center">
          <div className="rounded-[35px] border-4 border-[#2D3436] bg-white p-8 shadow-[8px_8px_0px_0px_rgba(45,52,54,1)] relative overflow-hidden flex flex-col items-center text-center">
            <div className="absolute right-0 top-0 w-32 h-32 bg-[#4ECDC4]/10 rounded-full blur-xl pointer-events-none -translate-y-8 translate-x-8" />
            <div className="absolute left-0 bottom-0 w-32 h-32 bg-[#FF6B6B]/10 rounded-full blur-xl pointer-events-none translate-y-8 -translate-x-8" />
            
            <div className="w-16 h-16 bg-[#FF6B6B] rounded-2xl flex items-center justify-center border-3 border-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] transform rotate-3 mb-6">
              <span className="text-white font-black text-3xl">Q</span>
            </div>

            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#FFE66D] px-3.5 py-1 text-[10px] font-black text-[#2D3436] border-2 border-[#2D3436] uppercase tracking-widest shadow-[1.5px_1.5px_0px_0px_rgba(45,52,54,1)]">
              <Sparkles className="h-3 w-3 text-amber-600 animate-pulse" /> Keuangan Pribadi Cerdas
            </span>

            <h2 className="text-2xl font-black text-[#2D3436] tracking-tight leading-tight mt-3">
              Selamat Datang di Quanto
            </h2>
            <p className="mt-3 text-xs text-slate-500 leading-relaxed font-semibold max-w-xs">
              Masuk dengan akun Google Anda terlebih dahulu untuk menggunakan asisten keuangan cerdas Quanto, mengekstrak draf struk belanja, dan mengekspor laporan secara instant.
            </p>

            <button
              id="bg-login-button-gate"
              onClick={handleGoogleLogin}
              className="mt-8 w-full flex items-center justify-center gap-3 rounded-2xl border-3 border-[#2D3436] bg-[#4ECDC4] hover:bg-[#3dbdb5] py-3.5 text-sm font-black text-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] active:translate-y-0.5 active:shadow-none transition cursor-pointer"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              Masuk dengan Akun Google
            </button>

            <div className="mt-6 flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
              <Info className="h-3.5 w-3.5 shrink-0" /> Keamanan Google OAuth Terjamin
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 border-t-2 border-[#2D3436]/10 text-center text-[10px] text-slate-400 font-bold">
          Quanto © {new Date().getFullYear()} — Asisten Keuangan Pribadi Cerdas
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8E7] font-sans text-slate-800 flex flex-col">
      
      {/* HEADER BAR IN VIBRANT THEME */}
      <header className="sticky top-0 z-40 bg-[#FFF8E7]/90 backdrop-blur-md px-6 py-5 border-b-4 border-[#2D3436]">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#FF6B6B] rounded-2xl flex items-center justify-center border-3 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] transform rotate-3">
              <span className="text-white font-black text-2xl">Q</span>
            </div>
            <div>
              <h1 id="app-logo-text" className="text-2xl sm:text-3xl font-black tracking-tight text-[#2D3436]">
                QUANTO
              </h1>
              <p className="text-[10px] font-black text-[#FF6B6B] uppercase tracking-widest leading-none mt-0.5">
                Asisten Keuangan Pribadi
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {sheetUser && (
              <div className="flex items-center gap-2 rounded-2xl bg-white px-3.5 py-1.5 border-3 border-[#2D3436] shadow-[2.5px_2.5px_0px_0px_rgba(45,52,54,1)] text-xs font-black">
                {sheetUser.photoURL ? (
                  <img src={sheetUser.photoURL} alt={sheetUser.displayName || "User"} referrerPolicy="no-referrer" className="w-5.5 h-5.5 rounded-full border border-[#2D3436]" />
                ) : (
                  <div className="w-5.5 h-5.5 bg-[#2D3436] font-black text-white flex items-center justify-center rounded-full text-[9px]">
                    {sheetUser.email?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="text-[#2D3436] max-w-[100px] sm:max-w-[140px] truncate">{sheetUser.displayName || "User"}</span>
              </div>
            )}
            
            <button
              onClick={handleGoogleLogout}
              className="flex items-center gap-1.5 border-3 border-[#2D3436] bg-[#FF6B6B] text-white hover:bg-[#ff5252] font-black px-4 py-2 rounded-2xl shadow-[2.5px_2.5px_0px_0px_rgba(45,52,54,1)] transition active:translate-y-0.5 active:shadow-none text-xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      {/* BODY CONTENT */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-1 w-full">
        
        {/* RETRO BENTO WELCOME BANNER */}
        <div className="mb-10 rounded-[35px] border-4 border-[#2D3436] bg-[#2D3436] p-6 text-white shadow-[6px_6px_0px_0px_rgba(45,52,54,1)] sm:p-8 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-y-12 translate-x-12 w-64 h-64 rounded-full bg-[#FF6B6B]/15 blur-2xl pointer-events-none" />
          <div className="absolute left-1/3 top-0 -translate-y-12 w-48 h-48 rounded-full bg-[#FFE66D]/10 blur-xl pointer-events-none" />
          
          <div className="max-w-3xl relative z-10">
            <span className="mb-3.5 inline-flex items-center gap-1.5 rounded-full bg-[#FFE66D] px-3.5 py-1 text-xs font-black text-[#2D3436] border-2 border-[#2D3436] uppercase tracking-widest shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
              <Sparkles className="h-3 w-3 shrink-0 text-amber-600 animate-pulse" /> Ekstraksi Struk Belanja Instan
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white mt-1">
              Kelola Keuangan Anda <br className="hidden sm:inline" /> Jadi Lebih Praktis & Hemat!
            </h2>
            <p className="mt-4 text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Halo! Saya Quanto, asisten keuangan pribadi cerdas Anda. Cukup ambil foto atau unggah gambar struk, saya akan menarik rincian barang belanjaan Anda, menentukan kategori otomatis, dan menyajikan ringkasan persuasif siap kirim ke WhatsApp beserta saran finansial cerdas khusus untuk Anda.
            </p>
          </div>
        </div>

        {/* WORKSPACE CONTAINER */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* LEFT PANEL - SCANNER & PICTURE LOADER */}
          <section className="lg:col-span-5 flex flex-col gap-8">
            <div className="rounded-[35px] border-4 border-[#2D3436] bg-white p-6 shadow-[6px_6px_0px_0px_rgba(45,52,54,1)]">
              <h3 className="text-lg font-black text-[#2D3436] uppercase tracking-tight mb-4 flex items-center gap-2">
                <Camera className="h-5 w-5 text-[#FF6B6B] shrink-0" />
                Input Gambar Struk Belanja
              </h3>

              {/* CAMERA OVERLAY OR CAPTURING FEED */}
              {isCameraActive ? (
                <div className="relative overflow-hidden rounded-2xl bg-black aspect-video border-3 border-[#2D3436] flex flex-col justify-between p-3 shadow-inner">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 top-0 bg-black/60 p-2 text-center text-[11px] font-bold text-white z-10">
                    Posisikan struk berdekatan pada area kamera secara vertikal
                  </div>
                  
                  {/* Camera control actions */}
                  <div className="relative mt-auto flex items-center justify-center gap-4 py-2 z-10">
                    <button
                      id="btn-capture-photo"
                      onClick={capturePhoto}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6B6B] border-3 border-[#2D3436] text-white shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] hover:bg-[#ff5252] active:translate-y-0.5 active:shadow-none transition"
                    >
                      <Camera className="h-6 w-6" />
                    </button>
                    <button
                      id="btn-cancel-camera"
                      onClick={stopCamera}
                      className="rounded-xl bg-white text-[#2D3436] border-2 border-[#2D3436] px-4 py-2 text-xs font-black shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] hover:bg-slate-50 transition"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                /* DRAG DROP UPLOADER CONTAINER */
                <div
                  id="drag-drop-uploader"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-4 border-dashed p-8 text-center transition-all duration-200 ${
                    isDragging 
                      ? "border-[#FF6B6B] bg-[#FFF8E7]" 
                      : "border-slate-300 bg-[#F1F2F6] hover:bg-[#FFE66D]/15 hover:border-[#FFD93D] cursor-pointer"
                  }`}
                  onClick={() => document.getElementById("file-picker")?.click()}
                >
                  <input
                    id="file-picker"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {selectedImage ? (
                    <div className="relative max-h-48 w-full overflow-hidden rounded-lg">
                      <img 
                        src={selectedImage} 
                        alt="Struk Belanja" 
                        className="mx-auto max-h-48 object-contain rounded-lg shadow-sm border border-slate-200 bg-white"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition duration-150">
                        <span className="text-xs bg-[#2D3436] text-white border-2 border-[#2D3436] px-3 py-1.5 rounded-xl font-bold shadow-md">
                          Ganti Gambar Struk
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFE66D] border-2 border-[#2D3436] text-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)]">
                        <Upload className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-black text-[#2D3436]">
                        Seret & Letakkan gambar struk belanja
                      </p>
                      <p className="mt-1 text-xs text-slate-500 font-bold">
                        Atau <span className="text-[#FF6B6B] hover:underline">cari file komputer Anda</span> (JPG, PNG, WEBP)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* CAMERA ACTIVE BUTTON & OPTION */}
              {!isCameraActive && (
                <div className="mt-4 flex gap-2.5">
                  <button
                    id="btn-active-cam"
                    onClick={startCamera}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-3 border-[#2D3436] bg-[#FFE66D] px-4 py-3 text-xs font-black text-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] hover:bg-[#FFD93D] active:translate-y-0.5 active:shadow-none transition"
                  >
                    <Camera className="h-4 w-4" />
                    Ambil Foto via Kamera
                  </button>
                  {selectedImage && (
                    <button
                      id="btn-clear-img"
                      onClick={() => {
                        setSelectedImage(null);
                        setScanResult(null);
                      }}
                      className="rounded-2xl border-3 border-[#2D3436] bg-[#FF6B6B] text-white p-3 hover:bg-[#ff5252] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] active:translate-y-0.5 active:shadow-none transition"
                      title="Hapus gambar"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* INSTANT DEMO RECEIPTS PREVIEW CONTAINER */}
            <div className="rounded-[35px] border-4 border-[#2D3436] bg-white p-6 shadow-[6px_6px_0px_0px_rgba(45,52,54,1)]">
              <div className="mb-4">
                <h4 className="text-sm font-black text-[#2D3436] uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                  Belum Punya Struk? Coba Demo!
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Pilih salah satu struk belanja tiruan di bawah ini untuk melihat keajaiban Quanto secara langsung.
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                {DEMO_RECEIPTS.map((demo) => (
                  <button
                    key={demo.id}
                    id={`btn-demo-${demo.id}`}
                    onClick={() => handleDemoScan(demo.id)}
                    className="flex items-center justify-between rounded-2xl border-3 border-[#2D3436] bg-[#FFF8E7] p-3.5 text-left hover:bg-[#FFE66D]/60 hover:shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] transition-all duration-150 group active:translate-y-0.5 active:shadow-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl filter drop-shadow-xs">{demo.imagePlaceholder.split(" ")[0]}</div>
                      <div>
                        <div className="text-xs font-black text-[#2D3436] font-sans">
                          {demo.storeName}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold mt-0.5">
                          <span>{demo.date}</span>
                          <span className="text-[#2D3436]/40">•</span>
                          <span className="text-[#FF6B6B] font-black">{formatIDR(demo.total)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border-2 border-[#2D3436] bg-white p-1.5 text-slate-500 group-hover:bg-[#FF6B6B] group-hover:text-white transition duration-150 shadow-[1.5px_1.5px_0px_0px_rgba(45,52,54,1)]">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* RIGHT PANEL - DETAILED RESULT & PRESENTATION */}
          <section id="result-section" className="lg:col-span-7">
            <div className="rounded-[40px] border-4 border-[#2D3436] bg-white shadow-[8px_8px_0px_0px_rgba(45,52,54,1)] overflow-hidden min-h-[480px] flex flex-col">
              
              {/* IF LOADING STATE */}
              {isScanning && (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-[#FFF8E7] relative">
                  {/* Top animated scan beam */}
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-[#FFD93D] to-transparent animate-scan" />

                  <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
                    {/* Spin glow neo-brutalist circle */}
                    <div className="absolute inset-0 rounded-full border-4 border-dashed border-[#2D3436] animate-spin" />
                    <div className="absolute inset-2 bg-white rounded-full border-2 border-[#2D3436]" />
                    {/* Inner glowing document wallet */}
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#FFE66D] border-2 border-[#2D3436] text-[#2D3436] shadow-sm">
                      <FileText className="h-7 w-7 animate-bounce" />
                    </div>
                  </div>
                  
                  <h4 className="text-xl font-black text-[#2D3436] uppercase tracking-tight">
                    Memproses Pembacaan Struk...
                  </h4>
                  <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">
                    Kecerdasan Buatan Quanto sedang menganalisis koordinat gambar struk Anda.
                  </p>

                  {/* PROGRESS BAR STICKY WITH INFORMATIVE NOTICES */}
                  <div className="mt-8 w-full max-w-xs bg-white border-3 border-[#2D3436] rounded-full h-4 overflow-hidden shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
                    <div 
                      className="bg-[#4ECDC4] h-full transition-all duration-300 border-r-2 border-[#2D3436]"
                      style={{ width: `${((progressStep + 1) / progressMessages.length) * 100}%` }}
                    />
                  </div>
                  
                  {/* Staggered progress labels */}
                  <div className="mt-5 px-4 py-2 rounded-2xl border-3 border-[#2D3436] bg-[#FFE66D] text-xs font-black text-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] animate-pulse">
                    {progressMessages[progressStep]}
                  </div>
                </div>
              )}

              {/* IF EMPTY/GREETING STATE */}
              {!isScanning && !scanResult && (
                <div className="flex flex-1 flex-col items-center justify-center text-center p-8 bg-[#FFF8E7]/30">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white border-4 border-[#2D3436] text-[#FF6B6B] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)]">
                    <Wallet className="h-9 w-9" />
                  </div>
                  <h4 className="text-xl font-black text-[#2D3436] uppercase">Quanto Siap Membantu</h4>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-md leading-relaxed font-semibold">
                    Unggah struk belanja atau gunakan struk tiruan di sebelah kiri. Quanto akan langsung mengekstrak, mengategorikan pengeluaran, dan menyusun pesan otomatis interaktif untuk Anda.
                  </p>
                  
                  <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md w-full">
                    <div className="rounded-2xl border-3 border-[#2D3436] bg-white p-4 text-left shadow-[4px_4px_0px_0px_rgba(45,52,54,1)]">
                      <div className="text-xs font-black text-[#2D3436] flex items-center gap-1.5 mb-1.5 uppercase">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#4ECDC4] border border-[#2D3436]" /> Kategori Otomatis
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">Mengelompokkan jenis item belanjaan (Coffee, Food, Gadget) secara cerdas.</p>
                    </div>
                    <div className="rounded-2xl border-3 border-[#2D3436] bg-white p-4 text-left shadow-[4px_4px_0px_0px_rgba(45,52,54,1)]">
                      <div className="text-xs font-black text-[#2D3436] flex items-center gap-1.5 mb-1.5 uppercase">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#FFE66D] border border-[#2D3436]" /> Chat WhatsApp
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">Menyusun format laporan WhatsApp persuasif lengkap dengan tip berhemat.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* IF RESULT POPULATED */}
              {!isScanning && scanResult && (
                <>
                  {/* IF RECEIPT FAILED READER / UNREADABLE */}
                  {!scanResult.isReceipt ? (
                    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-[#FFF8E7]/30">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FF6B6B]/10 border-4 border-[#FF6B6B] text-[#FF6B6B] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)]">
                        <AlertCircle className="h-8 w-8" />
                      </div>
                      <h4 className="text-md font-black text-[#2D3436], uppercase">Gambar Tidak Terbaca sebagai Struk</h4>
                      
                      <div className="mt-3.5 max-w-md rounded-2xl bg-white border-3 border-[#2D3436] p-4 text-xs text-[#2D3436]/90 leading-relaxed font-bold shadow-[4px_4px_0px_0px_rgba(45,52,54,1)]">
                        {scanResult.message || "Maaf, gambar tidak dikenali atau struk kurang terlihat jelas. Silakan unggah gambar struk belanja lainnya yang lebih cerah, tegak, dan terbaca lurus."}
                      </div>

                      <button
                        id="btn-retry-upload"
                        onClick={() => {
                          setSelectedImage(null);
                          setScanResult(null);
                        }}
                        className="mt-6 flex items-center gap-1 bg-[#FF6B6B] hover:bg-[#ff5252] border-3 border-[#2D3436] text-white font-black text-xs px-5 py-3 rounded-2xl shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] active:translate-y-0.5 active:shadow-none transition-all"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Coba Upload Gambar Lain
                      </button>
                    </div>
                  ) : (
                    
                    /* SUCCESS RECEIPT CONTAINER */
                    <div className="flex flex-col flex-1">
                      
                      {/* HEADER SUMMARY PANEL IN VIBRANT THEME */}
                      <div className="border-b-4 border-[#2D3436] bg-[#FFE66D] p-5 text-[#2D3436]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-[#FF6B6B] border-2 border-[#2D3436] px-3 py-0.5 text-[9px] font-black text-white uppercase tracking-wider">
                                {scanResult.data?.category}
                              </span>
                              <span className="text-[11px] font-bold text-[#2D3436]/70 flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-[#2D3436]" /> {scanResult.data?.date}
                              </span>
                            </div>
                            <h3 className="mt-1.5 text-2xl font-black tracking-tight text-[#2D3436] flex items-center gap-1.5">
                              <Store className="h-5.5 w-5.5 text-[#2D3436] shrink-0" />
                              {scanResult.data?.storeName}
                            </h3>
                          </div>
                          
                          <div className="bg-[#4ECDC4] text-[#2D3436] p-3.5 rounded-2xl border-3 border-[#2D3436] text-right shadow-[3px_3px_0px_0px_rgba(45,52,54,1)]">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#2D3436]/65">Total Belanja</span>
                            <div className="text-2xl font-black tracking-tight">
                              {scanResult.data && formatIDR(scanResult.data.total)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* MODE SWITCHER BAR */}
                      <div className="border-b-4 border-[#2D3436] bg-[#FFF8E7] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            id="tab-details"
                            onClick={() => { setActiveTab("details"); setIsEditing(false); }}
                            className={`rounded-xl px-3 py-1.5 text-xs font-black border-2 transition ${
                              activeTab === "details" && !isEditing
                                ? "bg-[#FFD93D] border-[#2D3436] text-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]"
                                : "transparent border-transparent text-slate-500 hover:text-[#2D3436]"
                            }`}
                          >
                            Detail Item
                          </button>
                          <button
                            id="tab-whatsapp"
                            onClick={() => { setActiveTab("whatsapp"); setIsEditing(false); }}
                            className={`rounded-xl px-3 py-1.5 text-xs font-black border-2 transition ${
                              activeTab === "whatsapp" && !isEditing
                                ? "bg-[#4ECDC4] border-[#2D3436] text-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]"
                                : "transparent border-transparent text-slate-500 hover:text-[#2D3436]"
                            }`}
                          >
                            Pesan WhatsApp
                          </button>
                          <button
                            id="tab-sheets"
                            onClick={() => { setActiveTab("sheets"); setIsEditing(false); }}
                            className={`rounded-xl px-3 py-1.5 text-xs font-black border-2 transition ${
                              activeTab === "sheets" && !isEditing
                                ? "bg-[#FF6B6B] border-[#2D3436] text-white shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]"
                                : "transparent border-transparent text-slate-500 hover:text-[#2D3436]"
                            }`}
                          >
                            Laporan Sheets
                          </button>
                        </div>

                        <div>
                          {isEditing ? (
                            <div className="flex gap-1.5">
                              <button
                                id="btn-save-edit"
                                onClick={handleSaveEdit}
                                className="rounded-xl border-2 border-[#2D3436] bg-[#4ECDC4] px-3 py-1 text-xs font-black text-[#2D3436] hover:bg-[#3dbdb5] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]"
                              >
                                Simpan
                              </button>
                              <button
                                id="btn-cancel-edit"
                                onClick={() => { setIsEditing(false); setEditableData(scanResult.data || null); }}
                                className="rounded-xl border-2 border-[#2D3436] bg-white px-3 py-1 text-xs font-bold text-[#2D3436] hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              id="btn-trigger-edit"
                              onClick={() => { setIsEditing(true); setEditableData(scanResult.data || null); }}
                              className="rounded-xl border-2 border-[#2D3436] bg-[#FFD93D] px-3.5 py-1 text-xs font-black text-[#2D3436] hover:bg-[#FFC107] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]"
                            >
                              Edit Data
                            </button>
                          )}
                        </div>
                      </div>

                      {/* TAB CONTENT HOUSING */}
                      <div className="flex-1 p-5 bg-white">
                        <AnimatePresence mode="wait">

                          {/* 1. EDIT MODE SCREEN */}
                          {isEditing && editableData && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex flex-col gap-4 text-xs"
                            >
                              <div className="bg-[#FFF8E7] border-3 border-[#2D3436] rounded-2xl p-4 text-[#2D3436] flex gap-3 shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] font-semibold">
                                <Info className="h-5 w-5 text-[#FF6B6B] shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-black">Mode Koreksi Manual:</span> Anda dapat memperbarui data yang mungkin kurang presisi diekstraksi dari kertas struk. Total pengeluaran dan pesan ringkasan WhatsApp akan diatur ulang secara otomatis saat diklik Simpan.
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mt-1">
                                <div>
                                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Nama Toko</label>
                                  <input
                                    type="text"
                                    value={editableData.storeName}
                                    onChange={(e) => setEditableData({ ...editableData, storeName: e.target.value })}
                                    className="mt-1 w-full rounded-xl border-2 border-[#2D3436] bg-white px-3 py-2 text-xs focus:bg-[#FFF8E7] focus:outline-hidden font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Tanggal</label>
                                  <input
                                    type="text"
                                    value={editableData.date}
                                    onChange={(e) => setEditableData({ ...editableData, date: e.target.value })}
                                    className="mt-1 w-full rounded-xl border-2 border-[#2D3436] bg-white px-3 py-2 text-xs focus:bg-[#FFF8E7] focus:outline-hidden font-bold"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Kategori Utama</label>
                                  <select
                                    value={editableData.category}
                                    onChange={(e) => setEditableData({ ...editableData, category: e.target.value })}
                                    className="mt-1 w-full rounded-xl border-2 border-[#2D3436] bg-white px-3 py-2 text-xs focus:bg-[#FFF8E7] focus:outline-hidden font-black"
                                  >
                                    <option value="Coffee">Coffee</option>
                                    <option value="Food">Food</option>
                                    <option value="Gadget">Gadget</option>
                                    <option value="Transport">Transport</option>
                                    <option value="Groceries">Groceries</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Fashion">Fashion</option>
                                    <option value="Others">Others</option>
                                  </select>
                                </div>
                              </div>

                              {/* ITEMS EDIT LIST */}
                              <div className="mt-2">
                                <label className="block text-[10px] font-black text-[#2D3436] uppercase tracking-wider mb-2">Item Belanjaan ({editableData.items.length})</label>
                                <div className="flex flex-col gap-2.5 max-h-52 overflow-y-auto pr-1">
                                  {editableData.items.map((item, index) => (
                                    <div key={index} className="flex gap-2 items-center bg-[#FFF8E7]/40 p-2.5 rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
                                      <input
                                        type="text"
                                        placeholder="Nama Item"
                                        value={item.name}
                                        onChange={(e) => {
                                          const next = [...editableData.items];
                                          next[index].name = e.target.value;
                                          setEditableData({ ...editableData, items: next });
                                        }}
                                        className="w-1/3 rounded-lg border-2 border-[#2D3436] bg-white px-2 py-1 text-xs font-bold"
                                      />
                                      <input
                                        type="number"
                                        placeholder="Pcs"
                                        value={item.quantity}
                                        onChange={(e) => {
                                          const next = [...editableData.items];
                                          next[index].quantity = parseInt(e.target.value) || 1;
                                          setEditableData({ ...editableData, items: next });
                                        }}
                                        className="w-14 rounded-lg border-2 border-[#2D3436] bg-white px-2 py-1 text-xs text-center font-bold"
                                      />
                                      <input
                                        type="number"
                                        placeholder="Harga"
                                        value={item.price}
                                        onChange={(e) => {
                                          const next = [...editableData.items];
                                          next[index].price = parseInt(e.target.value) || 0;
                                          setEditableData({ ...editableData, items: next });
                                        }}
                                        className="w-20 sm:w-24 rounded-lg border-2 border-[#2D3436] bg-white px-2 py-1 text-xs font-bold"
                                      />
                                      <select
                                        value={item.category}
                                        onChange={(e) => {
                                          const next = [...editableData.items];
                                          next[index].category = e.target.value;
                                          setEditableData({ ...editableData, items: next });
                                        }}
                                        className="flex-1 rounded-lg border-2 border-[#2D3436] bg-white px-2 py-1 text-xs font-bold"
                                      >
                                        <option value="Coffee">Coffee</option>
                                        <option value="Food">Food</option>
                                        <option value="Gadget">Gadget</option>
                                        <option value="Transport">Transport</option>
                                        <option value="Groceries">Groceries</option>
                                        <option value="Utilities">Utilities</option>
                                        <option value="Fashion">Fashion</option>
                                        <option value="Others">Others</option>
                                      </select>
                                      
                                      <button
                                        onClick={() => {
                                          const next = editableData.items.filter((_, i) => i !== index);
                                          setEditableData({ ...editableData, items: next });
                                        }}
                                        className="text-red-500 p-1 bg-white rounded-lg border-2 border-[#2D3436] hover:bg-red-50"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                
                                <button
                                  id="add-custom-item-edit-mode"
                                  onClick={() => {
                                    const next = [
                                      ...editableData.items,
                                      { name: "Item Baru", quantity: 1, price: 5000, total: 5000, category: "Others" }
                                    ];
                                    setEditableData({ ...editableData, items: next });
                                  }}
                                  className="mt-4 flex items-center gap-1.5 text-xs text-[#FF6B6B] font-black hover:text-[#ff5252]"
                                >
                                  <Plus className="h-4.5 w-4.5" /> Tambahkan Item Belanjaan
                                </button>
                              </div>
                            </motion.div>
                          )}

                          {/* 2. TAB DETAILS VIEW */}
                          {activeTab === "details" && !isEditing && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex flex-col gap-5 text-xs"
                            >
                              <div className="overflow-x-auto rounded-2xl border-3 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)]">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="bg-[#FFF8E7] border-b-3 border-[#2D3436] text-[#2D3436] uppercase tracking-wider font-extrabold">
                                      <th className="p-3.5">Nama Barang</th>
                                      <th className="p-3.5 text-center">Pcs</th>
                                      <th className="p-3.5 text-right">Harga Unit</th>
                                      <th className="p-3.5 text-right">Subtotal</th>
                                      <th className="p-3.5 text-center">Golongan</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {scanResult.data?.items.map((item, index) => (
                                      <tr key={index} className="border-b-2 border-slate-100 hover:bg-[#FFF8E7]/30 transition-colors">
                                        <td className="p-3.5 font-bold text-slate-800">{item.name}</td>
                                        <td className="p-3.5 text-center text-slate-500 font-mono font-bold">{item.quantity}</td>
                                        <td className="p-3.5 text-right font-mono text-slate-600">{formatIDR(item.price)}</td>
                                        <td className="p-3.5 text-right font-extrabold text-slate-900 font-mono">{formatIDR(item.total)}</td>
                                        <td className="p-3.5 text-center">
                                          <span className="rounded-full bg-[#FFE66D] border border-[#2D3436] text-[#2D3436] px-2.5 py-1 text-[9px] font-black uppercase shadow-[1px_1px_0px_0px_rgba(45,52,54,1)]">
                                            {item.category}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              
                              {/* ASISTEN FINANCIAL ADVICE */}
                              <div className="bg-[#FFF8E7] border-3 border-[#2D3436] rounded-[24px] p-5.5 shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] relative overflow-hidden">
                                <div className="absolute right-0 top-0 translate-y-3 translate-x-3 text-[#FF6B6B]/15 text-5xl font-black italic">Q</div>
                                <h4 className="text-sm font-black text-[#2D3436] uppercase tracking-tight flex items-center gap-1.5 z-10 relative">
                                  <Sparkles className="h-4.5 w-4.5 text-[#FF6B6B] animate-pulse" />
                                  Analisis Keuangan & Tips Quanto
                                </h4>
                                <p className="mt-2.5 text-[#2D3436] leading-relaxed text-xs font-semibold z-10 relative">
                                  {scanResult.data?.whatsappMessage.split("*💡 Analisis & Tip Hemat Quanto:*")[1]?.replace(/[*\n]/g, " ") || 
                                   scanResult.data?.whatsappMessage.split("*💡 Tip Hemat Quanto:*")[1]?.replace(/[*\n]/g, " ") ||
                                   `Pengeluaran kategori ${scanResult.data?.category} berhasil dimasukkan. Gunakan terus Quanto untuk memantau neraca pengeluaran agar rencana finansial masa depan stabil!`}
                                </p>
                              </div>
                            </motion.div>
                          )}

                          {/* 3. TAB WHATSAPP SPEECH BUBBLE */}
                          {activeTab === "whatsapp" && !isEditing && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex flex-col gap-5 text-xs"
                            >
                              <div className="bg-[#FFF8E7] border-3 border-[#2D3436] rounded-2xl p-4 text-[#2D3436] flex gap-2.5 shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] font-semibold">
                                <Smartphone className="h-5 w-5 text-[#FF6B6B] shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-black">Format Laporan WhatsApp:</span> Sangat cocok untuk dibagikan secara instan ke pasangan, keluarga, atau didokumentasikan di chat pribadi WhatsApp untuk pelacakan bulanan.
                                </div>
                              </div>

                              {/* DYNAMIC WHATSAPP TARGET NUMBER */}
                              <div className="bg-[#4ECDC4]/10 border-3 border-[#2D3436] rounded-2xl p-4 shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                                <div className="flex-1">
                                  <label htmlFor="whatsapp-number-input" className="block text-[10px] font-black text-[#2D3436] uppercase tracking-wider mb-1">
                                    Kirim ke Nomor WhatsApp (Dinamis)
                                  </label>
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2D3436] font-black text-white text-xs border-2 border-[#2D3436] shrink-0">
                                      +
                                    </div>
                                    <input
                                      id="whatsapp-number-input"
                                      type="text"
                                      placeholder="Contoh: 6282163850914"
                                      value={whatsappNumber}
                                      onChange={(e) => setWhatsappNumber(e.target.value)}
                                      className="flex-1 font-extrabold text-sm rounded-xl border-2 border-[#2D3436] bg-white px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-[#FFF8E7]"
                                    />
                                  </div>
                                  <p className="text-[9px] text-[#2D3436]/60 font-bold mt-1.5 leading-tight">
                                    Masukkan kode negara tanpa tanda "+" (misal: 6282163850914).
                                  </p>
                                </div>
                                <div className="flex items-end shrink-0">
                                  <a
                                    id="btn-fast-share-wa"
                                    href={`https://api.whatsapp.com/send?phone=${getCleanedPhoneForWA(whatsappNumber)}&text=${encodeURIComponent(scanResult.data?.whatsappMessage || "")}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full text-center flex items-center justify-center gap-2 rounded-xl border-3 border-[#2D3436] bg-[#4ECDC4] px-4 py-2.5 text-xs font-black text-[#2D3436] hover:bg-[#3dbdb5] shadow-[2.5px_2.5px_0px_0px_rgba(45,52,54,1)] active:translate-y-0.5 active:shadow-none transition"
                                  >
                                    <Smartphone className="h-4 w-4 shrink-0" />
                                    Buka Chat WhatsApp
                                  </a>
                                </div>
                              </div>

                              {/* WHATSAPP SPEECH BUBBLE */}
                              <div className="flex-1 bg-[#075E54] rounded-[30px] border-4 border-[#2D3436] overflow-hidden flex flex-col shadow-[4px_4px_0px_0px_rgba(45,52,54,1)]">
                                <div className="bg-[#128C7E] px-5 py-3 border-b-2 border-[#2D3436] flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-black text-[#128C7E] border-2 border-[#2D3436]">Q</div>
                                  <div>
                                    <p className="text-white font-black text-sm">Quanto Assistant</p>
                                    <p className="text-emerald-200 text-[9px] uppercase font-bold tracking-widest">Active Now</p>
                                  </div>
                                </div>
                                
                                <div className="p-6 flex flex-col justify-end bg-[#efeae2]/90">
                                  <div className="bg-[#DCF8C6] p-4.5 rounded-2xl rounded-tr-none shadow-sm text-xs border-l-4 border-[#128C7E] border-2 border-slate-300 select-all font-mono leading-relaxed max-h-[300px] overflow-y-auto">
                                    <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-800">
                                      {scanResult.data?.whatsappMessage}
                                    </pre>
                                  </div>
                                  <p className="text-[10px] text-slate-500 opacity-80 mt-2 text-right uppercase font-bold">Sent Auto-Format</p>
                                </div>
                              </div>

                              <div className="flex justify-end gap-3.5 mt-2">
                                <button
                                  id="btn-copy-wa"
                                  onClick={() => copyToClipboard(scanResult.data?.whatsappMessage || "")}
                                  className="flex items-center gap-2 rounded-2xl border-3 border-[#2D3436] bg-[#FFE66D] px-5 py-3 text-xs font-black text-[#2D3436] hover:bg-[#FFD93D] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] active:translate-y-0.5 active:shadow-none transition"
                                >
                                  {copied ? (
                                    <>
                                      <Check className="h-4 w-4 text-emerald-600" />
                                      Salin Sukses!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-4 w-4" />
                                      Salin Pesan WA
                                    </>
                                  )}
                                </button>
                                <a
                                  id="btn-share-wa-web"
                                  href={`https://api.whatsapp.com/send?phone=${getCleanedPhoneForWA(whatsappNumber)}&text=${encodeURIComponent(scanResult.data?.whatsappMessage || "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-2 rounded-2xl border-3 border-[#2D3436] bg-white px-5 py-3 text-xs font-black text-[#2D3436] hover:bg-slate-50 shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] active:translate-y-0.5 active:shadow-none transition"
                                >
                                  <Share2 className="h-4 w-4 text-[#FF6B6B]" />
                                  Kirim ke WhatsApp
                                </a>
                              </div>
                            </motion.div>
                          )}

                          {/* 4. TAB GOOGLE SHEETS CONNECTOR */}
                          {activeTab === "sheets" && !isEditing && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex flex-col gap-5 text-xs text-slate-800"
                            >
                              <div className="bg-[#FFF8E7] border-3 border-[#2D3436] rounded-2xl p-4 text-[#2D3436] flex gap-2.5 shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] font-semibold">
                                <Database className="h-5 w-5 text-[#FF6B6B] shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-black">Integrasi Google Sheets:</span> Ekspor semua item rincian struk belanja ini langsung sebagai baris data baru ke spreadsheet Anda secara real-time.
                                </div>
                              </div>

                              {needsAuth || !sheetUser ? (
                                <div className="border-3 border-[#2D3436] bg-[#FFF8E7] rounded-3xl p-6 text-center shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] flex flex-col items-center">
                                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center border-2 border-[#2D3436] shadow-sm mb-4">
                                    <FileSpreadsheet className="h-7 w-7 text-emerald-600 animate-pulse" />
                                  </div>
                                  <h4 className="text-sm font-black text-[#2D3436] uppercase tracking-wide">Hubungkan dengan Google Sheets</h4>
                                  <p className="text-slate-500 text-xs mt-1.5 max-w-sm leading-relaxed font-semibold">
                                    Berikan izin akses agar Quanto dapat menulis dan merapikan catatan pengeluaran belanja Anda langsung ke Google Drive.
                                  </p>
                                  
                                  {/* Official Sign in Button */}
                                  <button
                                    id="btn-google-login-sheets"
                                    onClick={handleGoogleLogin}
                                    className="mt-5 flex items-center gap-3.5 rounded-2xl border-3 border-[#2D3436] bg-white px-6 py-3 text-xs font-black text-[#2D3436] hover:bg-slate-50 transition shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] active:translate-y-0.5 active:shadow-none font-sans cursor-pointer"
                                  >
                                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4 shrink-0">
                                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                    </svg>
                                    Masuk dengan Google
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-5">
                                  {/* Logged in User state */}
                                  <div className="bg-[#4ECDC4]/15 border-3 border-[#2D3436] rounded-2xl p-4.5 flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
                                    <div className="flex items-center gap-3">
                                      {sheetUser.photoURL ? (
                                        <img src={sheetUser.photoURL} alt={sheetUser.displayName || "User"} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full border-2 border-[#2D3436]" />
                                      ) : (
                                        <div className="w-9 h-9 bg-[#2D3436] font-black text-white flex items-center justify-center rounded-full border-2 border-[#2D3436] text-[11px]">
                                          {sheetUser.email?.slice(0, 2).toUpperCase()}
                                        </div>
                                      )}
                                      <div>
                                        <p className="font-black text-slate-800 text-xs tracking-tight">{sheetUser.displayName || "Pengguna"}</p>
                                        <p className="text-[10px] text-slate-500 font-bold font-mono">{sheetUser.email}</p>
                                      </div>
                                    </div>
                                    
                                    <button
                                      id="btn-google-signout"
                                      onClick={handleGoogleLogout}
                                      className="flex items-center gap-1.5 border-2 border-[#2D3436] bg-white hover:bg-red-50 text-red-500 font-black px-2.5 py-1.5 rounded-xl hover:shadow-[1.5px_1.5px_0px_0px_rgba(45,52,54,1)] transition active:translate-y-0.5 text-[10px]"
                                    >
                                      <LogOut className="w-3.5 h-3.5 shrink-0" />
                                      Keluar
                                    </button>
                                  </div>

                                  {/* Config panel */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Spreadsheet ID */}
                                    <div className="bg-white border-2 border-[#2D3436] rounded-2xl p-4 shadow-[2.5px_2.5px_0px_0px_rgba(45,52,54,1)] flex flex-col justify-between">
                                      <div>
                                        <label htmlFor="input-sheet-id" className="block text-[9px] font-black text-[#2D3436] uppercase tracking-wider mb-1">
                                          Spreadsheet ID
                                        </label>
                                        <input
                                          id="input-sheet-id"
                                          type="text"
                                          placeholder="ID Spreadsheet Google"
                                          value={spreadsheetId}
                                          onChange={(e) => {
                                            setSpreadsheetId(e.target.value);
                                            localStorage.setItem("quanto_spreadsheet_id", e.target.value);
                                          }}
                                          className="w-full font-extrabold text-xs rounded-xl border-2 border-[#2D3436] bg-[#FFF8E7]/40 px-3 py-2 text-slate-800 focus:bg-[#FFF8E7] focus:outline-hidden font-mono"
                                        />
                                        <p className="text-[9px] text-slate-400 font-bold mt-1.5 leading-relaxed">
                                          ID disalin dari URL browser dokumen spreadsheet Anda.
                                        </p>
                                      </div>

                                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                        <span className="text-[9px] text-[#2D3436]/60 font-bold">Atau buat baru otomatis:</span>
                                        <button
                                          id="btn-create-sheet-auto"
                                          onClick={handleCreateAutoSpreadsheet}
                                          disabled={isExporting}
                                          className="flex items-center gap-1.5 rounded-xl border-2 border-[#2D3436] bg-[#FFE66D] px-3 py-1.5 text-[10px] font-black text-[#2D3436] hover:bg-[#FFD93D] disabled:opacity-50 shadow-[1.5px_1.5px_0px_0px_rgba(45,52,54,1)] active:translate-y-0.5 active:shadow-none transition shrink-0 cursor-pointer"
                                        >
                                          <Plus className="h-3.5 w-3.5 shrink-0" />
                                          Buat Baru
                                        </button>
                                      </div>
                                    </div>

                                    {/* Sheet Tab Name */}
                                    <div className="bg-white border-2 border-[#2D3436] rounded-2xl p-4 shadow-[2.5px_2.5px_0px_0px_rgba(45,52,54,1)]">
                                      <label htmlFor="input-sheet-name" className="block text-[9px] font-black text-[#2D3436] uppercase tracking-wider mb-1">
                                        Nama Tab / Sheet
                                      </label>
                                      <input
                                        id="input-sheet-name"
                                        type="text"
                                        placeholder="Contoh: Sheet1"
                                        value={sheetName}
                                        onChange={(e) => setSheetName(e.target.value)}
                                        className="w-full font-extrabold text-xs rounded-xl border-2 border-[#2D3436] bg-[#FFF8E7]/40 px-3 py-2 text-slate-800 focus:bg-[#FFF8E7] focus:outline-hidden"
                                      />
                                      <p className="text-[9px] text-slate-400 font-bold mt-2 leading-relaxed">
                                        Nama tab di bagian bawah dokumen (Default: Sheet1). Harus sesuai huruf kapitalnya.
                                      </p>
                                    </div>
                                  </div>

                                  {/* Export Action Block */}
                                  <div className="border-3 border-[#2D3436] bg-[#FFF8E7] rounded-3xl p-5 shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] flex flex-col gap-4">
                                    <div className="flex items-center justify-between border-b border-[#2D3436]/10 pb-3">
                                      <div>
                                        <h5 className="font-black text-xs text-[#2D3436] uppercase tracking-tight">Data Siap Kirim</h5>
                                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                                          Toko: <span className="text-[#FF6B6B] font-black">{scanResult.data?.storeName}</span> ({scanResult.data?.items.length} Barang / Baris)
                                        </p>
                                      </div>
                                      <span className="font-mono font-black text-xs text-[#2D3436]">
                                        {formatIDR(scanResult.data?.total || 0)}
                                      </span>
                                    </div>

                                    {exportSuccess && (
                                      <div className="rounded-xl border-2 border-emerald-600 bg-emerald-50 text-emerald-800 p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-semibold">
                                        <p className="flex items-center gap-2 text-xs">
                                          <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                                          Laporan struk belanja sukses diekspor ke Google Sheets Anda!
                                        </p>
                                        <a
                                          href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-center rounded-lg border-2 border-[#2D3436] bg-white px-3 py-1.5 text-[10px] font-black text-[#2D3436] hover:bg-slate-50 shadow-[1px_1px_0px_0px_rgba(45,52,54,1)] shrink-0 transition"
                                        >
                                          Buka Spreadsheet ↗
                                        </a>
                                      </div>
                                    )}

                                    {exportError && (
                                      <div className="rounded-xl border-2 border-red-600 bg-red-50 text-red-800 p-3 flex items-center gap-2 font-semibold">
                                        <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                                        <span className="text-[11px] leading-tight">{exportError}</span>
                                      </div>
                                    )}

                                    <div className="flex gap-3">
                                      <button
                                        id="btn-export-to-sheets"
                                        onClick={handleExportToSheets}
                                        disabled={isExporting}
                                        className="flex-1 flex items-center justify-center gap-2 rounded-2xl border-3 border-[#2D3436] bg-[#4ECDC4] py-3 text-xs font-black text-[#2D3436] hover:bg-[#3dbdb5] disabled:opacity-50 transition shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] active:translate-y-0.5 active:shadow-none cursor-pointer"
                                      >
                                        {isExporting ? (
                                          <>
                                            <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                                            Sedang Mengekspor Data...
                                          </>
                                        ) : (
                                          <>
                                            <FileSpreadsheet className="h-4 w-4 shrink-0" />
                                            Kirim Data ke Google Sheets
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}

                        </AnimatePresence>
                      </div>

                    </div>
                  )}
                </>
              )}
            </div>
          </section>

        </div>

        {/* RECENT HISTORIC DATABASE - LOCALPERSISTENCY */}
        <section className="mt-14 rounded-[35px] border-4 border-[#2D3436] bg-white p-6 shadow-[6px_6px_0px_0px_rgba(45,52,54,1)]">
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-black text-[#2D3436] flex items-center gap-2 uppercase tracking-tight">
                <Clock className="h-5 w-5 text-[#FF6B6B]" />
                Riwayat Pemindaian Struk
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">
                Berikut adalah riwayat struk pengeluaran belanjaan Anda. Tersimpan aman di memori lokal peramban.
              </p>
            </div>
            
            {history.length > 0 && (
              <button
                id="btn-clear-all-history"
                onClick={handleClearAllHistory}
                className="text-xs font-black text-white hover:bg-[#ff5252] flex items-center gap-1 bg-[#FF6B6B] border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] px-3.5 py-2 rounded-xl shrink-0 transition-all active:translate-y-0.5 active:shadow-none"
              >
                <Trash2 className="h-4 w-4" />
                Sapu Bersih
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">
              <BarChart2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              Belum ada riwayat struk yang terdata. Silakan pindai struk belanjaan pertama Anda!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  id={`history-${item.id}`}
                  onClick={() => handleLoadHistory(item)}
                  className="group relative flex flex-col justify-between rounded-3xl border-3 border-[#2D3436] bg-[#FFF8E7] p-5 hover:bg-[#FFE66D]/35 transition shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] active:translate-y-0.5 active:shadow-none"
                >
                  <div>
                    {/* Header item category badge */}
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-white border border-[#2D3436] text-[#2D3436] px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider">
                        {item.result.category}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {item.timestamp}
                      </span>
                    </div>

                    <h4 className="mt-3 text-sm font-black text-[#2D3436] group-hover:text-[#FF6B6B] transition line-clamp-1">
                      {item.result.storeName}
                    </h4>
                    
                    <p className="mt-1 text-xs text-slate-500 font-bold truncate">
                      {item.result.items.map((i) => i.name).join(", ")}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t-2 border-[#2D3436]/10 pt-3">
                    <span className="text-xs font-black text-[#2D3436] font-mono">
                      {formatIDR(item.result.total)}
                    </span>
                    
                    <div className="flex gap-2.5 items-center">
                      <button
                        onClick={(e) => handleDeleteHistory(item.id, e)}
                        className="rounded-xl border-2 border-transparent p-1 text-slate-400 hover:text-[#FF6B6B] hover:border-[#FF6B6B] hover:bg-white bg-slate-100"
                        title="Hapus riwayat harian"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <span className="flex h-7 w-7 items-center justify-center rounded-xl border-2 border-[#2D3436] bg-white text-[#2D3436] group-hover:bg-[#FFD93D] shadow-[1.5px_1.5px_0px_0px_rgba(45,52,54,1)] transition">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      {/* FOOTER CREDITS */}
      <footer className="mt-20 bg-[#2D3436] text-slate-400 border-t-4 border-[#2D3436] py-12 font-sans relative">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-bold text-slate-300">
            © {new Date().getFullYear()} Quanto — Asisten Keuangan Pribadi Cerdas Anda.
          </p>
          <p className="text-[10px] text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            Membantu memetakan neraca alokasi dana secara bertanggung jawab dengan pemrosesan model di sisi server. Gunakan asisten ini terus untuk mengendalikan pengeluaran harian Anda!
          </p>
        </div>
      </footer>

    </div>
  );
}
