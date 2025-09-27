// الثوابت العامة للتطبيق

export const ROLES = {
    DOCTOR: 'doctor',
    ADMIN: 'admin',
    ASSISTANT: 'assistant',
    RECEPTION: 'reception'
};

export const APPOINTMENT_STATUS = {
    SCHEDULED: 'scheduled',
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    NO_SHOW: 'no_show'
};

export const INVOICE_STATUS = {
    PENDING: 'pending',
    PAID: 'paid',
    PARTIAL: 'partially_paid',
    OVERDUE: 'overdue',
    CANCELLED: 'cancelled'
};

export const GENDER = {
    MALE: 'male',
    FEMALE: 'female'
};

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const MARITAL_STATUS = {
    SINGLE: 'single',
    MARRIED: 'married',
    DIVORCED: 'divorced',
    WIDOWED: 'widowed'
};

export const PRIORITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
};

export const DEFAULT_PAGINATION = {
    page: 1,
    pageSize: 20,
    total: 0
};

export const DATE_FORMATS = {
    DISPLAY: 'dd/MM/yyyy',
    DATABASE: 'yyyy-MM-dd',
    TIME: 'HH:mm'
};

// رسائل الخطأ
export const ERROR_MESSAGES = {
    REQUIRED: 'هذا الحقل مطلوب',
    INVALID_EMAIL: 'البريد الإلكتروني غير صحيح',
    INVALID_PHONE: 'رقم الهاتف غير صحيح',
    INVALID_NATIONAL_ID: 'الرقم الوطني غير صحيح',
    PASSWORD_TOO_WEAK: 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل وتشمل حروفاً وأرقاماً',
    DATE_IN_FUTURE: 'التاريخ يجب أن يكون في المستقبل',
    DATE_IN_PAST: 'التاريخ يجب أن يكون في الماضي'
};
