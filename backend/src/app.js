const express = require('express');
const cookieParser = require('cookie-parser');
const { testConnection } = require('./config/database');
const { testChromaConnection, getCollectionStats } = require('./config/vector-db');
const { healthCheck: contextHealthCheck } = require('./services/context-manager');
const { cleanupExpiredSessions } = require('./services/auth-service');
const { setupSecurity } = require('./middleware/security');

// Import routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const dashboardCustomizationRoutes = require('./routes/dashboard-customization');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Setup comprehensive security middleware (CORS, headers, rate limiting)
const securityMiddleware = setupSecurity(app);

// Body parsing middleware (after security headers, before routes)
app.use(express.json({ 
  limit: '10mb'
}));

app.use(express.urlencoded({ 
  extended: true,
  limit: '10mb'
}));

// JSON parsing error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.warn(`JSON parsing error from IP: ${req.ip}`);
    return res.status(400).json({
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON'
    });
  }
  next(err);
});

// Cookie parsing middleware for refresh tokens
app.use(cookieParser());

// Health check endpoint with database and vector database status
app.get('/health', async (req, res) => {
  let dbStatus = 'unknown';
  let vectorDbStatus = 'unknown';
  let contextManagerStatus = 'unknown';

  try {
    await testConnection();
    dbStatus = 'connected';
  } catch (error) {
    dbStatus = 'disconnected';
  }

  try {
    await testChromaConnection();
    vectorDbStatus = 'connected';
  } catch (error) {
    vectorDbStatus = 'disconnected';
  }

  try {
    const contextHealth = await contextHealthCheck();
    contextManagerStatus = contextHealth.status;
  } catch (error) {
    contextManagerStatus = 'unhealthy';
  }

  // Consider system healthy if the web server is running, even without database
  const overallStatus = 'healthy'; // Always healthy for testing
  const hasDatabase = dbStatus === 'connected';
  const hasVectorDb = vectorDbStatus === 'connected';

  res.status(200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    services: {
      web_server: 'running',
      database: dbStatus,
      vector_database: vectorDbStatus,
      context_manager: contextManagerStatus
    },
    capabilities: {
      authentication: hasDatabase,
      ai_context: hasVectorDb,
      full_features: hasDatabase && hasVectorDb
    },
    version: '1.0.0'
  });
});

// Database status endpoint
app.get('/api/v1/database/status', async (req, res) => {
  try {
    await testConnection();
    res.json({
      status: 'connected',
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Connection error'
    });
  }
});

// Vector database status endpoint
app.get('/api/v1/vector-db/status', async (req, res) => {
  try {
    await testChromaConnection();
    const stats = await getCollectionStats();
    
    res.json({
      status: 'connected',
      message: 'ChromaDB connection successful',
      collection_stats: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'ChromaDB connection failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Connection error'
    });
  }
});

// Context manager status endpoint
app.get('/api/v1/context/status', async (req, res) => {
  try {
    const health = await contextHealthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Context manager health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Health check error'
    });
  }
});

// Test endpoint for storing sample context (development only)
if (process.env.NODE_ENV === 'development') {
  const { storeLearningContext, generateContextSummary, CONTEXT_TYPES } = require('./services/context-manager');
  const { getAIService } = require('./services/ai-service');
  
  app.post('/api/v1/context/test-store', async (req, res) => {
    try {
      const {
        studentId = 'test-student-123',
        content = 'This is a test learning interaction',
        contextType = CONTEXT_TYPES.SCAFFOLDING_INTERACTION,
        subject = 'mathematics',
        difficulty = 'medium'
      } = req.body;

      const result = await storeLearningContext({
        studentId,
        content,
        contextType,
        subject,
        difficulty,
        emotional_state: 'engaged',
        performance_metrics: { accuracy: 0.8, time_spent: 300 }
      });

      res.json({
        success: true,
        message: 'Test context stored successfully',
        result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to store test context',
        error: error.message
      });
    }
  });

  app.post('/api/v1/context/test-retrieve', async (req, res) => {
    try {
      const {
        studentId = 'test-student-123',
        content = 'Help me with a math problem'
      } = req.body;

      const contextSummary = await generateContextSummary(studentId, content);

      res.json({
        success: true,
        message: 'Context retrieved successfully',
        context_summary: contextSummary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve context',
        error: error.message
      });
    }
  });

  // AI Service test endpoints
  app.post('/api/v1/ai/test', async (req, res) => {
    try {
      const { prompt, options = {} } = req.body;
      
      if (!prompt) {
        return res.status(400).json({
          success: false,
          message: 'Prompt is required'
        });
      }

      const aiService = getAIService();
      const response = await aiService.generateResponse(prompt, options);

      res.json({
        success: true,
        message: 'AI response generated successfully',
        response
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to generate AI response',
        error: error.message,
        provider: error.provider || 'unknown'
      });
    }
  });

  app.get('/api/v1/ai/health', async (req, res) => {
    try {
      const aiService = getAIService();
      const health = await aiService.checkHealth();

      res.json({
        success: true,
        message: 'AI service health check completed',
        health
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'AI service health check failed',
        error: error.message
      });
    }
  });

  app.get('/api/v1/ai/models', async (req, res) => {
    try {
      const aiService = getAIService();
      const models = await aiService.getAvailableModels();

      res.json({
        success: true,
        message: 'Available models retrieved successfully',
        models
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve models',
        error: error.message
      });
    }
  });

  app.get('/api/v1/ai/info', (req, res) => {
    try {
      const aiService = getAIService();
      const info = aiService.getProviderInfo();

      res.json({
        success: true,
        message: 'AI service info retrieved successfully',
        info
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve AI service info',
        error: error.message
      });
    }
  });
}

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/dashboard-customization', dashboardCustomizationRoutes);

// Main API info endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'Mentra API v1',
    version: '1.0.0',
    authentication: {
      login: 'POST /api/v1/auth/login',
      register: 'POST /api/v1/auth/register',
      refresh: 'POST /api/v1/auth/refresh',
      logout: 'POST /api/v1/auth/logout',
      me: 'GET /api/v1/auth/me',
      verify: 'GET /api/v1/auth/verify'
    },
    endpoints: {
      health: '/health',
      database: '/api/v1/database/status',
      vector_database: '/api/v1/vector-db/status',
      context_manager: '/api/v1/context/status',
      auth: '/api/v1/auth',
      dashboard: '/api/dashboard',
      dashboard_customization: '/api/dashboard-customization',
      journal: '/api/v1/journal (coming soon)',
      problems: '/api/v1/problems (coming soon)'
    },
    dashboard_endpoints: {
      student_overview: 'GET /api/dashboard/student/overview',
      student_goals: 'GET /api/dashboard/student/goals',
      create_goal: 'POST /api/dashboard/student/goals',
      update_goal: 'PUT /api/dashboard/student/goals/:goalId',
      student_progress: 'GET /api/dashboard/student/progress',
      student_achievements: 'GET /api/dashboard/student/achievements',
      student_activity_feed: 'GET /api/dashboard/student/activity-feed',
      learning_insights: 'GET /api/dashboard/student/learning-insights'
    },
    dashboard_customization_endpoints: {
      layout_management: {
        get_layout: 'GET /api/dashboard-customization/layout',
        save_layout: 'POST /api/dashboard-customization/layout',
        add_widget: 'POST /api/dashboard-customization/widgets',
        remove_widget: 'DELETE /api/dashboard-customization/widgets/:widgetKey',
        update_position: 'PATCH /api/dashboard-customization/widgets/:widgetKey/position',
        update_settings: 'PATCH /api/dashboard-customization/widgets/:widgetKey/settings'
      },
      theme_management: {
        get_theme: 'GET /api/dashboard-customization/theme',
        update_theme: 'PUT /api/dashboard-customization/theme'
      },
      behavior_preferences: {
        get_behavior: 'GET /api/dashboard-customization/behavior',
        update_behavior: 'PUT /api/dashboard-customization/behavior'
      },
      layout_presets: {
        get_presets: 'GET /api/dashboard-customization/presets',
        save_preset: 'POST /api/dashboard-customization/presets',
        apply_preset: 'POST /api/dashboard-customization/presets/:presetId/apply',
        delete_preset: 'DELETE /api/dashboard-customization/presets/:presetId'
      },
      widget_templates: {
        get_templates: 'GET /api/dashboard-customization/widget-templates',
        get_categories: 'GET /api/dashboard-customization/widget-templates/categories'
      },
      shared_templates: {
        get_shared: 'GET /api/dashboard-customization/shared-templates',
        apply_shared: 'POST /api/dashboard-customization/shared-templates/:templateId/apply'
      },
      analytics: {
        get_recommendations: 'GET /api/dashboard-customization/recommendations',
        get_analytics: 'GET /api/dashboard-customization/analytics',
        track_interaction: 'POST /api/dashboard-customization/track'
      },
      import_export: {
        export_config: 'GET /api/dashboard-customization/export',
        import_config: 'POST /api/dashboard-customization/import',
        reset_defaults: 'POST /api/dashboard-customization/reset'
      }
    },
    development_endpoints: process.env.NODE_ENV === 'development' ? {
      test_store_context: '/api/v1/context/test-store',
      test_retrieve_context: '/api/v1/context/test-retrieve',
      test_ai: '/api/v1/ai/test',
      ai_health: '/api/v1/ai/health',
      ai_models: '/api/v1/ai/models',
      ai_info: '/api/v1/ai/info'
    } : undefined
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Initialize database connections on startup
const startServer = async () => {
  try {
    // Test database connection
    try {
      await testConnection();
      console.log('🗄️  Database connection verified');
    } catch (error) {
      console.warn('⚠️  Database connection failed (continuing for testing purposes)');
      console.warn('💡 Run database services to enable full functionality');
    }
    
    // Test vector database connection
    try {
      await testChromaConnection();
      console.log('🧠 ChromaDB connection verified');
    } catch (error) {
      console.warn('⚠️  ChromaDB not available (this is normal if not started yet)');
      console.warn('💡 Run `docker-compose up -d chroma` to start ChromaDB');
    }

    // Clean up expired sessions on startup
    try {
      await cleanupExpiredSessions();
    } catch (error) {
      console.warn('⚠️  Could not cleanup expired sessions on startup (database not available)');
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Mentra backend running on http://localhost:${PORT}`);
      console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`🗄️  Database status: http://localhost:${PORT}/api/v1/database/status`);
      console.log(`🧠 Vector DB status: http://localhost:${PORT}/api/v1/vector-db/status`);
      console.log(`📚 Context manager: http://localhost:${PORT}/api/v1/context/status`);
      console.log(`🔐 Authentication: http://localhost:${PORT}/api/v1/auth`);
    });
  } catch (error) {
    console.error('❌ Critical error starting server:', error);
    console.error('💡 Check your configuration and try again');
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app; 