# AI-Based Assignment Validation 2.0 🎓🚀

A modern fullstack web platform for computer engineering coursework, featuring **Two-Tier AI Plagiarism Detection**, **Code-Tailored Dynamic AI Comprehension Vivas (Quiz)**, and **Conditional GitHub Submission Unlocking**.

> **JSPM's Bhivarabai Sawant Institute of Technology & Research (BSIOTR), Wagholi, Pune**  
> **Department of Computer Engineering • Academic Year 2025–26**  
> **Team Members**: 1. Deshmukh Vansh, 2. Dhumal Jaydeep, 3. Chede Omkar  
> **Team Guide**: Prof. Nitin Shivale  

---

## ⚡ Key Innovations & Workflow

```
[ Signup / Login ]
        ↓
[ Assignment Selection ]
        ↓
[ Solution Code Upload / Editor ]
        ↓
[ Tier-1 Structural Winnowing Check ]
        ├── Low (< 35%): Direct Pass to AI Viva
        ├── High (> 75%): Plagiarism Alert Flagged
        └── Borderline (35% - 75%):
                ↓
        [ Tier-2 Gemini AI Semantic & Logic Scan ]
        (Detects logic equivalence, renamed variables, AI footprint)
                ↓
[ AI Dynamic Viva / Quiz ]
(Generates 4 multiple choice questions tailored to the student's actual code)
        ↓
[ Passing Score Check (≥ 70%) ]
        ↓
[ GitHub Repository Commit & Certification Receipt ]
```

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Canvas-Confetti
- **Backend**: Node.js, Express, Multer, Persistent JSON/SQLite Data Store
- **Plagiarism Engine**: Multi-language Tokenizer, Rabin-Karp polynomial rolling hash, Schleimer Winnowing Fingerprinting, Jaccard containment
- **AI Intelligence**: Google Gemini 1.5/2.0 API (with offline semantic heuristics fallback)
- **Integrations**: GitHub commit hash generator, cryptographic verification receipts

---

## 🚀 Quick Start Instructions

### 1. Install Dependencies
```bash
# In the root directory:
npm install --prefix server
npm install --prefix client
```

### 2. Run Development Server
```bash
# Runs both backend (port 5000) and frontend (port 5173):
node dev-runner.js
```

Open your browser at: **`http://localhost:5173`**

---

## 🧪 Testing the 2-Tier Workflow in 1-Click

The solution editor includes 3 built-in demo buttons:
1. **Original Code**: Demonstrates an independent recursive BST implementation. Passes Tier-1 cleanly ($<35\%$).
2. **Borderline Code**: Demonstrates a structurally modified solution with renamed variables (`curr -> current_node`, `res -> result_list`). Automatically triggers the **Tier-2 Gemini AI Semantic Scan**!
3. **Copied Code**: Demonstrates high token collision ($>80\%$) matching another student's submission.
