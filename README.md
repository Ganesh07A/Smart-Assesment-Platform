# Smart Assessment Platform

A comprehensive web-based platform for conducting secure and efficient online assessments. The system supports both Multiple Choice Questions (MCQ) and Coding challenges, featuring a secure exam environment, real-time analytics, and role-based dashboards for Teachers and Students.

## 🚀 Features

### for Teachers 👨‍🏫
- **Dashboard**: Real-time statistics, recent activity logs, and exam analytics.
- **Exam Management**: Create, edit, and delete exams with custom duration and marks.
- **Question Bank**: Support for MCQs and Coding problems (with test cases).
- **Bulk Upload**: Upload questions via Excel sheets.
- **Results**: View detailed student reports and export results to Excel.

### for Students 👨‍🎓
- **Dashboard**: View assigned exams and past results.
- **Secure Exam Interface**: 
    - Full-screen enforcement.
    - Anti-cheating measures (tab-switch detection, copy/paste disabled).
    - Real-time timer.
- **Code Compiler**: Integrated code editor (Monaco) for solving programming problems.
- **Instant Feedback**: Immediate pass/fail status and detailed performance reports.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS (v4)
- **Icons**: Lucide React
- **Charts**: Recharts
- **Editor**: Monaco Editor (VS Code like experience)
- **State/HTTP**: Axios, React Router DOM
- **Utilities**: `jspdf`, `xlsx`, `react-hot-toast`

### Backend
- **Runtime**: Node.js & Express.js
- **Database**: PostgreSQL (via Neon DB or Local)
- **ORM**: Prisma
- **Auth**: JWT (JSON Web Tokens) & Bcrypt.js
- **File Handling**: Multer (for uploads)
- **Validation**: Zod (implied usage via best practices) / Manual validation

## ⚙️ Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (Local or Cloud instance like Neon)
- Git

## 📦 Installation

Clone the repository:
```bash
git clone <repository-url>
cd Smart-Assesment-Platform
```

### 1. Backend Setup
Navigate to the backend folder and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/smart_assessment_db"
SECRET_KEY="your_super_secret_jwt_key"
PORT=5000
```

Run Database Migrations (Prisma):
```bash
npx prisma migrate dev --name init
```

Start the Backend Server:
```bash
npm start
# OR for development
npm run dev
```

### 2. Frontend Setup
Open a new terminal, navigate to the frontend folder, and install dependencies:
```bash
cd frontend
npm install
```

Start the Frontend Dev Server:
```bash
npm run dev
```

## 🏃‍♂️ Usage
1.  Open your browser and navigate to `http://localhost:5173`.
2.  **Register/Login**:
    - Sign up as a **Teacher** to create exams.
    - Sign up as a **Student** to take exams.
3.  **Teacher Flow**: Create an exam -> Add questions (Ui or Excel) -> Share Exam ID/Title with students.
4.  **Student Flow**: Find the exam in dashboard -> Start Exam -> Submit.

## 🛡️ Security Features
- **Tab Switch Detection**: Warns the user if they switch tabs; auto-submits after 3 warnings.
- **Full Screen Mode**: Forces full screen to minimize distractions and cheating.
- **Context Menu Block**: Disables right-click, copy, paste, and cut actions during the exam.

## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a pull request.

## 📄 License
This project is licensed under the ISC License.
