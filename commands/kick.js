// commands/kick.js
const log = require('../logger')(module);

module.exports = {
    name: 'kick',
    category: '👥 Groupe',
    description: "Retire un membre du groupe.",
    adminOnly: true,
    groupAction: true,
    run: async ({ sock, msg, replyWithTag }) => {
        const remoteJid = msg.key.remoteJid;
        const delay = ms => new Promise(res => setTimeout(res, ms));

        if (!remoteJid.endsWith('@g.us')) {
            return replyWithTag(sock, remoteJid, msg, "Cette commande ne peut être utilisée que dans un groupe.");
        }

        const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (!mentionedJids || mentionedJids.length === 0) {
            return replyWithTag(sock, remoteJid, msg, "Veuillez mentionner la personne à retirer.\nExemple : `.kick @membre`");
        }

        try {
            const groupMetadata = await sock.groupMetadata(remoteJid);
            const senderJid = msg.key.participant || msg.key.remoteJid;
            const senderParticipant = groupMetadata.participants.find(p => p.id === senderJid);

            if (!senderParticipant?.admin) {
                return replyWithTag(sock, remoteJid, msg, "Vous devez être administrateur pour utiliser cette commande.");
            }

            const targetJid = mentionedJids[0];
            // On extrait le numéro de la cible, qui peut se terminer par @lid ou @s.whatsapp.net
            const targetNumber = targetJid.split('@')[0];

            if (targetJid === senderJid) {
                return replyWithTag(sock, remoteJid, msg, "😂 Vous ne pouvez pas vous retirer vous-même !");
            }
            if (targetJid === groupMetadata.owner) {
                 return replyWithTag(sock, remoteJid, msg, "❌ Je ne peux pas retirer le créateur du groupe.");
            }
            const targetParticipant = groupMetadata.participants.find(p => p.id === targetJid);
            if (targetParticipant?.admin) {
                return replyWithTag(sock, remoteJid, msg, `❌ Impossible de retirer @${targetNumber} car c'est aussi un(e) admin.`);
            }
            
            // --- SÉQUENCE D'EXPULSION ---
            
            await replyWithTag(sock, remoteJid, msg, "Ok, préparation de l'expulsion de tu sais qui 😂😂");
            await delay(2000); 

            // --- DÉBUT DE LA MODIFICATION POUR LE TAG ---
            // On remplace replyWithTag par sock.sendMessage pour pouvoir créer une vraie mention.
            await sock.sendMessage(remoteJid, {
                text: `📸 @${targetNumber}, say cheeeeese !`, // Le texte à afficher
                mentions: [targetJid]                       // Le JID de la personne à notifier
            }, { 
                quoted: msg  // On garde le 'quoted' pour que le message soit une réponse
            });
            // --- FIN DE LA MODIFICATION POUR LE TAG ---

            await delay(1000);

            await sock.groupParticipantsUpdate(
                remoteJid,
                [targetJid],
                "remove"
            );
            log(`Utilisateur ${targetJid} retiré du groupe ${groupMetadata.subject} par ${senderJid}`);

        } catch (error) {
            log("Erreur dans la commande 'kick':", error);
            await replyWithTag(sock, remoteJid, msg, "❌ Une erreur est survenue.");
        }
    }
};