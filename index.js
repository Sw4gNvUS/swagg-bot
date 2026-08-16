require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActivityType } = require('discord.js');
const fs = require('fs');

const { soygunCommand, setupSoygun } = require('./soygun.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const DB_FILE = './puanlar.json';
let puanlar = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : {};

// Asenkron puan kaydetme ile performansı artırıyoruz
function savePuanlarAsync() { 
    fs.writeFile(DB_FILE, JSON.stringify(puanlar, null, 2), (err) => { if (err) console.error(err); });
}

const activeGames = new Map();

const commands = [
    new SlashCommandBuilder()
        .setName('tahmin-baslat')
        .setDescription('Sayı tahmin oyunu başlatır.')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('tahmin')
        .setDescription('Oyunda bir sayı tahmin edersin.')
        .addIntegerOption(option => 
            option.setName('sayi')
                .setDescription('Tahmin ettiğin sayı (1-100)')
                .setRequired(true))
        .toJSON(),
    new SlashCommandBuilder()
        .setName('puanim')
        .setDescription('Toplam puanını gösterir.')
        .toJSON(),
    soygunCommand
];

client.once('ready', async () => {
    console.log(`Bot aktif: ${client.user.tag}`);
    client.user.setPresence({ activities: [{ name: 'Swag Mini Games 🎰', type: ActivityType.Playing }], status: 'dnd' });
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'puanim') {
        await interaction.reply({ content: `Toplam puanın: **${puanlar[interaction.user.id] || 0}** <a:0_winner:1495905289982050524>`, ephemeral: true });
    }

    if (interaction.commandName === 'tahmin-baslat') {
        if (activeGames.has(interaction.channelId)) {
            return await interaction.reply({ content: "⚠️ Bu kanalda zaten devam eden bir oyun var!", ephemeral: true });
        }
        
        const secretNum = Math.floor(Math.random() * 100) + 1;
        activeGames.set(interaction.channelId, { secretNum, min: 1, max: 100 });

        await interaction.reply({ 
            content: `🔢 **Sayı Tahmin Oyunu Başladı!**\n1 ile 100 arasında bir sayı tuttum. `/tahmin [sayi]` komutunu kullanarak tahminini yapmaya başla!` 
        });
    }

    if (interaction.commandName === 'tahmin') {
        if (!activeGames.has(interaction.channelId)) {
            return await interaction.reply({ content: "⚠️ Bu kanalda aktif bir tahmin oyunu yok! `/tahmin-baslat` ile başlatabilirsin.", ephemeral: true });
        }

        const game = activeGames.get(interaction.channelId);
        const guess = interaction.options.getInteger('sayi');

        if (guess < game.min || guess > game.max) {
            return await interaction.reply({ content: `⚠️ Lütfen geçerli aralıkta bir sayı söyleyin! Güncel aralık: **${game.min} - ${game.max}**`, ephemeral: true });
        }

        if (guess === game.secretNum) {
            puanlar[interaction.user.id] = (puanlar[interaction.user.id] || 0) + 10;
            savePuanlarAsync();
            
            await interaction.reply({ content: `🎉 **Tebrikler ${interaction.user.username}!** Sayıyı buldun: **${game.secretNum}**! 10 Puan kazandın. 🏆` });
            activeGames.delete(interaction.channelId);
        } else if (guess < game.secretNum) {
            if (guess >= game.min) game.min = guess + 1;
            await interaction.reply({ content: `📈 **${interaction.user.username}** (${guess}): Daha **BÜYÜK** bir sayı söylemelisin!\n🔍 **Güncel Aralık:** ${game.min} - ${game.max}` });
        } else {
            if (guess <= game.max) game.max = guess - 1;
            await interaction.reply({ content: `📉 **${interaction.user.username}** (${guess}): Daha **KÜÇÜK** bir sayı söylemelisin!\n🔍 **Güncel Aralık:** ${game.min} - ${game.max}` });
        }
    }
});

setupSoygun(client, puanlar, savePuanlarAsync);
client.login(process.env.DISCORD_TOKEN);
