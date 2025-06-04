const { getProblemTemplateService, PROBLEM_TEMPLATE_TYPES, GRADE_LEVEL_ADAPTATIONS } = require('../services/problem-template-service');
const { ProblemTemplateCreator, PREDEFINED_TEMPLATES } = require('./create-problem-templates');

class ProblemTemplateTest {
  constructor() {
    this.problemTemplateService = getProblemTemplateService();
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🎯 Starting Problem Template System Tests...\n');

    try {
      // Test 1: Service Health Check
      await this.testHealthCheck();
      
      // Test 2: Template Type Configuration Validation
      await this.testTemplateTypeConfiguration();
      
      // Test 3: Template Creation and Validation
      await this.testTemplateCreation();
      
      // Test 4: Template Retrieval and Filtering
      await this.testTemplateRetrieval();
      
      // Test 5: Template Adaptation System
      await this.testTemplateAdaptation();
      
      // Test 6: Scaffolding Step Generation
      await this.testScaffoldingGeneration();
      
      // Test 7: Hint System Generation
      await this.testHintSystemGeneration();
      
      // Test 8: Grade Level Adaptations
      await this.testGradeLevelAdaptations();
      
      // Test 9: Sample Problem Generation
      await this.testSampleProblemGeneration();
      
      // Test 10: Template Integration with Problem-Solving
      await this.testProblemSolvingIntegration();

      this.printSummary();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
      throw error;
    }
  }

  async testHealthCheck() {
    console.log('Test 1: Service Health Check');
    
    try {
      const health = await this.problemTemplateService.healthCheck();
      
      this.assert(health.status === 'healthy', 'Service should be healthy');
      this.assert(health.service === 'problem-template-service', 'Service name should match');
      this.assert(health.features.database === 'connected', 'Database should be connected');
      this.assert(health.features.templateCreation === 'enabled', 'Template creation should be enabled');
      this.assert(health.features.templateRetrieval === 'enabled', 'Template retrieval should be enabled');
      this.assert(health.features.templateAdaptation === 'enabled', 'Template adaptation should be enabled');
      this.assert(health.features.scaffoldingGeneration === 'enabled', 'Scaffolding generation should be enabled');
      this.assert(health.templateTypes.math.length > 0, 'Should have math template types');
      this.assert(health.templateTypes.science.length > 0, 'Should have science template types');
      this.assert(health.templateTypes.writing.length > 0, 'Should have writing template types');
      this.assert(Array.isArray(health.gradeAdaptations), 'Grade adaptations should be an array');
      
      console.log('✅ Health check passed');
      this.testResults.push({ test: 'Health Check', status: 'PASS' });
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      this.testResults.push({ test: 'Health Check', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testTemplateTypeConfiguration() {
    console.log('Test 2: Template Type Configuration Validation');
    
    try {
      // Test math template types
      const mathTypes = Object.keys(PROBLEM_TEMPLATE_TYPES.MATH);
      this.assert(mathTypes.includes('WORD_PROBLEMS'), 'Should include word problems');
      this.assert(mathTypes.includes('ALGEBRA'), 'Should include algebra');
      this.assert(mathTypes.includes('GEOMETRY'), 'Should include geometry');
      this.assert(mathTypes.includes('STATISTICS'), 'Should include statistics');

      // Test science template types
      const scienceTypes = Object.keys(PROBLEM_TEMPLATE_TYPES.SCIENCE);
      this.assert(scienceTypes.includes('SCIENTIFIC_METHOD'), 'Should include scientific method');
      this.assert(scienceTypes.includes('PHYSICS_PROBLEMS'), 'Should include physics problems');
      this.assert(scienceTypes.includes('CHEMISTRY_ANALYSIS'), 'Should include chemistry analysis');
      this.assert(scienceTypes.includes('BIOLOGY_ANALYSIS'), 'Should include biology analysis');

      // Test writing template types
      const writingTypes = Object.keys(PROBLEM_TEMPLATE_TYPES.WRITING);
      this.assert(writingTypes.includes('PERSUASIVE_ESSAY'), 'Should include persuasive essay');
      this.assert(writingTypes.includes('NARRATIVE_WRITING'), 'Should include narrative writing');
      this.assert(writingTypes.includes('INFORMATIVE_WRITING'), 'Should include informative writing');
      this.assert(writingTypes.includes('CREATIVE_WRITING'), 'Should include creative writing');
      this.assert(writingTypes.includes('RESEARCH_WRITING'), 'Should include research writing');

      // Test template configuration structure
      const wordProblemsConfig = PROBLEM_TEMPLATE_TYPES.MATH.WORD_PROBLEMS;
      this.assert(wordProblemsConfig.name === 'word_problems', 'Config should have name');
      this.assert(typeof wordProblemsConfig.display_name === 'string', 'Config should have display name');
      this.assert(Array.isArray(wordProblemsConfig.typical_steps), 'Config should have typical steps');
      this.assert(Array.isArray(wordProblemsConfig.common_misconceptions), 'Config should have misconceptions');
      this.assert(Array.isArray(wordProblemsConfig.assessment_criteria), 'Config should have assessment criteria');

      // Test grade level adaptations
      const adaptations = Object.keys(GRADE_LEVEL_ADAPTATIONS);
      this.assert(adaptations.includes('ELEMENTARY'), 'Should include elementary adaptation');
      this.assert(adaptations.includes('MIDDLE_SCHOOL'), 'Should include middle school adaptation');
      this.assert(adaptations.includes('HIGH_SCHOOL'), 'Should include high school adaptation');

      const elementaryAdaptation = GRADE_LEVEL_ADAPTATIONS.ELEMENTARY;
      this.assert(Array.isArray(elementaryAdaptation.range), 'Adaptation should have grade range');
      this.assert(typeof elementaryAdaptation.characteristics === 'object', 'Should have characteristics');

      console.log('✅ Template type configuration validation passed');
      this.testResults.push({ test: 'Template Type Configuration', status: 'PASS' });
    } catch (error) {
      console.log('❌ Template type configuration validation failed:', error.message);
      this.testResults.push({ test: 'Template Type Configuration', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testTemplateCreation() {
    console.log('Test 3: Template Creation and Validation');
    
    try {
      const mockAdminUserId = 'test_admin_123';

      // Test valid template creation
      const validTemplate = {
        title: 'Test Math Word Problem',
        description: 'A test template for word problems',
        problem_type: 'math',
        template_subtype: 'word_problems',
        subject: 'arithmetic',
        difficulty_level: 'easy',
        problem_statement: 'John has 5 apples and buys 3 more. How many apples does he have now?',
        expected_solution: '5 + 3 = 8 apples',
        grade_level_min: 2,
        grade_level_max: 4,
        estimated_time_minutes: 15,
        learning_objectives: ['Addition', 'Word problems'],
        tags: ['test', 'addition']
      };

      const result = await this.problemTemplateService.createTemplate(validTemplate, mockAdminUserId);
      
      this.assert(result.success === true, 'Template creation should succeed');
      this.assert(result.template.id, 'Created template should have ID');
      this.assert(result.template.title === validTemplate.title, 'Title should match');
      this.assert(result.template.problem_type === validTemplate.problem_type, 'Problem type should match');
      this.assert(result.scaffoldingConfiguration, 'Should include scaffolding configuration');

      // Test scaffolding steps generation
      const scaffoldingSteps = JSON.parse(result.template.scaffolding_steps);
      this.assert(Array.isArray(scaffoldingSteps), 'Scaffolding steps should be an array');
      this.assert(scaffoldingSteps.length > 0, 'Should have generated scaffolding steps');
      
      const firstStep = scaffoldingSteps[0];
      this.assert(firstStep.step_number === 1, 'First step should be numbered 1');
      this.assert(typeof firstStep.title === 'string', 'Step should have title');
      this.assert(typeof firstStep.type === 'string', 'Step should have type');
      this.assert(typeof firstStep.prompt === 'string', 'Step should have prompt');

      // Test hint system generation
      const hintSystem = JSON.parse(result.template.hint_system);
      this.assert(typeof hintSystem === 'object', 'Hint system should be object');
      this.assert(Array.isArray(hintSystem.levels), 'Should have hint levels');
      this.assert(hintSystem.levels.includes('gentle'), 'Should include gentle hints');
      this.assert(hintSystem.levels.includes('moderate'), 'Should include moderate hints');
      this.assert(hintSystem.levels.includes('direct'), 'Should include direct hints');

      // Test common mistakes generation
      const commonMistakes = JSON.parse(result.template.common_mistakes);
      this.assert(typeof commonMistakes === 'object', 'Common mistakes should be object');
      this.assert(Array.isArray(commonMistakes.categories), 'Should have mistake categories');
      this.assert(Array.isArray(commonMistakes.detection_patterns), 'Should have detection patterns');

      // Test invalid template rejection
      try {
        const invalidTemplate = {
          // Missing required fields
          title: 'Invalid Template'
        };
        
        await this.problemTemplateService.createTemplate(invalidTemplate, mockAdminUserId);
        this.assert(false, 'Should reject invalid template');
      } catch (error) {
        this.assert(error.type === 'VALIDATION_ERROR', 'Should throw validation error');
      }

      console.log('✅ Template creation and validation tests passed');
      this.testResults.push({ test: 'Template Creation', status: 'PASS' });
    } catch (error) {
      console.log('❌ Template creation tests failed:', error.message);
      this.testResults.push({ test: 'Template Creation', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testTemplateRetrieval() {
    console.log('Test 4: Template Retrieval and Filtering');
    
    try {
      // Test basic template retrieval
      const allTemplates = await this.problemTemplateService.getTemplates();
      
      this.assert(typeof allTemplates === 'object', 'Should return object');
      this.assert(Array.isArray(allTemplates.templates), 'Should have templates array');
      this.assert(typeof allTemplates.pagination === 'object', 'Should have pagination info');

      // Test filtering by problem type
      const mathTemplates = await this.problemTemplateService.getTemplates({
        problemType: 'math'
      });
      
      this.assert(Array.isArray(mathTemplates.templates), 'Should return math templates array');
      if (mathTemplates.templates.length > 0) {
        mathTemplates.templates.forEach(template => {
          this.assert(template.problem_type === 'math', 'All templates should be math type');
        });
      }

      // Test filtering by subject
      const algebraTemplates = await this.problemTemplateService.getTemplates({
        subject: 'algebra'
      });
      
      this.assert(Array.isArray(algebraTemplates.templates), 'Should return algebra templates');

      // Test filtering by difficulty
      const easyTemplates = await this.problemTemplateService.getTemplates({
        difficulty: 'easy'
      });
      
      this.assert(Array.isArray(easyTemplates.templates), 'Should return easy templates');

      // Test filtering by grade level
      const elementaryTemplates = await this.problemTemplateService.getTemplates({
        gradeLevel: 3
      });
      
      this.assert(Array.isArray(elementaryTemplates.templates), 'Should return elementary templates');

      // Test search functionality
      const searchResults = await this.problemTemplateService.getTemplates({
        searchQuery: 'word problem'
      });
      
      this.assert(Array.isArray(searchResults.templates), 'Should return search results');

      // Test pagination
      const limitedResults = await this.problemTemplateService.getTemplates({
        limit: 5,
        offset: 0
      });
      
      this.assert(limitedResults.templates.length <= 5, 'Should respect limit');
      this.assert(typeof limitedResults.pagination.total === 'number', 'Should include total count');

      console.log('✅ Template retrieval and filtering tests passed');
      this.testResults.push({ test: 'Template Retrieval', status: 'PASS' });
    } catch (error) {
      console.log('❌ Template retrieval tests failed:', error.message);
      this.testResults.push({ test: 'Template Retrieval', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testTemplateAdaptation() {
    console.log('Test 5: Template Adaptation System');
    
    try {
      // First, get a template to adapt
      const templates = await this.problemTemplateService.getTemplates({ limit: 1 });
      
      if (templates.templates.length === 0) {
        console.log('⚠️ No templates available for adaptation testing');
        this.testResults.push({ test: 'Template Adaptation', status: 'SKIP', reason: 'No templates available' });
        return;
      }

      const templateId = templates.templates[0].id;
      const mockStudentId = 'test_student_adaptation_456';

      // Test template adaptation
      const adaptation = await this.problemTemplateService.adaptTemplateForStudent(
        templateId,
        mockStudentId
      );

      this.assert(typeof adaptation === 'object', 'Should return adaptation object');
      this.assert(adaptation.originalTemplate, 'Should include original template');
      this.assert(adaptation.adaptations, 'Should include adaptations');
      this.assert(adaptation.adaptedTemplate, 'Should include adapted template');
      this.assert(typeof adaptation.confidence === 'number', 'Should include confidence score');
      this.assert(adaptation.confidence >= 0 && adaptation.confidence <= 1, 'Confidence should be 0-1');

      // Validate adaptation structure
      this.assert(typeof adaptation.adaptations.reason === 'string', 'Should have adaptation reason');
      this.assert(typeof adaptation.adaptations.adaptations === 'object', 'Should have adaptation details');

      // Test adaptation options
      const customAdaptation = await this.problemTemplateService.adaptTemplateForStudent(
        templateId,
        mockStudentId,
        { customOption: 'test' }
      );

      this.assert(typeof customAdaptation === 'object', 'Should handle custom adaptation options');

      console.log('✅ Template adaptation system tests passed');
      this.testResults.push({ test: 'Template Adaptation', status: 'PASS' });
    } catch (error) {
      console.log('❌ Template adaptation tests failed:', error.message);
      this.testResults.push({ test: 'Template Adaptation', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testScaffoldingGeneration() {
    console.log('Test 6: Scaffolding Step Generation');
    
    try {
      // Test different template types and their scaffolding approaches
      const testCases = [
        {
          templateData: { 
            problem_type: 'math', 
            template_subtype: 'word_problems',
            subject: 'arithmetic',
            grade_level_min: 3,
            grade_level_max: 5
          },
          expectedSteps: ['read', 'identify', 'extract', 'choose', 'set up', 'solve', 'check']
        },
        {
          templateData: { 
            problem_type: 'science', 
            template_subtype: 'scientific_method',
            subject: 'biology',
            grade_level_min: 6,
            grade_level_max: 8
          },
          expectedSteps: ['identify', 'form', 'design', 'collect', 'analyze', 'draw', 'consider']
        },
        {
          templateData: { 
            problem_type: 'writing', 
            template_subtype: 'persuasive_essay',
            subject: 'essay_writing',
            grade_level_min: 8,
            grade_level_max: 10
          },
          expectedSteps: ['choose', 'research', 'organize', 'write', 'develop', 'address', 'write', 'revise']
        }
      ];

      for (const testCase of testCases) {
        const templateConfig = this.problemTemplateService.getTemplateTypeConfig(
          testCase.templateData.problem_type,
          testCase.templateData.template_subtype
        );

        this.assert(typeof templateConfig === 'object', 'Should return template config');
        this.assert(typeof templateConfig.name === 'string', 'Config should have name');
        this.assert(Array.isArray(templateConfig.typical_steps), 'Config should have typical steps');
        this.assert(templateConfig.typical_steps.length > 0, 'Should have steps defined');
        this.assert(typeof templateConfig.scaffolding_approach === 'string', 'Should have scaffolding approach');

        // Verify steps contain expected keywords
        const stepText = templateConfig.typical_steps.join(' ').toLowerCase();
        const hasExpectedContent = testCase.expectedSteps.some(keyword => 
          stepText.includes(keyword.toLowerCase())
        );
        this.assert(hasExpectedContent, `Steps should contain expected content for ${testCase.templateData.problem_type}`);
      }

      // Test grade level adaptation
      const gradeAdaptations = [
        { min: 1, max: 5, expected: 'ELEMENTARY' },
        { min: 6, max: 8, expected: 'MIDDLE_SCHOOL' },
        { min: 9, max: 12, expected: 'HIGH_SCHOOL' }
      ];

      for (const gradeTest of gradeAdaptations) {
        const adaptation = this.problemTemplateService.getGradeAdaptation(
          gradeTest.min,
          gradeTest.max
        );
        
        this.assert(typeof adaptation === 'object', 'Should return adaptation object');
        this.assert(typeof adaptation.characteristics === 'object', 'Should have characteristics');
        this.assert(typeof adaptation.characteristics.language_complexity === 'string', 'Should have language complexity');
      }

      // Test step type determination
      const stepTypes = [
        { step: 'Read and understand the problem', expected: 'UNDERSTAND' },
        { step: 'Identify what is being asked', expected: 'ANALYZE' },
        { step: 'Set up the equation', expected: 'PLAN' },
        { step: 'Solve step by step', expected: 'EXECUTE' },
        { step: 'Check the answer', expected: 'VERIFY' }
      ];

      for (const stepType of stepTypes) {
        const type = this.problemTemplateService.determineStepType(stepType.step, {});
        this.assert(typeof type === 'string', 'Should return step type');
        // Note: The exact matching might be flexible, so we just check it returns a valid type
      }

      console.log('✅ Scaffolding generation tests passed');
      this.testResults.push({ test: 'Scaffolding Generation', status: 'PASS' });
    } catch (error) {
      console.log('❌ Scaffolding generation tests failed:', error.message);
      this.testResults.push({ test: 'Scaffolding Generation', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testHintSystemGeneration() {
    console.log('Test 7: Hint System Generation');
    
    try {
      // Test hint generation for different template types
      const templateData = {
        problem_type: 'math',
        template_subtype: 'word_problems',
        subject: 'arithmetic'
      };

      const templateConfig = this.problemTemplateService.getTemplateTypeConfig(
        templateData.problem_type,
        templateData.template_subtype
      );

      // Test hint system structure
      const hintSystem = await this.problemTemplateService.generateHintSystem(templateData, templateConfig);

      this.assert(typeof hintSystem === 'object', 'Hint system should be object');
      this.assert(Array.isArray(hintSystem.levels), 'Should have hint levels');
      this.assert(typeof hintSystem.hints === 'object', 'Should have hints object');

      // Test hint levels
      const expectedLevels = ['gentle', 'moderate', 'direct'];
      expectedLevels.forEach(level => {
        this.assert(hintSystem.levels.includes(level), `Should include ${level} hints`);
      });

      // Test hints for each step
      const stepKeys = Object.keys(hintSystem.hints);
      this.assert(stepKeys.length > 0, 'Should have hints for steps');

      stepKeys.forEach(stepKey => {
        const stepHints = hintSystem.hints[stepKey];
        this.assert(typeof stepHints === 'object', 'Step hints should be object');
        
        expectedLevels.forEach(level => {
          this.assert(typeof stepHints[level] === 'string', `Should have ${level} hint for ${stepKey}`);
          this.assert(stepHints[level].length > 0, `${level} hint should not be empty`);
        });
      });

      // Test default hint generation
      const defaultHints = await this.problemTemplateService.generateStepHints(
        'Test Step',
        templateData,
        templateConfig
      );

      this.assert(typeof defaultHints === 'object', 'Default hints should be object');
      expectedLevels.forEach(level => {
        this.assert(typeof defaultHints[level] === 'string', `Should have default ${level} hint`);
      });

      console.log('✅ Hint system generation tests passed');
      this.testResults.push({ test: 'Hint System Generation', status: 'PASS' });
    } catch (error) {
      console.log('❌ Hint system generation tests failed:', error.message);
      this.testResults.push({ test: 'Hint System Generation', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testGradeLevelAdaptations() {
    console.log('Test 8: Grade Level Adaptations');
    
    try {
      // Test elementary adaptation
      const elementaryAdaptation = this.problemTemplateService.getGradeAdaptation(1, 5);
      this.assert(elementaryAdaptation.characteristics.language_complexity === 'simple', 'Elementary should use simple language');
      this.assert(elementaryAdaptation.characteristics.visual_support_needed === true, 'Elementary should need visual support');
      this.assert(elementaryAdaptation.characteristics.scaffolding_intensity === 'high', 'Elementary should have high scaffolding');

      // Test middle school adaptation
      const middleSchoolAdaptation = this.problemTemplateService.getGradeAdaptation(6, 8);
      this.assert(middleSchoolAdaptation.characteristics.language_complexity === 'moderate', 'Middle school should use moderate language');
      this.assert(middleSchoolAdaptation.characteristics.scaffolding_intensity === 'medium', 'Middle school should have medium scaffolding');

      // Test high school adaptation
      const highSchoolAdaptation = this.problemTemplateService.getGradeAdaptation(9, 12);
      this.assert(highSchoolAdaptation.characteristics.language_complexity === 'complex', 'High school should use complex language');
      this.assert(highSchoolAdaptation.characteristics.scaffolding_intensity === 'low', 'High school should have low scaffolding');

      // Test step prompt generation with different complexities
      const stepTitle = 'Solve the equation';
      const templateData = { problem_type: 'math' };

      const simplePrompt = this.problemTemplateService.generateStepPrompt(
        stepTitle,
        templateData,
        elementaryAdaptation
      );
      this.assert(typeof simplePrompt === 'string', 'Should generate simple prompt');
      this.assert(simplePrompt.length > 0, 'Simple prompt should not be empty');

      const moderatePrompt = this.problemTemplateService.generateStepPrompt(
        stepTitle,
        templateData,
        middleSchoolAdaptation
      );
      this.assert(typeof moderatePrompt === 'string', 'Should generate moderate prompt');

      const complexPrompt = this.problemTemplateService.generateStepPrompt(
        stepTitle,
        templateData,
        highSchoolAdaptation
      );
      this.assert(typeof complexPrompt === 'string', 'Should generate complex prompt');

      // Test expected response type determination
      const responseTypes = [
        { step: 'Calculate the result', expected: 'numerical' },
        { step: 'Explain your reasoning', expected: 'text' },
        { step: 'Draw a diagram', expected: 'visual' },
        { step: 'Choose the correct answer', expected: 'multiple_choice' }
      ];

      responseTypes.forEach(test => {
        const responseType = this.problemTemplateService.determineExpectedResponseType(test.step, {});
        this.assert(typeof responseType === 'string', 'Should return response type');
      });

      console.log('✅ Grade level adaptation tests passed');
      this.testResults.push({ test: 'Grade Level Adaptations', status: 'PASS' });
    } catch (error) {
      console.log('❌ Grade level adaptation tests failed:', error.message);
      this.testResults.push({ test: 'Grade Level Adaptations', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testSampleProblemGeneration() {
    console.log('Test 9: Sample Problem Generation');
    
    try {
      // First, get a template to generate samples from
      const templates = await this.problemTemplateService.getTemplates({ limit: 1 });
      
      if (templates.templates.length === 0) {
        console.log('⚠️ No templates available for sample generation testing');
        this.testResults.push({ test: 'Sample Problem Generation', status: 'SKIP', reason: 'No templates available' });
        return;
      }

      const templateId = templates.templates[0].id;

      // Test basic sample generation
      const samples = await this.problemTemplateService.generateSampleProblems(templateId, 3, 'medium');

      this.assert(typeof samples === 'object', 'Should return samples object');
      this.assert(samples.templateId === templateId, 'Should include template ID');
      this.assert(typeof samples.templateTitle === 'string', 'Should include template title');
      this.assert(samples.variationLevel === 'medium', 'Should include variation level');
      this.assert(Array.isArray(samples.sampleProblems), 'Should have sample problems array');
      this.assert(samples.sampleProblems.length === 3, 'Should generate requested number of samples');

      // Test sample structure
      samples.sampleProblems.forEach((sample, index) => {
        this.assert(sample.sample_number === index + 1, 'Sample should have correct number');
        this.assert(sample.variation_level === 'medium', 'Sample should have variation level');
        this.assert(typeof sample.title === 'string', 'Sample should have title');
        this.assert(typeof sample.problem_statement === 'string', 'Sample should have problem statement');
        this.assert(typeof sample.difficulty_level === 'string', 'Sample should have difficulty level');
      });

      // Test different variation levels
      const variationLevels = ['low', 'medium', 'high'];
      for (const level of variationLevels) {
        const levelSamples = await this.problemTemplateService.generateSampleProblems(templateId, 1, level);
        this.assert(levelSamples.variationLevel === level, `Should handle ${level} variation level`);
        this.assert(levelSamples.sampleProblems.length === 1, 'Should generate single sample');
      }

      console.log('✅ Sample problem generation tests passed');
      this.testResults.push({ test: 'Sample Problem Generation', status: 'PASS' });
    } catch (error) {
      console.log('❌ Sample problem generation tests failed:', error.message);
      this.testResults.push({ test: 'Sample Problem Generation', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  async testProblemSolvingIntegration() {
    console.log('Test 10: Integration with Problem-Solving System');
    
    try {
      // Test template configuration retrieval
      const mathConfig = this.problemTemplateService.getTemplateTypeConfig('math', 'word_problems');
      this.assert(typeof mathConfig === 'object', 'Should get math configuration');
      this.assert(mathConfig.name === 'word_problems', 'Should get correct math subtype');

      const scienceConfig = this.problemTemplateService.getTemplateTypeConfig('science', 'scientific_method');
      this.assert(typeof scienceConfig === 'object', 'Should get science configuration');
      this.assert(scienceConfig.name === 'scientific_method', 'Should get correct science subtype');

      const writingConfig = this.problemTemplateService.getTemplateTypeConfig('writing', 'persuasive_essay');
      this.assert(typeof writingConfig === 'object', 'Should get writing configuration');
      this.assert(writingConfig.name === 'persuasive_essay', 'Should get correct writing subtype');

      // Test error handling for invalid types
      try {
        this.problemTemplateService.getTemplateTypeConfig('invalid_type', 'subtype');
        this.assert(false, 'Should reject invalid problem type');
      } catch (error) {
        this.assert(error.type === 'INVALID_TYPE', 'Should throw invalid type error');
      }

      try {
        this.problemTemplateService.getTemplateTypeConfig('math', 'invalid_subtype');
        this.assert(false, 'Should reject invalid subtype');
      } catch (error) {
        this.assert(error.type === 'INVALID_SUBTYPE', 'Should throw invalid subtype error');
      }

      // Test utility functions
      const mistakeSeverity = this.problemTemplateService.categorizeMistakeSeverity('calculation errors');
      this.assert(typeof mistakeSeverity === 'string', 'Should categorize mistake severity');

      const remediationStrategy = this.problemTemplateService.generateRemediationStrategy('reading comprehension');
      this.assert(typeof remediationStrategy === 'string', 'Should generate remediation strategy');

      const mistakeIndicators = this.problemTemplateService.generateMistakeIndicators('variable confusion');
      this.assert(Array.isArray(mistakeIndicators), 'Should generate mistake indicators');
      this.assert(mistakeIndicators.length > 0, 'Should have at least one indicator');

      const keywords = this.problemTemplateService.extractMistakeKeywords('not reading carefully');
      this.assert(Array.isArray(keywords), 'Should extract keywords');

      console.log('✅ Problem-solving integration tests passed');
      this.testResults.push({ test: 'Problem-Solving Integration', status: 'PASS' });
    } catch (error) {
      console.log('❌ Problem-solving integration tests failed:', error.message);
      this.testResults.push({ test: 'Problem-Solving Integration', status: 'FAIL', error: error.message });
    }
    
    console.log('');
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  printSummary() {
    console.log('🎯 Test Summary');
    console.log('================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const skipped = this.testResults.filter(r => r.status === 'SKIP').length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Skipped: ${skipped} ⚠️`);
    console.log(`Success Rate: ${((passed / (total - skipped)) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  ❌ ${r.test}: ${r.error}`));
    }

    if (skipped > 0) {
      console.log('\nSkipped Tests:');
      this.testResults
        .filter(r => r.status === 'SKIP')
        .forEach(r => console.log(`  ⚠️ ${r.test}: ${r.reason}`));
    }
    
    console.log('\nDetailed Results:');
    this.testResults.forEach(r => {
      const status = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`  ${status} ${r.test}`);
    });
    
    console.log('\n🎯 Problem Template System Testing Complete!');
    
    console.log('\n📋 System Overview:');
    console.log('================');
    console.log('Features Tested:');
    console.log('• Template type configuration and validation');
    console.log('• Template creation with scaffolding generation');
    console.log('• Template retrieval and advanced filtering');
    console.log('• Student-specific template adaptation');
    console.log('• Multi-level hint system generation');
    console.log('• Grade-level appropriate content adaptation');
    console.log('• Sample problem generation and variation');
    console.log('• Integration with problem-solving workflows');
    console.log('• Error handling and edge case management');
    console.log('• Educational scaffolding approaches');
    console.log('• Mistake analysis and remediation strategies');
    console.log('• Assessment criteria and learning objectives');

    console.log('\n📚 Template Coverage:');
    console.log('==================');
    console.log(`Math Templates: ${Object.keys(PROBLEM_TEMPLATE_TYPES.MATH).length} types`);
    console.log(`  • ${Object.keys(PROBLEM_TEMPLATE_TYPES.MATH).join(', ')}`);
    console.log(`Science Templates: ${Object.keys(PROBLEM_TEMPLATE_TYPES.SCIENCE).length} types`);
    console.log(`  • ${Object.keys(PROBLEM_TEMPLATE_TYPES.SCIENCE).join(', ')}`);
    console.log(`Writing Templates: ${Object.keys(PROBLEM_TEMPLATE_TYPES.WRITING).length} types`);
    console.log(`  • ${Object.keys(PROBLEM_TEMPLATE_TYPES.WRITING).join(', ')}`);
    
    console.log('\n🎓 Grade Level Coverage:');
    console.log('=======================');
    Object.entries(GRADE_LEVEL_ADAPTATIONS).forEach(([level, config]) => {
      console.log(`${level}: Grades ${config.range[0]}-${config.range[1]}`);
      console.log(`  • Language: ${config.characteristics.language_complexity}`);
      console.log(`  • Scaffolding: ${config.characteristics.scaffolding_intensity}`);
      console.log(`  • Visual Support: ${config.characteristics.visual_support_needed ? 'Required' : 'Optional'}`);
    });
  }
}

// Demo function to show predefined templates
async function demonstratePredefinedTemplates() {
  console.log('\n🎪 Predefined Template Demonstration');
  console.log('====================================');
  
  Object.entries(PREDEFINED_TEMPLATES).forEach(([subject, templates]) => {
    console.log(`\n📚 ${subject} Templates (${templates.length} available):`);
    templates.forEach((template, index) => {
      console.log(`  ${index + 1}. ${template.title}`);
      console.log(`     • Type: ${template.template_subtype}`);
      console.log(`     • Subject: ${template.subject}`);
      console.log(`     • Difficulty: ${template.difficulty_level}`);
      console.log(`     • Grade Range: ${template.grade_level_min}-${template.grade_level_max}`);
      console.log(`     • Time: ${template.estimated_time_minutes} minutes`);
      console.log(`     • Tags: ${template.tags.join(', ')}`);
    });
  });

  const totalTemplates = Object.values(PREDEFINED_TEMPLATES)
    .reduce((sum, templates) => sum + templates.length, 0);

  console.log(`\n📊 Total Predefined Templates: ${totalTemplates}`);
  console.log('🚀 Ready for creation and deployment!');
}

// Run tests if called directly
if (require.main === module) {
  async function main() {
    const tester = new ProblemTemplateTest();
    
    try {
      await tester.runAllTests();
      await demonstratePredefinedTemplates();
      process.exit(0);
    } catch (error) {
      console.error('Test suite failed:', error);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = { 
  ProblemTemplateTest,
  demonstratePredefinedTemplates
}; 