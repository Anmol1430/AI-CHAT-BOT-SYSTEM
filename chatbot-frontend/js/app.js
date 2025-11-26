// js/app.js

// --- CONFIGURATION ---
const BACKEND_URL = 'http://localhost:3000/api/chat';
const FEEDBACK_URL = 'http://localhost:3000/api/feedback/rate';
const RESET_URL = 'http://localhost:3000/api/chat/reset';
// -----------------------------

// --- DOM ELEMENTS ---
const welcomeContainer = document.getElementById('welcome-container');
const chatContainer = document.getElementById('chat-container');
const chatMessages = document.getElementById('chat-messages');
const inputForm = document.getElementById('input-form');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// --- Global Variables for Chat History and Feedback ---
let lastChatId = null;
const CURRENT_USER_ID = 1;
// ----------------------------------------------------


// --- NEW: Function to transition from Welcome Screen to Chat ---
function startChatInterface() {
    welcomeContainer.style.display = 'none';
    chatContainer.style.display = 'block';

    // Inject the initial AI greeting into the chat history (Only on first load/reset)
    if (chatMessages.children.length === 0) {
        addMessage("Hello! I am your AI support bot. How can I help you today?", 'ai', null, true);
    }
}
// --------------------------------------------------------------


// Function to add a message (The core display logic)
function addMessage(text, sender, chatId = null, isInitialGreeting = false) {

    // CRITICAL FIX: If chat is hidden, start the interface before adding the user message
    if (!isInitialGreeting && sender === 'user') {
        if (chatContainer.style.display === 'none') {
            startChatInterface();
        }
    }

    // 1. Create the outer wrapper (row container)
    const wrapperDiv = document.createElement('div');
    wrapperDiv.classList.add('message-wrapper', sender === 'user' ? 'user-message-wrapper' : 'ai-message-wrapper');

    // 2. Add the avatar icon
    const avatar = document.createElement('div');
    avatar.classList.add('avatar', sender === 'user' ? 'user-avatar' : 'ai-avatar');
    avatar.textContent = sender === 'user' ? 'U' : 'AI';

    // 3. Create the actual message bubble/content area
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'ai-message');

    // Render content
    if (sender === 'ai' || isInitialGreeting) {
        const htmlContent = marked.parse(text);
        messageDiv.innerHTML = htmlContent;
    } else {
        messageDiv.textContent = text;
    }

    // 4. Assemble the components
    wrapperDiv.appendChild(avatar);
    wrapperDiv.appendChild(messageDiv);

    // Reverse order for user messages (Text first, Avatar second)
    if (sender === 'user') {
        wrapperDiv.innerHTML = ''; // Clear temporary append
        wrapperDiv.appendChild(messageDiv);
        wrapperDiv.appendChild(avatar);
    }

    chatMessages.appendChild(wrapperDiv);


    // --- Add feedback buttons after AI message ---
    if (sender === 'ai' && chatId !== null && !isInitialGreeting) {
        lastChatId = chatId;

        const feedbackContainer = document.createElement('div');
        feedbackContainer.classList.add('feedback-controls');
        feedbackContainer.innerHTML = `
            <button class="feedback-button" data-rating="UPVOTE">👍</button>
            <button class="feedback-button" data-rating="DOWNVOTE">👎</button>
        `;
        wrapperDiv.appendChild(feedbackContainer);

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
                        btn.style.display = 'none';
                    }
                });
            });
        });
    }
    // ------------------------------------------------------------------

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Function to send feedback to the server (remains the same)
async function submitFeedback(rating) {
    if (!lastChatId) {
        console.error("Cannot submit feedback: No lastChatId available.");
        return;
    }
    // ... (rest of submitFeedback logic) ...
    try {
        const response = await fetch(FEEDBACK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: CURRENT_USER_ID,
                chatId: lastChatId,
                rating: rating
            }),
        });

        if (response.ok) {
            console.log(`Feedback submitted successfully for Chat ID: ${lastChatId}`);
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
    // Hide chat and show welcome screen
    chatContainer.style.display = 'none';

    welcomeContainer.style.display = 'flex'; // Show welcome screen
    chatMessages.innerHTML = ''; // Clear actual messages

    lastChatId = null;

    try {
        const response = await fetch(RESET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: CURRENT_USER_ID }),
        });

        if (response.ok) {
            console.log(`Chat session reset successfully for User ${CURRENT_USER_ID}`);
        } else {
            console.error('Failed to reset chat session on server.');
        }

    } catch (error) {
        console.error('Network error during chat reset:', error);
    }
}
// -------------------------------------------------------------------


// Handle form submission (Main application logic)
inputForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = userInput.value.trim();
    if (!message) return;

    // --- CRITICAL FIX START: Transition and Display User Message ---
    // 1. Ensure the interface is always started BEFORE adding the message
    if (chatContainer.style.display === 'none') {
        startChatInterface();
    }
    // 2. Display user message immediately AFTER the interface is prepared
    addMessage(message, 'user');
    // --- CRITICAL FIX END ---

    // 3. Clear input and disable button
    userInput.value = '';
    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: message, userId: CURRENT_USER_ID }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP error! Status: ${response.status}. Server Message: ${errorData.response || 'See server logs'}`);
        }

        const data = await response.json();

        if (data && data.response && data.chatId) {
            addMessage(data.response, 'ai', data.chatId);
        } else {
            displayError('Error: Received an invalid or empty response from the AI service.');
        }

    } catch (error) {
        console.error('Fetch error:', error);
        displayError('Error: Could not communicate with the AI service. Details: ' + error.message);
    } finally {
        // Reset the button state
        sendButton.disabled = false;
        sendButton.textContent = 'Send';
    }
});


// --- EVENT LISTENERS: Activate the Reset Button ---
const sidebarNewChatButton = document.getElementById('sidebar-new-chat');
if (sidebarNewChatButton) {
    sidebarNewChatButton.addEventListener('click', resetChatSession);
}