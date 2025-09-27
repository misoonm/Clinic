// js/app.js - التطبيق الرئيسي المعدل

class ClinicApp {
    constructor() {
        this.db = null;
        this.currentUser = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            this.updateLoadingMessage('جاري تهيئة قاعدة البيانات...');
            
            // تحميل قاعدة البيانات
            await this.loadDatabase();
            
            this.updateLoadingMessage('جاري تحميل الواجهة...');
            
            // تهيئة الواجهة
            await this.initUI();
            
            // التحقق من حالة المستخدم
            await this.checkAuthStatus();
            
            this.isInitialized = true;
            this.hideLoading();
            
        } catch (error) {
            console.error('فشل في تهيئة التطبيق:', error);
            this.showError(error);
        }
    }

    async loadDatabase() {
        try {
            // محاكاة تحميل قاعدة البيانات
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // إنشاء كائن قاعدة بيانات مبسط
            this.db = {
                async init() {
                    return Promise.resolve();
                },
                async login(username, password) {
                    if (username === 'admin' && password === 'admin123') {
                        return {
                            user: { id: 1, username: 'admin', fullName: 'د. أحمد محمد', role: 'doctor' },
                            token: 'mock-token-' + Date.now()
                        };
                    }
                    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
                },
                async validateToken(token) {
                    return { id: 1, username: 'admin', fullName: 'د. أحمد محمد', role: 'doctor' };
                }
            };
            
            await this.db.init();
            
        } catch (error) {
            throw new Error('فشل في تحميل قاعدة البيانات: ' + error.message);
        }
    }

    async initUI() {
        // تهيئة الأحداث
        this.setupEventListeners();
        
        // تحديث الوقت والتاريخ
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 60000);
    }

    setupEventListeners() {
        // حدث تسجيل الدخول
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // حدث تسجيل الخروج
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // أحداث القائمة
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNavigation(e.target.getAttribute('href'));
            });
        });

        // زر الإضافة السريعة
        const quickActionBtn = document.getElementById('quickActionBtn');
        if (quickActionBtn) {
            quickActionBtn.addEventListener('click', () => this.showQuickActions());
        }

        // زر تبديل الشريط الجانبي
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const username = formData.get('username');
        const password = formData.get('password');

        try {
            this.showLoading('جاري تسجيل الدخول...');
            
            const result = await this.db.login(username, password);
            
            if (result && result.token) {
                this.currentUser = result.user;
                
                // حفظ بيانات الجلسة
                localStorage.setItem('clinic_token', result.token);
                localStorage.setItem('user_data', JSON.stringify(result.user));
                
                this.showMainApp();
                this.showNotification(`مرحباً ${result.user.fullName}`, 'success');
            }
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleLogout() {
        try {
            localStorage.removeItem('clinic_token');
            localStorage.removeItem('user_data');
            this.currentUser = null;
            this.showLogin();
            this.showNotification('تم تسجيل الخروج بنجاح', 'success');
        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
        }
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('clinic_token');
        const userData = localStorage.getItem('user_data');
        
        if (token && userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.showMainApp();
            } catch (error) {
                this.showLogin();
            }
        } else {
            this.showLogin();
        }
    }

    showLogin() {
        this.hideAllScreens();
        document.getElementById('loginContainer').classList.remove('hidden');
    }

    showMainApp() {
        this.hideAllScreens();
        document.getElementById('appContainer').classList.remove('hidden');
        this.updateUserInfo();
        this.loadDashboard();
    }

    hideAllScreens() {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('appContainer').classList.add('hidden');
    }

    updateUserInfo() {
        if (this.currentUser) {
            const userNameEl = document.getElementById('userName');
            const userRoleEl = document.getElementById('userRole');
            
            if (userNameEl) userNameEl.textContent = this.currentUser.fullName;
            if (userRoleEl) userRoleEl.textContent = this.getRoleName(this.currentUser.role);
        }
    }

    getRoleName(role) {
        const roles = {
            'doctor': 'طبيب',
            'admin': 'مدير النظام',
            'assistant': 'مساعد طبي'
        };
        return roles[role] || role;
    }

    async handleNavigation(route) {
        const contentArea = document.getElementById('contentArea');
        if (!contentArea) return;

        // تحديث القائمة النشطة
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[href="${route}"]`).classList.add('active');

        // تحديث العنوان
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            const title = this.getPageTitle(route);
            pageTitle.textContent = title;
        }

        // تحميل المحتوى
        contentArea.innerHTML = this.getPageContent(route);
    }

    getPageTitle(route) {
        const titles = {
            '#dashboard': 'لوحة التحكم',
            '#patients': 'إدارة المرضى',
            '#appointments': 'إدارة المواعيد',
            '#medical-records': 'السجلات الطبية',
            '#prescriptions': 'الوصفات الطبية',
            '#laboratory': 'المختبر والتحاليل',
            '#invoices': 'الفواتير والمحاسبة',
            '#reports': 'التقارير والإحصائيات',
            '#settings': 'الإعدادات'
        };
        return titles[route] || 'الصفحة';
    }

    getPageContent(route) {
        const contents = {
            '#dashboard': this.getDashboardContent(),
            '#patients': this.getPatientsContent(),
            '#appointments': this.getAppointmentsContent(),
            '#medical-records': this.getMedicalRecordsContent(),
            '#prescriptions': this.getPrescriptionsContent(),
            '#laboratory': this.getLaboratoryContent(),
            '#invoices': this.getInvoicesContent(),
            '#reports': this.getReportsContent(),
            '#settings': this.getSettingsContent()
        };
        return contents[route] || '<div class="error-state"><p>الصفحة غير متوفرة</p></div>';
    }

    loadDashboard() {
        this.handleNavigation('#dashboard');
    }

    getDashboardContent() {
        return `
            <div class="dashboard">
                <div class="stats-grid">
                    <div class="stat-card primary">
                        <div class="stat-icon">
                            <i class="fas fa-user-injured"></i>
                        </div>
                        <div class="stat-info">
                            <h3>0</h3>
                            <p>عدد المرضى</p>
                        </div>
                    </div>
                    
                    <div class="stat-card success">
                        <div class="stat-icon">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                        <div class="stat-info">
                            <h3>0</h3>
                            <p>مواعيد اليوم</p>
                        </div>
                    </div>
                    
                    <div class="stat-card warning">
                        <div class="stat-icon">
                            <i class="fas fa-file-invoice-dollar"></i>
                        </div>
                        <div class="stat-info">
                            <h3>0 ر.س</h3>
                            <p>إيرادات الشهر</p>
                        </div>
                    </div>
                </div>
                
                <div class="dashboard-content">
                    <div class="welcome-message">
                        <h2>مرحباً بك في نظام إدارة العيادة</h2>
                        <p>ابدأ بإدارة عيادتك الطبية باستخدام الأدوات المتاحة</p>
                        
                        <div class="quick-actions">
                            <button class="btn btn-primary" onclick="app.handleNavigation('#patients')">
                                <i class="fas fa-user-plus"></i> إضافة مريض جديد
                            </button>
                            <button class="btn btn-success" onclick="app.handleNavigation('#appointments')">
                                <i class="fas fa-calendar-plus"></i> جدولة موعد
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getPatientsContent() {
        return `
            <div class="module-container">
                <div class="module-header">
                    <h2>إدارة المرضى</h2>
                    <button class="btn btn-primary">
                        <i class="fas fa-user-plus"></i> إضافة مريض جديد
                    </button>
                </div>
                <div class="empty-state">
                    <i class="fas fa-user-injured"></i>
                    <p>لا توجد بيانات للمرضى بعد</p>
                    <p>ابدأ بإضافة أول مريض إلى النظام</p>
                </div>
            </div>
        `;
    }

    getAppointmentsContent() {
        return `
            <div class="module-container">
                <div class="module-header">
                    <h2>إدارة المواعيد</h2>
                    <button class="btn btn-primary">
                        <i class="fas fa-calendar-plus"></i> حجز موعد جديد
                    </button>
                </div>
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <p>لا توجد مواعيد مسجلة بعد</p>
                    <p>ابدأ بحجز أول موعد للمرضى</p>
                </div>
            </div>
        `;
    }

    getMedicalRecordsContent() {
        return `<div class="empty-state"><p>وحدة السجلات الطبية قيد التطوير</p></div>`;
    }

    getPrescriptionsContent() {
        return `<div class="empty-state"><p>وحدة الوصفات الطبية قيد التطوير</p></div>`;
    }

    getLaboratoryContent() {
        return `<div class="empty-state"><p>وحدة المختبر قيد التطوير</p></div>`;
    }

    getInvoicesContent() {
        return `<div class="empty-state"><p>وحدة الفواتير قيد التطوير</p></div>`;
    }

    getReportsContent() {
        return `<div class="empty-state"><p>وحدة التقارير قيد التطوير</p></div>`;
    }

    getSettingsContent() {
        return `<div class="empty-state"><p>وحدة الإعدادات قيد التطوير</p></div>`;
    }

    updateDateTime() {
        const now = new Date();
        
        // تحديث الوقت
        const timeEl = document.getElementById('currentTime');
        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString('ar-SA');
        }
        
        // تحديث التاريخ
        const dateEl = document.getElementById('currentDate');
        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('ar-SA');
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        
        if (sidebar && mainContent) {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        }
    }

    showQuickActions() {
        this.showNotification('ميزة الإضافة السريعة قيد التطوير', 'info');
    }

    // أدوات المساعدة للواجهة
    updateLoadingMessage(message) {
        const messageEl = document.getElementById('loadingMessage');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }

    showLoading(message = 'جاري التحميل...') {
        this.updateLoadingMessage(message);
        document.getElementById('loadingScreen').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingScreen').classList.add('hidden');
    }

    showNotification(message, type = 'info') {
        // إنشاء إشعار بسيط
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            z-index: 10000;
            border-left: 4px solid ${this.getNotificationColor(type)};
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            'success': '#27ae60',
            'error': '#e74c3c',
            'warning': '#f39c12',
            'info': '#3498db'
        };
        return colors[type] || '#3498db';
    }

    showError(error) {
        this.hideAllScreens();
        
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div class="error-screen">
                    <div class="error-content">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h2>خطأ في تحميل النظام</h2>
                        <p>${error.message}</p>
                        <button onclick="location.reload()" class="btn btn-primary">
                            <i class="fas fa-redo"></i> إعادة تحميل
                        </button>
                    </div>
                </div>
            `;
            loadingScreen.classList.remove('hidden');
        }
    }
}

// جعل التطبيق متاحاً globally
window.ClinicApp = ClinicApp;
