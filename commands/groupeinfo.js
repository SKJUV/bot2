// commands/groupinfo.js
const log = require('../logger')(module);

module.exports = {
    name: 'groupinfo',
    description: "Affiche des informations de DÉBOGAGE sur le groupe et le statut du bot.",
    adminOnly: false,
    run: async ({ sock, msg, replyWithTag }) => {
        const remoteJid = msg.key.remoteJid;
        
        if (!remoteJid.endsWith('@g.us')) {
            return replyWithTag(sock, remoteJid, msg, "Cette commande ne peut être utilisée que dans un groupe.");
        }

        try {
            log("--- DÉBUT DÉBOGAGE 'groupinfo' ---");
            const groupMetadata = await sock.groupMetadata(remoteJid);
            
            // --- C'est ici que nous allons trouver l'erreur ---
            const botIdFromSocket = sock.user.id;
            const cleanedBotId = botIdFromSocket ? botIdFromSocket.split(':')[0] + '@s.whatsapp.net' : 'ID NON DÉFINI';
            const senderId = msg.key.participant || msg.key.remoteJid;
            
            log(`[INFO BRUTE] sock.user.id        : ${botIdFromSocket}`);
            log(`[ID BOT NETTOYÉ] cleanedBotId : ${cleanedBotId}`);
            log(`[ID EXPÉDITEUR] senderId      : ${senderId}`);

            const participants = groupMetadata.participants;
            const botParticipant = participants.find(p => p.id === cleanedBotId);
            
            if (participants.length > 0) {
                log(`[ID PARTICIPANT EXEMPLE] Premier participant dans la liste : ${participants[0].id}`);
            }
            log("--- FIN DÉBOGAGE 'groupinfo' ---");
            // --- Fin du bloc de débogage ---

            let botStatus = "Non trouvé (SYNC ERROR)";
            if (botParticipant) {
                botStatus = botParticipant.admin ? `Admin (${botParticipant.admin})` : "Membre simple";
            }
            
            const senderParticipant = participants.find(p => p.id === senderId);
            const senderStatus = senderParticipant.admin ? `Admin (${senderParticipant.admin})` : "Membre simple";

            const infoMessage = `*--- Informations du Groupe ---*

*Nom :* ${groupMetadata.subject}
*Membres :* ${participants.length}

*--- Statuts (Résultat du test) ---*
*Votre statut (identifié comme) :* ${senderStatus}
*Statut du bot (identifié comme) :* ${botStatus}`;
            
            await replyWithTag(sock, remoteJid, msg, infoMessage);

        } catch (error) {
            log("Erreur dans la commande 'groupinfo':", error);
            await replyWithTag(sock, remoteJid, msg, "❌ Impossible de récupérer les informations du groupe.");
        }
    }
};