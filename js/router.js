// js/router.js - نظام التوجيه

import PatientsManager from './modules/patients.js';
import AppointmentsManager from './modules/appointments.js';
import InvoicesManager from './modules/invoices.js';

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
                module: this.showDashboard,
                title: 'لوحة التحكم'
            },
            'patients': {
                module: PatientsManager,
                title: 'إدارة المرضى'
            },
            'appointments': {
                module: AppointmentsManager,
                title: 'إدارة المواعيد'
            },
            'medical-records': {
                module: null, // سيتم تنفيذه لاحقاً
                title: 'السجلات الطبية'
            },
            'prescriptions': {
                module: null,
                title: 'الوصفات الطبية'
            },
            'laboratory': {
                module: null,
                title: 'المختبر والتحاليل'
            },
            'invoices': {
                module: InvoicesManager,
                title: 'الفواتير والمحاسبة'
            },
            'reports': {
                module: null,
                title: 'التقارير والإحصائيات'
            },
            'settings': {
                module: null,
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
            const module = this.routes[route].module;
            if (typeof module === 'function') {
                await module(this.app);
            } else {
                // تحميل الوحدة النمطية ديناميكياً
                await this.loadDynamicModule(route);
            }
        } catch (error) {
            console.error(`خطأ في تحميل الوحدة ${route}:`, error);
            contentArea.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>خطأ في التحميل</h3>
                    <p>فشل في تحميل ${this.routes[route].title}</p>
                    <button onclick="router.navigate('dashboard')" class="btn-primary">
                        العودة للوحة التحكم
                    </button>
                </div>
            `;
        }
    }

    async loadDynamicModule(route) {
        // تحميل الوحدة النمطية حسب المسار
        switch (route) {
            case 'dashboard':
                await this.showDashboard();
                break;
            case 'patients':
                await this.showPatients();
                break;
            // ... باقي الحالات
            default:
                this.showNotFound();
        }
    }

    async showDashboard() {
        const contentArea = document.getElementById('contentArea');
        
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
                        <div id="recentActivity"></div>
                    </div>
                    
                    <div class="upcoming-appointments">
                        <h3>المواعيد القادمة</h3>
                        <div id="upcomingAppointments"></div>
                    </div>
                </div>
            </div>
        `;
        
        await this.loadRecentActivity();
        await this.loadUpcomingAppointments();
    }

    async showPatients() {
        const patientsManager = new PatientsManager(this.app);
        await patientsManager.init();
    }

    showNotFound() {
        const contentArea = document.getElementById('contentArea');
        contentArea.innerHTML = `
            <div class="not-found">
                <i class="fas fa-map-signs"></i>
                <h2>الصفحة غير موجودة</h2>
                <p>عذراً، الصفحة التي تبحث عنها غير متوفرة</p>
                <button onclick="router.navigate('dashboard')" class="btn-primary">
                    العودة للوحة التحكم
                </button>
            </div>
        `;
    }

    async loadRecentActivity() {
        // تنفيذ تحميل النشاط الحديث
    }

    async loadUpcomingAppointments() {
        // تنفيذ تحميل المواعيد القادمة
    }
}

export default Router;
