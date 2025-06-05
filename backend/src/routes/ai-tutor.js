const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const { roleCheck } = require('../middleware/role-check');
const { ScaffoldingEngine } = require('../services/scaffolding-engine');
const { AIService } = require('../services/ai-service');
const { SafetyFilter } = require('../services/safety-filter');

const router = express.Router();

// Mock data for development - in production this would come from database
const mockSessions = new Map();
const mockSuggestedQuestions = {
  math: [
    "I'm struggling with fractions - can you help me understand them?",
    "How do I solve quadratic equations?",
    "What's the difference between area and perimeter?",
    "Can you help me with word problems?"
  ],
  science: [
    "Why do things fall at the same rate?",
    "How does photosynthesis work?",
    "What makes the sky blue?",
    "Can you explain the water cycle?"
  ],
  english: [
    "How do I write a good essay introduction?",
    "What's the difference between metaphors and similes?",
    "How can I improve my grammar?",
    "What makes a story interesting?"
  ],
  history: [
    "Why did the American Revolution happen?",
    "How did ancient civilizations communicate?",
    "What caused World War I?",
    "How has technology changed society?"
  ],
  art: [
    "What are the primary colors?",
    "How do I draw realistic faces?",
    "What's the difference between modern and classical art?",
    "How do artists use perspective?"
  ],
  general: [
    "I need help with my homework - where do I start?",
    "How can I study more effectively?",
    "I'm feeling overwhelmed with school - can you help?",
    "What's the best way to take notes?"
  ]
};

// Initialize services
const scaffoldingEngine = new ScaffoldingEngine();
const safetyFilter = new SafetyFilter();

// GET /api/ai-tutor/suggested-questions - Get suggested starter questions
router.get('/suggested-questions', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const { subject } = req.query;
    console.log(`🤔 Getting suggested questions for subject: ${subject || 'general'}`);
    
    // Development mode: Return mock suggestions
    if (process.env.NODE_ENV === 'development') {
      const questions = mockSuggestedQuestions[subject] || mockSuggestedQuestions.general;
      return res.json({ questions });
    }
    
    // Production would fetch from database or AI service
    res.json({ questions: mockSuggestedQuestions.general });
  } catch (error) {
    console.error('Error fetching suggested questions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch suggested questions',
      message: error.message 
    });
  }
});

// POST /api/ai-tutor/sessions - Start a new tutoring session
router.post('/sessions', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject, topic, initialQuestion, context } = req.body;
    
    console.log(`🎓 Starting new AI tutor session for user ${userId}`);
    
    // Development mode: Create mock session
    if (process.env.NODE_ENV === 'development' && userId === 'demo-user-1') {
      const sessionId = `session-${Date.now()}`;
      const session = {
        id: sessionId,
        student_id: userId,
        subject: subject || 'general',
        topic: topic || 'General Help',
        started_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        status: 'active',
        messages: [],
        context: {
          learningGoals: context?.learningGoals || [],
          currentConcepts: [],
          difficultyLevel: context?.difficultyPreference || 'intermediate',
          emotionalState: context?.emotionalState || 'curious'
        }
      };
      
      // Add welcome message
      const welcomeMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: generateWelcomeMessage(subject, context?.emotionalState),
        timestamp: new Date().toISOString(),
        metadata: {
          subject,
          scaffoldingType: 'welcome',
          emotionalState: context?.emotionalState || 'curious'
        }
      };
      
      session.messages.push(welcomeMessage);
      mockSessions.set(sessionId, session);
      
      console.log(`✅ Created mock tutoring session: ${sessionId}`);
      return res.json({ session });
    }
    
    // Real implementation would create database record and initialize AI context
    res.status(501).json({ error: 'AI Tutor not fully implemented for production' });
  } catch (error) {
    console.error('Error starting tutoring session:', error);
    res.status(500).json({ 
      error: 'Failed to start tutoring session',
      message: error.message 
    });
  }
});

// GET /api/ai-tutor/sessions - Get user's tutoring sessions
router.get('/sessions', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`📚 Getting tutoring sessions for user ${userId}`);
    
    // Development mode: Return mock sessions
    if (process.env.NODE_ENV === 'development' && userId === 'demo-user-1') {
      const userSessions = Array.from(mockSessions.values())
        .filter(session => session.student_id === userId)
        .sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity));
      
      return res.json({ sessions: userSessions });
    }
    
    res.json({ sessions: [] });
  } catch (error) {
    console.error('Error fetching tutoring sessions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tutoring sessions',
      message: error.message 
    });
  }
});

// GET /api/ai-tutor/sessions/:sessionId - Get specific tutoring session
router.get('/sessions/:sessionId', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    console.log(`📖 Getting tutoring session ${sessionId} for user ${userId}`);
    
    // Development mode: Return mock session
    if (process.env.NODE_ENV === 'development' && userId === 'demo-user-1') {
      const session = mockSessions.get(sessionId);
      if (!session || session.student_id !== userId) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      return res.json({ session });
    }
    
    res.status(404).json({ error: 'Session not found' });
  } catch (error) {
    console.error('Error fetching tutoring session:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tutoring session',
      message: error.message 
    });
  }
});

// POST /api/ai-tutor/sessions/:sessionId/message - Send message in tutoring session
router.post('/sessions/:sessionId/message', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { message, context } = req.body;
    
    console.log(`💬 Processing message in session ${sessionId} for user ${userId}`);
    
    // Safety check on user input
    const safetyCheck = await safetyFilter.checkSafety(message, {
      studentId: userId,
      contextType: 'ai_tutor',
      strictMode: true
    });
    if (!safetyCheck.safe) {
      console.warn(`⚠️ Unsafe input detected: ${safetyCheck.violations.map(v => v.type).join(', ')}`);
      return res.status(400).json({
        error: 'Inappropriate content detected',
        message: 'Please keep your questions focused on learning topics.'
      });
    }
    
    // Development mode: Generate mock AI response
    if (process.env.NODE_ENV === 'development' && userId === 'demo-user-1') {
      const session = mockSessions.get(sessionId);
      if (!session || session.student_id !== userId) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      // Generate scaffolded AI response
      const aiResponse = await generateScaffoldedResponse(message, session, context);
      
      // Update session
      session.last_activity = new Date().toISOString();
      session.context.currentConcepts = aiResponse.conceptsDetected || [];
      mockSessions.set(sessionId, session);
      
      return res.json(aiResponse);
    }
    
    res.status(501).json({ error: 'AI Tutor not fully implemented for production' });
  } catch (error) {
    console.error('Error processing tutoring message:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      message: error.message 
    });
  }
});

// POST /api/ai-tutor/quick-help - Get quick help without session
router.post('/quick-help', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const { question, context } = req.body;
    const userId = req.user.id;
    
    console.log(`🚀 Processing quick help for user ${userId}`);
    
    // Safety check
    const safetyCheck = await safetyFilter.checkSafety(question, {
      studentId: userId,
      contextType: 'ai_tutor',
      strictMode: true
    });
    if (!safetyCheck.safe) {
      return res.status(400).json({
        error: 'Inappropriate content detected',
        message: 'Please keep your questions focused on learning topics.'
      });
    }
    
    // Development mode: Generate mock response
    if (process.env.NODE_ENV === 'development' && userId === 'demo-user-1') {
      const quickResponse = await generateQuickHelpResponse(question, context);
      return res.json(quickResponse);
    }
    
    res.status(501).json({ error: 'Quick help not fully implemented for production' });
  } catch (error) {
    console.error('Error processing quick help:', error);
    res.status(500).json({ 
      error: 'Failed to process quick help',
      message: error.message 
    });
  }
});

// POST /api/ai-tutor/sessions/:sessionId/end - End tutoring session
router.post('/sessions/:sessionId/end', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const { feedback } = req.body;
    
    console.log(`🏁 Ending tutoring session ${sessionId} for user ${userId}`);
    
    // Development mode: Update mock session
    if (process.env.NODE_ENV === 'development' && userId === 'demo-user-1') {
      const session = mockSessions.get(sessionId);
      if (!session || session.student_id !== userId) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      session.status = 'completed';
      session.last_activity = new Date().toISOString();
      if (feedback) {
        session.feedback = feedback;
      }
      
      mockSessions.set(sessionId, session);
      return res.json({ session });
    }
    
    res.status(404).json({ error: 'Session not found' });
  } catch (error) {
    console.error('Error ending tutoring session:', error);
    res.status(500).json({ 
      error: 'Failed to end tutoring session',
      message: error.message 
    });
  }
});

// POST /api/ai-tutor/report-issue - Report issue with AI response
router.post('/report-issue', authenticateJWT, roleCheck(['student']), async (req, res) => {
  try {
    const { sessionId, messageId, issueType, description } = req.body;
    const userId = req.user.id;
    
    console.log(`🚨 Issue reported by user ${userId}: ${issueType}`);
    
    // In production, this would log to safety monitoring system
    console.warn(`AI Safety Report - User: ${userId}, Session: ${sessionId}, Message: ${messageId}, Type: ${issueType}, Description: ${description}`);
    
    res.json({ message: 'Issue reported successfully. Thank you for helping us improve.' });
  } catch (error) {
    console.error('Error reporting issue:', error);
    res.status(500).json({ 
      error: 'Failed to report issue',
      message: error.message 
    });
  }
});

// Helper functions for mock responses

function generateWelcomeMessage(subject, emotionalState) {
  const welcomes = {
    math: "Hi there! I'm excited to help you with math today. What mathematical concept would you like to explore?",
    science: "Welcome! I love helping students discover the wonders of science. What scientific question is on your mind?",
    english: "Hello! I'm here to help you with English and writing. What would you like to work on together?",
    history: "Greetings! History is full of fascinating stories. What historical topic interests you today?",
    art: "Hi! Art is such a wonderful way to express yourself. What artistic technique or concept would you like to learn about?",
    general: "Hello! I'm your AI tutor, and I'm here to help you learn by asking the right questions and guiding your thinking. What subject or topic would you like to explore today?"
  };
  
  let message = welcomes[subject] || welcomes.general;
  
  if (emotionalState === 'frustrated') {
    message = "I can sense you might be feeling a bit frustrated, and that's completely okay! Learning can be challenging sometimes. " + message + " Let's take this step by step together.";
  } else if (emotionalState === 'excited') {
    message = "I love your enthusiasm for learning! " + message + " Your curiosity is going to help us have a great session.";
  }
  
  return message;
}

async function generateScaffoldedResponse(userMessage, session, context) {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  // Analyze the question to determine scaffolding approach
  const concepts = extractConcepts(userMessage, session.subject);
  const scaffoldingType = determineScaffoldingType(userMessage, session.context);
  
  // Generate response using scaffolding principles
  let responseContent = '';
  
  if (isDirectAnswerRequest(userMessage)) {
    // Redirect to scaffolded approach
    responseContent = generateSocraticResponse(userMessage, concepts, session.subject);
  } else if (isConceptualQuestion(userMessage)) {
    responseContent = generateGuidedExploration(userMessage, concepts, session.subject);
  } else {
    responseContent = generateSupportiveResponse(userMessage, session.context.emotionalState);
  }
  
  const aiMessage = {
    id: `msg-${Date.now()}`,
    role: 'assistant',
    content: responseContent,
    timestamp: new Date().toISOString(),
    metadata: {
      subject: session.subject,
      scaffoldingType,
      emotionalState: context?.emotionalState || 'engaged'
    }
  };
  
  return {
    message: aiMessage,
    scaffoldingInfo: {
      technique: scaffoldingType,
      reasoning: `Used ${scaffoldingType} approach based on question type and learning context`,
      nextSteps: generateNextSteps(concepts, session.subject)
    },
    conceptsDetected: concepts
  };
}

async function generateQuickHelpResponse(question, context) {
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1500));
  
  const concepts = extractConcepts(question, context?.subject);
  const responseContent = generateSocraticResponse(question, concepts, context?.subject);
  
  return {
    message: {
      id: `quick-${Date.now()}`,
      role: 'assistant',
      content: responseContent,
      timestamp: new Date().toISOString(),
      metadata: {
        subject: context?.subject || 'general',
        scaffoldingType: 'socratic'
      }
    },
    conceptsDetected: concepts
  };
}

function extractConcepts(message, subject) {
  const conceptMaps = {
    math: ['addition', 'subtraction', 'multiplication', 'division', 'fractions', 'algebra', 'geometry', 'equations'],
    science: ['physics', 'chemistry', 'biology', 'gravity', 'atoms', 'photosynthesis', 'evolution'],
    english: ['grammar', 'writing', 'essays', 'literature', 'poetry', 'metaphors', 'similes'],
    history: ['revolution', 'war', 'civilization', 'democracy', 'empire', 'culture', 'timeline'],
    art: ['color', 'perspective', 'drawing', 'painting', 'sculpture', 'design', 'composition']
  };
  
  const relevantConcepts = conceptMaps[subject] || [];
  const lowerMessage = message.toLowerCase();
  
  return relevantConcepts.filter(concept => 
    lowerMessage.includes(concept) || lowerMessage.includes(concept + 's')
  );
}

function determineScaffoldingType(message, context) {
  if (message.includes('?') && (message.includes('what') || message.includes('how'))) {
    return 'socratic';
  }
  if (message.includes('help') || message.includes('don\'t understand')) {
    return 'supportive';
  }
  if (context.emotionalState === 'frustrated') {
    return 'supportive';
  }
  return 'guided';
}

function isDirectAnswerRequest(message) {
  const directPhrases = ['what is', 'tell me', 'give me the answer', 'what\'s the answer'];
  return directPhrases.some(phrase => message.toLowerCase().includes(phrase));
}

function isConceptualQuestion(message) {
  const conceptPhrases = ['how does', 'why does', 'explain', 'understand'];
  return conceptPhrases.some(phrase => message.toLowerCase().includes(phrase));
}

function generateSocraticResponse(message, concepts, subject) {
  const socratics = [
    "That's a great question! Let me help you think through this. What do you already know about this topic?",
    "I can see you're thinking deeply about this. What patterns do you notice here?",
    "Excellent question! Before we dive in, what's your initial thought about how this might work?",
    "I love that you're asking this! What connections can you make to things you've learned before?",
    "That's really insightful! What would happen if we changed one part of this problem?"
  ];
  
  return socratics[Math.floor(Math.random() * socratics.length)] + 
    (concepts.length > 0 ? ` I notice you're working with ${concepts.join(', ')} - what's your understanding of these concepts?` : '');
}

function generateGuidedExploration(message, concepts, subject) {
  const guides = [
    "Let's explore this together! I'll guide you through the thinking process.",
    "Great question! Let's break this down into smaller, manageable pieces.",
    "I can help you discover the answer by asking some guiding questions.",
    "This is a perfect opportunity to practice problem-solving skills!"
  ];
  
  return guides[Math.floor(Math.random() * guides.length)] + " What's the first thing you notice about this problem?";
}

function generateSupportiveResponse(message, emotionalState) {
  if (emotionalState === 'frustrated') {
    return "I can see this is challenging, and that's completely normal! Every expert was once a beginner. Let's take this one step at a time. What part feels most confusing to you right now?";
  }
  
  return "I'm here to help you learn! Remember, the goal isn't to get the right answer immediately - it's to understand the thinking process. What questions do you have?";
}

function generateNextSteps(concepts, subject) {
  return [
    "Think about what you already know",
    "Break the problem into smaller parts",
    "Look for patterns or connections",
    "Consider what tools or methods might help"
  ];
}

module.exports = router; 