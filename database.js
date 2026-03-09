// database.js (Version mise à jour)

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./bot.db');
const log = (message) => console.log(`[DATABASE] ${message}`);

db.serialize(() => {
    log("Connexion à SQLite réussie.");
    // --- MODIFIÉ : Ajout de la colonne hasUsedPlay ---
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            firstSeen TEXT,
            commandCount INTEGER DEFAULT 0,
            isAdmin INTEGER DEFAULT 0,
            hasUsedPlay INTEGER DEFAULT 0 -- 0 pour non, 1 pour oui
        )
    `);
    // Commande "silencieuse" pour ajouter la colonne si elle manque.
    db.run("ALTER TABLE users ADD COLUMN hasUsedPlay INTEGER DEFAULT 0", () => {});
});

function getOrRegisterUser(userId, name) {
    const userNumber = userId.split('@')[0];
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE id = ?", [userNumber], (err, row) => {
            if (err) return reject(err);
            if (row) {
                resolve(row);
            } else {
                const firstSeen = new Date().toISOString();
                // --- MODIFIÉ : Ajout de hasUsedPlay lors de l'insertion ---
                db.run("INSERT INTO users (id, name, firstSeen, commandCount, isAdmin, hasUsedPlay) VALUES (?, ?, ?, 0, 0, 0)", [userNumber, name, firstSeen], (err) => {
                    if (err) return reject(err);
                    log(`Nouvel utilisateur enregistré : ${name} (${userNumber})`);
                    resolve({ id: userNumber, name, firstSeen, commandCount: 0, isAdmin: 0, hasUsedPlay: 0 });
                });
            }
        });
    });
}

function incrementCommandCount(userId) {
    const userNumber = userId.split('@')[0];
    return new Promise((resolve, reject) => {
        db.run("UPDATE users SET commandCount = commandCount + 1 WHERE id = ?", [userNumber], (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

// --- NOUVELLE FONCTION ---
function setHasUsedPlay(userId) {
    const userNumber = userId.split('@')[0];
    return new Promise((resolve, reject) => {
        db.run("UPDATE users SET hasUsedPlay = 1 WHERE id = ?", [userNumber], (err) => {
            if (err) return reject(err);
            log(`L'utilisateur ${userNumber} a utilisé sa commande .play.`);
            resolve();
        });
    });
}
// --- FIN ---

// Les fonctions admin et autres restent inchangées
async function setUserAdmin(userId, isAdmin) { /* ...votre code... */ }
async function isUserAdmin(userId) { /* ...votre code... */ }
function getTotalUsers() { /* ...votre code... */ }
function getTotalCommands() { /* ...votre code... */ }

module.exports = {
    getOrRegisterUser,
    incrementCommandCount,
    getTotalUsers,
    getTotalCommands,
    setUserAdmin,
    isUserAdmin,
    setHasUsedPlay, // <-- On exporte la nouvelle fonction
};