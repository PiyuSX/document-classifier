import { createWorker } from "tesseract.js"
import { readFile } from "fs/promises"
import { join } from "path"
import { mkdir } from "fs/promises"
import * as pdfParse from "pdf-parse"

// Ensure the tmp directory exists
const ensureTmpDir = async () => {
  const tmpDir = join(process.cwd(), "tmp")
  try {
    await mkdir(tmpDir, { recursive: true })
  } catch (error) {
    console.error("Error creating tmp directory:", error)
  }
  return tmpDir
}

// Initialize Tesseract worker
const initWorker = async () => {
  const worker = await createWorker("eng")
  return worker
}

// Extract text from an image using OCR
const extractTextFromImage = async (imagePath: string) => {
  try {
    const worker = await initWorker()
    const { data } = await worker.recognize(imagePath)
    await worker.terminate()
    return data.text
  } catch (error) {
    console.error(`Error processing image ${imagePath}:`, error)
    return ""
  }
}

// Convert PDF to images and extract text
const extractTextFromPdf = async (pdfPath: string) => {
  try {
    const dataBuffer = await readFile(pdfPath)
    const data = await pdfParse(dataBuffer)

    // For simple text extraction, we can use the text property
    // For more complex PDFs, we might need to convert pages to images and use OCR
    return data.text

    // Alternative approach using OCR on PDF pages:
    /*
    const tmpDir = await ensureTmpDir();
    let allText = '';
    
    // Use pdf-img-convert or similar library to convert PDF pages to images
    // Then process each image with OCR
    
    return allText;
    */
  } catch (error) {
    console.error(`Error processing PDF ${pdfPath}:`, error)
    return ""
  }
}

// Classify document based on content and filename
const classifyDocument = async (filePath: string, fileName: string, extractedText: string) => {
  // Simple classification based on filename and content
  const fileNameLower = fileName.toLowerCase()
  const textLower = extractedText.toLowerCase()

  if (
    fileNameLower.includes("passport") ||
    textLower.includes("passport") ||
    textLower.includes("nationality") ||
    textLower.includes("place of birth")
  ) {
    return "Passport"
  } else if (
    fileNameLower.includes("citizenship") ||
    textLower.includes("citizenship") ||
    textLower.includes("citizen") ||
    textLower.includes("national id")
  ) {
    return "Citizenship"
  } else if (
    fileNameLower.includes("pan") ||
    textLower.includes("pan") ||
    textLower.includes("permanent account number") ||
    textLower.includes("income tax")
  ) {
    return "PAN Card"
  } else if (
    fileNameLower.includes("account") ||
    textLower.includes("account opening") ||
    textLower.includes("bank account")
  ) {
    return "Account Opening Form"
  } else {
    return "Unknown Document Type"
  }
}

// Process a single document
export const processDocument = async (filePath: string, fileName: string) => {
  try {
    let extractedText = ""

    if (fileName.toLowerCase().endsWith(".pdf")) {
      extractedText = await extractTextFromPdf(filePath)
    } else if (/\.(jpg|jpeg|png)$/i.test(fileName)) {
      extractedText = await extractTextFromImage(filePath)
    } else {
      throw new Error(`Unsupported file type: ${fileName}`)
    }

    const documentType = await classifyDocument(filePath, fileName, extractedText)

    return {
      filePath,
      fileName,
      documentType,
      extractedText,
    }
  } catch (error) {
    console.error(`Error processing document ${fileName}:`, error)
    return {
      filePath,
      fileName,
      documentType: "Error",
      extractedText: `Error processing document: ${error.message}`,
    }
  }
}

// Process multiple documents
export const processDocuments = async (filePaths: string[]) => {
  const results = []

  for (const filePath of filePaths) {
    const fileName = filePath.split("/").pop() || filePath
    const result = await processDocument(filePath, fileName)
    results.push(result)
  }

  return results
}

