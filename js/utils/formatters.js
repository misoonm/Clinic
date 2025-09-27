// أدوات تنسيق البيانات

export function formatArabicNumber(number) {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return number.toString().replace(/\d/g, digit => arabicNumbers[digit]);
}

export function formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${formatArabicNumber(diffMins)} دقيقة`;
    if (diffHours < 24) return `منذ ${formatArabicNumber(diffHours)} ساعة`;
    if (diffDays < 7) return `منذ ${formatArabicNumber(diffDays)} يوم`;
    
    return formatDate(date);
}

export function formatMedicalValue(value, unit, normalRange = null) {
    let formatted = `${value} ${unit}`;
    if (normalRange) {
        const [min, max] = normalRange;
        if (value < min) {
            formatted += ' ⬇️'; // منخفض
        } else if (value > max) {
            formatted += ' ⬆️'; // مرتفع
        } else {
            formatted += ' ✅'; // طبيعي
        }
    }
    return formatted;
}

export function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

export function capitalizeArabic(text) {
    if (!text) return '';
    return text.replace(/(^|\s)\S/g, l => l.toUpperCase());
}

export function formatAppointmentStatus(status) {
    const statusMap = {
        'scheduled': 'مجدول',
        'confirmed': 'مؤكد',
        'in_progress': 'قيد الكشف',
        'completed': 'مكتمل',
        'cancelled': 'ملغى',
        'no_show': 'لم يحضر'
    };
    return statusMap[status] || status;
}

export function getStatusColor(status) {
    const colors = {
        'scheduled': '#3498db',
        'confirmed': '#27ae60',
        'in_progress': '#f39c12',
        'completed': '#95a5a6',
        'cancelled': '#e74c3c',
        'no_show': '#9b59b6'
    };
    return colors[status] || '#95a5a6';
}
