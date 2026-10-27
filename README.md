# Sistemi Automatik i Biletave & Regjistrimeve Digjitale
## Universiteti i Prishtinës "Hasan Prishtina" • Fakulteti i Mjekësisë & KSFM

Një aplikacion ueb i plotë, i nivelit të lartë institucional dhe i gatshëm për prodhim (production-ready) për automatizimin e procesit të regjistrimit të studentëve përmes **Google Forms**, gjenerimin me precizion vektorial të **biletave të personalizuara PDF**, dërgimin e menjëhershëm me **email zyrtar në gjuhën shqipe**, dhe **verifikimin e sigurt në hyrje me QR kod**.

Zhvilluar posaçërisht për ceremonitë zyrtare të Fakultetit të Mjekësisë, duke përfshirë **Ceremoninë e Mantelit të Bardhë**, **Kongreset Shkencore Studentore (IMSSC)**, **Ditët e Orientimit** dhe ngjarje të tjera të organizuara në bashkëpunim me Këshillin e Studentëve të Fakultetit të Mjekësisë (KSFM).

---

## 🏛 Identiteti Vizual dhe Karakteristikat Kryesore

- **Identitet Vizual Institucional:** Paletë ngjyrash mbretërore (Navy Blue `#0B1E36`, Ari i Përmbajtur `#C5A059`, e bardhë kristal), korniza të dyfishta me filigranë këndesh, emblema zyrtare dhe Shkopi i Asklepiut (simboli i mjekësisë).
- **Dy Formate Zyrtare PDF:**
  1. **Format Solemn A4 (Print-Ready):** Ftesë & biletë madhështore ceremoniale e përshtatshme për printim me cilësi të lartë vektoriale.
  2. **Format Digjital (Mobile Pass):** Format kompakt (380x620 pt) i optimizuar posaçërisht për ekranet e telefonave celularë dhe skanim të shpejtë në derë.
- **Menaxhimi Dinamik i Personave Shoqërues:** Mbështet pa asnjë thyerje 0, 1, 2, 3, 4 ose më shumë mysafirë (prindër, mentorë). Në rast të listave të gjata të mysafirëve, dokumenti zgjerohet automatikisht në faqe shtesë me kornizë zyrtare pa humbur asnjë emër.
- **Mbrojtje e Rreptë nga Dublikatat (Idempotency):** Çdo dërgim nga Google Forms identifikohet në mënyrë unike; ripërsëritjet nuk krijojnë kurrë bileta të dyfishta.
- **Dërgim Automatik i Emailit:** Email zyrtar në gjuhën shqipe me biletën PDF të bashkangjitur, mbështetje për riprovim (retry), dërgim manual dhe Resend API për hostet që bllokojnë SMTP.
- **Skaneri i Check-in për Stafin:** Ndërfaqe me kamerë të integruar (HTML5 QR Code) dhe kërkim manual të kodit; sinjale vizuale (e gjelbër / e kuqe), shfaqje e numrit të lejuar të mysafirëve dhe parandalim i hyrjes së dyfishtë.
- **Privatësi e Plotë (GDPR):** Skanimi publik i QR kodit shfaq VETËM vlefshmërinë e biletës dhe emrin e studentit, duke mos ekspozuar kurrë numrin e telefonit, emailin apo emrat e mysafirëve.
- **Menaxhim i Shumëfishtë i Ngjarjeve (Multi-Event):** Çdo aktivitet ka rregullat e veta të numërimit, dizajnit të biletës, shabllonit të emailit dhe webhook-ut.
- **Audit Log & Politika e Ruajtjes së të Dhënave:** Regjistrim i çdo veprimi administrativ dhe vegël për anonimizimin e të dhënave të vjetra sipas afatit të caktuar në ditë.

---

## 🚀 Fillimi i Shpejtë (Quick Start)

### 1. Parakushtet
- **Node.js:** Versioni 20+ (i testuar me sukses në Node.js v24).
- **npm:** E përfshirë me Node.js.

### 2. Instalimi i Varësive
```bash
npm install
```

### 3. Ndërtimi i Frontendit (Vite + React + Tailwind)
```bash
npm run build
```

### 4. Nisja e Serverit
```bash
npm start
```
Serveri do të niset në: `http://localhost:3000`

### 5. Ekzekutimi i Testeve të Automatizuara
```bash
npm test
```

### Dërgimi i emailit përmes Resend API

Nëse hosti i aplikacionit bllokon lidhjet SMTP dalëse, mund të përdorni [Resend](https://resend.com) përmes HTTPS:

1. Verifikoni domenin dërgues në Resend dhe vendosni rekordet DNS që kërkon Resend.
2. Krijoni një API key në Resend.
3. Te **Settings → Konfigurimi i Dërgimit të Emailit**, zgjidhni **Resend API (HTTPS)**, vendosni API key dhe adresën nga domeni i verifikuar, pastaj ruani.
4. Dërgoni një email testues nga i njëjti panel.

API key mund të vendoset edhe si `RESEND_API_KEY` dhe `EMAIL_PROVIDER=resend` në mjedisin e serverit. Mos e ruani API key në Git.

### Dërgimi përmes SMTP-së së laptopit (Render)

Render Free bllokon portet SMTP `25`, `465` dhe `587`. Nëse doni të përdorni kredencialet tuaja SMTP dhe ta lini aplikacionin në Render, mund të nisni një relay të vogël SMTP në laptop dhe ta ekspozoni me një tunel HTTPS. Laptopi duhet të jetë i ndezur dhe online gjatë dërgimit.

1. Në `.env` lokal të laptopit vendosni `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, dhe `EMAIL_RELAY_SECRET`. Sekreti duhet të jetë i gjatë e rastësor; përdorni të njëjtin sekret në Render. Mos i vendosni kredencialet SMTP në Render.
2. Nisni relay-in lokalisht me `npm run email-relay`. Ai dëgjon vetëm në `127.0.0.1:3100`.
3. Hapni tunel HTTPS drejt relay-it, për shembull me Cloudflare Tunnel: `cloudflared tunnel --url http://localhost:3100`. Kopjoni URL-në HTTPS që ju jep komanda.
4. Në Render vendosni `EMAIL_PROVIDER=local_relay`, `EMAIL_RELAY_URL` në URL-në HTTPS të tunelit, dhe `EMAIL_RELAY_SECRET` në sekretin e njëjtë.
5. Në panel zgjidhni **SMTP nga laptopi im (lokal)**, ruani, dhe dërgoni email testues.

Mos e ndani URL-në e tunelit bashkë me sekretin. Tuneli Quick Tunnel mund të japë URL të re pas ristartimit; në atë rast përditësoni `EMAIL_RELAY_URL` në Render. Ruani kredencialet SMTP në `.env` dhe mos e bëni commit atë skedar.

### Ruajtja e të dhënave në Render (pa humbje pas deploy / GitHub migration)

`data.sqlite` është një bazë lokale e skedarëve. Në Render, skedat e aplikacionit nuk janë të qëndrueshme pas redeploy-it, restartit ose migrimit të repo-it në GitHub. Kjo do të thotë që nëse vazhdoni me SQLite në prodhim, ngjarjet dhe regjistrimet e krijuara rishtas mund të humbasin.

Më e sigurta dhe më e lehtë për një hostim falas është një bazë e jashtme, për shembull:
- **Render Postgres Free** (më e rekomanduar për këtë projekt)
- **Neon Free**
- **Supabase Free**

Shënim i rëndësishëm: **Render nuk ofron MySQL falas për prodhim të vazhdueshëm**; opsioni i saktë i lirë është PostgreSQL. Nëse ju duhet një variant me MySQL, duhet të përdorni një shërbim tjetër (p.sh. Railway, PlanetScale ose Supabase), por për këtë projekt PostgreSQL është alternativa më e thjeshtë dhe më stabile.

#### Çfarë të vendosni në Render

1. Krijoni një bazë PostgreSQL në Render dhe kopjoni connection string.
2. Në panelin e Render, vendosni variablat e mjedisit:

```bash
DATABASE_URL=postgres://<user>:<password>@<host>:5432/<database_name>
JWT_SECRET=vendosni_secret_te_rastesishem
PORT=3000
```

3. Mos i lini `DATABASE_PATH` të vendosur në prodhim, përveçse në test lokal.
4. Mbani aplikacionin dhe bazën e të dhënave të ndara; në këtë mënyrë evenet, biletat dhe audit log-et nuk do të fshihen pas çdo migrimi ose redeploy-i në GitHub.

Nëse doni një demo me kohë të shkurtër (p.sh. 5 ditë), Render Postgres Free ose Neon Free është e mjaftueshme. Për një testim të shpejtë, kjo është mënyra e duhur, pa e varur aplikacionin tek SQLite lokal i serverit.

---

## 🔐 Kredencialet e Paracaktuara të Qasjes

Sistemi vjen i pajisur me dy llogari të integruara:

| Roli | Username | Fjalëkalimi | Privilegjet |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` (ose `admin@uni-pr.edu`) | `Admin123!` | Qasje e plotë: ngjarjet, biletat, ridërgimi, eksporti CSV, konfigurimi SMTP, audit log |
| **Staf Check-in** | `staff` (ose `staff@uni-pr.edu`) | `Staff123!` | Qasje e dedikuar: skanimi me kamerë i kodit QR, verifikimi në hyrje, konfirmimi i check-in |

---

## 📋 Udhëzuesi i Lidhjes me Google Forms & Google Sheets

Lidhja me Google Forms realizohet në mënyrë automatike pa nevojë për çelësa API kompleksë:

1. **Krijoni ose Hapni Google Form-ën tuaj:**
   - Fushat e rekomanduara:
     - `Emri` (Tekst i shkurtër)
     - `Mbiemri` (Tekst i shkurtër)
     - `Email Adresa` (Tekst i shkurtër me validim emaili)
     - `Dega / Programi i Studimit` (Zgjedhje: Mjekësi e Përgjithshme, Stomatologji, Farmaci, Fizioterapi, Infermieri, Mami)
     - `Emrat e Personave Shoqërues` (Paragraf ose tekst me emrat e ndarë me presje / rreshta të rinj)
     - `Numri i Personave Shoqërues` (Numër: 0, 1, 2, 3...)
     - `Numri i Telefonit` (Opsionale)

2. **Lidhni Formularin me Google Sheets:**
   - Në tab-in **Responses** klikoni **Link to Sheets** (Krijo tabelë të re).

3. **Ngjisni Kodin në Apps Script:**
   - Në menynë e sipërme të Google Sheet, shkoni te **Extensions** &rarr; **Apps Script**.
   - Fshini çdo kod ekzistues dhe ngjisni skriptën e mëposhtme:

```javascript
/**
 * UNIVERSITETI I PRISHTINËS - FAKULTETI I MJEKËSISË
 * Skripta Zyrtare e Dërgimit Automatik në Webhook
 */
const WEBHOOK_URL = "http://DOMAIN_OSE_IP_JUAJ:3000/api/webhook/google-forms/white-coat-ceremony-2026";
const WEBHOOK_SECRET = "wcc_sec_98f7e2a4b1c";

function onFormSubmit(e) {
  if (!e) return;
  try {
    const payload = {
      source: "google_forms_apps_script",
      timestamp: new Date().toISOString(),
      namedValues: e.namedValues || {},
      values: e.values || []
    };

    const options = {
      method: "post",
      contentType: "application/json",
      headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log("Përgjigjja e serverit UP: " + response.getContentText());
  } catch (err) {
    Logger.log("Gabim: " + err.toString());
  }
}
```

4. **Vendosni Shkaktuesin (Trigger):**
   - Në anën e majtë të Apps Script klikoni ikonën e Orës (**Triggers**).
   - Klikoni **+ Add Trigger** (poshtë djathtas):
     - Function: `onFormSubmit`
     - Event source: `From spreadsheet`
     - Event type: `On form submit`
   - Klikoni **Save** dhe autorizoni llogarinë Google.

5. **Testimi i Menjëhershëm me Live Simulator:**
   - Mund ta testoni të gjithë rrjedhën direkt nga paneli: shkoni te menyja **Integrimi Google Forms**, plotësoni formularin testues dhe klikoni **Dërgo të Dhëna Testuese**. Do të shihni biletën PDF të gjeneruar dhe emailin e simuluar në çast!

---

## 🗄 Struktura e Arkitekturës

```
newpro/
├── server/
│   ├── db/
│   │   ├── index.js              # Lidhja me SQLite përmes node:sqlite të integruar
│   │   ├── schema.sql            # Skema relacionale me indekse dhe integritet
│   │   └── seed.js               # Ngjarjet inauguruese, llogaritë admin/staff dhe të dhënat mostër
│   ├── services/
│   │   ├── pdfGenerator.js       # Gjeneruesi vektorial A4 dhe Compact përmes pdf-lib
│   │   ├── emailService.js       # Shërbimi i dërgimit të emailave me shabllone në shqip
│   │   ├── webhookService.js     # Përpunimi, validimi dhe mbrojtja nga dublikatat
│   │   └── auditService.js       # Regjistri i pandryshueshëm i auditimit (Audit Logs)
│   ├── routes/
│   │   ├── auth.js               # Kyçja, sesionet JWT dhe menaxhimi i përdoruesve
│   │   ├── events.js             # Menaxhimi i ngjarjeve, shablloneve dhe logove
│   │   ├── registrations.js      # Kërkimi, filtrimi, shkarkimi PDF, rigjenerimi, CSV
│   │   ├── verify.js             # Verifikimi publik QR & Stacioni i Check-in për stafin
│   │   ├── webhook.js            # Pika hyrëse e Google Sheets dhe testuesi simulator
│   │   └── settings.js           # Konfigurimi SMTP, testi i emailit dhe pastrimi i të dhënave
│   ├── middleware/
│   │   └── auth.js               # Autentikimi dhe autorizimi sipas roleve (Admin / Staff)
│   └── app.js                    # Konfigurimi qendror i Express
├── src/                          # Ndërfaqja Reaguese (React + Tailwind CSS + Lucide)
│   ├── components/               # Sidebar, Header, Modal, Badge, ConfirmDialog
│   ├── pages/
│   │   ├── Dashboard.jsx         # Metrikat ekzekutive, grafikët dhe aktiviteti i fundit
│   │   ├── Events.jsx            # Menaxhimi i ceremonive dhe shablloneve
│   │   ├── Registrations.jsx     # Tabela kryesore, kërkimi i shpejtë, filtrat, PDF, CSV
│   │   ├── CheckIn.jsx           # Skaneri me kamerë dhe verifikimi në hyrje
│   │   ├── SetupGuide.jsx        # Udhëzuesi i Google Forms dhe Live Webhook Simulator
│   │   ├── VerifyPublic.jsx      # Faqja publike e verifikimit të biletës QR
│   │   ├── AuditLogs.jsx         # Regjistri i sigurisë dhe veprimeve
│   │   ├── Settings.jsx          # Konfigurimi i SMTP dhe privatësia
│   │   └── Login.jsx             # Kyçja institucionale
│   ├── context/AuthContext.jsx   # Menaxhimi i gjendjes së autentikimit
│   └── utils/api.js              # Klienti API me shkarkim skedarësh
├── tests/
│   └── workflow.test.js          # Testet e automatizuara për 15 kriteret e pranimit
├── uploads/                      # Biletat e ruajtura PDF dhe logot e ngarkuara
├── index.js                      # Pika kryesore ekzekutuese e serverit
└── package.json
```

---

## 🛡 Siguria, Privatësia dhe Menaxhimi i të Dhënave

1. **Minimizimi i të Dhënave në Kodin QR:**
   - Kodi QR nuk përmban të dhëna personale në tekst të hapur.
   - Përmban vetëm një URL të sigurt me token kriptografik të paparamendueshëm: `https://domain.edu/verify/<token_32_karaktere>`.
   - Faqja publike shfaq vetëm vlefshmërinë e biletës dhe emrin e pjesëmarrësit; të dhënat e kontaktit dhe lista e mysafirëve mbeten private.
2. **Kufizimi i Qasjes sipas Roleve (RBAC):**
   - Stafi i derës mund të shohë vetëm stacionin e check-in dhe verifikimit.
   - Veprimet shkatërruese (fshirja, ndryshimi i shablloneve, shkarkimi i të gjithë bazës në CSV) janë të kufizuara vetëm për Administratorin.
3. **Mbrojtja nga Mashtrimet dhe Përdorimi i Dyfishtë:**
   - Çdo biletë e skanuar shënohet me kohën e saktë të hyrjes.
   - Në rast të skanimit të sërishëm, sistemi shfaq alarm të kuq: *"KUJDES: Kjo biletë tashmë është përdorur më [data/ora]"*.
4. **Politika e Ruajtjes së të Dhënave (Retention Policy):**
   - Mundësi konfigurimi i afatit të ruajtjes (p.sh. 365 ditë).
   - Vegël e integruar me 1-klikim për anonimizimin e numrave të telefonit dhe shënimeve të vjetra sipas legjislacionit në fuqi.

---

## 💾 Rezervimi i Bazës së të Dhënave & Skalimi

- **Rezervimi (Backup):** Baza e të dhënave gjendet në skedarin `data.sqlite`. Me modalitetin e aktivizuar WAL (`PRAGMA journal_mode = WAL;`), kopjimi i skedarit mund të bëhet në mënyrë të sigurt pa ndërprerë punën e serverit.
- **Rruga drejt PostgreSQL:** Skema SQL dhe pyetësorët janë të dizajnuar me SQL standard. Për nevoja të ardhshme të shkallëzimit në shumë instanca (multi-node clustered), `node:sqlite` mund të zëvendësohet me lidhësin `pg` (PostgreSQL) pa modifikuar logjikën e shërbimeve.

---

Universiteti i Prishtinës "Hasan Prishtina" • Fakulteti i Mjekësisë  
*Sistemi Zyrtar i Automatizuar i Biletave dhe Regjistrimeve Digjitale*
