// commands/play.js
const Youtube = require('youtube-sr').default;
const ytDlpExec = require('yt-dlp-exec');
const path = require('path');
const fs = require('fs');
const log = require('../logger')(module);
const { path: ffmpegPath } = require('@ffmpeg-installer/ffmpeg');

// --- Liste enrichie de mots interdits ---
// --- Liste enrichie de mots interdits ---
const explicitWords = [
    // 🔹 Anglais international
    'porn', 'porno', 'xxx', 'sex', 'sexe', '18+', 'nsfw',
    'erotic', 'erotique', 'nude', 'boobs', 'tits', 'ass', 'fuck',
    'dick', 'cock', 'pussy', 'vagina', 'cum', 'sperm', 'orgasm',
    'masturb', 'handjob', 'blowjob', 'fellatio', 'sodomie', 'anal',
    'gangbang', 'milf', 'teen porn', 'stepmom', 'stepdad', 'incest',
    'fetish', 'bdsm', 'bondage', 'hardcore', 'deepthroat', 'strapon',
    'nipple', 'naked', 'slut', 'whore', 'prostitute', 'hooker',
    'doggystyle', '69', 'hentai', 'camgirl', 'onlyfans',

    // 🔹 Français
    'bite', 'queue', 'chatte', 'zizi', 'seins', 'nichons', 'fesses',
    'branlette', 'branler', 'cul', 'enculer', 'baiser', 'baise',
    'partouze', 'putain', 'pute', 'salope', 'salaud', 'niquer',
    'gicler', 'jouir', 'orgasme', 'jouissance', 'levrette',
    'sucer', 'sodomiser', 'défoncer', 'tripoter', 'caresser',
    'pénétrer', 'pénétration', 'fellation', 'culotte mouillée','pénétration','masturbation',

    // --- NOUVEAU : Emojis à connotation explicite ---
    '🍆', '🍑', '💦', '🥵', '😏', '🍌', '👉👌',

    // --- NOUVEAU : Noms de marques / sites / genres très connus ---
    'brazzers', 'pornhub', 'xvideos', 'youporn', 'xnxx', 'redtube',
    'faketaxi', 'blacked', 'tushy', 'vixen', 'naughty america', 
    'chaturbate', 'fansly', 'rule34', 'r34', 'boule',

    // 🔹 Cameroun / Afrique (argot local)
    'mbombo',      // seins
    'ndoss',       // sexe féminin
    'kon',         // vagin
    'mbam',        // fesses
    'nkup',        // sexe masculin
    'ngassa',      // prostituée
    'pompé',       // fellation (pomper)
    'nkoun',       // vagin (argot)
    'bimser',      // rapport sexuel
    'tchop mbanga', // connotation sexuelle
    'nkap di pussy', // argent contre sexe
    'mbombo show',   // exhiber ses seins
    'kpaf',        // prostituée
    'mimbo-sex',   // sexe en échange d’alcool
    'chop kon',    // rapport sexuel
    'tchoko sex',  // sexe contre argent
    'grind',       // rapport sexuel (argot)
    'mimbo for sex', // alcool contre sexe
    'bangala',     // pénis
    'zogo sex',    // viol ou sexe forcé (argot)
    'pétou',       // fesses
    'dozo',        // prostituée
    'nyamangoro',  // prostituée (argot congolais)
    'djo sex',     // rapport sexuel avec un homme
    'kok',         // pénis (argot)
    'tchop bangala', // sexe avec pénis
    'mogo sex',    // partenaire sexuel
];

// --- Fonction utilitaire de détection ---
function isExplicit(text) {
    return explicitWords.some(word => text.toLowerCase().includes(word));
}

module.exports = {
    name: 'play',
    category: '🎵 Multimédia',
    description: "Recherche et envoie une chanson depuis YouTube.",
    adminOnly: false,
    run: async ({ sock, msg, args, replyWithTag }) => {
        const query = args.join(" ");
        const remoteJid = msg.key.remoteJid;
        log(`Commande reçue de ${remoteJid}. Recherche: "${query}"`);

        if (!query) {
            return replyWithTag(sock, remoteJid, msg, "Veuillez entrer le nom d'une chanson.");
        }

        // --- Vérification du contenu de la recherche ---
        if (isExplicit(query)) {
            log(`Recherche bloquée (requête explicite): "${query}"`);
            return replyWithTag(sock, remoteJid, msg, "❌ Désolé, la recherche de contenu explicite ou inapproprié n'est pas autorisée.");
        }

        const audioPath = path.join('/tmp', `temp_audio_${Date.now()}.mp3`);

        try {
            await replyWithTag(sock, remoteJid, msg, `🔎 Recherche de "${query}"...`);
            log(`Lancement de la recherche sur YouTube...`);

            const video = await Youtube.searchOne(query);
            if (!video) {
                return replyWithTag(sock, remoteJid, msg, "Aucun résultat trouvé pour cette recherche.");
            }
            log(`Vidéo trouvée: "${video.title}"`);

            // --- Vérification du titre de la vidéo ---
            if (isExplicit(video.title)) {
                log(`Vidéo bloquée (titre explicite): "${video.title}"`);
                return replyWithTag(sock, remoteJid, msg, "❌ Le contenu trouvé est explicite, recherche annulée.");
            }

            // --- BLOC AMÉLIORÉ : VÉRIFICATION DE LA DURÉE ---
            const maxDurationMinutes = 5;
            const maxDurationMs = maxDurationMinutes * 60 * 1000; // 10 minutes en millisecondes

            if (video.duration > maxDurationMs) {
                log(`Vidéo bloquée (trop longue): "${video.title}" - Durée: ${video.durationFormatted}`);

                // Création du message informatif et structuré
                const limitFormatted = `${maxDurationMinutes}:00`;
                const userMessage = `🚫 *Vidéo trop longue !* 🚫

J'ai bien trouvé votre vidéo :
*"${video.title}"*

Cependant, elle dépasse la durée maximale autorisée.

  - *Durée de la vidéo* : \`${video.durationFormatted}\`
  - *Limite autorisée* : \`${limitFormatted}\`

Veuillez réessayer avec une vidéo de moins de ${maxDurationMinutes} minutes.`;

                return replyWithTag(sock, remoteJid, msg, userMessage);
            }
            // --- FIN DU BLOC AMÉLIORÉ ---


            await replyWithTag(sock, remoteJid, msg, `⏳ Téléchargement et conversion de *${video.title}*...`);
            log(`Lancement du téléchargement avec yt-dlp...`);

            await ytDlpExec(video.url, {
                output: audioPath,
                extractAudio: true,
                audioFormat: 'mp3',
                format: 'bestaudio/best',
                ffmpegLocation: ffmpegPath,
                ...getCookieOptions()
            });
            log(`Téléchargement et conversion terminés.`);

            if (fs.existsSync(audioPath)) {
                log(`Fichier audio trouvé. Envoi...`);
                await sock.sendMessage(remoteJid, {
                    audio: { url: audioPath },
                    mimetype: 'audio/mp4'
                }, { quoted: msg });
                log(`Audio envoyé.`);
            } else {
                throw new Error("Le fichier audio n'a pas été créé par yt-dlp.");
            }

        } catch (error) {
            log("Erreur dans le bloc principal:", error.message);
            // On peut aussi log l'erreur entière pour plus de détails en débogage: log(error);
            await replyWithTag(sock, remoteJid, msg, "❌ Une erreur est survenue lors du téléchargement. Veuillez réessayer.");
        } finally {
            if (fs.existsSync(audioPath)) {
                fs.unlinkSync(audioPath);
                log(`Fichier temporaire supprimé: ${audioPath}`);
            }
        }
    }
};