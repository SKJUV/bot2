// commands/pp.js
const log = require('../logger')(module);

module.exports = {
    name: 'pp',
    description: "Affiche la photo de profil d'un utilisateur en haute qualité.",
    aliases: ['profil', 'pdp'], // Ajout d'alias pour la commande
    adminOnly: false,
    run: async ({ sock, msg, args, replyWithTag }) => {
        const remoteJid = msg.key.remoteJid;
        
        try {
            // --- Logique pour déterminer la cible ---
            let targetJid;
            const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;

            if (mentionedJids && mentionedJids.length > 0) {
                // Priorité 1 : La personne mentionnée
                targetJid = mentionedJids[0];
            } else if (quotedParticipant) {
                // Priorité 2 : La personne dont le message est cité
                targetJid = quotedParticipant;
            } else {
                // Priorité 3 : L'expéditeur de la commande lui-même
                targetJid = msg.key.participant || remoteJid;
            }
            
            // On informe l'utilisateur que la recherche est en cours
            await replyWithTag(sock, remoteJid, msg, "⏳ Recherche de la photo de profil...");

            // --- Récupération de l'URL de l'image en haute qualité ---
            const ppUrl = await sock.profilePictureUrl(targetJid, 'image');
            
            // --- Envoi de l'image avec une mention ---
            const targetNumber = targetJid.split('@')[0];
            await sock.sendMessage(remoteJid, {
                image: { url: ppUrl },
                caption: `Voici la photo de profil de @${targetNumber} !`,
                mentions: [targetJid] // Vraie mention de la cible
            }, { quoted: msg });

        } catch (error) {
            // Cette erreur se produit souvent si l'utilisateur n'a pas de PP (erreur 404)
            log("Erreur dans la commande 'pp':", error.message);
            await replyWithTag(sock, remoteJid, msg, "❌ Impossible de récupérer la photo. L'utilisateur n'a peut-être pas de photo de profil ou l'a masquée.");
        }
    }
};