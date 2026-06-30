// ============================================================
// backup.js - النسخ الاحتياطي والتصدير والاستيراد
// ============================================================

// ---- تصدير JSON محلي ----
async function exportLocalJSON() {
    showToast('جارٍ تصدير البيانات...', 'info');
    try {
        const [tenants, parcels, infringements, documents, settings] = await Promise.all([
            db.from('tenants').select('*'),
            db.from('parcels').select('*'),
            db.from('infringements').select('*'),
            db.from('documents').select('*'),
            db.from('app_settings').select('*'),
        ]);

        const payload = {
            version: '1.0.0',
            exported_at: new Date().toISOString(),
            source: 'نظام الإيجارات الزراعية',
            tables: {
                tenants:       tenants.data      || [],
                parcels:       parcels.data      || [],
                infringements: infringements.data || [],
                documents:     documents.data    || [],
                app_settings:  settings.data     || [],
            }
        };

        const json    = JSON.stringify(payload, null, 2);
        const blob    = new Blob([json], { type: 'application/json' });
        const url     = URL.createObjectURL(blob);
        const a       = document.createElement('a');
        a.href        = url;
        a.download    = `ars_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        await logOp('success', 'export', 'تصدير البيانات بنجاح');
        showToast('تم تصدير البيانات بنجاح ✓', 'success');
    } catch (e) {
        showToast('فشل التصدير: ' + e.message, 'error');
    }
}

// ---- استيراد JSON محلي ----
async function importLocalJSON(file, mode = 'merge') {
    // mode: 'merge' | 'replace'
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const payload = JSON.parse(e.target.result);
                if (!payload?.tables) throw new Error('صيغة الملف غير صحيحة');

                if (mode === 'replace') {
                    // مسح البيانات الحالية أولاً
                    for (const t of ['infringements', 'documents', 'parcels', 'tenants']) {
                        await db.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
                    }
                }

                // إدراج أو تحديث
                const tables = ['tenants', 'parcels', 'infringements', 'documents'];
                for (const t of tables) {
                    const rows = payload.tables[t];
                    if (rows?.length) {
                        await db.from(t).upsert(rows, { onConflict: 'id', ignoreDuplicates: false });
                    }
                }

                if (payload.tables.app_settings?.length) {
                    for (const s of payload.tables.app_settings) {
                        await db.from('app_settings').upsert(s, { onConflict: 'key' });
                    }
                }

                invalidateCache();
                await logOp('success', 'import', `استيراد بيانات (${mode})`, { file: file.name });
                resolve();
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsText(file, 'UTF-8');
    });
}

// ---- عرض قائمة النسخ الاحتياطية ----
async function renderBackupList() {
    const list = document.getElementById('backupList');
    if (!list) return;

    list.innerHTML = '<div class="loading-row"><i class="fa fa-spinner fa-spin"></i> جارٍ التحميل...</div>';
    try {
        const backups = await Backups.getAll();
        if (!backups.length) {
            list.innerHTML = '<div class="empty-row">لا توجد نسخ احتياطية بعد</div>';
            return;
        }

        list.innerHTML = backups.map(b => `
          <div class="backup-item">
            <div class="backup-meta">
              <span class="backup-num"># ${b.backup_number}</span>
              <span class="backup-date">${b.date} ${b.time?.substring(0,5) || ''}</span>
              <span class="backup-size">${b.size || '—'}</span>
              <span class="backup-type badge-type">${b.type === 'full' ? 'كاملة' : 'جزئية'}</span>
            </div>
            <div class="backup-actions">
              ${b.download_link ? `
                <a href="${b.download_link}" target="_blank" class="btn btn-sm btn-outline" title="تحميل">
                  <i class="fa fa-download"></i>
                </a>
                <button onclick="confirmRestore('${b.download_link}', '${b.date}')" class="btn btn-sm btn-warning">
                  <i class="fa fa-undo"></i> استعادة
                </button>` : '<span class="text-muted">لا يوجد رابط</span>'}
            </div>
          </div>`).join('');
    } catch (e) {
        list.innerHTML = `<div class="error-row">خطأ: ${e.message}</div>`;
    }
}

// ---- تأكيد الاستعادة برمز مؤقت ----
async function confirmRestore(downloadLink, backupDate) {
    // طلب رمز الاستعادة
    const storedCode = await Settings.get('restore_code');
    if (storedCode) {
        const entered = prompt(`أدخل رمز الاستعادة للمضي قدماً\n(النسخة المحددة: ${backupDate})`);
        if (entered !== storedCode) {
            showToast('رمز الاستعادة غير صحيح', 'error');
            return;
        }
    }

    const confirmed = confirm(`⚠️ تحذير: ستُستبدل جميع البيانات الحالية بنسخة ${backupDate}\nهل أنت متأكد؟`);
    if (!confirmed) return;

    showToast('جارٍ الاستعادة...', 'info');
    try {
        await Backups.restore(downloadLink);
        showToast('تمت الاستعادة بنجاح ✓', 'success');
        setTimeout(() => location.reload(), 1500);
    } catch (e) {
        showToast('فشل الاستعادة: ' + e.message, 'error');
    }
}
