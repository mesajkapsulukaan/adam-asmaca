# 🕯️ Adam Asmaca

En fazla 15 kişiyle online oynanan, sıcak temalı Adam Asmaca. Sunucu gerekmez; GitHub Pages'te çalışır.

## GitHub'a yükleme

1. GitHub'da yeni bir repo aç (örn. `adam-asmaca`).
2. `index.html`, `style.css`, `app.js` dosyalarını repoya yükle.
3. Repo → **Settings → Pages** → *Source*: `Deploy from a branch` → Branch: `main` / `(root)` → Save.
4. Bir dakika sonra `https://KULLANICIADIN.github.io/adam-asmaca/` adresinde yayında olur.

## Nasıl oynanır

1. Siteyi açınca takma adını yaz (her girişte yeniden sorulur).
2. **Lobi Oluştur** → 5 haneli kodu ya da davet linkini arkadaşlarına gönder.
3. Arkadaşların **Lobiye Katıl** ile kodu girer (ya da davet linkine tıklar).
4. Lobi sahibi ayarları seçip **Oyunu Başlat**'a basar.

### Ayarlar
- **Tur sayısı:** 3 / 5 / 8
- **Can:** 6 / 8 / 10 (takım olarak yanlış hakkı)
- **Oyun şekli:** Serbest (herkes aynı anda) veya Sıralı (25 saniye süreli)
- **Kelimeler:** Hazır liste (TDK ipucu ile) veya TDK sözlüğünden rastgele (zor)

### Puanlama
- Doğru harf: bulunan harf sayısı × 10
- Kelimeyi tamamlayan: +25 bonus
- "Kelimeyi tahmin et": gizli harf başına 15 + 25 bonus; yanlışsa bir can gider

## Teknik notlar
- Çok oyunculu kısım **PeerJS (WebRTC)** ile çalışır: lobi sahibi oyunun "sunucusu"dur. Lobi sahibi sayfayı kapatırsa lobi kapanır.
- Bazı çok kısıtlı ağlarda (okul/şirket Wi-Fi'si, bazı mobil operatörler) WebRTC bağlanamayabilir. Böyle olursa farklı bir ağ ya da mobil veri dene.
- Kelime ipuçları `sozluk.gov.tr/gts` ve rastgele TDK modu `sozluk.gov.tr/autocomplete.json` adresinden gelir. TDK tarayıcıdan doğrudan erişimi engellerse ücretsiz CORS proxy'leri denenir. Hiçbiri çalışmazsa oyun hazır listeyle devam eder, ipucu görünmez.
- Ses efektleri dosya değil, tarayıcıda üretilir. Sağ üstteki 🔊 düğmesiyle kapatılabilir.
