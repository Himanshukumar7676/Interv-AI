
// --- DOM Elements ---
const setupSection = document.getElementById('setup-section');
const assistantSection = document.getElementById('interview-assistant-section');
const jobRoleInput = document.getElementById('job-role-input');
const startInterviewBtn = document.getElementById('start-interview-btn');
const listenBtn = document.getElementById('listen-btn');
const listenBtnText = document.getElementById('listen-btn-text');
const statusText = document.getElementById('status-text');
const loaderContainer = document.getElementById('loader-container');
const resultContainer = document.getElementById('result-container');
const transcribedQuestionText = document.getElementById('transcribed-question-text');
const generatedAnswerText = document.getElementById('generated-answer-text');
const endInterviewBtn = document.getElementById('end-interview-btn');

// --- State ---
let jobRole = '';
let isListening = false;
let recognition;

// --- Speech Recognition Setup ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    // Changed to true to give real-time feedback as the user speaks.
    recognition.interimResults = true; 
} else {
    // Using a custom modal/alert might be better than alert() in a real app
    // but for simplicity, we'll keep alert() here.
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '20px';
    modal.style.left = '50%';
    modal.style.transform = 'translateX(-50%)';
    modal.style.backgroundColor = '#ef4444';
    modal.style.color = 'white';
    modal.style.padding = '1rem';
    modal.style.borderRadius = '0.5rem';
    modal.style.zIndex = '1000';
    modal.textContent = "Sorry, your browser doesn't support Speech Recognition. Please try Chrome or Edge.";
    document.body.appendChild(modal);
    setTimeout(() => modal.remove(), 5000);
}


// --- Gemini API Configuration ---
const API_KEY = ""; // Leave empty - CRITICAL SECURITY FIX: Never expose API keys in client-side code.
// Switched to a more powerful model for better answer quality and accuracy.
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-preview-0514:generateContent?key=${API_KEY}`;

// --- API Call Function ---
async function callGemini(systemPrompt, userPrompt, retries = 5, delay = 1000) {
    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                return result.candidates[0].content.parts[0].text;
            } else {
                 // Added more specific error logging for debugging
                console.error("API Error: Invalid response structure.", result);
                // Check for blocked content
                if (result.candidates?.[0]?.finishReason === 'SAFETY') {
                    return "The generated response was blocked for safety reasons. Please try rephrasing the question.";
                }
                throw new Error("Invalid API response structure.");
            }
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i < retries - 1) {
                await new Promise(res => setTimeout(res, delay * Math.pow(2, i)));
            } else {
                return "Sorry man.";
            }
        }
    }
}

// --- Core Logic ---
async function getAIAnswer(question) {
    loaderContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    
    // Improved prompt to handle potential speech recognition errors.
    const systemPrompt = `You are an expert career coach acting as a real-time interview assistant. The user is in a live interview for a "${jobRole}" position. They will provide a spoken question transcribed by software, which may contain errors. Please interpret the user's likely intent from the transcript and generate a concise, professional, and well-structured answer. Use the STAR method (Situation, Task, Action, Result) where appropriate. The answer should be ready for the user to adapt and say aloud. Do not add any introductory or concluding conversational text. Just provide the answer.`;
    const userAnswer = await callGemini(systemPrompt, question);

    let formattedAnswer = userAnswer
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    generatedAnswerText.innerHTML = formattedAnswer;
    loaderContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');
}

function toggleListen() {
    if (!recognition) return;
    isListening ? stopListening() : startListening();
}

function startListening() {
    isListening = true;
    // Clear previous results before starting a new session
    resultContainer.classList.add('hidden');
    transcribedQuestionText.textContent = '';
    generatedAnswerText.innerHTML = '';
    recognition.start();
    listenBtn.classList.add('listening');
    listenBtnText.textContent = 'Stop Listening';
    statusText.textContent = 'Listening...';
}

function stopListening() {
    isListening = false;
    recognition.stop();
    listenBtn.classList.remove('listening');
    listenBtnText.textContent = 'Listen for Question';
    statusText.textContent = 'Click the button and I\'ll listen for the question.';
}

// --- Event Handlers ---
if (recognition) {
    // This event now handles both interim and final results
    recognition.onresult = (event) => {
        let interim_transcript = '';
        let final_transcript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                final_transcript += event.results[i][0].transcript;
            } else {
                interim_transcript += event.results[i][0].transcript;
            }
        }

        // Show interim results in real-time to the user
        transcribedQuestionText.textContent = interim_transcript || final_transcript;

        // Once we have the final, corrected transcript, send it to the AI
        if (final_transcript) {
            transcribedQuestionText.textContent = final_transcript;
            statusText.textContent = `Heard you! Generating answer...`;
            getAIAnswer(final_transcript);
            stopListening(); // Stop listening once a final result is processed
        }
    };

    recognition.onend = () => {
        // Only change state if it was actively listening.
        // This prevents unintended state changes.
        if (isListening) { 
            stopListening();
        }
    };

    // Improved error handling for more specific feedback
    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        let errorMessage = `Error: ${event.error}. Please try again.`;
        if (event.error === 'not-allowed') {
            errorMessage = "Microphone access denied. Please allow microphone permissions in your browser settings.";
        } else if (event.error === 'network') {
            errorMessage = "Network error. Please check your internet connection.";
        }
        statusText.textContent = errorMessage;
        stopListening();
    };
}

listenBtn.addEventListener('click', toggleListen);

startInterviewBtn.addEventListener('click', () => {
    jobRole = jobRoleInput.value.trim();
    if (!jobRole) {
        // Simple validation feedback
        jobRoleInput.style.borderColor = '#ef4444';
        setTimeout(() => {
            jobRoleInput.style.borderColor = '';
        }, 2000);
        return;
    }
    jobRoleInput.style.borderColor = '';
    setupSection.classList.add('hidden');
    assistantSection.classList.remove('hidden');
    statusText.textContent = 'Click the button and I\'ll listen for the question.';
});

endInterviewBtn.addEventListener('click', () => {
    if (isListening) stopListening();
    setupSection.classList.remove('hidden');
    assistantSection.classList.add('hidden');
    jobRoleInput.value = '';
    resultContainer.classList.add('hidden');
    transcribedQuestionText.textContent = '';
    generatedAnswerText.innerHTML = '';
});


