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

// --- Built-in Answer Library (No API Needed) ---
const questionBank = [
    {
        keywords: ["yourself", "tell", "about", "me", "introduce"],
        question: "Tell me about yourself.",
        answer: "Certainly. I've been working in [Your Field/Industry] for about [Number] years, focusing primarily on [Specific Skill 1] and [Specific Skill 2]. In my most recent position at [Previous Company], I was responsible for [Key Responsibility], where a notable achievement was [Describe a specific accomplishment using the STAR method]. I successfully increased efficiency by 20% by implementing a new software suite.\n\nI was excited to see the opening for a {jobRole} here because my experience in [Mention a skill from the job description] aligns perfectly with what you're looking for, and I'm very interested in [Company's Mission or a recent project]."
    },
    {
        keywords: ["strength", "greatest", "what", "is", "your"],
        question: "What is your greatest strength?",
        answer: "I would say my greatest strength is my [Your Strength, e.g., adaptability]. In my last role as a {jobRole}, the project scope changed suddenly, requiring a quick pivot in our strategy. \n\n**Situation:** We were two weeks from a deadline when the client requested a major feature change.\n**Task:** I was tasked with assessing the feasibility of the new request and updating our project plan without pushing the deadline.\n**Action:** I quickly organized a meeting with the development team to map out the new requirements and re-prioritized our task list. I then communicated a clear, revised plan to both the client and our internal team.\n**Result:** We successfully integrated the new feature and delivered the project on time, which the client greatly appreciated. I find that I perform well in dynamic environments where I can put my problem-solving skills to the test."
    },
    {
        keywords: ["weakness", "greatest", "what", "is", "your"],
        question: "What is your greatest weakness?",
        answer: "Something I've actively worked on is my tendency to be overly critical of my own work. While it stems from a desire to produce high-quality results, I've learned it can sometimes lead to spending too much time on minor details. \n\nTo improve, I've adopted the practice of setting clearer priorities and deadlines for each phase of a project. This helps me focus my energy on what's most important and trust in the process. It has made me more efficient and has improved my ability to move projects forward with confidence."
    },
    {
        keywords: ["why", "should", "we", "hire", "you"],
        question: "Why should we hire you?",
        answer: "From my research and the job description, it's clear you're looking for a {jobRole} who is not only proficient in [Skill 1 from Job Description] but also brings [Quality, e.g., a collaborative spirit]. I believe I'm a strong candidate for a few reasons:\n\nFirst, my [Number] years of experience with [Specific Technology or Skill] have prepared me to handle the core responsibilities of this role effectively.\n\nSecond, my track record of [Mention an achievement, e.g., improving processes or driving sales] demonstrates that I can deliver the results you're looking for.\n\nFinally, I'm passionate about [Company's Industry or Mission], and I am genuinely excited by the prospect of contributing to your team's goals."
    },
    {
        keywords: ["years", "where", "see", "yourself", "five", "5"],
        question: "Where do you see yourself in 5 years?",
        answer: "In the next five years, I plan to have developed into a key contributor within the team here at [Company Name]. My immediate goal is to excel in this {jobRole} position and build a strong foundation. Looking forward, I am eager to take on more complex challenges and responsibilities. I'm particularly interested in developing my skills in [Area for Growth, e.g., project leadership or a new technology], and I see this company as the ideal place to do that, as it values professional growth and internal promotion."
    },
    {
        keywords: ["why", "work", "here", "want"],
        question: "Why do you want to work here?",
        answer: "I've been following [Company Name] for a while and have been consistently impressed with your work in [Mention a specific project, product, or company value]. Your commitment to [Company Value, e.g., innovation or customer service] really resonates with me.\n\nFurthermore, this {jobRole} position seems like a perfect match for my skills in [Your Skill 1] and [Your Skill 2]. I'm looking for a company where I can not only apply my expertise but also grow professionally, and the opportunities for development you offer are very appealing. I want to be part of a team that is making a real impact, and I believe I can do that here."
    },
    {
        keywords: ["pressure", "stress", "handle", "stressful"],
        question: "How do you handle pressure or stressful situations?",
        answer: "I find that I handle pressure well by staying organized and focusing on the tasks at hand. I prioritize my work by what's most urgent and important, which helps me stay in control and productive. \n\nFor example, during a major product launch at my previous company, we faced an unexpected server issue just hours before go-live. Instead of panicking, I created a clear, step-by-step action plan, delegated tasks to the appropriate team members, and kept all stakeholders informed with regular updates. By maintaining a calm and logical approach, we were able to resolve the issue with minimal delay. I find that clear communication and a structured plan are the keys to navigating any stressful situation."
    },
    {
        keywords: ["conflict", "disagreement", "coworker", "team"],
        question: "Tell me about a time you had a conflict with a coworker.",
        answer: "In a previous project, a colleague and I had a difference of opinion on the best technical approach to solve a problem. They preferred a traditional method, while I believed a newer technology would be more efficient in the long run.\n\nTo resolve this, I suggested we sit down and objectively list the pros and cons of each approach. I made sure to listen actively to their perspective to fully understand their reasoning. We then presented both options to our project manager with our joint analysis. \n\nUltimately, our manager chose my colleague's approach due to a tight deadline, but they appreciated the research I had done. The experience taught me the importance of open discussion and professional disagreement. We successfully completed the project, and our working relationship became even stronger because we handled the situation respectfully."
    },
    {
        keywords: ["questions", "any", "for", "us", "have"],
        question: "Do you have any questions for us?",
        answer: "Yes, thank you, I do.\n\n1. Can you describe the team I would be working with and the overall team culture?\n2. What does success look like for the person in this {jobRole} position in the first 30, 60, and 90 days?\n3. What are the biggest opportunities for the company in the coming year, and how would this role contribute to them?"
    }
];

// --- Core Logic ---
function findAnswerInBank(transcribedText) {
    loaderContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');

    const cleanText = transcribedText.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    const words = cleanText.split(' ');

    let bestMatch = { score: 0, answer: "I'm sorry, I don't have a pre-written response for that question. Please try asking another common interview question like 'Tell me about yourself' or 'What is your greatest weakness?'" };

    questionBank.forEach(item => {
        let currentScore = 0;
        item.keywords.forEach(keyword => {
            if (words.includes(keyword)) {
                currentScore++;
            }
        });

        if (currentScore > bestMatch.score) {
            bestMatch = { score: currentScore, answer: item.answer };
        }
    });

    // Simulate a short delay to feel like it's "thinking"
    setTimeout(() => {
        // First, personalize the answer with the job role
        const personalizedAnswer = bestMatch.answer.replace(/{jobRole}/g, jobRole || 'this role');
        
        // Then, format the answer for display
        let formattedAnswer = personalizedAnswer
            .replace(/\[(.*?)\]/g, '<strong>$1</strong>') // Highlight placeholders
            .replace(/\n/g, '<br>');

        generatedAnswerText.innerHTML = formattedAnswer;
        loaderContainer.classList.add('hidden');
        resultContainer.classList.remove('hidden');
    }, 500);
}


// --- Speech Recognition Setup ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = true;
} else {
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

function toggleListen() {
    if (!recognition) return;
    isListening ? stopListening() : startListening();
}

function startListening() {
    isListening = true;
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

        transcribedQuestionText.textContent = interim_transcript || final_transcript;

        if (final_transcript) {
            transcribedQuestionText.textContent = final_transcript;
            statusText.textContent = `Heard you! Finding answer...`;
            // This now calls our internal function, not the API
            findAnswerInBank(final_transcript);
            stopListening();
        }
    };

    recognition.onend = () => {
        if (isListening) {
            stopListening();
        }
    };

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
        jobRoleInput.style.borderColor = '#ef4444';
        setTimeout(() => {
            jobRoleInput.style.borderColor = '';
        }, 2000);
        return;
    }
    
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