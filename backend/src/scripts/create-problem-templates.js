const { getProblemTemplateService, PROBLEM_TEMPLATE_TYPES } = require('../services/problem-template-service');
const { Pool } = require('pg');

// Predefined problem templates for different subjects
const PREDEFINED_TEMPLATES = {
  MATH: [
    {
      title: 'Multi-Step Word Problems with Money',
      description: 'Practice solving real-world word problems involving money calculations',
      problem_type: 'math',
      template_subtype: 'word_problems',
      subject: 'arithmetic',
      difficulty_level: 'easy',
      problem_statement: 'Sarah wants to buy 3 books that cost $8.50 each and 2 notebooks that cost $3.25 each. She has $30. How much money will she have left after buying all the items?',
      expected_solution: 'Total cost of books: 3 × $8.50 = $25.50. Total cost of notebooks: 2 × $3.25 = $6.50. Total cost: $25.50 + $6.50 = $32.00. Since Sarah only has $30, she needs $2.00 more.',
      problem_data: {
        variables: {
          books: { quantity: 3, price: 8.50 },
          notebooks: { quantity: 2, price: 3.25 },
          available_money: 30.00
        },
        expected_operations: ['multiplication', 'addition', 'subtraction', 'comparison']
      },
      learning_objectives: [
        'Apply multiplication to calculate total costs',
        'Add multiple costs together',
        'Compare available money to required money',
        'Solve multi-step real-world problems'
      ],
      prerequisite_skills: ['Basic multiplication', 'Addition and subtraction', 'Working with decimals'],
      bloom_taxonomy_level: 'apply',
      grade_level_min: 3,
      grade_level_max: 5,
      estimated_time_minutes: 20,
      tags: ['word_problems', 'money', 'multiplication', 'real_world'],
      keywords: ['money', 'cost', 'multiplication', 'total', 'change']
    },
    {
      title: 'Linear Equations with Real-World Context',
      description: 'Solve linear equations representing real-world situations',
      problem_type: 'math',
      template_subtype: 'algebra',
      subject: 'algebra',
      difficulty_level: 'medium',
      problem_statement: 'A cell phone plan costs $25 per month plus $0.10 per text message. If your monthly bill was $32.50, how many text messages did you send?',
      expected_solution: 'Let x = number of text messages. Equation: 25 + 0.10x = 32.50. Solving: 0.10x = 32.50 - 25 = 7.50. Therefore x = 7.50 ÷ 0.10 = 75 text messages.',
      problem_data: {
        equation_form: 'ax + b = c',
        variables: { monthly_fee: 25, per_text: 0.10, total_bill: 32.50 },
        solution_steps: ['identify_variable', 'setup_equation', 'isolate_variable', 'solve', 'verify']
      },
      learning_objectives: [
        'Translate real-world situations into linear equations',
        'Solve linear equations using algebraic operations',
        'Verify solutions in the original context',
        'Interpret mathematical results in practical terms'
      ],
      prerequisite_skills: ['Basic algebra operations', 'Working with decimals', 'Setting up equations'],
      bloom_taxonomy_level: 'apply',
      grade_level_min: 8,
      grade_level_max: 10,
      estimated_time_minutes: 25,
      tags: ['algebra', 'linear_equations', 'real_world', 'problem_solving'],
      keywords: ['equation', 'variable', 'solve', 'linear', 'real_world']
    },
    {
      title: 'Geometric Area and Perimeter Problem',
      description: 'Calculate area and perimeter of composite geometric shapes',
      problem_type: 'math',
      template_subtype: 'geometry',
      subject: 'geometry',
      difficulty_level: 'medium',
      problem_statement: 'A garden is shaped like a rectangle with dimensions 12 feet by 8 feet. Inside the garden, there is a circular fountain with a radius of 2 feet. What is the area available for planting?',
      expected_solution: 'Rectangle area: 12 × 8 = 96 square feet. Circle area: π × 2² = π × 4 = 4π ≈ 12.57 square feet. Available planting area: 96 - 12.57 ≈ 83.43 square feet.',
      problem_data: {
        shapes: {
          rectangle: { length: 12, width: 8 },
          circle: { radius: 2 }
        },
        formulas: {
          rectangle_area: 'length × width',
          circle_area: 'π × radius²'
        }
      },
      learning_objectives: [
        'Calculate area of rectangles and circles',
        'Apply area formulas to real-world problems',
        'Find area of composite shapes',
        'Use appropriate units in measurements'
      ],
      prerequisite_skills: ['Area formulas', 'Working with π', 'Basic arithmetic'],
      bloom_taxonomy_level: 'apply',
      grade_level_min: 6,
      grade_level_max: 8,
      estimated_time_minutes: 30,
      tags: ['geometry', 'area', 'composite_shapes', 'real_world'],
      keywords: ['area', 'perimeter', 'rectangle', 'circle', 'composite']
    },
    {
      title: 'Data Analysis and Probability',
      description: 'Analyze data sets and calculate probabilities',
      problem_type: 'math',
      template_subtype: 'statistics',
      subject: 'statistics',
      difficulty_level: 'hard',
      problem_statement: 'A survey of 100 students asked about their favorite subjects. 35 chose Math, 28 chose Science, 22 chose English, and 15 chose Art. If you randomly select one student from this survey, what is the probability they chose Math or Science?',
      expected_solution: 'Students who chose Math or Science: 35 + 28 = 63. Total students: 100. Probability = 63/100 = 0.63 or 63%.',
      problem_data: {
        survey_data: {
          total_students: 100,
          math: 35,
          science: 28,
          english: 22,
          art: 15
        },
        probability_concepts: ['addition_rule', 'simple_probability', 'data_interpretation']
      },
      learning_objectives: [
        'Interpret data from surveys',
        'Calculate simple probabilities',
        'Apply addition rule for mutually exclusive events',
        'Express probabilities as fractions, decimals, and percentages'
      ],
      prerequisite_skills: ['Fractions and decimals', 'Basic data interpretation', 'Percentage calculations'],
      bloom_taxonomy_level: 'analyze',
      grade_level_min: 7,
      grade_level_max: 9,
      estimated_time_minutes: 25,
      tags: ['statistics', 'probability', 'data_analysis', 'survey'],
      keywords: ['probability', 'data', 'survey', 'statistics', 'analysis']
    }
  ],
  SCIENCE: [
    {
      title: 'Designing a Plant Growth Experiment',
      description: 'Design and analyze a controlled experiment to test factors affecting plant growth',
      problem_type: 'science',
      template_subtype: 'scientific_method',
      subject: 'biology',
      difficulty_level: 'medium',
      problem_statement: 'You want to test whether different types of fertilizer affect how tall plants grow. Design an experiment to test this hypothesis, identifying your variables and controls.',
      expected_solution: 'Hypothesis: Different fertilizers will cause plants to grow to different heights. Independent variable: Type of fertilizer. Dependent variable: Plant height. Controls: Same plant species, same amount of water, same light conditions, same soil type, same pot size. Method: Use 4 groups with different fertilizers plus 1 control group with no fertilizer.',
      problem_data: {
        experiment_type: 'controlled_experiment',
        variables: {
          independent: 'fertilizer_type',
          dependent: 'plant_height',
          controls: ['water_amount', 'light_exposure', 'soil_type', 'plant_species', 'pot_size']
        },
        scientific_method_steps: ['observation', 'hypothesis', 'experiment_design', 'data_collection', 'analysis', 'conclusion']
      },
      learning_objectives: [
        'Formulate testable hypotheses',
        'Identify independent and dependent variables',
        'Design controlled experiments',
        'Understand the importance of controls in experiments',
        'Apply the scientific method to real-world questions'
      ],
      prerequisite_skills: ['Basic understanding of plant biology', 'Concept of variables', 'Scientific method steps'],
      bloom_taxonomy_level: 'create',
      grade_level_min: 6,
      grade_level_max: 8,
      estimated_time_minutes: 35,
      tags: ['scientific_method', 'experiment_design', 'biology', 'variables'],
      keywords: ['experiment', 'hypothesis', 'variables', 'controls', 'scientific_method']
    },
    {
      title: 'Force and Motion Problem Solving',
      description: 'Calculate forces and motion using Newton\'s laws of physics',
      problem_type: 'science',
      template_subtype: 'physics_problems',
      subject: 'physics',
      difficulty_level: 'hard',
      problem_statement: 'A 10 kg box is pushed across a horizontal surface with a force of 50 N. If the coefficient of friction between the box and surface is 0.3, what is the acceleration of the box?',
      expected_solution: 'Given: mass = 10 kg, applied force = 50 N, μ = 0.3. Friction force = μ × mg = 0.3 × 10 × 9.8 = 29.4 N. Net force = 50 - 29.4 = 20.6 N. Using F = ma: a = F/m = 20.6/10 = 2.06 m/s².',
      problem_data: {
        given_values: { mass: 10, applied_force: 50, friction_coefficient: 0.3, gravity: 9.8 },
        physics_concepts: ['newtons_second_law', 'friction', 'net_force'],
        formulas: ['F = ma', 'f = μN', 'N = mg'],
        units: { force: 'N', mass: 'kg', acceleration: 'm/s²' }
      },
      learning_objectives: [
        'Apply Newton\'s second law of motion',
        'Calculate friction forces',
        'Determine net force and acceleration',
        'Use appropriate units in physics calculations',
        'Solve multi-step physics problems'
      ],
      prerequisite_skills: ['Basic algebra', 'Understanding of force and motion', 'Unit conversions'],
      bloom_taxonomy_level: 'apply',
      grade_level_min: 9,
      grade_level_max: 12,
      estimated_time_minutes: 30,
      tags: ['physics', 'forces', 'motion', 'newtons_laws', 'calculations'],
      keywords: ['force', 'motion', 'acceleration', 'friction', 'physics']
    },
    {
      title: 'Chemical Equation Balancing and Stoichiometry',
      description: 'Balance chemical equations and perform stoichiometric calculations',
      problem_type: 'science',
      template_subtype: 'chemistry_analysis',
      subject: 'chemistry',
      difficulty_level: 'hard',
      problem_statement: 'Balance the equation for the combustion of methane (CH₄ + O₂ → CO₂ + H₂O) and calculate how many grams of water are produced when 16 grams of methane burns completely.',
      expected_solution: 'Balanced equation: CH₄ + 2O₂ → CO₂ + 2H₂O. Molar mass of CH₄ = 16 g/mol, H₂O = 18 g/mol. Moles of CH₄ = 16g ÷ 16 g/mol = 1 mol. From equation: 1 mol CH₄ produces 2 mol H₂O. Mass of H₂O = 2 mol × 18 g/mol = 36 grams.',
      problem_data: {
        chemical_equation: 'CH₄ + O₂ → CO₂ + H₂O',
        balanced_equation: 'CH₄ + 2O₂ → CO₂ + 2H₂O',
        molar_masses: { 'CH₄': 16, 'O₂': 32, 'CO₂': 44, 'H₂O': 18 },
        stoichiometry_concepts: ['mole_ratios', 'mass_to_mole_conversion', 'limiting_reagents']
      },
      learning_objectives: [
        'Balance chemical equations',
        'Calculate molar masses',
        'Perform mole-to-mass conversions',
        'Use stoichiometric ratios in calculations',
        'Apply conservation of mass in chemical reactions'
      ],
      prerequisite_skills: ['Basic chemistry concepts', 'Mole concept', 'Atomic masses', 'Algebra'],
      bloom_taxonomy_level: 'apply',
      grade_level_min: 10,
      grade_level_max: 12,
      estimated_time_minutes: 35,
      tags: ['chemistry', 'stoichiometry', 'balancing_equations', 'calculations'],
      keywords: ['chemical_equation', 'stoichiometry', 'moles', 'balancing', 'chemistry']
    },
    {
      title: 'Ecosystem Energy Flow Analysis',
      description: 'Analyze energy transfer through ecosystem food chains and webs',
      problem_type: 'science',
      template_subtype: 'biology_analysis',
      subject: 'biology',
      difficulty_level: 'medium',
      problem_statement: 'In a grassland ecosystem, grass captures 10,000 units of solar energy. If energy transfer efficiency between trophic levels is 10%, how much energy is available to secondary consumers (carnivores that eat herbivores)?',
      expected_solution: 'Energy flow: Producers (grass) → Primary consumers (herbivores) → Secondary consumers (carnivores). Energy at herbivores: 10,000 × 0.10 = 1,000 units. Energy at secondary consumers: 1,000 × 0.10 = 100 units.',
      problem_data: {
        trophic_levels: ['producers', 'primary_consumers', 'secondary_consumers', 'tertiary_consumers'],
        energy_transfer_efficiency: 0.10,
        initial_energy: 10000,
        ecological_concepts: ['energy_pyramid', '10_percent_rule', 'trophic_levels']
      },
      learning_objectives: [
        'Understand energy flow in ecosystems',
        'Apply the 10% rule of energy transfer',
        'Analyze trophic level relationships',
        'Calculate energy availability at different levels',
        'Explain why food chains are typically short'
      ],
      prerequisite_skills: ['Basic ecology concepts', 'Percentage calculations', 'Understanding of food webs'],
      bloom_taxonomy_level: 'analyze',
      grade_level_min: 8,
      grade_level_max: 10,
      estimated_time_minutes: 25,
      tags: ['ecology', 'energy_flow', 'trophic_levels', 'ecosystem'],
      keywords: ['ecosystem', 'energy', 'trophic_levels', 'food_chain', 'ecology']
    }
  ],
  WRITING: [
    {
      title: 'Persuasive Essay: Environmental Conservation',
      description: 'Write a persuasive essay arguing for environmental conservation measures',
      problem_type: 'writing',
      template_subtype: 'persuasive_essay',
      subject: 'essay_writing',
      difficulty_level: 'medium',
      problem_statement: 'Write a 5-paragraph persuasive essay arguing that your school should implement a comprehensive recycling program. Your essay should include a clear thesis, supporting evidence, addressing counterarguments, and a compelling conclusion.',
      expected_solution: 'A well-structured persuasive essay with: (1) Introduction with clear thesis statement, (2-4) Body paragraphs with evidence and reasoning, (5) Conclusion that reinforces the argument. Should include addressing potential counterarguments and using persuasive techniques.',
      problem_data: {
        essay_structure: ['introduction', 'body_paragraph_1', 'body_paragraph_2', 'body_paragraph_3', 'conclusion'],
        persuasive_techniques: ['logical_appeal', 'emotional_appeal', 'credibility', 'evidence', 'counterargument_address'],
        topic_focus: 'school_recycling_program',
        required_elements: ['thesis_statement', 'supporting_evidence', 'counterargument', 'conclusion']
      },
      learning_objectives: [
        'Develop clear thesis statements',
        'Support arguments with evidence',
        'Address counterarguments effectively',
        'Use persuasive writing techniques',
        'Organize ideas in logical paragraph structure'
      ],
      prerequisite_skills: ['Basic paragraph structure', 'Understanding of thesis statements', 'Research skills'],
      bloom_taxonomy_level: 'create',
      grade_level_min: 8,
      grade_level_max: 10,
      estimated_time_minutes: 45,
      tags: ['persuasive_writing', 'essay', 'environmental_topics', 'argumentation'],
      keywords: ['persuasive', 'essay', 'argument', 'thesis', 'evidence']
    },
    {
      title: 'Narrative Writing: Personal Experience Story',
      description: 'Create a compelling narrative story based on a personal experience',
      problem_type: 'writing',
      template_subtype: 'narrative_writing',
      subject: 'creative_writing',
      difficulty_level: 'easy',
      problem_statement: 'Write a narrative story about a time when you learned something important about yourself or others. Your story should have a clear beginning, middle, and end, with descriptive details and dialogue.',
      expected_solution: 'A well-developed narrative with: Clear plot structure (exposition, rising action, climax, falling action, resolution), character development, descriptive language, dialogue, and a meaningful theme or lesson learned.',
      problem_data: {
        narrative_elements: ['setting', 'characters', 'plot', 'conflict', 'theme'],
        story_structure: ['exposition', 'rising_action', 'climax', 'falling_action', 'resolution'],
        writing_techniques: ['descriptive_details', 'dialogue', 'sensory_language', 'character_development'],
        theme_focus: 'personal_growth_or_learning'
      },
      learning_objectives: [
        'Develop compelling characters and settings',
        'Create clear plot structure',
        'Use descriptive and sensory language',
        'Include meaningful dialogue',
        'Convey theme through narrative elements'
      ],
      prerequisite_skills: ['Basic story elements', 'Descriptive writing', 'Understanding of plot structure'],
      bloom_taxonomy_level: 'create',
      grade_level_min: 6,
      grade_level_max: 8,
      estimated_time_minutes: 40,
      tags: ['narrative_writing', 'personal_experience', 'storytelling', 'creative_writing'],
      keywords: ['narrative', 'story', 'personal_experience', 'character', 'plot']
    },
    {
      title: 'Informative Research Report: Technology Impact',
      description: 'Research and write an informative report on how technology impacts daily life',
      problem_type: 'writing',
      template_subtype: 'informative_writing',
      subject: 'essay_writing',
      difficulty_level: 'medium',
      problem_statement: 'Research and write a 4-paragraph informative report explaining how smartphones have changed the way people communicate. Use at least 3 credible sources and include proper citations.',
      expected_solution: 'A well-researched informative report with: (1) Introduction explaining the topic, (2-3) Body paragraphs with factual information from sources, (4) Conclusion summarizing key points. Should include proper citations and bibliography.',
      problem_data: {
        report_structure: ['introduction', 'body_paragraph_1', 'body_paragraph_2', 'conclusion'],
        research_requirements: ['minimum_3_sources', 'credible_sources', 'proper_citations'],
        topic_focus: 'smartphone_communication_impact',
        required_elements: ['factual_information', 'source_integration', 'clear_organization']
      },
      learning_objectives: [
        'Conduct research using credible sources',
        'Integrate source information effectively',
        'Use proper citation format',
        'Organize information logically',
        'Write clear, informative prose'
      ],
      prerequisite_skills: ['Research skills', 'Note-taking', 'Basic citation format', 'Information literacy'],
      bloom_taxonomy_level: 'analyze',
      grade_level_min: 9,
      grade_level_max: 11,
      estimated_time_minutes: 50,
      tags: ['informative_writing', 'research', 'technology', 'citations'],
      keywords: ['informative', 'research', 'sources', 'citations', 'technology']
    },
    {
      title: 'Creative Poetry: Imagery and Metaphor',
      description: 'Create original poetry using literary devices like imagery and metaphor',
      problem_type: 'writing',
      template_subtype: 'creative_writing',
      subject: 'creative_writing',
      difficulty_level: 'medium',
      problem_statement: 'Write a poem about a season (spring, summer, fall, or winter) using at least three metaphors and vivid sensory imagery. Your poem should be 12-16 lines long and convey a specific mood or feeling.',
      expected_solution: 'An original poem that: Uses metaphors effectively, includes sensory imagery (sight, sound, smell, touch, taste), maintains consistent mood/tone, demonstrates creative word choice, and follows the length requirement.',
      problem_data: {
        literary_devices: ['metaphor', 'simile', 'imagery', 'personification', 'alliteration'],
        sensory_elements: ['visual', 'auditory', 'tactile', 'olfactory', 'gustatory'],
        seasonal_themes: ['spring_renewal', 'summer_warmth', 'autumn_change', 'winter_reflection'],
        poem_requirements: ['12_16_lines', 'three_metaphors', 'sensory_imagery', 'consistent_mood']
      },
      learning_objectives: [
        'Use metaphors and other literary devices',
        'Create vivid sensory imagery',
        'Develop consistent mood and tone',
        'Experiment with poetic language',
        'Express creativity through verse'
      ],
      prerequisite_skills: ['Understanding of literary devices', 'Vocabulary development', 'Creative expression'],
      bloom_taxonomy_level: 'create',
      grade_level_min: 7,
      grade_level_max: 9,
      estimated_time_minutes: 35,
      tags: ['creative_writing', 'poetry', 'literary_devices', 'imagery'],
      keywords: ['poetry', 'metaphor', 'imagery', 'creative', 'literary_devices']
    },
    {
      title: 'Research-Based Argumentative Essay',
      description: 'Write a research-based argumentative essay on a current social issue',
      problem_type: 'writing',
      template_subtype: 'research_writing',
      subject: 'essay_writing',
      difficulty_level: 'hard',
      problem_statement: 'Write a 6-paragraph argumentative essay taking a position on whether social media has a positive or negative impact on teenagers. Use at least 5 credible sources, address counterarguments, and include proper MLA citations.',
      expected_solution: 'A comprehensive argumentative essay with: (1) Introduction with clear thesis, (2-4) Body paragraphs with evidence from sources, (5) Counterargument paragraph, (6) Conclusion. Should include in-text citations and Works Cited page in MLA format.',
      problem_data: {
        essay_structure: ['introduction', 'body_1', 'body_2', 'body_3', 'counterargument', 'conclusion'],
        research_requirements: ['minimum_5_sources', 'peer_reviewed_preferred', 'current_sources'],
        citation_format: 'MLA',
        topic_focus: 'social_media_impact_on_teenagers',
        required_elements: ['thesis_statement', 'evidence_integration', 'counterargument_address', 'works_cited']
      },
      learning_objectives: [
        'Conduct comprehensive research on social issues',
        'Synthesize multiple sources effectively',
        'Use proper MLA citation format',
        'Address counterarguments fairly',
        'Develop sophisticated arguments with evidence'
      ],
      prerequisite_skills: ['Advanced research skills', 'MLA citation format', 'Argumentative writing', 'Source evaluation'],
      bloom_taxonomy_level: 'evaluate',
      grade_level_min: 10,
      grade_level_max: 12,
      estimated_time_minutes: 60,
      tags: ['argumentative_writing', 'research', 'social_issues', 'MLA_citations'],
      keywords: ['argumentative', 'research', 'social_media', 'citations', 'counterargument']
    }
  ]
};

class ProblemTemplateCreator {
  constructor() {
    this.problemTemplateService = getProblemTemplateService();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    this.results = [];
  }

  async createAllTemplates() {
    console.log('🎯 Starting Problem Template Creation...\n');

    try {
      // Get or create a system admin user for template creation
      const adminUserId = await this.getSystemAdminUser();

      // Create math templates
      console.log('📐 Creating Math Templates...');
      await this.createTemplatesForSubject('MATH', adminUserId);

      // Create science templates
      console.log('\n🔬 Creating Science Templates...');
      await this.createTemplatesForSubject('SCIENCE', adminUserId);

      // Create writing templates
      console.log('\n✏️ Creating Writing Templates...');
      await this.createTemplatesForSubject('WRITING', adminUserId);

      this.printSummary();

    } catch (error) {
      console.error('❌ Template creation failed:', error);
      throw error;
    }
  }

  async createTemplatesForSubject(subject, adminUserId) {
    const templates = PREDEFINED_TEMPLATES[subject];
    
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      
      try {
        console.log(`  Creating: ${template.title}...`);
        
        const result = await this.problemTemplateService.createTemplate(template, adminUserId);
        
        this.results.push({
          success: true,
          subject,
          title: template.title,
          templateId: result.template.id,
          type: template.template_subtype
        });
        
        console.log(`    ✅ Created successfully (ID: ${result.template.id})`);
        
      } catch (error) {
        console.error(`    ❌ Failed to create ${template.title}:`, error.message);
        
        this.results.push({
          success: false,
          subject,
          title: template.title,
          error: error.message,
          type: template.template_subtype
        });
      }
    }
  }

  async getSystemAdminUser() {
    try {
      // Try to find an existing admin user
      const adminQuery = `
        SELECT id FROM users 
        WHERE role = 'admin' 
        ORDER BY created_at ASC 
        LIMIT 1
      `;
      
      const result = await this.pool.query(adminQuery);
      
      if (result.rows.length > 0) {
        return result.rows[0].id;
      }
      
      // Create a system admin user if none exists
      const createAdminQuery = `
        INSERT INTO users (username, email, role, password_hash, is_active)
        VALUES ('system_admin', 'admin@mentra-poc.edu', 'admin', '$2b$10$dummy.hash.for.system.admin', true)
        RETURNING id
      `;
      
      const createResult = await this.pool.query(createAdminQuery);
      console.log('  📝 Created system admin user for template creation');
      
      return createResult.rows[0].id;
      
    } catch (error) {
      console.error('Error getting/creating admin user:', error);
      // Return a placeholder ID if user creation fails
      return '00000000-0000-0000-0000-000000000000';
    }
  }

  printSummary() {
    console.log('\n📊 Template Creation Summary');
    console.log('===============================');
    
    const totalAttempted = this.results.length;
    const totalSuccessful = this.results.filter(r => r.success).length;
    const totalFailed = this.results.filter(r => !r.success).length;
    
    console.log(`Total Templates Attempted: ${totalAttempted}`);
    console.log(`Successfully Created: ${totalSuccessful} ✅`);
    console.log(`Failed: ${totalFailed} ❌`);
    console.log(`Success Rate: ${((totalSuccessful / totalAttempted) * 100).toFixed(1)}%`);
    
    // Summary by subject
    const subjectSummary = {};
    for (const result of this.results) {
      if (!subjectSummary[result.subject]) {
        subjectSummary[result.subject] = { total: 0, successful: 0, failed: 0 };
      }
      subjectSummary[result.subject].total++;
      if (result.success) {
        subjectSummary[result.subject].successful++;
      } else {
        subjectSummary[result.subject].failed++;
      }
    }
    
    console.log('\nBy Subject:');
    Object.entries(subjectSummary).forEach(([subject, stats]) => {
      console.log(`  ${subject}: ${stats.successful}/${stats.total} (${((stats.successful / stats.total) * 100).toFixed(1)}%)`);
    });
    
    // List successful templates
    console.log('\nSuccessfully Created Templates:');
    this.results
      .filter(r => r.success)
      .forEach(r => {
        console.log(`  ✅ ${r.subject}: ${r.title} (${r.type})`);
      });
    
    // List failed templates
    if (totalFailed > 0) {
      console.log('\nFailed Templates:');
      this.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  ❌ ${r.subject}: ${r.title} - ${r.error}`);
        });
    }
    
    console.log('\n🎯 Problem Template Creation Complete!');
    
    console.log('\n📋 Available Template Types:');
    console.log('============================');
    
    // Show template type coverage
    const typeCoverage = {
      MATH: Object.keys(PROBLEM_TEMPLATE_TYPES.MATH),
      SCIENCE: Object.keys(PROBLEM_TEMPLATE_TYPES.SCIENCE),
      WRITING: Object.keys(PROBLEM_TEMPLATE_TYPES.WRITING)
    };
    
    Object.entries(typeCoverage).forEach(([subject, types]) => {
      console.log(`\n${subject}:`);
      types.forEach(type => {
        const config = PROBLEM_TEMPLATE_TYPES[subject][type];
        const created = this.results.some(r => 
          r.success && r.subject === subject && r.type === config.name
        );
        console.log(`  ${created ? '✅' : '❌'} ${config.display_name} (${config.scaffolding_approach})`);
      });
    });
    
    console.log('\n🚀 Templates are now ready for use in the problem-solving system!');
  }

  async validateTemplates() {
    console.log('\n🔍 Validating Created Templates...');
    
    try {
      const successful = this.results.filter(r => r.success);
      
      for (const result of successful) {
        const template = await this.problemTemplateService.getTemplateById(result.templateId);
        
        // Validate template structure
        const hasScaffoldingSteps = template.scaffolding_steps && 
          Array.isArray(JSON.parse(template.scaffolding_steps));
        const hasHintSystem = template.hint_system && 
          typeof JSON.parse(template.hint_system) === 'object';
        const hasCommonMistakes = template.common_mistakes && 
          typeof JSON.parse(template.common_mistakes) === 'object';
        
        if (hasScaffoldingSteps && hasHintSystem && hasCommonMistakes) {
          console.log(`  ✅ ${result.title}: Valid template structure`);
        } else {
          console.log(`  ⚠️ ${result.title}: Missing components`);
        }
      }
      
    } catch (error) {
      console.error('Error during validation:', error);
    }
  }
}

// Demo function to show template capabilities
async function demonstrateTemplates() {
  console.log('\n🎪 Template Demonstration');
  console.log('=========================');
  
  const creator = new ProblemTemplateCreator();
  
  try {
    // Get a sample template
    const templates = await creator.problemTemplateService.getTemplates({
      problemType: 'math',
      limit: 1
    });
    
    if (templates.templates.length > 0) {
      const template = templates.templates[0];
      console.log(`📋 Sample Template: ${template.title}`);
      console.log(`   Type: ${template.problem_type} - ${template.subject}`);
      console.log(`   Difficulty: ${template.difficulty_level}`);
      console.log(`   Grade Range: ${template.grade_level_min}-${template.grade_level_max}`);
      console.log(`   Estimated Time: ${template.estimated_time_minutes} minutes`);
      
      // Show template adaptation
      const adaptedTemplate = await creator.problemTemplateService.adaptTemplateForStudent(
        template.id,
        'demo_student_123'
      );
      
      console.log('   🔄 Template can be adapted for individual students');
      console.log(`   🎯 Adaptation confidence: ${adaptedTemplate.confidence * 100}%`);
      
      // Show sample problem generation
      const samples = await creator.problemTemplateService.generateSampleProblems(
        template.id,
        2,
        'medium'
      );
      
      console.log(`   📝 Generated ${samples.sampleProblems.length} sample variations`);
    }
    
  } catch (error) {
    console.log('Demo requires templates to be created first');
  }
}

// Run the template creation if called directly
if (require.main === module) {
  async function main() {
    const creator = new ProblemTemplateCreator();
    
    try {
      await creator.createAllTemplates();
      await creator.validateTemplates();
      await demonstrateTemplates();
      process.exit(0);
    } catch (error) {
      console.error('Template creation failed:', error);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = { 
  ProblemTemplateCreator, 
  PREDEFINED_TEMPLATES,
  demonstrateTemplates
}; 