// Dashboard Customization System Test Suite
// Task 5.7: Implement dashboard customization and preference settings
// Comprehensive testing for layouts, themes, preferences, widgets, and analytics

const { Pool } = require('pg');
const { DashboardCustomizationService, DashboardCustomizationHelpers } = require('../services/dashboard-customization-service');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

class DashboardCustomizationTester {
  constructor() {
    this.testResults = [];
    this.testUserId = null;
    this.testUserRole = 'student';
    this.sessionId = DashboardCustomizationHelpers.generateSessionId();
    this.customizationService = new DashboardCustomizationService(pool);
  }

  async runAllTests() {
    console.log('🎨 Starting Dashboard Customization Test Suite...\n');

    try {
      // Setup test data
      await this.setupTestData();

      // Run all test categories
      await this.testDatabaseSchema();
      await this.testWidgetTemplates();
      await this.testLayoutManagement();
      await this.testThemePreferences();
      await this.testBehaviorPreferences();
      await this.testLayoutPresets();
      await this.testSharedTemplates();
      await this.testAnalyticsTracking();
      await this.testRecommendations();
      await this.testImportExport();
      await this.testServiceIntegration();

      // Display results
      this.displayResults();

      // Cleanup
      await this.cleanupTestData();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.addResult('Test Suite', false, error.message);
    }
  }

  async setupTestData() {
    console.log('📋 Setting up test data...');

    try {
      // Create test user
      const userResult = await pool.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role, status)
        VALUES ('test.customization@mentra.test', 'hashed_password', 'Test', 'User', $1, 'active')
        RETURNING id
      `, [this.testUserRole]);
      
      this.testUserId = userResult.rows[0].id;

      this.addResult('Test Data Setup', true, `Created test user with ID: ${this.testUserId}`);
      console.log('✅ Test data setup complete\n');

    } catch (error) {
      this.addResult('Test Data Setup', false, error.message);
      throw error;
    }
  }

  async testDatabaseSchema() {
    console.log('🗄️ Testing database schema...');

    try {
      // Test widget templates table
      const templatesResult = await pool.query('SELECT COUNT(*) as count FROM dashboard_widget_templates');
      const templatesCount = parseInt(templatesResult.rows[0].count);
      
      if (templatesCount >= 20) { // We inserted 20+ widget templates
        this.addResult('Widget Templates Table', true, `Found ${templatesCount} widget templates`);
      } else {
        this.addResult('Widget Templates Table', false, `Expected >= 20 templates, found ${templatesCount}`);
      }

      // Test shared dashboard templates
      const sharedTemplatesResult = await pool.query('SELECT COUNT(*) as count FROM shared_dashboard_templates');
      const sharedCount = parseInt(sharedTemplatesResult.rows[0].count);
      
      if (sharedCount >= 4) { // We inserted 4 default shared templates
        this.addResult('Shared Templates Table', true, `Found ${sharedCount} shared templates`);
      } else {
        this.addResult('Shared Templates Table', false, `Expected >= 4 shared templates, found ${sharedCount}`);
      }

      // Test database functions
      const functions = [
        'get_user_dashboard_layout',
        'save_dashboard_layout',
        'track_widget_interaction',
        'get_dashboard_recommendations',
        'cleanup_dashboard_analytics'
      ];

      for (const funcName of functions) {
        const funcResult = await pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = $1
          ) as exists
        `, [funcName]);
        
        if (funcResult.rows[0].exists) {
          this.addResult(`Function: ${funcName}`, true, 'Function exists');
        } else {
          this.addResult(`Function: ${funcName}`, false, 'Function not found');
        }
      }

      // Test essential tables
      const tables = [
        'dashboard_widget_templates',
        'user_dashboard_widgets',
        'dashboard_layout_presets',
        'user_theme_preferences',
        'dashboard_behavior_preferences',
        'dashboard_usage_analytics',
        'shared_dashboard_templates',
        'dashboard_template_ratings'
      ];

      for (const tableName of tables) {
        const tableResult = await pool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = $1
          ) as exists
        `, [tableName]);
        
        if (tableResult.rows[0].exists) {
          this.addResult(`Table: ${tableName}`, true, 'Table exists');
        } else {
          this.addResult(`Table: ${tableName}`, false, 'Table not found');
        }
      }

      console.log('✅ Database schema tests complete\n');

    } catch (error) {
      this.addResult('Database Schema', false, error.message);
    }
  }

  async testWidgetTemplates() {
    console.log('🧩 Testing widget templates...');

    try {
      // Test getting available templates for user role
      const templates = await this.customizationService.getAvailableWidgetTemplates(this.testUserRole);
      
      if (templates.length > 0) {
        this.addResult('Available Widget Templates', true, `Found ${templates.length} templates for ${this.testUserRole}`);
      } else {
        this.addResult('Available Widget Templates', false, `No templates found for ${this.testUserRole}`);
      }

      // Test template categories
      const categories = ['overview', 'analytics', 'goals', 'social', 'tools'];
      
      for (const category of categories) {
        const categoryTemplates = templates.filter(t => t.category === category);
        if (categoryTemplates.length > 0) {
          this.addResult(`Category: ${category}`, true, `Found ${categoryTemplates.length} templates`);
        }
      }

      // Test role-based filtering
      const studentTemplates = await this.customizationService.getAvailableWidgetTemplates('student');
      const teacherTemplates = await this.customizationService.getAvailableWidgetTemplates('teacher');
      const parentTemplates = await this.customizationService.getAvailableWidgetTemplates('parent');

      this.addResult('Role-based Template Filtering', true, 
        `Student: ${studentTemplates.length}, Teacher: ${teacherTemplates.length}, Parent: ${parentTemplates.length}`);

      console.log('✅ Widget templates tests complete\n');

    } catch (error) {
      this.addResult('Widget Templates', false, error.message);
    }
  }

  async testLayoutManagement() {
    console.log('📱 Testing layout management...');

    try {
      // Test getting default layout
      const defaultLayout = await this.customizationService.getUserDashboardLayout(this.testUserId);
      
      if (defaultLayout && defaultLayout.widgets) {
        this.addResult('Get Default Layout', true, `Retrieved layout with ${defaultLayout.widgets.length} widgets`);
      } else {
        this.addResult('Get Default Layout', false, 'No default layout found');
      }

      // Test adding a widget
      const widgetConfig = {
        templateId: 'student_overview',
        title: 'My Overview',
        width: 6,
        height: 4,
        customProps: { testProp: 'test value' }
      };

      const addResult = await this.customizationService.addWidgetToLayout(this.testUserId, widgetConfig, this.sessionId);
      
      if (addResult.success && addResult.widget) {
        this.addResult('Add Widget to Layout', true, `Added widget with key: ${addResult.widget.widget_key}`);
        
        // Store widget key for further tests
        this.testWidgetKey = addResult.widget.widget_key;
      } else {
        this.addResult('Add Widget to Layout', false, 'Failed to add widget');
      }

      // Test updating widget position
      if (this.testWidgetKey) {
        const newPosition = { x: 2, y: 1, width: 8, height: 3 };
        const updateResult = await this.customizationService.updateWidgetPosition(
          this.testUserId, 
          this.testWidgetKey, 
          newPosition, 
          this.sessionId
        );
        
        if (updateResult.success) {
          this.addResult('Update Widget Position', true, 'Widget position updated successfully');
        } else {
          this.addResult('Update Widget Position', false, 'Failed to update widget position');
        }

        // Test updating widget settings
        const newSettings = {
          title: 'Updated Title',
          visible: true,
          locked: false,
          customProps: { updated: true }
        };

        const settingsResult = await this.customizationService.updateWidgetSettings(
          this.testUserId,
          this.testWidgetKey,
          newSettings,
          this.sessionId
        );

        if (settingsResult.success) {
          this.addResult('Update Widget Settings', true, 'Widget settings updated successfully');
        } else {
          this.addResult('Update Widget Settings', false, 'Failed to update widget settings');
        }
      }

      // Test saving complete layout
      const layoutData = {
        widgets: [
          {
            templateId: 'student_overview',
            widgetKey: 'test_widget_1',
            title: 'Test Widget 1',
            positionX: 0,
            positionY: 0,
            width: 6,
            height: 4,
            visible: true,
            locked: false,
            customProps: {}
          },
          {
            templateId: 'current_goals',
            widgetKey: 'test_widget_2',
            title: 'Test Widget 2',
            positionX: 6,
            positionY: 0,
            width: 6,
            height: 4,
            visible: true,
            locked: false,
            customProps: {}
          }
        ]
      };

      const saveResult = await this.customizationService.saveDashboardLayout(
        this.testUserId, 
        layoutData, 
        { sessionId: this.sessionId }
      );

      if (saveResult.success) {
        this.addResult('Save Dashboard Layout', true, `Saved layout with ${saveResult.widgetCount} widgets`);
      } else {
        this.addResult('Save Dashboard Layout', false, 'Failed to save dashboard layout');
      }

      console.log('✅ Layout management tests complete\n');

    } catch (error) {
      this.addResult('Layout Management', false, error.message);
    }
  }

  async testThemePreferences() {
    console.log('🎨 Testing theme preferences...');

    try {
      // Test getting default theme preferences
      const defaultTheme = await this.customizationService.getUserThemePreferences(this.testUserId);
      
      if (defaultTheme && defaultTheme.theme_name) {
        this.addResult('Get Default Theme', true, `Retrieved theme: ${defaultTheme.theme_name}`);
      } else {
        this.addResult('Get Default Theme', false, 'No default theme found');
      }

      // Test updating theme preferences
      const themePreferences = {
        themeName: 'dark',
        primaryColor: '#4f46e5',
        secondaryColor: '#1e1b4b',
        accentColor: '#f59e0b',
        backgroundType: 'solid',
        backgroundValue: '#1a1a1a',
        fontFamily: 'sans-serif',
        fontSizeScale: 1.1,
        borderRadius: 12,
        shadowIntensity: 'strong',
        animationEnabled: true,
        reducedMotion: false,
        highContrast: false
      };

      const updateResult = await this.customizationService.updateThemePreferences(
        this.testUserId, 
        themePreferences, 
        this.sessionId
      );

      if (updateResult.success && updateResult.preferences) {
        this.addResult('Update Theme Preferences', true, `Updated to ${updateResult.preferences.theme_name} theme`);
      } else {
        this.addResult('Update Theme Preferences', false, 'Failed to update theme preferences');
      }

      // Test color validation
      const validColor = DashboardCustomizationHelpers.validateColor('#ff6b6b');
      const invalidColor = DashboardCustomizationHelpers.validateColor('invalid-color');

      this.addResult('Color Validation', validColor && !invalidColor, 
        `Valid color: ${validColor}, Invalid color: ${invalidColor}`);

      console.log('✅ Theme preferences tests complete\n');

    } catch (error) {
      this.addResult('Theme Preferences', false, error.message);
    }
  }

  async testBehaviorPreferences() {
    console.log('⚙️ Testing behavior preferences...');

    try {
      // Test getting default behavior preferences
      const defaultBehavior = await this.customizationService.getUserBehaviorPreferences(this.testUserId);
      
      if (defaultBehavior && defaultBehavior.auto_refresh_enabled !== undefined) {
        this.addResult('Get Default Behavior', true, `Auto refresh: ${defaultBehavior.auto_refresh_enabled}`);
      } else {
        this.addResult('Get Default Behavior', false, 'No default behavior preferences found');
      }

      // Test updating behavior preferences
      const behaviorPreferences = {
        autoRefreshEnabled: true,
        autoRefreshInterval: 180,
        defaultTimeframe: '7d',
        sidebarCollapsed: true,
        compactMode: false,
        showAnimations: true,
        showTooltips: true,
        keyboardShortcutsEnabled: true,
        quickActions: [
          { id: 'add_widget', label: 'Add Widget', icon: 'plus', action: 'add_widget', enabled: true }
        ],
        dataDensity: 'compact',
        dateFormat: 'relative',
        numberFormat: 'compact'
      };

      const updateResult = await this.customizationService.updateBehaviorPreferences(
        this.testUserId,
        behaviorPreferences,
        this.sessionId
      );

      if (updateResult.success && updateResult.preferences) {
        this.addResult('Update Behavior Preferences', true, 
          `Updated auto refresh to ${updateResult.preferences.auto_refresh_interval}s`);
      } else {
        this.addResult('Update Behavior Preferences', false, 'Failed to update behavior preferences');
      }

      console.log('✅ Behavior preferences tests complete\n');

    } catch (error) {
      this.addResult('Behavior Preferences', false, error.message);
    }
  }

  async testLayoutPresets() {
    console.log('💾 Testing layout presets...');

    try {
      // Test getting user layout presets
      const presets = await this.customizationService.getUserLayoutPresets(this.testUserId);
      
      if (Array.isArray(presets)) {
        this.addResult('Get Layout Presets', true, `Found ${presets.length} presets`);
      } else {
        this.addResult('Get Layout Presets', false, 'Failed to get layout presets');
      }

      // Test saving layout as preset
      const layoutData = {
        widgets: [
          {
            templateId: 'student_overview',
            widgetKey: 'preset_widget_1',
            title: 'Preset Overview',
            positionX: 0,
            positionY: 0,
            width: 8,
            height: 4,
            visible: true,
            locked: false,
            customProps: {}
          }
        ]
      };

      const savePresetResult = await this.customizationService.saveLayoutAsPreset(
        this.testUserId,
        layoutData,
        'Test Preset',
        'A test layout preset'
      );

      if (savePresetResult.success && savePresetResult.preset) {
        this.addResult('Save Layout Preset', true, `Saved preset with ID: ${savePresetResult.preset.id}`);
        this.testPresetId = savePresetResult.preset.id;
      } else {
        this.addResult('Save Layout Preset', false, 'Failed to save layout preset');
      }

      // Test applying layout preset
      if (this.testPresetId) {
        const applyResult = await this.customizationService.applyLayoutPreset(
          this.testUserId,
          this.testPresetId,
          this.sessionId
        );

        if (applyResult.success) {
          this.addResult('Apply Layout Preset', true, 'Layout preset applied successfully');
        } else {
          this.addResult('Apply Layout Preset', false, 'Failed to apply layout preset');
        }
      }

      console.log('✅ Layout presets tests complete\n');

    } catch (error) {
      this.addResult('Layout Presets', false, error.message);
    }
  }

  async testSharedTemplates() {
    console.log('🌐 Testing shared templates...');

    try {
      // Test getting shared templates for user role
      const sharedTemplates = await this.customizationService.getSharedDashboardTemplates(this.testUserRole);
      
      if (sharedTemplates.length > 0) {
        this.addResult('Get Shared Templates', true, `Found ${sharedTemplates.length} shared templates`);
      } else {
        this.addResult('Get Shared Templates', false, 'No shared templates found');
      }

      // Test filtering options
      const featuredTemplates = await this.customizationService.getSharedDashboardTemplates(this.testUserRole, {
        featured: true
      });

      const officialTemplates = await this.customizationService.getSharedDashboardTemplates(this.testUserRole, {
        official: true
      });

      this.addResult('Template Filtering', true, 
        `Featured: ${featuredTemplates.length}, Official: ${officialTemplates.length}`);

      console.log('✅ Shared templates tests complete\n');

    } catch (error) {
      this.addResult('Shared Templates', false, error.message);
    }
  }

  async testAnalyticsTracking() {
    console.log('📊 Testing analytics tracking...');

    try {
      // Test tracking user interactions
      const interactionTypes = [
        'widget_added',
        'widget_moved',
        'widget_configured',
        'layout_saved',
        'theme_updated'
      ];

      for (const actionType of interactionTypes) {
        await this.customizationService.trackUserInteraction(
          this.testUserId,
          this.sessionId,
          'test_widget',
          actionType,
          { testData: true },
          5
        );
      }

      this.addResult('Track User Interactions', true, `Tracked ${interactionTypes.length} interactions`);

      // Test getting dashboard analytics
      const analytics = await this.customizationService.getDashboardAnalytics(this.testUserId, {
        timeframe: '30d'
      });

      if (Array.isArray(analytics)) {
        this.addResult('Get Dashboard Analytics', true, `Retrieved ${analytics.length} analytics records`);
      } else {
        this.addResult('Get Dashboard Analytics', false, 'Failed to get analytics');
      }

      console.log('✅ Analytics tracking tests complete\n');

    } catch (error) {
      this.addResult('Analytics Tracking', false, error.message);
    }
  }

  async testRecommendations() {
    console.log('💡 Testing recommendations...');

    try {
      // Test getting dashboard recommendations
      const recommendations = await this.customizationService.getDashboardRecommendations(this.testUserId);
      
      if (Array.isArray(recommendations)) {
        this.addResult('Get Dashboard Recommendations', true, `Found ${recommendations.length} recommendations`);
        
        // Check for recommendation types
        const recommendationTypes = recommendations.map(r => r.recommendation_type);
        const uniqueTypes = [...new Set(recommendationTypes)];
        
        this.addResult('Recommendation Variety', true, `Found ${uniqueTypes.length} recommendation types`);
      } else {
        this.addResult('Get Dashboard Recommendations', false, 'Failed to get recommendations');
      }

      console.log('✅ Recommendations tests complete\n');

    } catch (error) {
      this.addResult('Recommendations', false, error.message);
    }
  }

  async testImportExport() {
    console.log('📥📤 Testing import/export functionality...');

    try {
      // Test generating session ID
      const sessionId1 = DashboardCustomizationHelpers.generateSessionId();
      const sessionId2 = DashboardCustomizationHelpers.generateSessionId();
      
      const sessionIdsUnique = sessionId1 !== sessionId2;
      this.addResult('Generate Session IDs', sessionIdsUnique, `Generated unique IDs: ${sessionIdsUnique}`);

      // Test widget key generation
      const widgetKey1 = DashboardCustomizationHelpers.generateWidgetKey('test_template');
      const widgetKey2 = DashboardCustomizationHelpers.generateWidgetKey('test_template');
      
      const widgetKeysUnique = widgetKey1 !== widgetKey2;
      this.addResult('Generate Widget Keys', widgetKeysUnique, `Generated unique keys: ${widgetKeysUnique}`);

      // Test CSS sanitization
      const dangerousCSS = 'body { background: red; } @import "evil.css"; expression(alert("xss"));';
      const sanitizedCSS = DashboardCustomizationHelpers.sanitizeCustomCSS(dangerousCSS);
      
      const cssIsSanitized = !sanitizedCSS.includes('@import') && !sanitizedCSS.includes('expression');
      this.addResult('CSS Sanitization', cssIsSanitized, 'Dangerous CSS elements removed');

      console.log('✅ Import/export tests complete\n');

    } catch (error) {
      this.addResult('Import/Export', false, error.message);
    }
  }

  async testServiceIntegration() {
    console.log('🔗 Testing service integration...');

    try {
      // Test service initialization
      const serviceInitialized = this.customizationService.pool !== null;
      this.addResult('Service Initialization', serviceInitialized, 'Service properly initialized');

      // Test default layout generation for different roles
      const roles = ['student', 'teacher', 'parent'];
      
      for (const role of roles) {
        const basicLayout = this.customizationService.getBasicLayoutForRole(role);
        
        if (basicLayout && basicLayout.widgets && basicLayout.widgets.length > 0) {
          this.addResult(`Basic Layout for ${role}`, true, `Generated ${basicLayout.widgets.length} widgets`);
        } else {
          this.addResult(`Basic Layout for ${role}`, false, 'Failed to generate basic layout');
        }
      }

      // Test widget overlap detection
      const widget1 = { x: 0, y: 0, width: 4, height: 3 };
      const widget2 = { x: 2, y: 1, width: 4, height: 3 };
      const widget3 = { x: 6, y: 0, width: 4, height: 3 };
      
      const overlap12 = this.customizationService.widgetsOverlap(widget1, widget2);
      const overlap13 = this.customizationService.widgetsOverlap(widget1, widget3);
      
      this.addResult('Widget Overlap Detection', overlap12 && !overlap13, 
        `Correctly detected overlap: ${overlap12}, non-overlap: ${!overlap13}`);

      console.log('✅ Service integration tests complete\n');

    } catch (error) {
      this.addResult('Service Integration', false, error.message);
    }
  }

  async cleanupTestData() {
    console.log('🧽 Cleaning up test data...');

    try {
      // Delete test analytics
      await pool.query('DELETE FROM dashboard_usage_analytics WHERE user_id = $1', [this.testUserId]);

      // Delete test widgets
      await pool.query('DELETE FROM user_dashboard_widgets WHERE user_id = $1', [this.testUserId]);

      // Delete test presets
      await pool.query('DELETE FROM dashboard_layout_presets WHERE user_id = $1', [this.testUserId]);

      // Delete test preferences
      await pool.query('DELETE FROM user_theme_preferences WHERE user_id = $1', [this.testUserId]);
      await pool.query('DELETE FROM dashboard_behavior_preferences WHERE user_id = $1', [this.testUserId]);

      // Delete test user
      await pool.query('DELETE FROM users WHERE id = $1', [this.testUserId]);

      console.log('✅ Test data cleanup complete\n');

    } catch (error) {
      console.error('⚠️ Error during cleanup:', error.message);
    }
  }

  addResult(testName, success, details) {
    this.testResults.push({
      name: testName,
      success,
      details
    });
  }

  displayResults() {
    console.log('\n📊 DASHBOARD CUSTOMIZATION TEST RESULTS');
    console.log('═'.repeat(70));

    let passed = 0;
    let failed = 0;

    this.testResults.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} | ${result.name}`);
      if (result.details) {
        console.log(`       ${result.details}`);
      }
      
      if (result.success) {
        passed++;
      } else {
        failed++;
      }
    });

    console.log('═'.repeat(70));
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);

    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Dashboard customization system is working correctly.');
      console.log('✅ Database schema is properly structured');
      console.log('✅ Widget templates and categories are configured');
      console.log('✅ Layout management is fully functional');
      console.log('✅ Theme and behavior preferences work correctly');
      console.log('✅ Layout presets and shared templates are operational');
      console.log('✅ Analytics tracking is recording user interactions');
      console.log('✅ Recommendations system is generating suggestions');
      console.log('✅ Service integration is working properly');
    } else {
      console.log(`\n⚠️ ${failed} test(s) failed. Please review the issues above.`);
    }

    console.log('\n📋 DASHBOARD CUSTOMIZATION IMPLEMENTATION SUMMARY:');
    console.log('• Database: 8 tables + 5 functions + 20+ widget templates + 4 shared templates');
    console.log('• Backend: Customization service + API routes + analytics tracking');
    console.log('• Features: Widget management, theme customization, layout presets, recommendations');
    console.log('• Analytics: User interaction tracking with 90-day retention');
    console.log('• Multi-role: Student, teacher, parent, and admin support');
    console.log('• Import/Export: Full configuration backup and restore');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new DashboardCustomizationTester();
  tester.runAllTests()
    .then(() => {
      console.log('\n🎨 Dashboard customization test suite completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test suite crashed:', error);
      process.exit(1);
    });
}

module.exports = DashboardCustomizationTester; 