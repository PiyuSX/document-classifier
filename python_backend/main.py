from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pytesseract
from PIL import Image
import cv2
import os
import json
import shutil
import uuid
from pdf2image import convert_from_path
from typing import List

app = FastAPI()

# Configure CORS to allow requests from the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a temporary directory for uploaded files
TEMP_DIR = "temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

# Function to extract text using OCR from images
def extract_text_from_image(image_path):
    try:
        img = cv2.imread(image_path)
        text = pytesseract.image_to_string(img)
        return text
    except Exception as e:
        print(f"Error processing image {image_path}: {e}")
        return None

# Function to extract text from PDF
def extract_text_from_pdf(pdf_path):
    try:
        images = convert_from_path(pdf_path)
        all_text = ""
        for img in images:
            all_text += pytesseract.image_to_string(img) + "\n"
        return all_text
    except Exception as e:
        print(f"Error processing PDF {pdf_path}: {e}")
        return None

# Function to process files (PDFs and images)
def process_files(file_paths):
    all_text = ""
    for file_path in file_paths:
        if file_path.lower().endswith('.pdf'):
            text = extract_text_from_pdf(file_path)
            if text:
                all_text += text + "\n"
        elif file_path.lower().endswith(('.jpg', '.jpeg', '.png')):
            text = extract_text_from_image(file_path)
            if text:
                all_text += text + "\n"
        else:
            print(f"Unsupported file type: {file_path}")
    return all_text

# Function to classify document
def classify_document(file_path):
    if "passport" in file_path.lower():
        return "Passport"
    elif "citizenship" in file_path.lower():
        return "Citizenship"
    elif "pan" in file_path.lower():
        return "PAN Card"
    else:
        return "Unknown Document Type"

# Function to extract text and classify documents
def extract_and_classify_documents(file_paths, original_filenames):
    document_data = []
    for i, file_path in enumerate(file_paths):
        text = process_files([file_path])
        document_type = classify_document(file_path)
        
        # Use the original filename for classification and display
        original_filename = original_filenames[i]
        if not document_type or document_type == "Unknown Document Type":
            # Try to classify based on original filename if path-based classification failed
            if "passport" in original_filename.lower():
                document_type = "Passport"
            elif "citizenship" in original_filename.lower():
                document_type = "Citizenship"
            elif "pan" in original_filename.lower():
                document_type = "PAN Card"
        
        document_data.append({
            'file_path': file_path,
            'file_name': original_filename,
            'document_type': document_type,
            'extracted_text': text.strip() if text else ""
        })
    return document_data

@app.post("/process-documents")
async def process_documents(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    saved_files = []
    original_filenames = []
    
    try:
        # Save uploaded files to temporary directory
        for file in files:
            # Generate a unique filename to avoid collisions
            file_extension = os.path.splitext(file.filename)[1]
            temp_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(TEMP_DIR, temp_filename)
            
            # Save the file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            saved_files.append(file_path)
            original_filenames.append(file.filename)
        
        # Process the documents
        results = extract_and_classify_documents(saved_files, original_filenames)
        
        # Clean up temporary files
        for file_path in saved_files:
            if os.path.exists(file_path):
                os.remove(file_path)
        
        return results
    
    except Exception as e:
        # Clean up any saved files in case of error
        for file_path in saved_files:
            if os.path.exists(file_path):
                os.remove(file_path)
        
        raise HTTPException(status_code=500, detail=f"Error processing documents: {str(e)}")

@app.get("/")
async def root():
    return {"message": "Document Classification API is running"}

