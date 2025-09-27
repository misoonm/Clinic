// إدارة السجلات الطبية
import { showNotification, confirmAction, formatDate } from '../utils/helpers.js';

class MedicalRecordsManager {
    constructor(app) {
        this.app = app;
        this.db = app.db;
    }

    async init() {
        await this.renderMedicalRecords();
    }

    async renderMedicalRecords() {
        const contentArea = document.getElementById('contentArea');
        
        contentArea.innerHTML = `
            <div class="medical-records-module">
                <div class="module-header">
                    <h2>السجلات الطبية</h2>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="addRecordBtn">
                            <i class="fas fa-file-medical"></i> سجل طبي جديد
                        </button>
                    </div>
                </div>
                
                <div class="search-section">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="recordSearch" placeholder="ابحث باسم المريض أو التشخيص...">
                        <select id="patientFilter">
                            <option value="">جميع المرضى</option>
                        </select>
                    </div>
                </div>
                
                <div class="records-container">
                    <div class="records-list" id="recordsList">
                        <!-- سيتم ملؤه ديناميكياً -->
                    </div>
                </div>
            </div>
        `;

        await this.loadPatients();
        await this.loadMedicalRecords();
    }

    async loadMedicalRecords() {
        try {
            const records = await this.db.getAll('medicalRecords');
            this.renderRecordsList(records);
        } catch (error) {
            console.error('خطأ في تحميل السجلات الطبية:', error);
            showNotification('فشل في تحميل السجلات الطبية', 'error');
        }
    }

    async loadPatients() {
        try {
            const patients = await this.db.getAll('patients', { isActive: true });
            const patientFilter = document.getElementById('patientFilter');
            
            if (patientFilter) {
                patientFilter.innerHTML = '<option value="">جميع المرضى</option>' +
                    patients.map(patient => 
                        `<option value="${patient.id}">${patient.name}</option>`
                    ).join('');
                
                patientFilter.addEventListener('change', () => {
                    this.filterRecords();
                });
            }
        } catch (error) {
            console.error('خطأ في تحميل قائمة المرضى:', error);
        }
    }

    renderRecordsList(records) {
        const container = document.getElementById('recordsList');
        if (!container) return;

        if (records.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-medical-alt"></i>
                    <h3>لا توجد سجلات طبية</h3>
                    <p>لم يتم إنشاء أي سجلات طبية بعد</p>
                </div>
            `;
            return;
        }

        // الترتيب بحسب التاريخ (الأحدث أولاً)
        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = records.map(record => `
            <div class="record-card">
                <div class="record-header">
                    <div class="patient-info">
                        <h4>${this.getPatientName(record.patientId)}</h4>
                        <span class="record-date">${formatDate(record.date)}</span>
                    </div>
                    <span class="record-type">${record.type || 'كشف عام'}</span>
                </div>
                
                <div class="record-body">
                    <div class="record-section">
                        <h5>التشخيص</h5>
                        <p>${record.diagnosis || 'لا توجد معلومات'}</p>
                    </div>
                    
                    ${record.treatment ? `
                        <div class="record-section">
                            <h5>العلاج</h5>
                            <p>${record.treatment}</p>
                        </div>
                    ` : ''}
                    
                    ${record.notes ? `
                        <div class="record-section">
                            <h5>ملاحظات</h5>
                            <p>${record.notes}</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="record-actions">
                    <button class="btn btn-sm btn-outline view-record" data-id="${record.id}">
                        <i class="fas fa-eye"></i> عرض
                    </button>
                    <button class="btn btn-sm btn-outline edit-record" data-id="${record.id}">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-sm btn-outline delete-record" data-id="${record.id}">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </div>
        `).join('');

        this.attachRecordEvents();
    }

    async getPatientName(patientId) {
        try {
            const patient = await this.db.get('patients', patientId);
            return patient?.name || 'مريض غير معروف';
        } catch (error) {
            return 'مريض غير معروف';
        }
    }

    attachRecordEvents() {
        document.querySelectorAll('.view-record').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordId = e.currentTarget.dataset.id;
                this.viewRecord(recordId);
            });
        });

        document.querySelectorAll('.edit-record').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordId = e.currentTarget.dataset.id;
                this.editRecord(recordId);
            });
        });

        document.querySelectorAll('.delete-record').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const recordId = e.currentTarget.dataset.id;
                await this.deleteRecord(recordId);
            });
        });
    }

    async viewRecord(recordId) {
        try {
            const record = await this.db.get('medicalRecords', recordId);
            if (!record) {
                showNotification('السجل الطبي غير موجود', 'error');
                return;
            }

            const patient = await this.db.get('patients', record.patientId);
            const doctor = await this.db.get('users', record.doctorId);

            const modalContent = `
                <div class="modal-large">
                    <div class="modal-header">
                        <h3>السجل الطبي - ${patient?.name || 'مريض غير معروف'}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="record-details">
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label>المريض:</label>
                                    <span>${patient?.name || 'غير معروف'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>الطبيب:</label>
                                    <span>${doctor?.fullName || 'طبيب غير معروف'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>التاريخ:</label>
                                    <span>${formatDate(record.date)}</span>
                                </div>
                                <div class="detail-item">
                                    <label>نوع الزيارة:</label>
                                    <span>${record.type || 'كشف عام'}</span>
                                </div>
                            </div>
                            
                            <div class="record-section">
                                <h4>التشخيص</h4>
                                <div class="section-content">${record.diagnosis || 'لا توجد معلومات'}</div>
                            </div>
                            
                            ${record.treatment ? `
                                <div class="record-section">
                                    <h4>العلاج الموصوف</h4>
                                    <div class="section-content">${record.treatment}</div>
                                </div>
                            ` : ''}
                            
                            ${record.medications ? `
                                <div class="record-section">
                                    <h4>الأدوية</h4>
                                    <div class="section-content">${record.medications}</div>
                                </div>
                            ` : ''}
                            
                            ${record.notes ? `
                                <div class="record-section">
                                    <h4>ملاحظات إضافية</h4>
                                    <div class="section-content">${record.notes}</div>
                                </div>
                            ` : ''}
                            
                            ${record.vitalSigns ? `
                                <div class="record-section">
                                    <h4>العلامات الحيوية</h4>
                                    <div class="vital-signs">
                                        ${Object.entries(record.vitalSigns).map(([key, value]) => `
                                            <div class="vital-item">
                                                <span class="vital-label">${key}:</span>
                                                <span class="vital-value">${value}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="medicalRecordsManager.editRecord(${recordId})">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn btn-secondary" onclick="medicalRecordsManager.closeModal()">إغلاق</button>
                    </div>
                </div>
            `;

            this.showModal(modalContent);
            
        } catch (error) {
            console.error('خطأ في عرض السجل الطبي:', error);
            showNotification('فشل في تحميل السجل الطبي', 'error');
        }
    }

    async editRecord(recordId) {
        // تنفيذ نموذج تعديل السجل الطبي
        showNotification('ميزة التعديل قيد التطوير', 'info');
    }

    async deleteRecord(recordId) {
        const confirmed = await confirmAction('هل أنت متأكد من حذف هذا السجل الطبي؟ هذا الإجراء لا يمكن التراجع عنه.');
        if (!confirmed) return;

        try {
            await this.db.delete('medicalRecords', recordId, this.app.auth.getCurrentUser()?.id);
            showNotification('تم حذف السجل الطبي بنجاح', 'success');
            await this.loadMedicalRecords();
        } catch (error) {
            console.error('خطأ في حذف السجل الطبي:', error);
            showNotification('فشل في حذف السجل الطبي', 'error');
        }
    }

    showModal(content) {
        const modalContainer = document.getElementById('modalContainer');
        modalContainer.innerHTML = `<div class="modal-overlay">${content}</div>`;
        
        const closeBtn = modalContainer.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        modalContainer.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeModal();
            }
        });
    }

    closeModal() {
        const modalContainer = document.getElementById('modalContainer');
        modalContainer.innerHTML = '';
    }
}

window.medicalRecordsManager = null;

export default MedicalRecordsManager;
