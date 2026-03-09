// commands/add.js
const log = require('../logger')(module);

// --- Message de récapitulatif du groupe ---
// Placé ici en haut pour être facile à trouver et à modifier
// Personnalisez ce message selon les règles de votre groupe
const groupRecapMessage = process.env.GROUP_WELCOME_MESSAGE || `📋 *Bienvenue dans le groupe !*\n\n• Présentation obligatoire\n• Respectez les règles du groupe\n• Tapez .help pour voir les commandes disponibles`;
// --- FIN DU NOUVEAU BLOC ---

module.exports = {
    name: 'add',
    category: '👥 Groupe',
    description: "Ajoute un membre au groupe.",
    adminOnly: true,
    groupAction: true,
    run: async ({ sock, msg, args, replyWithTag }) => {
        const remoteJid = msg.key.remoteJid;
        const delay = ms => new Promise(res => setTimeout(res, ms)); // Fonction de pause

        if (!remoteJid.endsWith('@g.us')) {
            return replyWithTag(sock, remoteJid, msg, "Cette commande ne peut être utilisée que dans un groupe.");
        }

        if (!args[0]) {
            return replyWithTag(sock, remoteJid, msg, "Veuillez spécifier le numéro de la personne à ajouter.\nExemple : `.add 237699112233`");
        }

        try {
            const groupMetadata = await sock.groupMetadata(remoteJid);
            const participants = groupMetadata.participants;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            const senderParticipant = participants.find(p => p.id === senderJid);
            
            if (!senderParticipant?.admin) {
                return replyWithTag(sock, remoteJid, msg, "Vous devez être administrateur pour utiliser cette commande.");
            }

            const numberToAdd = args[0].replace(/\D/g, '');
            const targetJid = `${numberToAdd}@s.whatsapp.net`;

            if (participants.some(p => p.id.startsWith(numberToAdd))) {
                return replyWithTag(sock, remoteJid, msg, `@${numberToAdd} est déjà dans le groupe.`);
            }

            const response = await sock.groupParticipantsUpdate(remoteJid, [targetJid], "add");
            const result = response[0];
            
            if (result.status == "200") {
                log(`Utilisateur ${targetJid} ajouté au groupe ${groupMetadata.subject} par ${senderJid}`);
                
                // 1. Envoi du message de bienvenue avec tag
                await sock.sendMessage(remoteJid, {
                    text: `✅ Bienvenue à @${numberToAdd} dans notre groupe !`,
                    mentions: [targetJid]
                }, { quoted: msg });
                
                // --- NOUVEAU : Envoyer le récapitulatif après une petite pause ---
                await delay(1500); // Pause de 1.5 secondes pour un effet plus naturel

                // 2. Envoi du message de récapitulatif
                await sock.sendMessage(remoteJid, {
                    text: groupRecapMessage
                });
                // --- FIN DE L'AJOUT ---

            } else if (result.status == "403") {
                 await replyWithTag(sock, remoteJid, msg, `❌ Impossible d'ajouter @${numberToAdd}. Cette personne a sûrement des paramètres de confidentialité qui bloquent les invitations.`);
            } else if (result.status == "408") {
                 await replyWithTag(sock, remoteJid, msg, `❌ Impossible d'ajouter @${numberToAdd}. Ce numéro n'est pas valide ou n'utilise pas WhatsApp.`);
            } else {
                 log(`Erreur d'ajout non gérée: status ${result.status}`);
                 await replyWithTag(sock, remoteJid, msg, `❌ Une erreur inconnue est survenue lors de l'ajout (Code: ${result.status}).`);
            }

        } catch (error) {
            log("Erreur dans la commande 'add':", error);
            await replyWithTag(sock, remoteJid, msg, "❌ Une erreur s'est produite. Assurez-vous que le numéro est valide et au format international.");
        }
    }
};