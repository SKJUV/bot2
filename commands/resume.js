// commands/resume.js — Résumé IA des conversations de groupe

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getMessages, clearBuffer, listBuffers, formatForAI } = require('../utils/groupBuffer');
const { getOwnerJid } = require('../utils/assistant');

const apiKey = process.env.GEMINI_API_KEY;

module.exports = {
    name: 'resume',
    category: '🤖 IA',
    description: "Génère un résumé IA des conversations de groupe.",
    aliases: ['summary', 'recap', 'résumé'],
    ownerOnly: true,
    run: async ({ sock, msg, args, replyWithTag }) => {
        const ownerJid = getOwnerJid() || msg.key.remoteJid;
        const PREFIX = process.env.PREFIX || '.';
        const sub = (args[0] || '').toLowerCase();

        if (!apiKey) {
            return replyWithTag(sock, ownerJid, msg, "❌ Clé API Gemini non configurée.");
        }

        // ── .resume list — voir les groupes avec des messages ──
        if (!sub || sub === 'list') {
            const buffers = listBuffers();
            if (buffers.length === 0) {
                return replyWithTag(sock, ownerJid, msg, "📭 Aucun message de groupe enregistré.\n\n_Le bot stocke les messages dès qu'il est en ligne. Attends un peu que les groupes soient actifs._");
            }

            // Résoudre les noms de groupes
            const lines = ['╭───≼ 📊 *Groupes disponibles* ≽───╮', '│'];
            for (let i = 0; i < buffers.length; i++) {
                const b = buffers[i];
                let groupName = b.groupJid;
                try { groupName = (await sock.groupMetadata(b.groupJid)).subject; } catch {}
                const agoMin = Math.floor((Date.now() - b.lastMessage) / 60000);
                lines.push(`│  *${i + 1}.* ${groupName}`);
                lines.push(`│     📨 ${b.count} messages • 🕐 il y a ${agoMin} min`);
                lines.push('│');
            }
            lines.push(`│  💡 *Usage :*`);
            lines.push(`│  ◈ \`${PREFIX}resume 1\` — Résumé du groupe #1`);
            lines.push(`│  ◈ \`${PREFIX}resume 1 60\` — Dernières 60 min`);
            lines.push(`│  ◈ \`${PREFIX}resume all\` — Tous les groupes`);
            lines.push(`│  ◈ \`${PREFIX}resume clear 1\` — Vider le buffer`);
            lines.push('╰───≼ 📊 ≽───╯');

            return replyWithTag(sock, ownerJid, msg, lines.join('\n'));
        }

        // ── .resume clear <n> — vider un buffer ──
        if (sub === 'clear') {
            const idx = parseInt(args[1]) - 1;
            const buffers = listBuffers();
            if (isNaN(idx) || idx < 0 || idx >= buffers.length) {
                return replyWithTag(sock, ownerJid, msg, `❌ Usage : \`${PREFIX}resume clear <numéro>\``);
            }
            clearBuffer(buffers[idx].groupJid);
            return replyWithTag(sock, ownerJid, msg, `🧹 Buffer du groupe #${idx + 1} vidé.`);
        }

        // ── .resume all — résumé de tous les groupes ──
        if (sub === 'all') {
            const maxAge = parseInt(args[1]) || 360;
            const buffers = listBuffers();
            if (buffers.length === 0) {
                return replyWithTag(sock, ownerJid, msg, "📭 Aucun message enregistré.");
            }

            for (let i = 0; i < buffers.length; i++) {
                const b = buffers[i];
                let groupName = b.groupJid;
                try { groupName = (await sock.groupMetadata(b.groupJid)).subject; } catch {}
                const { messages } = getMessages(b.groupJid, maxAge);
                if (messages.length < 3) continue;
                
                const summary = await generateSummary(messages, groupName);
                await replyWithTag(sock, ownerJid, msg, summary);
                // Délai pour éviter le rate limit
                await new Promise(r => setTimeout(r, 2000));
            }
            return;
        }

        // ── .resume <numéro> [minutes] — résumé d'un groupe ──
        const groupIndex = parseInt(sub) - 1;
        const maxAge = parseInt(args[1]) || 360; // défaut 6h

        const buffers = listBuffers();
        if (isNaN(groupIndex) || groupIndex < 0 || groupIndex >= buffers.length) {
            return replyWithTag(sock, ownerJid, msg, `❌ Groupe introuvable. Tape \`${PREFIX}resume\` pour voir la liste.`);
        }

        const target = buffers[groupIndex];
        let groupName = target.groupJid;
        try { groupName = (await sock.groupMetadata(target.groupJid)).subject; } catch {}

        const { messages } = getMessages(target.groupJid, maxAge);
        if (messages.length < 3) {
            return replyWithTag(sock, ownerJid, msg, `📭 Pas assez de messages dans *${groupName}* (${messages.length} messages sur les ${maxAge} dernières minutes).`);
        }

        const summary = await generateSummary(messages, groupName);
        await replyWithTag(sock, ownerJid, msg, summary);
    }
};

/**
 * Génère un résumé IA des messages d'un groupe.
 */
async function generateSummary(messages, groupName) {
    const conversation = formatForAI(messages);
    const timeRange = getTimeRange(messages);

    const prompt = `Tu es un assistant personnel. Voici les ${messages.length} derniers messages du groupe WhatsApp "${groupName}" (${timeRange}).

Fais un résumé structuré et concis :
1. **Sujets principaux** abordés (avec qui a dit quoi d'important)
2. **Décisions ou actions** prises (s'il y en a)
3. **Questions en suspens** qui attendent une réponse
4. **Ambiance générale** du groupe (en 1 ligne)
5. **Points qui me concernent** ou nécessitent mon attention

Sois direct, concis et adapté au format WhatsApp. Utilise des emojis.

--- MESSAGES ---
${conversation}
--- FIN ---`;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Formatter pour WhatsApp
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '*$1*');
        formatted = formatted.replace(/^\s*\*( |$)/gm, '• ');

        return [
            `📋 *Résumé — ${groupName}*`,
            `📨 ${messages.length} messages • ${timeRange}`,
            ``,
            formatted,
        ].join('\n');
    } catch (err) {
        console.error('[RESUME] Erreur Gemini:', err.message);
        return `❌ Erreur lors du résumé de *${groupName}* : ${err.message}`;
    }
}

function getTimeRange(messages) {
    if (messages.length === 0) return '';
    const first = new Date(messages[0].timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const last = new Date(messages[messages.length - 1].timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${first} → ${last}`;
}
