const { Pool } = require('pg');
const { getAIService } = require('./ai-service');
const { scaffoldingEngine } = require('./scaffolding-engine');
const { activityMonitor } = require('./activity-monitor');

// Problem Template Types with detailed configurations
const PROBLEM_TEMPLATE_TYPES = {
  MATH: {
    WORD_PROBLEMS: {
      name: 'word_problems',
      display_name: 'Math Word Problems',
      description: 'Multi-step word problems requiring mathematical reasoning',
      typical_steps: [
        'Read and understand the problem',
        'Identify what is being asked',
        'Extract given information',
        'Choose appropriate operations',
        'Set up the equation or calculation',
        'Solve step by step',
        'Check the answer for reasonableness'
      ],
      scaffolding_approach: 'guided_discovery',
      common_misconceptions: [
        'Not reading the problem carefully',
        'Using wrong operations',
        'Misinterpreting key words',
        'Calculation errors',
        'Not checking if answer makes sense'
      ],
      assessment_criteria: ['problem_comprehension', 'mathematical_reasoning', 'calculation_accuracy', 'solution_verification']
    },
    ALGEBRA: {
      name: 'algebra',
      display_name: 'Algebraic Problem Solving',
      description: 'Solving equations and working with variables',
      typical_steps: [
        'Identify the variable to solve for',
        'Understand the relationship being described',
        'Set up the equation',
        'Apply algebraic operations to isolate the variable',
        'Check the solution',
        'Interpret the result in context'
      ],
      scaffolding_approach: 'procedural_guidance',
      common_misconceptions: [
        'Confusing variables with numbers',
        'Incorrect order of operations',
        'Not maintaining equation balance',
        'Sign errors when moving terms',
        'Not checking solutions'
      ],
      assessment_criteria: ['equation_setup', 'algebraic_manipulation', 'solution_accuracy', 'verification']
    },
    GEOMETRY: {
      name: 'geometry',
      display_name: 'Geometric Reasoning',
      description: 'Visual-spatial problems involving shapes, measurements, and proofs',
      typical_steps: [
        'Visualize or draw the geometric situation',
        'Identify relevant geometric properties',
        'Apply appropriate formulas or theorems',
        'Perform calculations',
        'Verify using geometric reasoning'
      ],
      scaffolding_approach: 'visual_spatial',
      common_misconceptions: [
        'Incorrect formula application',
        'Misunderstanding of geometric properties',
        'Unit conversion errors',
        'Not using diagrams effectively',
        'Confusing similar geometric concepts'
      ],
      assessment_criteria: ['spatial_visualization', 'formula_application', 'geometric_reasoning', 'precision']
    },
    STATISTICS: {
      name: 'statistics',
      display_name: 'Statistical Analysis',
      description: 'Data analysis, probability, and statistical reasoning',
      typical_steps: [
        'Examine and organize the data',
        'Identify the type of analysis needed',
        'Apply appropriate statistical methods',
        'Calculate statistical measures',
        'Interpret results in context',
        'Draw valid conclusions'
      ],
      scaffolding_approach: 'data_driven',
      common_misconceptions: [
        'Confusing correlation with causation',
        'Misinterpreting statistical measures',
        'Sampling bias',
        'Incorrect probability calculations',
        'Overgeneralizing from limited data'
      ],
      assessment_criteria: ['data_interpretation', 'statistical_reasoning', 'calculation_accuracy', 'contextual_understanding']
    }
  },
  SCIENCE: {
    SCIENTIFIC_METHOD: {
      name: 'scientific_method',
      display_name: 'Scientific Investigation',
      description: 'Designing and conducting scientific investigations',
      typical_steps: [
        'Identify the scientific question',
        'Form a testable hypothesis',
        'Design a controlled experiment',
        'Collect and record data',
        'Analyze results',
        'Draw conclusions',
        'Consider limitations and future research'
      ],
      scaffolding_approach: 'inquiry_based',
      common_misconceptions: [
        'Confusing observation with inference',
        'Not controlling variables properly',
        'Bias in data collection',
        'Misunderstanding correlation vs causation',
        'Drawing conclusions beyond the data'
      ],
      assessment_criteria: ['hypothesis_formation', 'experimental_design', 'data_collection', 'analysis_skills', 'scientific_reasoning']
    },
    PHYSICS_PROBLEMS: {
      name: 'physics_problems',
      display_name: 'Physics Problem Solving',
      description: 'Quantitative physics problems involving motion, forces, energy',
      typical_steps: [
        'Understand the physical situation',
        'Identify relevant physics principles',
        'Draw diagrams and define variables',
        'Apply appropriate equations',
        'Solve mathematically',
        'Check units and reasonableness'
      ],
      scaffolding_approach: 'conceptual_mathematical',
      common_misconceptions: [
        'Memorizing formulas without understanding',
        'Incorrect free body diagrams',
        'Unit inconsistencies',
        'Misapplying conservation laws',
        'Not considering reference frames'
      ],
      assessment_criteria: ['conceptual_understanding', 'mathematical_application', 'diagram_accuracy', 'problem_solving_strategy']
    },
    CHEMISTRY_ANALYSIS: {
      name: 'chemistry_analysis',
      display_name: 'Chemical Problem Solving',
      description: 'Stoichiometry, reaction analysis, and chemical calculations',
      typical_steps: [
        'Understand the chemical process',
        'Write balanced chemical equations',
        'Identify given and unknown quantities',
        'Use stoichiometric relationships',
        'Perform calculations with proper units',
        'Verify chemical reasonableness'
      ],
      scaffolding_approach: 'sequential_logical',
      common_misconceptions: [
        'Not balancing equations properly',
        'Mole concept confusion',
        'Unit conversion errors',
        'Misunderstanding limiting reagents',
        'Incorrect significant figures'
      ],
      assessment_criteria: ['chemical_understanding', 'equation_balancing', 'stoichiometric_calculations', 'unit_management']
    },
    BIOLOGY_ANALYSIS: {
      name: 'biology_analysis',
      display_name: 'Biological System Analysis',
      description: 'Understanding biological processes and systems',
      typical_steps: [
        'Identify the biological system or process',
        'Analyze structure-function relationships',
        'Consider different scales of organization',
        'Apply biological principles',
        'Predict outcomes or consequences',
        'Connect to broader biological concepts'
      ],
      scaffolding_approach: 'systems_thinking',
      common_misconceptions: [
        'Anthropomorphizing biological processes',
        'Misunderstanding scale relationships',
        'Confusing cause and effect',
        'Oversimplifying complex systems',
        'Not considering environmental factors'
      ],
      assessment_criteria: ['systems_understanding', 'structure_function_analysis', 'biological_reasoning', 'concept_integration']
    }
  },
  WRITING: {
    PERSUASIVE_ESSAY: {
      name: 'persuasive_essay',
      display_name: 'Persuasive Writing',
      description: 'Argumentative essays that persuade readers to adopt a viewpoint',
      typical_steps: [
        'Choose and narrow your position',
        'Research and gather evidence',
        'Organize arguments logically',
        'Write a compelling introduction',
        'Develop body paragraphs with evidence',
        'Address counterarguments',
        'Write a strong conclusion',
        'Revise for clarity and impact'
      ],
      scaffolding_approach: 'structured_argumentation',
      common_misconceptions: [
        'Weak or unclear thesis statements',
        'Insufficient evidence support',
        'Logical fallacies in reasoning',
        'Not addressing counterarguments',
        'Poor paragraph organization'
      ],
      assessment_criteria: ['thesis_clarity', 'evidence_quality', 'logical_organization', 'persuasive_techniques', 'language_effectiveness']
    },
    NARRATIVE_WRITING: {
      name: 'narrative_writing',
      display_name: 'Narrative Writing',
      description: 'Storytelling that engages readers through character and plot',
      typical_steps: [
        'Develop your story concept',
        'Create compelling characters',
        'Establish setting and context',
        'Plan the plot structure',
        'Write engaging opening',
        'Develop conflict and resolution',
        'Craft satisfying conclusion',
        'Revise for voice and style'
      ],
      scaffolding_approach: 'creative_structured',
      common_misconceptions: [
        'Weak character development',
        'Unclear plot progression',
        'Inconsistent point of view',
        'Lack of sensory details',
        'Rushed or unclear endings'
      ],
      assessment_criteria: ['character_development', 'plot_structure', 'descriptive_language', 'narrative_voice', 'engagement_factor']
    },
    INFORMATIVE_WRITING: {
      name: 'informative_writing',
      display_name: 'Informative/Explanatory Writing',
      description: 'Clear, factual writing that informs or explains topics',
      typical_steps: [
        'Choose and narrow your topic',
        'Research credible sources',
        'Organize information logically',
        'Write clear introduction',
        'Develop informative body paragraphs',
        'Use transitions between ideas',
        'Summarize key points',
        'Cite sources appropriately'
      ],
      scaffolding_approach: 'information_organization',
      common_misconceptions: [
        'Including personal opinions inappropriately',
        'Poor source credibility',
        'Unclear organization',
        'Lack of supporting details',
        'Inadequate citations'
      ],
      assessment_criteria: ['factual_accuracy', 'organization_clarity', 'source_integration', 'explanatory_effectiveness', 'audience_awareness']
    },
    CREATIVE_WRITING: {
      name: 'creative_writing',
      display_name: 'Creative Expression',
      description: 'Original creative pieces including poetry, short stories, and scripts',
      typical_steps: [
        'Explore your creative inspiration',
        'Choose appropriate form and style',
        'Experiment with literary devices',
        'Develop unique voice and perspective',
        'Create rough draft',
        'Focus on imagery and language',
        'Revise for artistic effect',
        'Polish final presentation'
      ],
      scaffolding_approach: 'artistic_exploration',
      common_misconceptions: [
        'Forcing creativity rather than developing it',
        'Ignoring form and structure',
        'Overusing clichés',
        'Weak sensory imagery',
        'Not revising for artistic impact'
      ],
      assessment_criteria: ['creativity_originality', 'literary_techniques', 'voice_development', 'artistic_expression', 'technical_skill']
    },
    RESEARCH_WRITING: {
      name: 'research_writing',
      display_name: 'Research and Analysis',
      description: 'Academic writing that synthesizes multiple sources',
      typical_steps: [
        'Develop focused research question',
        'Conduct systematic literature review',
        'Evaluate source credibility',
        'Synthesize multiple perspectives',
        'Organize findings thematically',
        'Develop original analysis',
        'Document sources meticulously',
        'Present balanced conclusions'
      ],
      scaffolding_approach: 'academic_inquiry',
      common_misconceptions: [
        'Relying on unreliable sources',
        'Summarizing instead of synthesizing',
        'Plagiarism or improper citation',
        'Bias toward confirming beliefs',
        'Weak thesis or research question'
      ],
      assessment_criteria: ['research_quality', 'source_integration', 'analytical_depth', 'citation_accuracy', 'scholarly_voice']
    }
  }
};

// Grade level adaptations for templates
const GRADE_LEVEL_ADAPTATIONS = {
  ELEMENTARY: {
    range: [1, 5],
    characteristics: {
      concrete_thinking: true,
      visual_support_needed: true,
      step_breakdown: 'very_detailed',
      language_complexity: 'simple',
      attention_span: 'short',
      scaffolding_intensity: 'high'
    }
  },
  MIDDLE_SCHOOL: {
    range: [6, 8],
    characteristics: {
      abstract_thinking_developing: true,
      visual_support_helpful: true,
      step_breakdown: 'detailed',
      language_complexity: 'moderate',
      attention_span: 'medium',
      scaffolding_intensity: 'medium'
    }
  },
  HIGH_SCHOOL: {
    range: [9, 12],
    characteristics: {
      abstract_thinking: true,
      visual_support_optional: true,
      step_breakdown: 'guided',
      language_complexity: 'complex',
      attention_span: 'long',
      scaffolding_intensity: 'low'
    }
  }
};

// Template error handling
class ProblemTemplateError extends Error {
  constructor(message, type, details = {}) {
    super(message);
    this.name = 'ProblemTemplateError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class ProblemTemplateService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    this.aiService = getAIService();
  }

  // ============================================
  // TEMPLATE CREATION AND MANAGEMENT
  // ============================================

  // Create a new problem template
  async createTemplate(templateData, createdBy) {
    try {
      const client = await this.pool.connect();
      
      try {
        // Validate template data
        this.validateTemplateData(templateData);

        // Get template type configuration
        const templateConfig = this.getTemplateTypeConfig(templateData.problem_type, templateData.template_subtype);
        
        // Generate scaffolding steps based on template type
        const scaffoldingSteps = await this.generateScaffoldingSteps(templateData, templateConfig);
        
        // Generate hint system
        const hintSystem = await this.generateHintSystem(templateData, templateConfig);
        
        // Generate common mistakes data
        const commonMistakes = this.generateCommonMistakes(templateConfig);

        // Insert template into database
        const insertQuery = `
          INSERT INTO problem_templates (
            title, description, problem_type, subject, difficulty_level,
            problem_statement, problem_data, solution_approach, expected_solution,
            scaffolding_steps, hint_system, common_mistakes,
            learning_objectives, prerequisite_skills, bloom_taxonomy_level,
            grade_level_min, grade_level_max, estimated_time_minutes,
            created_by, tags, keywords
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
          RETURNING *
        `;

        const values = [
          templateData.title,
          templateData.description,
          templateData.problem_type,
          templateData.subject,
          templateData.difficulty_level,
          templateData.problem_statement,
          JSON.stringify(templateData.problem_data || {}),
          templateData.solution_approach || templateConfig.scaffolding_approach,
          templateData.expected_solution,
          JSON.stringify(scaffoldingSteps),
          JSON.stringify(hintSystem),
          JSON.stringify(commonMistakes),
          templateData.learning_objectives || [],
          templateData.prerequisite_skills || [],
          templateData.bloom_taxonomy_level || 'apply',
          templateData.grade_level_min || 1,
          templateData.grade_level_max || 12,
          templateData.estimated_time_minutes || 30,
          createdBy,
          templateData.tags || [],
          templateData.keywords || []
        ];

        const result = await client.query(insertQuery, values);
        const template = result.rows[0];

        // Log template creation
        await activityMonitor.logActivity({
          studentId: createdBy,
          sessionId: `template_creation_${Date.now()}`,
          activityType: 'problem_template_created',
          details: {
            templateId: template.id,
            problemType: template.problem_type,
            subject: template.subject,
            difficultyLevel: template.difficulty_level
          },
          severity: 'low'
        });

        return {
          success: true,
          template,
          scaffoldingConfiguration: templateConfig,
          message: 'Problem template created successfully'
        };

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error creating problem template:', error);
      throw new ProblemTemplateError(
        'Failed to create problem template',
        'CREATION_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Get template type configuration
  getTemplateTypeConfig(problemType, subtype) {
    const typeMap = {
      'math': PROBLEM_TEMPLATE_TYPES.MATH,
      'science': PROBLEM_TEMPLATE_TYPES.SCIENCE,
      'writing': PROBLEM_TEMPLATE_TYPES.WRITING
    };

    const typeTemplates = typeMap[problemType];
    if (!typeTemplates) {
      throw new ProblemTemplateError(
        `Unsupported problem type: ${problemType}`,
        'INVALID_TYPE'
      );
    }

    // If subtype is specified, return specific template config
    if (subtype) {
      const subtypeKey = subtype.toUpperCase();
      const config = typeTemplates[subtypeKey];
      if (!config) {
        throw new ProblemTemplateError(
          `Unsupported subtype ${subtype} for type ${problemType}`,
          'INVALID_SUBTYPE'
        );
      }
      return config;
    }

    // Return a general config for the type
    const subtypes = Object.values(typeTemplates);
    return subtypes[0] || typeTemplates.WORD_PROBLEMS || typeTemplates.SCIENTIFIC_METHOD || typeTemplates.PERSUASIVE_ESSAY;
  }

  // Generate scaffolding steps based on template configuration
  async generateScaffoldingSteps(templateData, templateConfig) {
    const steps = [];
    const gradeAdaptation = this.getGradeAdaptation(templateData.grade_level_min, templateData.grade_level_max);

    for (let i = 0; i < templateConfig.typical_steps.length; i++) {
      const stepTitle = templateConfig.typical_steps[i];
      
      // Generate step-specific scaffolding guidance
      const scaffoldingGuidance = await this.generateStepGuidance(
        stepTitle,
        templateData,
        templateConfig,
        gradeAdaptation,
        i + 1
      );

      steps.push({
        step_number: i + 1,
        title: stepTitle,
        type: this.determineStepType(stepTitle, templateConfig),
        prompt: this.generateStepPrompt(stepTitle, templateData, gradeAdaptation),
        expected_response_type: this.determineExpectedResponseType(stepTitle, templateConfig),
        scaffolding_guidance: scaffoldingGuidance,
        hints: await this.generateStepHints(stepTitle, templateData, templateConfig),
        common_errors: this.getStepCommonErrors(stepTitle, templateConfig),
        assessment_criteria: this.getStepAssessmentCriteria(stepTitle, templateConfig)
      });
    }

    return steps;
  }

  // Generate step-specific guidance using AI
  async generateStepGuidance(stepTitle, templateData, templateConfig, gradeAdaptation, stepNumber) {
    try {
      const prompt = `
        Generate educational scaffolding guidance for step ${stepNumber} of a ${templateData.problem_type} problem.
        
        Step: ${stepTitle}
        Problem Type: ${templateConfig.name}
        Subject: ${templateData.subject}
        Grade Level: ${templateData.grade_level_min}-${templateData.grade_level_max}
        Difficulty: ${templateData.difficulty_level}
        
        Scaffolding Approach: ${templateConfig.scaffolding_approach}
        
        Generate guidance that:
        1. Helps students understand what this step involves
        2. Provides strategies for completing this step
        3. Offers encouragement and motivation
        4. Is appropriate for ${gradeAdaptation.characteristics.language_complexity} language complexity
        5. Includes ${gradeAdaptation.characteristics.visual_support_needed ? 'visual support suggestions' : 'conceptual guidance'}
        
        Format as a helpful, encouraging message from a teacher.
      `;

      const response = await this.aiService.generateResponse(prompt, {
        maxTokens: 200,
        temperature: 0.7
      });

      return response.content || `Let's work on ${stepTitle.toLowerCase()}. Take your time and think through this step carefully.`;

    } catch (error) {
      console.error('Error generating step guidance:', error);
      return `Let's work on ${stepTitle.toLowerCase()}. Take your time and think through this step carefully.`;
    }
  }

  // Generate hint system for the template
  async generateHintSystem(templateData, templateConfig) {
    const hintLevels = ['gentle', 'moderate', 'direct'];
    const hintSystem = {
      levels: hintLevels,
      hints: {}
    };

    // Generate hints for each step
    for (let i = 0; i < templateConfig.typical_steps.length; i++) {
      const stepTitle = templateConfig.typical_steps[i];
      const stepHints = {};

      for (const level of hintLevels) {
        try {
          const hintPrompt = `
            Generate a ${level} hint for step: "${stepTitle}"
            Problem type: ${templateConfig.name}
            Subject: ${templateData.subject}
            
            ${level} hint characteristics:
            - gentle: Asks a guiding question or provides general direction
            - moderate: Gives more specific guidance or strategy suggestion
            - direct: Provides clear instruction or example
            
            Generate a helpful ${level} hint that guides without giving away the answer.
          `;

          const response = await this.aiService.generateResponse(hintPrompt, {
            maxTokens: 100,
            temperature: 0.8
          });

          stepHints[level] = response.content || this.getDefaultHint(stepTitle, level);

        } catch (error) {
          stepHints[level] = this.getDefaultHint(stepTitle, level);
        }
      }

      hintSystem.hints[`step_${i + 1}`] = stepHints;
    }

    return hintSystem;
  }

  // Generate common mistakes data
  generateCommonMistakes(templateConfig) {
    return {
      categories: templateConfig.common_misconceptions.map((misconception, index) => ({
        id: `mistake_${index + 1}`,
        description: misconception,
        severity: this.categorizeMistakeSeverity(misconception),
        remediation_strategy: this.generateRemediationStrategy(misconception),
        typical_indicators: this.generateMistakeIndicators(misconception)
      })),
      detection_patterns: templateConfig.common_misconceptions.map(misconception => ({
        pattern: misconception.toLowerCase().replace(/\s+/g, '_'),
        keywords: this.extractMistakeKeywords(misconception),
        confidence_threshold: 0.7
      }))
    };
  }

  // Validate template data
  validateTemplateData(data) {
    const required = ['title', 'problem_type', 'subject', 'difficulty_level', 'problem_statement'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new ProblemTemplateError(
        `Missing required fields: ${missing.join(', ')}`,
        'VALIDATION_ERROR',
        { missingFields: missing }
      );
    }

    const validTypes = ['math', 'science', 'writing', 'reading_comprehension', 'critical_thinking', 'mixed'];
    if (!validTypes.includes(data.problem_type)) {
      throw new ProblemTemplateError(
        `Invalid problem type: ${data.problem_type}`,
        'VALIDATION_ERROR',
        { validTypes }
      );
    }

    const validDifficulties = ['easy', 'medium', 'hard', 'advanced'];
    if (!validDifficulties.includes(data.difficulty_level)) {
      throw new ProblemTemplateError(
        `Invalid difficulty level: ${data.difficulty_level}`,
        'VALIDATION_ERROR',
        { validDifficulties }
      );
    }
  }

  // ============================================
  // TEMPLATE RETRIEVAL AND FILTERING
  // ============================================

  // Get templates by criteria
  async getTemplates(filters = {}) {
    try {
      const client = await this.pool.connect();
      
      try {
        // Build query conditions
        const conditions = ['is_active = true'];
        const params = [];
        let paramCount = 0;

        if (filters.problemType) {
          conditions.push(`problem_type = $${++paramCount}`);
          params.push(filters.problemType);
        }

        if (filters.subject) {
          conditions.push(`subject = $${++paramCount}`);
          params.push(filters.subject);
        }

        if (filters.difficulty) {
          conditions.push(`difficulty_level = $${++paramCount}`);
          params.push(filters.difficulty);
        }

        if (filters.gradeLevel) {
          conditions.push(`grade_level_min <= $${++paramCount} AND grade_level_max >= $${++paramCount}`);
          params.push(filters.gradeLevel, filters.gradeLevel);
          paramCount++;
        }

        if (filters.tags && filters.tags.length > 0) {
          conditions.push(`tags && $${++paramCount}`);
          params.push(filters.tags);
        }

        if (filters.searchQuery) {
          conditions.push(`(title ILIKE $${++paramCount} OR description ILIKE $${++paramCount})`);
          params.push(`%${filters.searchQuery}%`, `%${filters.searchQuery}%`);
          paramCount++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        
        const query = `
          SELECT id, title, description, problem_type, subject, difficulty_level,
                 grade_level_min, grade_level_max, estimated_time_minutes,
                 learning_objectives, prerequisite_skills, tags,
                 usage_count, success_rate, average_completion_time,
                 created_at, updated_at
          FROM problem_templates
          ${whereClause}
          ORDER BY usage_count DESC, created_at DESC
          LIMIT $${++paramCount} OFFSET $${++paramCount}
        `;

        params.push(filters.limit || 20, filters.offset || 0);

        const result = await client.query(query, params);

        // Get total count
        const countQuery = `
          SELECT COUNT(*) as total
          FROM problem_templates
          ${whereClause}
        `;
        
        const countResult = await client.query(countQuery, params.slice(0, -2));
        const total = parseInt(countResult.rows[0].total);

        return {
          templates: result.rows,
          pagination: {
            total,
            limit: filters.limit || 20,
            offset: filters.offset || 0,
            hasMore: (filters.offset || 0) + result.rows.length < total
          },
          filters
        };

      } finally {
        client.release();
      }

    } catch (error) {
      console.error('Error getting templates:', error);
      throw new ProblemTemplateError(
        'Failed to retrieve templates',
        'RETRIEVAL_ERROR',
        { originalError: error.message }
      );
    }
  }

  // Get template by ID with full details
  async getTemplateById(templateId) {
    try {
      const client = await this.pool.connect();
      
      try {
        const query = `
          SELECT pt.*, u.username as created_by_username
          FROM problem_templates pt
          LEFT JOIN users u ON pt.created_by = u.id
          WHERE pt.id = $1 AND pt.is_active = true
        `;

        const result = await client.query(query, [templateId]);

        if (result.rows.length === 0) {
          throw new ProblemTemplateError(
            'Template not found',
            'NOT_FOUND',
            { templateId }
          );
        }

        const template = result.rows[0];

        // Get usage statistics
        const statsQuery = `
          SELECT 
            COUNT(*) as total_sessions,
            COUNT(*) FILTER (WHERE session_status = 'completed') as completed_sessions,
            AVG(accuracy_score) FILTER (WHERE accuracy_score IS NOT NULL) as avg_accuracy,
            AVG(completion_time_minutes) FILTER (WHERE completion_time_minutes IS NOT NULL) as avg_time
          FROM problem_sessions
          WHERE template_id = $1
        `;

        const statsResult = await client.query(statsQuery, [templateId]);
        const stats = statsResult.rows[0];

        return {
          ...template,
          usage_statistics: {
            total_sessions: parseInt(stats.total_sessions) || 0,
            completed_sessions: parseInt(stats.completed_sessions) || 0,
            completion_rate: stats.total_sessions > 0 ? 
              parseFloat(stats.completed_sessions) / parseFloat(stats.total_sessions) : 0,
            average_accuracy: parseFloat(stats.avg_accuracy) || 0,
            average_completion_time: parseFloat(stats.avg_time) || 0
          }
        };

      } finally {
        client.release();
      }

    } catch (error) {
      if (error instanceof ProblemTemplateError) {
        throw error;
      }
      
      console.error('Error getting template by ID:', error);
      throw new ProblemTemplateError(
        'Failed to retrieve template',
        'RETRIEVAL_ERROR',
        { originalError: error.message, templateId }
      );
    }
  }

  // ============================================
  // TEMPLATE ADAPTATION AND PERSONALIZATION
  // ============================================

  // Adapt template for specific student
  async adaptTemplateForStudent(templateId, studentId, adaptationOptions = {}) {
    try {
      // Get base template
      const template = await this.getTemplateById(templateId);
      
      // Get student profile and performance history
      const studentProfile = await this.getStudentProfile(studentId);
      
      // Determine appropriate adaptations
      const adaptations = await this.generateAdaptations(template, studentProfile, adaptationOptions);
      
      // Apply adaptations to create personalized template
      const adaptedTemplate = await this.applyAdaptations(template, adaptations);

      return {
        originalTemplate: template,
        adaptations: adaptations,
        adaptedTemplate: adaptedTemplate,
        adaptationReason: adaptations.reason,
        confidence: adaptations.confidence
      };

    } catch (error) {
      console.error('Error adapting template for student:', error);
      throw new ProblemTemplateError(
        'Failed to adapt template for student',
        'ADAPTATION_ERROR',
        { originalError: error.message, templateId, studentId }
      );
    }
  }

  // Generate sample problems from template
  async generateSampleProblems(templateId, count = 3, variationLevel = 'medium') {
    try {
      const template = await this.getTemplateById(templateId);
      const samples = [];

      for (let i = 0; i < count; i++) {
        const sample = await this.generateProblemVariation(template, variationLevel, i + 1);
        samples.push(sample);
      }

      return {
        templateId,
        templateTitle: template.title,
        variationLevel,
        sampleProblems: samples,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error generating sample problems:', error);
      throw new ProblemTemplateError(
        'Failed to generate sample problems',
        'GENERATION_ERROR',
        { originalError: error.message, templateId }
      );
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  // Get grade level adaptation
  getGradeAdaptation(minGrade, maxGrade) {
    const avgGrade = (minGrade + maxGrade) / 2;
    
    if (avgGrade <= 5) return GRADE_LEVEL_ADAPTATIONS.ELEMENTARY;
    if (avgGrade <= 8) return GRADE_LEVEL_ADAPTATIONS.MIDDLE_SCHOOL;
    return GRADE_LEVEL_ADAPTATIONS.HIGH_SCHOOL;
  }

  // Determine step type
  determineStepType(stepTitle, templateConfig) {
    const stepLower = stepTitle.toLowerCase();
    
    if (stepLower.includes('understand') || stepLower.includes('read')) return 'UNDERSTAND';
    if (stepLower.includes('identify') || stepLower.includes('extract')) return 'ANALYZE';
    if (stepLower.includes('set up') || stepLower.includes('organize')) return 'PLAN';
    if (stepLower.includes('solve') || stepLower.includes('calculate') || stepLower.includes('write')) return 'EXECUTE';
    if (stepLower.includes('check') || stepLower.includes('verify')) return 'VERIFY';
    
    return 'EXECUTE';
  }

  // Generate step prompt
  generateStepPrompt(stepTitle, templateData, gradeAdaptation) {
    const complexity = gradeAdaptation.characteristics.language_complexity;
    
    if (complexity === 'simple') {
      return `Let's work on: ${stepTitle}. What do you think we should do first?`;
    } else if (complexity === 'moderate') {
      return `For this step (${stepTitle}), consider what approach would work best. Explain your thinking.`;
    } else {
      return `${stepTitle}: Analyze this step and determine the most effective approach. Justify your reasoning.`;
    }
  }

  // Determine expected response type
  determineExpectedResponseType(stepTitle, templateConfig) {
    const stepLower = stepTitle.toLowerCase();
    
    if (stepLower.includes('calculate') || stepLower.includes('solve')) return 'numerical';
    if (stepLower.includes('explain') || stepLower.includes('describe')) return 'text';
    if (stepLower.includes('diagram') || stepLower.includes('draw')) return 'visual';
    if (stepLower.includes('choose') || stepLower.includes('select')) return 'multiple_choice';
    
    return 'text';
  }

  // Generate step hints
  async generateStepHints(stepTitle, templateData, templateConfig) {
    return {
      gentle: `Think about what ${stepTitle.toLowerCase()} means in the context of this problem.`,
      moderate: `For ${stepTitle.toLowerCase()}, consider using the ${templateConfig.scaffolding_approach} approach.`,
      direct: `To complete ${stepTitle.toLowerCase()}, follow these specific steps...`
    };
  }

  // Get step common errors
  getStepCommonErrors(stepTitle, templateConfig) {
    return templateConfig.common_misconceptions
      .filter(misconception => 
        misconception.toLowerCase().includes(stepTitle.split(' ')[0].toLowerCase())
      )
      .slice(0, 2);
  }

  // Get step assessment criteria
  getStepAssessmentCriteria(stepTitle, templateConfig) {
    return templateConfig.assessment_criteria.slice(0, 2);
  }

  // Get default hint
  getDefaultHint(stepTitle, level) {
    const hints = {
      gentle: `What do you think ${stepTitle.toLowerCase()} involves?`,
      moderate: `For ${stepTitle.toLowerCase()}, try breaking it into smaller parts.`,
      direct: `Let's work through ${stepTitle.toLowerCase()} step by step.`
    };
    
    return hints[level] || hints.gentle;
  }

  // Categorize mistake severity
  categorizeMistakeSeverity(misconception) {
    const severe = ['not reading', 'wrong operations', 'calculation errors'];
    const moderate = ['misinterpreting', 'incorrect order', 'sign errors'];
    
    const miscLower = misconception.toLowerCase();
    
    if (severe.some(s => miscLower.includes(s))) return 'high';
    if (moderate.some(m => miscLower.includes(m))) return 'medium';
    return 'low';
  }

  // Generate remediation strategy
  generateRemediationStrategy(misconception) {
    const strategies = {
      'reading': 'Practice active reading strategies and highlight key information',
      'operations': 'Review operation meanings and practice identifying clue words',
      'calculation': 'Use estimation to check answers and practice basic computations',
      'variables': 'Practice with concrete examples before moving to abstract variables',
      'equations': 'Visualize equation balance using scales or manipulatives'
    };

    const miscLower = misconception.toLowerCase();
    
    for (const [key, strategy] of Object.entries(strategies)) {
      if (miscLower.includes(key)) return strategy;
    }
    
    return 'Provide additional practice and review fundamental concepts';
  }

  // Generate mistake indicators
  generateMistakeIndicators(misconception) {
    return [
      `Student shows confusion about ${misconception.toLowerCase()}`,
      `Repeated errors related to ${misconception.toLowerCase()}`,
      `Student asks questions indicating ${misconception.toLowerCase()}`
    ];
  }

  // Extract mistake keywords
  extractMistakeKeywords(misconception) {
    return misconception.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .slice(0, 3);
  }

  // Get student profile (placeholder - would integrate with existing student service)
  async getStudentProfile(studentId) {
    // This would integrate with existing student profile system
    return {
      studentId,
      gradeLevel: 7,
      learningStyle: 'visual',
      performanceLevel: 'medium',
      strengths: ['visual_processing', 'pattern_recognition'],
      challenges: ['abstract_thinking', 'word_problems'],
      preferences: {
        scaffolding_intensity: 'medium',
        feedback_frequency: 'frequent',
        challenge_level: 'moderate'
      }
    };
  }

  // Generate adaptations for student
  async generateAdaptations(template, studentProfile, options) {
    return {
      reason: 'Adapted for student learning preferences and performance level',
      confidence: 0.8,
      adaptations: {
        scaffolding_intensity: studentProfile.preferences.scaffolding_intensity,
        visual_support: studentProfile.learningStyle === 'visual',
        simplified_language: studentProfile.gradeLevel < template.grade_level_min,
        extra_examples: studentProfile.challenges.includes('word_problems'),
        additional_hints: studentProfile.performanceLevel === 'low'
      }
    };
  }

  // Apply adaptations to template
  async applyAdaptations(template, adaptations) {
    const adapted = { ...template };
    
    if (adaptations.adaptations.simplified_language) {
      adapted.problem_statement = await this.simplifyLanguage(template.problem_statement);
    }
    
    if (adaptations.adaptations.additional_hints) {
      adapted.hint_system = await this.enhanceHintSystem(template.hint_system);
    }
    
    return adapted;
  }

  // Generate problem variation
  async generateProblemVariation(template, variationLevel, sampleNumber) {
    return {
      sample_number: sampleNumber,
      variation_level: variationLevel,
      title: `${template.title} - Sample ${sampleNumber}`,
      problem_statement: template.problem_statement,
      expected_solution: template.expected_solution,
      estimated_time: template.estimated_time_minutes,
      difficulty_level: template.difficulty_level
    };
  }

  // Simplify language (placeholder for AI-powered simplification)
  async simplifyLanguage(text) {
    // Would use AI to simplify language
    return text;
  }

  // Enhance hint system
  async enhanceHintSystem(hintSystem) {
    // Would add more detailed hints
    return hintSystem;
  }

  // Health check
  async healthCheck() {
    try {
      const dbResult = await this.pool.query('SELECT 1 as test');
      
      return {
        status: 'healthy',
        service: 'problem-template-service',
        features: {
          database: dbResult.rows.length > 0 ? 'connected' : 'disconnected',
          templateCreation: 'enabled',
          templateRetrieval: 'enabled',
          templateAdaptation: 'enabled',
          scaffoldingGeneration: 'enabled',
          hintSystemGeneration: 'enabled',
          mistakeAnalysis: 'enabled'
        },
        templateTypes: {
          math: Object.keys(PROBLEM_TEMPLATE_TYPES.MATH),
          science: Object.keys(PROBLEM_TEMPLATE_TYPES.SCIENCE),
          writing: Object.keys(PROBLEM_TEMPLATE_TYPES.WRITING)
        },
        gradeAdaptations: Object.keys(GRADE_LEVEL_ADAPTATIONS),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'problem-template-service',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
let problemTemplateInstance = null;

const getProblemTemplateService = () => {
  if (!problemTemplateInstance) {
    problemTemplateInstance = new ProblemTemplateService();
  }
  return problemTemplateInstance;
};

module.exports = {
  ProblemTemplateService,
  getProblemTemplateService,
  ProblemTemplateError,
  PROBLEM_TEMPLATE_TYPES,
  GRADE_LEVEL_ADAPTATIONS
}; 