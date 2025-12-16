// server.js (Final stable version with aggressive output cleanup on the backend and correct Session Management)

// 1. Load environment variables (using the modern import syntax)
import 'dotenv/config';

import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
// NOTE: You must ensure your local db.js file is also an ES Module
import db from './db.js';

// --- MODULES FOR AI LOGIC ---
import { GoogleGenAI } from '@google/genai';
// ------------------------------------------------------------------

const app = express();
const PORT = 3000;

// --- AI CONFIGURATION AND MEMORY (CONSOLIDATED) ---
const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const ai = new GoogleGenAI({ apiKey: API_KEY });
const activeChats = new Map();

// CRITICAL CONSTANTS FOR STABILITY
const MAX_RETRIES = 2;
const BASE_DELAY_MS = 5000;
const MAX_OUTPUT_TOKENS = 1024;

// --- DEFINITIVE SYSTEM INSTRUCTION (Forces clean response format) ---
const SYSTEM_INSTRUCTION =
"You are a professional technical assistant. When providing code, always wrap it in markdown code fences (```language ... ```). Do not include excessive introductory or concluding text.";
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
systemInstruction: SYSTEM_INSTRUCTION,
},
});
activeChats.set(userId, chat);
}

return chat;
}
// ------------------------------------------------------------------

/**
 * Aggressively cleans the AI response by extracting only the content from the first code block.
 * @param {string} rawResponse The raw text response from Gemini.
 * @returns {string} Cleaned code wrapped in markdown fences, or the original text if no code is found.
 */
function aggressivelyExtractCode(rawResponse) {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)\n```/;
    const match = rawResponse.match(codeBlockRegex);

    if (match && match[2]) {
        const lang = match[1] || 'plaintext';
        let codeContent = match[2];

        codeContent = codeContent.replace(/<(\/)?\w+>/g, '');
        codeContent = codeContent.replace(/\*(\w+)\*/g, '$1');

        return `\`\`\`${lang}\n${codeContent.trim()}\n\`\`\``;
    }

    return rawResponse;
}


// --- Configuration ---
// ULTIMATE FIX: This allows all origins (*), bypassing all cross-origin restrictions.
app.use(cors({ origin: '*' }));

app.use(bodyParser.json());

// ------------------------------------------------------------------
// API 1: MAIN CHAT INTERACTION (POST /api/chat)
// ------------------------------------------------------------------
app.post('/api/chat', async (req, res) => {
    // CRITICAL: Now accepting currentSessionId from frontend
    const { query, userId, image_data, mime_type, currentSessionId } = req.body;
    let chatbotResponse = "Sorry, I couldn't process your request due to an internal error.";
    const logUserId = userId || 1;

    if (!query && !image_data) {
        return res.status(400).send({ response: "Query or attachment required." });
    }

    let contents = [{ text: query || "Describe this attached file." }];
    if (image_data && mime_type) {
        contents.push({
            inlineData: {
                data: image_data,
                mimeType: mime_type,
            }
        });
    }

    const chat = getOrCreateChatSession(logUserId);

    let attempt = 0;
    while (attempt < MAX_RETRIES) {
        try {
            const result = await chat.sendMessage({ message: contents });

            chatbotResponse = aggressivelyExtractCode(result.text);

            if (chatbotResponse && chatbotResponse.trim().length > 0) {
                let finalChatId = currentSessionId || null;

                try {
                    // 1. Insert the query message first (this is the user's turn)
                    const querySql = 'INSERT INTO chats (user_id, chat_id, query, response) VALUES (?, ?, ?, ?)';
                    const [queryResult] = await db.execute(querySql, [logUserId, finalChatId, query || '[File Attached]', '']);

                    // 2. If this is a new chat, the inserted ID becomes the chat_id for the entire session.
                    if (!finalChatId) {
                        finalChatId = queryResult.insertId;
                        // Update the newly inserted row with its own ID as the chat_id
                        const updateSql = 'UPDATE chats SET chat_id = ? WHERE id = ?';
                        await db.execute(updateSql, [finalChatId, finalChatId]);
                    }

                    // 3. Now insert the AI's response turn, using the determined chat_id.
                    const responseSql = 'INSERT INTO chats (user_id, chat_id, query, response) VALUES (?, ?, ?, ?)';
                    await db.execute(responseSql, [logUserId, finalChatId, '', result.text]); // Empty query for AI response turn

                    console.log(`Gemini response logged for user ${logUserId}. Session ID: ${finalChatId}`);

                } catch (dbError) {
                    console.error("Database logging failed:", dbError.message);
                }

                // Send the session ID back to the frontend
                return res.status(200).send({
                    response: chatbotResponse,
                    chatId: finalChatId // Send the session ID back
                });
            }

            console.warn(`Attempt ${attempt + 1}: Received empty response from API. Retrying...`);

        } catch (error) {
            console.error(`Gemini API Failure on attempt ${attempt + 1} - FULL DETAILS:`, error);

            if (error.code === 400 || (error.message && error.message.includes('API key not valid'))) {
                chatbotResponse = "Error 400: Invalid API Key. Please check your .env file and ensure it is active.";
                return res.status(500).send({ response: chatbotResponse });
            }
        }

        attempt++;
        if (attempt < MAX_RETRIES) {
            const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
            console.log(`Waiting for ${delay}ms before next retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    chatbotResponse = "Error: The AI service failed to respond after multiple retries.";
    res.status(500).send({ response: chatbotResponse });
});

// ------------------------------------------------------------------
// API 8: GET CHAT HISTORY SESSIONS (GET /api/history)
// ------------------------------------------------------------------
app.get('/api/history', async (req, res) => {
    const userId = req.query.userId || 1;

    try {
        // Find the first query (where response is empty or null) for each chat_id, grouped by the lowest ID for the session.
        const historySql = `
            SELECT
                t1.chat_id,
                t1.query,
                t1.timestamp
            FROM chats t1
            INNER JOIN (
                SELECT chat_id, MIN(id) AS min_id
                FROM chats
                WHERE user_id = ?
                GROUP BY chat_id
            ) AS t2 ON t1.id = t2.min_id
            ORDER BY t1.id DESC
        `;
        const [sessions] = await db.execute(historySql, [userId]);

        console.log(`Fetched ${sessions.length} chat sessions for user ${userId}.`);
        res.status(200).send(sessions);

    } catch (error) {
        console.error("Error fetching chat history sessions:", error.message);
        res.status(500).send({ message: 'Failed to fetch chat history.' });
    }
});


// ------------------------------------------------------------------
// API 9: GET MESSAGES FOR A SPECIFIC CHAT (GET /api/history/:chatId)
// ------------------------------------------------------------------
app.get('/api/history/:chatId', async (req, res) => {
    const chatId = req.params.chatId;

    try {
        // Fetch all messages for the given chat_id, ordered by id (which acts as turn order)
        // We fetch both query and response to reconstruct the conversation turns.
        const messagesSql = 'SELECT query, response, timestamp FROM chats WHERE chat_id = ? ORDER BY id ASC';
        const [messages] = await db.execute(messagesSql, [chatId]);

        // Transform the raw rows into a clean turn-based structure for the frontend
        const turns = [];
        for (let i = 0; i < messages.length; i += 2) {
             // Assuming user turn (query) is always followed by AI turn (response)
             const userTurn = messages[i];
             const aiTurn = messages[i + 1] || { query: '', response: 'Error: AI response missing.' };

             // Add the user's turn
             if (userTurn.query) {
                 turns.push({ sender: 'user', text: userTurn.query, timestamp: userTurn.timestamp });
             }

             // Add the AI's turn
             if (aiTurn.response) {
                 turns.push({ sender: 'ai', text: aiTurn.response, timestamp: aiTurn.timestamp });
             }
        }


        console.log(`Fetched ${turns.length} messages for Chat ID: ${chatId}.`);
        res.status(200).send(turns);

    } catch (error) {
        console.error(`Error fetching messages for Chat ID ${chatId}:`, error.message);
        res.status(500).send({ message: 'Failed to fetch chat messages.' });
    }
});


// ------------------------------------------------------------------
// API 7: RESET CHAT SESSION (POST /api/chat/reset)
// ------------------------------------------------------------------
app.post('/api/chat/reset', (req, res) => {
    const { userId } = req.body;
    const logUserId = userId || 1;

    if (activeChats.has(logUserId)) {
        activeChats.delete(logUserId);
        console.log(`[Chat] Deleted chat session for user ${logUserId}`);
        return res.status(200).send({ message: 'Session cleared.' });
    }

    return res.status(200).send({ message: 'No session found to clear.' });
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