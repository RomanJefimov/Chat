import { Router } from "express";
import { chatController } from "../controllers/chatController";

// Роутер слоя Controller для REST-эндпоинтов
const router = Router();

// Отдаем историю сообщений
router.get("/api/messages", chatController.getMessages);

export default router;