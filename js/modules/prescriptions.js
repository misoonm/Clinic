
// إدارة الوصفات الطبية
import { showNotification, confirmAction, formatDate } from '../utils/helpers.js';
import { formatArabicNumber } from '../utils/formatters.js';

class PrescriptionsManager {
    constructor(app) {
        this.app = app;
        this.db = app.db;
        this.currentPage = 1;
        this.pageSize = 15;
    }

    async init() {
        await this.renderPrescriptions();
        this.setupEventListeners();
    }

    async renderPrescriptions() {
        const contentArea = document.getElementById('contentArea');
        
        contentArea.innerHTML = `
            <div class="prescriptions-module">
                <div class="module-header">
                    <h2>الوصفات الطبية</h2>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="addPrescriptionBtn">
                            <i class="fas fa-prescription"></i> وصفة جديدة
                        </button>
                        <button class="btn btn-outline" id="printMultipleBtn">
                            <i class="fas fa-print"></i> طباعة مجموعة
                        </button>
                    </div>
                </div>
                
                <div class="filters-section">
                    <div class="filter-group">
                        <label>المريض:</label>
                        <select id="patientFilter" class="form-control">
                            <option value="">جميع المرضى</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>الحالة:</label>
                        <select id="statusFilter" class="form-control">
                            <option value="">جميع الحالات</option>
                            <option value="active">نشطة</option>
                            <option value="completed">مكتملة</option>
                            <option value="cancelled">ملغاة</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>التاريخ:</label>
                        <input type="date" id="dateFilter" class="form-control">
                    </div>
                </div>
                
                <div class="prescriptions-table-container">
                    <table class="data-table" id="prescriptionsTable">
                        <thead>
                            <tr>
                                <th>رقم الوصفة</th>
                                <th>المريض</th>
                                <th>الطبيب</th>
                                <th>التاريخ</th>
                                <th>عدد الأدوية</th>
                                <th>الحالة</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="prescriptionsTableBody">
                            <!-- سيتم ملؤه ديناميكياً -->
                        </tbody>
                    </table>
                </div>
                
                <div class="pagination" id="pagination"></div>
            </div>
        `;

        await this.loadPatients();
        await this.loadPrescriptions();
    }

    async loadPrescriptions() {
        try {
            const prescriptions = await this.db.getAll('prescriptions');
            this.renderPrescriptionsTable(prescriptions);
        } catch (error) {
            console.error('خطأ في تحميل الوصفات:', error);
            showNotification('فشل في تحميل الوصفات الطبية', 'error');
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
            }
        } catch (error) {
            console.error('خطأ في تحميل قائمة المرضى:', error);
        }
    }

    renderPrescriptionsTable(prescriptions) {
        const tbody = document.getElementById('prescriptionsTableBody');
        if (!tbody) return;

        if (prescriptions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-prescription-bottle"></i>
                        <p>لا توجد وصفات طبية</p>
                    </td>
                </tr>
            `;
            return;
        }

        // الترتيب بحسب التاريخ (الأحدث أولاً)
        prescriptions.sort((a, b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = prescriptions.map(async (prescription) => {
            const patient = await this.getPatientName(prescription.patientId);
            const doctor = await this.getDoctorName(prescription.doctorId);
            const items = await this.db.getAllByIndex('prescriptionItems', 'prescriptionId', prescription.id);
            
            return `
                <tr>
                    <td>
                        <strong>${prescription.prescriptionNumber || 'PR-' + prescription.id}</strong>
                    </td>
                    <td>${patient}</td>
                    <td>${doctor}</td>
                    <td>${formatDate(prescription.date)}</td>
                    <td>${formatArabicNumber(items.length)}</td>
                    <td>
                        <span class="status-badge ${prescription.status}">
                            ${this.getStatusText(prescription.status)}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon view-prescription" data-id="${prescription.id}" title="عرض الوصفة">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon print-prescription" data-id="${prescription.id}" title="طباعة الوصفة">
                                <i class="fas fa-print"></i>
                            </button>
                            ${prescription.status === 'active' ? `
                                <button class="btn-icon complete-prescription" data-id="${prescription.id}" title="إكمال الوصفة">
                                    <i class="fas fa-check"></i>
                                </button>
                                <button class="btn-icon cancel-prescription" data-id="${prescription.id}" title="إلغاء الوصفة">
                                    <i class="fas fa-times"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // انتظار جميع الوعود ثم إعادة التصيير
        Promise.all(prescriptions.map(async (prescription, index) => {
            const patient = await this.getPatientName(prescription.patientId);
            const doctor = await this.getDoctorName(prescription.doctorId);
            const items = await this.db.getAllByIndex('prescriptionItems', 'prescriptionId', prescription.id);
            
            const row = tbody.children[index];
            if (row) {
                row.cells[1].textContent = patient;
                row.cells[2].textContent = doctor;
                row.cells[4].textContent = formatArabicNumber(items.length);
            }
        })).then(() => {
            this.attachPrescriptionEvents();
        });
    }

    async getPatientName(patientId) {
        try {
            const patient = await this.db.get('patients', patientId);
            return patient?.name || 'مريض غير معروف';
        } catch (error) {
            return 'مريض غير معروف';
        }
    }

    async getDoctorName(doctorId) {
        try {
            const doctor = await this.db.get('users', doctorId);
            return doctor?.fullName || doctor?.username || 'طبيب غير معروف';
        } catch (error) {
            return 'طبيب غير معروف';
        }
    }

    getStatusText(status) {
        const statusMap = {
            'active': 'نشطة',
            'completed': 'مكتملة',
            'cancelled': 'ملغاة'
        };
        return statusMap[status] || status;
    }

    setupEventListeners() {
        document.getElementById('addPrescriptionBtn')?.addEventListener('click', () => {
            this.showPrescriptionForm();
        });

        document.getElementById('printMultipleBtn')?.addEventListener('click', () => {
            this.printMultiplePrescriptions();
        });

        // الفلاتر
        document.getElementById('patientFilter')?.addEventListener('change', () => {
            this.filterPrescriptions();
        });

        document.getElementById('statusFilter')?.addEventListener('change', () => {
            this.filterPrescriptions();
        });

        document.getElementById('dateFilter')?.addEventListener('change', () => {
            this.filterPrescriptions();
        });
    }

    attachPrescriptionEvents() {
        document.querySelectorAll('.view-prescription').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prescriptionId = e.currentTarget.dataset.id;
                this.viewPrescription(prescriptionId);
            });
        });

        document.querySelectorAll('.print-prescription').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prescriptionId = e.currentTarget.dataset.id;
                this.printPrescription(prescriptionId);
            });
        });

        document.querySelectorAll('.complete-prescription').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const prescriptionId = e.currentTarget.dataset.id;
                await this.completePrescription(prescriptionId);
            });
        });

        document.querySelectorAll('.cancel-prescription').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const prescriptionId = e.currentTarget.dataset.id;
                await this.cancelPrescription(prescriptionId);
            });
        });
    }

    async viewPrescription(prescriptionId) {
        try {
            const prescription = await this.db.get('prescriptions', prescriptionId);
            if (!prescription) {
                showNotification('الوصفة غير موجودة', 'error');
                return;
            }

            const patient = await this.db.get('patients', prescription.patientId);
            const doctor = await this.db.get('users', prescription.doctorId);
            const items = await this.db.getAllByIndex('prescriptionItems', 'prescriptionId', prescriptionId);
            const medications = await Promise.all(
                items.map(async item => {
                    const medication = await this.db.get('medications', item.medicationId);
                    return { ...item, medication };
                })
            );

            const modalContent = `
                <div class="modal-large">
                    <div class="modal-header">
                        <h3>الوصفة الطبية - ${patient?.name || 'مريض غير معروف'}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="prescription-details">
                            <div class="prescription-header">
                                <div class="clinic-info">
                                    <h3>العيادة الطبية</h3>
                                    <p>وصفة طبية</p>
                                </div>
                                <div class="prescription-meta">
                                    <p><strong>رقم الوصفة:</strong> ${prescription.prescriptionNumber || 'PR-' + prescription.id}</p>
                                    <p><strong>التاريخ:</strong> ${formatDate(prescription.date)}</p>
                                    <p><strong>الحالة:</strong> ${this.getStatusText(prescription.status)}</p>
                                </div>
                            </div>
                            
                            <div class="patient-doctor-info">
                                <div class="info-section">
                                    <h4>المريض</h4>
                                    <p><strong>الاسم:</strong> ${patient?.name || 'غير معروف'}</p>
                                    <p><strong>العمر:</strong> ${this.calculateAge(patient?.dateOfBirth) || 'غير معروف'}</p>
                                    <p><strong>فصيلة الدم:</strong> ${patient?.bloodType || 'غير معروفة'}</p>
                                </div>
                                <div class="info-section">
                                    <h4>الطبيب</h4>
                                    <p><strong>الاسم:</strong> ${doctor?.fullName || doctor?.username || 'غير معروف'}</p>
                                    <p><strong>التخصص:</strong> ${doctor?.specialization || 'غير محدد'}</p>
                                </div>
                            </div>
                            
                            <div class="medications-list">
                                <h4>الأدوية الموصوفة</h4>
                                <table class="medications-table">
                                    <thead>
                                        <tr>
                                            <th>الدواء</th>
                                            <th>الجرعة</th>
                                            <th>التكرار</th>
                                            <th>المدة</th>
                                            <th>التعليمات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${medications.map(med => `
                                            <tr>
                                                <td>
                                                    <strong>${med.medication?.name || 'دواء غير معروف'}</strong>
                                                    ${med.medication?.description ? `<br><small>${med.medication.description}</small>` : ''}
                                                </td>
                                                <td>${med.dosage || 'غير محدد'}</td>
                                                <td>${med.frequency || 'غير محدد'}</td>
                                                <td>${med.duration || 'غير محدد'}</td>
                                                <td>${med.instructions || 'لا توجد تعليمات خاصة'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                            
                            ${prescription.notes ? `
                                <div class="prescription-notes">
                                    <h4>ملاحظات إضافية</h4>
                                    <p>${prescription.notes}</p>
                                </div>
                            ` : ''}
                            
                            <div class="prescription-footer">
                                <div class="doctor-signature">
                                    <p>التوقيع: ________________</p>
                                    <p>الطبيب: ${doctor?.fullName || doctor?.username || 'غير معروف'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="prescriptionsManager.printPrescription(${prescriptionId})">
                            <i class="fas fa-print"></i> طباعة
                        </button>
                        <button class="btn btn-secondary" onclick="prescriptionsManager.closeModal()">إغلاق</button>
                    </div>
                </div>
            `;

            this.showModal(modalContent);
            
        } catch (error) {
            console.error('خطأ في عرض الوصفة:', error);
            showNotification('فشل في تحميل الوصفة', 'error');
        }
    }

    calculateAge(dateOfBirth) {
        if (!dateOfBirth) return null;
        const birthDate = new Date(dateOfBirth);
        const ageDiff = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDiff);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    }

    async completePrescription(prescriptionId) {
        const confirmed = await confirmAction('هل تريد标记 هذه الوصفة كمكتملة؟');
        if (!confirmed) return;

        try {
            await this.db.update('prescriptions', prescriptionId, { status: 'completed' });
            showNotification('تم标记 الوصفة كمكتملة', 'success');
            await this.loadPrescriptions();
        } catch (error) {
            console.error('خطأ في إكمال الوصفة:', error);
            showNotification('فشل في إكمال الوصفة', 'error');
        }
    }

    async cancelPrescription(prescriptionId) {
        const confirmed = await confirmAction('هل تريد إلغاء هذه الوصفة؟');
        if (!confirmed) return;

        try {
            await this.db.update('prescriptions', prescriptionId, { status: 'cancelled' });
            showNotification('تم إلغاء الوصفة', 'success');
            await this.loadPrescriptions();
        } catch (error) {
            console.error('خطأ في إلغاء الوصفة:', error);
            showNotification('فشل في إلغاء الوصفة', 'error');
        }
    }

    printPrescription(prescriptionId) {
        showNotification('جاري تحضير الوصفة للطباعة...', 'info');
        // تنفيذ الطباعة
        setTimeout(() => {
            window.print();
        }, 1000);
    }

    printMultiplePrescriptions() {
        showNotification('ميزة الطباعة المجمعة قيد التطوير', 'info');
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

window.prescriptionsManager = null;

export default PrescriptionsManager;
