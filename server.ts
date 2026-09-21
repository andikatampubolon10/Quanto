/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazy initialize Gemini AI client to avoid crashing on start if API key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set limits for larger image size transmissions (e.g. from camera snaps or receipts uploads)
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // API endpoint for receipt analysis and JSON extraction
  app.post("/api/scan", async (req, res) => {
    try {
      const { image, mimeType } = req.body;
      if (!image || !mimeType) {
        return res.status(400).json({
          success: false,
          isReceipt: false,
          message: "Data gambar tidak lengkap atau format tidak didukung."
        });
      }

      let ai: GoogleGenAI;
      try {
        ai = getGeminiClient();
      } catch (err: any) {
        return res.status(200).json({
          success: false,
          isReceipt: false,
          message: "Quanto belum siap memproses struk Anda karena GEMINI_API_KEY belum terpasang di Settings > Secrets aplikasi ini. Silakan pasang API key Anda terlebih dahulu."
        });
      }

      // Clean metadata headers from base64 if sent
      const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");

      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64
        }
      };

      const systemInstruction = 
        "Anda adalah Quanto, asisten keuangan pribadi dan pelacak dana pintar asal Indonesia. " +
        "Tugas Anda adalah memproses file gambar struk belanja yang diunggah oleh pengguna dan merapikannya menjadi JSON. " +
        "Berlakulah ringkas, sopan, bersahabat, informatif, dan persuasif.\n\n" +
        "ATURAN PEMROSESAN:\n" +
        "1. Ekstraksi Data: Ambil Nama Toko (storeName), Tanggal transaksi (date), Total pembayaran (total), Daftar Item (items), dan Kategori (category).\n" +
        "2. Jika gambar tersebut merupakan struk yang sah dan bisa dibaca:\n" +
        "   - Setel 'isReceipt' ke true.\n" +
        "   - Masukkan hasil ekstraksi di field 'data'.\n" +
        "   - Tentukan kategori otomatis (Food, Coffee, Gadget, Transport, Groceries, Utilities, Fashion, dll) berdasarkan nama masing-masing item.\n" +
        "   - Siapkan teks pesan WhatsApp (whatsappMessage) yang persuasif dan mudah dibaca di dalam 'data' menggunakan format ramah pengguna Indonesia dengan emoji yang pas, berfokus menghitung total pengeluaran, perincian barang diringkas, serta memberi satu tip berhemat hemat/budgeting cerdas khusus untuk kategori pengeluaran tersebut dari asisten keuangan Quanto.\n" +
        "3. Jika gambar blur, tidak terbaca, bukan struk belanja, atau tidak masuk akal:\n" +
        "   - Setel 'isReceipt' ke false.\n" +
        "   - Kosongkan isi parent field 'data' atau setel null/unspecified.\n" +
        "   - Berikan tanggapan di field 'message' dengan menggunakan persona Quanto yang ramah, sopan, dan santun, meminta pengguna mengunggah kembali gambar struk yang lebih cerah, tegas, dan lurus posisinya.";

      const promptPart = {
        text: "Pindai struk ini secara detail, klasifikasikan item belanjaannya, lalu susun format pesan WhatsApp persuasif dari asisten Quanto."
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, promptPart] },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              success: { type: Type.BOOLEAN, description: "Set to true if scanning completed successfully" },
              isReceipt: { type: Type.BOOLEAN, description: "Whether the image is a valid, readable receipt" },
              message: { type: Type.STRING, description: "A courteous message to display to the user. Polite request if not a receipt; cheerful briefing if yes." },
              data: {
                type: Type.OBJECT,
                properties: {
                  storeName: { type: Type.STRING, description: "Extracted store or shop name (e.g. Indomaret, Starbucks, Grab, Tokopedia). Use 'Tidak Diketahui' if absent." },
                  date: { type: Type.STRING, description: "Extracted transaction date. Format nicely as a string (YYYY-MM-DD or readable Indonesian)." },
                  total: { type: Type.NUMBER, description: "Overall receipt total paid amount" },
                  category: { type: Type.STRING, description: "Overall major expenditure category for this transaction (e.g. Coffee, Food, Gadget, Transport, Groceries)" },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING, description: "Product item name" },
                        quantity: { type: Type.NUMBER, description: "Purchased quantity" },
                        price: { type: Type.NUMBER, description: "Single unit pricing of this item" },
                        total: { type: Type.NUMBER, description: "Summed line pricing (quantity * price)" },
                        category: { type: Type.STRING, description: "Automated category of this specific item based on his name (e.g., Coffee, Food, Gadget, Transport etc.)" }
                      },
                      required: ["name", "quantity", "price", "total", "category"]
                    },
                    description: "Details of individual purchased products"
                  },
                  whatsappMessage: {
                    type: Type.STRING,
                    description: "Indonesian copyable summary for WhatsApp. Keep it neat, structured, beautifully spaced, persuasive, showing store name, items breakdown, total, and Quanto's witty savings advice relative to what was purchased."
                  }
                },
                required: ["storeName", "date", "total", "category", "items", "whatsappMessage"]
              }
            },
            required: ["success", "isReceipt", "message"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Response model output is blank.");
      }

      const parsedJSON = JSON.parse(responseText.trim());
      // Ensure we pass back appropriate success flag
      parsedJSON.success = true;
      res.json(parsedJSON);

    } catch (error: any) {
      console.error("Scan API Error:", error);
      res.status(500).json({
        success: false,
        isReceipt: false,
        message: "Maaf, Quanto mengalami gangguan dalam membaca koordinat struk belanja Anda: " + (error.message || "Kesalahan teknis tak dikenal")
      });
    }
  });

  // Healthcheck
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Quanto API" });
  });

  // Serve Vite frontend
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind to port 3000 as required in instructions
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Quanto server successfully initialized on port ${PORT}`);
  });
}

startServer();
