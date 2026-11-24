# Asistanım — kişisel gelişim asistanı (iOS PWA)

Sadece sana özel. Tek kullanıcı, veriler telefonda (localStorage) durur.

**Özellikler:** Günün sözü (ayet / hadis / motivasyon) · Görevler · Hedefler ve ilerleme çubuğu · Claude koç (hedef ve görevlerini bilir, sesli yazma ve sesli okuma) · Yedek al (Paylaş menüsü, "verilerimi yedekle" demen yeter) / başka telefona geri yükle.

## 1) Yayınla (bir kere)
Statik dosyalar, build yok. Herhangi birine koy: Cloudflare Pages, Netlify (sürükle-bırak), Vercel. Adresi gizli tut.

## 2) iPhone'a kur
Safari'de adresi aç → Paylaş → **Ana Ekrana Ekle**. Ayarlar sekmesinden adını ve Anthropic API anahtarını gir.

## 3) "Hey Siri" + kilit ekranı
iOS PWA kilit ekranı widget'ı yapamaz, Kısayollar uygulaması yapabilir:

**A) Uygulamayı Siri ile aç:** Kısayollar → yeni kısayol "Asistanım" → eylem *URL'yi Aç* → `https://ADRESİN/index.html#koc`
**B) Sesle sor (uygulamayı açmadan):** Kısayol adı "Asistanım" olsun:
1. *Metni Dikte Et* (Türkçe)
2. *URL'nin İçeriğini Al* → `https://ADRESİN/index.html#koc?q=` + dikte edilen metin (URL kodlamalı) → *URL'yi Aç*

Sonra "Hey Siri, Asistanım" dersin. Kilit ekranı: kilit ekranını düzenle → widget ekle → Kısayollar → "Asistanım". Ayrıca Eylem Düğmesi veya Kontrol Merkezi'ne atanabilir.

`#koc?q=SORU` bağlantısı koç sekmesini açıp soruyu otomatik sorar.

## Notlar
- API anahtarı tarayıcıdan doğrudan Anthropic'e gider. Kişisel kullanım için uygun, adresi başkasıyla paylaşma.
- Ayet ve hadis metinleri kısa meal olarak `quotes.js` içinde, istediğini ekleyip düzenleyebilirsin. Kaynaklarını doğrulamanı öneririm.
