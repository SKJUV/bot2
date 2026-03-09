// commands/tagall.js

module.exports = {
    name: 'tagall',
    category: '👥 Groupe',
    aliases: ['mentionall', 'tous', 'annonce'], // Ajout de "annonce" qui correspond bien à l'usage
    description: 'Notifie tous les membres du groupe sans afficher la liste des mentions.',
    ownerOnly: true,
    groupAction: true,

    async run({ sock, msg, args }) {
        const remoteJid = msg.key.remoteJid;
        console.log(`[TAGALL] Commande exécutée dans le groupe : ${remoteJid}`);
        console.log(`[TAGALL] Arguments fournis : ${args.join(' ')}`);

        if (!remoteJid.endsWith('@g.us')) {
            return sock.sendMessage(remoteJid, { text: "⛔ Cette commande ne peut fonctionner que dans les groupes." }, { quoted: msg });
        }

        try {
            // --- LA LOGIQUE CLÉ EST ICI ---

            // 1. D'ABORD, on récupère juste la liste des JIDs pour la notification
            const groupMetadata = await sock.groupMetadata(remoteJid);
            // On utilise .map() pour transformer directement le tableau d'objets en tableau de JIDs
            const mentions = groupMetadata.participants.map(p => p.id);

            // 2. ENSUITE, on construit le message qui sera VISIBLE.
            // Ce message ne contiendra JAMAIS la liste des membres.
            const customMessage = args.join(' ');
            let text;

            if (customMessage) {
                // Si l'utilisateur a écrit un message, on l'utilise.
                text = `📢 *Annonce du propriétaire*\n\n*Message :* ${customMessage}`;
            } else {
                // Sinon, on met un message par défaut.
                text = "📢 *Annonce importante pour tous les membres !*";
            }
            
            // 3. ENFIN, on envoie le tout.
            // Le texte est propre, et la liste des mentions est complète pour la notification.
            await sock.sendMessage(
                remoteJid,
                {
                    text: text,       // Le message simple et visible
                    mentions: mentions // La liste complète mais invisible des personnes à notifier
                },
                { quoted: msg }
            );

        } catch (error) {
            console.error("[ERREUR TAGALL]", error);
            await sock.sendMessage(remoteJid, { text: "❌ Oups, une erreur est survenue." }, { quoted: msg });
        }
    }
};