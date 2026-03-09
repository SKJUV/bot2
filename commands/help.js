const log = require('../logger')(module);
module.exports = {
    name: 'help',
    description: "Affiche le menu d'aide du bot.",
    run: async ({ sock, msg, commands }) => {
        if (!sock.user) {
            return;
        }
        const BOT_NAME = process.env.BOT_NAME || "WhatsBot";
        const PREFIX = process.env.PREFIX || ".";
        const remoteJid = msg.key.remoteJid;
        log(`Commande reçue de ${remoteJid}`);
        let helpText = `╭───≼ 🤖 *${BOT_NAME}* ≽───╮\n│\n`;
        helpText += `│  Salut ! Je suis un assistant personnel\n│  et un outil multimédia.\n│\n`;
        helpText += `│  Voici mes commandes disponibles :\n`;

        const availableCommands = Array.from(commands.values()).filter(c => c.name !== 'help');

        if (availableCommands.length > 0) {
            availableCommands.forEach(command => {
                helpText += `│\n│  ◈ \`${PREFIX}${command.name}\`\n│     ↳ _${command.description}_\n`;
            });
        }
        helpText += `│\n╰───≼ ${process.env.CREATOR_NAME || 'WhatsBot'} ≽───╯`;

        try {
            // Utiliser sock.sendMessage directement pour un rendu parfait.
            await sock.sendMessage(remoteJid, { text: helpText }, { quoted: msg });
        } catch(e) {
        }
    }
};