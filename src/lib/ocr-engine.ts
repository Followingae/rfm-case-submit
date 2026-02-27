import { OCRData } from "./types";

let ocrReady = false;

async function getWorker() {
  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker("eng", undefined, {
    logger: () => {},
  });
  ocrReady = true;
  return worker;
}

export async function extractTextFromFile(file: File): Promise<string> {
  try {
    const worker = await getWorker();
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });
    const {
      data: { text },
    } = await worker.recognize(blob);
    await worker.terminate();
    return text;
  } catch (err) {
    console.error("OCR extraction failed:", err);
    return "";
  }
}

export function parseMDFText(text: string): Partial<OCRData> {
  const data: Partial<OCRData> = { rawMdfText: text };
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || "";

    if (/merchant.*legal.*name/i.test(line)) {
      data.merchantLegalName = nextLine;
    }
    if (/doing.*business.*as/i.test(line)) {
      data.dba = nextLine;
    }
    if (/^address$/i.test(line)) {
      data.address = nextLine;
    }
    if (/emirate/i.test(line)) {
      const match = line.match(/emirate\s*[:\-]?\s*(.*)/i);
      if (match?.[1]) data.emirate = match[1];
      else data.emirate = nextLine;
    }
    if (/telephone.*no/i.test(line)) {
      const match = line.match(/[\d\s\+\-()]{7,}/);
      if (match) data.telephone = match[0].trim();
    }
    if (/mobile.*no/i.test(line)) {
      const match = line.match(/[\d\s\+\-()]{7,}/);
      if (match) data.mobile = match[0].trim();
    }
    if (/email.*address.*1/i.test(line)) {
      const emailMatch = line.match(/[\w.-]+@[\w.-]+/);
      if (emailMatch) data.email1 = emailMatch[0];
      else {
        const nextEmail = nextLine.match(/[\w.-]+@[\w.-]+/);
        if (nextEmail) data.email1 = nextEmail[0];
      }
    }
    if (/email.*address.*2/i.test(line)) {
      const emailMatch = line.match(/[\w.-]+@[\w.-]+/);
      if (emailMatch) data.email2 = emailMatch[0];
    }
    if (/shop.*location/i.test(line)) {
      data.shopLocation = nextLine;
    }
    if (/nature.*business/i.test(line)) {
      data.businessType = nextLine;
    }
    if (/web.*address/i.test(line)) {
      data.webAddress = nextLine;
    }
    if (/iban/i.test(line)) {
      const ibanMatch = line.match(/[A-Z]{2}\d{2}[\w\s]{10,30}/);
      if (ibanMatch) data.iban = ibanMatch[0].replace(/\s/g, "");
      else {
        const nextIban = nextLine.match(/[A-Z]{2}\d{2}[\w]{10,30}/);
        if (nextIban) data.iban = nextIban[0];
      }
    }
    if (/account.*no/i.test(line) && !/iban/i.test(line)) {
      const accMatch = nextLine.match(/[\d\s]{5,}/);
      if (accMatch) data.accountNo = accMatch[0].trim();
    }
    if (/account.*title/i.test(line)) {
      data.accountTitle = nextLine;
    }
    if (/bank.*name/i.test(line)) {
      data.bankName = nextLine;
    }
    if (/swift/i.test(line)) {
      const swiftMatch = line.match(/[A-Z]{4}[A-Z]{2}[A-Z0-9]{2,5}/);
      if (swiftMatch) data.swiftCode = swiftMatch[0];
      else {
        const nextSwift = nextLine.match(/[A-Z]{4}[A-Z]{2}[A-Z0-9]{2,5}/);
        if (nextSwift) data.swiftCode = nextSwift[0];
      }
    }
    if (/number.*terminal/i.test(line)) {
      const numMatch = line.match(/\d+/) || nextLine.match(/\d+/);
      if (numMatch) data.numberOfTerminals = numMatch[0];
    }
  }

  return data;
}

export function parseTradeLicenseText(text: string): Partial<OCRData> {
  const data: Partial<OCRData> = { rawTlText: text };
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1] || "";

    if (/licen[cs]e.*(?:no|number)/i.test(line)) {
      const numMatch = line.match(/[\d\-\/]+/) || nextLine.match(/[\d\-\/]+/);
      if (numMatch) data.tlNumber = numMatch[0];
    }
    if (/expir/i.test(line)) {
      const dateMatch =
        line.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/) ||
        nextLine.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/);
      if (dateMatch) data.tlExpiryDate = dateMatch[0];
    }
    if (/issue.*date/i.test(line)) {
      const dateMatch =
        line.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/) ||
        nextLine.match(/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/);
      if (dateMatch) data.tlIssueDate = dateMatch[0];
    }
    if (/(?:trade|business|company).*name/i.test(line)) {
      data.tlBusinessName = nextLine;
    }
    if (/activit/i.test(line)) {
      data.tlActivities = nextLine;
    }
  }

  return data;
}

export function isOCRReady(): boolean {
  return ocrReady;
}
