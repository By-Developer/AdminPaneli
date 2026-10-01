/* =========================================================
   YÖNETİM PANELİ — Service Worker
   Çevrimdışı çalışma + otomatik güncelleme
   ========================================================= */

const CACHE_NAME = 'yonetim-paneli-v1';

// Önbelleğe alınacak temel dosyalar
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './logo.png'
];

/* ---------- KURULUM ---------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Önbellek açıldı');
        return cache.addAll(urlsToCache).catch(err => {
          console.warn('[SW] Bazı dosyalar önbelleğe alınamadı:', err);
        });
      })
  );
  self.skipWaiting(); // Yeni SW'yi hemen aktif et
});

/* ---------- AKTİVASYON: Eski önbellekleri temizle ---------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Eski önbellek silindi:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim(); // Açık sekmeleri hemen devral
});

/* ---------- İSTEK YAKALAMA ---------- */
self.addEventListener('fetch', event => {
  // Sadece GET istekleri
  if (event.request.method !== 'GET') return;

  // Harici kaynakları önbelleğe alma (varsa)
  const url = event.request.url;
  if (url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com') ||
      url.includes('discord.com') ||
      url.includes('instagram.com')) {
    return;
  }

  // Strateji: Önce önbellek → sonra ağ → yoksa index.html
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Geçersiz cevapları önbelleğe koyma
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // İnternet yok + önbellekte yok → ana sayfayı göster
        return caches.match('./index.html');
      });
    })
  );
});

/* ---------- MESAJ: Manuel güncelleme ---------- */
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});