// js/router.js - الملف النهائي

import PatientsManager from './modules/patients.js';
import AppointmentsManager from './modules/appointments.js';
import InvoicesManager from './modules/invoices.js';
import MedicalRecordsManager from './modules/medical-records.js';
import PrescriptionsManager from './modules/prescriptions.js';
import LaboratoryManager from './modules/laboratory.js';
import ReportsManager from './modules/reports.js';
import SettingsManager from './modules/settings.js';

class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = '';
        this.app = null;
    }

    init(app) {
        this.app = app;
        this.defineRoutes();
        this.setupNavigation();
        this.handleInitialRoute();
    }

    defineRoutes() {
        this.routes = {
            'dashboard': {
                module: () => this.showDashboard(),
                title: 'لوحة التحكم'
            },
            'patients': {
                module: () => this.showPatients(),
                title: 'إدارة المرضى'
            },
            'appointments': {
                module: () => this.showAppointments(),
                title: 'إدارة المواعيد'
            },
            'medical-records': {
                module: () => this.showMedicalRecords(),
                title: 'السجلات الطبية'
            },
            'prescriptions': {
                module: () => this.showPrescriptions(),
                title: 'الوصفات الطبية'
            },
            'laboratory': {
                module: () => this.showLaboratory(),
                title: 'المختبر والتحاليل'
            },
            'invoices': {
                module: () => this.showInvoices(),
                title: 'الفواتير والمحاسبة'
            },
            'reports': {
                module: () => this.showReports(),
                title: 'التقارير والإحصائيات'
            },
            'settings': {
                module: () => this.showSettings(),
                title: 'الإعدادات'
            }
        };
    }

    setupNavigation() {
        // أحداث القائمة الجانبية
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const route = item.getAttribute('href').substring(1);
                this.navigate(route);
            });
        });

        // التعامل مع زر الرجوع
        window.addEventListener('popstate', () => {
            this.handleRoute(window.location.hash);
        });
    }

    handleInitialRoute() {
        const hash = window.location.hash.substring(1) || 'dashboard';
        this.navigate(hash);
    }

    navigate(route) {
        if (this.routes[route]) {
            // تحديث الـ URL
            window.location.hash = route;
            
            // تحديث العنوان
            this.updatePageTitle(this.routes[route].title);
            
            // تحميل الوحدة النمطية
            this.loadModule(route);
            
            // تحديث القائمة النشطة
            this.updateActiveMenu(route);
        } else {
            this.showNotFound();
        }
    }

    updatePageTitle(title) {
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            pageTitle.textContent = title;
        }
        document.title = `${title} - نظام إدارة العيادة`;
    }

    updateActiveMenu(activeRoute) {
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${activeRoute}`) {
                item.classList.add('active');
            }
        });
    }

    async loadModule(route) {
        const contentArea = document.getElementById('contentArea');
        if (!contentArea) return;

        // عرض تحميل
        contentArea.innerHTML = `
            <div class="loading-module">
                <div class="spinner"></div>
                <p>جاري تحميل ${this.routes[route].title}...</p>
            </div>
        `;

        try {
            await this.routes[route].module();
        } catch (error) {
            console.error(`خطأ في تحميل الوحدة ${route}:`, error);
            this.showErrorState(route, error);
        }
    }

    async showDashboard() {
        const contentArea = document.getElementById('contentArea');
        
        try {
            const stats = await this.app.db.getAdvancedSystemStats();
            
            contentArea.innerHTML = `
                <div class="dashboard">
                    <div class="stats-grid">
                        <div class="stat-card primary">
                            <div class="stat-icon">
                                <i class="fas fa-user-injured"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${stats.patients}</h3>
                                <p>عدد المرضى</p>
                            </div>
                        </div>
                        
                        <div class="stat-card success">
                            <div class="stat-icon">
                                <i class="fas fa-calendar-check"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${stats.todayAppointments}</h3>
                                <p>مواعيد اليوم</p>
                            </div>
                        </div>
                        
                        <div class="stat-card warning">
                            <div class="stat-icon">
                                <i class="fas fa-file-invoice-dollar"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${stats.monthlyRevenue} ر.س</h3>
                                <p>إيرادات الشهر</p>
                            </div>
                        </div>
                        
                        <div class="stat-card info">
                            <div class="stat-icon">
                                <i class="fas fa-chart-line"></i>
                            </div>
                            <div class="stat-info">
                                <h3>${stats.systemHealth === 'excellent' ? 'ممتاز' : 'جيد'}</h3>
                                <p>حالة النظام</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="dashboard-content">
                        <div class="recent-activity">
                            <h3>النشاط الحديث</h3>
                            <div id="recentActivity">
                                ${await this.getRecentActivity()}
                            </div>
                        </div>
                        
                        <div class="upcoming-appointments">
                            <h3>المواعيد القادمة</h3>
                            <div id="upcomingAppointments">
                                ${await this.getUpcomingAppointments()}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('خطأ في تحميل لوحة التحكم:', error);
            this.showErrorState('dashboard', error);
        }
    }

    async showPatients() {
        window.patientsManager = new PatientsManager(this.app);
        await window.patientsManager.init();
    }

    async showAppointments() {
        window.appointmentsManager = new AppointmentsManager(this.app);
        await window.appointmentsManager.init();
    }

    async showMedicalRecords() {
        window.medicalRecordsManager = new MedicalRecordsManager(this.app);
        await window.medicalRecordsManager.init();
    }

    async showPrescriptions() {
        window.prescriptionsManager = new PrescriptionsManager(this.app);
        await window.prescriptionsManager.init();
    }

    async showLaboratory() {
        window.laboratoryManager = new LaboratoryManager(this.app);
        await window.laboratoryManager.init();
    }

    async showInvoices() {
        window.invoicesManager = new InvoicesManager(this.app);
        await window.invoicesManager.init();
    }

    async showReports() {
        window.reportsManager = new ReportsManager(this.app);
        await window.reportsManager.init();
    }

    async showSettings() {
        window.settingsManager = new SettingsManager(this.app);
        await window.settingsManager.init();
    }

    async getRecentActivity() {
        try {
            const activities = [];
            
            // أحداث المرضى الجدد
            const recentPatients = await this.app.db.getAll('patients', {}, 'createdAt', 'desc', 5);
            recentPatients.forEach(patient => {
                activities.push({
                    type: 'new_patient',
                    message: `تم تسجيل مريض جديد: ${patient.name}`,
                    time: patient.createdAt,
                    icon: 'fas fa-user-plus'
                });
            });
            
            // أحداث المواعيد
            const recentAppointments = await this.app.db.getAll('appointments', {}, 'createdAt', 'desc', 5);
            recentAppointments.forEach(apt => {
                activities.push({
                    type: 'new_appointment',
                    message: `تم حجز موعد جديد للمريض: ${apt.patientName}`,
                    time: apt.createdAt,
                    icon: 'fas fa-calendar-plus'
                });
            });
            
            // ترتيب بحسب الوقت
            activities.sort((a, b) => new Date(b.time) - new Date(a.time));
            
            return activities.slice(0, 10).map(activity => `
                <div class="activity-item">
                    <i class="${activity.icon}"></i>
                    <div class="activity-content">
                        <p>${activity.message}</p>
                        <small>${this.formatTimeAgo(activity.time)}</small>
                    </div>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('خطأ في تحميل النشاط الحديث:', error);
            return '<p>لا يمكن تحميل النشاط الحديث</p>';
        }
    }

    async getUpcomingAppointments() {
        try {
            const appointments = await this.app.db.getAll('appointments', {
                status: ['scheduled', 'confirmed']
            }, 'date', 'asc');
            
            const today = new Date().toISOString().split('T')[0];
            const upcoming = appointments.filter(apt => 
                apt.date.startsWith(today) || new Date(apt.date) > new Date()
            ).slice(0, 5);
            
            if (upcoming.length === 0) {
                return '<p>لا توجد مواعيد قادمة</p>';
            }
            
            return upcoming.map(apt => `
                <div class="appointment-item">
                    <div class="apt-time">${new Date(apt.date).toLocaleTimeString('ar-SA', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    })}</div>
                    <div class="apt-info">
                        <strong>${apt.patientName}</strong>
                        <small>${apt.type || 'كشف عام'}</small>
                    </div>
                    <span class="apt-status ${apt.status}">${this.getAppointmentStatusText(apt.status)}</span>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('خطأ في تحميل المواعيد القادمة:', error);
            return '<p>لا يمكن تحميل المواعيد القادمة</p>';
        }
    }

    getAppointmentStatusText(status) {
        const statusMap = {
            'scheduled': 'مجدول',
            'confirmed': 'مؤكد',
            'in_progress': 'قيد الكشف',
            'completed': 'مكتمل',
            'cancelled': 'ملغى'
        };
        return statusMap[status] || status;
    }

    formatTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'الآن';
        if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays < 7) return `منذ ${diffDays} يوم`;
        
        return date.toLocaleDateString('ar-SA');
    }

    showErrorState(route, error) {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>خطأ في التحميل</h3>
                <p>فشل في تحميل ${this.routes[route]?.title || 'الصفحة'}</p>
                <details>
                    <summary>تفاصيل الخطأ</summary>
                    <pre>${error.message}</pre>
                </details>
                <button onclick="router.navigate('dashboard')" class="btn btn-primary">
                    العودة للوحة التحكم
                </button>
            </div>
        `;
    }

    showNotFound() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div class="not-found">
                <i class="fas fa-map-signs"></i>
                <h2>الصفحة غير موجودة</h2>
                <p>عذراً، الصفحة التي تبحث عنها غير متوفرة</p>
                <button onclick="router.navigate('dashboard')" class="btn btn-primary">
                    العودة للوحة التحكم
                </button>
            </div>
        `;
    }
}

export default Router;
