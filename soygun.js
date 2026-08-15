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

// Olayları 'olaylar' klasöründen otomatik olarak yükle
const mekanOlaylari = {};
const kategoriler = ['kucuk', 'yeralti', 'anti', 'merkez', 'hava', 'vip', 'orta', 'sanayi', 'sanat', 'muze', 'banka', 'magaza', 'kamu', 'luks', 'kumarhane', 'depo', 'avm', 'tekno', 'gizli'];

kategoriler.forEach(kategori => {
    const dosyaYolu = path.join(__dirname, 'olaylar', `${kategori}.json`);
    if (fs.existsSync(dosyaYolu)) {
        try {
            mekanOlaylari[kategori] = JSON.parse(fs.readFileSync(dosyaYolu, 'utf8'));
        } catch (e) {
            mekanOlaylari[kategori] = [];
        }
    } else {
        mekanOlaylari[kategori] = [];
    }
});

const tamamlananSoygunlar = {};
let aktifSoygunYapan = null;

function setupSoygun(client, puanlar, savePuanlar) {
    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand() || interaction.commandName !== 'soygun') return;

        if (aktifSoygunYapan !== null) {
            if (aktifSoygunYapan === interaction.user.id) {
                return interaction.reply({ content: "⚠️ Zaten devam eden bir soygunun var! Aktif adımlarını tamamla.", ephemeral: true });
            } else {
                return interaction.reply({ content: `🚨 **Şehirde başka bir soygun var!** Şu an <@${aktifSoygunYapan}> büyük vurgunu gerçekleştiriyor. Önce o hırsızın işini bitirmesini bekle, sonra sıra sana gelir! 💰⛓️`, ephemeral: true });
            }
        }

        aktifSoygunYapan = interaction.user.id;

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('mekan_secim')
            .setPlaceholder('Nereyi soyuyoruz? Bir mekan seç...')
            .addOptions(
                mekanlar.map(m => new StringSelectMenuOptionBuilder()
                    .setLabel(`${m.isim} (${m.adimSayisi} Adım)`)
                    .setDescription(`Ödül Çarpanı: ${m.adimSayisi * 3} Katı Puan`)
                    .setValue(m.id)
                )
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const initialReply = await interaction.reply({
            content: "🦹‍♂️ **Büyük Soygun Planı Kuruluyor!**\nAşağıdaki listeden soygun yapmak istediğin mekanı seç ve maceraya başla:",
            components: [row],
            fetchReply: true,
            ephemeral: false
        });

        const filterMenu = i => i.user.id === interaction.user.id;
        const menuCollector = initialReply.createMessageComponentCollector({ filter: filterMenu, componentType: ComponentType.StringSelect, time: 30000 });

        menuCollector.on('collect', async menuInteraction => {
            menuCollector.stop();
            const secilenMekanId = menuInteraction.values[0];

            if (!tamamlananSoygunlar[interaction.user.id]) {
                tamamlananSoygunlar[interaction.user.id] = new Set();
            }

            if (tamamlananSoygunlar[interaction.user.id].has(secilenMekanId)) {
                aktifSoygunYapan = null;
                const mekanBilgi = mekanlar.find(m => m.id === secilenMekanId);
                return await menuInteraction.update({
                    content: `🛑 **Zaten burayı patlattınız dostum!** "${mekanBilgi.isim}" mekanını daha önce başarıyla soydunuz, güvenlik sistemi artık çok sıkı ve kasada atacak ekmek kalmadı. Başka bir hedef seçin! 🎭🏦`,
                    components: []
                });
            }

            const mekan = mekanlar.find(m => m.id === secilenMekanId);

            let adim = 1;
            const toplamAdim = mekan.adimSayisi;

            const kategoriHavuzu = mekanOlaylari[mekan.kategori] || mekanOlaylari['orta'];
            
            const secilenOlaylar = [...kategoriHavuzu]
                .sort(() => 0.5 - Math.random())
                .slice(0, toplamAdim);

            const oyunOlaylari = [];
            for (let j = 0; j < secilenOlaylar.length; j++) {
                const temelOlay = secilenOlaylar[j];
                
                const dogruButondaMi = Math.random() < 0.5;
                const secenek1 = dogruButondaMi ? temelOlay.dogru : temelOlay.yanlis;
                const secenek2 = dogruButondaMi ? temelOlay.yanlis : temelOlay.dogru;
                const dogruTus = dogruButondaMi ? 'btn1' : 'btn2';

                oyunOlaylari.push({
                    metin: temelOlay.metin,
                    btn1: secenek1,
                    btn2: secenek2,
                    dogruCevap: dogruTus
                });
            }

            const aktifOlay = oyunOlaylari[0];
            const buttonRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn1').setLabel(aktifOlay.btn1).setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('btn2').setLabel(aktifOlay.btn2).setStyle(ButtonStyle.Danger)
            );

            const ilkAdimMesaj = `📍 **Mekan:** ${mekan.isim}\n🦹‍♂️ **Soygun Adımı 1/${toplamAdim}**\n\n${aktifOlay.metin}\n\nNe yapacaksın? Hızlı karar ver! *(Yanlış seçimde hemen elenirsin!)*`;

            let sonGonderilenMesaj = await menuInteraction.update({ content: ilkAdimMesaj, components: [buttonRow], fetchReply: true });

            async function sonrakiAdimiIslet(gecerliInteraction, mevcutAdim) {
                if (mevcutAdim > toplamAdim) {
                    aktifSoygunYapan = null;
                    
                    tamamlananSoygunlar[interaction.user.id].add(secilenMekanId);

                    const carpan = toplamAdim * 3;
                    const odul = Math.floor(Math.random() * (toplamAdim * 5)) + carpan;
                    puanlar[interaction.user.id] = (puanlar[interaction.user.id] || 0) + odul;
                    savePuanlar();

                    const finalMesaj = `ㅤ ㅤㅤ\nㅤ\n🎉 **SOYGUN BAŞARILI! (${mekan.isim})**\nZorlu ${toplamAdim} adımı başarıyla atlattın, kasayı patlattın ve paraları çantaya doldurup kaçtın! 💸\n\n💰 **Kazanılan:** ${odul} Puan \n🏆 **Toplam Puanın:** ${puanlar[interaction.user.id]}`;
                    
                    try {
                        return await gecerliInteraction.update({ content: finalMesaj, components: [] });
                    } catch (error) {
                        return await gecerliInteraction.channel.send({ content: finalMesaj, components: [] });
                    }
                }

                const yeniOlay = oyunOlaylari[mevcutAdim - 1];
                const yeniRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn1').setLabel(yeniOlay.btn1).setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('btn2').setLabel(yeniOlay.btn2).setStyle(ButtonStyle.Danger)
                );

                const yeniMesajIcerik = `ㅤ ㅤㅤ\nㅤ\n📍 **Mekan:** ${mekan.isim}\n🦹‍♂️ **Soygun Adımı ${mevcutAdim}/${toplamAdim}**\n\n${yeniOlay.metin}\n\nNe yapacaksın? Hızlı karar ver! *(Yanlış seçimde hemen elenirsin!)*`;

                sonGonderilenMesaj = await gecerliInteraction.channel.send({ content: yeniMesajIcerik, components: [yeniRow] });

                kurCollector(sonGonderilenMesaj, mevcutAdim);
            }

            function kurCollector(mesajObjesi, adimNumarasi) {
                const olay = oyunOlaylari[adimNumarasi - 1];
                const filterBtn = i => i.user.id === interaction.user.id;
                const collector = mesajObjesi.createMessageComponentCollector({ filter: filterBtn, componentType: ComponentType.Button, time: 20000 });

                collector.on('collect', async i => {
                    collector.stop('clicked');

                    const secilenIslem = i.customId === 'btn1' ? olay.btn1 : olay.btn2;
                    const disabledRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('btn1').setLabel(olay.btn1).setStyle(ButtonStyle.Secondary).setDisabled(true),
                        new ButtonBuilder().setCustomId('btn2').setLabel(olay.btn2).setStyle(ButtonStyle.Secondary).setDisabled(true)
                    );

                    if (i.customId === olay.dogruCevap) {
                        await i.update({ content: `${mesajObjesi.content}\n\n✅ Seçtiğin hamle başarılı! Bir sonraki adıma geçiliyor...`, components: [disabledRow] });
                        adim++;
                        await sonrakiAdimiIslet(i, adim);
                    } else {
                        aktifSoygunYapan = null;
                        await i.update({ content: `${mesajObjesi.content}\n\n🚨 **YAKALANDIN!**\nHamleni seçtin ancak bu yanlış hamleydi! Alarm çaldı, polisler etrafını sardı ve elendin. ⛓️`, components: [disabledRow] });
                    }
                });

                collector.on('end', async (collected, reason) => {
                    if (reason === 'time') {
                        aktifSoygunYapan = null;
                        try {
                            const disabledRow = new ActionRowBuilder().addComponents(
                                new ButtonBuilder().setCustomId('btn1').setLabel(olay.btn1).setStyle(ButtonStyle.Secondary).setDisabled(true),
                                new ButtonBuilder().setCustomId('btn2').setLabel(olay.btn2).setStyle(ButtonStyle.Secondary).setDisabled(true)
                            );
                            await mesajObjesi.edit({ content: `${mesajObjesi.content}\n\n⏳ **Zaman doldu!** Kararsız kaldığın için güvenlik seni fark etti. Soygun iptal edildi ve elendin!`, components: [disabledRow] });
                        } catch (e) {}
                    }
                });
            }

            kurCollector(sonGonderilenMesaj, adim);
        });

        menuCollector.on('end', collected => {
            if (collected.size === 0) {
                aktifSoygunYapan = null;
                initialReply.edit({ content: "⏳ Süre dolduğu için mekan seçimi iptal edildi.", components: [] }).catch(() => {});
            }
        });
    });
}

module.exports = { soygunCommand: soygunCommand.toJSON(), setupSoygun };