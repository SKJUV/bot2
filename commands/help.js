const log = require('../logger')(module);
module.exports = {
    name: 'help',
    category: 'ℹ️ Utilitaires',
    description: "Affiche le menu catégorisé de toutes les commandes.",
    aliases: ['menu', 'aide'],
    run: async ({ sock, msg, commands }) => {
        if (!sock.user) return;

        const BOT_NAME = process.env.BOT_NAME || "WhatsBot";
        const PREFIX = process.env.PREFIX || ".";
        const CREATOR = process.env.CREATOR_NAME || "WhatsBot";
        const remoteJid = msg.key.remoteJid;
        log(`Commande .menu reçue de ${remoteJid}`);

        // Regrouper les commandes par catégorie
        const categories = new Map();
        const categoryOrder = ['🎵 Multimédia', '🤖 IA', '👥 Groupe', 'ℹ️ Utilitaires', '👑 Admin'];

        for (const cmd of commands.values()) {
            const cat = cmd.category || '📦 Autres';
            if (!categories.has(cat)) categories.set(cat, []);
            categories.get(cat).push(cmd);
        }

        // Construire le menu
        const lines = [];
        lines.push(`╭━━━━━━━━━━━━━━━━╮`);
        lines.push(`┃  🤖 *${BOT_NAME}* — Menu`);
        lines.push(`┃  _Préfixe : ${PREFIX}_`);
        lines.push(`╰━━━━━━━━━━━━━━━━╯\n`);

        // Afficher dans l'ordre défini, puis les catégories restantes
        const allCategories = [...categoryOrder, ...Array.from(categories.keys()).filter(c => !categoryOrder.includes(c))];
        const displayed = new Set();

        for (const cat of allCategories) {
            if (displayed.has(cat)) continue;
            const cmds = categories.get(cat);
            if (!cmds || cmds.length === 0) continue;
            displayed.add(cat);

            lines.push(`╭─── ${cat} ───╮`);
            for (const cmd of cmds) {
                const aliasText = cmd.aliases?.length ? ` _(${cmd.aliases.map(a => PREFIX + a).join(', ')})_` : '';
                const badge = cmd.ownerOnly ? ' 👑' : cmd.adminOnly ? ' 🔒' : '';
                lines.push(`│  ◈ *${PREFIX}${cmd.name}*${badge}${aliasText}`);
                lines.push(`│     ↳ _${cmd.description}_`);
            }
            lines.push(`╰${'─'.repeat(cat.length + 8)}╯\n`);
        }

        lines.push(`📊 *${commands.size}* commandes disponibles`);
        lines.push(`🔒 = admin groupe • 👑 = owner only`);
        lines.push(`\n_Fait avec ❤️ par ${CREATOR}_`);

        const menuText = lines.join('\n');

        try {
            await sock.sendMessage(remoteJid, { text: menuText }, { quoted: msg });
        } catch (e) {
            log('Erreur envoi menu:', e.message);
        }
    }
};