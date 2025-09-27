
// إدارة المواعيد
import { showNotification, confirmAction, formatDate, formatCurrency } from '../utils/helpers.js';
import { formatArabicNumber, formatAppointmentStatus, getStatusColor } from '../utils/formatters.js';

class AppointmentsManager {
    constructor(app) {
        this.app = app;
        this.db = app.db;
        this.currentPage = 1;
        this.pageSize = 15;
        this.filters = {
            status: '',
            date: '',
            doctorId: ''
        };
    }

    async init() {
        await this.renderAppointments();
        this.setupEventListeners();
    }

    async renderAppointments() {
        const contentArea = document.getElementById('contentArea');
        
        contentArea.innerHTML = `
            <div class="appointments-module">
                <div class="module-header">
                    <h2>إدارة المواعيد</h2>
                    <div class="header-actions">
                        <button class="btn btn-secondary" id="todayAppointments">
                            <i class="fas fa-calendar-day"></i> مواعيد اليوم
                        </button>
                        <button class="btn btn-primary" id="addAppointmentBtn">
                            <i class="fas fa-plus"></i> حجز موعد جديد
                        </button>
                    </div>
                </div>
                
                <div class="filters-section">
                    <div class="filter-group">
                        <label>التاريخ:</label>
                        <input type="date" id="dateFilter" class="form-control">
                    </div>
                    <div class="filter-group">
                        <label>الحالة:</label>
                        <select id="statusFilter" class="form-control">
                            <option value="">جميع الحالات</option>
                            <option value="scheduled">مجدول</option>
                            <option value="confirmed">مؤكد</option>
                            <option value="in_progress">قيد الكشف</option>
                            <option value="completed">مكتمل</option>
                            <option value="cancelled">ملغى</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label>الطبيب:</label>
                        <select id="doctorFilter" class="form-control">
                            <option value="">جميع الأطباء</option>
                        </select>
                    </div>
                    <button class="btn btn-outline" id="resetFilters">
                        <i class="fas fa-redo"></i> إعادة الضبط
                    </button>
                </div>
                
                <div class="appointments-view">
                    <div class="view-tabs">
                        <button class="tab-btn active" data-view="list">عرض列表</button>
                        <button class="tab-btn" data-view="calendar">عرض تقويم</button>
                        <button class="tab-btn" data-view="timeline">عرض زمني</button>
                    </div>
                    
                    <div id="appointmentsList" class="appointments-list">
                        <!-- سيتم ملؤه ديناميكياً -->
                    </div>
                    
                    <div id="appointmentsCalendar" class="appointments-calendar hidden">
                        <!-- التقويم سيتم إنشاؤه ديناميكياً -->
                    </div>
                </div>
            </div>
        `;

        await this.loadDoctors();
        await this.loadAppointments();
    }

    async loadAppointments() {
        try {
            let appointments = await this.db.getAll('appointments');
            
            // تطبيق الفلاتر
            if (this.filters.date) {
                appointments = appointments.filter(apt => 
                    apt.date.startsWith(this.filters.date)
                );
            }
            
            if (this.filters.status) {
                appointments = appointments.filter(apt => 
                    apt.status === this.filters.status
                );
            }
            
            if (this.filters.doctorId) {
                appointments = appointments.filter(apt => 
                    apt.doctorId == this.filters.doctorId
                );
            }
            
            // الترتيب بحسب التاريخ
            appointments.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            this.renderAppointmentsList(appointments);
            
        } catch (error) {
            console.error('خطأ في تحميل المواعيد:', error);
            showNotification('فشل في تحميل المواعيد', 'error');
        }
    }

    async loadDoctors() {
        try {
            const doctors = await this.db.getAll('users', { role: 'doctor' });
            const doctorFilter = document.getElementById('doctorFilter');
            
            if (doctorFilter) {
                doctorFilter.innerHTML = '<option value="">جميع الأطباء</option>' +
                    doctors.map(doctor => 
                        `<option value="${doctor.id}">${doctor.fullName || doctor.username}</option>`
                    ).join('');
            }
        } catch (error) {
            console.error('خطأ في تحميل قائمة الأطباء:', error);
        }
    }

    renderAppointmentsList(appointments) {
        const container = document.getElementById('appointmentsList');
        if (!container) return;

        if (appointments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>لا توجد مواعيد</h3>
                    <p>لم يتم العثور على مواعيد تطابق معايير البحث</p>
                </div>
            `;
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        
        container.innerHTML = appointments.map(appointment => {
            const appointmentDate = new Date(appointment.date);
            const isToday = appointment.date.startsWith(today);
            const isPast = appointmentDate < new Date() && appointment.status !== 'completed';
            
            return `
                <div class="appointment-card ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}">
                    <div class="appointment-header">
                        <div class="appointment-time">
                            <i class="fas fa-clock"></i>
                            ${appointmentDate.toLocaleTimeString('ar-SA', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            })}
                        </div>
                        <span class="status-badge" style="background-color: ${getStatusColor(appointment.status)}">
                            ${formatAppointmentStatus(appointment.status)}
                        </span>
                    </div>
                    
                    <div class="appointment-body">
                        <div class="patient-info">
                            <h4>${appointment.patientName || 'مريض غير معروف'}</h4>
                            <p>${appointment.type || 'كشف عام'}</p>
                            ${appointment.notes ? `<p class="notes">${appointment.notes}</p>` : ''}
                        </div>
                        
                        <div class="appointment-meta">
                            <div class="meta-item">
                                <i class="fas fa-user-md"></i>
                                <span>${appointment.doctorName || 'طبيب'}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-stopwatch"></i>
                                <span>${appointment.duration || 30} دقيقة</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="appointment-actions">
                        ${appointment.status === 'scheduled' ? `
                            <button class="btn btn-sm btn-success confirm-appointment" data-id="${appointment.id}">
                                <i class="fas fa-check"></i> تأكيد
                            </button>
                        ` : ''}
                        
                        ${appointment.status === 'confirmed' ? `
                            <button class="btn btn-sm btn-warning start-appointment" data-id="${appointment.id}">
                                <i class="fas fa-play"></i> بدء الكشف
                            </button>
                        ` : ''}
                        
                        ${appointment.status === 'in_progress' ? `
                            <button class="btn btn-sm btn-success complete-appointment" data-id="${appointment.id}">
                                <i class="fas fa-flag-checkered"></i> إنهاء
                            </button>
                        ` : ''}
                        
                        ${['scheduled', 'confirmed'].includes(appointment.status) ? `
                            <button class="btn btn-sm btn-danger cancel-appointment" data-id="${appointment.id}">
                                <i class="fas fa-times"></i> إلغاء
                            </button>
                        ` : ''}
                        
                        <button class="btn btn-sm btn-outline edit-appointment" data-id="${appointment.id}">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        
                        <button class="btn btn-sm btn-outline view-appointment" data-id="${appointment.id}">
                            <i class="fas fa-eye"></i> عرض
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        this.attachAppointmentEvents();
    }

    setupEventListeners() {
        // الفلاتر
        document.getElementById('dateFilter')?.addEventListener('change', (e) => {
            this.filters.date = e.target.value;
            this.loadAppointments();
        });

        document.getElementById('statusFilter')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.loadAppointments();
        });

        document.getElementById('doctorFilter')?.addEventListener('change', (e) => {
            this.filters.doctorId = e.target.value;
            this.loadAppointments();
        });

        document.getElementById('resetFilters')?.addEventListener('click', () => {
            this.filters = { status: '', date: '', doctorId: '' };
            document.getElementById('dateFilter').value = '';
            document.getElementById('statusFilter').value = '';
            document.getElementById('doctorFilter').value = '';
            this.loadAppointments();
        });

        // أزرار العرض
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // إضافة موعد جديد
        document.getElementById('addAppointmentBtn')?.addEventListener('click', () => {
            this.showAppointmentForm();
        });

        // مواعيد اليوم
        document.getElementById('todayAppointments')?.addEventListener('click', () => {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('dateFilter').value = today;
            this.filters.date = today;
            this.loadAppointments();
        });
    }

    attachAppointmentEvents() {
        // تأكيد الموعد
        document.querySelectorAll('.confirm-appointment').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const appointmentId = e.target.closest('button').dataset.id;
                await this.updateAppointmentStatus(appointmentId, 'confirmed');
            });
        });

        // بدء الكشف
        document.querySelectorAll('.start-appointment').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const appointmentId = e.target.closest('button').dataset.id;
                await this.updateAppointmentStatus(appointmentId, 'in_progress');
            });
        });

        // إنهاء الموعد
        document.querySelectorAll('.complete-appointment').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const appointmentId = e.target.closest('button').dataset.id;
                await this.completeAppointment(appointmentId);
            });
        });

        // إلغاء الموعد
        document.querySelectorAll('.cancel-appointment').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const appointmentId = e.target.closest('button').dataset.id;
                await this.cancelAppointment(appointmentId);
            });
        });

        // تعديل الموعد
        document.querySelectorAll('.edit-appointment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const appointmentId = e.target.closest('button').dataset.id;
                this.editAppointment(appointmentId);
            });
        });

        // عرض الموعد
        document.querySelectorAll('.view-appointment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const appointmentId = e.target.closest('button').dataset.id;
                this.viewAppointment(appointmentId);
            });
        });
    }

    async updateAppointmentStatus(appointmentId, status) {
        try {
            await this.db.updateAppointmentStatus(appointmentId, status);
            showNotification(`تم تحديث حالة الموعد إلى ${formatAppointmentStatus(status)}`, 'success');
            await this.loadAppointments();
        } catch (error) {
            console.error('خطأ في تحديث حالة الموعد:', error);
            showNotification('فشل في تحديث حالة الموعد', 'error');
        }
    }

    async completeAppointment(appointmentId) {
        try {
            await this.db.updateAppointmentStatus(appointmentId, 'completed');
            
            // إنشاء فاتورة تلقائية إذا كان الإعداد مفعلاً
            const autoGenerate = await this.db.getSettingValue('auto_generate_invoice', true);
            if (autoGenerate) {
                await this.createInvoiceFromAppointment(appointmentId);
            }
            
            showNotification('تم إنهاء الكشف بنجاح', 'success');
            await this.loadAppointments();
        } catch (error) {
            console.error('خطأ في إنهاء الموعد:', error);
            showNotification('فشل في إنهاء الموعد', 'error');
        }
    }

    async createInvoiceFromAppointment(appointmentId) {
        try {
            const appointment = await this.db.get('appointments', appointmentId);
            if (!appointment) return;

            const invoiceData = {
                patientId: appointment.patientId,
                appointmentId: appointmentId,
                items: [
                    {
                        serviceId: 1, // كشف عام - يجب تعديله حسب الخدمة الفعلية
                        serviceName: appointment.type || 'كشف طبي',
                        quantity: 1,
                        price: 100, // سعر افتراضي - يجب جلب السعر من الخدمات
                        description: `كشف طبي للموعد بتاريخ ${formatDate(appointment.date)}`
                    }
                ],
                paymentMethod: 'نقدي'
            };

            await this.db.createInvoice(invoiceData, this.app.auth.getCurrentUser()?.id);
            showNotification('تم إنشاء فاتورة تلقائية', 'info');
        } catch (error) {
            console.error('خطأ في إنشاء الفاتورة:', error);
        }
    }

    async cancelAppointment(appointmentId) {
        const confirmed = await confirmAction('هل أنت متأكد من إلغاء هذا الموعد؟');
        if (!confirmed) return;

        try {
            await this.db.updateAppointmentStatus(appointmentId, 'cancelled');
            showNotification('تم إلغاء الموعد بنجاح', 'success');
            await this.loadAppointments();
        } catch (error) {
            console.error('خطأ في إلغاء الموعد:', error);
            showNotification('فشل في إلغاء الموعد', 'error');
        }
    }

    async showAppointmentForm(appointmentId = null) {
        const appointment = appointmentId ? await this.db.get('appointments', appointmentId) : null;
        const patients = await this.db.getAll('patients', { isActive: true });
        const doctors = await this.db.getAll('users', { role: 'doctor' });
        const services = await this.db.getAll('medicalServices', { isActive: true });

        const modalContent = `
            <div class="modal-large">
                <div class="modal-header">
                    <h3>${appointment ? 'تعديل الموعد' : 'حجز موعد جديد'}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="appointmentForm" class="form-grid">
                        <div class="form-group">
                            <label for="patientId">المريض *</label>
                            <select id="patientId" name="patientId" required>
                                <option value="">اختر المريض</option>
                                ${patients.map(patient => `
                                    <option value="${patient.id}" ${appointment?.patientId == patient.id ? 'selected' : ''}>
                                        ${patient.name} - ${patient.phone}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="doctorId">الطبيب *</label>
                            <select id="doctorId" name="doctorId" required>
                                <option value="">اختر الطبيب</option>
                                ${doctors.map(doctor => `
                                    <option value="${doctor.id}" ${appointment?.doctorId == doctor.id ? 'selected' : ''}>
                                        ${doctor.fullName || doctor.username}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="appointmentDate">التاريخ والوقت *</label>
                            <input type="datetime-local" id="appointmentDate" name="date" 
                                   value="${appointment?.date ? appointment.date.slice(0, 16) : ''}" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="duration">المدة (دقيقة) *</label>
                            <input type="number" id="duration" name="duration" 
                                   value="${appointment?.duration || 30}" min="15" max="120" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="type">نوع الكشف</label>
                            <select id="type" name="type">
                                <option value="">اختر نوع الكشف</option>
                                ${services.map(service => `
                                    <option value="${service.name}" ${appointment?.type === service.name ? 'selected' : ''}>
                                        ${service.name} - ${formatCurrency(service.price)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group full-width">
                            <label for="notes">ملاحظات</label>
                            <textarea id="notes" name="notes" rows="3">${appointment?.notes || ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancelForm">إلغاء</button>
                    <button class="btn btn-primary" id="saveAppointment">حفظ</button>
                </div>
            </div>
        `;

        this.showModal(modalContent);
        
        document.getElementById('cancelForm').addEventListener('click', () => this.closeModal());
        document.getElementById('saveAppointment').addEventListener('click', () => this.saveAppointment(appointment?.id));
    }

    async saveAppointment(appointmentId = null) {
        const form = document.getElementById('appointmentForm');
        const formData = new FormData(form);
        
        // التحقق من التعارضات
        const appointmentData = {
            patientId: parseInt(formData.get('patientId')),
            doctorId: parseInt(formData.get('doctorId')),
            date: formData.get('date'),
            duration: parseInt(formData.get('duration')),
            type: formData.get('type') || 'كشف عام',
            notes: formData.get('notes') || ''
        };

        try {
            if (appointmentId) {
                // تحديث الموعد
                await this.db.update('appointments', appointmentId, appointmentData, this.app.auth.getCurrentUser()?.id);
                showNotification('تم تحديث الموعد بنجاح', 'success');
            } else {
                // إضافة موعد جديد
                await this.db.addAppointment(appointmentData, this.app.auth.getCurrentUser()?.id);
                showNotification('تم حجز الموعد بنجاح', 'success');
            }
            
            this.closeModal();
            await this.loadAppointments();
            
        } catch (error) {
            console.error('خطأ في حفظ الموعد:', error);
            showNotification(error.message || 'فشل في حفظ الموعد', 'error');
        }
    }

    switchView(view) {
        const listView = document.getElementById('appointmentsList');
        const calendarView = document.getElementById('appointmentsCalendar');
        
        if (view === 'list') {
            listView.classList.remove('hidden');
            calendarView.classList.add('hidden');
        } else if (view === 'calendar') {
            listView.classList.add('hidden');
            calendarView.classList.remove('hidden');
            this.renderCalendar();
        }
    }

    renderCalendar() {
        // تنفيذ بسيط للتقويم - يمكن تطويره باستخدام مكتبة متخصصة
        const container = document.getElementById('appointmentsCalendar');
        container.innerHTML = `
            <div class="calendar-placeholder">
                <i class="fas fa-calendar-alt"></i>
                <h3>عرض التقويم</h3>
                <p>هذه الميزة قيد التطوير</p>
                <button class="btn btn-primary" onclick="appointmentsManager.switchView('list')">
                    العودة للعرض列表
                </button>
            </div>
        `;
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

window.appointmentsManager = null;

export default AppointmentsManager;
