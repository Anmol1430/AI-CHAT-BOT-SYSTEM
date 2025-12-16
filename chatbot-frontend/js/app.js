// js/app.js - FINAL STABLE VERSION (Correct History Load)

// --- CONFIGURATION ---
const SERVER_ROOT_URL = 'http://localhost:3000';
const BACKEND_CHAT_URL = `${SERVER_ROOT_URL}/api/chat`;
const FEEDBACK_URL = `${SERVER_ROOT_URL}/api/feedback/rate`;
const RESET_URL = `${SERVER_ROOT_URL}/api/chat/reset`;
const HISTORY_SESSIONS_URL = `${SERVER_ROOT_URL}/api/history`;
const HISTORY_MESSAGES_BASE_URL = `${SERVER_ROOT_URL}/api/history`;
// -----------------------------

// --- DOM ELEMENTS ---
const welcomeContainer = document.getElementById('welcome-container');
const chatContainer = document.getElementById('chat-container');
const chatMessages = document.getElementById('chat-messages');
const inputForm = document.getElementById('input-form');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const sidebarNewChatButton = document.getElementById('sidebar-new-chat');
const sidebarContent = document.getElementById('sidebar');

// New Input Tools Elements
const attachButton = document.getElementById('attach-button');
const fileInput = document.getElementById('file-input');

// --- Global Variables ---
let currentChatId = null; // Renamed from lastChatId for clarity
const CURRENT_USER_ID = 1;

/**
 * Function to automatically resize the textarea based on content.
 */
function autoResizeTextarea() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';
    userInput.style.overflowY = userInput.scrollHeight > 200 ? 'auto' : 'hidden';
}
// ----------------------------------------------------


// --- Copy Code Logic ---
const COPY_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';


function copyCodeToClipboard(button, codeElement) {
    const codeContent = codeElement.innerText;

    const textarea = document.createElement('textarea');
    textarea.value = codeContent;
    document.body.appendChild(textarea);

    textarea.select();
    let success = false;
    try {
        success = document.execCommand('copy');
    } catch (err) {
        console.error('Failed to copy text:', err);
    }

    document.body.removeChild(textarea);

    if (success) {
        const originalText = button.innerHTML;
        button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'; // Checkmark icon
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    }
}

function attachCopyButtons() {
    const codeBlocks = chatMessages.querySelectorAll('pre:not([data-copy-attached])');

    codeBlocks.forEach(pre => {
        const buttonBar = document.createElement('div');
        buttonBar.classList.add('copy-button-container');

        const button = document.createElement('button');
        button.classList.add('copy-button');
        button.innerHTML = COPY_ICON_SVG;

        button.addEventListener('click', () => {
            const codeElement = pre.querySelector('code');
            if (codeElement) {
                copyCodeToClipboard(button, codeElement);
            }
        });

        buttonBar.appendChild(button);
        pre.prepend(buttonBar);

        pre.setAttribute('data-copy-attached', 'true');
    });
}
// -----------------------------


// --- UI Transition Logic ---
function startChatInterface() {
    welcomeContainer.style.display = 'none';
    chatContainer.style.display = 'flex';
}
// -----------------------------


// --- File Attachment Logic ---
let attachedFile = null;

function displayAttachedFile(file) {
    userInput.placeholder = file ? `Ask about your file: ${file.name}` : "Type your message...";
    console.log(`File Attached: ${file ? file.name : 'None'}`);
    autoResizeTextarea();
}

if (attachButton && fileInput) {
    attachButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            attachedFile = file;
            displayAttachedFile(file);
        } else {
            attachedFile = null;
            displayAttachedFile(null);
        }
    });
} else {
    console.warn("Attachment buttons not found. File attachment features are disabled.");
}
// -----------------------------

// --- History Logic ---

function renderChatSessions(sessions) {
    let historyContainer = document.querySelector('#sidebar');

    // Clear all dynamically generated sidebar content (keeping the New Chat button)
    let removableItems = historyContainer.querySelectorAll('.sidebar-item, .sidebar-header');
    removableItems.forEach(item => item.remove());

    // Create and insert the dynamic header
    const header = document.createElement('div');
    header.classList.add('sidebar-header');
    header.textContent = 'Recent Chats';
    historyContainer.appendChild(header);

    sessions.forEach(session => {
        const item = document.createElement('div');
        item.classList.add('sidebar-item');
        item.textContent = session.query.substring(0, 30) + (session.query.length > 30 ? '...' : '');
        item.dataset.chatId = session.chat_id;

        if (session.chat_id == currentChatId) {
             item.classList.add('active');
        }

        item.addEventListener('click', () => {
            if (item.dataset.chatId != currentChatId) {
                loadChatHistory(item.dataset.chatId);
            }
        });
        historyContainer.appendChild(item);
    });
}


async function fetchChatSessions() {
    try {
        const response = await fetch(`${HISTORY_SESSIONS_URL}?userId=${CURRENT_USER_ID}`);
        if (!response.ok) throw new Error('Failed to fetch chat history');

        const sessions = await response.json();
        renderChatSessions(sessions);

    } catch (error) {
        console.error('Error fetching chat sessions:', error);
    }
}

async function loadChatHistory(chatId) {
    try {
        const response = await fetch(`${HISTORY_MESSAGES_BASE_URL}/${chatId}`);
        if (!response.ok) throw new Error('Failed to fetch chat messages');

        // The backend returns an array of {sender: 'user', text: 'query'} turns
        const turns = await response.json();

        chatMessages.innerHTML = '';
        currentChatId = chatId;
        startChatInterface();

        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.chatId == chatId) {
                item.classList.add('active');
            }
        });

        // Populate messages using the pre-processed 'turns' array
        turns.forEach(turn => {
            // CRITICAL FIX: Use the 'sender' and 'text' fields directly from the turn object
            addMessage(turn.text, turn.sender, null, true); // true for isHistoryLoad
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;

    } catch (error) {
        console.error('Error loading chat history:', error);
        displayError(`Failed to load conversation history for Chat ID ${chatId}.`);
    }
}


// Function to add a message (The core display logic)
function addMessage(text, sender, chatId = null, isHistoryLoad = false) {
    if (sender === 'user' && chatMessages.children.length === 0) {
        startChatInterface();
    }

    const wrapperDiv = document.createElement('div');
    wrapperDiv.classList.add('message-wrapper', sender === 'user' ? 'user-message-wrapper' : 'ai-message-wrapper');

    const avatar = document.createElement('div');
    avatar.classList.add('avatar', sender === 'user' ? 'user-avatar' : 'ai-avatar');
    avatar.textContent = sender === 'user' ? 'U' : 'AI';

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');

    // Create inner content holder for markdown/HTML
    const contentHolder = document.createElement('div');
    contentHolder.classList.add('message-content-holder');

    if (sender === 'ai') {
        // ULTIMATE CLEANUP: This is the aggressive cleaning of model output
        let cleanText = text;

        cleanText = cleanText.replace(/<(\/)?\w+>/g, '');
        cleanText = cleanText.replace(/\*(\w+)\*/g, '$1');
        cleanText = cleanText.replace(/\*\*(.*?)\*\*/g, '$1');

        const excessiveText = [
            /Here is the Java code:/i, /Here is a Java program/i, /Here is the code/i,
            /Here's the Java code:/i, /Here is the Java code to calculate/i,
        ];

        for (const phrase of excessiveText) {
             cleanText = cleanText.replace(phrase, '').trim();
        }

        const htmlContent = marked.parse(cleanText);
        contentHolder.innerHTML = htmlContent;
        messageDiv.appendChild(contentHolder);
    } else {
        contentHolder.textContent = text;
        messageDiv.appendChild(contentHolder);
    }

    wrapperDiv.appendChild(avatar);
    wrapperDiv.appendChild(messageDiv);

    if (sender === 'user') {
        wrapperDiv.innerHTML = '';
        wrapperDiv.appendChild(messageDiv);
        wrapperDiv.appendChild(avatar);
    }

    chatMessages.appendChild(wrapperDiv);

    // --- Add feedback buttons after AI message ---
    if (sender === 'ai' && chatId !== null && !isHistoryLoad) {
        currentChatId = chatId;

        const feedbackContainer = document.createElement('div');
        feedbackContainer.classList.add('feedback-controls');
        feedbackContainer.innerHTML = `
            <button class="feedback-button" data-rating="UPVOTE">👍</button>
            <button class="feedback-button" data-rating="DOWNVOTE">👎</button>
        `;

        messageDiv.appendChild(feedbackContainer);

        feedbackContainer.querySelectorAll('.feedback-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const rating = e.target.getAttribute('data-rating');
                submitFeedback(rating);

                const allButtons = feedbackContainer.querySelectorAll('.feedback-button');

                allButtons.forEach(btn => {
                    btn.disabled = true;

                    if (btn === e.target) {
                        btn.classList.add('feedback-selected');
                    } else {
                        btn.style.opacity = '0.5';
                    }
                });
            });
        });

        attachCopyButtons();
    }
    // ------------------------------------------------------------------

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to send feedback to the server (remains the same)
async function submitFeedback(rating) {
    if (!currentChatId) {
        console.error("Cannot submit feedback: No currentChatId available.");
        return;
    }

    try {
        const response = await fetch(FEEDBACK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: CURRENT_USER_ID,
                chatId: currentChatId,
                rating: rating
            }),
        });

        if (response.ok) {
            console.log(`Feedback submitted successfully for Chat ID: ${currentChatId}`);
        } else {
            console.error('Failed to submit feedback. Server status:', response.status);
        }
    } catch (error) {
        console.error('Network error submitting feedback:', error);
    }
}


// Function to display an error message (remains the same)
function displayError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('error-message');
    errorDiv.textContent = message;
    chatMessages.appendChild(errorDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// --- FUNCTION: Handles calling the server to reset the memory ---
async function resetChatSession() {
    chatMessages.innerHTML = '';
    chatContainer.style.display = 'none';
    welcomeContainer.style.display = 'flex';

    attachedFile = null;
    displayAttachedFile(null);
    if (fileInput) fileInput.value = '';

    currentChatId = null;
    fetchChatSessions();

    try {
        await fetch(RESET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: CURRENT_USER_ID }),
        });
        console.log('Backend chat session successfully reset.');
    } catch (error) {
        console.error('Failed to reset backend chat session:', error);
    }
}
// -------------------------------------------------------------------

/**
 * Executes the form submission logic.
 * @param {Event} e
 */
const executeFormSubmission = async (e) => {
    e.preventDefault();
    const message = userInput.value.trim();

    if (!message && !attachedFile) return;

    const queryToSend = message;

    addMessage(queryToSend, 'user');

    userInput.value = '';
    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';

    userInput.style.height = 'auto';

    let fileToSend = attachedFile;
    attachedFile = null;
    if (fileInput) fileInput.value = '';
    displayAttachedFile(null);


    const aiPlaceholder = document.createElement('div');
    aiPlaceholder.classList.add('message-wrapper', 'ai-message-wrapper', 'placeholder-typing');
    aiPlaceholder.innerHTML = `<div class="avatar ai-avatar">AI</div><div class="message ai-message">Typing...</div>`;
    chatMessages.appendChild(aiPlaceholder);
    chatMessages.scrollTop = chatMessages.scrollHeight;


    try {
        let payload = { query: queryToSend, userId: CURRENT_USER_ID, currentSessionId: currentChatId };

        if (fileToSend) {
            const reader = new FileReader();

            const fileData = await new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(fileToSend);
            });
            const [mimeType, base64Data] = fileData.split(';base64,');

            payload.image_data = base64Data;
            payload.mime_type = mimeType.replace('data:', '');
        }

        const response = await fetch(BACKEND_CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (chatMessages.contains(aiPlaceholder)) {
             chatMessages.removeChild(aiPlaceholder);
        }

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Response Error:', errorData);
            throw new Error(`HTTP error! Status: ${response.status}. Server Message: ${errorData.response || 'See server logs'}`);
        }

        const data = await response.json();

        if (data && data.response && data.chatId) {
            addMessage(data.response, 'ai', data.chatId, false);
            fetchChatSessions();
        } else {
            displayError('Error: Received an invalid or empty response from the AI service.');
        }

    } catch (error) {
        if (chatMessages.contains(aiPlaceholder)) {
             chatMessages.removeChild(aiPlaceholder);
        }
        console.error('Fetch error: Could not connect to backend.', error);
        displayError('Error: Could not communicate with the AI service. Details: ' + error.message);
    } finally {
        sendButton.disabled = false;
        sendButton.textContent = 'Send';
        userInput.focus();
    }
};


// Handle form submission (Main application logic)
inputForm.addEventListener('submit', executeFormSubmission);

// --- CRITICAL FIX: Handle Enter Key for submission on textarea ---
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        executeFormSubmission(e);
    }
});
// -----------------------------------------------------------------

// --- EVENT LISTENERS: Activate Features ---

// 1. Attach the resize event for the textarea
userInput.addEventListener('input', autoResizeTextarea);


// 2. Activate the New Chat (Reset) Button
if (sidebarNewChatButton) {
    sidebarNewChatButton.addEventListener('click', resetChatSession);
}

// 3. Initialize the interface on load
document.addEventListener('DOMContentLoaded', () => {
    // NOTE: Dummy sidebar content is removed in renderChatSessions,
    // but ensure your index.html has a parent container for the sidebar items.

    chatContainer.style.display = 'none';
    welcomeContainer.style.display = 'flex';
    autoResizeTextarea();
    fetchChatSessions(); // Load chat history on startup
});