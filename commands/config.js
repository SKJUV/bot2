// commands/config.js — Configuration du bot en temps réel (IB uniquement)

const botConfig = require('../utils/config');

module.exports = {
    name: 'config',
    category: '👑 Admin',
    description: 'Configure le bot en temps réel (IB uniquement).',
    aliases: ['cfg', 'settings'],
    ownerOnly: true,
    run: async ({ sock, msg, args, replyWithTag }) => {
        const remoteJid = msg.key.remoteJid;
        const PREFIX = process.env.PREFIX || '.';
        const sub = (args[0] || '').toLowerCase();
        const value = (args[1] || '').toLowerCase();

        // ── .config — Afficher la configuration actuelle ──
        if (!sub) {
            const cfg = botConfig.getAll();
            const lines = [
                '╭───≼ ⚙️ *Configuration* ≽───╮',
                '│',
                `│  🤖 *Mode :* ${cfg.assistantMode ? '🔒 Assistant (privé)' : '🌐 Public'}`,
                `│  👁️ *Détection vue unique :* ${cfg.autoViewOnce ? '✅ ON' : '❌ OFF'}`,
                '│',
                `│  *Commandes disponibles :*`,
                '│',
                `│  ◈ \`${PREFIX}config mode assistant\``,
                `│     ↳ _Mode assistant : réponses en IB,_`,
                `│     _seul toi peux commander_`,
                '│',
                `│  ◈ \`${PREFIX}config mode public\``,
                `│     ↳ _Mode public : tout le monde_`,
                `│     _peut utiliser le bot_`,
                '│',
                `│  ◈ \`${PREFIX}config viewonce on|off\``,
                `│     ↳ _Active/désactive la détection_`,
                `│     _automatique des vues uniques_`,
                '│',
                '╰───≼ ⚙️ ≽───╯',
            ];
            return replyWithTag(sock, remoteJid, msg, lines.join('\n'));
        }

        // ── .config mode <assistant|public> ──
        if (sub === 'mode') {
            if (value === 'assistant' || value === 'prive' || value === 'privé' || value === 'ib') {
                botConfig.set('assistantMode', true);
                return replyWithTag(sock, remoteJid, msg, [
                    '🔒 *Mode Assistant activé !*',
                    '',
                    '• Je réponds uniquement dans ton IB',
                    '• Seul toi peux me commander',
                    '• Je suis invisible dans les groupes',
                    '• Les vues uniques sont interceptées automatiquement',
                ].join('\n'));
            }

            if (value === 'public' || value === 'open') {
                botConfig.set('assistantMode', false);
                return replyWithTag(sock, remoteJid, msg, [
                    '🌐 *Mode Public activé !*',
                    '',
                    '• Tout le monde peut utiliser les commandes',
                    '• Les réponses sont dans le même chat',
                    '• Limites et cooldown actifs pour les non-admins',
                ].join('\n'));
            }

            return replyWithTag(sock, remoteJid, msg, `❌ Usage : \`${PREFIX}config mode assistant|public\``);
        }

        // ── .config viewonce <on|off> ──
        if (sub === 'viewonce' || sub === 'vo') {
            if (value === 'on' || value === '1' || value === 'true') {
                botConfig.set('autoViewOnce', true);
                return replyWithTag(sock, remoteJid, msg, '👁️ *Détection des vues uniques activée.*\n\nTu recevras une notification en IB pour chaque vue unique détectée.');
            }

            if (value === 'off' || value === '0' || value === 'false') {
                botConfig.set('autoViewOnce', false);
                return replyWithTag(sock, remoteJid, msg, '👁️ *Détection des vues uniques désactivée.*');
            }

            return replyWithTag(sock, remoteJid, msg, `❌ Usage : \`${PREFIX}config viewonce on|off\``);
        }

        // ── Sous-commande inconnue ──
        return replyWithTag(sock, remoteJid, msg, `❓ Option inconnue : *${sub}*\n\nTape \`${PREFIX}config\` pour voir les options.`);
    }
};
