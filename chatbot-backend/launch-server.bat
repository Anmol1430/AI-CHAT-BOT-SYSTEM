@echo off
echo Starting AI Chat Bot Backend...

:: Navigate to the backend folder robustly
cd /d "chatbot-backend"

:: Execute npm start (which runs node server.js)
npm start

pause