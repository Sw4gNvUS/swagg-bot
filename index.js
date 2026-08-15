require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType } = require('discord.js');
const fs = require('fs');

// Soygun oyununu içeri aktar
const { soygunCommand, setupSoygun } = require('./soygun.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const DB_FILE = './puanlar.json';
let puanlar = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : {};
function savePuanlar() { fs.writeFileSync(DB_FILE, JSON.stringify(puanlar, null, 2)); }

const activeGames = new Map();

// Slash Komutları
const commands = [
    new SlashCommandBuilder()
        .setName('tahmin-baslat')
        .setDescription('Kanalda sıra tabanlı sayı tahmin oyununu başlatır.')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('puanim')
        .setDescription('Toplam puanını gösterir.')
        .toJSON(),
    soygunCommand
];

client.once('ready', async () => {
    console.log(`Bot aktif: ${client.user.tag}`);
    
    // Durum ayarları
    client.user.setPresence({
        activities: [{ name: 'Swag Mini Games 🎰', type: ActivityType.Playing }],
        status: 'dnd',
    });

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('interactionCreate', async interaction => {
    // 1. Slash Komutları (Başlatma)
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'puanim') {
            await interaction.reply(`Toplam puanın: **${puanlar[interaction.user.id] || 0}** <a:0_winner:1495905289982050524>`);
        }

        if (interaction.commandName === 'tahmin-baslat') {
            if (activeGames.has(interaction.channelId)) {
                return await interaction.reply({ content: "⚠️ Bu kanalda zaten devam eden bir oyun var!", ephemeral: true });
            }
            startNewGame(interaction);
        }
    }

    // 2. Buton Etkileşimi (Yeni Oyun Başlat)
    if (interaction.isButton()) {
        if (interaction.customId === 'yeni_oyun') {
            if (activeGames.has(interaction.channelId)) {
                return await interaction.reply({ content: "⚠️ Zaten aktif bir oyun var!", ephemeral: true });
            }
            startNewGame(interaction);
        }
    }
});

// Oyunu başlatan fonksiyon
async function startNewGame(interaction) {
    const secretNum = Math.floor(Math.random() * 100) + 1;
    activeGames.set(interaction.channelId, { secretNum, lastUserId: null });

    const content = `<:embet_ptr2:1527972932922507405> **Swag Spooky 🎃 | Sayı Tahmin Oyunu Başladı 🔢** \n<:embet_ptr2:1527972932922507405> Aklımdan 1 ile 100 arasında bir sayı tuttum. **Komut kullanmadan** aşağıya direk sayı yazarak başla *(örn: 38)*\n\n<:dot_2:1483169669643899010> ***__Kural:__** Aynı kişi ard arda iki kez tahmin yapamaz!*`;
    
    if (interaction.isChatInputCommand()) await interaction.reply(content);
    else await interaction.update({ content: content + "\n\n*(Oyun yeniden başlatıldı!)*", components: [] });
}

// Mesaj Dinleme
client.on('messageCreate', async message => {
    if (message.author.bot || !activeGames.has(message.channel.id)) return;

    const game = activeGames.get(message.channel.id);
    const guess = parseInt(message.content);
    if (isNaN(guess)) return;

    if (message.author.id === game.lastUserId) {
        return await message.reply(`<:cat_3:1483067355876819024> **Ard arda tahmin yapamazsın!**`);
    }

    game.lastUserId = message.author.id;

    if (guess === game.secretNum) {
        puanlar[message.author.id] = (puanlar[message.author.id] || 0) + 10;
        savePuanlar();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('yeni_oyun').setLabel('Yeni Oyun Başlat').setStyle(ButtonStyle.Primary)
        );

        await message.reply({ 
            content: `🎉 **Tebrikler ${message.author}!** Doğru tahmin! Sayı: **${game.secretNum}**. **10 Puan** kazandın! <a:0_winner:1495905289982050524>`,
            components: [row]
        });
        activeGames.delete(message.channel.id); 
    } else {
        await message.react(guess < game.secretNum ? '⬆️' : '⬇️');
        await message.reply(guess < game.secretNum ? "<:cat_2:1483067331797061703> Yanlış Daha **büyük** bir sayı söyle! 📈 *(sıra başka oyuncuda)*" : "<:cat_2:1483067331797061703> Yanlış Daha **küçük** bir sayı söyle! 📉 *(sıra başka oyuncuda)*");
    }
});

setupSoygun(client, puanlar, savePuanlar);

// Token, artık .env dosyasından çekilecek
client.login(process.env.DISCORD_TOKEN);