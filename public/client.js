(() => {
    //Находим нужные элементы DOM заранее
    const messagesEl = document.getElementById("messages");
    const authorEl = document.getElementById("author");
    const messageEl = document.getElementById("message");
    const sendBtn = document.getElementById("send");
    const feedbackEl = document.getElementById("feedback");
    const statusPill = document.getElementById("status-pill");

    // Создаем подключение к серверу Socket.io
    const socket = io();

    // Загружаем ранее выбранное имя из localstorage, если оно было
    const savedName = localStorage.getItem("mkchat:name");
    if (savedName && authorEl instanceof HTMLInputElement) {
        authorEl.value = savedName;
    }

    // Утилита для смены статуса сервера
    const setStatus = (text, online) => {
        statusPill.textContent = text;
        statusPill.classList.toggle("status-pill--online", online);
        statusPill.classList.toggle("status-pill--offline", !online);
    };

    // Форматирование времени в локальный формат
    const formatTime = (timestamp) => {
        try {
            return new Intl.DateTimeFormat(undefined, {
                hour: "2-digit",
                minute: "2-digit",
            }).format(new Date(timestamp));
        } catch {
            return "";
        }
    };

    const getColorForAuthor = (author) => {
    let hash = 0;
    for (let i = 0; i < author.length; i++) {
        hash = author.charCodeAt(i) + ((hash << 5) - hash); 
    }
    const hue = hash % 360; // угол оттенка
    return `hsl(${hue}, 60%, 50%)`; 
};

    const onlineCountEl = document.getElementById("online-count");

    socket.on("online:update", (count) => {
        onlineCountEl.textContent = `Пользователей онлайн: ${count}`;
    });

    // Создание DOM-элемента сообщения для вставки в списко
    const createMessageElement = (message) => {
        const container = document.createElement("article");
        container.className = "message";
    
        const meta = document.createElement("div");
        meta.className = "message__meta";
    
        const author = document.createElement("span");
        author.className = "message__author";
        author.textContent = message.author;

        author.style.color = getColorForAuthor(message.author);
    
        const time = document.createElement("time");
        time.className = "message__title";
        time.textContent = formatTime(message.timestamp);
    
        meta.append(author, time);
    
        const text = document.createElement("p");
        text.className = "message__text";
        text.textContent = message.text;
    
        container.append(meta, text);
        return container;
    };
    
    // Рендер всей истории
    const renderMessages = (messages) => {
        messagesEl.innerHTML = "";
        messages.forEach((m) => {
            messagesEl.appendChild(createMessageElement(m));
        });
        messagesEl.scrollTop = messagesEl.scrollHeight;
    };
    
    // Добавление одного сообщения в конец
    const appendMessage = (message) => {
        messagesEl.appendChild(createMessageElement(message));
        messagesEl.scrollTop = messagesEl.scrollHeight;
    };
    
    // Показ подсказки об ошибке/успехе
    const showFeedback = (text, isError = false) => {
        feedbackEl.textContent = text;
        feedbackEl.classList.toggle("feedback--error", isError);
    };
    
    // Получаем историю через REST, чтобы сразу показать уже отправленные сообщения
    const loadHistory = async () => {
        try {
            const response = await fetch("/api/messages");
            if (!response.ok) {
                throw new Error("Failed to load history");
            }
        
            const data = await response.json();
            renderMessages(data.messages || []);
            showFeedback("Loaded history");
        } catch (error) {
            console.error(error);
            showFeedback("Could not load history", true);
        }
    };
    
    // Отправка сообщения на сервер
    const sendMessage = () => {
        const author = authorEl.value.trim() || "Anonymous";
        const text = messageEl.value.trim();
    
        if (!text) {
            showFeedback("Type something before sending", true);
            return;
        }
    
        // Сохраняем имя, чтобы не вводить его каждый раз
        localStorage.setItem("mkchat:name", author);
    
        sendBtn.disabled = true;
        showFeedback("Sending...");
    
        socket.emit("chat:send", { author, text }, (err) => {
            sendBtn.disabled = false;
            if (err) {
                showFeedback(err, true);
                return;
            }
        
            messageEl.value = "";
            messageEl.focus();
            showFeedback("Sent!");
        });
    };
    
    // Инициализация: загрузка истории и подключение событий UI
    const init = () => {
        loadHistory();
    
        sendBtn.addEventListener("click", sendMessage);
    
        messageEl.addEventListener("keydown", (event) => {
            //Отправляем по Ctrl/Cmd + Enter, чтобы было похоже на мессенджеры
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                sendMessage();
            }
        });
    };
    
    // Подписки на сокет-события
    socket.on("connect", () => setStatus("Online", true));
    socket.on("disconnect", () => setStatus("Offline", false));
    
    // Сервер присылает всю истори. при подключении
    socket.on("chat:init", (messages) => renderMessages(messages));
    
    // Новое сообщение от любого пользователя
    socket.on("chat:new", (message) => appendMessage(message));
    
    // Если сервер вернул ошибку не через callback
    socket.on("chat:error", (msg) => showFeedback(msg, true));
    
    // Запускаем инициализацию, когда DOM готов (скрипт подключен в конце, но на всякий случай)
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();