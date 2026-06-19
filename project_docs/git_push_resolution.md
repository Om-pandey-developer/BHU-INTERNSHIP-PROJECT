# GitHub Push Process & Merge Conflict Resolution

जब आपने मुझे कोड को GitHub पर पुश करने के लिए कहा, तो हमें रास्ते में कुछ रुकावटों (Merge Conflicts) का सामना करना पड़ा क्योंकि GitHub (Remote Repository) पर पहले से ही कुछ नए बदलाव मौजूद थे जो आपके लोकल सिस्टम पर नहीं थे। 

यहाँ स्टेप-बाय-स्टेप विस्तार से समझाया गया है कि बैकग्राउंड में क्या-क्या हुआ और मैंने हर समस्या को कैसे हल किया:

## 1. फाइल्स को Commit करना
सबसे पहले, मैंने देखा कि कौन सी फाइल्स में बदलाव हुए हैं (`git status`) और फिर उन सभी नए फीचर्स और UI बदलावों को एक साथ पैक करके एक कमिट (Commit) बनाया।

**कमांड्स:**
```bash
git add .
git commit -m "feat: implement UI/UX and functional enhancements (SignaturePad, SkeletonLoader, Audit Logs, Email Notifications)"
```
**परिणाम:** यह सफलतापूर्वक हो गया और हमारे सारे नए बदलाव लोकल गिट (Local Git) में सुरक्षित हो गए।

## 2. GitHub पर Push करने की पहली कोशिश (Failure)
इसके बाद मैंने लोकल कोड को GitHub पर भेजने की कोशिश की।

**कमांड:**
```bash
git push
```
**एरर (Error):** 
```text
! [rejected] master -> master (fetch first)
error: failed to push some refs to 'https://github.com/Om-pandey-developer/BHU-INTERNSHIP-PROJECT.git'
hint: Updates were rejected because the remote contains work that you do not have locally.
```
**क्या हुआ?** GitHub ने हमारी फाइल्स लेने से मना कर दिया क्योंकि GitHub पर `master` ब्रांच में किसी और ने (या आपने खुद किसी दूसरे कंप्यूटर/ब्राउज़र से) कुछ नए कमिट्स (`a53d89a` और `ec5d920`) पुश किए थे। GitHub का नियम है कि पहले आपको सर्वर का नया कोड अपने पास डाउनलोड (Pull) करना होगा, तभी आप अपना कोड ऊपर (Push) भेज सकते हैं।

## 3. GitHub से कोड Pull करने की कोशिश (Rebase Conflict)
मैंने GitHub से नया कोड मंगाने और हमारे बदलावों को उसके ऊपर सेट करने (Rebase) की कोशिश की।

**कमांड:**
```bash
git pull --rebase
```
**एरर (Error):** 
```text
CONFLICT (content): Merge conflict in frontend/src/app/dashboard/applicant/new/page.tsx
CONFLICT (content): Merge conflict in frontend/src/app/globals.css
```
**क्या हुआ?** जब गिट ने GitHub वाले कोड और हमारे नए कोड को मिलाने की कोशिश की, तो उसे दो फाइल्स (`page.tsx` और `globals.css`) में टकराव (Conflict) मिला। इसका मतलब है कि जिस जगह पर हमने नए फीचर्स लिखे थे, ठीक उसी जगह पर GitHub वाले कोड में भी बदलाव थे। गिट खुद से तय नहीं कर पाया कि कौन सा कोड रखना है।

## 4. Rebase को कैंसिल करके Merge का इस्तेमाल करना
चूँकि Rebase में कॉन्फ्लिक्ट्स आ गए थे और हम एक अलग ब्रांच स्टेट (Detached HEAD) में फँस गए थे, मैंने Rebase को कैंसिल कर दिया और एक सुरक्षित तरीका (Merge) अपनाया।

**कमांड्स:**
```bash
git rebase --abort
git pull --no-rebase
```
**परिणाम:** इसने फिर से कॉन्फ्लिक्ट (Conflict) दिखाया, लेकिन इस बार हम अपनी मुख्य `master` ब्रांच पर ही थे, जिससे फाइल्स को ठीक करना आसान था।

## 5. Conflicts की जाँच करना और उन्हें सुलझाना (Resolution)
मैंने टर्मिनल के जरिए चेक किया कि फाइल्स में कहाँ और क्या टकराव हो रहा है।

**कमांड:**
```bash
git diff
```
**मैंने क्या देखा?**
1. **`globals.css`**: GitHub वाले कोड में कुछ कैरेक्टर्स करप्ट हो गए थे (जैसे ` ? ? ?`), जबकि हमारा लोकल कोड (जिसमें हमने Mobile Responsiveness डाला था) बिल्कुल सही था।
2. **`new/page.tsx`**: GitHub वाले कोड में कुछ मामूली स्पेसिंग और इम्पोर्ट्स में अंतर था, जबकि हमारे लोकल कोड में `SignaturePad` और दूसरे नए फीचर्स का पूरा कोड मौजूद था।

**समाधान (Resolution):**
चूँकि हमारा लोकल कोड ज्यादा नया, सही और फीचर-रिच था, मैंने गिट को निर्देश दिया कि वह GitHub वाले करप्ट/पुराने कोड को इग्नोर करे और हमारे लोकल कोड को ही फाइनल माने।

**कमांड्स:**
```bash
git checkout HEAD -- frontend/src/app/globals.css
git checkout HEAD -- frontend/src/app/dashboard/applicant/new/page.tsx
```
*(इस कमांड का मतलब है: "कॉन्फ्लिक्ट वाली फाइल्स के लिए हमारे लोकल (HEAD) वर्ज़न को ही रखो और GitHub के वर्ज़न को हटा दो।")*

## 6. Merge को पूरा करना और फाइनली Push करना
कॉन्फ्लिक्ट्स सुलझाने के बाद, मैंने गिट को बताया कि समस्या सुलझ गई है और मैंने एक "Merge Commit" बना दिया।

**कमांड्स:**
```bash
git add .
git commit -m "Merge upstream and resolve conflicts favoring local enhancements"
```
**परिणाम:** लोकल और GitHub का कोड सफलतापूर्वक मिल गया (Merge हो गया)।

इसके बाद मैंने सारा कोड फाइनली GitHub पर भेज दिया।

**कमांड:**
```bash
git push
```
**परिणाम:**
```text
To https://github.com/Om-pandey-developer/BHU-INTERNSHIP-PROJECT.git
   ec5d920..ffb37cc  master -> master
```
**सफलता (Success)!** सारा कोड, जिसमें आपके सारे नए फीचर्स (Signature Pad, Skeleton Loaders, Drawer Modals) और GitHub का पुराना डेटा शामिल है, अब सुरक्षित रूप से GitHub पर लाइव है। 

---
**निष्कर्ष (Conclusion):** 
जब भी कई लोग या सिस्टम एक ही प्रोजेक्ट पर काम करते हैं तो Git Merge Conflicts आना बहुत आम बात है। इसका सीधा सा मतलब होता है कि गिट आपसे पूछ रहा है "यहाँ दो अलग-अलग बदलाव हैं, मुझे कौन सा रखना चाहिए?"। हमने अपने नए कोड को चुना और सफलता से प्रोजेक्ट अपडेट कर दिया।
