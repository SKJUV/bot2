// commands/extract.js (Version normale, sans privilèges et sans envoi privé)

const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const log = (...args) => console.log('[EXTRACT]', ...args);

module.exports = {
    name: 'extract',
    description: "Extrait et renvoie un média 'vue unique' dans la discussion actuelle.",
    
    // On n'a plus besoin de "senderId" ou "senderNumber", juste des infos de base.
    run: async ({ sock, msg, replyWithTag }) => {
        // La destination est maintenant le chat d'où provient le message.
        const remoteJid = msg.key.remoteJid;
        
        // --- LE BLOC DE VÉRIFICATION DES PERMISSIONS A ÉTÉ COMPLÈTEMENT SUPPRIMÉ ---

        log(`Commande reçue de ${msg.key.participant || remoteJid} dans le chat ${remoteJid}`);

        try {
            const context = msg.message?.extendedTextMessage?.contextInfo;
            if (!context || !context.quotedMessage) {
                return replyWithTag(sock, remoteJid, msg, '❌ Veuillez répondre à un média vue unique.');
            }
            
            let quoted = context.quotedMessage;
            const isDirectViewOnce = quoted.imageMessage?.viewOnce || quoted.videoMessage?.viewOnce || quoted.audioMessage?.viewOnce;
            const wrapperViewOnce = quoted?.viewOnceMessage?.message || quoted?.viewOnceMessageV2?.message;
            const finalMessage = isDirectViewOnce ? quoted : wrapperViewOnce;
            
            if (!finalMessage) {
                return replyWithTag(sock, remoteJid, msg, '❌ Ce message n\'est pas un média vue unique compatible.');
            }

            let mediaMessage, mediaType;
            if (finalMessage.imageMessage) { mediaMessage = finalMessage.imageMessage; mediaType = 'image'; } 
            else if (finalMessage.videoMessage) { mediaMessage = finalMessage.videoMessage; mediaType = 'video'; }
            else if (finalMessage.audioMessage) { mediaMessage = finalMessage.audioMessage; mediaType = 'audio'; }
            
            if (!mediaMessage || !mediaMessage.mediaKey) {
                 return replyWithTag(sock, remoteJid, msg, '⚠️ Impossible de récupérer ce média. Il est probablement trop ancien.');
            }
            
            log(`Extraction d'un média de type "${mediaType}"...`);
            const stream = await downloadContentFromMessage(mediaMessage, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }

            if (buffer.length === 0) {
                return replyWithTag(sock, remoteJid, msg, '⚠️ Le téléchargement a échoué (fichier vide).');
            }

            const caption = '👁️‍🗨️ Média à vue unique capturé !';
            
            log(`Envoi du média dans le chat ${remoteJid}`);

            // --- MODIFICATION : On envoie à "remoteJid" et on cite le message original ---
            if (mediaType === 'image') {
                await sock.sendMessage(remoteJid, { image: buffer, caption }, { quoted: msg });
            } else if (mediaType === 'video') {
                await sock.sendMessage(remoteJid, { video: buffer, caption }, { quoted: msg });
            } else if (mediaType === 'audio') {
                await sock.sendMessage(remoteJid, { audio: buffer, mimetype: 'audio/mp4' }, { quoted: msg });
            }
            
            // On a supprimé le message de confirmation, car l'envoi du média lui-même est la confirmation.

        } catch (err) {
            console.error('[EXTRACT] Erreur:', err);
            await replyWithTag(sock, remoteJid, msg, '⚠️ Une erreur inattendue est survenue lors de l\'extraction.');
        }
    }
};