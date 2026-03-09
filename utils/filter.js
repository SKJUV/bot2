// utils/filter.js
// Module centralisé de filtrage de contenu explicite

const explicitWords = [
    // Anglais international
    'porn', 'porno', 'xxx', 'sex', 'sexe', '18+', 'nsfw',
    'erotic', 'erotique', 'nude', 'boobs', 'tits', 'ass', 'fuck',
    'dick', 'cock', 'pussy', 'vagina', 'cum', 'sperm', 'orgasm',
    'masturb', 'handjob', 'blowjob', 'fellatio', 'sodomie', 'anal',
    'gangbang', 'milf', 'teen porn', 'stepmom', 'stepdad', 'incest',
    'fetish', 'bdsm', 'bondage', 'hardcore', 'deepthroat', 'strapon',
    'nipple', 'naked', 'slut', 'whore', 'prostitute', 'hooker',
    'doggystyle', '69', 'hentai', 'camgirl', 'onlyfans',

    // Français
    'bite', 'queue', 'chatte', 'zizi', 'seins', 'nichons', 'fesses',
    'branlette', 'branler', 'cul', 'enculer', 'baiser', 'baise',
    'partouze', 'putain', 'pute', 'salope', 'salaud', 'niquer',
    'gicler', 'jouir', 'orgasme', 'jouissance', 'levrette',
    'sucer', 'sodomiser', 'défoncer', 'tripoter',
    'pénétrer', 'pénétration', 'fellation', 'masturbation',

    // Emojis
    '🍆', '🍑', '💦', '🥵', '😏', '🍌', '👉👌',

    // Sites / marques
    'brazzers', 'pornhub', 'xvideos', 'youporn', 'xnxx', 'redtube',
    'faketaxi', 'blacked', 'tushy', 'vixen', 'naughty america',
    'chaturbate', 'fansly', 'rule34', 'r34',

    // Noms d'acteurs/actrices adultes
    'mia khalifa', 'lana rhoades', 'riley reid', 'eva elfie', 'johnny sins',
    'abella danger', 'angela white', 'sasha grey', 'brandi love', 'asa akira',

    // Cameroun / Afrique (argot local)
    'mbombo', 'ndoss', 'kon', 'mbam', 'nkup', 'ngassa', 'pompé', 'nkoun', 'bimser',
    'tchop mbanga', 'nkap di pussy', 'mbombo show', 'kpaf', 'mimbo-sex', 'chop kon',
    'tchoko sex', 'mimbo for sex', 'bangala', 'zogo sex', 'pétou', 'dozo',
    'nyamangoro', 'djo sex', 'kok', 'tchop bangala', 'mogo sex',
];

/**
 * Vérifie si un texte contient du contenu explicite.
 * @param {string} text - Le texte à vérifier
 * @returns {boolean} true si du contenu explicite est détecté
 */
function isExplicit(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return explicitWords.some(word => lower.includes(word));
}

module.exports = { isExplicit, explicitWords };
