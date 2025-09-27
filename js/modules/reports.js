// إدارة التقارير
import { formatDate, formatCurrency } from '../utils/helpers.js';
import { formatArabicNumber } from '../utils/formatters.js';

class ReportsManager {
    constructor(app) {
        this.app = app;
        this.db = app.db;
    }

    async init() {
        await this.renderReports();
    }

    async renderReports() {
        const contentArea = document.getElementById('contentArea');
        
        contentArea.innerHTML = `
            <div class="reports-module">
                <div class="module-header">
                    <h2>التقارير والإحصائيات</h2>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="generateReportBtn">
                            <i class="fas fa-chart-bar"></i> إنشاء تقرير
                        </button>
                    </div>
                </div>
                
                <div class="reports-dashboard">
                    <div class="report-filters">
                        <div class="filter-group">
                            <label>الفترة:</label>
                            <select id="periodFilter" class="form-control">
                                <option value="today">اليوم</option>
                                <option value="week">أسبوع</option>
                                <option value="month" selected>شهر</option>
                                <option value="quarter">ربع سنة</option>
                                <option value="year">سنة</option>
                                <option value="custom">مخصص</option>
                            </select>
                        </div>
                        
                        <div class="filter-group custom-dates hidden">
                            <label>من:</label>
                            <input type="date" id="startDate" class="form-control">
                        </div>
                        
                        <div class="filter-group custom-dates hidden">
                            <label>إلى:</label>
                            <input type="date" id="endDate" class="form-control">
                        </div>
                        
                        <button class="btn btn-primary" id="applyFilters">
                            <i class="fas fa-filter"></i> تطبيق
                        </button>
                    </div>
                    
                    <div class="charts-container">
                        <div class="chart-card">
                            <h3>الإيرادات الشهرية</h3>
                            <canvas id="revenueChart" width="400" height="200"></canvas>
                        </div>
                        
                        <div class="chart-card">
                            <h3>توزيع المرضى حسب العمر</h3>
                            <canvas id="ageDistributionChart" width="400" height="200"></canvas>
                        </div>
                        
                        <div class="chart-card">
                            <h3>حالات المواعيد</h3>
                            <canvas id="appointmentsChart" width="400" height="200"></canvas>
                        </div>
                        
                        <div class="chart-card">
                            <h3>أكثر الخدمات طلباً</h3>
                            <canvas id="servicesChart" width="400" height="200"></canvas>
                        </div>
                    </div>
                    
                    <div class="detailed-reports">
                        <h3>تقارير مفصلة</h3>
                        <div class="report-cards">
                            <div class="report-card" data-report="financial">
                                <i class="fas fa-money-bill-wave"></i>
                                <h4>التقرير المالي</h4>
                                <p>تحليل الإيرادات والمصروفات</p>
                            </div>
                            
                            <div class="report-card" data-report="patients">
                                <i class="fas fa-user-injured"></i>
                                <h4>تقرير المرضى</h4>
                                <p>إحصائيات المرضى والزيارات</p>
                            </div>
                            
                            <div class="report-card" data-report="appointments">
                                <i class="fas fa-calendar-check"></i>
                                <h4>تقرير المواعيد</h4>
                                <p>تحليل جدول المواعيد</p>
                            </div>
                            
                            <div class="report-card" data-report="medical">
                                <i class="fas fa-file-medical"></i>
                                <h4>تقرير طبي</h4>
                                <p>إحصائيات التشخيص والعلاج</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadReportsData();
        this.setupEventListeners();
    }

    async loadReportsData() {
        try {
            const revenueData = await this.generateRevenueReport();
            const ageData = await this.generateAgeDistribution();
            const appointmentsData = await this.generateAppointmentsReport();
            const servicesData = await this.generateServicesReport();
            
            this.renderCharts(revenueData, ageData, appointmentsData, servicesData);
            
        } catch (error) {
            console.error('خطأ في تحميل بيانات التقارير:', error);
        }
    }

    async generateRevenueReport() {
        // بيانات نموذجية - يجب استبدالها ببيانات حقيقية
        return {
            labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
            datasets: [{
                label: 'الإيرادات',
                data: [15000, 18000, 22000, 19000, 25000, 28000],
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderColor: 'rgba(52, 152, 219, 1)',
                borderWidth: 2
            }]
        };
    }

    async generateAgeDistribution() {
        return {
            labels: ['أقل من 18', '18-30', '31-45', '46-60', 'أكثر من 60'],
            datasets: [{
                data: [15, 35, 40, 25, 10],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)'
                ]
            }]
        };
    }

    async generateAppointmentsReport() {
        return {
            labels: ['مجدول', 'مؤكد', 'قيد الكشف', 'مكتمل', 'ملغى'],
            datasets: [{
                data: [25, 40, 10, 60, 5],
                backgroundColor: [
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(46, 204, 113, 0.7)',
                    'rgba(241, 196, 15, 0.7)',
                    'rgba(149, 165, 166, 0.7)',
                    'rgba(231, 76, 60, 0.7)'
                ]
            }]
        };
    }

    async generateServicesReport() {
        return {
            labels: ['كشف عام', 'كشف أخصائي', 'تحاليل', 'أشعة', 'طوارئ'],
            datasets: [{
                label: 'عدد المرات',
                data: [120, 80, 60, 40, 25],
                backgroundColor: 'rgba(52, 152, 219, 0.7)'
            }]
        };
    }

    renderCharts(revenueData, ageData, appointmentsData, servicesData) {
        // تنفيذ الرسوم البيانية باستخدام Chart.js
        this.renderLineChart('revenueChart', revenueData);
        this.renderPieChart('ageDistributionChart', ageData);
        this.renderDoughnutChart('appointmentsChart', appointmentsData);
        this.renderBarChart('servicesChart', servicesData);
    }

    renderLineChart(canvasId, data) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    }

    renderPieChart(canvasId, data) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        new Chart(ctx, {
            type: 'pie',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderDoughnutChart(canvasId, data) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderBarChart(canvasId, data) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    setupEventListeners() {
        // تغيير الفترة
        document.getElementById('periodFilter')?.addEventListener('change', (e) => {
            const customDates = document.querySelectorAll('.custom-dates');
            if (e.target.value === 'custom') {
                customDates.forEach(el => el.classList.remove('hidden'));
            } else {
                customDates.forEach(el => el.classList.add('hidden'));
            }
        });

        // تطبيق الفلاتر
        document.getElementById('applyFilters')?.addEventListener('click', () => {
            this.loadReportsData();
        });

        // تقارير مفصلة
        document.querySelectorAll('.report-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const reportType = e.currentTarget.dataset.report;
                this.showDetailedReport(reportType);
            });
        });
    }

    async showDetailedReport(reportType) {
        showNotification(`جاري إنشاء تقرير ${reportType}...`, 'info');
        // تنفيذ إنشاء التقارير المفصلة
    }
}

export default ReportsManager;
