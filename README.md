🤖🚀 REAL-TIME AI CHATBOT SYSTEM

A Full-Stack Intelligent Chat Application with Modern UI, Stable API Handling & Live Feedback Logging

✨ Overview

Welcome to the Real-Time AI Chatbot System, my Capstone Project designed to replicate the smooth, stable, and professional experience of tools like ChatGPT. This system features a modern UI, robust backend stability, and continuous state management — all integrated with the powerful Gemini 2.5 Flash API.

The project focuses on creating a fast, reliable, and context-aware AI experience capable of technical tasks such as code generation, debugging, and structured responses.

🎯 PROJECT FEATURES
💬 SMART AI CHAT SYSTEM

📚 Full conversation context retention (in-memory session manager)

⚡ Real-time responses via Gemini 2.5 Flash

🎯 Clean, concise AI output (enforced via system prompt)

🧱 STABILITY & PERFORMANCE

🔁 Exponential Backoff Retry System to handle API rate limits

🧠 Crash-proof architecture for long technical responses

🌐 Optimized API communication layer for maximum reliability

🖥️ FRONTEND UI/UX

🖤 Full-screen Dark Mode

🧭 Static sidebar layout (ChatGPT-like design)

📱 Responsive layout for all screen sizes

🎨 Clean typography and professional layout

📊 FEEDBACK & DATA LOGGING

👍⬆️ User Upvote / Downvote system

🗄️ Feedback stored in MySQL

📝 Complete chat history logged server-side

🛠️ TECH STACK
💻 Programming & Server

Node.js (Express.js) → Backend API core & stability layer

Google Gemini 2.5 Flash → Conversational AI Engine

🗄️ Database

MySQL → Chat logs + User feedback storage

🎨 Frontend

HTML5

CSS (custom styles)

Vanilla JavaScript

📦 PROJECT STRUCTURE
AI CHAT BOT PROJECT/
├── chatbot-backend/              ← Node.js Server & AI Logic
│   ├── server.js                 ← Main backend file
│   ├── db.js                     ← Database connection
│   └── package.json
│
└── chatbot-frontend/             ← Custom Built UI
    ├── index.html                ← Main UI Page
    └── js/
        └── app.js               ← Handles UI events + API calls

🗄️ DATABASE SCHEMA
🗂️ chats

| id | user_id | query | response | created_at |

🗂️ feedback

| id | user_id | chat_id | rating | comment | created_at |

🚀 HOW TO RUN THE PROJECT LOCALLY
1️⃣ Prerequisites

MySQL Server Installed

Gemini API Key

2️⃣ Create the Database
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

-- Table to store user ratings
CREATE TABLE feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  chat_id INT NULL,
  rating VARCHAR(10) NOT NULL, -- 'UPVOTE' or 'DOWNVOTE'
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

3️⃣ Clone Repository & Install Backend
git clone https://github.com/Anmol1430/AI-CHAT-BOT-SYSTEM.git

cd "AI CHAT BOT PROJECT"/chatbot-backend
npm install

4️⃣ Add Environment Variables

Create a .env file inside chatbot-backend:

GEMINI_API_KEY="[YOUR_GEMINI_API_KEY_HERE]"
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=chatbot_db

5️⃣ Start the Backend Server
npm start

