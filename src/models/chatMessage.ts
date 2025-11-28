export interface ChatMessage {
    //Уникальный идентификатор, чтобы удобно рендерит список и отлаживать историю
    id: number;
    // Имя отправителя, показываем в UI
    author: string;
    // Текст сообщения
    text: string;
    // МЕтка времени (UTC, миллисекунды), чтобы выводить человеческое время на клиенте
    timestamp: number;
}

// Простейшая модель с хранением сообщений в памяти процесса
export class ChatModel {
    // Хранилище сообщений; на сервере лежит только в RAM
    private messages: ChatMessage[] = [];
    // Счетчик для генерации уникальныъ идентификаторов
    private nextId = 1;
    // Ограничение на длинну истории, чтобы не раздувать память
    private readonly maxMessages = 100;

    // Вернуть копию массива сообщений, чтобы снаружи нельзя было мутировать состояние
    public getAll(): ChatMessage[] {
        return [...this.messages];
    }

    // Добавить новое сообщение; возвращаем итоговый обьект для дальнейшей рассылки клиентам
    public add(author: string, text: string): ChatMessage {
        const trimmedAuthor = author.trim() || "Anonymous";
        const trimmedText = text.trim();

        // Путые строки игнорируем, чтобы не захламлять чат
        if (!trimmedText) {
            throw new Error("Текст сообщения пуст");
        }

        const message: ChatMessage = {
            id: this.nextId++,
            author: trimmedAuthor.slice(0, 30), // не даем слишком длинные имена
            text: trimmedText.slice(0, 500), // ограничение размера
            timestamp: Date.now(),
        };

        this.messages.push(message);

        // Если история превысила лимит, убираем самое старое сообщение
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }

        return message;
    }
}

// Экземпляр модели как синглтон, чтобы его переиспользовать во всем приложении
export const chatModel = new ChatModel();