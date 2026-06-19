# Image Upload & Handling Documentation

Ye document explain karta hai ki BHU Email Portal project mein images (photo aur signature) kaise handle, store, aur serve ho rahi hain, aur unki quality/size kahan manage hoti hai.

## 1. File Size Limits (Image & Signature)
Aapke backend mein photo aur signature ki size limits `applications.controller.ts` file mein set ki gayi hain.

- **File Path:** `backend/src/modules/applications/applications.controller.ts`
- **Location:** Line 51 se 78 ke aas-paas (jahan `@Post()` route define hai).
- **Code Reference:**
  ```typescript
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'photo', maxCount: 1 },
        { name: 'signature', maxCount: 1 },
      ],
      {
        limits: { fileSize: 2 * 1024 * 1024 }, // YAHAN 2MB LIMIT LIKHI HAI
      }
    )
  )
  ```

## 2. Image Storage Process (How it works)
Photo aur signature ko store karne ka pura process **2 steps** mein kaam karta hai:

### Step 1: Physical File Save (Uploads Folder)
Jab user form submit karta hai, toh `Multer` library us file ko directly database mein save karne ki jagah backend ke `uploads` folder mein physical file ki tarah save karti hai.
- **Path:** `./uploads` (backend folder ke andar).
- **Filename generation:** Taki alag-alag users ki images ka naam clash na ho, system automatically upload time aur random number jod kar naya naam banata hai.
  - Photo Example: `photo-170123456789-123456.jpg`
  - Signature Example: `sig-170123456789-654321.png`

### Step 2: Path Saved in Database
Jab file `uploads` folder mein successfully save ho jati hai, toh uska address (path) nikal kar `applications.service.ts` Prisma ORM ka use karke us user ki entry ke sath database mein save kar deta hai.
- **Database Columns:** `photoStoragePath` aur `signatureStoragePath`
- **Database Example Data:** `uploads/photo-170123456789-123456.jpg` (Sirf text ke format mein path save hota hai).

## 3. Maintaining Image Quality (Preventing Distortion)
Taki image clear rahe aur stretch ya distorted na ho, ise handle karne ke 2 options hote hain:

> [!TIP]
> **Option A: Frontend mein (Recommended)**
> Backend par bhejne se pehle frontend code (React/Next.js) mein hi canvas ya compression library (jaise `browser-image-compression`) use karke image ko resize aur compress karein. Isse data upload speed fast hoti hai aur aspect ratio (jaise 1:1 for photo) maintain rehta hai.

> [!NOTE]
> **Option B: Backend mein (NestJS)**
> Backend mein process karne ke liye `sharp` naam ki library ka use kiya ja sakta hai (`npm install sharp`). Iska logic aapko `applications.service.ts` ke `create` function mein image upload hone ke baad add karna hoga.
> ```typescript
> // Example using sharp:
> await sharp(photoPath).resize(300, 300, { fit: 'cover' }).jpeg({ quality: 90 }).toFile(newPhotoPath);
> ```

## 4. Serving the Uploads Folder to Frontend
NestJS security features ki wajah se internal files aur folders ko automatically internet par show (public) nahi karta. Uploaded images ko frontend par dikhane ke liye `ServeStaticModule` ka setup zaroori hai.

**Setup Steps:**
1. **Package install karein:** `npm install @nestjs/serve-static` (Backend folder mein run karein)
2. **`backend/src/app.module.ts` mein configuration add karein:**

```typescript
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
// ... aapke baaki imports

@Module({
  imports: [
    // ... aapke purane imports (ConfigModule, PrismaModule etc.)
    
    // YAHA NEW CODE ADD KAREIN:
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'), // uploads folder ka actual path
      serveRoot: '/uploads/', // Browser me kis URL path se image access hogi
    }),
    
    // ...
  ],
})
export class AppModule {}
```

**Result:**
Is setup ke baad, agar database mein photo ka path `uploads/photo-123.jpg` hai, toh aap apne React/Next.js frontend mein us image ko directly URL se dikha payenge:
```html
<img src="http://localhost:4000/uploads/photo-123.jpg" alt="User Photo" />
```
