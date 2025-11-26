💡 My Capstone Project: Real-Time AI Chatbot System

This repository holds the code for my final full-stack project: a highly stable and professionally styled AI chatbot. The goal was to master continuous integration, state management, and modern UI/UX design while working with complex external APIs.

I focused on replicating the smooth, reliable experience of tools like ChatGPT, making sure the project could handle technical tasks (like code generation) without freezing or failing due to API limitations.

✨ Project Highlights (What I Learned)

Professional UI/UX: I built a custom full-screen, dark-mode application shell with a static sidebar, focusing heavily on responsive design and clean visual separation (mimics the ChatGPT aesthetic).

State Management: I implemented a reliable in-memory chat session manager to ensure the AI (Gemini 2.5 Flash) retains the full context of the conversation.

Stability Engineering: This was a huge challenge! I developed an exponential backoff retry mechanism to stabilize the application and overcome the strict rate limits of the Gemini API's free tier.

Clean Output: I used a strict system prompt to force the AI to be concise and deliver only the necessary code and technical information, eliminating unnecessary explanations.

Full-Stack Feedback Loop: I implemented a complete system for users to rate AI responses (Upvote/Downvote), logging that valuable quality data directly to my MySQL database.

🛠️ Tech Stack & Structure

Component

Technology

Role

Backend (Server)

Node.js (Express.js)

Handles routing, stability, and data logging.

AI/Logic

Google Gemini 2.5 Flash

The conversational brain, focused on speed and high-throughput.

Database

MySQL

Stores user chats and feedback ratings.

Frontend (UI)

HTML5 / Vanilla JavaScript / CSS

Custom-built, professional user interface.

Project Directory

AI CHAT BOT PROJECT/
├── chatbot-backend/        <-- Node.js Server & Logic (My Core Backend Work)
│   ├── server.js           <-- The main file (includes all API and AI logic)
│   ├── db.js               
│   └── package.json        
└── chatbot-frontend/       <-- Frontend HTML & Assets (The UI Layer)
    ├── index.html          
    └── js/
        └── app.js          <-- UI interaction and API fetching


⚙️ How to Run This Project Locally

1. Prerequisites

You need a running MySQL server and a Gemini API Key.

2. Setup Database

Create the tables required for logging chat history and feedback:

-- Create the main database
CREATE DATABASE IF NOT EXISTS chatbot_db;
USE chatbot_db;

-- Table to store conversation turns
CREATE TABLE chats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to store user ratings (linked back to a chat ID)
CREATE TABLE feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    chat_id INT NULL,
    rating VARCHAR(10) NOT NULL, -- 'UPVOTE' or 'DOWNVOTE'
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


3. Clone and Configure

Clone Repo and Install:

git clone [https://github.com/Anmol1430/AI-CHAT-BOT-SYSTEM.git](https://github.com/Anmol1430/AI-CHAT-BOT-SYSTEM.git)
cd "AI CHAT BOT PROJECT"/chatbot-backend
npm install


Add API Key: Create a file named .env in the chatbot-backend directory:

GEMINI_API_KEY="[YOUR_GEMINI_API_KEY_HERE]"
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=chatbot_db


4. Launch!

Start the Server: (Run this command inside the chatbot-backend folder)

npm start


Open the App: Navigate to chatbot-frontend/index.html in your browser.

Developed by Anmol Sahu. [LinkedIn/Portfolio Link Here]
