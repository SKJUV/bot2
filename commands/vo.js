// commands/vo.js — Gestion des vues uniques interceptées (extraction en IB)

const { getPendingViewOnce, getViewOnceById, deleteViewOnce, extractViewOnceBuffer, getOwnerJid } = require('../utils/assistant');

module.exports = {
    name: 'vo',
    category: '👑 Admin',
    description: 'Gère les vues uniques interceptées (extraction en IB).',
    aliases: ['viewonce', 'vu'],
    ownerOnly: true,
    run: async ({ sock, msg, args, replyWithTag }) => {
        const ownerJid = getOwnerJid();
        if (!ownerJid) {
            return replyWithTag(sock, msg.key.remoteJid, msg, '❌ Aucun numéro owner configuré.');
        }

        const PREFIX = process.env.PREFIX || '.';
        const sub = (args[0] || '').toLowerCase();

        // ── .vo list (ou .vo sans argument) ──
        if (!sub || sub === 'list') {
            const pending = getPendingViewOnce();
            if (pending.size === 0) {
                return replyWithTag(sock, ownerJid, msg, '📭 Aucune vue unique en attente.\n\n_Les vues uniques sont stockées pendant 24h._');
            }

            const lines = ['╭───≼ 👁️ *Vues uniques en attente* ≽───╮', '│'];
            for (const [id, vo] of pending) {
                const agoMin = Math.floor((Date.now() - vo.timestamp) / 60000);
                const emoji = vo.type === 'image' ? '🖼️' : vo.type === 'video' ? '🎥' : '🎵';
                lines.push(`│  ${emoji} *#${id}* — ${vo.type}`);
                lines.push(`│     👤 ${vo.senderName} (${vo.senderNumber})`);
                lines.push(`│     💬 ${vo.groupName}`);
                lines.push(`│     🕐 il y a ${agoMin} min`);
                lines.push('│');
            }
            lines.push(`│  💡 *Commandes :*`);
            lines.push(`│  ◈ \`${PREFIX}vo <id>\` — Extraire une vue`);
            lines.push(`│  ◈ \`${PREFIX}vo all\` — Tout extraire`);
            lines.push(`│  ◈ \`${PREFIX}vo clear\` — Vider la liste`);
            lines.push('╰───≼ 👁️ ≽───╯');

            return replyWithTag(sock, ownerJid, msg, lines.join('\n'));
        }

        // ── .vo all — extraire toutes les vues uniques ──
        if (sub === 'all') {
            const pending = getPendingViewOnce();
            if (pending.size === 0) {
                return replyWithTag(sock, ownerJid, msg, '📭 Aucune vue unique en attente.');
            }

            let extracted = 0;
            let failed = 0;
            for (const [id, vo] of pending) {
                try {
                    await sendExtractedMedia(sock, ownerJid, vo);
                    deleteViewOnce(id);
                    extracted++;
                } catch (e) {
                    console.error(`[VO] Erreur extraction #${id}:`, e.message);
                    failed++;
                }
            }

            let result = `✅ *${extracted}* vue(s) unique(s) extraite(s).`;
            if (failed > 0) result += `\n⚠️ ${failed} échec(s).`;
            return replyWithTag(sock, ownerJid, msg, result);
        }

        // ── .vo clear — vider toute la liste ──
        if (sub === 'clear') {
            const count = getPendingViewOnce().size;
            getPendingViewOnce().clear();
            return replyWithTag(sock, ownerJid, msg, `🧹 *${count}* vue(s) unique(s) supprimée(s).`);
        }

        // ── .vo <id> — extraire une vue unique spécifique ──
        const id = parseInt(sub);
        if (isNaN(id)) {
            return replyWithTag(sock, ownerJid, msg, [
                `❌ Commande inconnue : *${sub}*`,
                ``,
                `💡 *Usage :*`,
                `◈ \`${PREFIX}vo\` — Liste des vues en attente`,
                `◈ \`${PREFIX}vo <id>\` — Extraire une vue`,
                `◈ \`${PREFIX}vo all\` — Tout extraire`,
                `◈ \`${PREFIX}vo clear\` — Vider la liste`,
            ].join('\n'));
        }

        const vo = getViewOnceById(id);
        if (!vo) {
            return replyWithTag(sock, ownerJid, msg, `❌ Vue unique *#${id}* introuvable ou expirée (24h max).`);
        }

        try {
            await sendExtractedMedia(sock, ownerJid, vo);
            deleteViewOnce(id);
        } catch (e) {
            console.error(`[VO] Erreur extraction #${id}:`, e);
            await replyWithTag(sock, ownerJid, msg, `⚠️ Impossible d'extraire la vue unique *#${id}*. Le média est peut-être trop ancien.`);
        }
    }
};

/**
 * Envoie un média vue unique extrait au owner dans son IB.
 */
async function sendExtractedMedia(sock, ownerJid, vo) {
    const buffer = await extractViewOnceBuffer(vo);
    if (buffer.length === 0) throw new Error('Buffer vide');

    const emoji = vo.type === 'image' ? '🖼️' : vo.type === 'video' ? '🎥' : '🎵';
    const caption = [
        `${emoji} *Vue unique extraite*`,
        ``,
        `👤 *De :* ${vo.senderName} (${vo.senderNumber})`,
        `💬 *Groupe :* ${vo.groupName}`,
    ].join('\n');

    if (vo.type === 'image') {
        await sock.sendMessage(ownerJid, { image: buffer, caption });
    } else if (vo.type === 'video') {
        await sock.sendMessage(ownerJid, { video: buffer, caption });
    } else if (vo.type === 'audio') {
        await sock.sendMessage(ownerJid, { audio: buffer, mimetype: 'audio/mp4' });
        // Envoyer la légende séparément pour l'audio
        await sock.sendMessage(ownerJid, { text: caption });
    }
}
