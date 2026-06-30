
// ============================================================
// supabase-config.js - إعداد الاتصال بـ Supabase
// ضع بيانات مشروعك هنا بعد إنشائه على supabase.com
// ============================================================

const SUPABASE_URL  = 'https://tshpgcqkeumumtvpoati.supabase.co/rest/v1/';   // ← استبدل
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzaHBnY3FrZXVtdW10dnBvYXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MDk2NjAsImV4cCI6MjA5ODM4NTY2MH0.ZSuXIsTqrs3nU4dRFyawxdD7s1E2upS8DDmFY-ftC2A';                         // ← استبدل

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

