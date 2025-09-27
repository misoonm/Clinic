// js/app.js - التطبيق الرئيسي

import clinicDB from './db.js';
import AuthManager from './auth.js';
import Router from './router.js';
import { showLoading, hideLoading, showNotification } from './utils/helpers.js';

class ClinicApp {
    constructor() {
        this.db = clinicDB;
        this.auth = new AuthManager(this.db);
        this.router = new Router();
        this.currentUser = null;
        this.appConfig = {};
        
        this.init();
    }

    async init() {
        try {
            showLoading('جاري تهيئة النظام...');
            
            // انتظار تهيئة قاعدة البيانات
            await this.db.init();
            
            // تحميل إعدادات التطبيق
            this.appConfig = await this.db.getAppConfig();
            
            // تهيئة واجهة المستخدم
            await this.initUI();
            
            // تهيئة نظام المصادقة
            await this.auth.init();
            
            // التحقق من حالة تسجيل الدخول
            await this.checkAuthStatus();
            
            // تهيئة التوجيه
            this.router.init(this);
            
            hideLoading();
            
        } catch (error) {
            console.error('فشل في تهيئة التطبيق:', error);
            showNotification('فشل في تحميل التطبيق', 'error');
        }
    }

    async initUI() {
        // تحديث معلومات العيادة
        this.updateClinicInfo();
        
        // تحديث تاريخ اليوم
        this.updateCurrentDate();
        
        // تهيئة الأحداث
        this.initEvents();
        
        // تحميل الإشعارات
        this.loadNotifications();
    }

    updateClinicInfo() {
        const clinicName = document.getElementById('clinicName');
        const pageTitle = document.getElementById('pageTitle');
        
        if (clinicName && this.appConfig.clinic_name) {
            clinicName.textContent = this.appConfig.clinic_name;
        }
        
        if (pageTitle && this.appConfig.clinic_name) {
            document.title = `نظام إدارة - ${this.appConfig.clinic_name}`;
        }
    }

    updateCurrentDate() {
        const currentDateEl = document.getElementById('currentDate');
        if (currentDateEl) {
            const now = new Date();
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            currentDateEl.textContent = now.toLocaleDateString('ar-SA', options);
        }
    }

    initEvents() {
        // حدث تسجيل الخروج
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.auth.logout());
        }

        // حدث تبديل الشريط الجانبي
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }

        // حدث الإشعارات
        const notificationsBtn = document.getElementById('notificationsBtn');
        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', () => this.toggleNotifications());
        }

        // زر الإضافة السريعة
        const quickAddBtn = document.getElementById('quickAddBtn');
        if (quickAddBtn) {
            quickAddBtn.addEventListener('click', () => this.showQuickAddMenu());
        }
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('clinic_token');
        
        if (token) {
            try {
                this.currentUser = await this.auth.validateToken(token);
                if (this.currentUser) {
                    this.showMainApp();
                    this.updateUserInfo();
                } else {
                    this.showLogin();
                }
            } catch (error) {
                console.error('خطأ في المصادقة:', error);
                this.showLogin();
            }
        } else {
            this.showLogin();
        }
    }

    showLogin() {
        document.getElementById('loginContainer').classList.remove('hidden');
        document.getElementById('appContainer').classList.add('hidden');
    }

    showMainApp() {
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');
    }

    updateUserInfo() {
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');
        
        if (userNameEl && this.currentUser) {
            userNameEl.textContent = this.currentUser.fullName || this.currentUser.username;
        }
        
        if (userRoleEl && this.currentUser) {
            userRoleEl.textContent = this.getRoleName(this.currentUser.role);
        }
    }

    getRoleName(role) {
        const roles = {
            'doctor': 'طبيب',
            'admin': 'مدير النظام',
            'assistant': 'مساعد طبي',
            'reception': 'استقبال'
        };
        return roles[role] || role;
    }

    toggleSidebar() {
        document.getElementById('sidebar').classList.toggle('collapsed');
        document.getElementById('mainContent').classList.toggle('expanded');
    }

    toggleNotifications() {
        document.getElementById('notificationsPanel').classList.toggle('hidden');
    }

    async loadNotifications() {
        try {
            const notifications = await this.db.getAll('notifications', {
                isRead: false
            }, 'createdAt', 'desc');
            
            this.displayNotifications(notifications);
        } catch (error) {
            console.error('خطأ في تحميل الإشعارات:', error);
        }
    }

    displayNotifications(notifications) {
        const container = document.getElementById('notificationsList');
        if (!container) return;

        if (notifications.length === 0) {
            container.innerHTML = '<div class="empty-state">لا توجد إشعارات جديدة</div>';
            return;
        }

        container.innerHTML = notifications.map(notif => `
            <div class="notification-item ${notif.priority}" data-id="${notif.id}">
                <div class="notification-icon">
                    <i class="fas fa-${this.getNotificationIcon(notif.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">${notif.title}</div>
                    <div class="notification-message">${notif.message}</div>
                    <div class="notification-time">${this.formatTime(notif.createdAt)}</div>
                </div>
                <button class="mark-read" onclick="app.markNotificationRead(${notif.id})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    getNotificationIcon(type) {
        const icons = {
            'appointment_reminder': 'calendar-check',
            'new_patient': 'user-plus',
            'payment_received': 'money-check',
            'low_stock': 'exclamation-triangle',
            'system_alert': 'bell'
        };
        return icons[type] || 'bell';
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('ar-SA', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    async markNotificationRead(notificationId) {
        try {
            await this.db.update('notifications', notificationId, { isRead: true });
            this.loadNotifications();
        } catch (error) {
            console.error('خطأ في تحديث الإشعار:', error);
        }
    }

    showQuickAddMenu() {
        // تنفيذ قائمة الإضافة السريعة
        showNotification('ميزة الإضافة السريعة قيد التطوير', 'info');
    }

    // دالة مساعدة للوصول عالمياً
    static getInstance() {
        if (!ClinicApp.instance) {
            ClinicApp.instance = new ClinicApp();
        }
        return ClinicApp.instance;
    }
}

// تهيئة التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.app = ClinicApp.getInstance();
});

export default ClinicApp;
