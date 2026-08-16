require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType, ComponentType } = require('discord.js');
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
    new SlashCommandBuilder().setName('tahmin-baslat').setDescription('Buton tabanlı sayı tahmin oyunu başlatır.').toJSON(),
    new SlashCommandBuilder().setName('puanim').setDescription('Toplam puanını gösterir.').toJSON(),
    soygunCommand
];

client.once('ready', async () => {
    console.log(`Bot aktif: ${client.user.tag}`);
    client.user.setPresence({ activities: [{ name: 'Swag Mini Games 🎰', type: ActivityType.Playing }], status: 'dnd' });
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'puanim') {
            await interaction.reply({ content: `Toplam puanın: **${puanlar[interaction.user.id] || 0}** <a:0_winner:1495905289982050524>`, ephemeral: true });
        }
        if (interaction.commandName === 'tahmin-baslat') {
            if (activeGames.has(interaction.channelId)) return await interaction.reply({ content: "⚠️ Zaten oyun var!", ephemeral: true });
            startInteractiveGame(interaction);
        }
    }
});

async function startInteractiveGame(interaction) {
    const secretNum = Math.floor(Math.random() * 100) + 1;
    const game = { secretNum, min: 1, max: 100 };
    activeGames.set(interaction.channelId, game);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tahmin_buyuk').setLabel('🔼 Daha Büyük').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('tahmin_kucuk').setLabel('🔽 Daha Küçük').setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ 
        content: `🔢 **Sayı Tahmin Oyunu (Butonlu)**
1-100 arasında bir sayı tuttum. Hangi yönde olduğunu seç!`, 
        components: [row] 
    });

    const collector = interaction.channel.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
        if (!activeGames.has(i.channelId)) return i.reply({ content: "Oyun bitti!", ephemeral: true });
        
        await i.deferUpdate();
        const g = activeGames.get(i.channelId);
        
        if (i.customId === 'tahmin_buyuk') {
            g.min = Math.floor((g.min + g.max) / 2) + 1;
        } else {
            g.max = Math.floor((g.min + g.max) / 2) - 1;
        }

        if (g.min > g.max) {
            puanlar[i.user.id] = (puanlar[i.user.id] || 0) + 10;
            savePuanlarAsync();
            await i.editReply({ content: `🎉 **Tebrikler ${i.user.username}!** Sayıyı buldun: **${g.secretNum}**! 10 Puan kazandın.`, components: [] });
            activeGames.delete(i.channelId);
            collector.stop();
        } else {
            await i.editReply({ content: `🔍 **Aralık Daraldı:** ${g.min} - ${g.max} arası.` });
        }
    });
}

setupSoygun(client, puanlar, savePuanlarAsync);
client.login(process.env.DISCORD_TOKEN);
