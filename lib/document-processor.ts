import { createWorker } from "tesseract.js"
import { readFile } from "fs/promises"

/**
 * Function to extract text using OCR from images
 * Direct port of Python's extract_text_from_image function
 */
export const extractTextFromImage = async (imagePath: string) => {
  try {
    // Read the image (equivalent to cv2.imread)
    const imageBuffer = await readFile(imagePath)

    // Process with Tesseract (equivalent to pytesseract.image_to_string)
    const worker = await createWorker("eng")
    const { data } = await worker.recognize(imageBuffer)
    await worker.terminate()

    return data.text
  } catch (error) {
    console.error(`Error processing image ${imagePath}: ${error}`)
    return null
  }
}

/**
 * Function to extract text from PDF
 * Direct port of Python's extract_text_from_pdf function
 */
export const extractTextFromPdf = async (pdfPath: string) => {
  try {
    // Note: In a browser/serverless environment, we can't use pdf2image directly
    // This is a simplified approach that works in the current environment
    console.log("PDF extraction is limited in this environment")

    // For a full implementation, we would:
    // 1. Convert PDF to images (using a PDF rendering library)
    // 2. Process each image with OCR
    // 3. Combine the text

    return "PDF text extraction requires full server capabilities. Classification will be based on filename only."
  } catch (error) {
    console.error(`Error processing PDF ${pdfPath}: ${error}`)
    return null
  }
}

/**
 * Function to process files (PDFs and images)
 * Direct port of Python's process_files function
 */
export const processFiles = async (filePaths: string[]) => {
  let allText = ""

  for (const filePath of filePaths) {
    const filePathLower = filePath.toLowerCase()

    if (filePathLower.endsWith(".pdf")) {
      const pdfText = await extractTextFromPdf(filePath)
      if (pdfText) {
        allText += pdfText + "\n"
      }
    } else if (filePathLower.endsWith(".jpg") || filePathLower.endsWith(".jpeg") || filePathLower.endsWith(".png")) {
      const imageText = await extractTextFromImage(filePath)
      if (imageText) {
        allText += imageText + "\n"
      }
    } else {
      console.log(`Unsupported file type: ${filePath}`)
    }
  }

  return allText
}

/**
 * Function to classify document (simplified version for now)
 * Direct port of Python's classify_document function
 */
export const classifyDocument = (filePath: string) => {
  const filePathLower = filePath.toLowerCase()

  if (filePathLower.includes("passport")) {
    return "Passport"
  } else if (filePathLower.includes("citizenship")) {
    return "Citizenship"
  } else if (filePathLower.includes("pan")) {
    return "PAN Card"
  } else {
    return "Unknown Document Type"
  }
}

/**
 * Function to extract text and classify documents
 * Direct port of Python's extract_and_classify_documents function
 */
export const extractAndClassifyDocuments = async (filePaths: string[]) => {
  const documentData = []

  for (const filePath of filePaths) {
    const text = await processFiles([filePath])
    const documentType = classifyDocument(filePath)

    documentData.push({
      file_path: filePath,
      document_type: documentType,
      extracted_text: text ? text.trim() : "",
    })
  }

  return documentData
}

/**
 * Process a single document (for use with the API)
 * This combines the functionality of process_files and classify_document
 */
export const processDocument = async (filePath: string, fileName: string) => {
  try {
    // Extract text based on file type
    let extractedText = ""
    const fileNameLower = fileName.toLowerCase()

    if (fileNameLower.endsWith(".pdf")) {
      extractedText = (await extractTextFromPdf(filePath)) || ""
    } else if (fileNameLower.endsWith(".jpg") || fileNameLower.endsWith(".jpeg") || fileNameLower.endsWith(".png")) {
      extractedText = (await extractTextFromImage(filePath)) || ""
    } else {
      throw new Error(`Unsupported file type: ${fileName}`)
    }

    // Classify the document
    const documentType = classifyDocument(filePath)

    return {
      file_path: filePath,
      fileName,
      document_type: documentType,
      extracted_text: extractedText ? extractedText.trim() : "",
    }
  } catch (error) {
    console.error(`Error processing document ${fileName}:`, error)
    return {
      file_path: filePath,
      fileName,
      document_type: "Error",
      extracted_text: `Error processing document: ${error.message}`,
    }
  }
}

