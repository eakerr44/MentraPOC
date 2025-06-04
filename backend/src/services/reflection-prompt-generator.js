const { getAdaptiveResponseGenerator } = require('./adaptive-response-generator');
const { getAIService } = require('./ai-service');
const { activityMonitor } = require('./activity-monitor');
const { getIntelligentLearningHistory } = require('./context-manager');

// Reflection prompt types and their characteristics
const PROMPT_TYPES = {
  EMOTIONAL_EXPLORATION: {
    name: 'emotional-exploration',
    description: 'Help students explore and understand their emotional responses',
    priority: 'high', // High priority when emotional content detected
    triggers: ['emotional_words', 'feeling_expressions', 'stress_indicators'],
    developmentalAdaptations: {
      EARLY_ELEMENTARY: 'Simple feeling identification and basic emotional vocabulary',
      LATE_ELEMENTARY: 'Emotional awareness and simple emotional regulation',
      MIDDLE_SCHOOL: 'Emotional intelligence and social-emotional connections',
      HIGH_SCHOOL: 'Complex emotional analysis and emotional intelligence development'
    }
  },
  LEARNING_REFLECTION: {
    name: 'learning-reflection',
    description: 'Encourage metacognitive thinking about learning processes',
    priority: 'medium',
    triggers: ['learning_content', 'academic_subjects', 'problem_solving'],
    developmentalAdaptations: {
      EARLY_ELEMENTARY: 'What did I learn? What was fun/hard?',
      LATE_ELEMENTARY: 'How did I learn this? What helped me understand?',
      MIDDLE_SCHOOL: 'What strategies worked? How can I improve my learning?',
      HIGH_SCHOOL: 'Metacognitive analysis of learning processes and strategies'
    }
  },
  GOAL_SETTING: {
    name: 'goal-setting',
    description: 'Help students set and reflect on personal and academic goals',
    priority: 'medium',
    triggers: ['future_thinking', 'achievement_mentions', 'planning_language'],
    developmentalAdaptations: {
      EARLY_ELEMENTARY: 'What do I want to learn next? What would make me proud?',
      LATE_ELEMENTARY: 'Short-term goals and simple action planning',
      MIDDLE_SCHOOL: 'SMART goals and progress tracking strategies',
      HIGH_SCHOOL: 'Long-term goal setting and comprehensive planning'
    }
  },
  PROBLEM_SOLVING: {
    name: 'problem-solving',
    description: 'Guide students through structured problem-solving reflection',
    priority: 'high',
    triggers: ['challenge_mentions', 'difficulty_expressions', 'problem_language'],
    developmentalAdaptations: {
      EARLY_ELEMENTARY: 'What was tricky? How did I figure it out?',
      LATE_ELEMENTARY: 'Problem identification and simple solution strategies',
      MIDDLE_SCHOOL: 'Systematic problem-solving approaches and alternative solutions',
      HIGH_SCHOOL: 'Complex problem analysis and strategic thinking'
    }
  },
  GRATITUDE_APPRECIATION: {
    name: 'gratitude-appreciation',
    description: 'Foster positive mindset through gratitude and appreciation',
    priority: 'low',
    triggers: ['positive_experiences', 'achievement_mentions', 'social_connections'],
    developmentalAdaptations: {
      EARLY_ELEMENTARY: 'What made me happy today? Who helped me?',
      LATE_ELEMENTARY: 'Appreciation for learning and relationships',
      MIDDLE_SCHOOL: 'Gratitude for growth opportunities and support systems',
      HIGH_SCHOOL: 'Deep appreciation for experiences and personal development'
    }
  },
  GROWTH_MINDSET: {
    name: 'growth-mindset',
    description: 'Reinforce growth mindset and resilience thinking',
    priority: 'medium',
    triggers: ['difficulty_mentions', 'mistake_references', 'challenge_language'],
    developmentalAdaptations: {
      EARLY_ELEMENTARY: 'Mistakes help me learn! What can I try differently?',
      LATE_ELEMENTARY: 'Effort and practice lead to improvement',
      MIDDLE_SCHOOL: 'Challenges as opportunities for growth',
      HIGH_SCHOOL: 'Resilience, persistence, and long-term development mindset'
    }
  }
};

// Content analysis patterns for trigger detection
const CONTENT_TRIGGERS = {
  emotional_words: [
    'feel', 'feeling', 'felt', 'emotion', 'happy', 'sad', 'angry', 'frustrated', 
    'excited', 'worried', 'anxious', 'proud', 'disappointed', 'overwhelmed',
    'calm', 'peaceful', 'stressed', 'nervous', 'confident', 'confused'
  ],
  feeling_expressions: [
    'i feel', 'i felt', 'i was', 'made me', 'i am', 'feeling like',
    'it makes me', 'i get', 'i become', 'i seem'
  ],
  stress_indicators: [
    'difficult', 'hard', 'challenging', 'struggle', 'trouble', 'worried',
    'pressure', 'stress', 'overwhelming', 'too much', 'can\'t handle'
  ],
  learning_content: [
    'learned', 'understand', 'study', 'practice', 'homework', 'test', 'quiz',
    'subject', 'math', 'science', 'reading', 'writing', 'history', 'art'
  ],
  academic_subjects: [
    'mathematics', 'algebra', 'geometry', 'biology', 'chemistry', 'physics',
    'literature', 'essay', 'research', 'project', 'assignment', 'class'
  ],
  problem_solving: [
    'problem', 'solution', 'solve', 'figure out', 'work through', 'challenge',
    'difficulty', 'obstacle', 'issue', 'question', 'answer'
  ],
  future_thinking: [
    'want to', 'hope to', 'plan to', 'goal', 'dream', 'future', 'next',
    'tomorrow', 'later', 'eventually', 'someday', 'will'
  ],
  achievement_mentions: [
    'accomplished', 'achieved', 'succeeded', 'completed', 'finished',
    'proud', 'good at', 'improved', 'better', 'progress'
  ],
  planning_language: [
    'plan', 'organize', 'prepare', 'schedule', 'arrange', 'set up',
    'get ready', 'think ahead', 'strategy', 'approach'
  ],
  challenge_mentions: [
    'challenge', 'difficult', 'hard', 'tough', 'tricky', 'complex',
    'confusing', 'struggle', 'problem', 'obstacle'
  ],
  difficulty_expressions: [
    'don\'t understand', 'confused', 'lost', 'stuck', 'can\'t figure',
    'having trouble', 'need help', 'don\'t get', 'unclear'
  ],
  positive_experiences: [
    'fun', 'enjoyable', 'great', 'awesome', 'wonderful', 'amazing',
    'love', 'like', 'enjoy', 'appreciate', 'grateful'
  ],
  social_connections: [
    'friend', 'family', 'teacher', 'classmate', 'teammate', 'group',
    'together', 'with others', 'helped me', 'support'
  ],
  mistake_references: [
    'mistake', 'error', 'wrong', 'incorrect', 'messed up', 'failed',
    'didn\'t work', 'tried again', 'redo', 'fix'
  ]
};

// Prompt templates for different types and developmental levels
const PROMPT_TEMPLATES = {
  EMOTIONAL_EXPLORATION: {
    EARLY_ELEMENTARY: [
      "I notice you mentioned feeling {emotion}. Can you tell me more about what made you feel this way?",
      "When you feel {emotion}, what does your body feel like? What helps you feel better?",
      "It sounds like you had some big feelings today. What's one thing that made you smile?"
    ],
    LATE_ELEMENTARY: [
      "You wrote about feeling {emotion}. What do you think caused this feeling, and how did you handle it?",
      "When you experience {emotion}, what strategies help you manage these feelings?",
      "How might understanding your feelings help you in similar situations in the future?"
    ],
    MIDDLE_SCHOOL: [
      "You mentioned feeling {emotion}. How do you think this emotion connects to your thoughts and actions?",
      "What patterns do you notice in when and why you feel {emotion}? How might you use this awareness?",
      "How has your understanding of this emotion grown over time, and what have you learned about yourself?"
    ],
    HIGH_SCHOOL: [
      "Reflecting on your emotional experience of {emotion}, how does this connect to your broader personal growth and self-understanding?",
      "What does this emotional response reveal about your values, goals, or areas for continued development?",
      "How might you use this emotional insight to support others or contribute to your community?"
    ]
  },
  LEARNING_REFLECTION: {
    EARLY_ELEMENTARY: [
      "What was the most interesting thing you learned about {subject} today?",
      "How did you figure out {learning_topic}? What helped you understand it?",
      "What would you like to learn more about? What questions do you still have?"
    ],
    LATE_ELEMENTARY: [
      "What strategies did you use to learn {subject}? Which ones worked best for you?",
      "How did your understanding of {learning_topic} change from the beginning to the end?",
      "What connections can you make between what you learned today and things you already knew?"
    ],
    MIDDLE_SCHOOL: [
      "How did you approach learning {subject}, and what metacognitive strategies were most effective?",
      "What challenges did you encounter while learning {learning_topic}, and how did you overcome them?",
      "How might you apply what you learned about {subject} to other areas of your life or learning?"
    ],
    HIGH_SCHOOL: [
      "Analyze your learning process for {subject}. What does this reveal about your learning preferences and growth areas?",
      "How does your understanding of {learning_topic} connect to broader themes or real-world applications?",
      "What aspects of your learning approach might you refine to enhance your academic and personal development?"
    ]
  },
  GOAL_SETTING: {
    EARLY_ELEMENTARY: [
      "What's something you want to get better at? What's one small step you could take?",
      "What would make you feel proud of yourself? How could you work toward that?",
      "What's something new you'd like to try? Who could help you learn it?"
    ],
    LATE_ELEMENTARY: [
      "What's a goal you'd like to achieve this week? What steps will you take to reach it?",
      "How will you know when you've reached your goal? What will success look like?",
      "What obstacles might you face, and how will you overcome them?"
    ],
    MIDDLE_SCHOOL: [
      "Create a SMART goal related to something you mentioned. How will you track your progress?",
      "What resources, skills, or support do you need to achieve your goal?",
      "How does this goal connect to your longer-term aspirations and personal growth?"
    ],
    HIGH_SCHOOL: [
      "Develop a comprehensive plan for achieving your goal, including timelines, milestones, and contingencies.",
      "How does this goal align with your values, interests, and long-term vision for your life?",
      "What systems will you put in place to maintain motivation and accountability?"
    ]
  },
  PROBLEM_SOLVING: {
    EARLY_ELEMENTARY: [
      "What was tricky about {problem}? How did you try to solve it?",
      "When something is hard, what are different ways you can ask for help?",
      "What's one thing you learned from working through this challenge?"
    ],
    LATE_ELEMENTARY: [
      "What steps did you take to solve {problem}? What would you do differently next time?",
      "What resources or strategies helped you work through this challenge?",
      "How did solving this problem make you feel? What did you learn about yourself?"
    ],
    MIDDLE_SCHOOL: [
      "Break down the problem-solving process you used. What worked well, and what could be improved?",
      "What alternative approaches might you have tried? How would you evaluate their effectiveness?",
      "How can you apply the problem-solving skills you used here to other challenges you face?"
    ],
    HIGH_SCHOOL: [
      "Analyze the complex factors that contributed to this problem and evaluate the effectiveness of your solution approach.",
      "How might this problem-solving experience inform your approach to future academic and personal challenges?",
      "What insights about systematic thinking and decision-making can you extract from this experience?"
    ]
  },
  GRATITUDE_APPRECIATION: {
    EARLY_ELEMENTARY: [
      "What made you smile today? Who or what are you thankful for?",
      "What's something good that happened? How did it make you feel?",
      "Who helped you today? How did they make your day better?"
    ],
    LATE_ELEMENTARY: [
      "What are three things you're grateful for from your experience today?",
      "How did someone's kindness or support make a difference for you?",
      "What's something you accomplished that you feel good about?"
    ],
    MIDDLE_SCHOOL: [
      "Reflect on the people, opportunities, or experiences you're grateful for. How have they contributed to your growth?",
      "What positive aspects of today's challenges or difficulties can you identify?",
      "How might expressing gratitude strengthen your relationships and overall well-being?"
    ],
    HIGH_SCHOOL: [
      "Consider the broader systems, relationships, and opportunities that support your learning and development. How might gratitude influence your perspective and actions?",
      "How has your capacity for appreciation and gratitude evolved, and how does it connect to your personal values?",
      "What role does gratitude play in your resilience and ability to navigate complex challenges?"
    ]
  },
  GROWTH_MINDSET: {
    EARLY_ELEMENTARY: [
      "What mistake did you make that helped you learn something new?",
      "How did trying hard help you get better at {skill}?",
      "What's something that was hard before but is easier now?"
    ],
    LATE_ELEMENTARY: [
      "How did facing a challenge help you grow? What did you learn about yourself?",
      "What's the difference between your abilities now and when you first started learning {subject}?",
      "How do you feel about making mistakes? How do they help you learn?"
    ],
    MIDDLE_SCHOOL: [
      "How has your mindset about challenges and difficulties evolved? What evidence do you have of your growth?",
      "What role does effort and practice play in your learning? Can you think of specific examples?",
      "How might viewing challenges as opportunities change your approach to difficult situations?"
    ],
    HIGH_SCHOOL: [
      "Analyze how your growth mindset has contributed to your academic and personal development. What patterns do you notice?",
      "How do you balance accepting challenges with maintaining well-being and realistic expectations?",
      "What role will a growth mindset play in your future academic, career, and personal goals?"
    ]
  }
};

class ReflectionPromptError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'ReflectionPromptError';
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

class ReflectionPromptGenerator {
  constructor() {
    this.adaptiveGenerator = getAdaptiveResponseGenerator();
    this.aiService = getAIService();
    this.promptTypes = PROMPT_TYPES;
    this.contentTriggers = CONTENT_TRIGGERS;
    this.promptTemplates = PROMPT_TEMPLATES;
  }

  // Main method to generate reflection prompts for a journal entry
  async generateReflectionPrompts(options = {}) {
    try {
      const {
        studentId,
        journalContent,
        emotionalState = null,
        studentAge = null,
        maxPrompts = 3,
        preferredTypes = [],
        previousPrompts = []
      } = options;

      // Validate inputs
      if (!studentId || !journalContent) {
        throw new ReflectionPromptError('studentId and journalContent are required');
      }

      // Get student's learning profile for adaptation
      const learningProfile = await this.adaptiveGenerator.getStudentLearningProfile(
        studentId, 
        journalContent, 
        { studentAge }
      );

      // Analyze journal content to determine appropriate prompt types
      const contentAnalysis = this.analyzeJournalContent(journalContent, emotionalState);

      // Determine best prompt types based on content and preferences
      const selectedPromptTypes = this.selectPromptTypes(
        contentAnalysis, 
        preferredTypes, 
        previousPrompts, 
        maxPrompts
      );

      // Generate prompts for each selected type
      const generatedPrompts = [];
      for (const promptType of selectedPromptTypes) {
        try {
          const prompt = await this.generateSinglePrompt(
            promptType,
            journalContent,
            learningProfile,
            contentAnalysis
          );
          
          if (prompt) {
            generatedPrompts.push(prompt);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to generate ${promptType} prompt:`, error.message);
        }
      }

      // Log activity for monitoring
      await this.logPromptGeneration(studentId, {
        journalContent: journalContent.substring(0, 200),
        contentAnalysis,
        selectedTypes: selectedPromptTypes,
        generatedCount: generatedPrompts.length,
        learningProfile: learningProfile.summary
      });

      return {
        prompts: generatedPrompts,
        contentAnalysis,
        learningProfile: learningProfile.summary,
        metadata: {
          generated: generatedPrompts.length,
          requested: maxPrompts,
          selectedTypes: selectedPromptTypes,
          developmentLevel: learningProfile.developmentLevel
        }
      };

    } catch (error) {
      console.error('❌ Reflection prompt generation failed:', error);
      
      // Return fallback prompts
      return this.generateFallbackPrompts(options, error);
    }
  }

  // Analyze journal content to identify triggers and themes
  analyzeJournalContent(content, emotionalState = null) {
    const contentLower = content.toLowerCase();
    const analysis = {
      triggers: {},
      themes: [],
      emotionalContent: {},
      complexity: 'medium',
      wordCount: content.split(/\s+/).length
    };

    // Check for trigger patterns
    Object.entries(this.contentTriggers).forEach(([triggerType, patterns]) => {
      const matches = patterns.filter(pattern => 
        contentLower.includes(pattern.toLowerCase())
      );
      
      if (matches.length > 0) {
        analysis.triggers[triggerType] = {
          count: matches.length,
          matches: matches.slice(0, 3), // Keep top 3 matches
          confidence: Math.min(matches.length / patterns.length, 1.0)
        };
      }
    });

    // Extract emotional content
    if (emotionalState) {
      analysis.emotionalContent.primary = emotionalState.primary;
      analysis.emotionalContent.intensity = emotionalState.intensity;
      analysis.emotionalContent.confidence = emotionalState.confidence;
    }

    // Identify main themes based on triggers
    const triggerTypes = Object.keys(analysis.triggers);
    if (triggerTypes.includes('emotional_words') || triggerTypes.includes('feeling_expressions')) {
      analysis.themes.push('emotional_processing');
    }
    if (triggerTypes.includes('learning_content') || triggerTypes.includes('academic_subjects')) {
      analysis.themes.push('academic_learning');
    }
    if (triggerTypes.includes('challenge_mentions') || triggerTypes.includes('difficulty_expressions')) {
      analysis.themes.push('problem_solving');
    }
    if (triggerTypes.includes('future_thinking') || triggerTypes.includes('planning_language')) {
      analysis.themes.push('goal_orientation');
    }
    if (triggerTypes.includes('positive_experiences') || triggerTypes.includes('achievement_mentions')) {
      analysis.themes.push('positive_reflection');
    }

    // Determine content complexity
    const complexWords = content.match(/\b\w{8,}\b/g) || [];
    const avgSentenceLength = content.split(/[.!?]+/).reduce((sum, s) => sum + s.split(/\s+/).length, 0) / 
                             content.split(/[.!?]+/).length;
    
    if (complexWords.length > 10 || avgSentenceLength > 20) {
      analysis.complexity = 'high';
    } else if (complexWords.length < 3 || avgSentenceLength < 10) {
      analysis.complexity = 'low';
    }

    return analysis;
  }

  // Select the most appropriate prompt types based on analysis
  selectPromptTypes(contentAnalysis, preferredTypes, previousPrompts, maxPrompts) {
    const scores = {};
    
    // Score each prompt type based on content triggers and themes
    Object.entries(this.promptTypes).forEach(([typeName, typeInfo]) => {
      let score = 0;
      
      // Base score from priority
      switch (typeInfo.priority) {
        case 'high': score += 3; break;
        case 'medium': score += 2; break;
        case 'low': score += 1; break;
      }
      
      // Boost score based on trigger matches
      typeInfo.triggers.forEach(trigger => {
        if (contentAnalysis.triggers[trigger]) {
          score += contentAnalysis.triggers[trigger].confidence * 2;
        }
      });
      
      // Boost score if in preferred types
      if (preferredTypes.includes(typeInfo.name)) {
        score += 2;
      }
      
      // Reduce score if recently used
      const recentUse = previousPrompts.filter(p => 
        p.promptType === typeInfo.name && 
        Date.now() - new Date(p.generatedAt).getTime() < 24 * 60 * 60 * 1000 // 24 hours
      ).length;
      score -= recentUse * 0.5;
      
      scores[typeInfo.name] = Math.max(0, score);
    });
    
    // Select top scoring types
    return Object.entries(scores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, maxPrompts)
      .map(([type]) => type);
  }

  // Generate a single reflection prompt of a specific type
  async generateSinglePrompt(promptType, journalContent, learningProfile, contentAnalysis) {
    const typeInfo = this.promptTypes[promptType.toUpperCase()];
    if (!typeInfo) {
      throw new ReflectionPromptError(`Unknown prompt type: ${promptType}`);
    }

    const developmentLevel = learningProfile.developmentLevel;
    const templates = this.promptTemplates[promptType.toUpperCase()][developmentLevel] || 
                     this.promptTemplates[promptType.toUpperCase()]['MIDDLE_SCHOOL'];

    // Extract relevant content elements for personalization
    const contentElements = this.extractContentElements(journalContent, contentAnalysis, promptType);

    // Select appropriate template
    const template = templates[Math.floor(Math.random() * templates.length)];

    // Generate base prompt from template
    let basePrompt = this.personalizeTemplate(template, contentElements);

    // Enhance prompt using AI for more personalized and engaging content
    const enhancedPrompt = await this.enhancePromptWithAI(
      basePrompt,
      journalContent,
      learningProfile,
      typeInfo
    );

    return {
      id: this.generatePromptId(),
      prompt: enhancedPrompt,
      promptType: typeInfo.name,
      developmentLevel,
      generatedAt: new Date().toISOString(),
      personalizedElements: contentElements,
      templateUsed: template,
      metadata: {
        contentTriggers: Object.keys(contentAnalysis.triggers),
        themes: contentAnalysis.themes,
        complexity: contentAnalysis.complexity,
        learningProfileSummary: learningProfile.summary
      }
    };
  }

  // Extract relevant elements from content for personalization
  extractContentElements(content, contentAnalysis, promptType) {
    const elements = {};
    
    // Extract emotions if present
    if (contentAnalysis.emotionalContent.primary) {
      elements.emotion = contentAnalysis.emotionalContent.primary;
    }
    
    // Extract subjects/topics
    const subjects = this.extractSubjects(content);
    if (subjects.length > 0) {
      elements.subject = subjects[0];
      elements.learning_topic = subjects[0];
    }
    
    // Extract problems/challenges
    const problems = this.extractProblems(content);
    if (problems.length > 0) {
      elements.problem = problems[0];
    }
    
    // Extract skills mentioned
    const skills = this.extractSkills(content);
    if (skills.length > 0) {
      elements.skill = skills[0];
    }
    
    return elements;
  }

  // Extract academic subjects from content
  extractSubjects(content) {
    const subjectPatterns = {
      'math': ['math', 'mathematics', 'algebra', 'geometry', 'calculus', 'numbers', 'equations'],
      'science': ['science', 'biology', 'chemistry', 'physics', 'experiment', 'hypothesis'],
      'reading': ['reading', 'book', 'story', 'literature', 'novel', 'chapter'],
      'writing': ['writing', 'essay', 'paragraph', 'composition', 'draft', 'paper'],
      'history': ['history', 'historical', 'past', 'ancient', 'civilization', 'timeline'],
      'art': ['art', 'drawing', 'painting', 'creative', 'design', 'artistic']
    };
    
    const subjects = [];
    const contentLower = content.toLowerCase();
    
    Object.entries(subjectPatterns).forEach(([subject, patterns]) => {
      if (patterns.some(pattern => contentLower.includes(pattern))) {
        subjects.push(subject);
      }
    });
    
    return subjects;
  }

  // Extract problems/challenges from content
  extractProblems(content) {
    const problemPatterns = [
      /difficult (\w+)/gi,
      /problem with (\w+)/gi,
      /trouble (\w+ing)/gi,
      /struggling with (\w+)/gi,
      /challenge (\w+ing)/gi
    ];
    
    const problems = [];
    problemPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        problems.push(...matches.map(match => match.replace(/difficult |problem with |trouble |struggling with |challenge /, '')));
      }
    });
    
    return problems.slice(0, 3); // Return top 3
  }

  // Extract skills from content
  extractSkills(content) {
    const skillPatterns = [
      /learning (\w+)/gi,
      /practicing (\w+)/gi,
      /working on (\w+)/gi,
      /getting better at (\w+)/gi
    ];
    
    const skills = [];
    skillPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        skills.push(...matches.map(match => 
          match.replace(/learning |practicing |working on |getting better at /, '')
        ));
      }
    });
    
    return skills.slice(0, 3); // Return top 3
  }

  // Personalize template with extracted content elements
  personalizeTemplate(template, elements) {
    let personalized = template;
    
    Object.entries(elements).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      if (personalized.includes(placeholder)) {
        personalized = personalized.replace(placeholder, value);
      }
    });
    
    // Remove any remaining placeholders
    personalized = personalized.replace(/{[^}]+}/g, 'this topic');
    
    return personalized;
  }

  // Enhance prompt using AI for more engaging and personalized content
  async enhancePromptWithAI(basePrompt, journalContent, learningProfile, typeInfo) {
    try {
      const enhancementPrompt = `
You are an expert educational coach creating reflection prompts for students. 

Student Context:
- Development Level: ${learningProfile.developmentLevel.replace('_', ' ').toLowerCase()}
- Performance Level: ${learningProfile.performanceLevel.toLowerCase()}
- Reading Level: Grade ${learningProfile.targetReadingLevel}

Journal Content Summary: "${journalContent.substring(0, 300)}..."

Base Reflection Prompt: "${basePrompt}"

Prompt Type: ${typeInfo.description}

Please enhance this reflection prompt to be more engaging, specific, and developmentally appropriate. Make it:
1. More personalized to the student's journal content
2. Appropriately challenging for their developmental level
3. Encouraging and supportive in tone
4. Specific enough to prompt deep thinking
5. Connected to their learning and growth

Enhanced Prompt:`;

      const enhancedResponse = await this.adaptiveGenerator.generateAdaptiveResponse({
        studentId: learningProfile.studentId,
        originalPrompt: enhancementPrompt,
        studentAge: learningProfile.targetReadingLevel * 1.5, // Approximate age from reading level
        subject: 'reflection',
        difficulty: 'medium'
      });

      // Clean up the enhanced response
      let enhanced = enhancedResponse.text
        .replace(/^Enhanced Prompt:\s*/i, '')
        .replace(/^Reflection Prompt:\s*/i, '')
        .trim();

      // Ensure it's a question if it should be
      if (!enhanced.includes('?') && (basePrompt.includes('?') || enhanced.length < 200)) {
        enhanced += '?';
      }

      return enhanced.length > 50 ? enhanced : basePrompt;

    } catch (error) {
      console.warn('⚠️ Failed to enhance prompt with AI, using base prompt:', error.message);
      return basePrompt;
    }
  }

  // Generate unique prompt ID
  generatePromptId() {
    return `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate fallback prompts when main generation fails
  generateFallbackPrompts(options, error) {
    const { studentAge = 12, maxPrompts = 3 } = options;
    
    // Determine appropriate developmental level
    const developmentLevel = studentAge <= 8 ? 'EARLY_ELEMENTARY' :
                            studentAge <= 11 ? 'LATE_ELEMENTARY' :
                            studentAge <= 14 ? 'MIDDLE_SCHOOL' : 'HIGH_SCHOOL';

    const fallbackPrompts = {
      EARLY_ELEMENTARY: [
        "What was the best part of your day? How did it make you feel?",
        "What's something new you learned today? What made it interesting?",
        "If you could tell someone about your day, what would you say?"
      ],
      LATE_ELEMENTARY: [
        "What challenged you today, and how did you work through it?",
        "How did your feelings change throughout the day? What caused those changes?",
        "What's one thing you're proud of from today, and why?"
      ],
      MIDDLE_SCHOOL: [
        "What insights about yourself did you gain from today's experiences?",
        "How did today's events connect to your goals and aspirations?",
        "What would you do differently if you could repeat today, and why?"
      ],
      HIGH_SCHOOL: [
        "How do today's experiences contribute to your personal growth and development?",
        "What patterns do you notice in your thoughts, feelings, and actions today?",
        "How might today's lessons influence your future decisions and actions?"
      ]
    };

    const prompts = fallbackPrompts[developmentLevel].slice(0, maxPrompts).map((prompt, index) => ({
      id: `fallback_${Date.now()}_${index}`,
      prompt,
      promptType: 'general-reflection',
      developmentLevel,
      generatedAt: new Date().toISOString(),
      metadata: {
        fallback: true,
        error: error.message
      }
    }));

    return {
      prompts,
      contentAnalysis: { themes: ['general'], triggers: {}, fallback: true },
      metadata: {
        generated: prompts.length,
        fallback: true,
        developmentLevel,
        error: error.message
      }
    };
  }

  // Log prompt generation activity
  async logPromptGeneration(studentId, generationData) {
    try {
      await activityMonitor.logActivity({
        studentId,
        sessionId: `reflection_${Date.now()}`,
        activityType: 'reflection_prompt_generation',
        details: {
          contentAnalysis: generationData.contentAnalysis,
          selectedTypes: generationData.selectedTypes,
          generatedCount: generationData.generatedCount,
          journalContentLength: generationData.journalContent.length,
          learningProfile: generationData.learningProfile
        },
        severity: 'low',
        context: {
          feature: 'reflection_prompts',
          success: generationData.generatedCount > 0
        }
      });
    } catch (error) {
      console.warn('⚠️ Could not log prompt generation activity:', error.message);
    }
  }

  // Health check for the reflection prompt generator
  async healthCheck() {
    try {
      const adaptiveHealth = await this.adaptiveGenerator.healthCheck();
      const aiHealth = await this.aiService.checkHealth();
      
      return {
        status: 'healthy',
        service: 'reflection-prompt-generator',
        dependencies: {
          adaptiveResponseGenerator: adaptiveHealth.status,
          aiService: aiHealth.overall,
          activityMonitor: true
        },
        features: {
          promptTypes: Object.keys(this.promptTypes).length,
          contentTriggers: Object.keys(this.contentTriggers).length,
          templateVariants: Object.values(this.promptTemplates).reduce((sum, type) => 
            sum + Object.values(type).reduce((typeSum, level) => typeSum + level.length, 0), 0
          )
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'reflection-prompt-generator',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Singleton instance
let reflectionPromptGeneratorInstance = null;

const getReflectionPromptGenerator = () => {
  if (!reflectionPromptGeneratorInstance) {
    reflectionPromptGeneratorInstance = new ReflectionPromptGenerator();
  }
  return reflectionPromptGeneratorInstance;
};

module.exports = {
  ReflectionPromptGenerator,
  getReflectionPromptGenerator,
  ReflectionPromptError,
  PROMPT_TYPES,
  CONTENT_TRIGGERS,
  PROMPT_TEMPLATES
}; 