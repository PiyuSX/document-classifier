import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { extractAndClassifyDocuments } from "@/lib/document-processor"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // Create temporary directory (equivalent to os.makedirs in Python)
    const tempDir = join(process.cwd(), ".temp-uploads")

    try {
      if (!existsSync(tempDir)) {
        await mkdir(tempDir, { recursive: true })
        console.log(`Created temporary directory at: ${tempDir}`)
      }
    } catch (dirError) {
      console.error("Error creating temporary directory:", dirError)
      return NextResponse.json({ error: "Failed to create temporary storage" }, { status: 500 })
    }

    // Save uploaded files and collect their paths
    const filePaths = []
    const fileNames = []

    for (const file of files) {
      const filePath = join(tempDir, file.name)
      fileNames.push(file.name)

      try {
        // Save the file
        const buffer = Buffer.from(await file.arrayBuffer())
        await writeFile(filePath, buffer)
        console.log(`Saved file to: ${filePath}`)
        filePaths.push(filePath)
      } catch (error) {
        console.error(`Error saving file ${file.name}:`, error)
        // Continue with other files
      }
    }

    if (filePaths.length === 0) {
      return NextResponse.json({ error: "Failed to save any files" }, { status: 500 })
    }

    // Process the documents using the Python-equivalent function
    const documentData = await extractAndClassifyDocuments(filePaths)

    // Format the results to include the original filenames
    const results = documentData.map((doc, index) => ({
      fileName: fileNames[index],
      documentType: doc.document_type,
      extractedText: doc.extracted_text,
      filePath: doc.file_path,
    }))

    // Return JSON response (equivalent to json.dump in Python)
    return NextResponse.json(results)
  } catch (error) {
    console.error("Error processing documents:", error)
    // Ensure we return a valid JSON response even when there's an error
    return NextResponse.json({ error: `Failed to process documents: ${error.message}` }, { status: 500 })
  }
}

