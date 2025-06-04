const crypto = require('crypto');
const { safetyFilter } = require('./safety-filter');
const { responseValidator } = require('./response-validator');

// Activity monitoring error classes
class ActivityMonitorError extends Error {
  constructor(message, type, severity = 'medium', details = {}) {
    super(message);
    this.name = 'ActivityMonitorError';
    this.type = type;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class SuspiciousActivityAlert extends ActivityMonitorError {
  constructor(message, alertType, riskLevel, studentId, details = {}) {
    super(message, 'suspicious_activity', riskLevel, details);
    this.name = 'SuspiciousActivityAlert';
    this.alertType = alertType;
    this.studentId = studentId;
    this.riskLevel = riskLevel;
  }
}

// Suspicious activity patterns and thresholds
const ACTIVITY_PATTERNS = {
  // Safety violation patterns
  SAFETY_VIOLATIONS: {
    JAILBREAK_ATTEMPTS: {
      threshold: 3,
      timeWindow: 300000, // 5 minutes
      severity: 'high',
      escalate: true
    },
    INAPPROPRIATE_CONTENT: {
      threshold: 2,
      timeWindow: 600000, // 10 minutes
      severity: 'high',
      escalate: true
    },
    EDUCATIONAL_BYPASS: {
      threshold: 5,
      timeWindow: 900000, // 15 minutes
      severity: 'medium',
      escalate: false
    }
  },

  // Usage pattern anomalies
  USAGE_ANOMALIES: {
    EXCESSIVE_REQUESTS: {
      threshold: 50,
      timeWindow: 600000, // 10 minutes
      severity: 'medium',
      escalate: false
    },
    RAPID_FIRE_QUERIES: {
      threshold: 10,
      timeWindow: 60000, // 1 minute
      severity: 'medium',
      escalate: false
    },
    OFF_HOURS_ACTIVITY: {
      threshold: 20,
      timeWindow: 3600000, // 1 hour (during off hours)
      severity: 'low',
      escalate: false
    }
  },

  // Content pattern anomalies
  CONTENT_ANOMALIES: {
    REPEATED_VIOLATIONS: {
      threshold: 3,
      timeWindow: 1800000, // 30 minutes
      severity: 'high',
      escalate: true
    },
    ESCALATING_SEVERITY: {
      threshold: 2,
      timeWindow: 900000, // 15 minutes
      severity: 'high',
      escalate: true
    },
    CROSS_SUBJECT_ABUSE: {
      threshold: 3,
      timeWindow: 1800000, // 30 minutes
      severity: 'medium',
      escalate: false
    }
  },

  // System abuse patterns
  SYSTEM_ABUSE: {
    TOKEN_MANIPULATION: {
      threshold: 1,
      timeWindow: 0,
      severity: 'critical',
      escalate: true
    },
    SESSION_ANOMALIES: {
      threshold: 5,
      timeWindow: 300000, // 5 minutes
      severity: 'high',
      escalate: true
    },
    PRIVILEGE_ESCALATION: {
      threshold: 1,
      timeWindow: 0,
      severity: 'critical',
      escalate: true
    }
  }
};

// Risk scoring weights
const RISK_WEIGHTS = {
  safety_violation: 3.0,
  educational_violation: 2.0,
  usage_anomaly: 1.5,
  content_anomaly: 2.5,
  system_abuse: 5.0,
  repeated_offense: 1.5,
  time_factor: 0.5,
  severity_escalation: 2.0
};

class ActivityMonitor {
  constructor() {
    this.activityLog = [];
    this.suspiciousActivities = [];
    this.alertQueue = [];
    this.studentRiskProfiles = new Map();
    this.sessionTracking = new Map();
    this.patternDetectors = new Map();
    this.alertThrottling = new Map();
    
    // Initialize pattern detectors
    this.initializePatternDetectors();
    
    // Clean up old data periodically
    setInterval(() => this.cleanupOldData(), 300000); // Every 5 minutes
  }

  // Initialize pattern detection algorithms
  initializePatternDetectors() {
    this.patternDetectors.set('safety_violations', this.detectSafetyViolationPatterns.bind(this));
    this.patternDetectors.set('usage_anomalies', this.detectUsageAnomalies.bind(this));
    this.patternDetectors.set('content_anomalies', this.detectContentAnomalies.bind(this));
    this.patternDetectors.set('system_abuse', this.detectSystemAbuse.bind(this));
  }

  // Main activity logging method
  async logActivity(activity) {
    // Validate required fields
    if (!activity || typeof activity !== 'object') {
      return {
        logged: false,
        error: 'Activity must be a valid object',
        activityId: null
      };
    }

    const {
      studentId,
      sessionId,
      activityType,
      details = {},
      timestamp = new Date().toISOString(),
      severity = 'low',
      context = {}
    } = activity;

    // Validate required fields
    if (!studentId) {
      return {
        logged: false,
        error: 'studentId is required',
        activityId: null
      };
    }

    if (!sessionId) {
      return {
        logged: false,
        error: 'sessionId is required',
        activityId: null
      };
    }

    if (!activityType) {
      return {
        logged: false,
        error: 'activityType is required',
        activityId: null
      };
    }

    const activityEntry = {
      id: crypto.randomBytes(8).toString('hex'),
      studentId,
      sessionId,
      activityType,
      details,
      timestamp,
      severity,
      context,
      riskScore: 0,
      flagged: false
    };

    try {
      // Calculate initial risk score
      activityEntry.riskScore = this.calculateRiskScore(activityEntry);

      // Log the activity
      this.activityLog.push(activityEntry);

      // Update student risk profile
      this.updateStudentRiskProfile(studentId, activityEntry);

      // Update session tracking
      this.updateSessionTracking(sessionId, activityEntry);

      // Run pattern detection
      const suspiciousPatterns = await this.detectSuspiciousPatterns(studentId, activityEntry);
      
      // Check if we should generate alerts for high-risk activities even without patterns
      const shouldGenerateDirectAlert = this.shouldGenerateDirectAlert(activityEntry, suspiciousPatterns);
      
      if (suspiciousPatterns.length > 0 || shouldGenerateDirectAlert) {
        activityEntry.flagged = true;
        
        if (suspiciousPatterns.length > 0) {
          await this.handleSuspiciousActivity(studentId, suspiciousPatterns, activityEntry);
        }
        
        // Generate direct alert for high-risk activities without patterns
        if (shouldGenerateDirectAlert && suspiciousPatterns.length === 0) {
          await this.generateDirectAlert(studentId, activityEntry);
        }
      }

      // Keep log size manageable
      if (this.activityLog.length > 10000) {
        this.activityLog = this.activityLog.slice(-5000);
      }

      return {
        logged: true,
        activityId: activityEntry.id,
        riskScore: activityEntry.riskScore,
        flagged: activityEntry.flagged,
        patterns: suspiciousPatterns
      };

    } catch (error) {
      console.error('❌ Activity logging failed:', error);
      return {
        logged: false,
        error: error.message,
        activityId: null
      };
    }
  }

  // Calculate risk score for an activity
  calculateRiskScore(activity) {
    let riskScore = 0;

    // Base severity score
    const severityScores = { low: 1, medium: 3, high: 7, critical: 10 };
    riskScore += severityScores[activity.severity] || 1;

    // Activity type weight
    const typeWeights = {
      safety_violation: RISK_WEIGHTS.safety_violation,
      educational_violation: RISK_WEIGHTS.educational_violation,
      usage_anomaly: RISK_WEIGHTS.usage_anomaly,
      content_anomaly: RISK_WEIGHTS.content_anomaly,
      system_abuse: RISK_WEIGHTS.system_abuse
    };
    riskScore *= (typeWeights[activity.activityType] || 1);

    // Time factor (recent activities are more concerning)
    const timeSince = Date.now() - new Date(activity.timestamp).getTime();
    const hoursSince = timeSince / (1000 * 60 * 60);
    const timeFactor = Math.max(0.1, 1 - (hoursSince * 0.1));
    riskScore *= (1 + timeFactor * RISK_WEIGHTS.time_factor);

    // Context-specific factors
    if (activity.details.repeated) {
      riskScore *= RISK_WEIGHTS.repeated_offense;
    }
    if (activity.details.escalating) {
      riskScore *= RISK_WEIGHTS.severity_escalation;
    }

    return Math.round(riskScore * 100) / 100;
  }

  // Update student risk profile
  updateStudentRiskProfile(studentId, activity) {
    if (!this.studentRiskProfiles.has(studentId)) {
      this.studentRiskProfiles.set(studentId, {
        totalRiskScore: 0,
        activityCount: 0,
        violationCount: 0,
        lastActivity: null,
        riskLevel: 'low',
        patterns: [],
        escalationHistory: [],
        firstSeen: activity.timestamp,
        lastSeen: activity.timestamp
      });
    }

    const profile = this.studentRiskProfiles.get(studentId);
    profile.totalRiskScore += activity.riskScore;
    profile.activityCount++;
    profile.lastActivity = activity;
    profile.lastSeen = activity.timestamp;

    if (activity.flagged || activity.severity === 'high' || activity.severity === 'critical') {
      profile.violationCount++;
    }

    // Update risk level
    const avgRiskScore = profile.totalRiskScore / profile.activityCount;
    if (avgRiskScore >= 15 || profile.violationCount >= 5) {
      profile.riskLevel = 'critical';
    } else if (avgRiskScore >= 8 || profile.violationCount >= 3) {
      profile.riskLevel = 'high';
    } else if (avgRiskScore >= 4 || profile.violationCount >= 1) {
      profile.riskLevel = 'medium';
    } else {
      profile.riskLevel = 'low';
    }

    this.studentRiskProfiles.set(studentId, profile);
  }

  // Update session tracking
  updateSessionTracking(sessionId, activity) {
    if (!this.sessionTracking.has(sessionId)) {
      this.sessionTracking.set(sessionId, {
        sessionId,
        studentId: activity.studentId,
        startTime: activity.timestamp,
        lastActivity: activity.timestamp,
        activityCount: 0,
        riskScore: 0,
        violations: [],
        patterns: []
      });
    }

    const session = this.sessionTracking.get(sessionId);
    session.activityCount++;
    session.lastActivity = activity.timestamp;
    session.riskScore += activity.riskScore;

    if (activity.flagged) {
      session.violations.push(activity);
    }

    this.sessionTracking.set(sessionId, session);
  }

  // Detect suspicious patterns
  async detectSuspiciousPatterns(studentId, activity) {
    const patterns = [];

    for (const [detectorName, detector] of this.patternDetectors) {
      try {
        const detectedPatterns = await detector(studentId, activity);
        patterns.push(...detectedPatterns);
      } catch (error) {
        console.error(`❌ Pattern detector ${detectorName} failed:`, error);
      }
    }

    return patterns;
  }

  // Detect safety violation patterns
  detectSafetyViolationPatterns(studentId, activity) {
    const patterns = [];
    const recentActivities = this.getRecentActivities(studentId, 1800000); // Last 30 minutes
    
    // Check for jailbreak attempts
    const jailbreakAttempts = recentActivities.filter(a => 
      a.details.violationType === 'jailbreak' || 
      a.activityType === 'safety_violation' && a.details.type === 'jailbreak'
    );
    
    if (jailbreakAttempts.length >= ACTIVITY_PATTERNS.SAFETY_VIOLATIONS.JAILBREAK_ATTEMPTS.threshold) {
      patterns.push({
        type: 'repeated_jailbreak_attempts',
        severity: 'high',
        count: jailbreakAttempts.length,
        timeWindow: '30 minutes',
        riskLevel: 'high'
      });
    }

    // Check for inappropriate content requests
    const inappropriateContent = recentActivities.filter(a => 
      a.details.violationType === 'inappropriate_content' ||
      a.activityType === 'safety_violation' && a.details.category === 'inappropriate_content'
    );

    if (inappropriateContent.length >= ACTIVITY_PATTERNS.SAFETY_VIOLATIONS.INAPPROPRIATE_CONTENT.threshold) {
      patterns.push({
        type: 'repeated_inappropriate_requests',
        severity: 'high',
        count: inappropriateContent.length,
        timeWindow: '30 minutes',
        riskLevel: 'high'
      });
    }

    // Check for educational bypass attempts
    const educationalBypass = recentActivities.filter(a => 
      a.details.violationType === 'educational_violation' ||
      a.activityType === 'educational_violation'
    );

    if (educationalBypass.length >= ACTIVITY_PATTERNS.SAFETY_VIOLATIONS.EDUCATIONAL_BYPASS.threshold) {
      patterns.push({
        type: 'repeated_educational_bypass',
        severity: 'medium',
        count: educationalBypass.length,
        timeWindow: '30 minutes',
        riskLevel: 'medium'
      });
    }

    return patterns;
  }

  // Detect usage anomalies
  detectUsageAnomalies(studentId, activity) {
    const patterns = [];
    const recentActivities = this.getRecentActivities(studentId, 600000); // Last 10 minutes

    // Check for excessive requests
    if (recentActivities.length >= ACTIVITY_PATTERNS.USAGE_ANOMALIES.EXCESSIVE_REQUESTS.threshold) {
      patterns.push({
        type: 'excessive_requests',
        severity: 'medium',
        count: recentActivities.length,
        timeWindow: '10 minutes',
        riskLevel: 'medium'
      });
    }

    // Check for rapid-fire queries
    const lastMinuteActivities = this.getRecentActivities(studentId, 60000); // Last minute
    if (lastMinuteActivities.length >= ACTIVITY_PATTERNS.USAGE_ANOMALIES.RAPID_FIRE_QUERIES.threshold) {
      patterns.push({
        type: 'rapid_fire_queries',
        severity: 'medium',
        count: lastMinuteActivities.length,
        timeWindow: '1 minute',
        riskLevel: 'medium'
      });
    }

    // Check for off-hours activity
    const currentHour = new Date().getHours();
    const isOffHours = currentHour < 6 || currentHour > 22; // Before 6 AM or after 10 PM
    
    if (isOffHours) {
      const offHoursActivities = this.getRecentActivities(studentId, 3600000); // Last hour
      if (offHoursActivities.length >= ACTIVITY_PATTERNS.USAGE_ANOMALIES.OFF_HOURS_ACTIVITY.threshold) {
        patterns.push({
          type: 'suspicious_off_hours_activity',
          severity: 'low',
          count: offHoursActivities.length,
          timeWindow: '1 hour',
          riskLevel: 'low'
        });
      }
    }

    return patterns;
  }

  // Detect content anomalies
  detectContentAnomalies(studentId, activity) {
    const patterns = [];
    const profile = this.studentRiskProfiles.get(studentId);

    if (!profile) return patterns;

    // Check for repeated violations
    if (profile.violationCount >= ACTIVITY_PATTERNS.CONTENT_ANOMALIES.REPEATED_VIOLATIONS.threshold) {
      patterns.push({
        type: 'repeated_violations',
        severity: 'high',
        count: profile.violationCount,
        timeWindow: 'recent history',
        riskLevel: 'high'
      });
    }

    // Check for escalating severity
    const recentActivities = this.getRecentActivities(studentId, 900000); // Last 15 minutes
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    const severities = recentActivities.map(a => severityLevels[a.severity] || 1);
    
    if (severities.length >= 2) {
      const isEscalating = severities.every((sev, i) => i === 0 || sev >= severities[i-1]);
      if (isEscalating && severities[severities.length - 1] >= 3) {
        patterns.push({
          type: 'escalating_severity',
          severity: 'high',
          progression: severities,
          timeWindow: '15 minutes',
          riskLevel: 'high'
        });
      }
    }

    return patterns;
  }

  // Detect system abuse
  detectSystemAbuse(studentId, activity) {
    const patterns = [];

    // Check for authentication anomalies
    if (activity.details.authAnomaly) {
      patterns.push({
        type: 'authentication_anomaly',
        severity: 'critical',
        details: activity.details.authAnomaly,
        timeWindow: 'immediate',
        riskLevel: 'critical'
      });
    }

    // Check for privilege escalation attempts
    if (activity.details.privilegeEscalation) {
      patterns.push({
        type: 'privilege_escalation_attempt',
        severity: 'critical',
        details: activity.details.privilegeEscalation,
        timeWindow: 'immediate',
        riskLevel: 'critical'
      });
    }

    // Check for session manipulation
    if (activity.details.sessionManipulation) {
      patterns.push({
        type: 'session_manipulation',
        severity: 'high',
        details: activity.details.sessionManipulation,
        timeWindow: 'immediate',
        riskLevel: 'high'
      });
    }

    return patterns;
  }

  // Handle suspicious activity
  async handleSuspiciousActivity(studentId, patterns, activity) {
    const suspiciousActivity = {
      id: crypto.randomBytes(8).toString('hex'),
      studentId,
      timestamp: new Date().toISOString(),
      patterns,
      activity,
      riskLevel: this.calculateOverallRiskLevel(patterns),
      handled: false,
      escalated: false,
      notifications: []
    };

    this.suspiciousActivities.push(suspiciousActivity);

    // Generate alerts
    for (const pattern of patterns) {
      if (this.shouldGenerateAlert(studentId, pattern)) {
        await this.generateAlert(studentId, pattern, suspiciousActivity);
      }
    }

    // Auto-escalate critical issues
    if (suspiciousActivity.riskLevel === 'critical') {
      await this.escalateActivity(suspiciousActivity);
    }

    return suspiciousActivity;
  }

  // Calculate overall risk level from patterns
  calculateOverallRiskLevel(patterns) {
    if (patterns.some(p => p.riskLevel === 'critical')) return 'critical';
    if (patterns.some(p => p.riskLevel === 'high')) return 'high';
    if (patterns.some(p => p.riskLevel === 'medium')) return 'medium';
    return 'low';
  }

  // Check if alert should be generated (throttling)
  shouldGenerateAlert(studentId, pattern) {
    const alertKey = `${studentId}-${pattern.type}`;
    const lastAlert = this.alertThrottling.get(alertKey);
    const now = Date.now();
    
    // Throttle alerts: same pattern for same student - wait 10 minutes
    if (lastAlert && (now - lastAlert) < 600000) {
      return false;
    }
    
    this.alertThrottling.set(alertKey, now);
    return true;
  }

  // Generate alert
  async generateAlert(studentId, pattern, suspiciousActivity) {
    const alert = {
      id: crypto.randomBytes(8).toString('hex'),
      studentId,
      type: pattern.type,
      severity: pattern.severity,
      riskLevel: pattern.riskLevel,
      message: this.generateAlertMessage(pattern),
      timestamp: new Date().toISOString(),
      suspiciousActivityId: suspiciousActivity.id,
      acknowledged: false,
      assignedTo: null,
      actions: []
    };

    this.alertQueue.push(alert);
    suspiciousActivity.notifications.push(alert.id);

    // Log the alert
    console.warn(`🚨 SECURITY ALERT: ${alert.message}`);
    console.warn(`   Student: ${studentId}, Risk Level: ${alert.riskLevel}`);

    return alert;
  }

  // Generate alert message
  generateAlertMessage(pattern) {
    const messages = {
      repeated_jailbreak_attempts: `Student attempted ${pattern.count} jailbreak attacks in ${pattern.timeWindow}`,
      repeated_inappropriate_requests: `Student made ${pattern.count} inappropriate content requests in ${pattern.timeWindow}`,
      repeated_educational_bypass: `Student attempted educational bypass ${pattern.count} times in ${pattern.timeWindow}`,
      excessive_requests: `Student made ${pattern.count} requests in ${pattern.timeWindow} (unusual volume)`,
      rapid_fire_queries: `Student made ${pattern.count} rapid queries in ${pattern.timeWindow}`,
      suspicious_off_hours_activity: `Student active during off-hours: ${pattern.count} requests in ${pattern.timeWindow}`,
      repeated_violations: `Student has ${pattern.count} safety violations in recent history`,
      escalating_severity: `Student showing escalating violation severity pattern`,
      authentication_anomaly: `Authentication anomaly detected for student`,
      privilege_escalation_attempt: `Privilege escalation attempt detected`,
      session_manipulation: `Session manipulation detected`
    };

    return messages[pattern.type] || `Suspicious pattern detected: ${pattern.type}`;
  }

  // Escalate activity to administrators
  async escalateActivity(suspiciousActivity) {
    suspiciousActivity.escalated = true;
    
    console.error(`🚨 CRITICAL ALERT ESCALATED: Student ${suspiciousActivity.studentId}`);
    console.error(`   Risk Level: ${suspiciousActivity.riskLevel}`);
    console.error(`   Patterns: ${suspiciousActivity.patterns.map(p => p.type).join(', ')}`);
    
    // In a real system, this would notify administrators via email/SMS/dashboard
    return true;
  }

  // Get recent activities for a student
  getRecentActivities(studentId, timeWindow) {
    const cutoff = Date.now() - timeWindow;
    return this.activityLog.filter(activity => 
      activity.studentId === studentId && 
      new Date(activity.timestamp).getTime() > cutoff
    );
  }

  // Get student risk profile
  getStudentRiskProfile(studentId) {
    return this.studentRiskProfiles.get(studentId) || null;
  }

  // Get suspicious activities
  getSuspiciousActivities(filters = {}) {
    let activities = [...this.suspiciousActivities];

    if (filters.studentId) {
      activities = activities.filter(a => a.studentId === filters.studentId);
    }
    if (filters.riskLevel) {
      activities = activities.filter(a => a.riskLevel === filters.riskLevel);
    }
    if (filters.since) {
      const since = new Date(filters.since).getTime();
      activities = activities.filter(a => new Date(a.timestamp).getTime() > since);
    }

    return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Get alerts
  getAlerts(filters = {}) {
    let alerts = [...this.alertQueue];

    if (filters.acknowledged !== undefined) {
      alerts = alerts.filter(a => a.acknowledged === filters.acknowledged);
    }
    if (filters.severity) {
      alerts = alerts.filter(a => a.severity === filters.severity);
    }
    if (filters.studentId) {
      alerts = alerts.filter(a => a.studentId === filters.studentId);
    }

    return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  // Acknowledge alert
  acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.alertQueue.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  // Get activity statistics
  getActivityStats(timeWindow = 86400000) { // Default: last 24 hours
    const cutoff = Date.now() - timeWindow;
    const recentActivities = this.activityLog.filter(a => 
      new Date(a.timestamp).getTime() > cutoff
    );

    const stats = {
      totalActivities: recentActivities.length,
      flaggedActivities: recentActivities.filter(a => a.flagged).length,
      uniqueStudents: new Set(recentActivities.map(a => a.studentId)).size,
      riskLevels: {},
      activityTypes: {},
      averageRiskScore: 0,
      suspiciousActivities: this.suspiciousActivities.filter(a => 
        new Date(a.timestamp).getTime() > cutoff
      ).length,
      activeAlerts: this.alertQueue.filter(a => !a.acknowledged).length
    };

    // Calculate risk level distribution
    const riskLevels = { low: 0, medium: 0, high: 0, critical: 0 };
    const activityTypes = {};
    let totalRiskScore = 0;

    for (const activity of recentActivities) {
      const profile = this.studentRiskProfiles.get(activity.studentId);
      if (profile) {
        riskLevels[profile.riskLevel]++;
      }
      
      activityTypes[activity.activityType] = (activityTypes[activity.activityType] || 0) + 1;
      totalRiskScore += activity.riskScore;
    }

    stats.riskLevels = riskLevels;
    stats.activityTypes = activityTypes;
    stats.averageRiskScore = recentActivities.length > 0 ? 
      (totalRiskScore / recentActivities.length).toFixed(2) : 0;

    return stats;
  }

  // Clean up old data
  cleanupOldData() {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago

    // Clean old activity logs
    this.activityLog = this.activityLog.filter(a => 
      new Date(a.timestamp).getTime() > cutoff
    );

    // Clean old suspicious activities
    this.suspiciousActivities = this.suspiciousActivities.filter(a => 
      new Date(a.timestamp).getTime() > cutoff
    );

    // Clean old alerts
    this.alertQueue = this.alertQueue.filter(a => 
      new Date(a.timestamp).getTime() > cutoff
    );

    // Clean old sessions
    for (const [sessionId, session] of this.sessionTracking) {
      if (new Date(session.lastActivity).getTime() < cutoff) {
        this.sessionTracking.delete(sessionId);
      }
    }

    console.log('🧹 Cleaned up old monitoring data');
  }

  // Health check
  healthCheck() {
    return {
      status: 'healthy',
      monitoring: {
        activeStudents: this.studentRiskProfiles.size,
        activeSessions: this.sessionTracking.size,
        loggedActivities: this.activityLog.length,
        suspiciousActivities: this.suspiciousActivities.length,
        activeAlerts: this.alertQueue.filter(a => !a.acknowledged).length,
        patternDetectors: this.patternDetectors.size
      },
      patterns: Object.keys(ACTIVITY_PATTERNS),
      timestamp: new Date().toISOString()
    };
  }

  // Check if we should generate a direct alert for high-risk activities
  shouldGenerateDirectAlert(activity, patterns) {
    // Generate direct alerts for critical or high severity activities
    if (activity.severity === 'critical') {
      return true;
    }
    
    // Generate alerts for high-risk safety violations
    if (activity.severity === 'high' && activity.activityType === 'safety_violation') {
      return true;
    }
    
    // Generate alerts for high risk scores even without patterns
    if (activity.riskScore >= 20) {
      return true;
    }
    
    return false;
  }

  // Generate direct alert for high-risk activities
  async generateDirectAlert(studentId, activity) {
    const alert = {
      id: crypto.randomBytes(8).toString('hex'),
      studentId,
      type: 'high_risk_activity',
      severity: activity.severity,
      riskLevel: activity.severity === 'critical' ? 'critical' : 'high',
      message: `High-risk ${activity.activityType} activity detected (Risk Score: ${activity.riskScore})`,
      timestamp: new Date().toISOString(),
      activityId: activity.id,
      acknowledged: false,
      assignedTo: null,
      actions: []
    };

    this.alertQueue.push(alert);

    // Log the alert
    console.warn(`🚨 SECURITY ALERT: ${alert.message}`);
    console.warn(`   Student: ${studentId}, Risk Level: ${alert.riskLevel}`);

    return alert;
  }
}

// Export singleton instance
const activityMonitor = new ActivityMonitor();

module.exports = {
  ActivityMonitor,
  activityMonitor,
  ActivityMonitorError,
  SuspiciousActivityAlert,
  ACTIVITY_PATTERNS,
  RISK_WEIGHTS
}; 