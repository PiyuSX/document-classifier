import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { processDocument } from "@/lib/document-processor-fixed"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // Ensure tmp directory exists
    const tempDir = join(process.cwd(), "tmp")
    try {
      await mkdir(tempDir, { recursive: true })
    } catch (error) {
      console.error("Error creating tmp directory:", error)
    }

    const results = []

    for (const file of files) {
      // Create a temporary file path
      const filePath = join(tempDir, file.name)

      try {
        await writeFile(filePath, Buffer.from(await file.arrayBuffer()))
      } catch (error) {
        console.error("Error saving file:", error)
        results.push({
          fileName: file.name,
          documentType: "Error",
          extractedText: `Error saving file: ${error.message}`,
        })
        continue
      }

      // Process the document
      const result = await processDocument(filePath, file.name)
      results.push({
        fileName: file.name,
        documentType: result.documentType,
        extractedText: result.extractedText,
      })
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error processing documents:", error)
    return NextResponse.json({ error: "Failed to process documents" }, { status: 500 })
  }
}

