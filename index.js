require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType, ComponentType } = require('discord.js');
const fs = require('fs');

// Soygun oyununu içeri aktar
const { soygunCommand, setupSoygun } = require('./soygun.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent] 
});

const DB_FILE = './puanlar.json';
let puanlar = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE)) : {};
function savePuanlar() { fs.writeFileSync(DB_FILE, JSON.stringify(puanlar, null, 2)); }

const activeGames = new Map();

// Slash Komutları
const commands = [
    new SlashCommandBuilder().setName('tahmin-baslat').setDescription('Kanalda sıra tabanlı sayı tahmin oyununu başlatır.').toJSON(),
    new SlashCommandBuilder().setName('puanim').setDescription('Toplam puanını gösterir.').toJSON(),
    new SlashCommandBuilder()
        .setName('tahminim')
        .setDescription('Sayı tahmin oyununda bir tahmin yaparsın.')
        .addIntegerOption(option =>
            option.setName('sayi')
                .setDescription('Tahmin ettiğin sayı (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ).toJSON(),
    soygunCommand
];

client.once('ready', async () => {
    console.log(`Bot aktif: ${client.user.tag}`);
    
    client.user.setPresence({
        activities: [{ name: 'Swag Mini Games 🎰', type: ActivityType.Playing }],
        status: 'dnd',
    });

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('interactionCreate', async interaction => {
    // 1. Slash Komutları
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

        if (interaction.commandName === 'tahminim') {
            if (!activeGames.has(interaction.channelId)) {
                return await interaction.reply({ content: "⚠️ Bu kanalda devam eden aktif bir sayı tahmin oyunu yok!", ephemeral: true });
            }

            const game = activeGames.get(interaction.channelId);
            const guess = interaction.options.getInteger('sayi');

            if (interaction.user.id === game.lastUserId) {
                return await interaction.reply({ content: `<:cat_3:1483067355876819024> **Ard arda tahmin yapamazsın!**`, ephemeral: true });
            }

            game.lastUserId = interaction.user.id;

            if (guess === game.secretNum) {
                puanlar[interaction.user.id] = (puanlar[interaction.user.id] || 0) + 10;
                savePuanlar();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('yeni_oyun').setLabel('Yeni Oyun Başlat').setStyle(ButtonStyle.Primary)
                );

                await interaction.reply({ 
                    content: `🎉 **Tebrikler ${interaction.user}!** Doğru tahmin! Sayı: **${game.secretNum}**. **10 Puan** kazandın! <a:0_winner:1495905289982050524>`,
                    components: [row]
                });
                activeGames.delete(interaction.channelId); 
            } else {
                // HATA DÜZELTİLDİ: Template literal kullanımı düzeltildi
                const hint = guess < game.secretNum 
                    ? `<:cat_2:1483067331797061703> İddia ${guess} Yanlış ${interaction.user}! Daha **büyük** bir sayı söyle! 📈 ⬆️ *(sıra başka oyuncuda)*` 
                    : `<:cat_2:1483067331797061703> İddia ${guess} Yanlış ${interaction.user}! Daha **küçük** bir sayı söyle! 📉 ⬇️ *(sıra başka oyuncuda)*`;
                
                await interaction.reply({ content: hint });
            }
        }
    }

    // 2. Buton Etkileşimi
    if (interaction.isButton()) {
        if (interaction.customId === 'yeni_oyun') {
            if (activeGames.has(interaction.channelId)) {
                return await interaction.reply({ content: "⚠️ Zaten aktif bir oyun var!", ephemeral: true });
            }
            startNewGame(interaction);
        }
    }
});

// HATA DÜZELTİLDİ: "tahminim" kelimesi artık düz bir string, fonksiyon içine taşındı
async function startNewGame(interaction) {
    const secretNum = Math.floor(Math.random() * 100) + 1;
    activeGames.set(interaction.channelId, { secretNum, lastUserId: null });

    const content = `<:embet_ptr2:1527972932922507405> **Swag Spooky 🎃 | Sayı Tahmin Oyunu Başladı 🔢** \n<:embet_ptr2:1527972932922507405> Aklımdan 1 ile 100 arasında bir sayı tuttum. **\`/tahminim\` komutunu kullanarak** tahminini yapabilirsin *(örn: /tahminim sayi:38)*\n\n<:dot_2:1483169669643899010> ***__Kural:__** Aynı kişi ard arda iki kez tahmin yapamaz!*`;
    
    if (interaction.isChatInputCommand()) await interaction.reply(content);
    else await interaction.update({ content: content + "\n\n*(Oyun yeniden başlatıldı!)*", components: [] });
}

setupSoygun(client, puanlar, savePuanlar);
client.login(process.env.DISCORD_TOKEN);
