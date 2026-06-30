# 🌾 نظام الإيجارات الزراعية

نظام إدارة متكامل للإيجارات الزراعية مبني على:
**GitHub → Netlify → Supabase**

---

## 🗂️ هيكل المشروع

```
agricultural-rental-system/
├── index.html                  ← الواجهة الكاملة
├── netlify.toml                ← إعدادات النشر
├── assets/
│   ├── css/style.css           ← التصميم RTL
│   └── js/
│       ├── config.js           ← ← ← أدخل بياناتك هنا
│       ├── db.js               ← طبقة البيانات
│       ├── reports.js          ← التقارير والمشاركة
│       ├── backup.js           ← النسخ الاحتياطي
│       ├── ui.js               ← الواجهة والمودالات
│       └── app.js              ← منطق التطبيق
└── supabase/
    ├── schema.sql              ← إنشاء الجداول
    └── rls-policies.sql        ← سياسات الأمان
```

---

## ⚙️ خطوات الإعداد (مرة واحدة فقط)

### الخطوة 1 — إنشاء مشروع Supabase

1. اذهب إلى [supabase.com](https://supabase.com) → **New Project**
2. اختر اسمًا وكلمة مرور قوية للقاعدة
3. بعد الإنشاء (دقيقتان)، افتح **Settings → API**
4. انسخ:
   - `Project URL` → مثال: `https://abcxyz.supabase.co`
   - `anon public` key

### الخطوة 2 — تشغيل SQL

في Supabase Dashboard → **SQL Editor**:

1. افتح ملف `supabase/schema.sql` والصق محتواه → **Run**
2. افتح ملف `supabase/rls-policies.sql` والصق محتواه → **Run**

### الخطوة 3 — إنشاء Bucket للنسخ الاحتياطية

في Supabase → **Storage → New Bucket**:
- **Name:** `backups`
- **Public:** `false`
- اضغط **Create bucket**

ثم أضف Policy للـ bucket:
```sql
-- في SQL Editor
INSERT INTO storage.buckets (id, name, public) VALUES ('backups', 'backups', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "allow_anon_uploads" ON storage.objects
FOR ALL TO anon
USING (bucket_id = 'backups')
WITH CHECK (bucket_id = 'backups');
```

### الخطوة 4 — تعديل config.js

افتح `assets/js/config.js` وضع بياناتك:
```javascript
const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_KEY_HERE';
```

### الخطوة 5 — رفع على GitHub

```bash
# إنشاء مستودع جديد على GitHub ثم:
git init
git add .
git commit -m "feat: initial commit - Agricultural Rental System"
git remote add origin https://github.com/YOUR_USERNAME/agricultural-rental-system.git
git push -u origin main
```

### الخطوة 6 — ربط Netlify بـ GitHub

1. اذهب إلى [netlify.com](https://netlify.com) → **Add new site → Import from Git**
2. اختر GitHub → اختر مستودعك
3. الإعدادات:
   - **Build command:** (اتركه فارغًا)
   - **Publish directory:** `.`
4. اضغط **Deploy site**

✅ **الآن أي `git push` يحدّث الموقع تلقائياً خلال 30 ثانية!**

---

## 🔐 إضافة EmailJS (اختياري)

1. اذهب إلى [emailjs.com](https://emailjs.com) → أنشئ حسابًا مجانيًا
2. أضف خدمة بريد (Gmail أو Outlook)
3. أنشئ Template بالمتغيرات: `{{tenant_name}}`, `{{total_area}}`, `{{total_rent}}`
4. في `config.js`:
```javascript
const EMAILJS_CONFIG = {
    serviceId  : 'service_XXXXXXX',
    templateId : 'template_XXXXXXX',
    publicKey  : 'YOUR_PUBLIC_KEY',
};
```

---

## 📱 إضافة WATI API (واتساب - اختياري)

1. اشترك في [wati.io](https://wati.io)
2. ربط رقم واتساب تجاري
3. في `config.js`:
```javascript
const WATI_CONFIG = {
    apiKey  : 'YOUR_WATI_KEY',
    baseUrl : 'https://live-server-XXXXX.wati.io',
};
```

> **بدون WATI:** التطبيق يفتح رابط `wa.me` تلقائيًا مع نص التقرير منسقًا ✓

---

## 🌐 إضافة دومين مخصص على Netlify

1. اشتر دومين من [Namecheap](https://namecheap.com) (~$10/سنة)
2. في Netlify → **Domain settings → Add custom domain**
3. أضف DNS records كما يطلبها Netlify
4. SSL ينشَّط تلقائيًا (Let's Encrypt)

---

## 📊 الجداول وعلاقاتها

```
tenants (المستأجرون)
  ↳ parcels      (القطع الفرعية)    tenant_id FK
  ↳ infringements (التعديات)        tenant_id FK
  ↳ documents    (الوثائق)          tenant_id FK

app_settings   (الإعدادات)         key/value
backups        (سجل النسخ)
system_logs    (السجلات)
```

---

## 🧮 نظام حساب المساحة

```
1 فدان = 24 قيراط = 576 سهم

المساحة الإجمالية = بيانات المستأجر الأساسية + مجموع القطع الفرعية
الإيجار = المساحة (فدان عشري) × سعر الفدان
```

---

## 🚦 حالة التعديات

| الحالة | الشرط |
|--------|-------|
| 🟢 جيد | لا توجد تعديات |
| 🟡 مراقبة | 1-2 تعدي أو مساحة < 500 م² |
| 🔴 خطير | أكثر من 2 تعدي أو مساحة ≥ 500 م² |

---

## 🛠️ التطوير المستقبلي

- [ ] إضافة نظام المصادقة (Supabase Auth)
- [ ] لوحة إحصائيات شاملة
- [ ] تصدير PDF للتقارير
- [ ] PWA (عمل بدون إنترنت)
- [ ] إشعارات تلقائية عند انتهاء عقود الإيجار

---

**المطوّر:** نظام الإيجارات الزراعية v1.0.0
