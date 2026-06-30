// ============================================================
// app.js - نقطة البداية والأحداث الرئيسية
// ============================================================

let _searchDebounce;

// ============================================================
// تهيئة التطبيق
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    // اختبار الاتصال بـ Supabase
    try {
        await Settings.get('system_name');
        showToast('متصل بقاعدة البيانات ✓', 'success', 2000);
    } catch (e) {
        showToast('تعذّر الاتصال بقاعدة البيانات — تحقق من config.js', 'error', 6000);
        console.error(e);
    }

    // ربط البحث
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            clearTimeout(_searchDebounce);
            _searchDebounce = setTimeout(() => doSearch(e.target.value), 350);
        });
        searchInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') doSearch(searchInput.value);
        });
    }

    // ربط نماذج المودالات
    bindForms();

    // تهيئة إعدادات سعر الفدان
    const price = await Settings.get('feddan_price');
    const priceInput = document.getElementById('feddanPriceInput');
    if (priceInput && price) priceInput.value = price;
});

// ============================================================
// البحث
// ============================================================
async function doSearch(query) {
    const btn = document.getElementById('searchBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>'; }

    try {
        const results = await Tenants.search(query);
        renderResults(results);
    } catch (e) {
        showToast('خطأ في البحث: ' + e.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa fa-search"></i> بحث'; }
    }
}

// ============================================================
// ربط النماذج
// ============================================================
function bindForms() {

    // ---- إضافة مستأجر ----
    const addForm = document.getElementById('addTenantForm');
    if (addForm) addForm.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = Object.fromEntries(fd.entries());
        if (!payload.name?.trim()) { showToast('اسم المستأجر مطلوب', 'error'); return; }
        const btn = e.target.querySelector('[type=submit]');
        setLoading(btn, true);
        try {
            await Tenants.add(payload);
            showToast(`تمت إضافة ${payload.name} بنجاح ✓`, 'success');
            closeModal('addTenantModal');
            e.target.reset();
            doSearch(document.getElementById('searchInput')?.value || '');
        } catch (err) {
            showToast('خطأ: ' + err.message, 'error');
        } finally { setLoading(btn, false); }
    });

    // ---- تعديل مستأجر ----
    const editForm = document.getElementById('editForm');
    if (editForm) editForm.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = Object.fromEntries(fd.entries());
        if (!payload.name?.trim()) { showToast('اسم المستأجر مطلوب', 'error'); return; }
        const btn = e.target.querySelector('[type=submit]');
        setLoading(btn, true);
        try {
            await Tenants.update(_editTenantId, payload);
            showToast('تم التعديل بنجاح ✓', 'success');
            closeModal('editModal');
            doSearch(document.getElementById('searchInput')?.value || '');
        } catch (err) {
            showToast('خطأ: ' + err.message, 'error');
        } finally { setLoading(btn, false); }
    });

    // ---- إضافة قطعة ----
    const parcelForm = document.getElementById('parcelForm');
    if (parcelForm) parcelForm.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = Object.fromEntries(fd.entries());
        const btn = e.target.querySelector('[type=submit]');
        setLoading(btn, true);
        try {
            await Parcels.add(payload);
            showToast('تمت إضافة القطعة ✓', 'success');
            closeModal('parcelModal');
            e.target.reset();
        } catch (err) {
            showToast('خطأ: ' + err.message, 'error');
        } finally { setLoading(btn, false); }
    });

    // ---- تسجيل تعدي ----
    const infrForm = document.getElementById('infrForm');
    if (infrForm) infrForm.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = Object.fromEntries(fd.entries());
        const btn = e.target.querySelector('[type=submit]');
        setLoading(btn, true);
        try {
            await Infringements.add(payload);
            showToast('تم تسجيل التعدي ✓', 'success');
            closeModal('infrModal');
            e.target.reset();
            doSearch(document.getElementById('searchInput')?.value || '');
        } catch (err) {
            showToast('خطأ: ' + err.message, 'error');
        } finally { setLoading(btn, false); }
    });

    // ---- إضافة وثيقة ----
    const docForm = document.getElementById('docForm');
    if (docForm) docForm.addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = Object.fromEntries(fd.entries());
        const btn = e.target.querySelector('[type=submit]');
        setLoading(btn, true);
        try {
            await Documents.add(payload);
            showToast('تمت إضافة الوثيقة ✓', 'success');
            closeModal('docModal');
            e.target.reset();
        } catch (err) {
            showToast('خطأ: ' + err.message, 'error');
        } finally { setLoading(btn, false); }
    });

    // ---- حفظ سعر الفدان ----
    const priceForm = document.getElementById('priceForm');
    if (priceForm) priceForm.addEventListener('submit', async e => {
        e.preventDefault();
        const price = document.getElementById('feddanPriceInput').value;
        if (!price || isNaN(price)) { showToast('أدخل سعرًا صحيحًا', 'error'); return; }
        await Settings.set('feddan_price', price);
        showToast('تم حفظ سعر الفدان ✓', 'success');
        closeModal('priceModal');
    });

    // ---- النسخ الاحتياطي ----
    const backupBtn = document.getElementById('createBackupBtn');
    if (backupBtn) backupBtn.addEventListener('click', async () => {
        setLoading(backupBtn, true, 'إنشاء...');
        try {
            const { record, json, filename } = await Backups.create();
            // تحميل محلي أيضاً
            const blob = new Blob([json], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url; a.download = filename; a.click();
            URL.revokeObjectURL(url);
            showToast(`نسخة احتياطية #${record.backup_number} تم إنشاؤها ✓`, 'success');
            renderBackupList();
        } catch (err) {
            showToast('فشل النسخ الاحتياطي: ' + err.message, 'error');
        } finally { setLoading(backupBtn, false, '<i class="fa fa-plus"></i> نسخة جديدة'); }
    });

    // ---- الاستيراد المحلي ----
    const importInput = document.getElementById('importFileInput');
    if (importInput) importInput.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        const mode = document.getElementById('importModeSelect')?.value || 'merge';
        if (mode === 'replace' && !confirm('⚠️ سيُستبدل كل البيانات الحالية! هل أنت متأكد؟')) {
            importInput.value = ''; return;
        }
        showToast('جارٍ الاستيراد...', 'info');
        try {
            await importLocalJSON(file, mode);
            showToast('تم الاستيراد بنجاح ✓', 'success');
            doSearch('');
        } catch (err) {
            showToast('فشل الاستيراد: ' + err.message, 'error');
        } finally { importInput.value = ''; }
    });
}

// ============================================================
// حذف مستأجر
// ============================================================
async function deleteTenant(id, name) {
    if (!confirm(`حذف المستأجر "${name}" وجميع بياناته؟\nهذا الإجراء لا يمكن التراجع عنه.`)) return;
    try {
        await Tenants.delete(id, name);
        showToast(`تم حذف ${name} ✓`, 'success');
        doSearch(document.getElementById('searchInput')?.value || '');
    } catch (e) {
        showToast('خطأ في الحذف: ' + e.message, 'error');
    }
}

// ============================================================
// أزرار التقرير في الملف الشخصي
// ============================================================
async function profilePrint() {
    if (!_currentProfileTenant) return;
    await printReport(_currentProfileTenant);
}

async function profileEmail() {
    if (!_currentProfileTenant) return;
    const email = prompt('أدخل عنوان البريد الإلكتروني:');
    if (!email) return;
    showToast('جارٍ الإرسال...', 'info');
    try {
        await emailReport(_currentProfileTenant, email);
        showToast('تم إرسال التقرير ✓', 'success');
    } catch (e) {
        showToast('فشل الإرسال: ' + e.message, 'error');
    }
}

async function profileWhatsApp() {
    if (!_currentProfileTenant) return;
    await shareWhatsApp(_currentProfileTenant);
}

// ============================================================
// مساعد: تعطيل الزر أثناء التحميل
// ============================================================
function setLoading(btn, loading, originalHTML) {
    if (!btn) return;
    if (loading) {
        btn._originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
    } else {
        btn.disabled = false;
        btn.innerHTML = originalHTML || btn._originalHTML || 'حفظ';
    }
}

// ============================================================
// فتح مودال النسخ الاحتياطية مع تحديث القائمة
// ============================================================
function openBackupModal() {
    openModal('backupModal');
    renderBackupList();
}
