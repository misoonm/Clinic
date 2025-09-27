// إدارة الفواتير
import { showNotification, confirmAction, formatDate, formatCurrency } from '../utils/helpers.js';
import { formatArabicNumber } from '../utils/formatters.js';

class InvoicesManager {
    constructor(app) {
        this.app = app;
        this.db = app.db;
        this.currentPage = 1;
        this.pageSize = 15;
    }

    async init() {
        await this.renderInvoices();
        this.setupEventListeners();
    }

    async renderInvoices() {
        const contentArea = document.getElementById('contentArea');
        
        contentArea.innerHTML = `
            <div class="invoices-module">
                <div class="module-header">
                    <h2>إدارة الفواتير</h2>
                    <button class="btn btn-primary" id="addInvoiceBtn">
                        <i class="fas fa-file-invoice-dollar"></i> إنشاء فاتورة
                    </button>
                </div>
                
                <div class="summary-cards">
                    <div class="summary-card total">
                        <div class="summary-icon">
                            <i class="fas fa-receipt"></i>
                        </div>
                        <div class="summary-info">
                            <h3 id="totalInvoices">0</h3>
                            <p>إجمالي الفواتير</p>
                        </div>
                    </div>
                    
                    <div class="summary-card paid">
                        <div class="summary-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="summary-info">
                            <h3 id="paidInvoices">0</h3>
                            <p>فواتير مدفوعة</p>
                        </div>
                    </div>
                    
                    <div class="summary-card pending">
                        <div class="summary-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="summary-info">
                            <h3 id="pendingInvoices">0</h3>
                            <p>فواتير pending</p>
                        </div>
                    </div>
                    
                    <div class="summary-card revenue">
                        <div class="summary-icon">
                            <i class="fas fa-money-bill-wave"></i>
                        </div>
                        <div class="summary-info">
                            <h3 id="totalRevenue">0 ر.س</h3>
                            <p>إجمالي الإيرادات</p>
                        </div>
                    </div>
                </div>
                
                <div class="invoices-table-container">
                    <table class="data-table" id="invoicesTable">
                        <thead>
                            <tr>
                                <th>رقم الفاتورة</th>
                                <th>المريض</th>
                                <th>التاريخ</th>
                                <th>المبلغ</th>
                                <th>الحالة</th>
                                <th>طريقة الدفع</th>
                                <th>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="invoicesTableBody">
                            <!-- سيتم ملؤه ديناميكياً -->
                        </tbody>
                    </table>
                </div>
                
                <div class="pagination" id="pagination"></div>
            </div>
        `;

        await this.loadInvoices();
        await this.updateSummary();
    }

    async loadInvoices() {
        try {
            const invoices = await this.db.getAll('invoices');
            this.renderInvoicesTable(invoices);
        } catch (error) {
            console.error('خطأ في تحميل الفواتير:', error);
            showNotification('فشل في تحميل الفواتير', 'error');
        }
    }

    renderInvoicesTable(invoices) {
        const tbody = document.getElementById('invoicesTableBody');
        if (!tbody) return;

        if (invoices.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-file-invoice"></i>
                        <p>لا توجد فواتير</p>
                    </td>
                </tr>
            `;
            return;
        }

        // الترتيب بحسب التاريخ (الأحدث أولاً)
        invoices.sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));

        tbody.innerHTML = invoices.map(invoice => `
            <tr>
                <td>
                    <strong>${invoice.invoiceNumber}</strong>
                    ${invoice.appointmentId ? '<br><small>مرفق بموعد</small>' : ''}
                </td>
                <td>
                    <div class="patient-info">
                        <strong>${this.getPatientName(invoice.patientId)}</strong>
                    </div>
                </td>
                <td>${formatDate(invoice.invoiceDate)}</td>
                <td>
                    <strong>${formatCurrency(invoice.totalAmount)}</strong>
                    ${invoice.taxAmount > 0 ? `<br><small>يشمل ضريبة ${formatCurrency(invoice.taxAmount)}</small>` : ''}
                </td>
                <td>
                    <span class="status-badge ${invoice.status}">
                        ${this.getStatusText(invoice.status)}
                    </span>
                </td>
                <td>${invoice.paymentMethod || 'غير محدد'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon view-invoice" data-id="${invoice.id}" title="عرض الفاتورة">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${invoice.status === 'pending' ? `
                            <button class="btn-icon pay-invoice" data-id="${invoice.id}" title="تسديد الفاتورة">
                                <i class="fas fa-money-check"></i>
                            </button>
                        ` : ''}
                        <button class="btn-icon print-invoice" data-id="${invoice.id}" title="طباعة الفاتورة">
                            <i class="fas fa-print"></i>
                        </button>
                        <button class="btn-icon delete-invoice" data-id="${invoice.id}" title="حذف الفاتورة">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        this.attachInvoiceEvents();
    }

    async getPatientName(patientId) {
        try {
            const patient = await this.db.get('patients', patientId);
            return patient?.name || 'مريض غير معروف';
        } catch (error) {
            return 'مريض غير معروف';
        }
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'pending',
            'paid': 'مدفوعة',
            'partially_paid': 'مدفوعة جزئياً',
            'overdue': 'متأخرة',
            'cancelled': 'ملغاة'
        };
        return statusMap[status] || status;
    }

    async updateSummary() {
        try {
            const invoices = await this.db.getAll('invoices');
            
            const totalInvoices = invoices.length;
            const paidInvoices = invoices.filter(i => i.status === 'paid').length;
            const pendingInvoices = invoices.filter(i => i.status === 'pending').length;
            const totalRevenue = invoices
                .filter(i => i.status === 'paid')
                .reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
            
            document.getElementById('totalInvoices').textContent = formatArabicNumber(totalInvoices);
            document.getElementById('paidInvoices').textContent = formatArabicNumber(paidInvoices);
            document.getElementById('pendingInvoices').textContent = formatArabicNumber(pendingInvoices);
            document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
            
        } catch (error) {
            console.error('خطأ في تحديث الإحصائيات:', error);
        }
    }

    setupEventListeners() {
        document.getElementById('addInvoiceBtn')?.addEventListener('click', () => {
            this.showInvoiceForm();
        });
    }

    attachInvoiceEvents() {
        document.querySelectorAll('.view-invoice').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const invoiceId = e.currentTarget.dataset.id;
                this.viewInvoice(invoiceId);
            });
        });

        document.querySelectorAll('.pay-invoice').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const invoiceId = e.currentTarget.dataset.id;
                await this.payInvoice(invoiceId);
            });
        });

        document.querySelectorAll('.print-invoice').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const invoiceId = e.currentTarget.dataset.id;
                this.printInvoice(invoiceId);
            });
        });

        document.querySelectorAll('.delete-invoice').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const invoiceId = e.currentTarget.dataset.id;
                await this.deleteInvoice(invoiceId);
            });
        });
    }

    async viewInvoice(invoiceId) {
        try {
            const invoice = await this.db.get('invoices', invoiceId);
            if (!invoice) {
                showNotification('الفاتورة غير موجودة', 'error');
                return;
            }

            const items = await this.db.getAllByIndex('invoiceItems', 'invoiceId', invoiceId);
            const patient = await this.db.get('patients', invoice.patientId);

            const modalContent = `
                <div class="modal-large">
                    <div class="modal-header">
                        <h3>فاتورة ${invoice.invoiceNumber}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="invoice-details">
                            <div class="invoice-header">
                                <div class="clinic-info">
                                    <h3 id="clinicName">العيادة الطبية</h3>
                                    <p id="clinicAddress">عنوان العيادة</p>
                                    <p id="clinicPhone">هاتف العيادة</p>
                                </div>
                                <div class="invoice-meta">
                                    <p><strong>رقم الفاتورة:</strong> ${invoice.invoiceNumber}</p>
                                    <p><strong>التاريخ:</strong> ${formatDate(invoice.invoiceDate)}</p>
                                    <p><strong>الحالة:</strong> ${this.getStatusText(invoice.status)}</p>
                                </div>
                            </div>
                            
                            <div class="invoice-patient">
                                <h4>معلومات المريض</h4>
                                <p><strong>الاسم:</strong> ${patient?.name || 'غير معروف'}</p>
                                <p><strong>الهاتف:</strong> ${patient?.phone || 'غير معروف'}</p>
                            </div>
                            
                            <div class="invoice-items">
                                <h4>تفاصيل الفاتورة</h4>
                                <table class="items-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>الخدمة</th>
                                            <th>الكمية</th>
                                            <th>السعر</th>
                                            <th>المجموع</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${items.map((item, index) => `
                                            <tr>
                                                <td>${index + 1}</td>
                                                <td>${item.description || item.serviceName}</td>
                                                <td>${item.quantity}</td>
                                                <td>${formatCurrency(item.price)}</td>
                                                <td>${formatCurrency(item.price * item.quantity)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colspan="4" class="text-right"><strong>المجموع الفرعي:</strong></td>
                                            <td>${formatCurrency(invoice.subtotal)}</td>
                                        </tr>
                                        ${invoice.taxAmount > 0 ? `
                                            <tr>
                                                <td colspan="4" class="text-right"><strong>الضريبة:</strong></td>
                                                <td>${formatCurrency(invoice.taxAmount)}</td>
                                            </tr>
                                        ` : ''}
                                        <tr class="total-row">
                                            <td colspan="4" class="text-right"><strong>الإجمالي:</strong></td>
                                            <td>${formatCurrency(invoice.totalAmount)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-primary" onclick="invoicesManager.printInvoice(${invoiceId})">
                            <i class="fas fa-print"></i> طباعة
                        </button>
                        <button class="btn btn-secondary" onclick="invoicesManager.closeModal()">إغلاق</button>
                    </div>
                </div>
            `;

            this.showModal(modalContent);
            
        } catch (error) {
            console.error('خطأ في عرض الفاتورة:', error);
            showNotification('فشل في تحميل الفاتورة', 'error');
        }
    }

    async payInvoice(invoiceId) {
        const confirmed = await confirmAction('هل تريد تسديد هذه الفاتورة؟');
        if (!confirmed) return;

        try {
            await this.db.updateInvoiceStatus(invoiceId, 'paid');
            showNotification('تم تسديد الفاتورة بنجاح', 'success');
            await this.loadInvoices();
            await this.updateSummary();
        } catch (error) {
            console.error('خطأ في تسديد الفاتورة:', error);
            showNotification('فشل في تسديد الفاتورة', 'error');
        }
    }

    async deleteInvoice(invoiceId) {
        const confirmed = await confirmAction('هل أنت متأكد من حذف هذه الفاتورة؟ هذا الإجراء لا يمكن التراجع عنه.');
        if (!confirmed) return;

        try {
            await this.db.delete('invoices', invoiceId, this.app.auth.getCurrentUser()?.id);
            showNotification('تم حذف الفاتورة بنجاح', 'success');
            await this.loadInvoices();
            await this.updateSummary();
        } catch (error) {
            console.error('خطأ في حذف الفاتورة:', error);
            showNotification('فشل في حذف الفاتورة', 'error');
        }
    }

    printInvoice(invoiceId) {
        showNotification('جاري تحضير الفاتورة للطباعة...', 'info');
        // يمكن تنفيذ الطباعة باستخدام window.print() أو مكتبة متخصصة
        setTimeout(() => {
            window.print();
        }, 1000);
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

window.invoicesManager = null;

export default InvoicesManager;
