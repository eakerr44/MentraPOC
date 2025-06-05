const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { roleCheck } = require('../middleware/role-check');
const { getProblemSolvingService } = require('../services/problem-solving-service');
const { getJournalStorageService } = require('../services/journal-storage-service');
const { getProgressAnalyzer } = require('../services/progress-analyzer');
const { getEmotionalIntelligenceAnalyzer } = require('../services/emotional-intelligence-analyzer');
const { getSessionAnalyticsService } = require('../services/session-analytics-service');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

class DashboardError extends Error {
  constructor(message, type = 'DASHBOARD_ERROR') {
    super(message);
    this.type = type;
    this.name = 'DashboardError';
  }
}

// Student Dashboard Data Endpoints
// GET /api/dashboard/student/overview - Main dashboard overview
router.get('/student/overview', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const userId = req.user.id;
    const timeframe = req.query.timeframe || '30d'; // 7d, 30d, 90d, all
    
    // Development mode: Return mock data for demo tokens
    if (process.env.NODE_ENV === 'development' && userId === 'demo-user-1') {
      console.log('🎯 Returning mock dashboard data for demo user');
      
      return res.json({
        student: {
          id: 'demo-user-1',
          name: 'Demo User',
          username: 'demo',
          gradeLevel: '8th',
          currentStreak: 7,
          totalPoints: 1250,
          memberSince: '2024-01-15T00:00:00Z',
          learningPreferences: { visual: true, kinesthetic: false, auditory: true }
        },
        activitySummary: {
          totalActivities: 45,
          weeklyGrowth: 15,
          journalEntries: 12,
          problemsSolved: 8,
          goalsCompleted: 3
        },
        learningInsights: {
          topStrengths: ['Creative Writing', 'Pattern Recognition'],
          growthAreas: ['Math Problem Solving', 'Time Management'],
          recommendations: ['Try daily math practice', 'Set smaller goals']
        },
        goalProgress: {
          activeGoals: 4,
          completedGoals: 2,
          totalProgress: 65
        },
        recentAchievements: [
          { id: 1, title: 'Week Warrior', description: '7-day streak!', earnedAt: '2024-01-20' },
          { id: 2, title: 'Journal Master', description: '10 journal entries', earnedAt: '2024-01-18' }
        ],
        upcomingReminders: [
          { id: 1, title: 'Math homework due', date: '2024-01-25' },
          { id: 2, title: 'Science project presentation', date: '2024-01-27' }
        ],
        timeframe: timeframe
      });
    }
    
    // Production code continues...
    const studentQuery = `
      SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.created_at,
             s.grade_level, s.learning_preferences, s.goals, s.current_streak, s.total_points
      FROM users u
      LEFT JOIN students s ON u.id = s.user_id
      WHERE u.id = $1 AND u.role = 'student'
    `;
    const studentResult = await pool.query(studentQuery, [userId]);
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const student = studentResult.rows[0];
    
    // Get activity summary
    const activityData = await getActivitySummary(userId, timeframe);
    const learningInsights = await getLearningInsights(userId, timeframe);
    const goalProgress = await getGoalProgress(userId);
    const recentAchievements = await getRecentAchievements(userId, 5);
    const upcomingReminders = await getUpcomingReminders(userId, 3);
    
    res.json({
      student: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        username: student.username,
        gradeLevel: student.grade_level,
        currentStreak: student.current_streak || 0,
        totalPoints: student.total_points || 0,
        memberSince: student.created_at,
        learningPreferences: student.learning_preferences || {}
      },
      activitySummary: activityData,
      learningInsights: learningInsights,
      goalProgress: goalProgress,
      recentAchievements: recentAchievements,
      upcomingReminders: upcomingReminders,
      timeframe: timeframe
    });
    
  } catch (error) {
    console.error('Error fetching student dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard overview' });
  }
});

// GET /api/dashboard/student/learning-insights - Detailed learning analytics
router.get('/student/learning-insights', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const userId = req.user.id;
    const timeframe = req.query.timeframe || '30d';
    const category = req.query.category; // 'journal', 'problems', 'emotional', 'all'
    
    const progressAnalyzer = getProgressAnalyzer();
    const insights = await progressAnalyzer.generateStudentInsights(userId, {
      timeframe: timeframe,
      category: category,
      includeProjections: true,
      includeComparisons: false // Student view doesn't include peer comparisons
    });
    
    res.json(insights);
    
  } catch (error) {
    console.error('Error fetching learning insights:', error);
    res.status(500).json({ error: 'Failed to fetch learning insights' });
  }
});

// GET /api/dashboard/student/goals - Goal tracking and management
router.get('/student/goals', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const userId = req.user.id;
    const status = req.query.status; // 'active', 'completed', 'paused', 'all'
    
    const goalsQuery = `
      SELECT g.*, 
             COUNT(gm.id) as total_milestones,
             COUNT(CASE WHEN gm.completed_at IS NOT NULL THEN 1 END) as completed_milestones,
             CASE 
               WHEN COUNT(gm.id) > 0 THEN 
                 (COUNT(CASE WHEN gm.completed_at IS NOT NULL THEN 1 END)::float / COUNT(gm.id)::float) * 100
               ELSE 0 
             END as progress_percentage
      FROM student_goals g
      LEFT JOIN goal_milestones gm ON g.id = gm.goal_id
      WHERE g.student_id = $1 
        ${status && status !== 'all' ? 'AND g.status = $2' : ''}
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `;
    
    const params = status && status !== 'all' ? [userId, status] : [userId];
    const goalsResult = await pool.query(goalsQuery, params);
    
    // Get recent goal activities
    const activitiesQuery = `
      SELECT ga.*, g.title as goal_title
      FROM goal_activities ga
      JOIN student_goals g ON ga.goal_id = g.id
      WHERE g.student_id = $1
      ORDER BY ga.created_at DESC
      LIMIT 10
    `;
    const activitiesResult = await pool.query(activitiesQuery, [userId]);
    
    res.json({
      goals: goalsResult.rows,
      recentActivities: activitiesResult.rows,
      summary: {
        total: goalsResult.rows.length,
        active: goalsResult.rows.filter(g => g.status === 'active').length,
        completed: goalsResult.rows.filter(g => g.status === 'completed').length,
        averageProgress: goalsResult.rows.reduce((acc, g) => acc + g.progress_percentage, 0) / goalsResult.rows.length || 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching student goals:', error);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// POST /api/dashboard/student/goals - Create new goal
router.post('/student/goals', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, category, targetDate, milestones, priority } = req.body;
    
    if (!title || !description || !category) {
      return res.status(400).json({ error: 'Title, description, and category are required' });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create the goal
      const goalQuery = `
        INSERT INTO student_goals (student_id, title, description, category, target_date, priority, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING *
      `;
      const goalResult = await client.query(goalQuery, [
        userId, title, description, category, targetDate, priority || 'medium'
      ]);
      
      const goalId = goalResult.rows[0].id;
      
      // Create milestones if provided
      if (milestones && milestones.length > 0) {
        for (const milestone of milestones) {
          const milestoneQuery = `
            INSERT INTO goal_milestones (goal_id, title, description, target_date, order_index)
            VALUES ($1, $2, $3, $4, $5)
          `;
          await client.query(milestoneQuery, [
            goalId, milestone.title, milestone.description, milestone.targetDate, milestone.order || 0
          ]);
        }
      }
      
      // Log goal creation activity
      const activityQuery = `
        INSERT INTO goal_activities (goal_id, activity_type, description)
        VALUES ($1, 'created', 'Goal created')
      `;
      await client.query(activityQuery, [goalId]);
      
      await client.query('COMMIT');
      
      res.status(201).json({
        message: 'Goal created successfully',
        goal: goalResult.rows[0]
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error creating student goal:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// PUT /api/dashboard/student/goals/:goalId - Update goal
router.put('/student/goals/:goalId', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const userId = req.user.id;
    const goalId = req.params.goalId;
    const updates = req.body;
    
    // Verify goal ownership
    const ownershipQuery = `
      SELECT id FROM student_goals WHERE id = $1 AND student_id = $2
    `;
    const ownershipResult = await pool.query(ownershipQuery, [goalId, userId]);
    
    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found or access denied' });
    }
    
    // Build update query dynamically
    const allowedFields = ['title', 'description', 'category', 'target_date', 'priority', 'status'];
    const updateFields = Object.keys(updates).filter(field => allowedFields.includes(field));
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const setClause = updateFields.map((field, index) => `${field} = $${index + 3}`).join(', ');
    const values = [goalId, userId, ...updateFields.map(field => updates[field])];
    
    const updateQuery = `
      UPDATE student_goals 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND student_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, values);
    
    // Log update activity
    const activityQuery = `
      INSERT INTO goal_activities (goal_id, activity_type, description)
      VALUES ($1, 'updated', $2)
    `;
    const activityDescription = `Goal updated: ${updateFields.join(', ')}`;
    await pool.query(activityQuery, [goalId, activityDescription]);
    
    res.json({
      message: 'Goal updated successfully',
      goal: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating student goal:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// GET /api/dashboard/student/progress - Progress tracking and metrics
router.get('/student/progress', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const userId = req.user.id;
    const timeframe = req.query.timeframe || '30d';
    const metric = req.query.metric; // 'journal', 'problems', 'emotional', 'overall'
    
    const progressAnalyzer = getProgressAnalyzer();
    const progressData = await progressAnalyzer.getStudentProgress(userId, {
      timeframe: timeframe,
      metrics: metric ? [metric] : ['journal', 'problems', 'emotional', 'overall'],
      includeProjections: true,
      includeTrends: true
    });
    
    res.json(progressData);
    
  } catch (error) {
    console.error('Error fetching student progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress data' });
  }
});

// GET /api/dashboard/student/achievements - Achievements and milestones
router.get('/student/achievements', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const userId = req.user.id;
    const category = req.query.category; // 'learning', 'streak', 'goal', 'social', 'all'
    const limit = parseInt(req.query.limit) || 20;
    
    const achievementsQuery = `
      SELECT a.*, ac.name as category_name, ac.description as category_description
      FROM student_achievements a
      JOIN achievement_categories ac ON a.category = ac.id
      WHERE a.student_id = $1
        ${category && category !== 'all' ? 'AND a.category = $2' : ''}
      ORDER BY a.earned_at DESC
      LIMIT $${category && category !== 'all' ? '3' : '2'}
    `;
    
    const params = category && category !== 'all' ? [userId, category, limit] : [userId, limit];
    const achievementsResult = await pool.query(achievementsQuery, params);
    
    // Get achievement statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_achievements,
        COUNT(CASE WHEN earned_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_achievements,
        COUNT(DISTINCT category) as categories_completed
      FROM student_achievements
      WHERE student_id = $1
    `;
    const statsResult = await pool.query(statsQuery, [userId]);
    
    res.json({
      achievements: achievementsResult.rows,
      statistics: statsResult.rows[0],
      categories: await getAchievementCategories()
    });
    
  } catch (error) {
    console.error('Error fetching student achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// GET /api/dashboard/student/activity-feed - Recent activity feed
router.get('/student/activity-feed', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 15;
    const offset = parseInt(req.query.offset) || 0;
    
    const activityQuery = `
      (
        SELECT 'journal' as type, je.id, je.title, je.created_at, 
               json_build_object('mood', je.mood, 'tags', je.tags) as metadata
        FROM journal_entries je
        WHERE je.user_id = $1
      )
      UNION ALL
      (
        SELECT 'problem' as type, ps.id, pt.title, ps.created_at,
               json_build_object('status', ps.status, 'difficulty', pt.difficulty_level) as metadata
        FROM problem_sessions ps
        JOIN problem_templates pt ON ps.template_id = pt.id
        WHERE ps.student_id = $1
      )
      UNION ALL
      (
        SELECT 'goal' as type, ga.goal_id, ga.description, ga.created_at,
               json_build_object('activity_type', ga.activity_type) as metadata
        FROM goal_activities ga
        JOIN student_goals sg ON ga.goal_id = sg.id
        WHERE sg.student_id = $1
      )
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(activityQuery, [userId, limit, offset]);
    
    res.json({
      activities: result.rows,
      pagination: {
        limit: limit,
        offset: offset,
        hasMore: result.rows.length === limit
      }
    });
    
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

// Teacher Dashboard Data Endpoints
// GET /api/dashboard/teacher/overview - Teacher dashboard overview with class-wide data
router.get('/teacher/overview', authenticateJWT, roleCheck(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const timeframe = req.query.timeframe || '30d';
    
    // Get teacher info and assigned classes
    const teacherQuery = `
      SELECT u.id, u.username, u.first_name, u.last_name, u.created_at,
             t.subject_areas, t.grade_levels_taught, t.school_id
      FROM users u
      JOIN teachers t ON u.id = t.user_id
      WHERE u.id = $1 AND u.role = 'teacher'
    `;
    const teacherResult = await pool.query(teacherQuery, [teacherId]);
    
    if (teacherResult.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    const teacher = teacherResult.rows[0];
    
    // Get students assigned to this teacher
    const studentsQuery = `
      SELECT s.user_id, u.first_name, u.last_name, u.username, s.grade_level,
             s.current_streak, s.total_points, s.last_activity_date
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN teacher_student_assignments tsa ON s.user_id = tsa.student_id
      WHERE tsa.teacher_id = $1 AND tsa.status = 'active'
      ORDER BY u.last_name, u.first_name
    `;
    const studentsResult = await pool.query(studentsQuery, [teacherId]);
    const students = studentsResult.rows;
    
    // Get class-wide analytics
    const classAnalytics = await getClassAnalytics(teacherId, timeframe);
    const studentProgress = await getStudentProgressSummary(teacherId, timeframe);
    const classInsights = await getClassInsights(teacherId, timeframe);
    const recentActivities = await getClassRecentActivities(teacherId, 10);
    const alertsAndConcerns = await getStudentAlerts(teacherId);
    
    res.json({
      teacher: {
        id: teacher.id,
        name: `${teacher.first_name} ${teacher.last_name}`,
        username: teacher.username,
        subjectAreas: teacher.subject_areas || [],
        gradeLevels: teacher.grade_levels_taught || [],
        schoolId: teacher.school_id,
        memberSince: teacher.created_at
      },
      classOverview: {
        totalStudents: students.length,
        activeStudents: students.filter(s => s.last_activity_date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
        averageStreak: students.reduce((acc, s) => acc + (s.current_streak || 0), 0) / students.length || 0,
        totalPoints: students.reduce((acc, s) => acc + (s.total_points || 0), 0)
      },
      students: students,
      classAnalytics: classAnalytics,
      studentProgress: studentProgress,
      classInsights: classInsights,
      recentActivities: recentActivities,
      alertsAndConcerns: alertsAndConcerns,
      timeframe: timeframe
    });
    
  } catch (error) {
    console.error('Error fetching teacher dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch teacher dashboard overview' });
  }
});

// GET /api/dashboard/teacher/class-analytics - Detailed class analytics
router.get('/teacher/class-analytics', authenticateJWT, roleCheck(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const timeframe = req.query.timeframe || '30d';
    const metric = req.query.metric; // 'engagement', 'progress', 'performance', 'all'
    
    const analytics = await getDetailedClassAnalytics(teacherId, {
      timeframe: timeframe,
      metrics: metric ? [metric] : ['engagement', 'progress', 'performance', 'emotional'],
      includeComparisons: true,
      includeTrends: true
    });
    
    res.json(analytics);
    
  } catch (error) {
    console.error('Error fetching class analytics:', error);
    res.status(500).json({ error: 'Failed to fetch class analytics' });
  }
});

// GET /api/dashboard/teacher/student/:studentId - Individual student detailed view
router.get('/teacher/student/:studentId', authenticateJWT, roleCheck(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const studentId = req.params.studentId;
    const timeframe = req.query.timeframe || '30d';
    
    // Verify teacher has access to this student
    const accessQuery = `
      SELECT tsa.* 
      FROM teacher_student_assignments tsa
      WHERE tsa.teacher_id = $1 AND tsa.student_id = $2 AND tsa.status = 'active'
    `;
    const accessResult = await pool.query(accessQuery, [teacherId, studentId]);
    
    if (accessResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this student' });
    }
    
    // Get detailed student information for teacher view
    const studentData = await getStudentDetailedView(studentId, timeframe, true); // includeTeacherView = true
    
    res.json(studentData);
    
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ error: 'Failed to fetch student details' });
  }
});

// GET /api/dashboard/teacher/patterns - Class learning patterns and insights
router.get('/teacher/patterns', authenticateJWT, roleCheck(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const timeframe = req.query.timeframe || '30d';
    const analysisType = req.query.type; // 'learning_styles', 'performance_patterns', 'engagement', 'all'
    
    const patterns = await analyzeClassPatterns(teacherId, {
      timeframe: timeframe,
      analysisTypes: analysisType ? [analysisType] : ['learning_styles', 'performance_patterns', 'engagement'],
      includeRecommendations: true,
      includeInterventions: true
    });
    
    res.json(patterns);
    
  } catch (error) {
    console.error('Error analyzing class patterns:', error);
    res.status(500).json({ error: 'Failed to analyze class patterns' });
  }
});

// GET /api/dashboard/teacher/interventions - Student intervention recommendations
router.get('/teacher/interventions', authenticateJWT, roleCheck(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const priority = req.query.priority; // 'high', 'medium', 'low', 'all'
    const category = req.query.category; // 'academic', 'engagement', 'emotional', 'behavioral'
    
    const interventions = await getTeacherInterventions(teacherId, {
      priority: priority,
      category: category,
      includeActionPlans: true,
      includeResources: true
    });
    
    res.json(interventions);
    
  } catch (error) {
    console.error('Error fetching interventions:', error);
    res.status(500).json({ error: 'Failed to fetch interventions' });
  }
});

// POST /api/dashboard/teacher/interventions - Create intervention plan
router.post('/teacher/interventions', authenticateJWT, roleCheck(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { studentId, category, priority, description, actionPlan, targetDate } = req.body;
    
    if (!studentId || !category || !description) {
      return res.status(400).json({ error: 'Student ID, category, and description are required' });
    }
    
    // Verify teacher has access to this student
    const accessQuery = `
      SELECT tsa.* 
      FROM teacher_student_assignments tsa
      WHERE tsa.teacher_id = $1 AND tsa.student_id = $2 AND tsa.status = 'active'
    `;
    const accessResult = await pool.query(accessQuery, [teacherId, studentId]);
    
    if (accessResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this student' });
    }
    
    const interventionQuery = `
      INSERT INTO teacher_interventions (teacher_id, student_id, category, priority, description, action_plan, target_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING *
    `;
    
    const result = await pool.query(interventionQuery, [
      teacherId, studentId, category, priority || 'medium', description, actionPlan, targetDate
    ]);
    
    res.status(201).json({
      message: 'Intervention plan created successfully',
      intervention: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error creating intervention:', error);
    res.status(500).json({ error: 'Failed to create intervention plan' });
  }
});

// GET /api/dashboard/teacher/reports - Generate class reports
router.get('/teacher/reports', authenticateJWT, roleCheck(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const reportType = req.query.type || 'weekly'; // 'daily', 'weekly', 'monthly', 'custom'
    const format = req.query.format || 'summary'; // 'summary', 'detailed', 'export'
    const timeframe = req.query.timeframe || '7d';
    
    const report = await generateClassReport(teacherId, {
      reportType: reportType,
      format: format,
      timeframe: timeframe,
      includeStudentDetails: true,
      includeRecommendations: true
    });
    
    res.json(report);
    
  } catch (error) {
    console.error('Error generating class report:', error);
    res.status(500).json({ error: 'Failed to generate class report' });
  }
});

// PUT /api/dashboard/teacher/student/:studentId/notes - Add teacher notes for student
router.put('/teacher/student/:studentId/notes', authenticateJWT, roleCheck(['teacher']), async (req, res) => {
  try {
    const teacherId = req.user.id;
    const studentId = req.params.studentId;
    const { note, category, isPrivate } = req.body;
    
    if (!note) {
      return res.status(400).json({ error: 'Note content is required' });
    }
    
    // Verify teacher has access to this student
    const accessQuery = `
      SELECT tsa.* 
      FROM teacher_student_assignments tsa
      WHERE tsa.teacher_id = $1 AND tsa.student_id = $2 AND tsa.status = 'active'
    `;
    const accessResult = await pool.query(accessQuery, [teacherId, studentId]);
    
    if (accessResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this student' });
    }
    
    const noteQuery = `
      INSERT INTO teacher_student_notes (teacher_id, student_id, note_content, category, is_private)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await pool.query(noteQuery, [
      teacherId, studentId, note, category || 'general', isPrivate || false
    ]);
    
    res.json({
      message: 'Note added successfully',
      note: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error adding teacher note:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// Parent Dashboard Data Endpoints
// GET /api/dashboard/parent/overview - Parent dashboard overview with children's progress
router.get('/parent/overview', authenticateJWT, roleCheck(['parent']), async (req, res) => {
  try {
    const parentId = req.user.id;
    const timeframe = req.query.timeframe || '7d'; // Parents typically view weekly summaries
    
    // Get parent info and children
    const parentQuery = `
      SELECT u.id, u.username, u.first_name, u.last_name, u.created_at,
             p.contact_preferences, p.notification_settings
      FROM users u
      JOIN parents p ON u.id = p.user_id
      WHERE u.id = $1 AND u.role = 'parent'
    `;
    const parentResult = await pool.query(parentQuery, [parentId]);
    
    if (parentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Parent not found' });
    }
    
    const parent = parentResult.rows[0];
    
    // Get children assigned to this parent
    const childrenQuery = `
      SELECT s.user_id, u.first_name, u.last_name, u.username, s.grade_level,
             s.current_streak, s.total_points, s.last_activity_date, s.best_streak,
             pc.relationship_type, pc.primary_contact
      FROM students s
      JOIN users u ON s.user_id = u.id
      JOIN parent_child_relationships pc ON s.user_id = pc.child_id
      WHERE pc.parent_id = $1 AND pc.status = 'active'
      ORDER BY pc.primary_contact DESC, u.first_name, u.last_name
    `;
    const childrenResult = await pool.query(childrenQuery, [parentId]);
    const children = childrenResult.rows;
    
    // Get family-wide analytics
    const familyAnalytics = await getFamilyAnalytics(parentId, timeframe);
    const childrenProgress = await getChildrenProgressSummary(parentId, timeframe);
    const familyInsights = await getFamilyLearningInsights(parentId, timeframe);
    const weeklyHighlights = await getWeeklyHighlights(parentId);
    const teacherCommunications = await getRecentTeacherCommunications(parentId, 5);
    const upcomingEvents = await getUpcomingFamilyEvents(parentId);
    
    res.json({
      parent: {
        id: parent.id,
        name: `${parent.first_name} ${parent.last_name}`,
        username: parent.username,
        contactPreferences: parent.contact_preferences || {},
        notificationSettings: parent.notification_settings || {},
        memberSince: parent.created_at
      },
      familyOverview: {
        totalChildren: children.length,
        activeChildren: children.filter(c => c.last_activity_date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
        totalPoints: children.reduce((acc, c) => acc + (c.total_points || 0), 0),
        averageStreak: children.reduce((acc, c) => acc + (c.current_streak || 0), 0) / children.length || 0
      },
      children: children,
      familyAnalytics: familyAnalytics,
      childrenProgress: childrenProgress,
      familyInsights: familyInsights,
      weeklyHighlights: weeklyHighlights,
      teacherCommunications: teacherCommunications,
      upcomingEvents: upcomingEvents,
      timeframe: timeframe
    });
    
  } catch (error) {
    console.error('Error fetching parent dashboard overview:', error);
    res.status(500).json({ error: 'Failed to fetch parent dashboard overview' });
  }
});

// GET /api/dashboard/parent/child/:childId - Detailed view of specific child
router.get('/parent/child/:childId', authenticateJWT, roleCheck(['parent']), async (req, res) => {
  try {
    const parentId = req.user.id;
    const childId = req.params.childId;
    const timeframe = req.query.timeframe || '30d';
    
    // Verify parent has access to this child
    const accessQuery = `
      SELECT pcr.* 
      FROM parent_child_relationships pcr
      WHERE pcr.parent_id = $1 AND pcr.child_id = $2 AND pcr.status = 'active'
    `;
    const accessResult = await pool.query(accessQuery, [parentId, childId]);
    
    if (accessResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this child' });
    }
    
    // Get detailed child information for parent view
    const childData = await getChildDetailedView(childId, timeframe, true); // includeParentView = true
    
    res.json(childData);
    
  } catch (error) {
    console.error('Error fetching child details:', error);
    res.status(500).json({ error: 'Failed to fetch child details' });
  }
});

// GET /api/dashboard/parent/weekly-summary - Weekly learning summary for all children
router.get('/parent/weekly-summary', authenticateJWT, roleCheck(['parent']), async (req, res) => {
  try {
    const parentId = req.user.id;
    const weekOffset = parseInt(req.query.weekOffset) || 0; // 0 = current week, -1 = last week, etc.
    
    const weeklySummary = await generateWeeklySummary(parentId, weekOffset);
    
    res.json(weeklySummary);
    
  } catch (error) {
    console.error('Error generating weekly summary:', error);
    res.status(500).json({ error: 'Failed to generate weekly summary' });
  }
});

// GET /api/dashboard/parent/engagement-metrics - Detailed engagement metrics for children
router.get('/parent/engagement-metrics', authenticateJWT, roleCheck(['parent']), async (req, res) => {
  try {
    const parentId = req.user.id;
    const timeframe = req.query.timeframe || '30d';
    const childId = req.query.childId; // Optional: filter by specific child
    
    const engagementMetrics = await getEngagementMetrics(parentId, {
      timeframe: timeframe,
      childId: childId,
      includeComparisons: true,
      includeTrends: true,
      includeRecommendations: true
    });
    
    res.json(engagementMetrics);
    
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    res.status(500).json({ error: 'Failed to fetch engagement metrics' });
  }
});

// GET /api/dashboard/parent/teacher-communications - Communication history with teachers
router.get('/parent/teacher-communications', authenticateJWT, roleCheck(['parent']), async (req, res) => {
  try {
    const parentId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const childId = req.query.childId; // Optional: filter by child
    
    const communications = await getTeacherCommunications(parentId, {
      limit: limit,
      offset: offset,
      childId: childId,
      includeUnread: true
    });
    
    res.json(communications);
    
  } catch (error) {
    console.error('Error fetching teacher communications:', error);
    res.status(500).json({ error: 'Failed to fetch communications' });
  }
});

// POST /api/dashboard/parent/communication - Send message to teacher
router.post('/parent/communication', authenticateJWT, roleCheck(['parent']), async (req, res) => {
  try {
    const parentId = req.user.id;
    const { teacherId, childId, subject, message, priority } = req.body;
    
    if (!teacherId || !childId || !subject || !message) {
      return res.status(400).json({ error: 'Teacher ID, child ID, subject, and message are required' });
    }
    
    // Verify parent has access to this child and teacher relationship exists
    const relationshipQuery = `
      SELECT tsa.teacher_id, pcr.parent_id
      FROM teacher_student_assignments tsa
      JOIN parent_child_relationships pcr ON tsa.student_id = pcr.child_id
      WHERE pcr.parent_id = $1 AND pcr.child_id = $2 AND tsa.teacher_id = $3
        AND pcr.status = 'active' AND tsa.status = 'active'
    `;
    const relationshipResult = await pool.query(relationshipQuery, [parentId, childId, teacherId]);
    
    if (relationshipResult.rows.length === 0) {
      return res.status(403).json({ error: 'Invalid teacher-parent-child relationship' });
    }
    
    const communicationQuery = `
      INSERT INTO teacher_communication_log (teacher_id, student_id, parent_id, 
                                           communication_type, subject, content, direction, 
                                           status, importance)
      VALUES ($1, $2, $3, 'message', $4, $5, 'incoming', 'delivered', $6)
      RETURNING *
    `;
    
    const result = await pool.query(communicationQuery, [
      teacherId, childId, parentId, subject, message, priority || 'normal'
    ]);
    
    res.status(201).json({
      message: 'Message sent successfully',
      communication: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error sending communication:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/dashboard/parent/learning-tips - Personalized learning tips for home support
router.get('/parent/learning-tips', authenticateJWT, roleCheck(['parent']), async (req, res) => {
  try {
    const parentId = req.user.id;
    const childId = req.query.childId; // Optional: tips for specific child
    
    const learningTips = await generateLearningTips(parentId, {
      childId: childId,
      includeResources: true,
      includeActivities: true,
      personalizeByAge: true
    });
    
    res.json(learningTips);
    
  } catch (error) {
    console.error('Error generating learning tips:', error);
    res.status(500).json({ error: 'Failed to generate learning tips' });
  }
});

// PUT /api/dashboard/parent/preferences - Update parent dashboard preferences
router.put('/parent/preferences', authenticateJWT, roleCheck(['parent']), async (req, res) => {
  try {
    const parentId = req.user.id;
    const { notificationSettings, reportFrequency, communicationPreferences } = req.body;
    
    const updateQuery = `
      UPDATE parent_dashboard_preferences 
      SET notification_settings = COALESCE($2, notification_settings),
          report_frequency = COALESCE($3, report_frequency),
          communication_preferences = COALESCE($4, communication_preferences),
          updated_at = CURRENT_TIMESTAMP
      WHERE parent_id = $1
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [
      parentId, 
      notificationSettings ? JSON.stringify(notificationSettings) : null,
      reportFrequency,
      communicationPreferences ? JSON.stringify(communicationPreferences) : null
    ]);
    
    if (result.rows.length === 0) {
      // Create preferences if they don't exist
      const insertQuery = `
        INSERT INTO parent_dashboard_preferences (parent_id, notification_settings, report_frequency, communication_preferences)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const insertResult = await pool.query(insertQuery, [
        parentId,
        JSON.stringify(notificationSettings || {}),
        reportFrequency || 'weekly',
        JSON.stringify(communicationPreferences || {})
      ]);
      
      return res.json({
        message: 'Preferences created successfully',
        preferences: insertResult.rows[0]
      });
    }
    
    res.json({
      message: 'Preferences updated successfully',
      preferences: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating parent preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Helper functions
async function getActivitySummary(userId, timeframe) {
  const timeCondition = getTimeCondition(timeframe);
  
  const query = `
    SELECT 
      (SELECT COUNT(*) FROM journal_entries WHERE user_id = $1 ${timeCondition}) as journal_entries,
      (SELECT COUNT(*) FROM problem_sessions WHERE student_id = $1 ${timeCondition}) as problem_sessions,
      (SELECT COUNT(*) FROM student_achievements WHERE student_id = $1 ${timeCondition}) as new_achievements,
      (SELECT COALESCE(MAX(current_streak), 0) FROM students WHERE user_id = $1) as current_streak
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows[0];
}

async function getLearningInsights(userId, timeframe) {
  try {
    const progressAnalyzer = getProgressAnalyzer();
    const insights = await progressAnalyzer.generateInsights(userId, {
      timeframe: timeframe,
      focusAreas: ['learning_patterns', 'emotional_growth', 'problem_solving'],
      studentView: true
    });
    
    return {
      topStrengths: insights.strengths?.slice(0, 3) || [],
      growthAreas: insights.growthAreas?.slice(0, 3) || [],
      recommendations: insights.recommendations?.slice(0, 5) || [],
      overallTrend: insights.overallTrend || 'stable'
    };
  } catch (error) {
    console.error('Error generating learning insights:', error);
    return {
      topStrengths: [],
      growthAreas: [],
      recommendations: [],
      overallTrend: 'stable'
    };
  }
}

async function getGoalProgress(userId) {
  const query = `
    SELECT 
      COUNT(*) as total_goals,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_goals,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_goals,
      COALESCE(AVG(
        CASE WHEN status = 'active' THEN 
          (SELECT COUNT(*) FROM goal_milestones gm WHERE gm.goal_id = sg.id AND gm.completed_at IS NOT NULL) * 100.0 / 
          NULLIF((SELECT COUNT(*) FROM goal_milestones gm WHERE gm.goal_id = sg.id), 0)
        END
      ), 0) as average_progress
    FROM student_goals sg
    WHERE sg.student_id = $1
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows[0];
}

async function getRecentAchievements(userId, limit) {
  const query = `
    SELECT sa.*, ac.name as category_name, ac.icon
    FROM student_achievements sa
    JOIN achievement_categories ac ON sa.category = ac.id
    WHERE sa.student_id = $1
    ORDER BY sa.earned_at DESC
    LIMIT $2
  `;
  
  const result = await pool.query(query, [userId, limit]);
  return result.rows;
}

async function getUpcomingReminders(userId, limit) {
  const query = `
    SELECT 'goal_deadline' as type, sg.title, sg.target_date as due_date, sg.id
    FROM student_goals sg
    WHERE sg.student_id = $1 
      AND sg.status = 'active' 
      AND sg.target_date > CURRENT_DATE 
      AND sg.target_date <= CURRENT_DATE + INTERVAL '7 days'
    ORDER BY sg.target_date ASC
    LIMIT $2
  `;
  
  const result = await pool.query(query, [userId, limit]);
  return result.rows;
}

async function getAchievementCategories() {
  const query = `SELECT * FROM achievement_categories ORDER BY name`;
  const result = await pool.query(query);
  return result.rows;
}

function getTimeCondition(timeframe) {
  switch (timeframe) {
    case '7d':
      return 'AND created_at >= CURRENT_DATE - INTERVAL \'7 days\'';
    case '30d':
      return 'AND created_at >= CURRENT_DATE - INTERVAL \'30 days\'';
    case '90d':
      return 'AND created_at >= CURRENT_DATE - INTERVAL \'90 days\'';
    default:
      return '';
  }
}

// Helper functions for teacher dashboard
async function getClassAnalytics(teacherId, timeframe) {
  const timeCondition = getTimeCondition(timeframe);
  
  const query = `
    SELECT 
      COUNT(DISTINCT s.user_id) as total_students,
      COALESCE(AVG(s.current_streak), 0) as avg_streak,
      COALESCE(SUM(s.total_points), 0) as total_class_points,
      COUNT(DISTINCT CASE WHEN je.created_at IS NOT NULL THEN s.user_id END) as students_journaling,
      COUNT(DISTINCT CASE WHEN ps.created_at IS NOT NULL THEN s.user_id END) as students_problem_solving,
      COUNT(DISTINCT je.id) as total_journal_entries,
      COUNT(DISTINCT ps.id) as total_problem_sessions
    FROM students s
    JOIN teacher_student_assignments tsa ON s.user_id = tsa.student_id
    LEFT JOIN journal_entries je ON s.user_id = je.user_id ${timeCondition.replace('created_at', 'je.created_at')}
    LEFT JOIN problem_sessions ps ON s.user_id = ps.student_id ${timeCondition.replace('created_at', 'ps.created_at')}
    WHERE tsa.teacher_id = $1 AND tsa.status = 'active'
  `;
  
  const result = await pool.query(query, [teacherId]);
  return result.rows[0];
}

async function getStudentProgressSummary(teacherId, timeframe) {
  const query = `
    SELECT 
      s.user_id,
      u.first_name,
      u.last_name,
      s.current_streak,
      s.total_points,
      s.grade_level,
      COUNT(DISTINCT je.id) as journal_entries,
      COUNT(DISTINCT ps.id) as problem_sessions,
      COUNT(DISTINCT sa.id) as achievements,
      COALESCE(AVG(CASE WHEN ps.status = 'completed' THEN 
        CASE ps.performance_rating 
          WHEN 'excellent' THEN 5
          WHEN 'good' THEN 4  
          WHEN 'average' THEN 3
          WHEN 'needs_improvement' THEN 2
          ELSE 1
        END
      END), 0) as avg_performance
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN teacher_student_assignments tsa ON s.user_id = tsa.student_id
    LEFT JOIN journal_entries je ON s.user_id = je.user_id ${getTimeCondition(timeframe).replace('created_at', 'je.created_at')}
    LEFT JOIN problem_sessions ps ON s.user_id = ps.student_id ${getTimeCondition(timeframe).replace('created_at', 'ps.created_at')}
    LEFT JOIN student_achievements sa ON s.user_id = sa.student_id ${getTimeCondition(timeframe).replace('created_at', 'sa.earned_at')}
    WHERE tsa.teacher_id = $1 AND tsa.status = 'active'
    GROUP BY s.user_id, u.first_name, u.last_name, s.current_streak, s.total_points, s.grade_level
    ORDER BY u.last_name, u.first_name
  `;
  
  const result = await pool.query(query, [teacherId]);
  return result.rows;
}

async function getClassInsights(teacherId, timeframe) {
  try {
    // Get insights from progress analyzer with teacher context
    const progressAnalyzer = getProgressAnalyzer();
    const insights = await progressAnalyzer.generateClassInsights(teacherId, {
      timeframe: timeframe,
      includeStudentComparisons: true,
      includeRecommendations: true,
      focusAreas: ['engagement', 'learning_patterns', 'performance_trends']
    });
    
    return insights;
  } catch (error) {
    console.error('Error generating class insights:', error);
    return {
      engagementTrends: [],
      learningPatterns: [],
      performanceTrends: [],
      recommendations: []
    };
  }
}

async function getClassRecentActivities(teacherId, limit) {
  const query = `
    (
      SELECT 'journal' as type, je.id, je.title, je.created_at, 
             u.first_name || ' ' || u.last_name as student_name, s.user_id as student_id,
             json_build_object('mood', je.mood, 'tags', je.tags) as metadata
      FROM journal_entries je
      JOIN students s ON je.user_id = s.user_id
      JOIN users u ON s.user_id = u.id
      JOIN teacher_student_assignments tsa ON s.user_id = tsa.student_id
      WHERE tsa.teacher_id = $1 AND tsa.status = 'active'
    )
    UNION ALL
    (
      SELECT 'problem' as type, ps.id, pt.title, ps.created_at,
             u.first_name || ' ' || u.last_name as student_name, s.user_id as student_id,
             json_build_object('status', ps.status, 'difficulty', pt.difficulty_level) as metadata
      FROM problem_sessions ps
      JOIN problem_templates pt ON ps.template_id = pt.id
      JOIN students s ON ps.student_id = s.user_id
      JOIN users u ON s.user_id = u.id
      JOIN teacher_student_assignments tsa ON s.user_id = tsa.student_id
      WHERE tsa.teacher_id = $1 AND tsa.status = 'active'
    )
    UNION ALL
    (
      SELECT 'achievement' as type, sa.id, sa.title, sa.earned_at as created_at,
             u.first_name || ' ' || u.last_name as student_name, s.user_id as student_id,
             json_build_object('category', sa.category, 'points', sa.points_earned) as metadata
      FROM student_achievements sa
      JOIN students s ON sa.student_id = s.user_id
      JOIN users u ON s.user_id = u.id
      JOIN teacher_student_assignments tsa ON s.user_id = tsa.student_id
      WHERE tsa.teacher_id = $1 AND tsa.status = 'active'
    )
    ORDER BY created_at DESC
    LIMIT $2
  `;
  
  const result = await pool.query(query, [teacherId, limit]);
  return result.rows;
}

async function getStudentAlerts(teacherId) {
  const query = `
    SELECT 
      s.user_id,
      u.first_name || ' ' || u.last_name as student_name,
      CASE 
        WHEN s.current_streak = 0 THEN 'No recent activity'
        WHEN s.last_activity_date < CURRENT_DATE - INTERVAL '3 days' THEN 'Inactive for 3+ days'
        WHEN s.current_streak < 3 AND s.best_streak > 7 THEN 'Significant streak drop'
        ELSE NULL
      END as alert_type,
      CASE 
        WHEN s.current_streak = 0 THEN 'high'
        WHEN s.last_activity_date < CURRENT_DATE - INTERVAL '3 days' THEN 'medium'
        WHEN s.current_streak < 3 AND s.best_streak > 7 THEN 'medium'
        ELSE 'low'
      END as priority,
      s.last_activity_date,
      s.current_streak,
      s.best_streak
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN teacher_student_assignments tsa ON s.user_id = tsa.student_id
    WHERE tsa.teacher_id = $1 AND tsa.status = 'active'
      AND (
        s.current_streak = 0 OR
        s.last_activity_date < CURRENT_DATE - INTERVAL '3 days' OR
        (s.current_streak < 3 AND s.best_streak > 7)
      )
    ORDER BY 
      CASE 
        WHEN s.current_streak = 0 THEN 1
        WHEN s.last_activity_date < CURRENT_DATE - INTERVAL '3 days' THEN 2
        ELSE 3
      END,
      s.last_activity_date ASC
  `;
  
  const result = await pool.query(query, [teacherId]);
  return result.rows;
}

async function getDetailedClassAnalytics(teacherId, options) {
  // This would integrate with existing analytics services
  try {
    const progressAnalyzer = getProgressAnalyzer();
    const analytics = await progressAnalyzer.getClassAnalytics(teacherId, options);
    return analytics;
  } catch (error) {
    console.error('Error generating detailed class analytics:', error);
    return { metrics: [], charts: [], trends: {} };
  }
}

async function getStudentDetailedView(studentId, timeframe, includeTeacherView = false) {
  // Reuse student overview logic but with teacher permissions
  const overview = await getActivitySummary(studentId, timeframe);
  const insights = await getLearningInsights(studentId, timeframe);
  const goals = await getGoalProgress(studentId);
  const achievements = await getRecentAchievements(studentId, 10);
  
  if (includeTeacherView) {
    // Add teacher-specific data
    const teacherNotesQuery = `
      SELECT tsn.*, u.first_name || ' ' || u.last_name as teacher_name
      FROM teacher_student_notes tsn
      JOIN users u ON tsn.teacher_id = u.id
      WHERE tsn.student_id = $1
      ORDER BY tsn.created_at DESC
      LIMIT 10
    `;
    const notesResult = await pool.query(teacherNotesQuery, [studentId]);
    
    return {
      overview,
      insights,
      goals,
      achievements,
      teacherNotes: notesResult.rows,
      detailedMetrics: await getStudentDetailedMetrics(studentId, timeframe)
    };
  }
  
  return { overview, insights, goals, achievements };
}

async function getStudentDetailedMetrics(studentId, timeframe) {
  const timeCondition = getTimeCondition(timeframe);
  
  const query = `
    SELECT 
      -- Journal metrics
      COUNT(DISTINCT je.id) as journal_entries,
      COALESCE(AVG(LENGTH(je.content)), 0) as avg_journal_length,
      COUNT(DISTINCT je.mood) as mood_variety,
      
      -- Problem solving metrics  
      COUNT(DISTINCT ps.id) as problem_sessions,
      COUNT(DISTINCT CASE WHEN ps.status = 'completed' THEN ps.id END) as completed_problems,
      COALESCE(AVG(ps.time_spent), 0) as avg_time_per_problem,
      
      -- Engagement metrics
      COUNT(DISTINCT DATE(je.created_at)) as active_journal_days,
      COUNT(DISTINCT DATE(ps.created_at)) as active_problem_days,
      
      -- Achievement metrics
      COUNT(DISTINCT sa.id) as achievements_earned,
      COALESCE(SUM(sa.points_earned), 0) as points_from_achievements
      
    FROM users u
    LEFT JOIN journal_entries je ON u.id = je.user_id ${timeCondition.replace('created_at', 'je.created_at')}
    LEFT JOIN problem_sessions ps ON u.id = ps.student_id ${timeCondition.replace('created_at', 'ps.created_at')}
    LEFT JOIN student_achievements sa ON u.id = sa.student_id ${timeCondition.replace('created_at', 'sa.earned_at')}
    WHERE u.id = $1
  `;
  
  const result = await pool.query(query, [studentId]);
  return result.rows[0];
}

async function analyzeClassPatterns(teacherId, options) {
  // This would use advanced analytics to identify learning patterns
  try {
    const progressAnalyzer = getProgressAnalyzer();
    const patterns = await progressAnalyzer.analyzeClassPatterns(teacherId, options);
    return patterns;
  } catch (error) {
    console.error('Error analyzing class patterns:', error);
    return { patterns: [], insights: [], recommendations: [] };
  }
}

async function getTeacherInterventions(teacherId, options) {
  const conditions = ['ti.teacher_id = $1'];
  const params = [teacherId];
  let paramCount = 1;
  
  if (options.priority && options.priority !== 'all') {
    paramCount++;
    conditions.push(`ti.priority = $${paramCount}`);
    params.push(options.priority);
  }
  
  if (options.category) {
    paramCount++;
    conditions.push(`ti.category = $${paramCount}`);
    params.push(options.category);
  }
  
  const query = `
    SELECT ti.*, 
           u.first_name || ' ' || u.last_name as student_name,
           s.grade_level
    FROM teacher_interventions ti
    JOIN students s ON ti.student_id = s.user_id
    JOIN users u ON s.user_id = u.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY 
      CASE ti.priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
      END,
      ti.created_at DESC
  `;
  
  const result = await pool.query(query, params);
  return result.rows;
}

async function generateClassReport(teacherId, options) {
  // Generate comprehensive class report
  const classAnalytics = await getClassAnalytics(teacherId, options.timeframe);
  const studentProgress = await getStudentProgressSummary(teacherId, options.timeframe);
  const classInsights = await getClassInsights(teacherId, options.timeframe);
  
  return {
    reportType: options.reportType,
    generatedAt: new Date().toISOString(),
    timeframe: options.timeframe,
    summary: classAnalytics,
    studentDetails: options.includeStudentDetails ? studentProgress : null,
    insights: classInsights,
    recommendations: options.includeRecommendations ? await getClassRecommendations(teacherId) : null
  };
}

async function getClassRecommendations(teacherId) {
  // Generate actionable recommendations for the teacher
  return [
    {
      type: 'engagement',
      priority: 'high',
      title: 'Increase student engagement',
      description: 'Consider implementing more interactive problem-solving activities',
      actionItems: ['Schedule collaborative sessions', 'Introduce gamification elements']
    }
  ];
}

// Helper functions for parent dashboard
async function getFamilyAnalytics(parentId, timeframe) {
  const timeCondition = getTimeCondition(timeframe);
  
  const query = `
    SELECT 
      COUNT(DISTINCT s.user_id) as total_children,
      COALESCE(AVG(s.current_streak), 0) as avg_family_streak,
      COALESCE(SUM(s.total_points), 0) as total_family_points,
      COUNT(DISTINCT CASE WHEN je.created_at IS NOT NULL THEN s.user_id END) as children_journaling,
      COUNT(DISTINCT CASE WHEN ps.created_at IS NOT NULL THEN s.user_id END) as children_problem_solving,
      COUNT(DISTINCT je.id) as total_journal_entries,
      COUNT(DISTINCT ps.id) as total_problem_sessions,
      COUNT(DISTINCT sa.id) as total_achievements
    FROM students s
    JOIN parent_child_relationships pcr ON s.user_id = pcr.child_id
    LEFT JOIN journal_entries je ON s.user_id = je.user_id ${timeCondition.replace('created_at', 'je.created_at')}
    LEFT JOIN problem_sessions ps ON s.user_id = ps.student_id ${timeCondition.replace('created_at', 'ps.created_at')}
    LEFT JOIN student_achievements sa ON s.user_id = sa.student_id ${timeCondition.replace('created_at', 'sa.earned_at')}
    WHERE pcr.parent_id = $1 AND pcr.status = 'active'
  `;
  
  const result = await pool.query(query, [parentId]);
  return result.rows[0];
}

async function getChildrenProgressSummary(parentId, timeframe) {
  const query = `
    SELECT 
      s.user_id,
      u.first_name,
      u.last_name,
      s.current_streak,
      s.total_points,
      s.grade_level,
      s.last_activity_date,
      pcr.relationship_type,
      COUNT(DISTINCT je.id) as journal_entries,
      COUNT(DISTINCT ps.id) as problem_sessions,
      COUNT(DISTINCT sa.id) as achievements,
      COALESCE(AVG(CASE WHEN ps.status = 'completed' THEN 
        CASE ps.performance_rating 
          WHEN 'excellent' THEN 5
          WHEN 'good' THEN 4  
          WHEN 'average' THEN 3
          WHEN 'needs_improvement' THEN 2
          ELSE 1
        END
      END), 0) as avg_performance
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN parent_child_relationships pcr ON s.user_id = pcr.child_id
    LEFT JOIN journal_entries je ON s.user_id = je.user_id ${getTimeCondition(timeframe).replace('created_at', 'je.created_at')}
    LEFT JOIN problem_sessions ps ON s.user_id = ps.student_id ${getTimeCondition(timeframe).replace('created_at', 'ps.created_at')}
    LEFT JOIN student_achievements sa ON s.user_id = sa.student_id ${getTimeCondition(timeframe).replace('created_at', 'sa.earned_at')}
    WHERE pcr.parent_id = $1 AND pcr.status = 'active'
    GROUP BY s.user_id, u.first_name, u.last_name, s.current_streak, s.total_points, s.grade_level, s.last_activity_date, pcr.relationship_type
    ORDER BY u.first_name, u.last_name
  `;
  
  const result = await pool.query(query, [parentId]);
  return result.rows;
}

async function getFamilyLearningInsights(parentId, timeframe) {
  try {
    // Get insights from progress analyzer with family context
    const progressAnalyzer = getProgressAnalyzer();
    const insights = await progressAnalyzer.generateFamilyInsights(parentId, {
      timeframe: timeframe,
      includeHomeLearningTips: true,
      includeMotivationalStrategies: true,
      focusAreas: ['engagement', 'consistency', 'emotional_growth', 'academic_progress']
    });
    
    return insights;
  } catch (error) {
    console.error('Error generating family insights:', error);
    return {
      strengths: [],
      growthAreas: [],
      homeLearningTips: [],
      motivationalStrategies: [],
      celebrationMoments: []
    };
  }
}

async function getWeeklyHighlights(parentId) {
  const query = `
    SELECT 
      'achievement' as type,
      sa.title,
      sa.description,
      sa.earned_at as date,
      u.first_name || ' ' || u.last_name as child_name,
      sa.points_earned,
      sa.category
    FROM student_achievements sa
    JOIN students s ON sa.student_id = s.user_id
    JOIN users u ON s.user_id = u.id
    JOIN parent_child_relationships pcr ON s.user_id = pcr.child_id
    WHERE pcr.parent_id = $1 AND pcr.status = 'active'
      AND sa.earned_at >= CURRENT_DATE - INTERVAL '7 days'
    
    UNION ALL
    
    SELECT 
      'streak_milestone' as type,
      'Learning Streak Milestone' as title,
      'Reached ' || s.current_streak || ' day learning streak!' as description,
      s.last_activity_date as date,
      u.first_name || ' ' || u.last_name as child_name,
      0 as points_earned,
      'consistency' as category
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN parent_child_relationships pcr ON s.user_id = pcr.child_id
    WHERE pcr.parent_id = $1 AND pcr.status = 'active'
      AND s.current_streak >= 7 
      AND s.current_streak % 7 = 0
      AND s.last_activity_date >= CURRENT_DATE - INTERVAL '7 days'
    
    ORDER BY date DESC
    LIMIT 10
  `;
  
  const result = await pool.query(query, [parentId]);
  return result.rows;
}

async function getRecentTeacherCommunications(parentId, limit) {
  const query = `
    SELECT 
      tcl.*,
      t_user.first_name || ' ' || t_user.last_name as teacher_name,
      s_user.first_name || ' ' || s_user.last_name as child_name
    FROM teacher_communication_log tcl
    JOIN users t_user ON tcl.teacher_id = t_user.id
    JOIN users s_user ON tcl.student_id = s_user.id
    WHERE tcl.parent_id = $1
    ORDER BY tcl.created_at DESC
    LIMIT $2
  `;
  
  const result = await pool.query(query, [parentId, limit]);
  return result.rows;
}

async function getUpcomingFamilyEvents(parentId) {
  // This would integrate with a calendar/events system
  return [
    {
      type: 'goal_deadline',
      title: 'Goal Review Week',
      description: 'Time to review and celebrate completed goals!',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      children_involved: 'all'
    }
  ];
}

async function generateWeeklySummary(parentId, weekOffset) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekOffset * 7));
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  const summaryQuery = `
    SELECT 
      s.user_id,
      u.first_name || ' ' || u.last_name as child_name,
      COUNT(DISTINCT je.id) as journal_entries,
      COUNT(DISTINCT ps.id) as problem_sessions,
      COUNT(DISTINCT sa.id) as achievements,
      STRING_AGG(DISTINCT sa.title, ', ') as achievement_titles,
      MAX(s.current_streak) as week_end_streak,
      COALESCE(SUM(sa.points_earned), 0) as points_earned
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN parent_child_relationships pcr ON s.user_id = pcr.child_id
    LEFT JOIN journal_entries je ON s.user_id = je.user_id 
      AND je.created_at BETWEEN $2 AND $3
    LEFT JOIN problem_sessions ps ON s.user_id = ps.student_id 
      AND ps.created_at BETWEEN $2 AND $3
    LEFT JOIN student_achievements sa ON s.user_id = sa.student_id 
      AND sa.earned_at BETWEEN $2 AND $3
    WHERE pcr.parent_id = $1 AND pcr.status = 'active'
    GROUP BY s.user_id, u.first_name, u.last_name
    ORDER BY u.first_name, u.last_name
  `;
  
  const result = await pool.query(summaryQuery, [parentId, weekStart, weekEnd]);
  
  return {
    weekPeriod: {
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0],
      weekOffset: weekOffset
    },
    childrenSummaries: result.rows,
    familyTotals: {
      totalJournalEntries: result.rows.reduce((acc, child) => acc + parseInt(child.journal_entries), 0),
      totalProblemSessions: result.rows.reduce((acc, child) => acc + parseInt(child.problem_sessions), 0),
      totalAchievements: result.rows.reduce((acc, child) => acc + parseInt(child.achievements), 0),
      totalPointsEarned: result.rows.reduce((acc, child) => acc + parseInt(child.points_earned), 0)
    }
  };
}

async function getEngagementMetrics(parentId, options) {
  // This would integrate with analytics services
  try {
    const progressAnalyzer = getProgressAnalyzer();
    const metrics = await progressAnalyzer.getFamilyEngagementMetrics(parentId, options);
    return metrics;
  } catch (error) {
    console.error('Error generating engagement metrics:', error);
    return { metrics: [], trends: {}, recommendations: [] };
  }
}

async function getTeacherCommunications(parentId, options) {
  const conditions = ['tcl.parent_id = $1'];
  const params = [parentId];
  let paramCount = 1;
  
  if (options.childId) {
    paramCount++;
    conditions.push(`tcl.student_id = $${paramCount}`);
    params.push(options.childId);
  }
  
  const query = `
    SELECT 
      tcl.*,
      t_user.first_name || ' ' || t_user.last_name as teacher_name,
      s_user.first_name || ' ' || s_user.last_name as child_name,
      CASE WHEN tcl.status = 'delivered' AND tcl.direction = 'outgoing' THEN true ELSE false END as unread
    FROM teacher_communication_log tcl
    JOIN users t_user ON tcl.teacher_id = t_user.id
    JOIN users s_user ON tcl.student_id = s_user.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY tcl.created_at DESC
    LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
  `;
  
  params.push(options.limit, options.offset);
  const result = await pool.query(query, params);
  
  return {
    communications: result.rows,
    pagination: {
      limit: options.limit,
      offset: options.offset,
      hasMore: result.rows.length === options.limit
    }
  };
}

async function generateLearningTips(parentId, options) {
  // Generate personalized learning tips based on children's progress and age
  const childrenQuery = `
    SELECT s.user_id, s.grade_level, u.first_name,
           s.current_streak, s.learning_preferences
    FROM students s
    JOIN users u ON s.user_id = u.id
    JOIN parent_child_relationships pcr ON s.user_id = pcr.child_id
    WHERE pcr.parent_id = $1 AND pcr.status = 'active'
    ${options.childId ? 'AND s.user_id = $2' : ''}
  `;
  
  const params = [parentId];
  if (options.childId) params.push(options.childId);
  
  const childrenResult = await pool.query(childrenQuery, params);
  
  const tips = [];
  
  for (const child of childrenResult.rows) {
    const childTips = generateTipsForChild(child);
    tips.push({
      childId: child.user_id,
      childName: child.first_name,
      tips: childTips
    });
  }
  
  return {
    personalizedTips: tips,
    generalTips: getGeneralParentingTips(),
    resources: options.includeResources ? getLearningResources() : null
  };
}

function generateTipsForChild(child) {
  const tips = [];
  
  // Age-appropriate tips
  if (child.grade_level <= 5) {
    tips.push({
      category: 'routine',
      title: 'Create a Learning Routine',
      description: 'Establish a consistent daily learning time to build habits',
      actionItems: ['Set a specific time each day', 'Create a cozy learning space', 'Use timers for focused sessions']
    });
  } else {
    tips.push({
      category: 'independence',
      title: 'Encourage Independent Learning',
      description: 'Help develop self-directed learning skills',
      actionItems: ['Let them choose learning topics', 'Encourage self-reflection', 'Provide guidance when asked']
    });
  }
  
  // Streak-based tips
  if (child.current_streak < 3) {
    tips.push({
      category: 'motivation',
      title: 'Boost Learning Motivation',
      description: 'Help restart their learning momentum',
      actionItems: ['Celebrate small wins', 'Make learning fun and interactive', 'Join them in learning activities']
    });
  }
  
  return tips;
}

function getGeneralParentingTips() {
  return [
    {
      category: 'encouragement',
      title: 'Focus on Effort Over Results',
      description: 'Praise the learning process and persistence',
      actionItems: ['Acknowledge hard work', 'Discuss what they learned', 'Celebrate improvement']
    },
    {
      category: 'communication',
      title: 'Ask About Learning',
      description: 'Show interest in their educational journey',
      actionItems: ['Ask about favorite subjects', 'Discuss challenges together', 'Share your own learning experiences']
    }
  ];
}

function getLearningResources() {
  return [
    {
      type: 'website',
      title: 'Khan Academy Parents',
      description: 'Resources for supporting learning at home',
      url: 'https://www.khanacademy.org/parents'
    },
    {
      type: 'article',
      title: 'Creating a Growth Mindset',
      description: 'Help children develop resilience and love of learning',
      url: '#'
    }
  ];
}

async function getChildDetailedView(childId, timeframe, includeParentView = false) {
  // Reuse student overview logic but with parent permissions
  const overview = await getActivitySummary(childId, timeframe);
  const insights = await getLearningInsights(childId, timeframe);
  const goals = await getGoalProgress(childId);
  const achievements = await getRecentAchievements(childId, 10);
  
  if (includeParentView) {
    // Add parent-specific data
    const parentInsightsQuery = `
      SELECT pi.*, u.first_name || ' ' || u.last_name as parent_name
      FROM parent_insights pi
      JOIN users u ON pi.parent_id = u.id
      WHERE pi.child_id = $1
      ORDER BY pi.created_at DESC
      LIMIT 5
    `;
    
    // For now, return placeholder parent insights
    const parentInsights = [];
    
    return {
      overview,
      insights,
      goals,
      achievements,
      parentInsights: parentInsights,
      learningRecommendations: await getParentLearningRecommendations(childId)
    };
  }
  
  return { overview, insights, goals, achievements };
}

async function getParentLearningRecommendations(childId) {
  // Generate recommendations for parents based on child's performance
  return [
    {
      type: 'home_activity',
      title: 'Practice Math Together',
      description: 'Spend 15 minutes on fun math games',
      frequency: 'daily'
    },
    {
      type: 'reading',
      title: 'Bedtime Reading',
      description: 'Read together for 20 minutes before bed',
      frequency: 'daily'
    }
  ];
}

module.exports = router; 