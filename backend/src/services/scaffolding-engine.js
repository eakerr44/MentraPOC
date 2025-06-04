const { 
  getIntelligentLearningHistory, 
  generateContextSummary,
  DEVELOPMENT_LEVELS,
  PERFORMANCE_THRESHOLDS
} = require('./context-manager');

// Scaffolding prompt templates organized by educational purpose
const SCAFFOLDING_TEMPLATES = {
  // Problem-solving guidance templates
  PROBLEM_SOLVING: {
    SOCRATIC_GUIDED: {
      introduction: "Let's work through this step by step. I'll help guide your thinking.",
      question_starters: [
        "What do you notice about this problem first?",
        "Can you break this down into smaller parts?",
        "What strategy might work here?",
        "How is this similar to problems you've solved before?"
      ],
      encouragement: [
        "You're on the right track! Keep thinking...",
        "Good observation! What comes next?",
        "I can see you're making progress. Continue with that approach.",
        "Excellent thinking! Let's build on that idea."
      ],
      hints: {
        gentle: "Think about what you already know about {subject}.",
        moderate: "Remember that {concept} usually involves {strategy}.",
        direct: "Try using {specific_method} to solve this part."
      }
    },
    SIMPLE_CONCRETE: {
      introduction: "Let's solve this together! I'll help you each step.",
      question_starters: [
        "What numbers do you see in this problem?",
        "What is the problem asking you to find?",
        "Which operation should we use: add, subtract, multiply, or divide?",
        "Can you show me with pictures or objects?"
      ],
      encouragement: [
        "Great job! You're doing wonderful!",
        "Perfect! You've got it!",
        "That's exactly right! Well done!",
        "You're such a good problem solver!"
      ],
      hints: {
        gentle: "Look at the {visual_element} in the problem.",
        moderate: "Remember, when we {action}, we use {tool}.",
        direct: "Let's try {step_by_step_instruction}."
      }
    },
    SOCRATIC_INDEPENDENT: {
      introduction: "This is an interesting challenge. Let's explore it together.",
      question_starters: [
        "What assumptions might we make about this problem?",
        "How could you approach this from multiple angles?",
        "What connections do you see to broader concepts?",
        "What would happen if we changed one variable?"
      ],
      encouragement: [
        "Your analytical approach is impressive.",
        "I appreciate how you're thinking critically about this.",
        "Your reasoning shows deep understanding.",
        "That's a sophisticated way to approach the problem."
      ],
      hints: {
        gentle: "Consider the underlying principles of {subject_area}.",
        moderate: "You might want to explore {advanced_concept} in this context.",
        direct: "The key insight here involves {complex_relationship}."
      }
    }
  },

  // Mistake analysis and correction templates
  MISTAKE_ANALYSIS: {
    SUPPORTIVE: {
      opening: "I notice something we can improve here. Let's take a look together.",
      analysis_prompts: [
        "Can you walk me through your thinking on this step?",
        "What made you choose this approach?",
        "Let's check this part carefully - what do you think?",
        "How might we verify if this answer makes sense?"
      ],
      correction_guidance: {
        gentle: "Let's try a different approach here. What if we...",
        specific: "I see the mix-up. Remember that {concept} works like this: {explanation}",
        encouraging: "You're very close! The only thing to adjust is {specific_error}"
      },
      reinforcement: [
        "Mistakes help us learn! You're doing great.",
        "That's how we grow - by trying and improving.",
        "I love how you're working through this carefully.",
        "Your effort is what matters most."
      ]
    },
    ANALYTICAL: {
      opening: "Let's analyze what happened here and strengthen your understanding.",
      analysis_prompts: [
        "Where do you think the error occurred in your process?",
        "What patterns do you notice in similar mistakes?",
        "How does this connect to the fundamental concept?",
        "What strategy could prevent this type of error?"
      ],
      correction_guidance: {
        systematic: "Let's establish a systematic approach: {step_by_step}",
        conceptual: "The underlying concept here is {principle}. How does that apply?",
        metacognitive: "What self-checking strategy could you use next time?"
      }
    }
  },

  // Reflection and journal prompts
  REFLECTION: {
    ELEMENTARY: {
      prompts: [
        "What was the most interesting thing you learned today?",
        "How did you feel when you solved that problem?",
        "What would you like to learn more about?",
        "When did you feel proud of your work today?"
      ],
      follow_ups: [
        "Tell me more about that!",
        "What made it interesting to you?",
        "How do you think you can learn more about that?",
        "What helped you feel proud?"
      ]
    },
    MIDDLE_SCHOOL: {
      prompts: [
        "What strategies worked best for you in today's learning?",
        "How did you overcome challenges you faced?",
        "What connections can you make between today's learning and other subjects?",
        "What questions do you still have about this topic?"
      ],
      follow_ups: [
        "Can you explain why that strategy was effective?",
        "How might you apply that problem-solving approach elsewhere?",
        "What other subjects or experiences does this remind you of?",
        "What would help you explore those questions further?"
      ]
    },
    HIGH_SCHOOL: {
      prompts: [
        "How has your understanding of this concept evolved?",
        "What assumptions did you challenge in your learning today?",
        "How might this knowledge apply to real-world scenarios?",
        "What aspects of this topic would you like to investigate further?"
      ],
      follow_ups: [
        "What evidence supports that evolution in thinking?",
        "How did questioning those assumptions deepen your understanding?",
        "Can you envision specific applications or implications?",
        "What research questions or investigations might that lead to?"
      ]
    }
  },

  // Emotional support and motivation templates
  EMOTIONAL_SUPPORT: {
    FRUSTRATED: {
      acknowledgment: "I can see this is frustrating. That's completely normal when learning something new.",
      reframing: [
        "Let's break this into smaller, manageable steps.",
        "Remember how you successfully solved {previous_success}? You have those same skills here.",
        "Every expert was once a beginner. You're building important skills.",
        "Frustration often means you're at the edge of learning something new."
      ],
      encouragement: [
        "Take a deep breath. We'll work through this together.",
        "Your persistence is impressive, even when things are hard.",
        "I believe in your ability to figure this out.",
        "You've overcome challenges before, and you can do it again."
      ]
    },
    CONFIDENT: {
      acknowledgment: "I love seeing your confidence! You're really getting this.",
      challenge_extension: [
        "Since you've mastered this, would you like to try a more complex version?",
        "How might you explain this concept to someone who's just learning it?",
        "What do you think would happen if we changed {variable}?",
        "Can you create your own problem similar to this one?"
      ],
      leadership: [
        "Your strong understanding could help other students. How might you share your approach?",
        "What advice would you give to someone struggling with this?",
        "Your confidence is inspiring. What helped you feel so sure about this?"
      ]
    },
    CONFUSED: {
      acknowledgment: "It's okay to feel confused. Confusion is often the first step toward understanding.",
      clarification: [
        "Let's go back to what you do understand and build from there.",
        "What part makes the most sense to you right now?",
        "Would it help to see this explained in a different way?",
        "Sometimes drawing a picture or diagram can help clarify things."
      ],
      support: [
        "There's no rush. We'll take the time you need.",
        "Questions are wonderful - they show you're thinking deeply.",
        "Let's explore this confusion together. It often leads to the best learning.",
        "I'm here to help you make sense of this."
      ]
    }
  },

  // Subject-specific scaffolding templates
  MATHEMATICS: {
    WORD_PROBLEMS: {
      setup: "Let's break down this word problem step by step.",
      steps: [
        "First, what is the problem asking us to find?",
        "What information are we given?",
        "What operation(s) do we need to use?",
        "Let's set up the equation or solution method.",
        "Now let's solve it step by step.",
        "Finally, does our answer make sense in the context?"
      ],
      common_strategies: [
        "Draw a picture or diagram",
        "Make a table or chart", 
        "Look for patterns",
        "Work backwards from the answer",
        "Guess and check systematically"
      ]
    },
    ALGEBRA: {
      concepts: {
        variables: "A variable is like a placeholder for a number we don't know yet.",
        equations: "An equation is like a balance scale - what we do to one side, we must do to the other.",
        functions: "A function is like a machine that takes an input and gives a consistent output."
      },
      problem_solving: [
        "What are we trying to find? Let's call that variable {variable}.",
        "What relationships can we identify between the known and unknown quantities?",
        "How can we express those relationships as equations?",
        "What algebraic techniques can help us solve for {variable}?"
      ]
    }
  },

  SCIENCE: {
    HYPOTHESIS_FORMATION: {
      guided_questions: [
        "What do you think will happen and why?",
        "What evidence or prior knowledge supports your prediction?",
        "How could we test this idea?",
        "What would we expect to observe if your hypothesis is correct?"
      ],
      templates: [
        "If {condition}, then {predicted_outcome} because {reasoning}.",
        "Based on {prior_knowledge}, I predict that {outcome} will occur when {condition}.",
        "I hypothesize that {relationship} exists between {variable_1} and {variable_2}."
      ]
    },
    EXPERIMENTAL_DESIGN: {
      framework: [
        "What question are we trying to answer?",
        "What variable will we change (independent variable)?",
        "What will we measure (dependent variable)?",
        "What factors must we keep the same (controlled variables)?",
        "How will we ensure our results are reliable?"
      ]
    }
  }
};

// Dynamic prompt generation based on context and student needs
class ScaffoldingEngine {
  constructor() {
    this.templates = SCAFFOLDING_TEMPLATES;
  }

  // Generate personalized scaffolding prompt based on student context
  async generateScaffoldingPrompt(options = {}) {
    try {
      const {
        studentId,
        currentContent,
        scaffoldingType = 'PROBLEM_SOLVING',
        subject = 'general',
        difficulty = 'medium',
        emotionalState = null,
        sessionContext = {},
        includeContext = true
      } = options;

      // Get intelligent learning history and recommendations
      let contextAnalysis = null;
      let scaffoldingRecommendations = null;

      if (includeContext && studentId) {
        try {
          const contextSummary = await generateContextSummary(studentId, currentContent, {
            maxContexts: 5,
            currentSubject: subject,
            currentDifficulty: difficulty
          });

          if (contextSummary.context_available) {
            contextAnalysis = contextSummary;
            scaffoldingRecommendations = contextSummary.scaffolding_recommendations;
          }
        } catch (error) {
          console.log('Context analysis not available, using default scaffolding');
        }
      }

      // Determine scaffolding style based on context or defaults
      const scaffoldingStyle = this._determineScaffoldingStyle(
        scaffoldingRecommendations,
        emotionalState,
        difficulty,
        scaffoldingType
      );

      // Generate base prompt from templates
      const basePrompt = this._generateBasePrompt(
        scaffoldingType,
        scaffoldingStyle,
        subject,
        currentContent
      );

      // Personalize prompt based on context analysis
      const personalizedPrompt = this._personalizePrompt(
        basePrompt,
        contextAnalysis,
        scaffoldingRecommendations,
        emotionalState
      );

      // Add context-aware enhancements
      const enhancedPrompt = this._addContextualEnhancements(
        personalizedPrompt,
        contextAnalysis,
        sessionContext
      );

      return {
        prompt: enhancedPrompt,
        scaffolding_style: scaffoldingStyle,
        context_used: !!contextAnalysis,
        recommendations: scaffoldingRecommendations,
        template_type: scaffoldingType,
        personalization_factors: this._getPersonalizationFactors(contextAnalysis)
      };

    } catch (error) {
      console.error('❌ Failed to generate scaffolding prompt:', error);
      
      // Fallback to basic prompt
      const fallbackPrompt = this._generateFallbackPrompt(scaffoldingType, subject, currentContent);
      return {
        prompt: fallbackPrompt,
        scaffolding_style: 'BALANCED',
        context_used: false,
        error: error.message
      };
    }
  }

  // Determine appropriate scaffolding style based on analysis
  _determineScaffoldingStyle(recommendations, emotionalState, difficulty, scaffoldingType = 'PROBLEM_SOLVING') {
    // For PROBLEM_SOLVING, use the existing logic
    if (scaffoldingType === 'PROBLEM_SOLVING') {
      // Use context-based recommendations if available
      if (recommendations) {
        const approach = recommendations.scaffoldingApproach;
        
        if (approach === 'supportive') return 'SIMPLE_CONCRETE';
        if (approach === 'challenging') return 'SOCRATIC_INDEPENDENT';
        if (approach === 'balanced') return 'SOCRATIC_GUIDED';
      }

      // Fallback to emotional state and difficulty
      if (emotionalState) {
        if (['frustrated', 'confused', 'anxious'].includes(emotionalState)) {
          return 'SIMPLE_CONCRETE';
        }
        if (['confident', 'engaged', 'excited'].includes(emotionalState)) {
          return difficulty === 'hard' ? 'SOCRATIC_INDEPENDENT' : 'SOCRATIC_GUIDED';
        }
      }

      // Default based on difficulty
      if (difficulty === 'easy') return 'SIMPLE_CONCRETE';
      if (difficulty === 'hard') return 'SOCRATIC_INDEPENDENT';
      return 'SOCRATIC_GUIDED';
    }

    // For MISTAKE_ANALYSIS, map to appropriate styles
    if (scaffoldingType === 'MISTAKE_ANALYSIS') {
      if (recommendations) {
        const approach = recommendations.scaffoldingApproach;
        if (approach === 'supportive') return 'SUPPORTIVE';
        if (approach === 'challenging') return 'ANALYTICAL';
      }

      // Map emotional states to mistake analysis styles
      if (emotionalState && ['frustrated', 'confused', 'anxious'].includes(emotionalState)) {
        return 'SUPPORTIVE';
      }
      
      // Default to supportive for mistake analysis
      return 'SUPPORTIVE';
    }

    // For EMOTIONAL_SUPPORT, map directly to emotional states
    if (scaffoldingType === 'EMOTIONAL_SUPPORT') {
      if (emotionalState) {
        const upperState = emotionalState.toUpperCase();
        // Check if the emotional state exists in our templates
        if (this.templates.EMOTIONAL_SUPPORT[upperState]) {
          return upperState;
        }
      }
      
      // Default emotional support mapping
      if (['frustrated', 'anxious'].includes(emotionalState)) return 'FRUSTRATED';
      if (['confident', 'engaged', 'excited'].includes(emotionalState)) return 'CONFIDENT';
      return 'CONFUSED'; // Default fallback
    }

    // For REFLECTION, map to development/age levels
    if (scaffoldingType === 'REFLECTION') {
      if (recommendations && recommendations.development_level) {
        const devLevel = recommendations.development_level;
        if (devLevel === 'EARLY_ELEMENTARY' || devLevel === 'LATE_ELEMENTARY') return 'ELEMENTARY';
        if (devLevel === 'MIDDLE_SCHOOL') return 'MIDDLE_SCHOOL';
        if (devLevel === 'HIGH_SCHOOL') return 'HIGH_SCHOOL';
      }

      // Fallback based on difficulty level
      if (difficulty === 'easy') return 'ELEMENTARY';
      if (difficulty === 'hard') return 'HIGH_SCHOOL';
      return 'MIDDLE_SCHOOL';
    }

    // Fallback to problem-solving logic for unknown types
    return 'SOCRATIC_GUIDED';
  }

  // Generate base prompt from templates
  _generateBasePrompt(scaffoldingType, scaffoldingStyle, subject, currentContent) {
    const templates = this.templates[scaffoldingType];
    
    if (!templates || !templates[scaffoldingStyle]) {
      return this._generateGenericPrompt(scaffoldingType, currentContent);
    }

    const template = templates[scaffoldingStyle];
    let prompt = '';

    // Add introduction
    if (template.introduction) {
      prompt += template.introduction + '\n\n';
    }

    // Add content-specific guidance
    if (scaffoldingType === 'PROBLEM_SOLVING') {
      prompt += this._generateProblemSolvingGuidance(template, subject, currentContent);
    } else if (scaffoldingType === 'MISTAKE_ANALYSIS') {
      prompt += this._generateMistakeAnalysisGuidance(template, currentContent);
    } else if (scaffoldingType === 'REFLECTION') {
      prompt += this._generateReflectionPrompt(template);
    }

    return prompt;
  }

  // Generate problem-solving guidance
  _generateProblemSolvingGuidance(template, subject, currentContent) {
    let guidance = '';

    // Add a relevant question starter
    if (template.question_starters && template.question_starters.length > 0) {
      const randomQuestion = template.question_starters[
        Math.floor(Math.random() * template.question_starters.length)
      ];
      guidance += randomQuestion + '\n\n';
    }

    // Add subject-specific guidance if available
    if (this.templates[subject.toUpperCase()]) {
      const subjectTemplates = this.templates[subject.toUpperCase()];
      if (subjectTemplates.WORD_PROBLEMS && currentContent && currentContent.toLowerCase().includes('problem')) {
        guidance += "Let's use our problem-solving strategy:\n";
        guidance += subjectTemplates.WORD_PROBLEMS.steps.slice(0, 3).join('\n') + '\n\n';
      }
    }

    // Add encouragement
    if (template.encouragement && template.encouragement.length > 0) {
      const randomEncouragement = template.encouragement[
        Math.floor(Math.random() * template.encouragement.length)
      ];
      guidance += randomEncouragement;
    }

    return guidance;
  }

  // Generate mistake analysis guidance
  _generateMistakeAnalysisGuidance(template, currentContent) {
    let guidance = template.opening + '\n\n';

    // Add analysis prompt
    if (template.analysis_prompts && template.analysis_prompts.length > 0) {
      const randomPrompt = template.analysis_prompts[
        Math.floor(Math.random() * template.analysis_prompts.length)
      ];
      guidance += randomPrompt + '\n\n';
    }

    // Add supportive reinforcement
    if (template.reinforcement && template.reinforcement.length > 0) {
      const randomReinforcement = template.reinforcement[
        Math.floor(Math.random() * template.reinforcement.length)
      ];
      guidance += randomReinforcement;
    }

    return guidance;
  }

  // Generate reflection prompt
  _generateReflectionPrompt(template) {
    if (!template.prompts || template.prompts.length === 0) {
      return "What did you learn from this experience?";
    }

    const randomPrompt = template.prompts[
      Math.floor(Math.random() * template.prompts.length)
    ];

    return randomPrompt;
  }

  // Personalize prompt based on context analysis
  _personalizePrompt(basePrompt, contextAnalysis, recommendations, emotionalState) {
    let personalizedPrompt = basePrompt;

    if (!contextAnalysis) return personalizedPrompt;

    // Add context-aware personalization
    if (contextAnalysis.learning_patterns) {
      const patterns = contextAnalysis.learning_patterns;

      // Reference past successes
      if (patterns.strengthAreas && patterns.strengthAreas.length > 0) {
        const strength = patterns.strengthAreas[0][0];
        personalizedPrompt += `\n\nRemember how well you did with ${strength}? You can use those same problem-solving skills here.`;
      }

      // Address struggle areas supportively
      if (patterns.struggleAreas && patterns.struggleAreas.length > 0) {
        const struggle = patterns.struggleAreas[0][0];
        personalizedPrompt += `\n\nI know ${struggle} has been challenging, so let's take this step by step.`;
      }

      // Acknowledge emotional patterns
      if (emotionalState && patterns.emotionalPatterns[emotionalState]) {
        personalizedPrompt += this._addEmotionalAcknowledgment(emotionalState);
      }
    }

    return personalizedPrompt;
  }

  // Add contextual enhancements based on learning history
  _addContextualEnhancements(prompt, contextAnalysis, sessionContext) {
    if (!contextAnalysis || !contextAnalysis.raw_contexts) return prompt;

    let enhancedPrompt = prompt;

    // Reference similar past interactions
    const similarContexts = contextAnalysis.raw_contexts
      .filter(ctx => ctx.type === 'similar_interaction')
      .slice(0, 2);

    if (similarContexts.length > 0) {
      enhancedPrompt += '\n\n---\n';
      enhancedPrompt += "Building on your previous work:\n";
      
      similarContexts.forEach((ctx, index) => {
        if (ctx.performance_metrics && ctx.performance_metrics.accuracy > 0.7) {
          enhancedPrompt += `• You successfully worked with similar concepts when you ${ctx.content.substring(0, 60)}...\n`;
        }
      });
    }

    return enhancedPrompt;
  }

  // Add emotional acknowledgment based on state
  _addEmotionalAcknowledgment(emotionalState) {
    const emotionalTemplates = this.templates.EMOTIONAL_SUPPORT[emotionalState.toUpperCase()];
    
    if (!emotionalTemplates) return '';

    const acknowledgment = emotionalTemplates.acknowledgment;
    const supportMessage = emotionalTemplates.reframing ? 
      emotionalTemplates.reframing[0] : 
      emotionalTemplates.encouragement?.[0] || '';

    return `\n\n${acknowledgment} ${supportMessage}`;
  }

  // Generate fallback prompt when context is unavailable
  _generateFallbackPrompt(scaffoldingType, subject, currentContent) {
    const fallbacks = {
      PROBLEM_SOLVING: `Let's work through this problem together. Can you tell me what you understand about it so far?`,
      MISTAKE_ANALYSIS: `Let's take a look at this together and see how we can improve it.`,
      REFLECTION: `What are your thoughts about this learning experience?`,
      EMOTIONAL_SUPPORT: `I'm here to help you with this. Let's take it one step at a time.`
    };

    return fallbacks[scaffoldingType] || "How can I help you with this?";
  }

  // Generate generic prompt when specific templates aren't available
  _generateGenericPrompt(scaffoldingType, currentContent) {
    return `Let's work on this together. I'm here to help you understand and learn.`;
  }

  // Extract personalization factors for logging/analysis
  _getPersonalizationFactors(contextAnalysis) {
    if (!contextAnalysis) return {};

    return {
      performance_trend: contextAnalysis.learning_patterns?.performanceTrend,
      engagement_level: contextAnalysis.learning_patterns?.engagementLevel,
      struggle_areas_count: contextAnalysis.learning_patterns?.struggleAreas?.length || 0,
      strength_areas_count: contextAnalysis.learning_patterns?.strengthAreas?.length || 0,
      development_level: contextAnalysis.development_assessment?.level,
      contexts_used: contextAnalysis.analysis_metadata?.selected_count || 0
    };
  }

  // Generate multiple prompt variations for A/B testing
  async generatePromptVariations(options = {}, variationCount = 3) {
    const variations = [];

    for (let i = 0; i < variationCount; i++) {
      // Vary the scaffolding approach slightly
      const modifiedOptions = {
        ...options,
        includeContext: i < 2, // First two use context, last one doesn't
      };

      const variation = await this.generateScaffoldingPrompt(modifiedOptions);
      variations.push({
        id: i + 1,
        ...variation
      });
    }

    return variations;
  }

  // Get available template types
  getAvailableTemplateTypes() {
    return Object.keys(this.templates);
  }

  // Get available scaffolding styles for a template type
  getAvailableScaffoldingStyles(templateType) {
    const template = this.templates[templateType];
    return template ? Object.keys(template) : [];
  }
}

// Export singleton instance
const scaffoldingEngine = new ScaffoldingEngine();

module.exports = {
  ScaffoldingEngine,
  scaffoldingEngine,
  SCAFFOLDING_TEMPLATES
}; 