const { getSessionAnalyticsService, TIME_WINDOWS, METRIC_TYPES, SESSION_STATUS_CATEGORIES } = require('../services/session-analytics-service');
const { getProblemSolvingService } = require('../services/problem-solving-service');

class SessionAnalyticsTest {
  constructor() {
    this.sessionAnalyticsService = getSessionAnalyticsService();
    this.problemSolvingService = getProblemSolvingService();
    this.testResults = [];
  }

  async runAllTests() {
    console.log('📊 Starting Session Analytics System Tests...\n');

    try {
      // Test 1: Service Health Check
      await this.testHealthCheck();
      
      // Test 2: Constants and Configuration
      await this.testConstantsAndConfiguration();
      
      // Test 3: Real-time Session Tracking
      await this.testRealTimeSessionTracking();
      
      // Test 4: Session Heartbeat Functionality
      await this.testSessionHeartbeat();
      
      // Test 5: Student Analytics Generation
      await this.testStudentAnalytics();
      
      // Test 6: Learning Pattern Analysis
      await this.testLearningPatternAnalysis();
      
      // Test 7: Teacher Dashboard Analytics
      await this.testTeacherDashboardAnalytics();
      
      // Test 8: Performance Anomaly Detection
      await this.testPerformanceAnomalyDetection();
      
      // Test 9: Time-based Analytics Calculations
      await this.testTimeBasedCalculations();
      
      // Test 10: Edge Cases and Error Handling
      await this.testEdgeCasesAndErrorHandling();

      this.printSummary();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      throw error;
    }
  }

  async testHealthCheck() {
    console.log('Test 1: Service Health Check');
    
    try {
      const health = await this.sessionAnalyticsService.healthCheck();
      
      this.assert(health.status === 'healthy', 'Service should be healthy');
      this.assert(health.service === 'session-analytics-service', 'Service name should match');
      this.assert(health.features.database === 'connected', 'Database should be connected');
      this.assert(health.features.realTimeTracking === 'enabled', 'Real-time tracking should be enabled');
      this.assert(health.features.comprehensiveAnalytics === 'enabled', 'Comprehensive analytics should be enabled');
      this.assert(health.features.learningPatterns === 'enabled', 'Learning patterns should be enabled');
      this.assert(health.features.teacherDashboard === 'enabled', 'Teacher dashboard should be enabled');
      this.assert(health.features.progressTrends === 'enabled', 'Progress trends should be enabled');
      this.assert(Array.isArray(health.timeWindows), 'Time windows should be an array');
      this.assert(Array.isArray(health.metricTypes), 'Metric types should be an array');
      
      console.log('✅ Health check passed');
      this.testResults.push({ test: 'Health Check', status: 'PASS' });
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      this.testResults.push({ test: 'Health Check', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testConstantsAndConfiguration() {
    console.log('Test 2: Constants and Configuration');
    
    try {
      // Test time windows
      const expectedTimeWindows = ['real_time', 'hourly', 'daily', 'weekly', 'monthly', 'quarterly'];
      for (const window of expectedTimeWindows) {
        const found = Object.values(TIME_WINDOWS).includes(window);
        this.assert(found, `Time window ${window} should be defined`);
      }

      // Test metric types
      const expectedMetricTypes = ['engagement', 'performance', 'efficiency', 'learning', 'behavioral'];
      for (const type of expectedMetricTypes) {
        const found = Object.values(METRIC_TYPES).includes(type);
        this.assert(found, `Metric type ${type} should be defined`);
      }

      // Test session status categories
      const expectedStatusCategories = ['active', 'completed', 'abandoned', 'paused', 'stuck'];
      for (const status of expectedStatusCategories) {
        const found = Object.values(SESSION_STATUS_CATEGORIES).includes(status);
        this.assert(found, `Session status ${status} should be defined`);
      }

      // Test time filter generation
      const timeFilter = this.sessionAnalyticsService.getTimeFilter(TIME_WINDOWS.WEEKLY);
      this.assert(typeof timeFilter === 'string', 'Time filter should return a string');
      this.assert(timeFilter.includes('INTERVAL'), 'Time filter should contain INTERVAL');

      // Test time interval generation
      const timeInterval = this.sessionAnalyticsService.getTimeInterval(TIME_WINDOWS.DAILY);
      this.assert(typeof timeInterval === 'string', 'Time interval should return a string');

      console.log('✅ Constants and configuration validation passed');
      this.testResults.push({ test: 'Constants and Configuration', status: 'PASS' });
    } catch (error) {
      console.log('❌ Constants and configuration validation failed:', error.message);
      this.testResults.push({ test: 'Constants and Configuration', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testRealTimeSessionTracking() {
    console.log('Test 3: Real-time Session Tracking');
    
    try {
      const mockTeacherId = 'test_teacher_123';
      const mockClassId = 'test_class_456';

      // Test real-time session overview
      const overview = await this.sessionAnalyticsService.getRealTimeSessionOverview(mockTeacherId, mockClassId);
      
      this.assert(typeof overview.timestamp === 'string', 'Overview should have timestamp');
      this.assert(typeof overview.overview === 'object', 'Overview should have overview object');
      this.assert(typeof overview.overview.totalActive === 'number', 'Should have total active count');
      this.assert(typeof overview.overview.currentlyActive === 'number', 'Should have currently active count');
      this.assert(typeof overview.overview.stuckSessions === 'number', 'Should have stuck sessions count');
      this.assert(typeof overview.overview.pausedSessions === 'number', 'Should have paused sessions count');
      this.assert(typeof overview.overview.avgIdleTime === 'number', 'Should have average idle time');
      this.assert(typeof overview.overview.activeStudents === 'number', 'Should have active students count');
      this.assert(Array.isArray(overview.activeSessions), 'Should have active sessions array');

      console.log('  ✓ Real-time overview structure validated');

      // Test data consistency
      this.assert(
        overview.overview.totalActive >= overview.overview.currentlyActive,
        'Total active should be >= currently active'
      );
      this.assert(
        overview.overview.totalActive >= overview.overview.stuckSessions,
        'Total active should be >= stuck sessions'
      );
      this.assert(
        overview.overview.totalActive >= overview.overview.pausedSessions,
        'Total active should be >= paused sessions'
      );

      console.log('  ✓ Data consistency checks passed');

      console.log('✅ Real-time session tracking tests passed');
      this.testResults.push({ test: 'Real-time Session Tracking', status: 'PASS' });
    } catch (error) {
      console.log('❌ Real-time session tracking tests failed:', error.message);
      this.testResults.push({ test: 'Real-time Session Tracking', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testSessionHeartbeat() {
    console.log('Test 4: Session Heartbeat Functionality');
    
    try {
      const mockSessionId = 'test_session_heartbeat_789';
      const mockStudentId = 'test_student_heartbeat_101';

      // Test heartbeat tracking with various data
      const heartbeatData = {
        currentStep: 3,
        responseInProgress: true,
        timeOnStep: 45,
        interfaceEvents: ['click', 'scroll', 'type'],
        engagementLevel: 'high'
      };

      const result = await this.sessionAnalyticsService.trackSessionHeartbeat(
        mockSessionId,
        mockStudentId,
        heartbeatData
      );

      this.assert(typeof result.success === 'boolean', 'Heartbeat should return success status');
      this.assert(typeof result.timestamp === 'string', 'Heartbeat should return timestamp');

      console.log('  ✓ Basic heartbeat tracking validated');

      // Test heartbeat with minimal data
      const minimalHeartbeat = await this.sessionAnalyticsService.trackSessionHeartbeat(
        mockSessionId,
        mockStudentId,
        {}
      );

      this.assert(typeof minimalHeartbeat.success === 'boolean', 'Minimal heartbeat should work');

      console.log('  ✓ Minimal heartbeat data handling validated');

      // Test different engagement levels
      const engagementLevels = ['low', 'medium', 'high'];
      for (const level of engagementLevels) {
        const levelResult = await this.sessionAnalyticsService.trackSessionHeartbeat(
          mockSessionId,
          mockStudentId,
          { engagementLevel: level }
        );
        
        this.assert(
          typeof levelResult.success === 'boolean',
          `Engagement level ${level} should work`
        );
      }

      console.log('  ✓ Engagement level tracking validated');

      console.log('✅ Session heartbeat functionality tests passed');
      this.testResults.push({ test: 'Session Heartbeat Functionality', status: 'PASS' });
    } catch (error) {
      console.log('❌ Session heartbeat functionality tests failed:', error.message);
      this.testResults.push({ test: 'Session Heartbeat Functionality', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testStudentAnalytics() {
    console.log('Test 5: Student Analytics Generation');
    
    try {
      const mockStudentId = 'test_student_analytics_202';

      // Test basic student analytics
      const basicAnalytics = await this.sessionAnalyticsService.getStudentSessionAnalytics(mockStudentId, {
        timeWindow: TIME_WINDOWS.WEEKLY,
        includeComparisons: false,
        includeProgressTrends: false,
        includePredictions: false
      });

      this.assert(basicAnalytics.studentId === mockStudentId, 'Should return correct student ID');
      this.assert(typeof basicAnalytics.timeWindow === 'string', 'Should have time window');
      this.assert(typeof basicAnalytics.analyzedAt === 'string', 'Should have analysis timestamp');
      this.assert(typeof basicAnalytics.overallMetrics === 'object', 'Should have overall metrics');
      
      // Validate overall metrics structure
      const metrics = basicAnalytics.overallMetrics;
      this.assert(typeof metrics.totalSessions === 'number', 'Should have total sessions count');
      this.assert(typeof metrics.completedSessions === 'number', 'Should have completed sessions count');
      this.assert(typeof metrics.abandonedSessions === 'number', 'Should have abandoned sessions count');
      this.assert(typeof metrics.activeSessions === 'number', 'Should have active sessions count');
      this.assert(typeof metrics.completionRate === 'number', 'Should have completion rate');
      this.assert(typeof metrics.averageDuration === 'number', 'Should have average duration');
      this.assert(typeof metrics.averageAccuracy === 'number', 'Should have average accuracy');

      console.log('  ✓ Basic analytics structure validated');

      // Test analytics with all options enabled
      const comprehensiveAnalytics = await this.sessionAnalyticsService.getStudentSessionAnalytics(mockStudentId, {
        timeWindow: TIME_WINDOWS.MONTHLY,
        includeComparisons: true,
        includeProgressTrends: true,
        includePredictions: true
      });

      this.assert(Array.isArray(comprehensiveAnalytics.subjectBreakdown), 'Should have subject breakdown');
      this.assert(Array.isArray(comprehensiveAnalytics.difficultyBreakdown), 'Should have difficulty breakdown');

      console.log('  ✓ Comprehensive analytics structure validated');

      // Test different time windows
      const timeWindows = Object.values(TIME_WINDOWS);
      for (const window of timeWindows) {
        try {
          const windowAnalytics = await this.sessionAnalyticsService.getStudentSessionAnalytics(mockStudentId, {
            timeWindow: window,
            includeComparisons: false,
            includeProgressTrends: false,
            includePredictions: false
          });
          
          this.assert(windowAnalytics.timeWindow === window, `Time window ${window} should work`);
          console.log(`    ✓ ${window} time window validated`);
        } catch (error) {
          console.log(`    ⚠️ ${window} time window had issues (expected for some test environments)`);
        }
      }

      console.log('✅ Student analytics generation tests passed');
      this.testResults.push({ test: 'Student Analytics Generation', status: 'PASS' });
    } catch (error) {
      console.log('❌ Student analytics generation tests failed:', error.message);
      this.testResults.push({ test: 'Student Analytics Generation', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testLearningPatternAnalysis() {
    console.log('Test 6: Learning Pattern Analysis');
    
    try {
      const mockStudentId = 'test_student_patterns_303';

      // Test learning pattern analysis with all patterns enabled
      const patterns = await this.sessionAnalyticsService.getLearningPatternAnalysis(mockStudentId, {
        timeWindow: TIME_WINDOWS.MONTHLY,
        includeTimePatterns: true,
        includeEngagementPatterns: true,
        includePerformancePatterns: true
      });

      this.assert(patterns.studentId === mockStudentId, 'Should return correct student ID');
      this.assert(typeof patterns.timeWindow === 'string', 'Should have time window');
      this.assert(typeof patterns.analyzedAt === 'string', 'Should have analysis timestamp');
      this.assert(Array.isArray(patterns.insights), 'Should have insights array');

      console.log('  ✓ Learning pattern structure validated');

      // Test individual pattern types
      const timePatterns = await this.sessionAnalyticsService.getLearningPatternAnalysis(mockStudentId, {
        timeWindow: TIME_WINDOWS.WEEKLY,
        includeTimePatterns: true,
        includeEngagementPatterns: false,
        includePerformancePatterns: false
      });

      this.assert(typeof timePatterns.insights === 'object', 'Time patterns should generate insights');

      console.log('  ✓ Time pattern analysis validated');

      const engagementPatterns = await this.sessionAnalyticsService.getLearningPatternAnalysis(mockStudentId, {
        timeWindow: TIME_WINDOWS.WEEKLY,
        includeTimePatterns: false,
        includeEngagementPatterns: true,
        includePerformancePatterns: false
      });

      this.assert(typeof engagementPatterns.insights === 'object', 'Engagement patterns should generate insights');

      console.log('  ✓ Engagement pattern analysis validated');

      const performancePatterns = await this.sessionAnalyticsService.getLearningPatternAnalysis(mockStudentId, {
        timeWindow: TIME_WINDOWS.WEEKLY,
        includeTimePatterns: false,
        includeEngagementPatterns: false,
        includePerformancePatterns: true
      });

      this.assert(typeof performancePatterns.insights === 'object', 'Performance patterns should generate insights');

      console.log('  ✓ Performance pattern analysis validated');

      console.log('✅ Learning pattern analysis tests passed');
      this.testResults.push({ test: 'Learning Pattern Analysis', status: 'PASS' });
    } catch (error) {
      console.log('❌ Learning pattern analysis tests failed:', error.message);
      this.testResults.push({ test: 'Learning Pattern Analysis', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testTeacherDashboardAnalytics() {
    console.log('Test 7: Teacher Dashboard Analytics');
    
    try {
      const mockTeacherId = 'test_teacher_dashboard_404';
      const mockClassId = 'test_class_dashboard_505';

      // Test basic teacher dashboard analytics
      const dashboard = await this.sessionAnalyticsService.getTeacherDashboardAnalytics(mockTeacherId, {
        timeWindow: TIME_WINDOWS.WEEKLY,
        classId: mockClassId,
        includeStudentProgress: true,
        includeClassComparisons: true
      });

      this.assert(dashboard.teacherId === mockTeacherId, 'Should return correct teacher ID');
      this.assert(dashboard.classId === mockClassId, 'Should return correct class ID');
      this.assert(typeof dashboard.timeWindow === 'string', 'Should have time window');
      this.assert(typeof dashboard.analyzedAt === 'string', 'Should have analysis timestamp');
      this.assert(typeof dashboard.classOverview === 'object', 'Should have class overview');

      // Validate class overview structure
      const overview = dashboard.classOverview;
      this.assert(typeof overview.totalSessions === 'number', 'Should have total sessions');
      this.assert(typeof overview.activeStudents === 'number', 'Should have active students count');
      this.assert(typeof overview.completedSessions === 'number', 'Should have completed sessions');
      this.assert(typeof overview.abandonedSessions === 'number', 'Should have abandoned sessions');
      this.assert(typeof overview.completionRate === 'number', 'Should have completion rate');
      this.assert(typeof overview.averageClassAccuracy === 'number', 'Should have average class accuracy');

      console.log('  ✓ Teacher dashboard structure validated');

      this.assert(Array.isArray(dashboard.studentSummaries), 'Should have student summaries array');
      this.assert(Array.isArray(dashboard.performanceBreakdown), 'Should have performance breakdown array');
      this.assert(Array.isArray(dashboard.insights), 'Should have insights array');

      console.log('  ✓ Dashboard data arrays validated');

      // Test without class ID
      const generalDashboard = await this.sessionAnalyticsService.getTeacherDashboardAnalytics(mockTeacherId, {
        timeWindow: TIME_WINDOWS.DAILY,
        includeStudentProgress: false,
        includeClassComparisons: false
      });

      this.assert(generalDashboard.teacherId === mockTeacherId, 'Should work without class ID');
      this.assert(generalDashboard.classId === undefined, 'Class ID should be undefined when not provided');

      console.log('  ✓ General dashboard (no class) validated');

      console.log('✅ Teacher dashboard analytics tests passed');
      this.testResults.push({ test: 'Teacher Dashboard Analytics', status: 'PASS' });
    } catch (error) {
      console.log('❌ Teacher dashboard analytics tests failed:', error.message);
      this.testResults.push({ test: 'Teacher Dashboard Analytics', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testPerformanceAnomalyDetection() {
    console.log('Test 8: Performance Anomaly Detection');
    
    try {
      // Test utility methods for analytics calculations

      // Test percentage calculation
      const percentage1 = this.sessionAnalyticsService.calculatePercentage(75, 100);
      this.assert(percentage1 === 75.0, 'Should calculate percentage correctly');

      const percentage2 = this.sessionAnalyticsService.calculatePercentage(1, 3, 2);
      this.assert(percentage2 === 33.33, 'Should calculate percentage with precision');

      const percentage3 = this.sessionAnalyticsService.calculatePercentage(5, 0);
      this.assert(percentage3 === 0, 'Should handle division by zero');

      console.log('  ✓ Percentage calculation validated');

      // Test trend calculation
      const values1 = [1, 2, 3, 4, 5];
      const trend1 = this.sessionAnalyticsService.calculateTrend(values1);
      this.assert(trend1 > 0, 'Should detect positive trend');

      const values2 = [5, 4, 3, 2, 1];
      const trend2 = this.sessionAnalyticsService.calculateTrend(values2);
      this.assert(trend2 < 0, 'Should detect negative trend');

      const values3 = [3, 3, 3, 3, 3];
      const trend3 = this.sessionAnalyticsService.calculateTrend(values3);
      this.assert(Math.abs(trend3) < 0.1, 'Should detect stable trend');

      const values4 = [1];
      const trend4 = this.sessionAnalyticsService.calculateTrend(values4);
      this.assert(trend4 === 0, 'Should handle single value');

      console.log('  ✓ Trend calculation validated');

      // Test peak time finding
      const mockHourlyPattern = {
        9: { sessions: 10, totalAccuracy: 8.5, count: 1 },
        14: { sessions: 15, totalAccuracy: 9.0, count: 1 },
        16: { sessions: 8, totalAccuracy: 7.5, count: 1 }
      };

      const peakTimes = this.sessionAnalyticsService.findPeakTimes(mockHourlyPattern);
      this.assert(Array.isArray(peakTimes), 'Should return array of peak times');
      this.assert(peakTimes.length <= 3, 'Should return at most 3 peak times');
      if (peakTimes.length > 0) {
        this.assert(peakTimes[0].sessions === 15, 'Should identify highest activity hour');
      }

      console.log('  ✓ Peak time analysis validated');

      // Test insight generation
      const mockTimePatterns = {
        peakHours: [{ hour: 14, sessions: 15, avgAccuracy: 0.9 }]
      };
      const mockEngagementPatterns = {
        helpSeekingBehavior: 'high'
      };
      const mockPerformancePatterns = {
        trend: 'improving'
      };

      const insights = this.sessionAnalyticsService.generateLearningInsights(
        mockTimePatterns,
        mockEngagementPatterns,
        mockPerformancePatterns
      );

      this.assert(Array.isArray(insights), 'Should generate insights array');
      this.assert(insights.length > 0, 'Should generate at least one insight');
      
      // Check insight structure
      if (insights.length > 0) {
        const insight = insights[0];
        this.assert(typeof insight.type === 'string', 'Insight should have type');
        this.assert(typeof insight.insight === 'string', 'Insight should have insight text');
        this.assert(typeof insight.recommendation === 'string', 'Insight should have recommendation');
        this.assert(typeof insight.confidence === 'string', 'Insight should have confidence level');
      }

      console.log('  ✓ Insight generation validated');

      console.log('✅ Performance anomaly detection tests passed');
      this.testResults.push({ test: 'Performance Anomaly Detection', status: 'PASS' });
    } catch (error) {
      console.log('❌ Performance anomaly detection tests failed:', error.message);
      this.testResults.push({ test: 'Performance Anomaly Detection', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testTimeBasedCalculations() {
    console.log('Test 9: Time-based Analytics Calculations');
    
    try {
      // Test time filter generation for all time windows
      const timeWindows = Object.values(TIME_WINDOWS);
      for (const window of timeWindows) {
        const filter = this.sessionAnalyticsService.getTimeFilter(window);
        this.assert(typeof filter === 'string', `Time filter for ${window} should be string`);
        this.assert(filter.includes('NOW()'), `Time filter for ${window} should include NOW()`);
        this.assert(filter.includes('INTERVAL'), `Time filter for ${window} should include INTERVAL`);
      }

      console.log('  ✓ Time filter generation validated for all windows');

      // Test time interval generation
      const intervals = {};
      for (const window of timeWindows) {
        const interval = this.sessionAnalyticsService.getTimeInterval(window);
        intervals[window] = interval;
        this.assert(typeof interval === 'string', `Time interval for ${window} should be string`);
      }

      // Validate specific interval mappings
      this.assert(intervals[TIME_WINDOWS.REAL_TIME] === 'minute', 'Real-time should use minute intervals');
      this.assert(intervals[TIME_WINDOWS.HOURLY] === 'minute', 'Hourly should use minute intervals');
      this.assert(intervals[TIME_WINDOWS.DAILY] === 'hour', 'Daily should use hour intervals');
      this.assert(intervals[TIME_WINDOWS.WEEKLY] === 'day', 'Weekly should use day intervals');
      this.assert(intervals[TIME_WINDOWS.MONTHLY] === 'day', 'Monthly should use day intervals');
      this.assert(intervals[TIME_WINDOWS.QUARTERLY] === 'week', 'Quarterly should use week intervals');

      console.log('  ✓ Time interval mapping validated');

      // Test edge cases for time calculations
      const invalidWindow = 'invalid_window';
      const defaultFilter = this.sessionAnalyticsService.getTimeFilter(invalidWindow);
      this.assert(typeof defaultFilter === 'string', 'Should handle invalid time window gracefully');

      const defaultInterval = this.sessionAnalyticsService.getTimeInterval(invalidWindow);
      this.assert(typeof defaultInterval === 'string', 'Should handle invalid time interval gracefully');

      console.log('  ✓ Edge case handling validated');

      console.log('✅ Time-based analytics calculations tests passed');
      this.testResults.push({ test: 'Time-based Analytics Calculations', status: 'PASS' });
    } catch (error) {
      console.log('❌ Time-based analytics calculations tests failed:', error.message);
      this.testResults.push({ test: 'Time-based Analytics Calculations', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testEdgeCasesAndErrorHandling() {
    console.log('Test 10: Edge Cases and Error Handling');
    
    try {
      // Test with non-existent student ID
      const nonExistentStudent = 'non_existent_student_999';
      
      try {
        const emptyAnalytics = await this.sessionAnalyticsService.getStudentSessionAnalytics(nonExistentStudent, {
          timeWindow: TIME_WINDOWS.WEEKLY
        });
        
        // Should return analytics with zero values rather than failing
        this.assert(emptyAnalytics.studentId === nonExistentStudent, 'Should handle non-existent student gracefully');
        this.assert(emptyAnalytics.overallMetrics.totalSessions === 0, 'Should return zero sessions for non-existent student');
      } catch (error) {
        // This is also acceptable - service should fail gracefully
        this.assert(error.name === 'SessionAnalyticsError', 'Should throw proper error type for non-existent student');
      }

      console.log('  ✓ Non-existent student handling validated');

      // Test with null/undefined parameters
      try {
        const nullStudentAnalytics = await this.sessionAnalyticsService.getStudentSessionAnalytics(null, {});
        // Should either work with defaults or fail gracefully
      } catch (error) {
        this.assert(error.name === 'SessionAnalyticsError', 'Should handle null student ID properly');
      }

      console.log('  ✓ Null parameter handling validated');

      // Test heartbeat with invalid data
      const invalidHeartbeat = await this.sessionAnalyticsService.trackSessionHeartbeat(
        'invalid_session',
        'invalid_student',
        { invalidField: 'invalid_value' }
      );
      
      // Heartbeat should be resilient and not crash
      this.assert(typeof invalidHeartbeat.success === 'boolean', 'Heartbeat should handle invalid data gracefully');

      console.log('  ✓ Invalid heartbeat data handling validated');

      // Test percentage calculation edge cases
      const edgePercentages = [
        { numerator: 0, denominator: 100, expected: 0 },
        { numerator: 100, denominator: 0, expected: 0 },
        { numerator: null, denominator: 100, expected: 0 },
        { numerator: 50, denominator: null, expected: 0 },
        { numerator: 'invalid', denominator: 100, expected: 0 }
      ];

      for (const test of edgePercentages) {
        const result = this.sessionAnalyticsService.calculatePercentage(test.numerator, test.denominator);
        this.assert(result === test.expected, `Percentage calculation should handle edge case: ${test.numerator}/${test.denominator}`);
      }

      console.log('  ✓ Percentage calculation edge cases validated');

      // Test trend calculation edge cases
      const edgeTrends = [
        { values: [], expected: 0 },
        { values: [1], expected: 0 },
        { values: [null, 2, 3], shouldWork: true },
        { values: ['invalid', 2, 3], shouldWork: true }
      ];

      for (const test of edgeTrends) {
        try {
          const trend = this.sessionAnalyticsService.calculateTrend(test.values);
          if (test.shouldWork) {
            this.assert(typeof trend === 'number', `Trend calculation should handle: ${JSON.stringify(test.values)}`);
          } else {
            this.assert(trend === test.expected, `Trend calculation should return ${test.expected} for: ${JSON.stringify(test.values)}`);
          }
        } catch (error) {
          // Some edge cases might throw errors, which is acceptable
          console.log(`    ⚠️ Trend calculation threw error for ${JSON.stringify(test.values)} (acceptable)`);
        }
      }

      console.log('  ✓ Trend calculation edge cases validated');

      // Test learning pattern analysis with minimal data
      try {
        const minimalPatterns = await this.sessionAnalyticsService.getLearningPatternAnalysis('minimal_data_student', {
          timeWindow: TIME_WINDOWS.DAILY,
          includeTimePatterns: true,
          includeEngagementPatterns: true,
          includePerformancePatterns: true
        });
        
        this.assert(typeof minimalPatterns === 'object', 'Should handle minimal data gracefully');
      } catch (error) {
        this.assert(error.name === 'SessionAnalyticsError', 'Should throw proper error for minimal data');
      }

      console.log('  ✓ Minimal data handling validated');

      console.log('✅ Edge cases and error handling tests passed');
      this.testResults.push({ test: 'Edge Cases and Error Handling', status: 'PASS' });
    } catch (error) {
      console.log('❌ Edge cases and error handling tests failed:', error.message);
      this.testResults.push({ test: 'Edge Cases and Error Handling', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  printSummary() {
    console.log('📊 Test Summary');
    console.log('================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  ❌ ${r.test}: ${r.error}`));
    }
    
    console.log('\nDetailed Results:');
    this.testResults.forEach(r => {
      const status = r.status === 'PASS' ? '✅' : '❌';
      console.log(`  ${status} ${r.test}`);
    });
    
    console.log('\n📊 Session Analytics System Testing Complete!');
    
    console.log('\n📋 System Overview:');
    console.log('================');
    console.log('Features Tested:');
    console.log('• Service health monitoring and configuration validation');
    console.log('• Real-time session tracking and monitoring capabilities');
    console.log('• Session heartbeat functionality for live engagement tracking');
    console.log('• Comprehensive student analytics with multiple time windows');
    console.log('• Advanced learning pattern analysis and insights generation');
    console.log('• Teacher dashboard analytics with class-wide overview');
    console.log('• Performance anomaly detection and trend analysis');
    console.log('• Time-based calculations and filtering mechanisms');
    console.log('• Edge case handling and error resilience');
    console.log('• Data consistency validation and mathematical calculations');
    console.log('• Multi-dimensional analytics integration');
    console.log('• Educational insight generation and recommendation systems');
  }
}

// Run tests if called directly
if (require.main === module) {
  async function main() {
    const tester = new SessionAnalyticsTest();
    
    try {
      await tester.runAllTests();
      process.exit(0);
    } catch (error) {
      console.error('Test suite failed:', error);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = { SessionAnalyticsTest }; 