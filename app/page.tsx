"use client"

import type React from "react"

import { useState } from "react"
import { Upload, FileText, AlertCircle, Info, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function Home() {
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("upload")
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles((prevFiles) => [...prevFiles, ...newFiles])
      setError(null) // Clear any previous errors
    }
  }

  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index))
  }

  const processFiles = async () => {
    if (files.length === 0) return

    setProcessing(true)
    setProgress(10)
    setResults([])
    setError(null)

    try {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append("files", file)
      })

      setProgress(30)

      // Add a timeout to prevent the request from hanging indefinitely
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 180000) // 3 minute timeout

      try {
        // Call the Python backend API
        const response = await fetch("/api/process-documents", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        setProgress(70)

        // Check if the response is OK
        if (!response.ok) {
          // Try to parse the error as JSON
          try {
            const errorData = await response.json()
            throw new Error(errorData.detail || `Server error: ${response.status}`)
          } catch (jsonError) {
            // If we can't parse JSON, use the status text
            throw new Error(`Server error: ${response.status} ${response.statusText}`)
          }
        }

        // Try to parse the response as JSON
        try {
          const data = await response.json()
          setResults(data)
          setActiveTab("results")
        } catch (jsonError) {
          throw new Error("Invalid response format from server")
        }
      } catch (fetchError) {
        if (fetchError.name === "AbortError") {
          throw new Error("Request timed out. The document processing took too long.")
        }
        throw fetchError
      }

      setProgress(100)
    } catch (error) {
      console.error("Error processing documents:", error)
      setError(error.message || "Failed to process documents")
      setProgress(0)
    } finally {
      setProcessing(false)
    }
  }

  // Format extracted text for display
  const TextDisplay = ({ text }: { text: string }) => {
    if (!text) {
      return <p className="text-gray-500 italic">No text extracted</p>
    }

    if (text.startsWith("Error")) {
      return <div className="bg-red-50 p-3 rounded text-sm text-red-600 whitespace-pre-wrap">{text}</div>
    }

    return (
      <div className="bg-gray-50 p-3 rounded text-sm font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
        {text}
      </div>
    )
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase()
    if (extension === "pdf") {
      return <FileText className="h-5 w-5 text-red-500" />
    }
    return <FileText className="h-5 w-5 text-blue-500" />
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 md:p-24 bg-gray-50">
      <div className="w-full max-w-5xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Document Classification & OCR System</h1>
          <p className="text-gray-500 mt-2">Upload documents to classify and extract text using OCR</p>
        </div>


        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Documents</TabsTrigger>
            <TabsTrigger value="results" disabled={results.length === 0}>
              Results {results.length > 0 && `(${results.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Documents</CardTitle>
                <CardDescription>
                  Upload PDF or image files (.jpg, .png, .jpeg) to classify and extract text
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </div>
                )}

                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  <Upload className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500">PDF, JPG, JPEG, PNG</p>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {files.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-2">Selected Files ({files.length})</h3>
                    <ul className="space-y-2">
                      {files.map((file, index) => (
                        <li key={index} className="flex items-center justify-between p-3 bg-white rounded-md border">
                          <div className="flex items-center">
                            {getFileIcon(file.name)}
                            <span className="ml-2 text-sm truncate max-w-[200px] md:max-w-md">{file.name}</span>
                          </div>
                          <button onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700">
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {processing && (
                  <div className="mt-6">
                    <p className="text-sm mb-2">Processing documents... This may take a minute for large files.</p>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={processFiles} disabled={files.length === 0 || processing} className="w-full">
                  {processing ? "Processing..." : "Process Documents"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Processing Results</CardTitle>
                <CardDescription>Classification and text extraction results for your documents</CardDescription>
              </CardHeader>
              <CardContent>
                {results.length > 0 ? (
                  <div className="space-y-6">
                    {results.map((result, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-100 p-4 flex flex-wrap justify-between items-center">
                          <div className="flex items-center mb-2 md:mb-0">
                            {getFileIcon(result.file_name || result.fileName)}
                            <span className="ml-2 font-medium">{result.file_name || result.fileName}</span>
                          </div>
                          <Badge
                            variant={
                              (result.document_type || result.documentType) !== "Unknown Document Type" &&
                              (result.document_type || result.documentType) !== "Error"
                                ? "default"
                                : "outline"
                            }
                          >
                            {result.document_type || result.documentType}
                          </Badge>
                        </div>
                        <div className="p-4">
                          <h4 className="text-sm font-medium mb-2">Extracted Text:</h4>
                          <TextDisplay text={result.extracted_text || result.extractedText} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 mx-auto text-gray-400" />
                    <p className="mt-2 text-gray-600">No results available</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setActiveTab("upload")} className="w-full">
                  Upload More Documents
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const jsonStr = JSON.stringify(results, null, 2)
                    const blob = new Blob([jsonStr], { type: "application/json" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = "extracted_documents.json"
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                  }}
                  className="w-full"
                  disabled={results.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Save as JSON
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

