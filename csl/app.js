document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const setupScreen = document.getElementById('setup-screen');
    const testScreen = document.getElementById('test-screen');
    const resultsScreen = document.getElementById('results-screen');
    
    const rawTestInput = document.getElementById('raw-test-input');
    const startBtn = document.getElementById('start-btn');
    const parseError = document.getElementById('parse-error');
    
    const questionCounter = document.getElementById('question-counter');
    const progressFill = document.getElementById('progress-fill');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const nextBtn = document.getElementById('next-btn');
    
    const finalScore = document.getElementById('final-score');
    const scoreMessage = document.getElementById('score-message');
    const mistakesContainer = document.getElementById('mistakes-container');
    const restartBtn = document.getElementById('restart-btn');
    const newTestBtn = document.getElementById('new-test-btn');

    // State
    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let userAnswers = []; // { questionText, selectedAnswer, correctAnswer, isCorrect }
    let hasAnsweredCurrent = false;

    // Parser
    function parseTest(rawText) {
        const lines = rawText.split('\n');
        const parsedQuestions = [];
        let currentQuestion = null;

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            if (line.startsWith('<question>')) {
                if (currentQuestion && currentQuestion.variants.length > 0) {
                    parsedQuestions.push(currentQuestion);
                }
                currentQuestion = {
                    text: line.replace('<question>', '').trim(),
                    variants: []
                };
            } else if (line.startsWith('<variant>') && currentQuestion) {
                currentQuestion.variants.push(line.replace('<variant>', '').trim());
            } else if (currentQuestion && currentQuestion.variants.length === 0) {
                // Continuation of question text
                currentQuestion.text += ' ' + line;
            } else if (currentQuestion && currentQuestion.variants.length > 0) {
                // Continuation of variant text
                currentQuestion.variants[currentQuestion.variants.length - 1] += ' ' + line;
            }
        }

        if (currentQuestion && currentQuestion.variants.length > 0) {
            parsedQuestions.push(currentQuestion);
        }

        // Validate
        return parsedQuestions.filter(q => q.variants.length > 1);
    }

    // Utility: Shuffle Array (Fisher-Yates)
    function shuffleArray(array) {
        const newArr = [...array];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    }

    // Switch screens
    function showScreen(screenId) {
        setupScreen.classList.add('hidden');
        testScreen.classList.add('hidden');
        resultsScreen.classList.add('hidden');
        
        // Small timeout for display block before opacity transition
        setTimeout(() => {
            document.getElementById(screenId).classList.remove('hidden');
        }, 10);
    }

    // Initialize Test
    function initTest() {
        currentQuestionIndex = 0;
        score = 0;
        userAnswers = [];
        hasAnsweredCurrent = false;
        
        // Shuffle questions
        questions = shuffleArray(questions);
        
        loadQuestion();
        showScreen('test-screen');
    }

    // Load Question
    function loadQuestion() {
        const q = questions[currentQuestionIndex];
        hasAnsweredCurrent = false;
        nextBtn.disabled = true;
        
        // Update Progress
        const current = currentQuestionIndex + 1;
        const total = questions.length;
        questionCounter.textContent = `Вопрос ${current} / ${total}`;
        progressFill.style.width = `${(current / total) * 100}%`;
        
        // Set Text
        questionText.textContent = q.text;
        
        // Process Variants (assuming first is correct)
        const correctAnswerText = q.variants[0];
        let displayVariants = shuffleArray(q.variants);
        
        optionsContainer.innerHTML = '';
        
        displayVariants.forEach((variantText) => {
            const optionEl = document.createElement('div');
            optionEl.className = 'option';
            optionEl.textContent = variantText;
            
            optionEl.addEventListener('click', () => {
                if (hasAnsweredCurrent) return;
                
                hasAnsweredCurrent = true;
                const isCorrect = variantText === correctAnswerText;
                
                if (isCorrect) {
                    optionEl.classList.add('correct');
                    score++;
                } else {
                    optionEl.classList.add('wrong');
                    // Find and highlight correct answer
                    Array.from(optionsContainer.children).forEach(child => {
                        if (child.textContent === correctAnswerText) {
                            child.classList.add('correct');
                        }
                    });
                }
                
                // Disable all options
                Array.from(optionsContainer.children).forEach(child => {
                    child.classList.add('disabled');
                });
                
                // Record answer
                userAnswers.push({
                    questionText: q.text,
                    selectedAnswer: variantText,
                    correctAnswer: correctAnswerText,
                    isCorrect: isCorrect
                });
                
                nextBtn.disabled = false;
            });
            
            optionsContainer.appendChild(optionEl);
        });
        
        // Update Next button text if it's the last question
        if (currentQuestionIndex === questions.length - 1) {
            nextBtn.textContent = 'Завершить тест';
        } else {
            nextBtn.textContent = 'Следующий вопрос';
        }
    }

    // Show Results
    function showResults() {
        finalScore.textContent = `${score} / ${questions.length}`;
        
        const percentage = score / questions.length;
        if (percentage >= 0.9) {
            scoreMessage.textContent = 'Отличный результат! Вы прекрасно разбираетесь в теме.';
            document.querySelector('.score-circle').style.borderColor = 'var(--success-color)';
        } else if (percentage >= 0.7) {
            scoreMessage.textContent = 'Хороший результат! Вы ответили на большинство вопросов.';
            document.querySelector('.score-circle').style.borderColor = 'var(--primary-color)';
        } else if (percentage >= 0.5) {
            scoreMessage.textContent = 'Неплохо, но есть куда стремиться.';
            document.querySelector('.score-circle').style.borderColor = '#f59e0b'; // amber
        } else {
            scoreMessage.textContent = 'Стоит еще раз повторить материал.';
            document.querySelector('.score-circle').style.borderColor = 'var(--error-color)';
        }
        
        // Render mistakes
        mistakesContainer.innerHTML = '';
        const mistakes = userAnswers.filter(a => !a.isCorrect);
        
        if (mistakes.length === 0) {
            mistakesContainer.innerHTML = '<p style="color: var(--success-color);">У вас нет ни одной ошибки!</p>';
        } else {
            mistakes.forEach(mistake => {
                const mistakeEl = document.createElement('div');
                mistakeEl.className = 'mistake-item';
                mistakeEl.innerHTML = `
                    <div class="mistake-question">${mistake.questionText}</div>
                    <div class="mistake-wrong-answer">${mistake.selectedAnswer}</div>
                    <div class="mistake-correct-answer">${mistake.correctAnswer}</div>
                `;
                mistakesContainer.appendChild(mistakeEl);
            });
        }
        
        showScreen('results-screen');
    }

    // Event Listeners
    startBtn.addEventListener('click', () => {
        const rawText = rawTestInput.value;
        questions = parseTest(rawText);
        
        if (questions.length > 0) {
            parseError.classList.add('hidden');
            initTest();
        } else {
            parseError.classList.remove('hidden');
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            loadQuestion();
        } else {
            showResults();
        }
    });

    restartBtn.addEventListener('click', () => {
        initTest();
    });

    newTestBtn.addEventListener('click', () => {
        rawTestInput.value = '';
        showScreen('setup-screen');
    });
});
