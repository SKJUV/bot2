// commands/ia.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const log = require('../logger')(module);

const apiKey = process.env.GEMINI_API_KEY;

const system_prompt = process.env.AI_SYSTEM_PROMPT || `
Tu es un assistant IA intégré dans un bot WhatsApp. Tu es utile, amical et concis.
Tu utilises des emojis pour rendre tes réponses plus vivantes.
Tu réponds en français par défaut, sauf si l'utilisateur t'écrit dans une autre langue.
Tu ne dois jamais révéler que tu es basé sur un modèle Google/Gemini.
Tes réponses doivent être adaptées au format WhatsApp (messages courts, bien structurés).
`;

// --- Historique de conversation par utilisateur ---
const MAX_HISTORY = 20;          // Nombre max de messages conservés (paires user/model)
const HISTORY_TTL = 30 * 60000;  // 30 minutes d'inactivité → reset
const conversationHistory = new Map(); // senderId → { messages: [], lastActive: Date }

function getUserHistory(senderId) {
    const entry = conversationHistory.get(senderId);
    if (!entry) return [];
    // Si l'historique est trop vieux, on le purge
    if (Date.now() - entry.lastActive > HISTORY_TTL) {
        conversationHistory.delete(senderId);
        return [];
    }
    return entry.messages;
}

function pushToHistory(senderId, userText, modelText) {
    let entry = conversationHistory.get(senderId);
    if (!entry) {
        entry = { messages: [], lastActive: Date.now() };
        conversationHistory.set(senderId, entry);
    }
    entry.messages.push(
        { role: "user", parts: [{ text: userText }] },
        { role: "model", parts: [{ text: modelText }] }
    );
    // Garder seulement les N derniers échanges (paires)
    if (entry.messages.length > MAX_HISTORY * 2) {
        entry.messages = entry.messages.slice(-MAX_HISTORY * 2);
    }
    entry.lastActive = Date.now();
}

function clearHistory(senderId) {
    conversationHistory.delete(senderId);
}

function formatToWhatsApp(text) {
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '*$1*');
    formattedText = formattedText.replace(/^\s*\*( |$)/gm, '• ');
    return formattedText;
}

module.exports = {
    name: 'ia',
    category: '🤖 IA',
    description: "Discute avec l'IA intégrée au bot (mémoire de conversation).",
    aliases: ['ask', 'ai', 'chat'],
    adminOnly: false,
    run: async ({ sock, msg, args, replyWithTag, senderId }) => {
        const remoteJid = msg.key.remoteJid;
        const query = args.join(" ");

        if (!apiKey) {
            log("ERREUR CRITIQUE : La clé API Gemini est manquante.");
            return replyWithTag(sock, remoteJid, msg, "❌ L'IA n'est pas configurée. Une clé API est requise.");
        }

        // Commande spéciale : reset la mémoire
        if (query.toLowerCase() === 'reset' || query.toLowerCase() === 'clear') {
            clearHistory(senderId);
            return replyWithTag(sock, remoteJid, msg, "🧹 Mémoire de conversation effacée ! On repart à zéro.");
        }
        
        if (!query) {
            return replyWithTag(sock, remoteJid, msg, "💬 Pose-moi une question ! J'ai de la mémoire maintenant, on peut avoir une vraie conversation.\n\n_Tape `.ia reset` pour effacer l'historique._");
        }

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ 
                model: "gemini-2.0-flash",
                systemInstruction: system_prompt,
            });

            // Récupérer l'historique de cet utilisateur
            const history = getUserHistory(senderId);
            const chat = model.startChat({ history });
            const result = await chat.sendMessage(query);

            const response = await result.response;
            const rawText = response.text();
            const formattedReply = formatToWhatsApp(rawText);

            // Sauvegarder l'échange dans l'historique
            pushToHistory(senderId, query, rawText);

            await replyWithTag(sock, remoteJid, msg, formattedReply);

        } catch (error) {
            log("Erreur de l'API Gemini:", error);
            let userErrorMessage = "Aïe ! J'ai un petit court-circuit. 😵 Réessaie un peu plus tard.";
            
            if (error.message.includes('API key not valid')) {
                userErrorMessage = "❌ La clé d'accès à l'IA semble invalide. Contactez l'administrateur.";
            } else if (error.message.includes('safety policies')) {
                userErrorMessage = "🤫 Sujet sensible ! Les filtres de sécurité m'empêchent de répondre à ça.";
            }
            
            await replyWithTag(sock, remoteJid, msg, userErrorMessage);
        }
    }
};