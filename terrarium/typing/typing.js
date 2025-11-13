if (!localStorage.getItem("bestScore")) {
  localStorage.setItem("bestScore", Infinity);
}

const quotes = [
    "When you eliminate the impossible, whatever remains must be the truth.",
    "There is nothing more deceptive than an obvious fact.",
    "What one man can invent another can discover.",
    "Education never ends. It is a series of lessons."
];

let words = [];
let wordIndex = 0;
let startTime = 0;
let typedChars = 0;

const quoteElement = document.getElementById("quote");
const typedValue = document.getElementById("typed-value");
const startButton = document.getElementById("start");
const countdown = document.getElementById("countdown");

const timeDisplay = document.getElementById("time-display");

const modalBg = document.getElementById("modal-bg");
const resultTime = document.getElementById("result-time");
const bestScoreText = document.getElementById("best-score");

function startCountdown() {
    let count = 3;
    countdown.classList.remove("hidden");
    countdown.textContent = count;

    const timer = setInterval(() => {
    count--;
    countdown.textContent = count;

    if (count === 0) {
        clearInterval(timer);
        countdown.classList.add("hidden");
        startGame();
    }
    }, 1000);
}

function startGame() {
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
    words = quote.split(" ");
    wordIndex = 0;

    typedChars = 0;

    quoteElement.innerHTML = words.map(w => `<span>${w} </span>`).join("");
    quoteElement.childNodes[0].className = "highlight";

    typedValue.value = "";
    typedValue.disabled = false;
    typedValue.focus();

    startButton.disabled = true;

    startTime = new Date().getTime();
    timeDisplay.textContent = "0.00초";
}

typedValue.addEventListener("input", () => {
    const current = words[wordIndex];
    const typed = typedValue.value;

    typedValue.classList.remove("typing", "wrong", "ripple");

    typedValue.classList.add("typing", "ripple");

    typedChars++;

    if (typed === current && wordIndex === words.length - 1) {
    finishGame();
    return;
    }

    if (typed.endsWith(" ") && typed.trim() === current) {
    typedValue.value = "";
    wordIndex++;

    quoteElement.childNodes.forEach(n => n.className = "");
    quoteElement.childNodes[wordIndex].className = "highlight";
    }
    else if (!current.startsWith(typed)) {
    typedValue.classList.add("wrong");
    }

    updateTime();
});

function updateTime() {
    const sec = (new Date().getTime() - startTime) / 1000;
    timeDisplay.textContent = sec.toFixed(2) + "초";
}

function finishGame() {
    typedValue.disabled = true;

    const sec = (new Date().getTime() - startTime) / 1000;

    resultTime.textContent = `⏱ 기록: ${sec.toFixed(2)}초`;

    const best = localStorage.getItem("bestScore");

    if (!best || sec < best) {
    localStorage.setItem("bestScore", sec);
    bestScoreText.textContent = "🎉 신기록 달성!";
    } else {
    bestScoreText.textContent = `📌 최고 기록: ${Number(best).toFixed(2)}초`;
    }

    modalBg.classList.remove("hidden");
}

function closeModal() {
    modalBg.classList.add("hidden");
    startButton.disabled = false;
}

startButton.addEventListener("click", startCountdown);