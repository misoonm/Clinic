// js/auth.js - إدارة المصادقة

import { showNotification, validateEmail, validatePassword } from './utils/validators.js';

class AuthManager {
    constructor(database) {
        this.db = database;
        this.currentUser = null;
        this.token = null;
    }

    async init() {
        this.token = localStorage.getItem('clinic_token');
        this.setupLoginForm();
    }

    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const username = formData.get('username');
        const password = formData.get('password');

        // التحقق من الصحة
        if (!username || !password) {
            showNotification('يرجى ملء جميع الحقول', 'error');
            return;
        }

        try {
            const result = await this.db.login(username, password);
            
            if (result && result.token) {
                this.token = result.token;
                this.currentUser = result.user;
                
                // حفظ Token في localStorage
                localStorage.setItem('clinic_token', this.token);
                localStorage.setItem('user_data', JSON.stringify(this.currentUser));
                
                showNotification(`مرحباً ${this.currentUser.fullName}`, 'success');
                
                // إعادة تحميل التطبيق
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                
            } else {
                throw new Error('فشل في تسجيل الدخول');
            }
        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            showNotification('اسم المستخدم أو كلمة المرور غير صحيحة', 'error');
        }
    }

    async validateToken(token) {
        try {
            return await this.db.validateSession(token);
        } catch (error) {
            console.error('خطأ في التحقق من الجلسة:', error);
            this.logout();
            return null;
        }
    }

    async logout() {
        try {
            if (this.token) {
                await this.db.logout(this.token);
            }
        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
        } finally {
            // مسح البيانات المحلية
            localStorage.removeItem('clinic_token');
            localStorage.removeItem('user_data');
            this.token = null;
            this.currentUser = null;
            
            // إعادة تحميل الصفحة
            window.location.href = '/';
        }
    }

    isAuthenticated() {
        return !!this.token && !!this.currentUser;
    }

    hasPermission(requiredRole) {
        if (!this.currentUser) return false;
        
        const rolesHierarchy = {
            'doctor': 4,
            'admin': 3,
            'assistant': 2,
            'reception': 1
        };
        
        const userLevel = rolesHierarchy[this.currentUser.role] || 0;
        const requiredLevel = rolesHierarchy[requiredRole] || 0;
        
        return userLevel >= requiredLevel;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getToken() {
        return this.token;
    }
}

export default AuthManager;
