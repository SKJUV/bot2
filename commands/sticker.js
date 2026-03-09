// commands/sticker.js
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const fs = require('fs');
const path = require('path');
const log = require('../logger')(module);

// Configure fluent-ffmpeg pour utiliser le bon chemin
ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = {
    name: 'sticker',
    category: '🎵 Multimédia',
    description: 'Crée un sticker à partir d\'une image ou d\'un GIF.',
    adminOnly: false,
    run: async ({ sock, msg, replyWithTag }) => {
        const remoteJid = msg.key.remoteJid;
        log(`Commande reçue de ${remoteJid}`);

        // Définition des chemins temporaires au début
        const uniqueId = Date.now();
        const tempInputPath = path.join(__dirname, `../temp_sticker_input_${uniqueId}`);
        const tempOutputPath = path.join(__dirname, `../temp_sticker_output_${uniqueId}.webp`);

        try {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const messageWithMedia = quoted || msg.message;
            const mediaType = messageWithMedia.imageMessage ? 'image' : (messageWithMedia.videoMessage ? 'video' : null);

            if (!mediaType) {
                return replyWithTag(sock, remoteJid, msg, '❌ Veuillez envoyer une image/GIF ou y répondre.');
            }
            log(`Média trouvé. Type: ${mediaType}`);

            await replyWithTag(sock, remoteJid, msg, '⏳ Création de votre sticker en cours...');
            
            log("Téléchargement du média...");
            const stream = await downloadContentFromMessage(
                messageWithMedia.imageMessage || messageWithMedia.videoMessage,
                mediaType
            );
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            log(`Média téléchargé. Taille: ${buffer.length} bytes`);
            
            log(`Écriture dans le fichier d'entrée temporaire: ${tempInputPath}`);
            fs.writeFileSync(tempInputPath, buffer);
            
            log(`Lancement de la conversion FFmpeg depuis le fichier d'entrée...`);
            await new Promise((resolve, reject) => {
                ffmpeg(tempInputPath)
                    .outputOptions([
                        "-vcodec", "libwebp",
                        "-vf", "scale='min(512,iw)':'min(512,ih)':force_original_aspect_ratio=decrease,fps=15",
                        "-loop", "0", "-preset", "default", "-an", "-vsync", "0",
                    ])
                    .toFormat("webp")
                    .save(tempOutputPath)
                    .on("end", () => { log("Conversion FFmpeg terminée."); resolve(); })
                    .on("error", (err) => { log("Erreur FFmpeg:", err.message); reject(err); });
            });

            log("Envoi du sticker...");
            await sock.sendMessage(remoteJid, { sticker: { url: tempOutputPath } });
            log("Sticker envoyé.");

        } catch (error) {
            log("Erreur dans le bloc principal:", error.message);
            await replyWithTag(sock, remoteJid, msg, '❌ Erreur de création. Le format est peut-être invalide.');
        } finally {
            log("Nettoyage des fichiers temporaires...");
            if (fs.existsSync(tempInputPath)) { fs.unlinkSync(tempInputPath); }
            if (fs.existsSync(tempOutputPath)) { fs.unlinkSync(tempOutputPath); }
            log("Nettoyage terminé.");
        }
    }
};