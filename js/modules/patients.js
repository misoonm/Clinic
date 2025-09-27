// إدارة المرضى
import { showNotification, confirmAction } from '../utils/helpers.js';
import { formatDate, formatArabicNumber } from '../utils/formatters.js';
import { validateRequired, validatePhone, validateNationalId, validateEmail } from '../utils/validators.js';

class PatientsManager {
    constructor(app) {
        this.app = app;
        this.db = app.db;
        this.currentPage = 1;
        this.pageSize = 20;
        this.searchQuery = '';
        this.filters = {};
    }

    async init() {
        await this.renderPatientsList();
        this.setupEventListeners();
    }

    async renderPatientsList() {
        const contentArea = document.getElementById('contentArea');
        
        contentArea.innerHTML = `
            <div class="patients-module">
                <div class="module-header">
                    <h2>إدارة المرضى</h2>
                    <button class="btn btn-primary" id="addPatientBtn">
                        <i class="fas fa-user-plus"></i> إضافة مريض جديد
                    </button>
                </div>
                
                <div class="search-filters">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="patientSearch" placeholder="ابحث بالاسم، الرقم الوطني، أو الهاتف...">
                    </div>
                    
                    <div class="filter-buttons">
                        <select id="statusFilter">
                            <option value="">جميع الحالات</option>
                            <option value="active">نشط</option>
                            <option value="inactive">غير نشط</option>
                        </select>
                        
                        <button class="btn btn-secondary" id="exportPatients">
                            <i class="fas fa-download"></i> تصدير
                        </button>
                    </div>
                </div>
                
                <div class="patients-table-container">
                    <table class="data-table" id="patientsTable">
                        <thead>
                            <tr>
                                <th>كود المريض</th>
                                <th>الاسم</th>
                                <th>الرقم الوطني</th>
                                <th>الهاتف</th>
                                <th>العمر</th>
                                <th>آخر زيارة</th>
                                <th>عدد الزيارات</th>
                                <th>الحالة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="patientsTableBody">
                            <!-- سيتم ملؤه ديناميكياً -->
                        </tbody>
                    </table>
                </div>
                
                <div class="pagination" id="pagination">
                    <!-- سيتم ملؤه ديناميكياً -->
                </div>
            </div>
        `;

        await this.loadPatients();
    }

    async loadPatients() {
        try {
            showNotification('جاري تحميل بيانات المرضى...', 'info');
            
            let patients = await this.db.getAll('patients');
            
            // تطبيق البحث
            if (this.searchQuery) {
                patients = patients.filter(patient => 
                    patient.name?.includes(this.searchQuery) ||
                    patient.nationalId?.includes(this.searchQuery) ||
                    patient.phone?.includes(this.searchQuery) ||
                    patient.patientCode?.includes(this.searchQuery)
                );
            }
            
            // تطبيق الفلاتر
            if (this.filters.status) {
                patients = patients.filter(patient => 
                    patient.isActive === (this.filters.status === 'active')
                );
            }
            
            // الترتيب بحسب آخر زيارة
            patients.sort((a, b) => new Date(b.lastVisit || b.createdAt) - new Date(a.lastVisit || a.createdAt));
            
            this.renderPatientsTable(patients);
            
        } catch (error) {
            console.error('خطأ في تحميل المرضى:', error);
            showNotification('فشل في تحميل بيانات المرضى', 'error');
        }
    }

    renderPatientsTable(patients) {
        const tbody = document.getElementById('patientsTableBody');
        const pagination = document.getElementById('pagination');
        
        if (!tbody) return;
        
        // التقسيم للصفحات
        const totalPages = Math.ceil(patients.length / this.pageSize);
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pagePatients = patients.slice(startIndex, endIndex);
        
        if (pagePatients.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state">
                        <i class="fas fa-user-slash"></i>
                        <p>لا توجد بيانات للمرضى</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = pagePatients.map(patient => `
            <tr>
                <td>${patient.patientCode || 'N/A'}</td>
                <td>
                    <div class="patient-info">
                        <strong>${patient.name || 'غير معروف'}</strong>
                        ${patient.email ? `<br><small>${patient.email}</small>` : ''}
                    </div>
                </td>
                <td>${patient.nationalId || 'غير محدد'}</td>
                <td>${patient.phone || 'غير محدد'}</td>
                <td>${this.calculateAge(patient.dateOfBirth)}</td>
                <td>${patient.lastVisit ? formatDate(patient.lastVisit) : 'لم يزر بعد'}</td>
                <td>${formatArabicNumber(patient.totalVisits || 0)}</td>
                <td>
                    <span class="status-badge ${patient.isActive ? 'active' : 'inactive'}">
                        ${patient.isActive ? 'نشط' : 'غير نشط'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon view-patient" data-id="${patient.id}" title="عرض التفاصيل">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon edit-patient" data-id="${patient.id}" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-patient" data-id="${patient.id}" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        // عرض أزرار الصفحات
        this.renderPagination(pagination, totalPages);
        
        // إضافة أحداث الأزرار
        this.attachPatientEvents();
    }

    calculateAge(dateOfBirth) {
        if (!dateOfBirth) return 'غير معروف';
        const birthDate = new Date(dateOfBirth);
        const ageDiff = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDiff);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    }

    renderPagination(container, totalPages) {
        if (!container) return;
        
        let paginationHTML = `
            <div class="pagination-info">
                عرض ${formatArabicNumber(this.currentPage)} من ${formatArabicNumber(totalPages)}
            </div>
            <div class="pagination-buttons">
        `;
        
        if (this.currentPage > 1) {
            paginationHTML += `<button class="page-btn" data-page="1">الأولى</button>`;
            paginationHTML += `<button class="page-btn" data-page="${this.currentPage - 1}">السابق</button>`;
        }
        
        // عرض 5 صفحات حول الصفحة الحالية
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="page-btn ${i === this.currentPage ? 'active' : ''}" data-page="${i}">
                    ${formatArabicNumber(i)}
                </button>
            `;
        }
        
        if (this.currentPage < totalPages) {
            paginationHTML += `<button class="page-btn" data-page="${this.currentPage + 1}">التالي</button>`;
            paginationHTML += `<button class="page-btn" data-page="${totalPages}">الأخيرة</button>`;
        }
        
        paginationHTML += `</div>`;
        container.innerHTML = paginationHTML;
        
        // إضافة أحداث الصفحات
        this.attachPaginationEvents();
    }

    setupEventListeners() {
        // البحث
        const searchInput = document.getElementById('patientSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                this.currentPage = 1;
                this.loadPatients();
            });
        }
        
        // الفلاتر
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.currentPage = 1;
                this.loadPatients();
            });
        }
        
        // إضافة مريض جديد
        const addBtn = document.getElementById('addPatientBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.showPatientForm());
        }
        
        // تصدير البيانات
        const exportBtn = document.getElementById('exportPatients');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportPatients());
        }
    }

    attachPatientEvents() {
        // عرض التفاصيل
        document.querySelectorAll('.view-patient').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const patientId = e.currentTarget.dataset.id;
                this.viewPatientDetails(patientId);
            });
        });
        
        // تعديل المريض
        document.querySelectorAll('.edit-patient').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const patientId = e.currentTarget.dataset.id;
                this.editPatient(patientId);
            });
        });
        
        // حذف المريض
        document.querySelectorAll('.delete-patient').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const patientId = e.currentTarget.dataset.id;
                await this.deletePatient(patientId);
            });
        });
    }

    attachPaginationEvents() {
        document.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentPage = parseInt(e.currentTarget.dataset.page);
                this.loadPatients();
            });
        });
    }

    async showPatientForm(patientId = null) {
        const patient = patientId ? await this.db.get('patients', patientId) : null;
        
        const modalContent = `
            <div class="modal-large">
                <div class="modal-header">
                    <h3>${patient ? 'تعديل بيانات المريض' : 'إضافة مريض جديد'}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="patientForm" class="form-grid">
                        <div class="form-group">
                            <label for="name">الاسم الكامل *</label>
                            <input type="text" id="name" name="name" value="${patient?.name || ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="nationalId">الرقم الوطني</label>
                            <input type="text" id="nationalId" name="nationalId" value="${patient?.nationalId || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="phone">رقم الهاتف *</label>
                            <input type="tel" id="phone" name="phone" value="${patient?.phone || ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="email">البريد الإلكتروني</label>
                            <input type="email" id="email" name="email" value="${patient?.email || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="dateOfBirth">تاريخ الميلاد</label>
                            <input type="date" id="dateOfBirth" name="dateOfBirth" value="${patient?.dateOfBirth || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="gender">الجنس</label>
                            <select id="gender" name="gender">
                                <option value="">اختر الجنس</option>
                                <option value="male" ${patient?.gender === 'male' ? 'selected' : ''}>ذكر</option>
                                <option value="female" ${patient?.gender === 'female' ? 'selected' : ''}>أنثى</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="bloodType">فصيلة الدم</label>
                            <select id="bloodType" name="bloodType">
                                <option value="">اختر فصيلة الدم</option>
                                ${['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => 
                                    `<option value="${type}" ${patient?.bloodType === type ? 'selected' : ''}>${type}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group full-width">
                            <label for="address">العنوان</label>
                            <textarea id="address" name="address" rows="3">${patient?.address || ''}</textarea>
                        </div>
                        
                        <div class="form-group full-width">
                            <label for="medicalHistory">التاريخ الطبي</label>
                            <textarea id="medicalHistory" name="medicalHistory" rows="3">${patient?.medicalHistory || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="isActive">الحالة</label>
                            <select id="isActive" name="isActive">
                                <option value="true" ${patient?.isActive !== false ? 'selected' : ''}>نشط</option>
                                <option value="false" ${patient?.isActive === false ? 'selected' : ''}>غير نشط</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelForm">إلغاء</button>
                    <button class="btn btn-primary" id="savePatient">حفظ</button>
                </div>
            </div>
        `;
        
        this.showModal(modalContent);
        
        // إضافة أحداث النموذج
        document.getElementById('cancelForm').addEventListener('click', () => this.closeModal());
        document.getElementById('savePatient').addEventListener('click', () => this.savePatient(patient?.id));
    }

    async savePatient(patientId = null) {
        const form = document.getElementById('patientForm');
        const formData = new FormData(form);
        
        // التحقق من الصحة
        if (!validateRequired(formData.get('name'))) {
            showNotification('الاسم مطلوب', 'error');
            return;
        }
        
        if (!validateRequired(formData.get('phone'))) {
            showNotification('رقم الهاتف مطلوب', 'error');
            return;
        }
        
        if (formData.get('email') && !validateEmail(formData.get('email'))) {
            showNotification('البريد الإلكتروني غير صحيح', 'error');
            return;
        }
        
        if (formData.get('nationalId') && !validateNationalId(formData.get('nationalId'))) {
            showNotification('الرقم الوطني يجب أن يكون 10 أرقام', 'error');
            return;
        }
        
        try {
            const patientData = {
                name: formData.get('name'),
                nationalId: formData.get('nationalId') || null,
                phone: formData.get('phone'),
                email: formData.get('email') || null,
                dateOfBirth: formData.get('dateOfBirth') || null,
                gender: formData.get('gender') || null,
                bloodType: formData.get('bloodType') || null,
                address: formData.get('address') || null,
                medicalHistory: formData.get('medicalHistory') || null,
                isActive: formData.get('isActive') === 'true'
            };
            
            if (patientId) {
                // تحديث المريض
                await this.db.updatePatient(patientId, patientData, this.app.auth.getCurrentUser()?.id);
                showNotification('تم تحديث بيانات المريض بنجاح', 'success');
            } else {
                // إضافة مريض جديد
                await this.db.addPatient(patientData, this.app.auth.getCurrentUser()?.id);
                showNotification('تم إضافة المريض بنجاح', 'success');
            }
            
            this.closeModal();
            await this.loadPatients();
            
        } catch (error) {
            console.error('خطأ في حفظ المريض:', error);
            showNotification(error.message || 'فشل في حفظ بيانات المريض', 'error');
        }
    }

    async viewPatientDetails(patientId) {
        try {
            const patient = await this.db.get('patients', patientId);
            if (!patient) {
                showNotification('المريض غير موجود', 'error');
                return;
            }
            
            const medicalHistory = await this.db.getPatientMedicalHistory(patientId);
            
            const modalContent = `
                <div class="modal-large">
                    <div class="modal-header">
                        <h3>تفاصيل المريض - ${patient.name}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="patient-details">
                            <div class="detail-section">
                                <h4>المعلومات الشخصية</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <label>كود المريض:</label>
                                        <span>${patient.patientCode || 'N/A'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>الاسم:</label>
                                        <span>${patient.name}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>الرقم الوطني:</label>
                                        <span>${patient.nationalId || 'غير محدد'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>الهاتف:</label>
                                        <span>${patient.phone}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>البريد الإلكتروني:</label>
                                        <span>${patient.email || 'غير محدد'}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>العمر:</label>
                                        <span>${this.calculateAge(patient.dateOfBirth)} سنة</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>فصيلة الدم:</label>
                                        <span>${patient.bloodType || 'غير معروفة'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="detail-section">
                                <h4>الإحصائيات</h4>
                                <div class="stats-grid small">
                                    <div class="stat-card">
                                        <div class="stat-icon">
                                            <i class="fas fa-calendar-check"></i>
                                        </div>
                                        <div class="stat-info">
                                            <h3>${medicalHistory.appointments.length}</h3>
                                            <p>عدد الزيارات</p>
                                        </div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-icon">
                                            <i class="fas fa-file-prescription"></i>
                                        </div>
                                        <div class="stat-info">
                                            <h3>${medicalHistory.prescriptions.length}</h3>
                                            <p>عدد الوصفات</p>
                                        </div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-icon">
                                            <i class="fas fa-file-invoice-dollar"></i>
                                        </div>
                                        <div class="stat-info">
                                            <h3>${medicalHistory.invoices.length}</h3>
                                            <p>عدد الفواتير</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="patientsManager.editPatient(${patientId})">تعديل</button>
                        <button class="btn btn-secondary" onclick="patientsManager.closeModal()">إغلاق</button>
                    </div>
                </div>
            `;
            
            this.showModal(modalContent);
            
        } catch (error) {
            console.error('خطأ في عرض تفاصيل المريض:', error);
            showNotification('فشل في تحميل تفاصيل المريض', 'error');
        }
    }

    async editPatient(patientId) {
        this.closeModal(); // إغلاق أي modal مفتوح
        await this.showPatientForm(patientId);
    }

    async deletePatient(patientId) {
        const confirmed = await confirmAction('هل أنت متأكد من حذف هذا المريض؟ هذا الإجراء لا يمكن التراجع عنه.');
        if (!confirmed) return;
        
        try {
            await this.db.delete('patients', patientId, this.app.auth.getCurrentUser()?.id);
            showNotification('تم حذف المريض بنجاح', 'success');
            await this.loadPatients();
        } catch (error) {
            console.error('خطأ في حذف المريض:', error);
            showNotification('فشل في حذف المريض', 'error');
        }
    }

    async exportPatients() {
        try {
            const patients = await this.db.getAll('patients');
            const csvContent = this.convertToCSV(patients);
            this.downloadCSV(csvContent, 'patients.csv');
            showNotification('تم تصدير بيانات المرضى بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في تصدير البيانات:', error);
            showNotification('فشل في تصدير البيانات', 'error');
        }
    }

    convertToCSV(patients) {
        const headers = ['كود المريض', 'الاسم', 'الرقم الوطني', 'الهاتف', 'البريد الإلكتروني', 'العمر', 'آخر زيارة', 'عدد الزيارات'];
        const rows = patients.map(patient => [
            patient.patientCode || '',
            patient.name || '',
            patient.nationalId || '',
            patient.phone || '',
            patient.email || '',
            this.calculateAge(patient.dateOfBirth),
            patient.lastVisit || '',
            patient.totalVisits || 0
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    showModal(content) {
        const modalContainer = document.getElementById('modalContainer');
        modalContainer.innerHTML = `<div class="modal-overlay">${content}</div>`;
        
        // إضافة حدث الإغلاق
        const closeBtn = modalContainer.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        // إغلاق بالنقر خارج المحتوى
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

// جعل الكلاس متاحاً globally للاستدعاء من الأحداث
window.patientsManager = null;

export default PatientsManager;
