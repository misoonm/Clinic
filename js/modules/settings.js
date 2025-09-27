// إدارة الإعدادات
import { showNotification } from '../utils/helpers.js';

class SettingsManager {
    constructor(app) {
        this.app = app;
        this.db = app.db;
    }

    async init() {
        await this.renderSettings();
        this.setupEventListeners();
    }

    async renderSettings() {
        const contentArea = document.getElementById('contentArea');
        
        contentArea.innerHTML = `
            <div class="settings-module">
                <div class="module-header">
                    <h2>إعدادات النظام</h2>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="saveSettingsBtn">
                            <i class="fas fa-save"></i> حفظ الإعدادات
                        </button>
                    </div>
                </div>
                
                <div class="settings-tabs">
                    <div class="tab-nav">
                        <button class="tab-link active" data-tab="general">عام</button>
                        <button class="tab-link" data-tab="appointments">المواعيد</button>
                        <button class="tab-link" data-tab="billing">الفواتير</button>
                        <button class="tab-link" data-tab="notifications">الإشعارات</button>
                        <button class="tab-link" data-tab="security">الأمان</button>
                        <button class="tab-link" data-tab="backup">النسخ الاحتياطي</button>
                    </div>
                    
                    <div class="tab-content">
                        <div id="general-tab" class="tab-pane active">
                            ${await this.renderGeneralSettings()}
                        </div>
                        
                        <div id="appointments-tab" class="tab-pane">
                            ${await this.renderAppointmentsSettings()}
                        </div>
                        
                        <div id="billing-tab" class="tab-pane">
                            ${await this.renderBillingSettings()}
                        </div>
                        
                        <div id="notifications-tab" class="tab-pane">
                            ${await this.renderNotificationsSettings()}
                        </div>
                        
                        <div id="security-tab" class="tab-pane">
                            ${await this.renderSecuritySettings()}
                        </div>
                        
                        <div id="backup-tab" class="tab-pane">
                            ${await this.renderBackupSettings()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupTabNavigation();
    }

    async renderGeneralSettings() {
        const settings = await this.db.getSettingsByCategory('general');
        
        return `
            <div class="settings-form">
                <h3>الإعدادات العامة</h3>
                <div class="form-grid">
                    ${settings.map(setting => this.renderSettingField(setting)).join('')}
                </div>
            </div>
        `;
    }

    async renderAppointmentsSettings() {
        const settings = await this.db.getSettingsByCategory('appointments');
        
        return `
            <div class="settings-form">
                <h3>إعدادات المواعيد</h3>
                <div class="form-grid">
                    ${settings.map(setting => this.renderSettingField(setting)).join('')}
                </div>
            </div>
        `;
    }

    async renderBillingSettings() {
        const settings = await this.db.getSettingsByCategory('billing');
        
        return `
            <div class="settings-form">
                <h3>إعدادات الفواتير والمحاسبة</h3>
                <div class="form-grid">
                    ${settings.map(setting => this.renderSettingField(setting)).join('')}
                </div>
            </div>
        `;
    }

    async renderNotificationsSettings() {
        const settings = await this.db.getSettingsByCategory('notifications');
        
        return `
            <div class="settings-form">
                <h3>إعدادات الإشعارات</h3>
                <div class="form-grid">
                    ${settings.map(setting => this.renderSettingField(setting)).join('')}
                </div>
            </div>
        `;
    }

    async renderSecuritySettings() {
        const settings = await this.db.getSettingsByCategory('security');
        
        return `
            <div class="settings-form">
                <h3>إعدادات الأمان</h3>
                <div class="form-grid">
                    ${settings.map(setting => this.renderSettingField(setting)).join('')}
                </div>
            </div>
        `;
    }

    async renderBackupSettings() {
        const backups = await this.db.getAll('backups');
        
        return `
            <div class="settings-form">
                <h3>النسخ الاحتياطي</h3>
                
                <div class="backup-actions">
                    <button class="btn btn-primary" id="createBackupBtn">
                        <i class="fas fa-plus"></i> إنشاء نسخة احتياطية
                    </button>
                    <button class="btn btn-outline" id="restoreBackupBtn">
                        <i class="fas fa-redo"></i> استعادة نسخة
                    </button>
                    <button class="btn btn-outline" id="exportDataBtn">
                        <i class="fas fa-download"></i> تصدير البيانات
                    </button>
                </div>
                
                <div class="backup-list">
                    <h4>النسخ الاحتياطية السابقة</h4>
                    ${backups.length === 0 ? `
                        <div class="empty-state">
                            <p>لا توجد نسخ احتياطية</p>
                        </div>
                    ` : `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>التاريخ</th>
                                    <th>النوع</th>
                                    <th>الحجم</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${backups.map(backup => `
                                    <tr>
                                        <td>${formatDate(backup.backupDate)}</td>
                                        <td>${backup.type}</td>
                                        <td>${this.formatFileSize(backup.size)}</td>
                                        <td>
                                            <button class="btn-icon restore-backup" data-id="${backup.id}">
                                                <i class="fas fa-redo"></i>
                                            </button>
                                            <button class="btn-icon download-backup" data-id="${backup.id}">
                                                <i class="fas fa-download"></i>
                                            </button>
                                            <button class="btn-icon delete-backup" data-id="${backup.id}">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>
        `;
    }

    renderSettingField(setting) {
        const fieldId = `setting_${setting.key}`;
        
        switch (setting.type) {
            case 'text':
                return `
                    <div class="form-group">
                        <label for="${fieldId}">${setting.label}</label>
                        <input type="text" id="${fieldId}" name="${setting.key}" 
                               value="${setting.value}" class="form-control"
                               placeholder="${setting.description}">
                    </div>
                `;
                
            case 'number':
                return `
                    <div class="form-group">
                        <label for="${fieldId}">${setting.label}</label>
                        <input type="number" id="${fieldId}" name="${setting.key}" 
                               value="${setting.value}" class="form-control"
                               placeholder="${setting.description}">
                    </div>
                `;
                
            case 'boolean':
                return `
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="${fieldId}" name="${setting.key}" 
                                   ${setting.value ? 'checked' : ''}>
                            <span class="checkmark"></span>
                            ${setting.label}
                        </label>
                        <small>${setting.description}</small>
                    </div>
                `;
                
            case 'select':
                return `
                    <div class="form-group">
                        <label for="${fieldId}">${setting.label}</label>
                        <select id="${fieldId}" name="${setting.key}" class="form-control">
                            ${setting.options.map(option => `
                                <option value="${option}" ${setting.value === option ? 'selected' : ''}>
                                    ${option}
                                </option>
                            `).join('')}
                        </select>
                        <small>${setting.description}</small>
                    </div>
                `;
                
            case 'textarea':
                return `
                    <div class="form-group full-width">
                        <label for="${fieldId}">${setting.label}</label>
                        <textarea id="${fieldId}" name="${setting.key}" class="form-control" 
                                  rows="3" placeholder="${setting.description}">${setting.value}</textarea>
                    </div>
                `;
                
            default:
                return `
                    <div class="form-group">
                        <label for="${fieldId}">${setting.label}</label>
                        <input type="text" id="${fieldId}" name="${setting.key}" 
                               value="${setting.value}" class="form-control"
                               placeholder="${setting.description}">
                    </div>
                `;
        }
    }

    setupTabNavigation() {
        document.querySelectorAll('.tab-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                
                // إخفاء جميع المحتويات
                document.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('active');
                });
                
                // إلغاء تنشيط جميع الأزرار
                document.querySelectorAll('.tab-link').forEach(link => {
                    link.classList.remove('active');
                });
                
                // إظهار المحتوى المحدد
                document.getElementById(`${tabName}-tab`).classList.add('active');
                e.target.classList.add('active');
            });
        });
    }

    setupEventListeners() {
        document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('createBackupBtn')?.addEventListener('click', () => {
            this.createBackup();
        });
    }

    async saveSettings() {
        try {
            const settingsToUpdate = [];
            const formData = new FormData();
            
            // جمع البيانات من جميع الحقول
            document.querySelectorAll('input, select, textarea').forEach(field => {
                if (field.name) {
                    let value = field.type === 'checkbox' ? field.checked : field.value;
                    settingsToUpdate.push({
                        key: field.name,
                        value: value
                    });
                }
            });
            
            await this.db.updateMultipleSettings(settingsToUpdate, this.app.auth.getCurrentUser()?.id);
            showNotification('تم حفظ الإعدادات بنجاح', 'success');
            
        } catch (error) {
            console.error('خطأ في حفظ الإعدادات:', error);
            showNotification('فشل في حفظ الإعدادات', 'error');
        }
    }

    async createBackup() {
        try {
            await this.db.createAdvancedBackup();
            showNotification('تم إنشاء نسخة احتياطية بنجاح', 'success');
            await this.renderSettings(); // إعادة تحميل القائمة
        } catch (error) {
            console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
            showNotification('فشل في إنشاء النسخة الاحتياطية', 'error');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

export default SettingsManager;
