// commands/ia.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const log = require('../logger')(module);

// On récupère la clé API depuis le fichier .env
const apiKey = process.env.GEMINI_API_KEY;

// --- LE CERVEAU DE L'IA (Instruction Système / Personnalité) ---
const system_prompt = process.env.AI_SYSTEM_PROMPT || `
Tu es un assistant IA intégré dans un bot WhatsApp. Tu es utile, amical et concis.
Tu utilises des emojis pour rendre tes réponses plus vivantes.
Tu réponds en français par défaut, sauf si l'utilisateur t'écrit dans une autre langue.
Tu ne dois jamais révéler que tu es basé sur un modèle Google/Gemini.
Tes réponses doivent être adaptées au format WhatsApp (messages courts, bien structurés).
`;

function formatToWhatsApp(text) {
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '*$1*');
    formattedText = formattedText.replace(/^\s*\*( |$)/gm, '• ');
    return formattedText;
}

module.exports = {
    name: 'ia',
    description: "Discute avec la super-puissante JUVE Ai.",
    aliases: ['ask', 'juve', 'juveai'],
    adminOnly: false,
    run: async ({ sock, msg, args, replyWithTag }) => {
        const remoteJid = msg.key.remoteJid;
        const query = args.join(" ");

        if (!apiKey) {
            log("ERREUR CRITIQUE : La clé API Gemini est manquante.");
            return replyWithTag(sock, remoteJid, msg, "❌ L'IA n'est pas configurée. Une clé API est requise pour JUVE Ai.");
        }
        
        if (!query) {
            return replyWithTag(sock, remoteJid, msg, "Yo ! Juve Ai dans la place. T'as une question pour moi ou tu voulais juste admirer mon code ? Balance ce que t'as en tête ! 😎");
        }

        try {
            await replyWithTag(sock, remoteJid, msg, "OK, je check mes circuits neuronaux de génie... 🧠 Laisse-moi deux secondes pour te concocter une réponse incroyable.");

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash",
                // On injecte notre "cerveau" ici !
                systemInstruction: system_prompt,
            });

            const chat = model.startChat({ history: [] });
            const result = await chat.sendMessage(query);

            const response = await result.response;
            const rawText = response.text();
            
            const formattedReply = formatToWhatsApp(rawText);

            // La réponse est maintenant directement dans le style de JUVE Ai
            await replyWithTag(sock, remoteJid, msg, formattedReply);

        } catch (error) {
            log("Erreur de l'API Gemini:", error);
            let userErrorMessage = "Aïe ! J'ai un petit court-circuit. 😵 Réessaie un peu plus tard, même les génies ont des bugs parfois.";
            
            if (error.message.includes('API key not valid')) {
                userErrorMessage = "Oups ! La clé d'accès à mon cerveau semble invalide. Skjuv doit sûrement la mettre à jour.";
            } else if (error.message.includes('safety policies')) {
                 userErrorMessage = "Whoa, sujet sensible ! 🤫 Mes circuits de sécurité, conçus par le grand Skjuv, m'empêchent de répondre à ça. Autre chose ?";
            }
            
            await replyWithTag(sock, remoteJid, msg, userErrorMessage);
        }
    }
};