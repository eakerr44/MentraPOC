// Dashboard Customization Service
// Task 5.7: Implement dashboard customization and preference settings
// Comprehensive service for managing dashboard layouts, themes, preferences, and analytics

const { Pool } = require('pg');

class DashboardCustomizationService {
  constructor(pool) {
    this.pool = pool;
    this.sessionAnalytics = new Map(); // In-memory session tracking
  }

  // ========== WIDGET LAYOUT MANAGEMENT ==========

  async getUserDashboardLayout(userId) {
    try {
      const result = await this.pool.query('SELECT * FROM get_user_dashboard_layout($1)', [userId]);
      
      if (result.rows.length === 0) {
        // Return default layout for user's role
        return await this.getDefaultLayoutForUser(userId);
      }

      return {
        widgets: result.rows,
        lastUpdated: result.rows[0]?.updated_at || new Date().toISOString(),
        totalWidgets: result.rows.length
      };
    } catch (error) {
      console.error('Error getting user dashboard layout:', error);
      throw new Error('Failed to retrieve dashboard layout');
    }
  }

  async saveDashboardLayout(userId, layoutData, options = {}) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Validate layout data
      this.validateLayoutData(layoutData);

      // Save layout using database function
      const success = await client.query('SELECT save_dashboard_layout($1, $2)', [
        userId, 
        JSON.stringify(layoutData)
      ]);

      if (options.saveAsPreset) {
        await this.saveLayoutAsPreset(userId, layoutData, options.presetName, options.presetDescription, client);
      }

      // Track layout change
      await this.trackUserInteraction(userId, options.sessionId, null, 'layout_saved', {
        widgetCount: layoutData.widgets?.length || 0,
        saveAsPreset: !!options.saveAsPreset
      });

      await client.query('COMMIT');
      
      return {
        success: true,
        widgetCount: layoutData.widgets?.length || 0,
        savedAt: new Date().toISOString()
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error saving dashboard layout:', error);
      throw new Error('Failed to save dashboard layout');
    } finally {
      client.release();
    }
  }

  async addWidgetToLayout(userId, widgetConfig, sessionId = null) {
    try {
      // Generate unique widget key
      const widgetKey = `${widgetConfig.templateId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Find optimal position for new widget
      const optimalPosition = await this.findOptimalWidgetPosition(userId, widgetConfig.width, widgetConfig.height);

      const insertQuery = `
        INSERT INTO user_dashboard_widgets (
          user_id, template_id, widget_key, title, position_x, position_y, 
          width, height, custom_props
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const result = await this.pool.query(insertQuery, [
        userId,
        widgetConfig.templateId,
        widgetKey,
        widgetConfig.title || null,
        optimalPosition.x,
        optimalPosition.y,
        widgetConfig.width || 4,
        widgetConfig.height || 3,
        JSON.stringify(widgetConfig.customProps || {})
      ]);

      // Track widget addition
      await this.trackUserInteraction(userId, sessionId, widgetKey, 'widget_added', {
        templateId: widgetConfig.templateId,
        position: optimalPosition
      });

      return {
        success: true,
        widget: result.rows[0],
        position: optimalPosition
      };

    } catch (error) {
      console.error('Error adding widget to layout:', error);
      throw new Error('Failed to add widget to layout');
    }
  }

  async removeWidgetFromLayout(userId, widgetKey, sessionId = null) {
    try {
      const deleteQuery = `
        DELETE FROM user_dashboard_widgets 
        WHERE user_id = $1 AND widget_key = $2
        RETURNING template_id
      `;

      const result = await this.pool.query(deleteQuery, [userId, widgetKey]);

      if (result.rows.length === 0) {
        throw new Error('Widget not found');
      }

      // Track widget removal
      await this.trackUserInteraction(userId, sessionId, widgetKey, 'widget_removed', {
        templateId: result.rows[0].template_id
      });

      return { success: true };

    } catch (error) {
      console.error('Error removing widget from layout:', error);
      throw new Error('Failed to remove widget from layout');
    }
  }

  async updateWidgetPosition(userId, widgetKey, position, sessionId = null) {
    try {
      const updateQuery = `
        UPDATE user_dashboard_widgets 
        SET position_x = $3, position_y = $4, 
            width = COALESCE($5, width), height = COALESCE($6, height),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND widget_key = $2
        RETURNING *
      `;

      const result = await this.pool.query(updateQuery, [
        userId, 
        widgetKey, 
        position.x, 
        position.y, 
        position.width, 
        position.height
      ]);

      if (result.rows.length === 0) {
        throw new Error('Widget not found');
      }

      // Track widget position update
      await this.trackUserInteraction(userId, sessionId, widgetKey, 'widget_moved', {
        newPosition: position,
        action: position.width || position.height ? 'resize' : 'move'
      });

      return { success: true, widget: result.rows[0] };

    } catch (error) {
      console.error('Error updating widget position:', error);
      throw new Error('Failed to update widget position');
    }
  }

  async updateWidgetSettings(userId, widgetKey, settings, sessionId = null) {
    try {
      const updateQuery = `
        UPDATE user_dashboard_widgets 
        SET title = COALESCE($3, title),
            visible = COALESCE($4, visible),
            locked = COALESCE($5, locked),
            custom_props = COALESCE($6, custom_props),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND widget_key = $2
        RETURNING *
      `;

      const result = await this.pool.query(updateQuery, [
        userId,
        widgetKey,
        settings.title,
        settings.visible,
        settings.locked,
        settings.customProps ? JSON.stringify(settings.customProps) : null
      ]);

      if (result.rows.length === 0) {
        throw new Error('Widget not found');
      }

      // Track widget configuration
      await this.trackUserInteraction(userId, sessionId, widgetKey, 'widget_configured', {
        updatedFields: Object.keys(settings)
      });

      return { success: true, widget: result.rows[0] };

    } catch (error) {
      console.error('Error updating widget settings:', error);
      throw new Error('Failed to update widget settings');
    }
  }

  // ========== THEME MANAGEMENT ==========

  async getUserThemePreferences(userId) {
    try {
      const query = `
        SELECT * FROM user_theme_preferences 
        WHERE user_id = $1
      `;

      const result = await this.pool.query(query, [userId]);

      if (result.rows.length === 0) {
        // Return default theme preferences
        return this.getDefaultThemePreferences();
      }

      return result.rows[0];

    } catch (error) {
      console.error('Error getting user theme preferences:', error);
      throw new Error('Failed to retrieve theme preferences');
    }
  }

  async updateThemePreferences(userId, themePreferences, sessionId = null) {
    try {
      const upsertQuery = `
        INSERT INTO user_theme_preferences (
          user_id, theme_name, primary_color, secondary_color, accent_color,
          background_type, background_value, font_family, font_size_scale,
          border_radius, shadow_intensity, animation_enabled, reduced_motion,
          high_contrast, custom_css
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (user_id) DO UPDATE SET
          theme_name = EXCLUDED.theme_name,
          primary_color = EXCLUDED.primary_color,
          secondary_color = EXCLUDED.secondary_color,
          accent_color = EXCLUDED.accent_color,
          background_type = EXCLUDED.background_type,
          background_value = EXCLUDED.background_value,
          font_family = EXCLUDED.font_family,
          font_size_scale = EXCLUDED.font_size_scale,
          border_radius = EXCLUDED.border_radius,
          shadow_intensity = EXCLUDED.shadow_intensity,
          animation_enabled = EXCLUDED.animation_enabled,
          reduced_motion = EXCLUDED.reduced_motion,
          high_contrast = EXCLUDED.high_contrast,
          custom_css = EXCLUDED.custom_css,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await this.pool.query(upsertQuery, [
        userId,
        themePreferences.themeName || 'default',
        themePreferences.primaryColor || '#667eea',
        themePreferences.secondaryColor || '#764ba2',
        themePreferences.accentColor || '#ff6b6b',
        themePreferences.backgroundType || 'gradient',
        themePreferences.backgroundValue,
        themePreferences.fontFamily || 'system',
        themePreferences.fontSizeScale || 1.0,
        themePreferences.borderRadius || 8,
        themePreferences.shadowIntensity || 'medium',
        themePreferences.animationEnabled !== false,
        themePreferences.reducedMotion || false,
        themePreferences.highContrast || false,
        themePreferences.customCss
      ]);

      // Track theme update
      await this.trackUserInteraction(userId, sessionId, null, 'theme_updated', {
        themeName: themePreferences.themeName,
        customizations: Object.keys(themePreferences)
      });

      return { success: true, preferences: result.rows[0] };

    } catch (error) {
      console.error('Error updating theme preferences:', error);
      throw new Error('Failed to update theme preferences');
    }
  }

  // ========== BEHAVIOR PREFERENCES ==========

  async getUserBehaviorPreferences(userId) {
    try {
      const query = `
        SELECT * FROM dashboard_behavior_preferences 
        WHERE user_id = $1
      `;

      const result = await this.pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return this.getDefaultBehaviorPreferences();
      }

      return result.rows[0];

    } catch (error) {
      console.error('Error getting user behavior preferences:', error);
      throw new Error('Failed to retrieve behavior preferences');
    }
  }

  async updateBehaviorPreferences(userId, behaviorPreferences, sessionId = null) {
    try {
      const upsertQuery = `
        INSERT INTO dashboard_behavior_preferences (
          user_id, auto_refresh_enabled, auto_refresh_interval, default_timeframe,
          sidebar_collapsed, compact_mode, show_animations, show_tooltips,
          keyboard_shortcuts_enabled, default_view, quick_actions, data_density,
          date_format, number_format
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (user_id) DO UPDATE SET
          auto_refresh_enabled = EXCLUDED.auto_refresh_enabled,
          auto_refresh_interval = EXCLUDED.auto_refresh_interval,
          default_timeframe = EXCLUDED.default_timeframe,
          sidebar_collapsed = EXCLUDED.sidebar_collapsed,
          compact_mode = EXCLUDED.compact_mode,
          show_animations = EXCLUDED.show_animations,
          show_tooltips = EXCLUDED.show_tooltips,
          keyboard_shortcuts_enabled = EXCLUDED.keyboard_shortcuts_enabled,
          default_view = EXCLUDED.default_view,
          quick_actions = EXCLUDED.quick_actions,
          data_density = EXCLUDED.data_density,
          date_format = EXCLUDED.date_format,
          number_format = EXCLUDED.number_format,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const result = await this.pool.query(upsertQuery, [
        userId,
        behaviorPreferences.autoRefreshEnabled !== false,
        behaviorPreferences.autoRefreshInterval || 300,
        behaviorPreferences.defaultTimeframe || '30d',
        behaviorPreferences.sidebarCollapsed || false,
        behaviorPreferences.compactMode || false,
        behaviorPreferences.showAnimations !== false,
        behaviorPreferences.showTooltips !== false,
        behaviorPreferences.keyboardShortcutsEnabled !== false,
        behaviorPreferences.defaultView,
        JSON.stringify(behaviorPreferences.quickActions || []),
        behaviorPreferences.dataDensity || 'comfortable',
        behaviorPreferences.dateFormat || 'relative',
        behaviorPreferences.numberFormat || 'compact'
      ]);

      // Track behavior preferences update
      await this.trackUserInteraction(userId, sessionId, null, 'behavior_preferences_updated', {
        updatedFields: Object.keys(behaviorPreferences)
      });

      return { success: true, preferences: result.rows[0] };

    } catch (error) {
      console.error('Error updating behavior preferences:', error);
      throw new Error('Failed to update behavior preferences');
    }
  }

  // ========== LAYOUT PRESETS ==========

  async getUserLayoutPresets(userId) {
    try {
      const query = `
        SELECT * FROM dashboard_layout_presets 
        WHERE user_id = $1 OR is_public = true
        ORDER BY is_default DESC, usage_count DESC, created_at DESC
      `;

      const result = await this.pool.query(query, [userId]);
      return result.rows;

    } catch (error) {
      console.error('Error getting user layout presets:', error);
      throw new Error('Failed to retrieve layout presets');
    }
  }

  async saveLayoutAsPreset(userId, layoutData, name, description, client = null) {
    const queryClient = client || this.pool;

    try {
      const insertQuery = `
        INSERT INTO dashboard_layout_presets (
          user_id, name, description, layout_data
        ) VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const result = await queryClient.query(insertQuery, [
        userId,
        name,
        description,
        JSON.stringify(layoutData)
      ]);

      return { success: true, preset: result.rows[0] };

    } catch (error) {
      console.error('Error saving layout preset:', error);
      throw new Error('Failed to save layout preset');
    }
  }

  async applyLayoutPreset(userId, presetId, sessionId = null) {
    try {
      // Get preset data
      const presetQuery = `
        SELECT layout_data FROM dashboard_layout_presets 
        WHERE id = $1 AND (user_id = $2 OR is_public = true)
      `;

      const presetResult = await this.pool.query(presetQuery, [presetId, userId]);

      if (presetResult.rows.length === 0) {
        throw new Error('Layout preset not found');
      }

      const layoutData = presetResult.rows[0].layout_data;

      // Apply the layout
      await this.saveDashboardLayout(userId, layoutData, { sessionId });

      // Update preset usage count
      await this.pool.query(`
        UPDATE dashboard_layout_presets 
        SET usage_count = usage_count + 1 
        WHERE id = $1
      `, [presetId]);

      // Track preset application
      await this.trackUserInteraction(userId, sessionId, null, 'preset_applied', {
        presetId,
        widgetCount: layoutData.widgets?.length || 0
      });

      return { success: true, layoutData };

    } catch (error) {
      console.error('Error applying layout preset:', error);
      throw new Error('Failed to apply layout preset');
    }
  }

  // ========== WIDGET TEMPLATES ==========

  async getAvailableWidgetTemplates(userRole) {
    try {
      const query = `
        SELECT * FROM dashboard_widget_templates 
        WHERE $1 = ANY(available_for_roles)
        ORDER BY category, name
      `;

      const result = await this.pool.query(query, [userRole]);
      return result.rows;

    } catch (error) {
      console.error('Error getting available widget templates:', error);
      throw new Error('Failed to retrieve widget templates');
    }
  }

  async getSharedDashboardTemplates(userRole, options = {}) {
    try {
      let query = `
        SELECT sdt.*, u.first_name || ' ' || u.last_name as creator_name
        FROM shared_dashboard_templates sdt
        LEFT JOIN users u ON sdt.created_by = u.id
        WHERE sdt.target_role = $1
      `;

      const params = [userRole];

      if (options.category) {
        params.push(options.category);
        query += ` AND sdt.category = $${params.length}`;
      }

      if (options.featured) {
        query += ` AND sdt.is_featured = true`;
      }

      if (options.official) {
        query += ` AND sdt.is_official = true`;
      }

      query += ` ORDER BY sdt.is_featured DESC, sdt.rating_average DESC, sdt.download_count DESC`;

      if (options.limit) {
        params.push(options.limit);
        query += ` LIMIT $${params.length}`;
      }

      const result = await this.pool.query(query, params);
      return result.rows;

    } catch (error) {
      console.error('Error getting shared dashboard templates:', error);
      throw new Error('Failed to retrieve shared templates');
    }
  }

  // ========== ANALYTICS & RECOMMENDATIONS ==========

  async trackUserInteraction(userId, sessionId, widgetId, actionType, actionDetails = {}, durationSeconds = null) {
    try {
      await this.pool.query('SELECT track_widget_interaction($1, $2, $3, $4, $5, $6)', [
        userId,
        sessionId || 'default',
        widgetId,
        actionType,
        JSON.stringify(actionDetails),
        durationSeconds
      ]);

    } catch (error) {
      console.error('Error tracking user interaction:', error);
      // Don't throw error for analytics failures
    }
  }

  async getDashboardRecommendations(userId) {
    try {
      const result = await this.pool.query('SELECT * FROM get_dashboard_recommendations($1)', [userId]);
      return result.rows;

    } catch (error) {
      console.error('Error getting dashboard recommendations:', error);
      throw new Error('Failed to retrieve recommendations');
    }
  }

  async getDashboardAnalytics(userId, options = {}) {
    try {
      const timeCondition = options.timeframe ? 
        this.getTimeCondition(options.timeframe) : 
        "AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'";

      const query = `
        SELECT 
          action_type,
          widget_id,
          COUNT(*) as interaction_count,
          AVG(duration_seconds) as avg_duration,
          DATE_TRUNC('day', timestamp) as date
        FROM dashboard_usage_analytics 
        WHERE user_id = $1 ${timeCondition}
        GROUP BY action_type, widget_id, DATE_TRUNC('day', timestamp)
        ORDER BY date DESC, interaction_count DESC
      `;

      const result = await this.pool.query(query, [userId]);
      return result.rows;

    } catch (error) {
      console.error('Error getting dashboard analytics:', error);
      throw new Error('Failed to retrieve dashboard analytics');
    }
  }

  // ========== UTILITY METHODS ==========

  async getDefaultLayoutForUser(userId) {
    try {
      // Get user role
      const userQuery = `SELECT role FROM users WHERE id = $1`;
      const userResult = await this.pool.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const userRole = userResult.rows[0].role;

      // Get default template for role
      const templateQuery = `
        SELECT template_data FROM shared_dashboard_templates 
        WHERE target_role = $1 AND is_official = true AND is_featured = true
        ORDER BY download_count DESC
        LIMIT 1
      `;

      const templateResult = await this.pool.query(templateQuery, [userRole]);

      if (templateResult.rows.length > 0) {
        return templateResult.rows[0].template_data;
      }

      // Fallback to basic layout
      return this.getBasicLayoutForRole(userRole);

    } catch (error) {
      console.error('Error getting default layout for user:', error);
      throw new Error('Failed to get default layout');
    }
  }

  getBasicLayoutForRole(role) {
    const basicLayouts = {
      student: {
        widgets: [
          { id: 'student_overview', x: 0, y: 0, w: 8, h: 4 },
          { id: 'current_goals', x: 8, y: 0, w: 4, h: 4 },
          { id: 'learning_streak', x: 0, y: 4, w: 6, h: 3 },
          { id: 'recent_achievements', x: 6, y: 4, w: 6, h: 3 }
        ]
      },
      teacher: {
        widgets: [
          { id: 'class_overview', x: 0, y: 0, w: 8, h: 4 },
          { id: 'student_alerts', x: 8, y: 0, w: 4, h: 4 },
          { id: 'recent_activities', x: 0, y: 4, w: 12, h: 4 }
        ]
      },
      parent: {
        widgets: [
          { id: 'family_overview', x: 0, y: 0, w: 8, h: 4 },
          { id: 'weekly_summary', x: 8, y: 0, w: 4, h: 4 },
          { id: 'children_progress', x: 0, y: 4, w: 12, h: 4 }
        ]
      }
    };

    return basicLayouts[role] || basicLayouts.student;
  }

  async findOptimalWidgetPosition(userId, width, height) {
    try {
      // Get current widget positions
      const query = `
        SELECT position_x, position_y, width, height 
        FROM user_dashboard_widgets 
        WHERE user_id = $1 AND visible = true
      `;

      const result = await this.pool.query(query, [userId]);
      const existingWidgets = result.rows;

      // Simple algorithm to find next available position
      // This could be enhanced with more sophisticated placement logic
      const gridWidth = 12; // Assuming 12-column grid
      
      for (let y = 0; y < 20; y++) { // Check up to 20 rows
        for (let x = 0; x <= gridWidth - width; x++) {
          const proposed = { x, y, width, height };
          
          const overlaps = existingWidgets.some(widget => 
            this.widgetsOverlap(proposed, {
              x: widget.position_x,
              y: widget.position_y,
              width: widget.width,
              height: widget.height
            })
          );

          if (!overlaps) {
            return { x, y };
          }
        }
      }

      // If no optimal position found, place at bottom
      const maxY = Math.max(0, ...existingWidgets.map(w => w.position_y + w.height));
      return { x: 0, y: maxY };

    } catch (error) {
      console.error('Error finding optimal widget position:', error);
      return { x: 0, y: 0 }; // Default position
    }
  }

  widgetsOverlap(widget1, widget2) {
    return !(
      widget1.x >= widget2.x + widget2.width ||
      widget2.x >= widget1.x + widget1.width ||
      widget1.y >= widget2.y + widget2.height ||
      widget2.y >= widget1.y + widget1.height
    );
  }

  validateLayoutData(layoutData) {
    if (!layoutData || !layoutData.widgets || !Array.isArray(layoutData.widgets)) {
      throw new Error('Invalid layout data: widgets array required');
    }

    for (const widget of layoutData.widgets) {
      if (!widget.template_id || !widget.widget_key) {
        throw new Error('Invalid widget data: template_id and widget_key required');
      }

      if (typeof widget.position_x !== 'number' || typeof widget.position_y !== 'number') {
        throw new Error('Invalid widget position: x and y coordinates required');
      }

      if (typeof widget.width !== 'number' || typeof widget.height !== 'number') {
        throw new Error('Invalid widget size: width and height required');
      }
    }
  }

  getDefaultThemePreferences() {
    return {
      theme_name: 'default',
      primary_color: '#667eea',
      secondary_color: '#764ba2',
      accent_color: '#ff6b6b',
      background_type: 'gradient',
      background_value: null,
      font_family: 'system',
      font_size_scale: 1.0,
      border_radius: 8,
      shadow_intensity: 'medium',
      animation_enabled: true,
      reduced_motion: false,
      high_contrast: false,
      custom_css: null
    };
  }

  getDefaultBehaviorPreferences() {
    return {
      auto_refresh_enabled: true,
      auto_refresh_interval: 300,
      default_timeframe: '30d',
      sidebar_collapsed: false,
      compact_mode: false,
      show_animations: true,
      show_tooltips: true,
      keyboard_shortcuts_enabled: true,
      default_view: null,
      quick_actions: [],
      data_density: 'comfortable',
      date_format: 'relative',
      number_format: 'compact'
    };
  }

  getTimeCondition(timeframe) {
    switch (timeframe) {
      case '7d':
        return "AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '7 days'";
      case '30d':
        return "AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'";
      case '90d':
        return "AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '90 days'";
      default:
        return "AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'";
    }
  }

  // ========== CLEANUP & MAINTENANCE ==========

  async cleanupOldAnalytics() {
    try {
      const result = await this.pool.query('SELECT cleanup_dashboard_analytics()');
      const deletedCount = result.rows[0].cleanup_dashboard_analytics;
      
      console.log(`Cleaned up ${deletedCount} old dashboard analytics records`);
      return deletedCount;

    } catch (error) {
      console.error('Error cleaning up analytics:', error);
      throw new Error('Failed to cleanup old analytics');
    }
  }
}

// Helper functions and utilities
const DashboardCustomizationHelpers = {
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  validateColor(color) {
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return hexPattern.test(color);
  },

  sanitizeCustomCSS(css) {
    // Basic CSS sanitization - remove potentially dangerous properties
    const dangerous = [
      'expression',
      'javascript:',
      'vbscript:',
      'onload',
      'onerror',
      'import',
      '@import'
    ];

    let sanitized = css;
    dangerous.forEach(danger => {
      const regex = new RegExp(danger, 'gi');
      sanitized = sanitized.replace(regex, '');
    });

    return sanitized;
  },

  generateWidgetKey(templateId) {
    return `${templateId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

module.exports = { DashboardCustomizationService, DashboardCustomizationHelpers }; 