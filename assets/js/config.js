// ============================================================
// supabase-config.js - إعداد الاتصال بـ Supabase
// ضع بيانات مشروعك هنا بعد إنشائه على supabase.com
// ============================================================

const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';   // ← استبدل
const SUPABASE_ANON = 'YOUR_ANON_KEY';                         // ← استبدل

// تهيئة العميل
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ============================================================
// إعدادات WATI (WhatsApp Business API)
// اتركها فارغة إذا لم تشترك بعد → سيُستخدم wa.me تلقائياً
// ============================================================
const WATI_CONFIG = {
    apiKey  : '',          // مفتاح WATI API
    baseUrl : '',          // https://live-server-XXXXX.wati.io
};

// ============================================================
// إعدادات EmailJS
// ============================================================
const EMAILJS_CONFIG = {
    serviceId  : '',       // service_XXXXXXX
    templateId : '',       // template_XXXXXXX
    publicKey  : '',       // مفتاح EmailJS العام
};
