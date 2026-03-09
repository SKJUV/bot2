// commands/promote.js
const log = require('../logger')(module);

module.exports = {
    name: 'promote',
    category: '👥 Groupe',
    description: "Nomme un membre 'admin' du groupe.",
    adminOnly: true,
    groupAction: true,
    run: async ({ sock, msg, replyWithTag }) => {
        const remoteJid = msg.key.remoteJid;

        // --- Vérifications initiales ---
        if (!remoteJid.endsWith('@g.us')) {
            return replyWithTag(sock, remoteJid, msg, "Cette commande ne peut être utilisée que dans un groupe.");
        }
        
        const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (!mentionedJids || mentionedJids.length === 0) {
            return replyWithTag(sock, remoteJid, msg, "Veuillez mentionner la personne à promouvoir.\nExemple : `.promote @membre`");
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
            
            // --- CORRECTION 2 : Vérification pour éviter une action inutile ---
            // On vérifie si la cible est déjà admin.
            if (targetParticipant?.admin) {
                return replyWithTag(sock, remoteJid, msg, `💡 @${targetNumber} est déjà un(e) admin, pas besoin de le re-promouvoir !`);
            }

            // Action de promotion
            await sock.groupParticipantsUpdate(
                remoteJid,
                [targetJid],
                "promote"
            );
            
            log(`Utilisateur ${targetJid} promu admin dans ${groupMetadata.subject}, action par ${senderJid}`);
            
            // --- CORRECTION 3 : Vraie mention dans le message de félicitations ---
            await sock.sendMessage(remoteJid, {
                text: `🎉 Félicitations @${targetNumber} ! Vous avez été promu(e) admin. Utilisez vos nouveaux pouvoirs à bon escient !`,
                mentions: [targetJid] // Le JID de la personne à notifier
            }, { quoted: msg });

        } catch (error) {
            log("Erreur dans la commande 'promote':", error);
            await replyWithTag(sock, remoteJid, msg, "❌ Une erreur est survenue.");
        }
    }
};