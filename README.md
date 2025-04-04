Document Classifier
This project is a document classification system with Next.js for the frontend and FastAPI for the backend.

Tech Stack
Frontend: Next.js

Backend: FastAPI (Python)

Features
Upload documents (PDF, DOCX, etc.)

Classify documents based on content

Extract and display text from documents

Setup
Backend (FastAPI)
Clone the Repo:

bash
Copy
Edit
git clone <repo_url>
cd python_backend
Create a virtual environment:

bash
Copy
Edit
python -m venv venv
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\activate  # Windows
Install dependencies:

bash
Copy
Edit
pip install -r requirements.txt
Start the backend server:

bash
Copy
Edit
uvicorn main:app --reload --host 0.0.0.0 --port 8000
Frontend (Next.js)
Clone the Repo:

bash
Copy
Edit
git clone <repo_url>
cd frontend
Install dependencies:

bash
Copy
Edit
npm install
Start the frontend server:

bash
Copy
Edit
npm run dev
Access the frontend at http://localhost:3000.

Notes
Ensure the backend is running on http://localhost:8000 before starting the frontend.

Backend accepts document uploads and returns classification results.

That's it! The setup should be quick, and you'll have the frontend and backend running.
