// Dashboard Customization API Routes
// Task 5.7: Implement dashboard customization and preference settings
// RESTful API endpoints for managing dashboard layouts, themes, and preferences

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { authenticateJWT } = require('../middleware/auth');
const { roleCheck } = require('../middleware/role-check');
const { DashboardCustomizationService, DashboardCustomizationHelpers } = require('../services/dashboard-customization-service');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const customizationService = new DashboardCustomizationService(pool);

// ========== WIDGET LAYOUT MANAGEMENT ==========

// GET /api/dashboard-customization/layout - Get user's current dashboard layout
router.get('/layout', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const layout = await customizationService.getUserDashboardLayout(userId);
    
    res.json({
      message: 'Dashboard layout retrieved successfully',
      layout,
      userId
    });
    
  } catch (error) {
    console.error('Error getting dashboard layout:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard layout' });
  }
});

// POST /api/dashboard-customization/layout - Save dashboard layout
router.post('/layout', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { layoutData, saveAsPreset, presetName, presetDescription } = req.body;
    
    if (!layoutData) {
      return res.status(400).json({ error: 'Layout data is required' });
    }

    const sessionId = DashboardCustomizationHelpers.generateSessionId();
    
    const result = await customizationService.saveDashboardLayout(userId, layoutData, {
      sessionId,
      saveAsPreset,
      presetName,
      presetDescription
    });
    
    res.json({
      message: 'Dashboard layout saved successfully',
      result,
      sessionId
    });
    
  } catch (error) {
    console.error('Error saving dashboard layout:', error);
    res.status(500).json({ error: 'Failed to save dashboard layout' });
  }
});

// POST /api/dashboard-customization/widgets - Add widget to layout
router.post('/widgets', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { templateId, title, width, height, customProps } = req.body;
    
    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const sessionId = DashboardCustomizationHelpers.generateSessionId();
    
    const result = await customizationService.addWidgetToLayout(userId, {
      templateId,
      title,
      width: width || 4,
      height: height || 3,
      customProps
    }, sessionId);
    
    res.json({
      message: 'Widget added successfully',
      widget: result.widget,
      position: result.position
    });
    
  } catch (error) {
    console.error('Error adding widget:', error);
    res.status(500).json({ error: 'Failed to add widget' });
  }
});

// DELETE /api/dashboard-customization/widgets/:widgetKey - Remove widget from layout
router.delete('/widgets/:widgetKey', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { widgetKey } = req.params;
    const sessionId = DashboardCustomizationHelpers.generateSessionId();
    
    await customizationService.removeWidgetFromLayout(userId, widgetKey, sessionId);
    
    res.json({
      message: 'Widget removed successfully',
      widgetKey
    });
    
  } catch (error) {
    console.error('Error removing widget:', error);
    res.status(500).json({ error: 'Failed to remove widget' });
  }
});

// PATCH /api/dashboard-customization/widgets/:widgetKey/position - Update widget position
router.patch('/widgets/:widgetKey/position', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { widgetKey } = req.params;
    const { x, y, width, height } = req.body;
    
    if (typeof x !== 'number' || typeof y !== 'number') {
      return res.status(400).json({ error: 'Valid x and y coordinates are required' });
    }

    const sessionId = DashboardCustomizationHelpers.generateSessionId();
    
    const result = await customizationService.updateWidgetPosition(userId, widgetKey, {
      x, y, width, height
    }, sessionId);
    
    res.json({
      message: 'Widget position updated successfully',
      widget: result.widget
    });
    
  } catch (error) {
    console.error('Error updating widget position:', error);
    res.status(500).json({ error: 'Failed to update widget position' });
  }
});

// PATCH /api/dashboard-customization/widgets/:widgetKey/settings - Update widget settings
router.patch('/widgets/:widgetKey/settings', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { widgetKey } = req.params;
    const { title, visible, locked, customProps } = req.body;
    
    const sessionId = DashboardCustomizationHelpers.generateSessionId();
    
    const result = await customizationService.updateWidgetSettings(userId, widgetKey, {
      title, visible, locked, customProps
    }, sessionId);
    
    res.json({
      message: 'Widget settings updated successfully',
      widget: result.widget
    });
    
  } catch (error) {
    console.error('Error updating widget settings:', error);
    res.status(500).json({ error: 'Failed to update widget settings' });
  }
});

// ========== THEME MANAGEMENT ==========

// GET /api/dashboard-customization/theme - Get user's theme preferences
router.get('/theme', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await customizationService.getUserThemePreferences(userId);
    
    res.json({
      message: 'Theme preferences retrieved successfully',
      preferences
    });
    
  } catch (error) {
    console.error('Error getting theme preferences:', error);
    res.status(500).json({ error: 'Failed to retrieve theme preferences' });
  }
});

// PUT /api/dashboard-customization/theme - Update theme preferences
router.put('/theme', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const themePreferences = req.body;
    
    // Validate color codes if provided
    if (themePreferences.primaryColor && !DashboardCustomizationHelpers.validateColor(themePreferences.primaryColor)) {
      return res.status(400).json({ error: 'Invalid primary color format' });
    }
    
    if (themePreferences.secondaryColor && !DashboardCustomizationHelpers.validateColor(themePreferences.secondaryColor)) {
      return res.status(400).json({ error: 'Invalid secondary color format' });
    }
    
    if (themePreferences.accentColor && !DashboardCustomizationHelpers.validateColor(themePreferences.accentColor)) {
      return res.status(400).json({ error: 'Invalid accent color format' });
    }
    
    // Sanitize custom CSS if provided
    if (themePreferences.customCss) {
      themePreferences.customCss = DashboardCustomizationHelpers.sanitizeCustomCSS(themePreferences.customCss);
    }

    const sessionId = DashboardCustomizationHelpers.generateSessionId();
    
    const result = await customizationService.updateThemePreferences(userId, themePreferences, sessionId);
    
    res.json({
      message: 'Theme preferences updated successfully',
      preferences: result.preferences
    });
    
  } catch (error) {
    console.error('Error updating theme preferences:', error);
    res.status(500).json({ error: 'Failed to update theme preferences' });
  }
});

// ========== BEHAVIOR PREFERENCES ==========

// GET /api/dashboard-customization/behavior - Get user's behavior preferences
router.get('/behavior', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await customizationService.getUserBehaviorPreferences(userId);
    
    res.json({
      message: 'Behavior preferences retrieved successfully',
      preferences
    });
    
  } catch (error) {
    console.error('Error getting behavior preferences:', error);
    res.status(500).json({ error: 'Failed to retrieve behavior preferences' });
  }
});

// PUT /api/dashboard-customization/behavior - Update behavior preferences
router.put('/behavior', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const behaviorPreferences = req.body;
    
    // Validate refresh interval
    if (behaviorPreferences.autoRefreshInterval && 
        (behaviorPreferences.autoRefreshInterval < 30 || behaviorPreferences.autoRefreshInterval > 3600)) {
      return res.status(400).json({ error: 'Auto refresh interval must be between 30 and 3600 seconds' });
    }

    const sessionId = DashboardCustomizationHelpers.generateSessionId();
    
    const result = await customizationService.updateBehaviorPreferences(userId, behaviorPreferences, sessionId);
    
    res.json({
      message: 'Behavior preferences updated successfully',
      preferences: result.preferences
    });
    
  } catch (error) {
    console.error('Error updating behavior preferences:', error);
    res.status(500).json({ error: 'Failed to update behavior preferences' });
  }
});

// ========== LAYOUT PRESETS ==========

// GET /api/dashboard-customization/presets - Get user's layout presets
router.get('/presets', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const presets = await customizationService.getUserLayoutPresets(userId);
    
    res.json({
      message: 'Layout presets retrieved successfully',
      presets
    });
    
  } catch (error) {
    console.error('Error getting layout presets:', error);
    res.status(500).json({ error: 'Failed to retrieve layout presets' });
  }
});

// POST /api/dashboard-customization/presets - Save current layout as preset
router.post('/presets', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, layoutData } = req.body;
    
    if (!name || !layoutData) {
      return res.status(400).json({ error: 'Name and layout data are required' });
    }
    
    const result = await customizationService.saveLayoutAsPreset(userId, layoutData, name, description);
    
    res.json({
      message: 'Layout preset saved successfully',
      preset: result.preset
    });
    
  } catch (error) {
    console.error('Error saving layout preset:', error);
    res.status(500).json({ error: 'Failed to save layout preset' });
  }
});

// POST /api/dashboard-customization/presets/:presetId/apply - Apply layout preset
router.post('/presets/:presetId/apply', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { presetId } = req.params;
    const sessionId = DashboardCustomizationHelpers.generateSessionId();
    
    const result = await customizationService.applyLayoutPreset(userId, parseInt(presetId), sessionId);
    
    res.json({
      message: 'Layout preset applied successfully',
      layoutData: result.layoutData
    });
    
  } catch (error) {
    console.error('Error applying layout preset:', error);
    res.status(500).json({ error: 'Failed to apply layout preset' });
  }
});

// DELETE /api/dashboard-customization/presets/:presetId - Delete layout preset
router.delete('/presets/:presetId', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { presetId } = req.params;
    
    const deleteQuery = `
      DELETE FROM dashboard_layout_presets 
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(deleteQuery, [parseInt(presetId), userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layout preset not found' });
    }
    
    res.json({
      message: 'Layout preset deleted successfully',
      presetId: parseInt(presetId)
    });
    
  } catch (error) {
    console.error('Error deleting layout preset:', error);
    res.status(500).json({ error: 'Failed to delete layout preset' });
  }
});

// ========== WIDGET TEMPLATES ==========

// GET /api/dashboard-customization/widget-templates - Get available widget templates
router.get('/widget-templates', authenticateJWT, async (req, res) => {
  try {
    const userRole = req.user.role;
    const { category } = req.query;
    
    let templates = await customizationService.getAvailableWidgetTemplates(userRole);
    
    if (category) {
      templates = templates.filter(template => template.category === category);
    }
    
    res.json({
      message: 'Widget templates retrieved successfully',
      templates,
      userRole
    });
    
  } catch (error) {
    console.error('Error getting widget templates:', error);
    res.status(500).json({ error: 'Failed to retrieve widget templates' });
  }
});

// GET /api/dashboard-customization/widget-templates/categories - Get widget template categories
router.get('/widget-templates/categories', authenticateJWT, async (req, res) => {
  try {
    const userRole = req.user.role;
    
    const query = `
      SELECT DISTINCT category, COUNT(*) as widget_count
      FROM dashboard_widget_templates 
      WHERE $1 = ANY(available_for_roles)
      GROUP BY category
      ORDER BY category
    `;
    
    const result = await pool.query(query, [userRole]);
    
    res.json({
      message: 'Widget categories retrieved successfully',
      categories: result.rows
    });
    
  } catch (error) {
    console.error('Error getting widget categories:', error);
    res.status(500).json({ error: 'Failed to retrieve widget categories' });
  }
});

// ========== SHARED DASHBOARD TEMPLATES ==========

// GET /api/dashboard-customization/shared-templates - Get shared dashboard templates
router.get('/shared-templates', authenticateJWT, async (req, res) => {
  try {
    const userRole = req.user.role;
    const { category, featured, official, limit } = req.query;
    
    const options = {
      category,
      featured: featured === 'true',
      official: official === 'true',
      limit: limit ? parseInt(limit) : undefined
    };
    
    const templates = await customizationService.getSharedDashboardTemplates(userRole, options);
    
    res.json({
      message: 'Shared templates retrieved successfully',
      templates,
      userRole
    });
    
  } catch (error) {
    console.error('Error getting shared templates:', error);
    res.status(500).json({ error: 'Failed to retrieve shared templates' });
  }
});

// POST /api/dashboard-customization/shared-templates/:templateId/apply - Apply shared template
router.post('/shared-templates/:templateId/apply', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { templateId } = req.params;
    
    // Get template data
    const templateQuery = `
      SELECT template_data FROM shared_dashboard_templates 
      WHERE id = $1 AND target_role = $2
    `;
    
    const templateResult = await pool.query(templateQuery, [parseInt(templateId), userRole]);
    
    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found or not available for your role' });
    }
    
    const layoutData = templateResult.rows[0].template_data;
    const sessionId = DashboardCustomizationHelpers.generateSessionId();
    
    // Apply the template
    const result = await customizationService.saveDashboardLayout(userId, layoutData, { sessionId });
    
    // Update download count
    await pool.query(`
      UPDATE shared_dashboard_templates 
      SET download_count = download_count + 1 
      WHERE id = $1
    `, [parseInt(templateId)]);
    
    res.json({
      message: 'Shared template applied successfully',
      result,
      templateId: parseInt(templateId)
    });
    
  } catch (error) {
    console.error('Error applying shared template:', error);
    res.status(500).json({ error: 'Failed to apply shared template' });
  }
});

// ========== ANALYTICS & RECOMMENDATIONS ==========

// GET /api/dashboard-customization/recommendations - Get dashboard recommendations
router.get('/recommendations', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const recommendations = await customizationService.getDashboardRecommendations(userId);
    
    res.json({
      message: 'Recommendations retrieved successfully',
      recommendations
    });
    
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to retrieve recommendations' });
  }
});

// GET /api/dashboard-customization/analytics - Get dashboard usage analytics
router.get('/analytics', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeframe } = req.query;
    
    const analytics = await customizationService.getDashboardAnalytics(userId, { timeframe });
    
    res.json({
      message: 'Analytics retrieved successfully',
      analytics,
      timeframe: timeframe || '30d'
    });
    
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to retrieve analytics' });
  }
});

// POST /api/dashboard-customization/track - Track user interaction
router.post('/track', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId, widgetId, actionType, actionDetails, durationSeconds } = req.body;
    
    if (!actionType) {
      return res.status(400).json({ error: 'Action type is required' });
    }
    
    await customizationService.trackUserInteraction(
      userId, 
      sessionId || DashboardCustomizationHelpers.generateSessionId(), 
      widgetId, 
      actionType, 
      actionDetails, 
      durationSeconds
    );
    
    res.json({
      message: 'Interaction tracked successfully'
    });
    
  } catch (error) {
    console.error('Error tracking interaction:', error);
    res.status(500).json({ error: 'Failed to track interaction' });
  }
});

// ========== IMPORT/EXPORT ==========

// GET /api/dashboard-customization/export - Export complete dashboard configuration
router.get('/export', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all user customization data
    const [layout, theme, behavior] = await Promise.all([
      customizationService.getUserDashboardLayout(userId),
      customizationService.getUserThemePreferences(userId),
      customizationService.getUserBehaviorPreferences(userId)
    ]);
    
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userId,
      layout,
      theme,
      behavior
    };
    
    res.json({
      message: 'Dashboard configuration exported successfully',
      data: exportData
    });
    
  } catch (error) {
    console.error('Error exporting dashboard configuration:', error);
    res.status(500).json({ error: 'Failed to export dashboard configuration' });
  }
});

// POST /api/dashboard-customization/import - Import dashboard configuration
router.post('/import', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { data } = req.body;
    
    if (!data || !data.version) {
      return res.status(400).json({ error: 'Valid export data is required' });
    }
    
    const sessionId = DashboardCustomizationHelpers.generateSessionId();
    const results = {};
    
    // Import layout if provided
    if (data.layout && data.layout.widgets) {
      const layoutResult = await customizationService.saveDashboardLayout(userId, { widgets: data.layout.widgets }, { sessionId });
      results.layout = layoutResult;
    }
    
    // Import theme if provided
    if (data.theme) {
      const themeResult = await customizationService.updateThemePreferences(userId, data.theme, sessionId);
      results.theme = themeResult;
    }
    
    // Import behavior preferences if provided
    if (data.behavior) {
      const behaviorResult = await customizationService.updateBehaviorPreferences(userId, data.behavior, sessionId);
      results.behavior = behaviorResult;
    }
    
    res.json({
      message: 'Dashboard configuration imported successfully',
      results,
      importedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error importing dashboard configuration:', error);
    res.status(500).json({ error: 'Failed to import dashboard configuration' });
  }
});

// ========== RESET/DEFAULTS ==========

// POST /api/dashboard-customization/reset - Reset to default configuration
router.post('/reset', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { resetLayout, resetTheme, resetBehavior } = req.body;
    
    const sessionId = DashboardCustomizationHelpers.generateSessionId();
    const results = {};
    
    if (resetLayout) {
      const defaultLayout = await customizationService.getDefaultLayoutForUser(userId);
      const layoutResult = await customizationService.saveDashboardLayout(userId, defaultLayout, { sessionId });
      results.layout = layoutResult;
    }
    
    if (resetTheme) {
      const defaultTheme = customizationService.getDefaultThemePreferences();
      const themeResult = await customizationService.updateThemePreferences(userId, defaultTheme, sessionId);
      results.theme = themeResult;
    }
    
    if (resetBehavior) {
      const defaultBehavior = customizationService.getDefaultBehaviorPreferences();
      const behaviorResult = await customizationService.updateBehaviorPreferences(userId, defaultBehavior, sessionId);
      results.behavior = behaviorResult;
    }
    
    res.json({
      message: 'Dashboard reset to defaults successfully',
      results,
      resetAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error resetting dashboard:', error);
    res.status(500).json({ error: 'Failed to reset dashboard' });
  }
});

// ========== ADMINISTRATIVE ENDPOINTS ==========

// GET /api/dashboard-customization/admin/analytics - Get system-wide analytics (admin only)
router.get('/admin/analytics', authenticateJWT, roleCheck(['admin']), async (req, res) => {
  try {
    const { timeframe } = req.query;
    const timeCondition = timeframe ? customizationService.getTimeCondition(timeframe) : "AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'";
    
    const query = `
      SELECT 
        action_type,
        COUNT(*) as total_interactions,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(duration_seconds) as avg_duration,
        DATE_TRUNC('day', timestamp) as date
      FROM dashboard_usage_analytics 
      WHERE 1=1 ${timeCondition}
      GROUP BY action_type, DATE_TRUNC('day', timestamp)
      ORDER BY date DESC, total_interactions DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      message: 'System analytics retrieved successfully',
      analytics: result.rows,
      timeframe: timeframe || '30d'
    });
    
  } catch (error) {
    console.error('Error getting system analytics:', error);
    res.status(500).json({ error: 'Failed to retrieve system analytics' });
  }
});

// POST /api/dashboard-customization/admin/cleanup - Cleanup old analytics data (admin only)
router.post('/admin/cleanup', authenticateJWT, roleCheck(['admin']), async (req, res) => {
  try {
    const deletedCount = await customizationService.cleanupOldAnalytics();
    
    res.json({
      message: 'Analytics cleanup completed successfully',
      deletedRecords: deletedCount,
      cleanupAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error cleaning up analytics:', error);
    res.status(500).json({ error: 'Failed to cleanup analytics' });
  }
});

module.exports = router; 