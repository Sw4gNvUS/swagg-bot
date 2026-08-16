const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const soygunCommand = new SlashCommandBuilder()
    .setName('soygun')
    .setDescription('Büyük bir soyguna başla! Şans ve strateji seni zengin edebilir 💰');

const mekanlar = [
    { id: 'mekan_1', isim: 'Mahalle Bakkalı', adimSayisi: 3, kategori: 'kucuk' },
    { id: 'mekan_2', isim: 'Semt Kuyumcusu', adimSayisi: 4, kategori: 'orta' },
    { id: 'mekan_3', isim: 'Küçük Ölçekli Sanayi Dükkanı', adimSayisi: 5, kategori: 'sanayi' },
    { id: 'mekan_4', isim: 'Eski Tarihi Eser Müzesi', adimSayisi: 6, kategori: 'muze' },
    { id: 'mekan_5', isim: 'Yerel ATM ve Şubesi', adimSayisi: 7, kategori: 'banka' },
    { id: 'mekan_6', isim: 'Lüks Saat Mağazası', adimSayisi: 8, kategori: 'magaza' },
    { id: 'mekan_7', isim: 'Şehirlerarası Otobüs Terminali Kasası', adimSayisi: 9, kategori: 'kamu' },
    { id: 'mekan_8', isim: 'Özel Sanat Galerisi', adimSayisi: 10, kategori: 'sanat' },
    { id: 'mekan_9', isim: 'Belediye Başkanının Ofisi', adimSayisi: 12, kategori: 'belediye' },
    { id: 'mekan_10', isim: 'Lüks Yat Kulübü Kasası', adimSayisi: 13, kategori: 'luks' },
    { id: 'mekan_11', isim: 'Uluslararası Otel Kumarhanesi', adimSayisi: 14, kategori: 'kumarhane' },
    { id: 'mekan_12', isim: 'Şehir Limanı Gümrük Deposu', adimSayisi: 15, kategori: 'depo' },
    { id: 'mekan_13', isim: 'Büyük Şehir Alışveriş Merkezi', adimSayisi: 16, kategori: 'avm' },
    { id: 'mekan_14', isim: 'Özel VIP Kulüp Kasası', adimSayisi: 17, kategori: 'vip' },
    { id: 'mekan_15', isim: 'Uluslararası Antika Borsası', adimSayisi: 18, kategori: 'anti' },
    { id: 'mekan_16', isim: 'Teknoloji Ar-Ge Üssü', adimSayisi: 19, kategori: 'tekno' },
    { id: 'mekan_17', isim: 'Uluslararası Havalimanı Kargo Terminali', adimSayisi: 20, kategori: 'hava' },
    { id: 'mekan_18', isim: 'Bölge Merkez Bankası Kasası', adimSayisi: 22, kategori: 'merkez' },
    { id: 'mekan_19', isim: 'Gizli Yeraltı Kripto Madencilik Tesisi', adimSayisi: 25, kategori: 'yeralti' },
    { id: 'mekan_20', isim: 'Uluslararası Gizli İstihbarat Arşivi', adimSayisi: 30, kategori: 'gizli' }
];

const mekanOlaylari = {};
const kategoriler = ['kucuk', 'yeralti', 'anti', 'merkez', 'hava', 'vip', 'orta', 'sanayi', 'sanat', 'muze', 'banka', 'magaza', 'kamu', 'luks', 'kumarhane', 'depo', 'avm', 'tekno', 'gizli'];

kategoriler.forEach(kategori => {
    const dosyaYolu = path.join(__dirname, 'olaylar', `${kategori}.json`);
    if (fs.existsSync(dosyaYolu)) {
        try {
            mekanOlaylari[kategori] = JSON.parse(fs.readFileSync(dosyaYolu, 'utf8'));
        } catch (e) { mekanOlaylari[kategori] = []; }
    } else { mekanOlaylari[kategori] = []; }
});

const tamamlananSoygunlar = {};
const aktifSoygunlar = new Set();

function setupSoygun(client, puanlar, savePuanlar) {
    client.on('interactionCreate', async interaction => {
        if (interaction.isChatInputCommand() && interaction.commandName === 'soygun') {
            if (aktifSoygunlar.has(interaction.user.id)) return interaction.reply({ content: "⚠️ Zaten devam eden bir soygunun var!", ephemeral: true });
            
            await interaction.deferReply();
            aktifSoygunlar.add(interaction.user.id);

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('mekan_secim')
                    .setPlaceholder('Nereyi soyuyoruz?')
                    .addOptions(mekanlar.map(m => ({ label: `${m.isim} (${m.adimSayisi} Adım)`, value: m.id })))
            );

            const msg = await interaction.editReply({ content: "🦹‍♂️ **Mekan seç:**", components: [row] });
            const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 30000 });

            collector.on('collect', async i => {
                await i.deferUpdate();
                collector.stop('selected');
                
                const mekan = mekanlar.find(m => m.id === i.values[0]);
                const oyunOlaylari = (mekanOlaylari[mekan.kategori] || mekanOlaylari['orta']).sort(() => 0.5 - Math.random()).slice(0, mekan.adimSayisi);
                
                let adim = 0;
                
                async function guncelle(btnInteraction = null) {
                    if (adim >= oyunOlaylari.length) {
                        aktifSoygunlar.delete(interaction.user.id);
                        const odul = (mekan.adimSayisi * 3) + Math.floor(Math.random() * 20);
                        puanlar[interaction.user.id] = (puanlar[interaction.user.id] || 0) + odul;
                        savePuanlar();
                        return (btnInteraction || interaction).editReply({ content: `🎉 **Başarılı!** ${odul} puan kazandın.`, components: [] });
                    }

                    const olay = oyunOlaylari[adim];
                    const dogru = Math.random() < 0.5;
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('btn1').setLabel(dogru ? olay.dogru : olay.yanlis).setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId('btn2').setLabel(dogru ? olay.yanlis : olay.dogru).setStyle(ButtonStyle.Danger)
                    );

                    const content = `📍 **${mekan.isim}** - Adım ${adim + 1}/${mekan.adimSayisi}
${olay.metin}`;
                    if (btnInteraction) await btnInteraction.editReply({ content, components: [row] });
                    else await interaction.editReply({ content, components: [row] });
                }

                await guncelle();
                const gameCollector = msg.createMessageComponentCollector({ filter: c => c.user.id === interaction.user.id, time: 20000 });

                gameCollector.on('collect', async c => {
                    await c.deferUpdate();
                    const olay = oyunOlaylari[adim];
                    const dogruTus = (c.customId === 'btn1' && (c.component.label === olay.dogru)) || (c.customId === 'btn2' && (c.component.label === olay.dogru));

                    if (dogruTus) {
                        adim++;
                        await guncelle(c);
                    } else {
                        aktifSoygunlar.delete(interaction.user.id);
                        gameCollector.stop();
                        await c.editReply({ content: "🚨 **YAKALANDIN!**", components: [] });
                    }
                });
            });
        }
    });
}

module.exports = { soygunCommand: soygunCommand.toJSON(), setupSoygun };
