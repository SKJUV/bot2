// commands/demote.js
const log = require('../logger')(module);

module.exports = {
    name: 'demote',
    description: "Retire le statut d'admin d'un membre.",
    adminOnly: true,
    run: async ({ sock, msg, replyWithTag }) => {
        const remoteJid = msg.key.remoteJid;

        // --- Vérifications initiales ---
        if (!remoteJid.endsWith('@g.us')) {
            return replyWithTag(sock, remoteJid, msg, "Cette commande ne peut être utilisée que dans un groupe.");
        }
        
        const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (!mentionedJids || mentionedJids.length === 0) {
            return replyWithTag(sock, remoteJid, msg, "Veuillez mentionner l'admin à rétrograder.\nExemple : `.demote @admin`");
        }
        
        try {
            const groupMetadata = await sock.groupMetadata(remoteJid);
            const participants = groupMetadata.participants;

            // --- CORRECTION 1 : Vérification des droits de l'expéditeur ---
            const senderJid = msg.key.participant || msg.key.remoteJid;
            const senderParticipant = participants.find(p => p.id === senderJid);
            
            if (!senderParticipant?.admin) {
                return replyWithTag(sock, remoteJid, msg, "Vous devez être administrateur pour utiliser cette commande.");
            }

            const targetJid = mentionedJids[0];
            const targetNumber = targetJid.split('@')[0];
            const targetParticipant = participants.find(p => p.id === targetJid);

            // --- CORRECTION 2 : Ajout de logiques de vérification ---
            
            // On ne peut pas rétrograder le créateur du groupe
            if (targetJid === groupMetadata.owner) {
                 return replyWithTag(sock, remoteJid, msg, "❌ On ne peut pas toucher au créateur du groupe, c'est le big boss !");
            }
            
            // On vérifie si la cible est bien admin avant d'agir
            if (!targetParticipant?.admin) {
                return replyWithTag(sock, remoteJid, msg, `🤔 @${targetNumber} n'est pas un(e) admin. Je ne peux pas lui retirer des pouvoirs qu'il/elle n'a pas.`);
            }

            // Action de rétrogradation
            await sock.groupParticipantsUpdate(
                remoteJid,
                [targetJid],
                "demote"
            );
            
            log(`Utilisateur ${targetJid} n'est plus admin dans ${groupMetadata.subject}, action par ${senderJid}`);

            // --- CORRECTION 3 : Vraie mention dans le message de confirmation ---
            await sock.sendMessage(remoteJid, {
                text: `📝 @${targetNumber} redevient un simple mortel et n'est plus admin.`,
                mentions: [targetJid] // Le JID de la personne à notifier
            }, { quoted: msg });


        } catch (error) {
            log("Erreur dans la commande 'demote':", error);
            await replyWithTag(sock, remoteJid, msg, "❌ Une erreur est survenue.");
        }
    }
};