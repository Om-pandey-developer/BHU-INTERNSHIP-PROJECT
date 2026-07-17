# BHU Domain Email Portal — Deployment & Tech Analysis Report
> **बनारस हिंदू विश्वविद्यालय (BHU) — ईमेल पोर्टल डिप्लॉयमेंट एवं तकनीकी विश्लेषण रिपोर्ट**

यह रिपोर्ट BHU ईमेल पोर्टल की फ़ाइल और फ़ोल्डर संरचना, उपयोग की गई तकनीकियों, बीएचयू की पुरानी/पारंपरिक प्रणालियों के मुकाबले इसके फायदे, और विश्वविद्यालय के ऑन-प्रिमाइसेस (On-Premise) सर्वर पर इसके सफल डिप्लॉयमेंट (Deployment) की पूरी प्रक्रिया और आवश्यकताओं का विस्तृत विवरण देती है।

---

## 1. Directory & File Structure Analysis (फ़ाइल और फ़ोल्डर संरचना)

हमारा प्रोजेक्ट एक **Monorepo-style split architecture** का उपयोग करता है जहाँ फ़्रंटएंड (Frontend) और बैकएंड (Backend) बिल्कुल अलग-अलग हैं (Decoupled)। इससे सिस्टम की स्केलेबिलिटी और सुरक्षा बढ़ती है।

```
BHU-INTERNSHIP-PROJECT/
│
├── docker-compose.yml          # PostgreSQL, pgAdmin4 (Visual DB Manager) और सभी सर्विसेज़ (WAL Archiving के साथ)
├── docker-compose.staging.yml  # UAT/Staging के लिए संपूर्ण स्टैक कंपोज़ फ़ाइल (pgAdmin port 5051 पर)
├── backup.bat / backup.sh      # डेटाबेस बैकअप स्क्रिप्ट्स (Windows & Linux)
│
├── backend/                    # NestJS (Node.js) बैकएंड सर्वर
│   ├── Dockerfile              # बैकएंड कंटेनर इमेज बनाने के लिए
│   ├── prisma/                 # डेटाबेस स्कीमा और मॉडल (PostgreSQL)
│   ├── src/
│   │   ├── main.ts             # बैकएंड का बूटस्ट्रैप फ़ाइल (CORS, Swagger UI, Global Pipes)
│   │   └── modules/            # व्यावसायिक तर्क (Auth, Applications, PDF, Google Workspace)
│   │       └── auth/           
│   │           └── captcha.service.ts # SVG Captcha जनरेट करने के लिए सर्विस
│   └── package.json            # बैकएंड की निर्भरताएँ (Dependencies) और स्क्रिप्ट्स
│
├── frontend/                   # Next.js (React) फ़्रंटएंड वेब एप्लिकेशन
│   ├── Dockerfile              # फ़्रंटएंड कंटेनर इमेज बनाने के लिए
│   ├── src/
│   │   ├── app/                # Next.js App Router (Landing, Login, Register, Dashboards)
│   │   ├── components/         # पुन: उपयोग होने वाले UI घटक (SvgCaptcha, Button, Modal, Input)
│   │   └── lib/                # सहायक पुस्तकालय (Axios API क्लाइंट और Zustand Auth Store)
│   └── package.json            # फ़्रंटएंड की निर्भरताएँ और स्क्रिप्ट्स
│
├── pdf-generator/              # Puppeteer द्वारा पीडीएफ बनाने के लिए HTML और CSS टेम्पलेट्स
│
├── documents/                  # प्रोजेक्ट के सभी तकनीकी मैनुअल, SOPs और दस्तावेज़
│   ├── bhu_deployment_and_tech_report.md
│   ├── Comprehensive_Admin_Manual.md
│   └── walkthrough.md
│
└── backups/                    # उत्पन्न बैकअप और WAL (Write-Ahead Logs) के लिए फ़ोल्डर
    └── archive/                # 1-सेकंड अंतराल वाले WAL आर्काइव्स
```

---

## 2. Technology Stack & Dependencies Matrix (तकनीकी संस्करण)

प्रोजेक्ट में उपयोग की गई मुख्य तकनीकियों, उनके संस्करण (Versions) और कार्यों की सूची नीचे दी गई है:

### A. Frontend (Next.js Layer)
| Technology / Library | Version | Purpose / Description |
| :--- | :--- | :--- |
| **Next.js** | `16.2.7` | रिएक्ट का आधुनिक फ्रेमवर्क (App Router), जो SSR (Server-Side Rendering) और तेज़ रूटिंग प्रदान करता है। |
| **React** | `19.2.4` | फ़्रंटएंड यूजर इंटरफ़ेस बनाने के लिए मुख्य कंपोनेंट लाइब्रेरी। |
| **Zustand** | `^5.0.14` | ऑथेंटिकेशन और ग्लोबल स्टेट को स्टोर करने के लिए एक बेहद हल्का और तेज़ स्टेट मैनेजमेंट लाइब्रेरी। |
| **Axios** | `^1.17.0` | बैकएंड एपीआई (NestJS) के साथ बातचीत करने और टोकन रिफ्रेश को ऑटो-हैंडल करने के लिए HTTP क्लाइंट। |
| **Tailwind CSS** | `^4.0.0` | यूटिलिटी-फ़र्स्ट सीएसएस फ्रेमवर्क, जिसका उपयोग आधुनिक, रिस्पॉन्सिव और सुंदर डिज़ाइन के लिए किया गया है। |
| **Cloudflare Turnstile**| `^1.5.3` | लाइव (Live) वातावरण में रोबोट/स्पैम सबमिशन को रोकने के लिए प्राइवेसी-फ़र्स्ट कैप्चा (CAPTCHA) प्रणाली। (वर्तमान में कोड में मौजूद है पर स्थानीय उपयोग के लिए commented है)। |

### B. Backend (NestJS Layer)
| Technology / Library | Version | Purpose / Description |
| :--- | :--- | :--- |
| **NestJS** | `^11.0.0` | एंटरप्राइज़-ग्रेड नोड.जेएस फ्रेमवर्क, जो कोडबेस को व्यवस्थित और स्केलेबल बनाता है। |
| **PostgreSQL** | `16` (Engine) | रिलेशनल डेटाबेस, जिसमें लेनदेन (Transactions), WAL Archiving (0-Data Loss) और JSONB डेटा स्टोर किया जाता है। |
| **svg-captcha** | `^1.x.x` | इंट्रानेट/स्थानीय परीक्षण के लिए कस्टम SVG कैप्चा बनाने के लिए (Noise और Case-Insensitive जांच के साथ)। |
| **Argon2** | `^0.41.0` | पासवर्ड और ओटीपी (OTP) को अत्यधिक सुरक्षित रूप से हैश करने के लिए एल्गोरिदम। |
| **Puppeteer** | `^25.1.0` | बैकएंड में क्रोमियम (Headless Chrome) चलाकर एचटीएमएल को पिक्सेल-परफेक्ट पीडीएफ में बदलने के लिए। |
| **Nodemailer** | `^6.9.0` | आवेदकों, HOD और एडमिन को ऑटोमैटिक ईमेल अलर्ट और क्रेडेंशियल भेजने के लिए। |
| **Passport & JWT** | `^11.0.0` | सुरक्षित लॉगिन, रोल-बेस्ड एक्सेस कंट्रोल (RBAC) और रिफ्रेश टोकन हैंडल करने के लिए। |
| **pgAdmin4** | `latest` | ब्राउज़र-आधारित विज़ुअल डेटाबेस मैनेजर — PostgreSQL की सभी टेबल्स, डेटा और क्वेरीज़ को GUI से देखने और चलाने के लिए। Docker Compose में शामिल (Port `5050`)। |

---

## 3. Comparison Matrix: Our Project vs BHU Legacy Systems
> **तुलना: हमारा प्रोजेक्ट बनारस हिंदू विश्वविद्यालय की पुरानी प्रणालियों से कैसे बेहतर है?**

| फ़ीचर (Feature) | पारंपरिक/पुरानी प्रणालियाँ (Legacy PHP / Java Web Forms) | हमारा आधुनिक ईमेल पोर्टल (Next.js + NestJS + DB) | फायदे और प्रभाव (Advantages & Business Impact) |
| :--- | :--- | :--- | :--- |
| **आर्किटेक्चर (Architecture)** | मोनोलिथिक (Monolithic) - डेटाबेस, सर्वर और फ्रंटएंड एक साथ जुड़े होते हैं। | **डिकपल्ड Next.js + NestJS**। दोनों अलग-अलग स्केल हो सकते हैं। | **हाई परफॉर्मेंस और स्टेबिलिटी**: भारी ट्रैफिक होने पर भी सिस्टम क्रैश नहीं होगा। |
| **खाता निर्माण (Provisioning)** | एडमिन को मैन्युअल रूप से Google Workspace कंसोल में जाकर छात्र का ईमेल बनाना पड़ता है। | **Google Workspace Admin Directory API** के साथ डायरेक्ट इंटीग्रेशन। | **100% ऑटोमेशन**: HOD के अप्रूवल बटन दबाते ही स्वचालित ईमेल जनरेशन। |
| **सुरक्षा और ऑडिट (Audit Logs)** | सिस्टम में किसने क्या बदलाव किया, इसका कोई ट्रैक रिकॉर्ड नहीं होता। | **अपरिवर्तनीय ऑडिट लॉग्स (Immutable Audit Logs)**। | **जवाबदेही (Accountability)**: हर एक्शन को IP एड्रेस और टाइमस्टैम्प के साथ सेव किया जाता है। |
| **स्पैम सुरक्षा (Spam Protection)** | पुराने रीकैप्चा (Google reCAPTCHA v2) जिसमें कारों या ट्रैफिक लाइटों पर क्लिक करना पड़ता है। | स्थानीय नेटवर्क के लिए **SVG Captcha** और इंटरनेट/लाइव के लिए **Cloudflare Turnstile**। | **लचीलापन और सुरक्षा**: इंट्रानेट पर बिना इंटरनेट काम करता है और लाइव होने पर टर्नस्टाइल स्वचालित सुरक्षा देता है। |
| **डेटा बैकअप (Data Safety)** | मैन्युअल या रोज़ाना बैकअप (जिसमें दिन भर के काम के नुकसान का डर रहता है)। | **Synchronous WAL Archiving** (हर 60 सेकंड में डेटा सेव) और **Streaming Replication** के लिए तैयार। | **0-Data Loss**: सर्वर क्रैश होने पर अधिकतम 1 मिनट का ही डेटा रिस्क होता है; स्टैंडबाय सर्वर से शून्य (0) डेटा लॉस प्राप्त किया जा सकता है। |

---

## 4. Hardware & Software Requirements (सर्वर आवश्यकताएँ और विनिर्देश)

### A. Hardware Specifications (हार्डवेयर आवश्यकताएँ)

| Resource | Minimum Requirement (कम से कम) | Recommended Requirement (अनुशंसित - उत्पादन हेतु) | Rationale (कारण) |
| :--- | :--- | :--- | :--- |
| **CPU** | 2 Cores | **4 Cores or higher** | NestJS की एपीआई प्रोसेसिंग और Puppeteer के पैरेलल क्रोमियम थ्रेड्स के लिए। |
| **RAM** | 4 GB | **8 GB or higher** | हेडलेस क्रोम (Chrome) रैम की खपत करता है। |
| **Storage** | 20 GB SSD | **50 GB - 100 GB SSD** | डेटाबेस, अपलोडेड तस्वीरें और विशेष रूप से **WAL (Write-Ahead Logs)** आर्काइव्स को स्टोर करने के लिए। |
| **Network** | 10 Mbps LAN | **100 Mbps / 1 Gbps Static IP LAN** | तेज़ और स्थिर नेटवर्क। |

### B. Software Specifications (सॉफ्टवेयर आवश्यकताएँ)

| Component | Technology / Tool | Version | Purpose (उपयोग) |
| :--- | :--- | :--- | :--- |
| **Operating System**| Linux (Ubuntu Server / Debian) | `Ubuntu 22.04 LTS` | सर्वर स्थिरता और Docker के लिए सर्वश्रेष्ठ ओएस। |
| **Runtime Container**| Docker Engine & Compose | `Docker v25+` | پورے एप्लिकेशन को सुरक्षित कंटेनरों में चलाने के लिए। |
| **Database** | PostgreSQL | `v16` | डेटा स्टोरेज और Streaming Replication के लिए। |

---

## 5. Deployment Guide on BHU Server (डिप्लॉयमेंट गाइड)

### Method 1: Docker-Based Deployment (अनुशंसित - सरल और सुरक्षित)

#### Step 1.1: Docker & Compose स्थापित करें
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
```

#### Step 1.2: कोड क्लोन करें और `.env` तैयार करें
कोड को `/opt/bhu-portal` में रखें और रूट फ़ोल्डर में आवश्यक कुंजियों (Google API, SMTP, JWT) के साथ `.env` फ़ाइल बनाएं।

#### Step 1.3: स्टैक को बिल्ड और लॉन्च करें
```bash
docker compose up -d --build
```
*(नोट: यह कमांड स्वतः ही डेटाबेस, pgAdmin, Nginx, फ़्रंटएंड और बैकएंड चालू कर देगा)*

#### Step 1.3.1: pgAdmin से Database देखें (Visual Interface)
pgAdmin ब्राउज़र में खोलें — यह Docker Compose में पहले से शामिल है, अलग से इंस्टॉल करने की ज़रूरत नहीं:
1. **ब्राउज़र में खोलें:** `http://<Server-IP>:5050`
2. **लॉगिन करें:**
   - Email: `admin@admin.com`
   - Password: `admin123`
3. **Database (Server) कनेक्ट करें:**
   - Left menu में **Servers** पर Right Click → **Register** → **Server...**
   - **General Tab:** Name = `BHU Project DB`
   - **Connection Tab:**
     - Host name/address: `db` (Docker service का नाम — Root IP नहीं)
     - Port: `5432`
     - Maintenance database: `bhu_db`
     - Username: `bhu_user`
     - Password: `securepassword`
   - **Save** दबाएं — पूरा डेटाबेस विज़ुअल रूप से दिखने लगेगा!

> **वैकल्पिक (Alternative):** यदि pgAdmin के बिना, सीधे Ubuntu कमांड शेल से डेटाबेस देखना हो:
> ```bash
> docker exec -it bhu_db psql -U bhu_user -d bhu_db
> ```
> या Ubuntu पर pgAdmin अलग से इंस्टॉल करें: `sudo apt install pgadmin4`

#### Step 1.4: डेटाबेस माइग्रेशन चलाएं
```bash
docker exec -it bhu_prod_backend npx prisma migrate deploy
docker exec -it bhu_prod_backend npm run prisma:generate
docker exec -it bhu_prod_backend npx prisma db seed
```

---

## 6. Security Integrations (कैप्चा और स्पैम सुरक्षा)

### A. SVG Captcha (Intranet / Local Server के लिए)
वर्तमान में पोर्टल में एक कस्टम `svg-captcha` लागू किया गया है। 
- **फायदा:** यदि पोर्टल केवल बीएचयू कैम्पस/इंट्रानेट पर चलता है और बाहरी इंटरनेट का एक्सेस नहीं है, तो यह कैप्चा बिना किसी बाहरी सेवा (Google/Cloudflare) के काम करेगा।
- **विशेषताएं:** यह शोर (Visual Noise) उत्पन्न करता है और यह Case-Insensitive (बड़े-छोटे अक्षरों को समान मानता है) है, जिससे छात्रों को फॉर्म भरने में आसानी होती है।

### B. Cloudflare Turnstile (Live / Internet के लिए)
जब सर्वर लाइव (Public IP/Netting) हो जाए:
1. `docker-compose.yml` में `NEXT_PUBLIC_TURNSTILE_SITE_KEY` को uncomment करें।
2. फ़्रंटएंड कोड (`login/page.tsx` और `register/page.tsx`) में `<Turnstile />` कंपोनेंट को सक्रिय करें और `SvgCaptcha` को हटा दें/comment कर दें।
3. यह बिना यूजर से कुछ क्लिक करवाए 100% बोट्स को रोक देगा।

---

## 7. Zero Data-Loss & Backup Strategies (डेटाबेस बैकअप और वाल आर्काइविंग)

बीएचयू की महत्वपूर्ण जानकारी (छात्र क्रेडेंशियल और एप्लिकेशन) को खोने से बचाने के लिए तीन-स्तरीय रणनीति (Three-Tier Strategy) लागू की गई है:

### 1. Automated/Manual DB Dump (`pg_dump`)
प्रोजेक्ट में `backup.bat` (Windows के लिए) और `backup.sh` (Linux के लिए) शामिल किए गए हैं।
- इन स्क्रिप्ट्स पर डबल-क्लिक करने या शेड्यूलर में सेट करने से डेटाबेस का पूरा `.sql` डंप `backups/` फ़ोल्डर में समय-चिह्न (timestamp) के साथ सुरक्षित हो जाएगा।

### 2. Synchronous WAL Archiving (1-Minute Safety)
`docker-compose.yml` में PostgreSQL को विशेष रूप से WAL (Write-Ahead Logging) के लिए कॉन्फ़िगर किया गया है।
- **`archive_timeout = 60`**: हर 60 सेकंड में नया डेटा एक सुरक्षित फ़ाइल (Archive) के रूप में डिस्क में लिख दिया जाता है (`backups/archive/` फ़ोल्डर में)। 
- **फायदा:** यदि अचानक हार्डवेयर क्रैश हो जाए, तो आपको अधिकतम सिर्फ 1 मिनट का डेटा नुकसान होगा।

### 3. Streaming Replication (Absolute Zero-Loss Mirroring)
भविष्य में यदि कोई भी जोखिम नहीं चाहिए, तो एक "Standby (Slave) Server" कॉन्फ़िगर किया जा सकता है।
- मास्टर डेटाबेस से डेटा रियल-टाइम (हर सेकंड) स्लेव सर्वर पर नेटवर्क के माध्यम से स्ट्रीम होगा।
- मुख्य सर्वर के क्रैश होते ही स्लेव सर्वर को बिना डेटा खोए तुरंत लाइव किया जा सकता है।

---

## 8. Summary of Advantages (निष्कर्ष)

हमारा यह वेब पोर्टल बीएचयू की आईटी अवसंरचना को निम्नलिखित लाभ पहुँचाएगा:
1. **0% मैन्युअल काम:** कंप्यूटर सेंटर ऑपरेटरों को छात्रों की जानकारी देखकर ईमेल बनाने की आवश्यकता नहीं है; सब कुछ बैकग्राउंड में एपीआई द्वारा तुरंत होता है।
2. **त्रुटि-मुक्त दस्तावेज़:** Puppeteer पिक्सेल-परफेक्ट, हस्ताक्षरित और मुद्रण योग्य आवेदन फॉर्म प्रदान करता है।
3. **विश्वसनीयता और ऑडिट:** विश्वविद्यालय प्रशासन कभी भी देख सकता है कि कौन सा ईमेल कब और किसके अनुमोदन से बना।
4. **अत्यधिक सुरक्षित:** पासवर्ड सुरक्षा (Argon2), हाइब्रिड कैप्चा प्रणाली (SVG / Turnstile), और **0-डेटा-लॉस (WAL Archiving)** बैकअप नीति के कारण यह पोर्टल किसी भी आपदा और साइबर हमले के प्रति लचीला (Resilient) है।
