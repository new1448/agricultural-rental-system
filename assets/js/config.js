// ============================================================
// supabase-config.js - إعداد الاتصال بالخدمات الخارجية
// ============================================================

// إعدادات Supabase
// تنبيه: يُفضل جلب هذه القيم من متغيرات البيئة (Environment Variables) لحماية مشروعك
const SUPABASE_URL  = window._env_?.SUPABASE_URL  || 'https://tshpgcqkeumumtvpoati.supabase.co'; 
const SUPABASE_ANON = window._env_?.SUPABASE_ANON || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzaHBnY3FrZXVtdW10dnBvYXRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MDk2NjAsImV4cCI6MjA5ODM4NTY2MH0.ZSuXIsTqrs3nU4dRFyawxdD7s1E2upS8DDmFY-ftC2A'; // ضع المفتاح هنا مؤقتاً أو في متغير بيئة

// تهيئة عميل Supabase بأمان
if (typeof supabase === 'undefined') {
    console.error('فشل تحميل مكتبة Supabase! تأكد من تضمين الـ CDN في ملف الـ HTML.');
}

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON);

// ============================================================
// إعدادات WATI (WhatsApp Business API)
// ============================================================
const WATI_CONFIG = {
    apiKey  : window._env_?.WATI_API_KEY  || '',  // مفتاح WATI API
    baseUrl : window._env_?.WATI_BASE_URL || '',  // https://live-server-XXXXX.wati.io
};

// ============================================================
// إعدادات EmailJS
// ============================================================
const EMAILJS_CONFIG = {
    serviceId  : window._env_?.EMAILJS_SERVICE_ID  || '',  // service_XXXXXXX
    templateId : window._env_?.EMAILJS_TEMPLATE_ID || '',  // template_XXXXXXX
    publicKey  : window._env_?.EMAILJS_PUBLIC_KEY  || '',  // مفتاح EmailJS العام
};

// تصدير الإعدادات للاستخدام في الملفات الأخرى (إذا كنت تستخدم Modules)
// export { db, WATI_CONFIG, EMAILJS_CONFIG };
