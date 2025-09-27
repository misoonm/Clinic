// أدوات مساعدة

export function showLoading(message = 'جاري التحميل...') {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        const messageEl = loadingScreen.querySelector('p');
        if (messageEl) messageEl.textContent = message;
        loadingScreen.style.display = 'flex';
    }
}

export function hideLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

export function showNotification(message, type = 'info', duration = 5000) {
    // إنشاء عنصر الإشعار
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // إضافة الأنماط إذا لم تكن موجودة
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                left: 20px;
                background: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                gap: 1rem;
                z-index: 10000;
                max-width: 400px;
                border-left: 4px solid;
            }
            .notification-info { border-left-color: #3498db; }
            .notification-success { border-left-color: #27ae60; }
            .notification-warning { border-left-color: #f39c12; }
            .notification-error { border-left-color: #e74c3c; }
            .notification-close {
                background: none;
                border: none;
                color: #999;
                cursor: pointer;
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // إغلاق الإشعار
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    
    // إزالة تلقائية بعد المدة
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, duration);
}

function getNotificationIcon(type) {
    const icons = {
        'info': 'info-circle',
        'success': 'check-circle',
        'warning': 'exclamation-triangle',
        'error': 'exclamation-circle'
    };
    return icons[type] || 'info-circle';
}

export function formatDate(date, format = 'dd/MM/yyyy') {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    
    return format.replace('dd', day).replace('MM', month).replace('yyyy', year);
}

export function formatCurrency(amount, currency = 'SAR') {
    return new Intl.NumberFormat('ar-SA', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export async function confirmAction(message) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'confirmation-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>تأكيد الإجراء</h3>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="confirmCancel">إلغاء</button>
                    <button class="btn btn-danger" id="confirmOk">موافق</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('confirmOk').addEventListener('click', () => {
            modal.remove();
            resolve(true);
        });
        
        document.getElementById('confirmCancel').addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });
    });
}
