// commands/owner.js — Panneau d'administration du propriétaire
const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'owner',
    category: '👑 Admin',
    description: "Panneau d'administration réservé au propriétaire.",
    aliases: ['admin', 'panel'],
    ownerOnly: true,
    run: async ({ sock, msg, args, replyWithTag, commands, aliases, db, startTime, senderNumber }) => {
        const remoteJid = msg.key.remoteJid;
        const sub = (args[0] || '').toLowerCase();

        // --- Menu principal ---
        if (!sub) {
            const PREFIX = process.env.PREFIX || '.';
            const menu = [
                `╭───≼ 👑 *Panel Admin* ≽───╮`,
                `│`,
                `│  📋 *Sous-commandes :*`,
                `│`,
                `│  ◈ ${PREFIX}owner *stats*`,
                `│     ↳ _Statistiques du bot_`,
                `│`,
                `│  ◈ ${PREFIX}owner *reload*`,
                `│     ↳ _Recharger les commandes_`,
                `│`,
                `│  ◈ ${PREFIX}owner *broadcast* <msg>`,
                `│     ↳ _Envoyer un message à tous_`,
                `│`,
                `│  ◈ ${PREFIX}owner *eval* <code>`,
                `│     ↳ _Exécuter du code JS_`,
                `│`,
                `│  ◈ ${PREFIX}owner *ban* <numéro>`,
                `│     ↳ _Bannir un utilisateur_`,
                `│`,
                `│  ◈ ${PREFIX}owner *unban* <numéro>`,
                `│     ↳ _Débannir un utilisateur_`,
                `│`,
                `╰───≼ 👑 ≽───╯`
            ].join('\n');
            return replyWithTag(sock, remoteJid, msg, menu);
        }

        // --- Stats ---
        if (sub === 'stats') {
            const uptimeMs = Date.now() - startTime.getTime();
            const hours = Math.floor(uptimeMs / 3600000);
            const minutes = Math.floor((uptimeMs % 3600000) / 60000);
            const seconds = Math.floor((uptimeMs % 60000) / 1000);

            const totalUsers = await db.getTotalUsers();
            const totalCommands = await db.getTotalCommands();
            const memUsage = process.memoryUsage();
            const memMB = (memUsage.heapUsed / 1024 / 1024).toFixed(1);

            const stats = [
                `╭───≼ 📊 *Statistiques* ≽───╮`,
                `│`,
                `│  ⏱️ *Uptime :* ${hours}h ${minutes}m ${seconds}s`,
                `│  👥 *Utilisateurs :* ${totalUsers}`,
                `│  📨 *Commandes exécutées :* ${totalCommands}`,
                `│  📦 *Commandes chargées :* ${commands.size}`,
                `│  💾 *Mémoire (heap) :* ${memMB} MB`,
                `│  🖥️ *Plateforme :* ${process.platform} (${process.arch})`,
                `│  📦 *Node.js :* ${process.version}`,
                `│`,
                `╰───≼ 📊 ≽───╯`
            ].join('\n');
            return replyWithTag(sock, remoteJid, msg, stats);
        }

        // --- Reload ---
        if (sub === 'reload') {
            const commandsDir = path.join(__dirname);
            let loaded = 0;
            let errors = 0;

            for (const file of fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'))) {
                try {
                    // Supprimer du cache require
                    const filePath = path.join(commandsDir, file);
                    delete require.cache[require.resolve(filePath)];
                    const command = require(filePath);
                    if (command.name) {
                        commands.set(command.name, command);
                        if (command.aliases && Array.isArray(command.aliases)) {
                            for (const alias of command.aliases) {
                                aliases.set(alias, command.name);
                            }
                        }
                        loaded++;
                    }
                } catch (e) {
                    console.error(`[Reload] Erreur : ${file}`, e.message);
                    errors++;
                }
            }

            return replyWithTag(sock, remoteJid, msg, `🔄 *Reload terminé !*\n\n✅ ${loaded} commandes rechargées\n${errors > 0 ? `❌ ${errors} erreurs` : '🎉 Aucune erreur'}`);
        }

        // --- Broadcast ---
        if (sub === 'broadcast' || sub === 'bc') {
            const message = args.slice(1).join(' ');
            if (!message) {
                return replyWithTag(sock, remoteJid, msg, '❌ Usage : `.owner broadcast <message>`');
            }

            const BOT_NAME = process.env.BOT_NAME || 'WhatsBot';
            const broadcastText = `📢 *Annonce de ${BOT_NAME}*\n\n${message}`;

            // Envoyer dans tous les groupes où le bot est présent
            const chats = await sock.groupFetchAllParticipating();
            const groupIds = Object.keys(chats);
            let sent = 0;

            for (const groupId of groupIds) {
                try {
                    await sock.sendMessage(groupId, { text: broadcastText });
                    sent++;
                    // Petit délai pour éviter le rate limit WhatsApp
                    await new Promise(r => setTimeout(r, 1000));
                } catch (e) {
                    console.error(`[Broadcast] Erreur pour ${groupId}:`, e.message);
                }
            }

            return replyWithTag(sock, remoteJid, msg, `📢 *Broadcast terminé !*\n\n✅ Envoyé à ${sent}/${groupIds.length} groupes.`);
        }

        // --- Eval ---
        if (sub === 'eval' || sub === 'e') {
            const code = args.slice(1).join(' ');
            if (!code) {
                return replyWithTag(sock, remoteJid, msg, '❌ Usage : `.owner eval <code>`');
            }

            try {
                let result = eval(code);
                if (result instanceof Promise) result = await result;
                if (typeof result !== 'string') result = require('util').inspect(result, { depth: 2 });
                
                // Tronquer si trop long
                if (result.length > 3000) result = result.slice(0, 3000) + '\n... (tronqué)';
                
                await replyWithTag(sock, remoteJid, msg, `✅ *Résultat :*\n\n\`\`\`\n${result}\n\`\`\``);
            } catch (e) {
                await replyWithTag(sock, remoteJid, msg, `❌ *Erreur :*\n\n\`\`\`\n${e.message}\n\`\`\``);
            }
            return;
        }

        // --- Ban dynamique ---
        if (sub === 'ban') {
            const target = args[1]?.replace(/[^0-9]/g, '');
            if (!target) return replyWithTag(sock, remoteJid, msg, '❌ Usage : `.owner ban <numéro>`');
            // On ne peut pas modifier process.env de façon persistante côté runtime,
            // mais on peut agir sur la liste en mémoire
            return replyWithTag(sock, remoteJid, msg, `⚠️ Pour bannir de façon permanente, ajoutez \`${target}\` dans la variable d'environnement \`BANNED_NUMBERS\`.\n\n💡 _Un redémarrage du bot est nécessaire pour appliquer les changements._`);
        }

        if (sub === 'unban') {
            const target = args[1]?.replace(/[^0-9]/g, '');
            if (!target) return replyWithTag(sock, remoteJid, msg, '❌ Usage : `.owner unban <numéro>`');
            return replyWithTag(sock, remoteJid, msg, `⚠️ Pour débannir, retirez \`${target}\` de la variable d'environnement \`BANNED_NUMBERS\`.\n\n💡 _Un redémarrage du bot est nécessaire._`);
        }

        // Sous-commande inconnue
        return replyWithTag(sock, remoteJid, msg, `❓ Sous-commande inconnue : *${sub}*\n\nTape \`.owner\` pour voir les commandes disponibles.`);
    }
};
