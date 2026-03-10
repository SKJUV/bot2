// commands/deo.js
const Youtube = require('youtube-sr').default;
const ytDlpExec = require('yt-dlp-exec');
const path = require('path');
const fs = require('fs');
const log = require('../logger')(module);
const { path: ffmpegPath } = require('@ffmpeg-installer/ffmpeg');
const { isExplicit } = require('../utils/filter');
const { getCookieOptions } = require('../utils/cookies');

module.exports = {
    name: 'deo',
    category: '🎵 Multimédia',
    description: "Recherche et envoie une vidéo YouTube optimisée pour le poids.",
    aliases: ['video', 'vid'],
    adminOnly: false,
    run: async ({ sock, msg, args, replyWithTag }) => {
        const maxDurationMinutes = 10;
        const maxSizeMb = 15;
        const maxDurationMs = maxDurationMinutes * 60 * 1000;
        const maxSizeBytes = maxSizeMb * 1024 * 1024;

        const query = args.join(" ");
        const remoteJid = msg.key.remoteJid;
        log(`Commande deo reçue. Recherche: "${query}"`);

        if (!query) return replyWithTag(sock, remoteJid, msg, "Veuillez entrer le nom d'une vidéo.");
        if (isExplicit(query)) return replyWithTag(sock, remoteJid, msg, "Sérieusement ? C'est *ça* que tu cherches ? C'est un peu triste. 🧼 Tiens, un peu de savon. Ça ne te donnera pas une personnalité, mais c'est un début. Recherche refusée.");

        const videoPath = path.join(process.env.TEMP_DIR || '/tmp', `temp_video_${Date.now()}.mp4`);

        try {
            await replyWithTag(sock, remoteJid, msg, `🔎 Recherche de "${query}"...`);
            const video = await Youtube.searchOne(query);

            if (!video) return replyWithTag(sock, remoteJid, msg, "Aucun résultat trouvé.");
            log(`Vidéo trouvée: "${video.title}"`);
            if (isExplicit(video.title)) return replyWithTag(sock, remoteJid, msg, "❌ Le contenu trouvé est explicite, recherche annulée.");

            if (video.duration > maxDurationMs) {
                return replyWithTag(sock, remoteJid, msg, `🚫 *Vidéo trop longue !* (${video.durationFormatted}). Limite : *${maxDurationMinutes} minutes*.`);
            }
            log(`Durée vérifiée (${video.durationFormatted}), OK.`);

            // --- NOUVELLE LOGIQUE "SMART PRE-CHECK" ---
            await replyWithTag(sock, remoteJid, msg, `💡 Analyse des formats et poids disponibles...`);
            const metadata = await ytDlpExec(video.url, { dumpSingleJson: true, remoteComponents: 'ejs:github', ...getCookieOptions() });

            const qualityTiers = [720, 480, 360];
            let selectedFormat = null;
            let finalSizeMb = 0;

            // Trouver le meilleur format audio séparé (s'il existe)
            const bestAudio = metadata.formats.filter(f => f.acodec !== 'none' && f.vcodec === 'none').sort((a, b) => (b.filesize_approx || b.filesize || 0) - (a.filesize_approx || a.filesize || 0))[0];

            for (const quality of qualityTiers) {
                log(`Analyse pour la qualité ${quality}p...`);
                let estimatedSize = 0;

                // 1. Chercher un format combiné (vidéo + audio)
                const combinedFormat = metadata.formats.filter(f => f.vcodec !== 'none' && f.acodec !== 'none' && f.height <= quality).sort((a, b) => b.height - a.height)[0];

                // 2. Chercher un format vidéo seul (si audio séparé dispo)
                const videoOnlyFormat = bestAudio ? metadata.formats.filter(f => f.vcodec !== 'none' && f.acodec === 'none' && f.height <= quality).sort((a, b) => b.height - a.height)[0] : null;

                if (combinedFormat) {
                    estimatedSize = combinedFormat.filesize_approx || combinedFormat.filesize || 0;
                    selectedFormat = combinedFormat.format_id;
                } else if (videoOnlyFormat && bestAudio) {
                    estimatedSize = (videoOnlyFormat.filesize_approx || videoOnlyFormat.filesize || 0) + (bestAudio.filesize_approx || bestAudio.filesize || 0);
                    selectedFormat = `${videoOnlyFormat.format_id}+${bestAudio.format_id}`;
                }

                if (selectedFormat) {
                    if (estimatedSize > 0) {
                        finalSizeMb = (estimatedSize / (1024 * 1024)).toFixed(2);
                        if (estimatedSize <= maxSizeBytes) {
                            log(`Format valide trouvé: ${quality}p. Poids estimé: ${finalSizeMb} Mo`);
                            break;
                        } else {
                            log(`Format ${quality}p trop lourd. Poids estimé: ${finalSizeMb} Mo`);
                            selectedFormat = null; // On annule et on passe à la qualité inférieure
                        }
                    } else {
                        finalSizeMb = "Inconnu";
                        log(`Format valide trouvé: ${quality}p (Poids inconnu).`);
                        break;
                    }
                }
            }

            if (!selectedFormat) {
                log("Aucun précis format n'a validé les critères, tentative de fallback...");
                selectedFormat = "best[height<=720]";
                finalSizeMb = "Inconnu";
            }

            // --- TÉLÉCHARGEMENT ---
            if (selectedFormat) {
                await replyWithTag(sock, remoteJid, msg, `✅ Qualité *${selectedFormat.split('+')[0]} (${finalSizeMb} Mo)* sélectionnée. Téléchargement...`);
                log(`Lancement du téléchargement avec le format optimisé: ${selectedFormat}`);

                await ytDlpExec(video.url, {
                    output: videoPath,
                    format: selectedFormat,
                    ffmpegLocation: ffmpegPath,
                    remoteComponents: 'ejs:github',
                    ...getCookieOptions()
                });
                log(`Téléchargement et fusion terminés.`);
            } else {
                return replyWithTag(sock, remoteJid, msg, `🦣 *Vidéo trop lourde !*\nMême en 360p, le poids estimé (${finalSizeMb} Mo) dépasse la limite de ${maxSizeMb} Mo.`);
            }

            if (fs.existsSync(videoPath)) {
                log(`Fichier vidéo trouvé. Envoi...`);
                await sock.sendMessage(remoteJid, {
                    video: { url: videoPath },
                    mimetype: 'video/mp4',
                    caption: `*${video.title}*`
                }, { quoted: msg });
                log(`Vidéo envoyée.`);
            } else {
                throw new Error("Le fichier vidéo n'a pas été créé par yt-dlp après la fusion.");
            }

        } catch (error) {
            log("Erreur détaillée dans le bloc 'deo':", error);
            await replyWithTag(sock, remoteJid, msg, "❌ Une erreur est survenue lors du téléchargement. La vidéo est peut-être privée, protégée ou n'a pas de formats compatibles.");
        } finally {
            if (fs.existsSync(videoPath)) {
                fs.unlinkSync(videoPath);
                log(`Fichier temporaire supprimé: ${videoPath}`);
            }
        }
    }
};