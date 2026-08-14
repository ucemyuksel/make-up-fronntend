# GlamGuide Web — micro-frontend'ler

Next.js 14 App Router, **Multi-Zones**: her alan ayrı bir uygulama ve ayrı bir
origin. Aralarındaki gezinme `NEXT_PUBLIC_*_URL` değişkenleriyle kurulur.

## Uygulamalar ve portlar

| Uygulama | Port | Ne için | Kim girer |
|---|---|---|---|
| `shell` | 3010 | Giriş, kayıt, ana pano | Herkes |
| `recipes` | 3001 | Tarifler, yüz analizi | Tüketici |
| `store` | 3002 | **Mağaza vitrini**: ürün, sepet, sipariş | Tüketici (alır) |
| `social` | 3003 | Akış, reels, mesaj, profil | Tüketici |
| `admin` | 3004 | Yönetim: moderasyon, komisyon, kısıtlama | ADMIN |
| `cms` | 3005 | Katalog ve içerik yönetimi | ADMIN |
| `seller` | 3006 | **Satıcı paneli**: ürün, stok, sipariş, kampanya, personel | STORE_OWNER / STORE_STAFF |

**`store` ile `seller` neden ayrı:** mağaza kullanıcısı *satar*, normal kullanıcı
*alır*. Bunlar farklı süreçler ve farklı kullanıcı grupları. Aynı uygulamada
olsalardı satıcı panelindeki bir hata müşteri vitrinini de düşürür, iki tarafın
yayın döngüsü de birbirine bağlanırdı.

## Çalıştırma

Önce backend ve altyapı ayakta olmalı (`make-up-backend` deposu: Keycloak :8080,
Postgres, Redis, servisler).

```bash
npm install
```

Hepsini birden:

```bash
npm run dev
```

Tek uygulama:

```bash
npm run dev:seller
```

> **`npx next dev` ile doğrudan başlatmayın.** Port bayrağı `package.json`
> içindeki `dev` betiğinde; doğrudan çağırınca kaybolur ve uygulamalar 3000'den
> başlayıp birbirinin portuna kayar. Sonuç: shell'i beklediğiniz adreste
> bulamazsınız.

## Denetim: tip kontrolü + testler

```bash
npm run kontrol
```

`typecheck` yedi uygulamayı da `tsc --noEmit` ile geçirir, `test` Node'un
yerleşik koşucusuyla (`node --test apps`) çalışır. **Ek bağımlılık yok** —
vitest/jest kurulmadı, ağdan paket çekilmiyor.

Neden gerekli: `dev:store` çalışırken `seller` bozuk olabilir ve kimse görmez.
Arka uçta tam olarak bu boşluk yüzünden bir servis derlenmez hâle gelmişti ve
yalnız iki modül derlendiği için haftalarca fark edilmedi.

Testler paraya dokunan iki kararı koruyor (`apps/store/app/api/orders/`):
hangi sepet satırının kuponu taşıdığı ve tekrar gönderim anahtarının kararlı
olduğu. İkisi de daha önce hatalıydı — anahtar `Date.now()` içerdiği için çift
tıklama **iki sipariş** üretiyordu.

Aynı denetim Jenkins boru hattında **Web kontrol** aşaması olarak koşar
(`make-up-store-backend/infra/jenkins/casc.yaml`); depo konteynere salt-okunur
bağlanır. Test düşerse imaj üretilmez.

## Ortam değişkenleri

Her uygulamanın kendi `.env.local` dosyası gerekir (depoya girmez, `.gitignore`'da).
Örnek şablon: `apps/<uygulama>/.env.example`.

Yerel geliştirmede gereken en az küme:

```
AUTH_SECRET=<rastgele 32 bayt base64>
AUTH_TRUST_HOST=true
AUTH_URL=http://localhost:<port>

KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_ISSUER=http://localhost:8080/realms/makeup
KEYCLOAK_CLIENT_ID=makeup-web
KEYCLOAK_CLIENT_SECRET=<Keycloak admin konsolundan>

NEXT_PUBLIC_SHELL_URL=http://localhost:3010
NEXT_PUBLIC_RECIPES_URL=http://localhost:3001
NEXT_PUBLIC_STORE_URL=http://localhost:3002
NEXT_PUBLIC_SOCIAL_URL=http://localhost:3003
NEXT_PUBLIC_ADMIN_URL=http://localhost:3004
NEXT_PUBLIC_CMS_URL=http://localhost:3005
NEXT_PUBLIC_SELLER_URL=http://localhost:3006
```

`AUTH_SECRET` **tüm uygulamalarda aynı** olmalı: farklı olursa bir zone'da açılan
oturum diğerinde geçersiz sayılır ve kullanıcı her geçişte yeniden giriş yapar.

### Keycloak istemcisi

`makeup-web` istemcisinin **izinli yönlendirme adresleri** çalıştırdığınız her
portu içermeli. Yeni bir micro-frontend eklendiğinde bu liste güncellenmezse
giriş `Invalid redirect_uri` ile reddedilir — hata tarayıcıda çıkar, kodda değil,
bu yüzden bulması zordur.

Şu an izinli: `http://localhost:{3001,3002,3003,3004,3005,3006,3010}/*`

## Bilinen ortam sorunu: OneDrive

Proje OneDrive altında duruyor ve OneDrive derleme çıktısını (`.next`)
senkronlamaya çalışıyor. Bu, derleme sırasında dosya kilidine ve şu hataya yol
açabiliyor:

```
Error: EPERM: operation not permitted, open '...\.next\trace'
```

Kalıcı çözüm: OneDrive ayarlarından bu klasörün senkronunu kapatmak ya da
projeyi OneDrive dışına taşımak.

`.next`'i OneDrive dışına **junction ile** taşımak işe yaramaz — denendi:
Node modül çözümlemesi gerçek yolu izlediği için `node_modules` görünmez olur ve
derleme `Cannot find module 'react/jsx-runtime'` ile düşer.
