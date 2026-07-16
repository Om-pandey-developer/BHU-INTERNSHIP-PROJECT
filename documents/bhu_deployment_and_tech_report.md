# BHU Domain Email Portal — Deployment & Tech Analysis Report
> **बनारस हिंदू विश्वविद्यालय (BHU) — ईमेल पोर्टल डिप्लॉयमेंट एवं तकनीकी विश्लेषण रिपोर्ट**

यह रिपोर्ट BHU ईमेल पोर्टल की फ़ाइल और फ़ोल्डर संरचना, उपयोग की गई तकनीकियों, बीएचयू की पुरानी/पारंपरिक प्रणालियों के मुकाबले इसके फायदे, और विश्वविद्यालय के ऑन-प्रिमाइसेस (On-Premise) सर्वर पर इसके सफल डिप्लॉयमेंट (Deployment) की पूरी प्रक्रिया और आवश्यकताओं का विस्तृत विवरण देती है।

---

## 1. Directory & File Structure Analysis (फ़ाइल और फ़ोल्डर संरचना)

हमारा प्रोजेक्ट एक **Monorepo-style split architecture** का उपयोग करता है जहाँ फ़्रंटएंड (Frontend) और बैकएंड (Backend) बिल्कुल अलग-अलग हैं (Decoupled)। इससे सिस्टम की स्केलेबिलिटी और सुरक्षा बढ़ती है।

```
BHU-INTERNSHIP-PROJECT/
│
├── docker-compose.yml          # स्थानीय विकास (Local Development) के लिए PostgreSQL और pgAdmin कंटेनर
├── docker-compose.prod.yml     # उत्पादन (Production) के लिए संपूर्ण स्टैक कंपोज़ फ़ाइल
│
├── backend/                    # NestJS (Node.js) बैकएंड सर्वर
│   ├── Dockerfile              # बैकएंड कंटेनर इमेज बनाने के लिए
│   ├── prisma/
│   │   ├── schema.prisma       # डेटाबेस स्कीमा और मॉडल (PostgreSQL)
│   │   └── seed.ts             # परीक्षण विभागों (Departments) को डेटाबेस में डालने के लिए
│   ├── src/
│   │   ├── main.ts             # बैकएंड का बूटस्ट्रैप फ़ाइल (CORS, Swagger UI, Global Pipes)
│   │   └── modules/            # व्यावसायिक तर्क (Business Logic) मॉड्यूल्स (Auth, Applications, PDF, Google Workspace)
│   └── package.json            # बैकएंड की निर्भरताएँ (Dependencies) और स्क्रिप्ट्स
│
├── frontend/                   # Next.js (React) फ़्रंटएंड वेब एप्लिकेशन
│   ├── Dockerfile              # फ़्रंटएंड कंटेनर इमेज बनाने के लिए
│   ├── public/
│   │   └── BHUlogo.png         # बीएचयू का आधिकारिक लोगो
│   ├── src/
│   │   ├── app/                # Next.js App Router (Landing, Login, Register, Dashboards)
│   │   ├── components/         # पुन: उपयोग होने वाले UI घटक (Button, Modal, Input, Timeline, StatusBadge)
│   │   └── lib/                # सहायक पुस्तकालय (Axios API क्लाइंट और Zustand Auth Store)
│   └── package.json            # फ़्रंटएंड की निर्भरताएँ और स्क्रिप्ट्स
│
├── pdf-generator/              # Puppeteer द्वारा पीडीएफ बनाने के लिए HTML और CSS टेम्पलेट्स
│   ├── index.html              # A4 आकार का फॉर्म टेम्पलेट
│   ├── style.css               # प्रिंट-तैयार पीडीएफ स्टाइल
│   └── script.js               # क्लाइंट-साइड पूर्वावलोकन (Preview) लॉजिक
│
└── nginx/                      # Nginx रिवर्स प्रॉक्सी कॉन्फ़िगरेशन फ़ोल्डर
    └── nginx.conf              # राउटिंग और एसएसएल (SSL) प्रबंधन फ़ाइल
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
| **Cloudflare Turnstile**| `^1.5.3` | रोबोट/स्पैम सबमिशन को रोकने के लिए प्राइवेसी-फ़र्स्ट कैप्चा (CAPTCHA) प्रणाली। |
| **jspdf / html2pdf.js** | `^0.14.0` | क्लाइंट-साइड पर पीडीएफ डाउनलोड और प्रिंट करने की सुविधा के लिए। |

### B. Backend (NestJS Layer)
| Technology / Library | Version | Purpose / Description |
| :--- | :--- | :--- |
| **NestJS** | `^11.0.0` | एंटरप्राइज़-ग्रेड नोड.जेएस फ्रेमवर्क, जो कोडबेस को व्यवस्थित और स्केलेबल बनाता है। |
| **Prisma ORM** | `^6.0.0` | डेटाबेस के साथ टाइप-सेफ़ (Type-safe) बातचीत और माइग्रेशन को नियंत्रित करने के लिए। |
| **PostgreSQL** | `16` (Engine) | रिलेशनल डेटाबेस, जिसमें लेनदेन (Transactions) और JSONB डेटा स्टोर किया जाता है। |
| **Argon2** | `^0.41.0` | पासवर्ड और ओटीपी (OTP) को अत्यधिक सुरक्षित रूप से हैश करने के लिए एल्गोरिदम (Bcrypt से सुरक्षित)। |
| **Puppeteer** | `^25.1.0` | बैकएंड में क्रोमियम (Headless Chrome) चलाकर एचटीएमएल को पिक्सेल-परफेक्ट पीडीएफ में बदलने के लिए। |
| **Nodemailer** | `^6.9.0` | आवेदकों, HOD और एडमिन को ऑटोमैटिक ईमेल अलर्ट और क्रेडेंशियल भेजने के लिए। |
| **Passport & JWT** | `^11.0.0` | सुरक्षित लॉगिन, रोल-बेस्ड एक्सेस कंट्रोल (RBAC) और रिफ्रेश टोकन हैंडल करने के लिए। |
| **Helmet** | `^8.0.0` | विभिन्न HTTP हेडर सेट करके बैकएंड को आम वेब हमलों (जैसे XSS, Clickjacking) से बचाने के लिए। |

---

## 3. Comparison Matrix: Our Project vs BHU Legacy Systems
> **तुलना: हमारा प्रोजेक्ट बनारस हिंदू विश्वविद्यालय की पुरानी प्रणालियों से कैसे बेहतर है?**

अक्सर सरकारी संस्थानों और विश्वविद्यालयों में पुराने सॉफ़्टवेयर आर्किटेक्चर (जैसे Legacy PHP, ASP.NET, या मैन्युअल पेपर-बेस्ड फाइल मूवमेंट) का उपयोग किया जाता है। नीचे दी गई तालिका दर्शाती है कि हमारा आधुनिक समाधान उनसे कैसे और क्यों बेहतर है:

| फ़ीचर (Feature) | पारंपरिक/पुरानी प्रणालियाँ (Legacy PHP / Java Web Forms) | हमारा आधुनिक ईमेल पोर्टल (Next.js + NestJS + DB) | फायदे और प्रभाव (Advantages & Business Impact) |
| :--- | :--- | :--- | :--- |
| **आर्किटेक्चर (Architecture)** | मोनोलिथिक (Monolithic) - डेटाबेस, सर्वर और फ्रंटएंड एक साथ जुड़े होते हैं। सर्वर पर लोड बढ़ने से पूरी साइट ठप हो जाती है। | **डिकपल्ड Next.js + NestJS**। दोनों अलग-अलग स्केल हो सकते हैं। | **हाई परफॉर्मेंस और स्टेबिलिटी**: यदि फ्रंटएंड पर भारी ट्रैफिक हो, तो भी मुख्य डेटाबेस सुरक्षित और स्थिर रहता है। |
| **यूजर इंटरफेस (UI/UX)** | धीमा और पुराना डिज़ाइन। हर क्लिक पर पूरा पेज लोड होता है। मोबाइल पर काम करने में परेशानी होती है। | **मॉडर्न SPA (Single Page Application)** - जिसमें स्केलेटन लोडर्स, ड्रॉअर मोडल्स और स्मूथ एनिमेशन हैं। | **प्रीमियम यूजर एक्सपीरियंस (UX)**: मोबाइल और डेस्कटॉप दोनों पर बेहद तेज़ और सुंदर चलता है, जिससे छात्रों/स्टाफ का समय बचता है। |
| **सत्यापन प्रक्रिया (Verification)** | फ़िजिकल फाइलें घुमाना, प्रिंट आउट लेना, HOD के दस्तखत के लिए चक्कर काटना। | **डिजिटल सिग्नेचर पैड**। छात्र स्क्रीन पर दस्तखत कर सकते हैं। HOD को डिजिटल सिग्नेचर अपलोड करनी होती है। | **कागज़ रहित (Paperless) और तेज़**: भौतिक रूप से कंप्यूटर सेंटर या विभाग जाने की आवश्यकता शून्य हो जाती है। |
| **खाता निर्माण (Provisioning)** | एडमिन (CC Admin) को मैन्युअल रूप से Google Workspace कंसोल में जाकर एक-एक छात्र का ईमेल बनाना पड़ता है। | **Google Workspace Admin Directory API** के साथ डायरेक्ट इंटीग्रेशन। | **100% ऑटोमेशन**: HOD के अप्रूवल बटन दबाते ही बैकएंड सीधे Google सर्वर से बात करके तुरंत ईमेल आईडी जेनरेट कर देता है। |
| **पासवर्ड सुरक्षा (Security Hashing)** | MD5, SHA-256 (Plain) या Bcrypt का उपयोग, जो आधुनिक GPU पासवर्ड क्रैकिंग टूल्स के सामने कमज़ोर हैं। | **Argon2 Hashing** (Winner of Password Hashing Competition) का उपयोग। | **अभेद्य सुरक्षा (Brute-Force Resistance)**: विश्वविद्यालय के स्टाफ और छात्रों के पासवर्ड डेटाबेस हैक होने पर भी सुरक्षित रहेंगे। |
| **सुरक्षा और ऑडिट (Audit Logs)** | सिस्टम में किसने क्या बदलाव किया, इसका कोई ट्रैक रिकॉर्ड नहीं होता। | **अपरिवर्तनीय ऑडिट लॉग्स (Immutable Audit Logs)**। हर एक्शन को IP एड्रेस और टाइमस्टैम्प के साथ सेव किया जाता है। | **जवाबदेही (Accountability & Forensics)**: सुरक्षा ऑडिट में मदद मिलती है और कोई भी अनधिकृत बदलाव तुरंत पकड़ा जा सकता है। |
| **स्पैम सुरक्षा (Spam/Bot Protection)** | पुराने रीकैप्चा (Google reCAPTCHA v2) जिसमें कारों या ट्रैफिक लाइटों पर बार-बार क्लिक करना पड़ता है। | **Cloudflare Turnstile** का उपयोग जो पृष्ठभूमि में बिना यूजर को परेशान किए सुरक्षा जांच करता है। | **सहज अनुभव**: बिना किसी झंझट के बोट्स (Bots) और स्पैमर्स को रोका जाता है। |
| **पीडीएफ जनरेशन (PDF Gen)** | FPDF या TCPDF जैसे टूल्स जो देखने में अनाकर्षक होते हैं और हिंदी फोंट्स/हस्ताक्षर ठीक से नहीं छाप पाते। | **Puppeteer (Headless Chrome)** जो वास्तविक HTML/CSS का उपयोग करके विश्वविद्यालय के लोगो, फोटो और डिजिटल हस्ताक्षरों के साथ ए4 पीडीएफ बनाता है। | **पेशेवर और साफ़ दस्तावेज**: डाउनलोड किए गए पीडीएफ पूरी तरह प्रिंट-रेडी और कानूनी रूप से मान्य होते हैं। |

---

## 4. Hardware & Software Requirements (सर्वर आवश्यकताएँ और विनिर्देश)

चूंकि यह एप्लिकेशन बैकएंड में पीडीएफ जनरेशन के लिए **Puppeteer (Headless Browser)** का उपयोग करता है, इसलिए इसे चलाने के लिए रैम (RAM) और प्रोसेसर (CPU) का पर्याप्त होना आवश्यक है।

### A. Hardware Specifications (हार्डवेयर आवश्यकताएँ)

| Resource | Minimum Requirement (कम से कम) | Recommended Requirement (अनुशंसित - उत्पादन हेतु) | Rationale (कारण) |
| :--- | :--- | :--- | :--- |
| **CPU** | 2 Cores (64-bit x86_64) | **4 Cores or higher** | NestJS की एपीआई प्रोसेसिंग और Puppeteer के पैरेलल क्रोमियम थ्रेड्स को बिना लैग चलाने के लिए। |
| **RAM** | 4 GB | **8 GB or higher** | हेडलेस क्रोम (Chrome) रैम की खपत करता है। 8GB रैम सर्वर को क्रैश होने से बचाएगी जब कई छात्र एक साथ फॉर्म डाउनलोड करेंगे। |
| **Storage** | 20 GB SSD | **50 GB - 100 GB SSD** | डेटाबेस (PostgreSQL), सिस्टम लॉग्स (Logs), छात्रों की अपलोडेड तस्वीरों, डिजिटल हस्ताक्षरों और जेनरेट किए गए पीडीएफ के भंडारण के लिए। |
| **Network** | 10 Mbps LAN | **100 Mbps / 1 Gbps Static IP LAN** | बीएचयू के डेटा सेंटर में सर्वर को एक स्थिर इंटरनेट कनेक्शन और स्टैटिक आईपी (Static IP) मिलना चाहिए ताकि डोमेन मैपिंग हो सके। |

### B. Software Specifications (सॉफ्टवेयर आवश्यकताएँ)

| Component | Technology / Tool | Version | Purpose (उपयोग) |
| :--- | :--- | :--- | :--- |
| **Operating System**| Linux (Ubuntu Server / Debian) | `Ubuntu 22.04 LTS` or `Debian 12` | सर्वर स्थिरता, सुरक्षा पैच और डोकर (Docker) के बेहतरीन तालमेल के लिए सर्वश्रेष्ठ ओएस। |
| **Runtime Container**| Docker Engine & Compose | `Docker v25+`, `Compose v2.20+` | [सिफारिश] पूरे एप्लिकेशन को बिना किसी लाइब्रेरी संघर्ष (Dependency conflicts) के अलग कंटेनरों में चलाने के लिए। |
| **Node.js Run** | Node.js (LTS Version) | `v20.x` or `v22.x` | यदि कंटेनर के बिना (Bare-metal) सीधे सर्वर पर चलाना हो, तो Node.js स्थापित होना चाहिए। |
| **Process Manager**| PM2 | `v5.x` | नोड एप्लिकेशन को बैकग्राउंड में जीवित रखने, क्रैश होने पर ऑटो-स्टार्ट करने और लॉग मैनेजमेंट के लिए (कंटेनर न होने पर)। |
| **Reverse Proxy** | Nginx | `v1.24+` | एसएसएल प्रमाणपत्र (SSL Certificates) को हैंडल करने, रिक्वेस्ट्स को राउट करने और लोड संतुलन के लिए। |
| **Database** | PostgreSQL | `v16` | डेटा स्टोरेज के लिए डेटाबेस सर्वर। |

---

## 5. Deployment Guide on BHU Server (डिप्लॉयमेंट गाइड)

बीएचयू के कंप्यूटर सेंटर सर्वर पर पोर्टल को स्थापित करने के दो तरीके हैं। **विधि 1 (Docker - कंटेनर आधारित)** सबसे आसान और सुरक्षित है।

### Method 1: Docker-Based Deployment (अनुशंसित - सरल और सुरक्षित)

यह विधि सिस्टम पर नोड.जेएस या डेटाबेस अलग से स्थापित किए बिना पूरे स्टैक को कंटेनरों में पैक करके चलाती है।

#### Step 1.1: Docker & Compose स्थापित करें
यदि सर्वर पर डोकर स्थापित नहीं है, तो इन कमांड्स को चलाएं:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
```

#### Step 1.2: कोड क्लोन करें और Nginx डायरेक्टरी बनाएं
सर्वर पर कोड रखें और Nginx के लिए आवश्यक फ़ोल्डर बनाएं:
```bash
cd /opt
# मान लें कि आपने कोड को /opt/bhu-portal पर कॉपी किया है
cd bhu-portal
mkdir -p nginx/ssl
```
*(अपनी SSL फ़ाइलें `bhu_portal_cert.crt` और `bhu_portal_key.key` को `/opt/bhu-portal/nginx/ssl/` में रखें)*

#### Step 1.3: उत्पादन पर्यावरण फ़ाइल (`.env`) तैयार करें
यहीं रूट फ़ोल्डर में एक `.env` फ़ाइल बनाएं:
```env
POSTGRES_USER=bhu_admin_prod
POSTGRES_PASSWORD=BhU_SeCuRe_2026_PaSsWoRd
POSTGRES_DB=bhu_email_prod_db

# Google API Credentials (Workspace Integration के लिए)
# (नोट: कुंजियाँ प्राप्त करने के लिए नीचे 'सेक्शन 6' देखें)
MOCK_GOOGLE_WORKSPACE=false
GOOGLE_DOMAIN=bhu.ac.in
GOOGLE_ADMIN_EMAIL=admin@bhu.ac.in
GOOGLE_CLIENT_EMAIL=bhu-service-account@bhu-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7...[Your Key]...\n-----END PRIVATE KEY-----"

# SMTP Settings (ईमेल भेजने के लिए)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@bhu.ac.in
SMTP_PASS=your_smtp_app_password

# Turnstile Captcha
# (नोट: कुंजियाँ प्राप्त करने के लिए नीचे 'सेक्शन 7' देखें)
TURNSTILE_SECRET_KEY=your_cloudflare_turnstile_secret
TURNSTILE_SITE_KEY=your_cloudflare_turnstile_site_key

# JWT Secrets
JWT_ACCESS_SECRET=a_very_long_random_string_for_access_token_security
JWT_REFRESH_SECRET=another_very_long_random_string_for_refresh_token_security

# URLs
FRONTEND_URL=https://emailportal.bhu.ac.in
NEXT_PUBLIC_API_URL=https://emailportal.bhu.ac.in/api/v1
```

#### Step 1.4: स्टैक को बिल्ड और लॉन्च करें
रूट डायरेक्टरी में निम्न कमांड चलाएं। यह स्वचालित रूप से फिक्स किए गए दोनों Dockerfile को पढ़कर कंटेनर्स तैयार करेगा:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

#### Step 1.5: डेटाबेस माइग्रेशन चलाएं
कंटेनर्स शुरू होने के बाद, डेटाबेस टेबल बनाने और इनिशियल विभाग डेटा (Seed data) डालने के लिए यह कमांड चलाएं:
```bash
# बैकएंड कंटेनर में डेटाबेस माइग्रेट करें
docker exec -it bhu_prod_backend npx prisma migrate deploy

# विभागों को सीड (Seed) करने के लिए
docker exec -it bhu_prod_backend npm run prisma:generate
docker exec -it bhu_prod_backend npx prisma db seed
```
अब आपका पोर्टल `https://emailportal.bhu.ac.in` पर लाइव हो जाएगा!

---

### Method 2: Bare-Metal Deployment (कंटेनर के बिना सीधे सर्वर पर)

यदि बीएचयू आईटी टीम डोकर का उपयोग नहीं करना चाहती, तो वे सीधे वर्चुअल मशीन (VM) पर इसे स्थापित कर सकते हैं:

#### Step 2.1: Node.js, PostgreSQL और Nginx स्थापित करें
```bash
# Node.js 20.x LTS स्थापित करें
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx postgresql postgresql-contrib

# Puppeteer के लिए आवश्यक लिनक्स लाइब्रेरीज़ (Chromium dependencies)
sudo apt-get install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 libasound2
```

#### Step 2.2: डेटाबेस सेट करें
PostgreSQL में लॉगिन करें और नया डेटाबेस व यूजर बनाएं:
```bash
sudo -i -u postgres psql
```
```sql
CREATE DATABASE bhu_email_portal;
CREATE USER bhu_admin WITH PASSWORD 'bhu_secure_password_2026';
GRANT ALL PRIVILEGES ON DATABASE bhu_email_portal TO bhu_admin;
\q
```

#### Step 2.3: बैकएंड कॉन्फ़िगर और रन करें (PM2 के साथ)
1. `backend/.env` फ़ाइल बनाएं और डेटाबेस यूआरएल व अन्य कुंजियाँ भरें:
   ```env
   DATABASE_URL="postgresql://bhu_admin:bhu_secure_password_2026@localhost:5432/bhu_email_portal?schema=public"
   
   # Google Workspace (देखें सेक्शन 6)
   MOCK_GOOGLE_WORKSPACE=false
   GOOGLE_CLIENT_EMAIL="your-service-account@..."
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   
   # Cloudflare Turnstile (देखें सेक्शन 7)
   TURNSTILE_SECRET_KEY="your_secret"
   TURNSTILE_SITE_KEY="your_site_key"
   
   # JWT & SMTP
   JWT_ACCESS_SECRET="your_access_secret"
   JWT_REFRESH_SECRET="your_refresh_secret"
   SMTP_HOST="smtp.gmail.com"
   SMTP_USER="noreply@bhu.ac.in"
   SMTP_PASS="your_app_password"
   ```
2. बैकएंड डायरेक्टरी में जाकर इंस्टॉल और रन करें:
   ```bash
   cd /opt/bhu-portal/backend
   npm install
   npx prisma generate
   npx prisma migrate dev --name init
   npm run build
   # PM2 प्रक्रिया प्रबंधक स्थापित करें और शुरू करें
   sudo npm install -g pm2
   pm2 start dist/main.js --name bhu-backend
   pm2 save
   pm2 startup
   ```

#### Step 2.4: फ़्रंटएंड कॉन्फ़िगर और रन करें
1. फ़्रंटएंड डायरेक्टरी में जाएं और इंस्टॉल करें:
   ```bash
   cd /opt/bhu-portal/frontend
   npm install
   ```
2. `.env.production` फ़ाइल बनाएं:
   `NEXT_PUBLIC_API_URL="https://emailportal.bhu.ac.in/api/v1"`
3. फ़्रंटएंड को बिल्ड और रन करें:
   ```bash
   npm run build
   pm2 start npm --name "bhu-frontend" -- start
   pm2 save
   ```

#### Step 2.5: Nginx कॉन्फ़िगर करें
Nginx होस्ट फ़ाइल खोलें:
```bash
sudo nano /etc/nginx/sites-available/emailportal.bhu.ac.in
```
निम्नलिखित कॉन्फ़िगरेशन पेस्ट करें (यह रिक्वेस्ट को फ़्रंटएंड और बैकएंड पोर्ट्स पर भेजता है):
```nginx
server {
    listen 80;
    server_name emailportal.bhu.ac.in;

    location /uploads/ {
        alias /opt/bhu-portal/backend/uploads/;
        client_max_body_size 5M;
    }

    location /api/v1/ {
        proxy_pass http://localhost:4000/api/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```
सिस्टम पर साइट को सक्रिय करें और Nginx को पुनः लोड करें:
```bash
sudo ln -s /etc/nginx/sites-available/emailportal.bhu.ac.in /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 6. Real Google Workspace Integration Flow (गूगल वर्कस्पेस लाइव एकीकरण)

स्थानीय परीक्षण में हम `MOCK_GOOGLE_WORKSPACE=true` रखते हैं, लेकिन जब इसे बीएचयू सर्वर पर लाइव करना हो तो ये चरण पूरे करें:

1. **Google Cloud Console** (`console.cloud.google.com`) में लॉगिन करें और नया प्रोजेक्ट बनाएं।
2. **Admin SDK API** को सक्षम (Enable) करें।
3. **Service Account** बनाएं और उसकी JSON कुंजी (Key file) डाउनलोड करें।
4. Google Workspace Admin Console (`admin.google.com`) में जाएं:
   - **Security** -> **Access and data control** -> **API controls** -> **Manage Domain-Wide Delegation** पर क्लिक करें।
   - नया क्लाइंट जोड़ें, क्लाइंट आईडी में अपने सर्विस अकाउंट की **Client ID** डालें।
   - निम्नलिखित Scope को अनुमति दें:
     `https://www.googleapis.com/auth/admin.directory.user`
5. इस कुंजियों और ईमेल को `.env` में अपडेट करें और `MOCK_GOOGLE_WORKSPACE=false` सेट करें।

---

## 7. Cloudflare Turnstile Setup (बोट/स्पैम सुरक्षा एकीकरण)

वेबसाइट को स्वचालित बोट्स और स्पैम सबमिशन से बचाने के लिए Cloudflare Turnstile का उपयोग किया गया है। उत्पादन (Production) में इसे सक्रिय करने के लिए:

1. **Cloudflare Dashboard** (`dash.cloudflare.com`) में लॉगिन करें।
2. बायीं ओर के मेनू से **Turnstile** चुनें।
3. **Add Site** बटन पर क्लिक करें:
   - **Site Name:** BHU Email Portal
   - **Domain:** `emailportal.bhu.ac.in` (और यदि आवश्यक हो तो `localhost` परीक्षण के लिए)
   - **Widget Mode:** Managed (अनुशंसित)
4. सबमिट करने के बाद, आपको **Site Key** और **Secret Key** मिलेगी।
5. इन कुंजियों को अपनी `.env` फ़ाइल में अपडेट करें:
   ```env
   TURNSTILE_SITE_KEY=your_cloudflare_turnstile_site_key
   TURNSTILE_SECRET_KEY=your_cloudflare_turnstile_secret
   ```
*(नोट: स्थानीय विकास के दौरान यदि आप इन कुंजियों को खाली छोड़ देते हैं, तो बैकएंड सत्यापन को छोड़ देगा)*

---

## 8. Security Hardening Checklist (डिप्लॉयमेंट सुरक्षा जांच सूची)

उत्पादन डिप्लॉयमेंट से पहले सुरक्षा ऑडिट रिपोर्ट के आधार पर इन बातों का विशेष ध्यान रखें:

- [ ] **Rate Limiting:** लॉग-इन रूट (`/api/v1/auth/login`) पर थ्रॉटलर को सख्त रखें (उदा. अधिकतम 5 प्रयास प्रति मिनट) ताकि कोई भी डिक्शनरी या ब्रूट-फोर्स हमला न कर सके।
- [ ] **SSL (HTTPS):** यह संवेदनशील छात्र क्रेडेंशियल को संभालता है, इसलिए पूरे पोर्टल पर HTTPS (SSL प्रमाणपत्र) लागू करना अनिवार्य है। नि:शुल्क प्रमाणपत्र के लिए `Certbot` (Let's Encrypt) का उपयोग किया जा सकता है: `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx`.
- [ ] **User Input Sanitization:** पीडीएफ जनरेटर में Puppeteer द्वारा निष्पादित होने वाले इनपुट (जैसे छात्र का नाम, विभाग) को सैनिटाइज़ किया गया है ताकि **Server-Side Request Forgery (SSRF)** या पीडीएफ-आधारित XSS हमलों से बचा जा सके।
- [ ] **File Size & Type Checks:** Multer कॉन्फ़िगरेशन में यह सुनिश्चित किया गया है कि फ़ाइल का आकार 2MB से अधिक न हो, और केवल `.png`, `.jpg` या `.jpeg` की अनुमति हो ताकि दुर्भावनापूर्ण स्क्रिप्ट्स सर्वर पर अपलोड न हों।

---

## 9. Summary of Advantages (निष्कर्ष)

हमारा यह वेब पोर्टल बीएचयू की आईटी अवसंरचना को निम्नलिखित लाभ पहुँचाएगा:
1. **0% मैन्युअल काम:** कंप्यूटर सेंटर ऑपरेटरों को छात्रों की जानकारी देखकर ईमेल बनाने की आवश्यकता नहीं है; सब कुछ बैकग्राउंड में एपीआई द्वारा तुरंत होता है।
2. **त्रुटि-मुक्त दस्तावेज़:** Puppeteer पिक्सेल-परफेक्ट, हस्ताक्षरित और मुद्रण योग्य आवेदन फॉर्म प्रदान करता है।
3. **विश्वसनीयता और ऑडिट:** विश्वविद्यालय प्रशासन कभी भी देख सकता है कि कौन सा ईमेल कब और किसके अनुमोदन से बना।
4. **अत्यधिक सुरक्षित:** पासवर्ड सुरक्षा, कैप्चा सुरक्षा और दर सीमा सुरक्षा (Rate Limiting) के कारण यह किसी भी प्रकार के साइबर हमले के प्रति लचीला है।
