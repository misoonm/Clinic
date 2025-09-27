// إدارة المختبر والتحاليل
import { showNotification, confirmAction, formatDate } from '../utils/helpers.js';
import { formatArabicNumber, formatMedicalValue } from '../utils/formatters.js';

class LaboratoryManager {
    constructor(app) {
        this.app = app;
        this.db = app.db;
        this.currentPage = 1;
        this.pageSize = 15;
    }

    async init() {
        await this.renderLaboratory();
        this.setupEventListeners();
    }

    async renderLaboratory() {
        const contentArea = document.getElementById('contentArea');
        
        contentArea.innerHTML = `
            <div class="laboratory-module">
                <div class="module-header">
                    <h2>المختبر والتحاليل</h2>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="addLabTestBtn">
                            <i class="fas fa-vial"></i> طلب تحليل جديد
                        </button>
                        <button class="btn btn-outline" id="manageTestsBtn">
                            <i class="fas fa-cog"></i> إدارة التحاليل
                        </button>
                    </div>
                </div>
                
                <div class="lab-stats">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-vial"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="totalTests">0</h3>
                            <p>إجمالي التحاليل</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="pendingTests">0</h3>
                            <p>تحاليل pending</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-check"></i>
                        </div>
                        <div class="stat-info">
                            <h3 id="completedTests">0</h3>
                            <p>تحاليل مكتملة</p>
                        </div>
                    </div>
                </div>
                
                <div class="lab-tabs">
                    <div class="tab-nav">
                        <button class="tab-link active" data-tab="requests">طلبات التحاليل</button>
                        <button class="tab-link" data-tab="results">نتائج التحاليل</button>
                        <button class="tab-link" data-tab="tests">أنواع التحاليل</button>
                    </div>
                    
                    <div class="tab-content">
                        <div id="requests-tab" class="tab-pane active">
                            <div class="requests-table-container">
                                <table class="data-table" id="requestsTable">
                                    <thead>
                                        <tr>
                                            <th>رقم الطلب</th>
                                            <th>المريض</th>
                                            <th>نوع التحليل</th>
                                            <th>التاريخ</th>
                                            <th>الحالة</th>
                                            <th>الإجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody id="requestsTableBody">
                                        <!-- سيتم ملؤه ديناميكياً -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div id="results-tab" class="tab-pane">
                            <div class="results-container" id="resultsContainer">
                                <!-- سيتم ملؤه ديناميكياً -->
                            </div>
                        </div>
                        
                        <div id="tests-tab" class="tab-pane">
                            <div class="tests-management">
                                <button class="btn btn-primary" id="addTestTypeBtn">
                                    <i class="fas fa-plus"></i> إضافة نوع تحليل
                                </button>
                                <div class="tests-list" id="testsList">
                                    <!-- سيتم ملؤه ديناميكياً -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadLabData();
        this.setupTabNavigation();
    }

    async loadLabData() {
        await this.loadLabRequests();
        await this.loadLabResults();
        await this.loadTestTypes();
        await this.updateStats();
    }

    async loadLabRequests() {
        try {
            const requests = await this.db.getAll('labResults');
            this.renderLabRequests(requests);
        } catch (error) {
            console.error('خطأ في تحميل طلبات التحاليل:', error);
        }
    }

    async loadLabResults() {
        try {
            const results = await this.db.getAll('labResults', { status: 'completed' });
            this.renderLabResults(results);
        } catch (error) {
            console.error('خطأ في تحميل نتائج التحاليل:', error);
        }
    }

    async loadTestTypes() {
        try {
            const tests = await this.db.getAll('labTests');
            this.renderTestTypes(tests);
        } catch (error) {
            console.error('خطأ في تحميل أنواع التحاليل:', error);
        }
    }

    renderLabRequests(requests) {
        const tbody = document.getElementById('requestsTableBody');
        if (!tbody) return;

        if (requests.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-vial"></i>
                        <p>لا توجد طلبات تحاليل</p>
                    </td>
                </tr>
            `;
            return;
        }

        // الترتيب بحسب التاريخ (الأحدث أولاً)
        requests.sort((a, b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = requests.map(request => `
            <tr>
                <td><strong>LAB-${request.id.toString().padStart(4, '0')}</strong></td>
                <td>${this.getPatientName(request.patientId)}</td>
                <td>${this.getTestName(request.testId)}</td>
                <td>${formatDate(request.date)}</td>
                <td>
                    <span class="status-badge ${request.status}">
                        ${this.getStatusText(request.status)}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        ${request.status === 'pending' ? `
                            <button class="btn-icon process-test" data-id="${request.id}" title="معالجة التحليل">
                                <i class="fas fa-flask"></i>
                            </button>
                        ` : ''}
                        
                        ${request.status === 'processing' ? `
                            <button class="btn-icon enter-results" data-id="${request.id}" title="إدخال النتائج">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                        
                        ${request.status === 'completed' ? `
                            <button class="btn-icon view-results" data-id="${request.id}" title="عرض النتائج">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-icon print-results" data-id="${request.id}" title="طباعة النتائج">
                                <i class="fas fa-print"></i>
                            </button>
                        ` : ''}
                        
                        <button class="btn-icon delete-request" data-id="${request.id}" title="حذف الطلب">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        this.attachRequestEvents();
    }

    renderLabResults(results) {
        const container = document.getElementById('resultsContainer');
        if (!container) return;

        if (results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-medical"></i>
                    <p>لا توجد نتائج تحاليل</p>
                </div>
            `;
            return;
        }

        container.innerHTML = results.map(result => `
            <div class="result-card">
                <div class="result-header">
                    <div class="result-info">
                        <h4>${this.getPatientName(result.patientId)}</h4>
                        <p>${this.getTestName(result.testId)} - ${formatDate(result.date)}</p>
                    </div>
                    <span class="result-status ${result.abnormal ? 'abnormal' : 'normal'}">
                        ${result.abnormal ? 'غير طبيعي' : 'طبيعي'}
                    </span>
                </div>
                
                <div class="result-details">
                    ${result.results ? Object.entries(result.results).map(([test, value]) => `
                        <div class="result-item">
                            <span class="test-name">${test}</span>
                            <span class="test-value">${value}</span>
                            <span class="test-range">${this.getNormalRange(test)}</span>
                        </div>
                    `).join('') : '<p>لا توجد نتائج مسجلة</p>'}
                </div>
                
                <div class="result-actions">
                    <button class="btn btn-sm btn-outline view-full-result" data-id="${result.id}">
                        <i class="fas fa-eye"></i> عرض كامل
                    </button>
                    <button class="btn btn-sm btn-outline print-result" data-id="${result.id}">
                        <i class="fas fa-print"></i> طباعة
                    </button>
                </div>
            </div>
        `).join('');

        this.attachResultEvents();
    }

    renderTestTypes(tests) {
        const container = document.getElementById('testsList');
        if (!container) return;

        if (tests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-vial"></i>
                    <p>لا توجد أنواع تحاليل مسجلة</p>
                </div>
            `;
            return;
        }

        container.innerHTML = tests.map(test => `
            <div class="test-type-card">
                <div class="test-info">
                    <h4>${test.name}</h4>
                    <p>${test.description || 'لا يوجد وصف'}</p>
                    <div class="test-meta">
                        <span class="price">${test.price ? test.price + ' ر.س' : 'سعر غير محدد'}</span>
                        <span class="category">${test.category || 'عام'}</span>
                    </div>
                </div>
                <div class="test-actions">
                    <button class="btn-icon edit-test" data-id="${test.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete-test" data-id="${test.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        this.attachTestEvents();
    }

    async getPatientName(patientId) {
        try {
            const patient = await this.db.get('patients', patientId);
            return patient?.name || 'مريض غير معروف';
        } catch (error) {
            return 'مريض غير معروف';
        }
    }

    async getTestName(testId) {
        try {
            const test = await this.db.get('labTests', testId);
            return test?.name || 'تحليل غير معروف';
        } catch (error) {
            return 'تحليل غير معروف';
        }
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'pending',
            'processing': 'قيد المعالجة',
            'completed': 'مكتمل',
            'cancelled': 'ملغى'
        };
        return statusMap[status] || status;
    }

    getNormalRange(testName) {
        const ranges = {
            'Hb': '12-16 g/dL',
            'WBC': '4-11 ×10³/μL',
            'Glucose': '70-110 mg/dL',
            'Cholesterol': '<200 mg/dL'
        };
        return ranges[testName] || 'غير محدد';
    }

    setupEventListeners() {
        document.getElementById('addLabTestBtn')?.addEventListener('click', () => {
            this.showLabRequestForm();
        });

        document.getElementById('manageTestsBtn')?.addEventListener('click', () => {
            this.switchTab('tests');
        });

        document.getElementById('addTestTypeBtn')?.addEventListener('click', () => {
            this.showTestTypeForm();
        });
    }

    setupTabNavigation() {
        document.querySelectorAll('.tab-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // إخفاء جميع المحتويات
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        
        // إلغاء تنشيط جميع الأزرار
        document.querySelectorAll('.tab-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // إظهار المحتوى المحدد
        document.getElementById(`${tabName}-tab`).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    }

    attachRequestEvents() {
        document.querySelectorAll('.process-test').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const requestId = e.currentTarget.dataset.id;
                await this.processLabTest(requestId);
            });
        });

        document.querySelectorAll('.enter-results').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const requestId = e.currentTarget.dataset.id;
                this.enterLabResults(requestId);
            });
        });

        document.querySelectorAll('.view-results').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const requestId = e.currentTarget.dataset.id;
                this.viewLabResults(requestId);
            });
        });

        document.querySelectorAll('.delete-request').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const requestId = e.currentTarget.dataset.id;
                await this.deleteLabRequest(requestId);
            });
        });
    }

    attachResultEvents() {
        document.querySelectorAll('.view-full-result').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const resultId = e.currentTarget.dataset.id;
                this.viewFullResults(resultId);
            });
        });
    }

    attachTestEvents() {
        document.querySelectorAll('.edit-test').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const testId = e.currentTarget.dataset.id;
                this.editTestType(testId);
            });
        });

        document.querySelectorAll('.delete-test').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const testId = e.currentTarget.dataset.id;
                await this.deleteTestType(testId);
            });
        });
    }

    async processLabTest(requestId) {
        try {
            await this.db.update('labResults', requestId, { status: 'processing' });
            showNotification('تم بدء معالجة التحليل', 'success');
            await this.loadLabData();
        } catch (error) {
            console.error('خطأ في معالجة التحليل:', error);
            showNotification('فشل في معالجة التحليل', 'error');
        }
    }

    enterLabResults(requestId) {
        this.showResultsForm(requestId);
    }

    viewLabResults(requestId) {
        this.showResultsModal(requestId);
    }

    async deleteLabRequest(requestId) {
        const confirmed = await confirmAction('هل تريد حذف طلب التحليل هذا؟');
        if (!confirmed) return;

        try {
            await this.db.delete('labResults', requestId);
            showNotification('تم حذف طلب التحليل', 'success');
            await this.loadLabData();
        } catch (error) {
            console.error('خطأ في حذف طلب التحليل:', error);
            showNotification('فشل في حذف طلب التحليل', 'error');
        }
    }

    async updateStats() {
        try {
            const requests = await this.db.getAll('labResults');
            const totalTests = requests.length;
            const pendingTests = requests.filter(r => r.status === 'pending').length;
            const completedTests = requests.filter(r => r.status === 'completed').length;

            document.getElementById('totalTests').textContent = formatArabicNumber(totalTests);
            document.getElementById('pendingTests').textContent = formatArabicNumber(pendingTests);
            document.getElementById('completedTests').textContent = formatArabicNumber(completedTests);
        } catch (error) {
            console.error('خطأ في تحديث الإحصائيات:', error);
        }
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

window.laboratoryManager = null;

export default LaboratoryManager;
