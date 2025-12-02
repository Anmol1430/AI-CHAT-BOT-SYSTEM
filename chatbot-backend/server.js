// server.js

// 1. Load environment variables (including API key)
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
// --- MODULES FOR AI LOGIC ---
const { GoogleGenAI } = require('@google/genai');
// ------------------------------------------------------------------

const app = express();
const PORT = 3000;

// --- AI CONFIGURATION AND MEMORY (CONSOLIDATED) ---
// Explicitly retrieve the API key
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

// Initialize the AI client
const ai = new GoogleGenAI({ apiKey: API_KEY });
// Stores active chat sessions, keyed by userId
const activeChats = new Map();

// CRITICAL CONSTANTS FOR STABILITY
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 5000;
const MAX_OUTPUT_TOKENS = 400;

// --- FINAL CRITICAL SYSTEM INSTRUCTION (Stops technical formatting for general questions) ---
const SYSTEM_INSTRUCTION =
    "You are an extremely concise, professional assistant. For general, non-code questions (e.g., questions about history, science, impact), respond using **only** clean, standard markdown paragraphs and lists (e.g., bullet points or numbered lists). **STRICTLY** avoid generating JSON, Python list structures, or any complex, unnecessary formatting. ONLY use code blocks (```language ... ```) when the user explicitly asks for code.";
// ------------------------------------

/**
 * Retrieves an existing chat session for a user or creates a new one.
 */
function getOrCreateChatSession(userId) {
    let chat = activeChats.get(userId);

    if (!chat) {
        console.log(`[Chat] Creating new chat session for user ${userId}`);

        chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                systemInstruction: SYSTEM_INSTRUCTION, // Apply the definitive instruction
            },
        });
        activeChats.set(userId, chat);
    }

    return chat;
}
// ------------------------------------------------------------------


// --- Configuration ---
app.use(cors());
app.use(bodyParser.json());

// ------------------------------------------------------------------
// API 1: MAIN CHAT INTERACTION (POST /api/chat)
// ------------------------------------------------------------------
app.post('/api/chat', async (req, res) => {
    const { query, userId } = req.body;
    let chatbotResponse = "Sorry, I couldn't process your request due to an internal error.";
    const logUserId = userId || 1;

    if (!query) {
        return res.status(400).send({ response: "Query cannot be empty." });
    }

    // Get the chat session (including history)
    const chat = getOrCreateChatSession(logUserId);

    let attempt = 0;
    while (attempt < MAX_RETRIES) {
        try {
            // 1. Call the Gemini API using the chat session's sendMessage method
            const result = await chat.sendMessage({ message: query });

            chatbotResponse = result.text;

            // Success check: If we have a non-empty response, proceed and break the loop
            if (chatbotResponse && chatbotResponse.trim().length > 0) {

                // 2. Log the interaction to the 'chats' table in MySQL
                let newChatId = null;
                try {
                    const chatSql = 'INSERT INTO chats (user_id, query, response) VALUES (?, ?, ?)';
                    const [result] = await db.execute(chatSql, [logUserId, query, chatbotResponse]);

                    newChatId = result.insertId;

                    console.log(`Gemini response logged for user ${logUserId}. Chat ID: ${newChatId}`);
                } catch (dbError) {
                    console.error("Database logging failed:", dbError.message);
                }

                // 3. Send the final response back to the Frontend
                return res.status(200).send({
                    response: chatbotResponse,
                    chatId: newChatId // Send the ID back to the client
                });
            }

            // If the response is empty but no exception was thrown (transient issue)
            console.warn(`Attempt ${attempt + 1}: Received empty response from API. Retrying...`);

        } catch (error) {
            // Log the entire error object for detailed debugging
            console.error(`Gemini API Failure on attempt ${attempt + 1} - FULL DETAILS:`, error);

            // Handle hard errors (like a bad API key) and exit loop
            if (error.code === 400 || (error.message && error.message.includes('API key not valid'))) {
                chatbotResponse = "Error 400: Invalid API Key. Please check your .env file and ensure it is active.";
                return res.status(500).send({ response: chatbotResponse });
            }
        }

        // --- Exponential Backoff Delay ---
        attempt++;
        if (attempt < MAX_RETRIES) {
            // Wait time: 5s, 10s
            const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
            console.log(`Waiting for ${delay}ms before next retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // If the loop finishes without successfully getting a response after MAX_RETRIES
    chatbotResponse = "Error: The AI service failed to respond after multiple retries.";
    res.status(500).send({ response: chatbotResponse });
});

// ------------------------------------------------------------------
// API 7: RESET CHAT SESSION (POST /api/chat/reset)
// ------------------------------------------------------------------
app.post('/api/chat/reset', (req, res) => {
    const { userId } = req.body;
    const logUserId = userId || 1;

    // Delete the chat session from the server's memory Map
    if (activeChats.has(logUserId)) {
        activeChats.delete(logUserId);
        console.log(`[Chat] Deleted chat session for user ${logUserId}`);
        return res.status(200).send({ message: 'Session cleared.' });
    }

    // If it wasn't found, still send success
    return res.status(200).send({ message: 'No session found to clear.' });
});

// ------------------------------------------------------------------
// API 2: FEEDBACK SUBMISSION (POST /api/feedback/comment)
// ------------------------------------------------------------------
app.post('/api/feedback/comment', async (req, res) => {
    const { userId, rating, comment } = req.body;

    if (!userId || !rating) {
         return res.status(400).send({ message: 'User ID and rating are required.' });
    }

    try {
        const feedbackSql = 'INSERT INTO feedback (user_id, rating, comment) VALUES (?, ?, ?)';
        await db.execute(feedbackSql, [userId, rating, comment]);
        console.log(`Feedback comment logged: User ${userId}, Rating ${rating}`);
        res.status(200).send({ message: 'Feedback logged successfully.' });

    } catch (error) {
        console.error("Error logging feedback:", error.message);
        res.status(500).send({ message: 'Failed to log feedback to database.' });
    }
});

// ------------------------------------------------------------------
// API 4: RATING SUBMISSION (POST /api/feedback/rate)
// ------------------------------------------------------------------
app.post('/api/feedback/rate', async (req, res) => {
    const { userId, chatId, rating } = req.body;

    if (!userId || !chatId || !rating) {
         return res.status(400).send({ message: 'User ID, Chat ID, and rating are required.' });
    }

    try {
        const feedbackSql = 'INSERT INTO feedback (user_id, chat_id, rating) VALUES (?, ?, ?)';
        await db.execute(feedbackSql, [userId, chatId, rating]);
        console.log(`Rating logged: User ${userId}, Chat ID ${chatId}, Rating ${rating}`);
        res.status(200).send({ message: 'Rating logged successfully.' });

    } catch (error) {
        console.error("Error logging rating:", error.message);
        res.status(500).send({ message: 'Failed to log rating to database.' });
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Node.js Backend (Waiter) running on ${url}`);
    console.log("🔥 AI MODE: USING GEMINI 2.5 FLASH with OPTIMIZED STABILITY & CONCISENESS 🔥");
    console.log(`\nTo use the chat, manually open your index.html file in your browser.`);
});