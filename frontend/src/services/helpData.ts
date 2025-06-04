import { HelpArticle, HelpSection, UserRole, ContentType, ContentCategory } from '../types/help';

// Help articles organized by the documentation we've created
export const helpArticles: HelpArticle[] = [
  // Getting Started Articles
  {
    id: 'getting-started-overview',
    title: 'What is Mentra?',
    description: 'Learn about Mentra and how it supports your educational journey',
    content: `# What is Mentra?

Mentra is an AI-native learning platform designed to support students, teachers, and parents in the educational journey. It provides:

**For Students**: Interactive journaling, AI-guided problem solving, and personalized learning insights
**For Teachers**: Classroom management tools, student progress monitoring, and intervention tracking  
**For Parents**: Family dashboards, learning support guidance, and teacher communication tools

## Getting Started
1. Contact your school or district to confirm Mentra access
2. Receive your login credentials from your teacher or administrator
3. Log in using the provided username and password
4. Complete your profile setup
5. Start exploring the features relevant to your role`,
    type: 'user-guide',
    category: 'getting-started',
    targetRoles: ['student', 'teacher', 'parent'],
    tags: ['overview', 'introduction', 'getting-started', 'basics'],
    lastUpdated: '2024-01-15',
    readTime: 3,
    featured: true,
    searchKeywords: ['mentra', 'what is', 'overview', 'introduction', 'platform', 'learning']
  },

  // Student Articles
  {
    id: 'student-journaling-guide',
    title: 'How to Use Your Learning Journal',
    description: 'A complete guide to daily journaling and reflection in Mentra',
    content: `# How to Use Your Learning Journal

Your learning journal is a place to reflect on your day and learning experiences. You can write about:
- What you learned in class today
- Questions you have about your lessons
- How you're feeling about your learning
- Goals you want to achieve
- Challenges you're facing
- Things that made you proud or excited

## Privacy Settings
- **Private entries**: Only you can see these
- **Shared with teacher**: Your teacher can read these to better support you
- **Shared with parents**: Your parents can see these to help at home

## Tips for Effective Journaling
- Write regularly, even if it's just a few sentences
- Be honest about your feelings and challenges
- Ask questions when you're confused
- Celebrate your progress and achievements`,
    type: 'user-guide',
    category: 'daily-use',
    targetRoles: ['student'],
    tags: ['journal', 'reflection', 'writing', 'privacy', 'daily'],
    lastUpdated: '2024-01-15',
    readTime: 5,
    featured: true,
    searchKeywords: ['journal', 'writing', 'reflection', 'daily', 'learning', 'privacy', 'share']
  },

  {
    id: 'student-ai-helper',
    title: 'Working with the AI Helper',
    description: 'Learn how to get the best help from Mentra\'s AI assistant',
    content: `# Working with the AI Helper

The AI helper is like having a patient tutor who:
- Gives you hints when you're stuck (without giving away answers)
- Asks questions to help you think through problems
- Provides step-by-step guidance
- Celebrates your progress and effort
- Adapts to your learning style and pace

## Is it Cheating?
No! The AI helper is designed to guide your learning, not give you answers. It helps you understand concepts better and teaches problem-solving strategies.

## Getting Better Help
- Be specific about what you're struggling with
- Try the AI's suggestions before asking for more help
- Use it as a learning tool, not a shortcut
- Give feedback when something is or isn't helpful`,
    type: 'user-guide',
    category: 'daily-use',
    targetRoles: ['student'],
    tags: ['ai', 'helper', 'assistant', 'hints', 'guidance', 'cheating'],
    lastUpdated: '2024-01-15',
    readTime: 4,
    featured: true,
    searchKeywords: ['ai', 'helper', 'assistant', 'hints', 'stuck', 'help', 'cheating', 'guidance']
  },

  // Teacher Articles
  {
    id: 'teacher-classroom-management',
    title: 'Classroom Management with Mentra',
    description: 'Complete guide to managing your classroom using Mentra\'s tools',
    content: `# Classroom Management with Mentra

## Creating and Managing Assignments
1. Go to your teacher dashboard
2. Click "Create Assignment" or "New Activity"
3. Choose the assignment type (journal prompt, problem set, etc.)
4. Set parameters (due date, difficulty level, sharing settings)
5. Assign to specific students or your entire class
6. Monitor progress through the assignment tracking panel

## Customizing AI Scaffolding
Mentra allows you to:
- Set different difficulty levels for individual students
- Customize the amount of AI support provided
- Choose scaffolding styles (more or less directive)
- Create personalized learning paths
- Adjust based on student needs and IEP requirements

## Monitoring Student Progress
Use these dashboard features:
- **Class Overview**: See all students' activity at a glance
- **Individual Student Profiles**: Deep dive into specific student progress
- **Assignment Analytics**: Track completion rates and performance
- **Intervention Alerts**: Get notified when students need support
- **Progress Reports**: Generate summaries for parent conferences`,
    type: 'user-guide',
    category: 'daily-use',
    targetRoles: ['teacher'],
    tags: ['classroom', 'management', 'assignments', 'monitoring', 'dashboard'],
    lastUpdated: '2024-01-15',
    readTime: 8,
    featured: true,
    searchKeywords: ['classroom', 'management', 'assignments', 'progress', 'monitoring', 'dashboard', 'teacher']
  },

  {
    id: 'teacher-intervention-tools',
    title: 'Student Support and Intervention',
    description: 'Learn when and how to provide support to struggling students',
    content: `# Student Support and Intervention

## Recognizing When Students Need Help
Mentra provides several indicators:
- **Engagement Alerts**: When participation drops significantly
- **Performance Patterns**: Declining accuracy or completion rates
- **Emotional Indicators**: Journal entries suggesting frustration or disengagement
- **AI Recommendations**: When the system suggests additional support
- **Parent Reports**: When families express concerns

## Available Intervention Tools
You can:
- Send personalized encouragement messages
- Adjust assignment difficulty or deadlines
- Provide additional scaffolding or resources
- Schedule one-on-one conferences
- Collaborate with school counselors or specialists
- Communicate with parents about support strategies

## Technology Support for Students
- Provide step-by-step guidance during class
- Create simple tutorial videos or handouts
- Pair struggling students with tech-savvy peers
- Use the platform's built-in help features
- Contact IT support for persistent technical issues`,
    type: 'user-guide',
    category: 'advanced-features',
    targetRoles: ['teacher'],
    tags: ['intervention', 'support', 'struggling', 'help', 'alerts', 'communication'],
    lastUpdated: '2024-01-15',
    readTime: 6,
    featured: false,
    searchKeywords: ['intervention', 'support', 'struggling', 'alerts', 'help', 'communication', 'parents']
  },

  // Parent Articles
  {
    id: 'parent-dashboard-guide',
    title: 'Understanding Your Child\'s Dashboard',
    description: 'Learn how to read and interpret your child\'s learning progress',
    content: `# Understanding Your Child's Dashboard

## Dashboard Components
Your child's dashboard shows:
- **Engagement Level**: Color-coded indicator (green=excellent, yellow=good, orange=fair, red=needs attention)
- **Learning Streak**: Consecutive days of activity
- **Recent Activities**: Journal entries, assignments, achievements
- **Goals Progress**: How they're doing with their learning objectives
- **Teacher Messages**: Communications from school

## Engagement Levels Explained
- **🟢 Excellent**: Regularly participating, completing work, staying engaged
- **🟡 Good**: Generally on track with occasional missed activities
- **🟠 Fair**: Inconsistent participation, may need encouragement
- **🔴 Needs Attention**: Low activity, requires support and intervention

## Supporting Learning at Home
- Ask about their daily learning experiences
- Encourage regular journaling and reflection
- Celebrate effort and progress, not just grades
- Create a supportive homework environment
- Communicate regularly with teachers
- Use Mentra's family learning tips and resources`,
    type: 'user-guide',
    category: 'daily-use',
    targetRoles: ['parent'],
    tags: ['dashboard', 'engagement', 'progress', 'support', 'home', 'communication'],
    lastUpdated: '2024-01-15',
    readTime: 5,
    featured: true,
    searchKeywords: ['dashboard', 'child', 'progress', 'engagement', 'support', 'home', 'parent']
  },

  // FAQ Articles
  {
    id: 'password-reset-faq',
    title: 'Password Reset and Login Issues',
    description: 'Common solutions for login and password problems',
    content: `# Password Reset and Login Issues

## I forgot my password. How do I reset it?
1. Go to the Mentra login page
2. Click "Forgot Password" below the login form
3. Enter your username or email address
4. Check your email for password reset instructions
5. Follow the link in the email to create a new password
6. If you don't receive an email, check your spam folder or contact your teacher

## My login isn't working. What should I try?
1. **Check your credentials**: Ensure username and password are correct
2. **Clear browser cache**: Refresh the page or try a private/incognito window
3. **Check internet connection**: Ensure you have a stable internet connection
4. **Try a different browser**: Sometimes browser settings can interfere
5. **Contact support**: If nothing works, reach out to your teacher or school IT

## Can I change my username?
Usernames are typically assigned by your school and cannot be changed by students. If you need a username change, contact your teacher or school administrator.`,
    type: 'faq',
    category: 'account-management',
    targetRoles: ['student', 'teacher', 'parent'],
    tags: ['password', 'login', 'reset', 'username', 'account'],
    lastUpdated: '2024-01-15',
    readTime: 3,
    featured: false,
    searchKeywords: ['password', 'login', 'reset', 'forgot', 'username', 'account', 'help']
  },

  // Technical Support Articles
  {
    id: 'browser-compatibility',
    title: 'Browser Requirements and Compatibility',
    description: 'Which browsers work best with Mentra and troubleshooting tips',
    content: `# Browser Requirements and Compatibility

## Recommended Browsers
Mentra works best with:
- **Google Chrome** (recommended)
- **Mozilla Firefox**
- **Safari** (for Mac users)
- **Microsoft Edge**

Make sure you're using an updated version of your browser.

## Device Compatibility
- **Computers**: Windows, Mac, or Chromebook with a modern web browser
- **Tablets**: iPad, Android tablets
- **Phones**: iOS and Android smartphones (limited functionality)

## Common Browser Issues
- **Page won't load**: Try refreshing with Ctrl+F5 (Windows) or Cmd+R (Mac)
- **Features not working**: Clear your browser cache and cookies
- **Slow performance**: Close other tabs and applications
- **Video/audio issues**: Check browser permissions for camera and microphone access

## Mobile Usage
Yes, you can use Mentra on your phone, but with limitations:
- Basic features work well on mobile
- Some advanced features work better on larger screens
- For extended work sessions, tablets or computers are recommended`,
    type: 'troubleshooting',
    category: 'technical-support',
    targetRoles: ['student', 'teacher', 'parent'],
    tags: ['browser', 'compatibility', 'mobile', 'device', 'technical'],
    lastUpdated: '2024-01-15',
    readTime: 4,
    featured: false,
    searchKeywords: ['browser', 'compatibility', 'device', 'mobile', 'chrome', 'firefox', 'safari', 'technical']
  },

  // Privacy and Safety
  {
    id: 'privacy-safety-overview',
    title: 'Privacy and Safety on Mentra',
    description: 'Understanding how your data is protected and safety features',
    content: `# Privacy and Safety on Mentra

## Data Protection
Mentra collects only educationally necessary information:
- **Academic data**: Assignments, progress, and performance
- **Learning interactions**: How students use the platform features
- **Communication data**: Messages between teachers, students, and parents
- **Profile information**: Name, grade level, and school affiliation

## Who Can See Your Information?
Access is strictly limited to:
- **Students**: Full access to their own data
- **Teachers**: Classroom and academic information
- **Parents**: Progress reports and family-relevant data
- **School administrators**: As needed for educational purposes
- **Authorized support staff**: Only when providing technical assistance

## Digital Citizenship Rules
- **Be respectful**: Treat others with kindness and respect
- **Stay on topic**: Keep discussions focused on learning
- **Protect privacy**: Don't share personal information inappropriately
- **Use appropriate language**: Communicate professionally and positively
- **Report problems**: Tell a teacher if you see inappropriate behavior

## Safety Features
- **Content filtering**: AI systems screen for inappropriate material
- **Human moderation**: Trained staff review flagged content
- **Reporting tools**: Easy ways to report concerning behavior
- **Privacy controls**: Students can control who sees their information
- **Teacher oversight**: Educators monitor student interactions`,
    type: 'user-guide',
    category: 'privacy-safety',
    targetRoles: ['student', 'teacher', 'parent'],
    tags: ['privacy', 'safety', 'data', 'protection', 'digital citizenship', 'security'],
    lastUpdated: '2024-01-15',
    readTime: 6,
    featured: true,
    searchKeywords: ['privacy', 'safety', 'data', 'protection', 'security', 'digital', 'citizenship', 'information']
  }
];

// Organize articles into sections
export const helpSections: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'New to Mentra? Start here to learn the basics',
    icon: '🚀',
    articles: helpArticles.filter(article => article.category === 'getting-started'),
    targetRoles: ['student', 'teacher', 'parent'],
    order: 1
  },
  {
    id: 'for-students',
    title: 'For Students',
    description: 'Guides for students on journaling, learning, and using AI assistance',
    icon: '🎓',
    articles: helpArticles.filter(article => article.targetRoles.includes('student') && article.category !== 'getting-started'),
    targetRoles: ['student'],
    order: 2
  },
  {
    id: 'for-teachers',
    title: 'For Teachers',
    description: 'Classroom management, student monitoring, and intervention tools',
    icon: '👩‍🏫',
    articles: helpArticles.filter(article => 
      article.targetRoles.includes('teacher') && 
      !article.targetRoles.includes('student') && 
      !article.targetRoles.includes('parent')
    ),
    targetRoles: ['teacher'],
    order: 3
  },
  {
    id: 'for-parents',
    title: 'For Parents',
    description: 'Understanding dashboards and supporting learning at home',
    icon: '👨‍👩‍👧‍👦',
    articles: helpArticles.filter(article => 
      article.targetRoles.includes('parent') && 
      !article.targetRoles.includes('student') && 
      !article.targetRoles.includes('teacher')
    ),
    targetRoles: ['parent'],
    order: 4
  },
  {
    id: 'faq',
    title: 'Frequently Asked Questions',
    description: 'Quick answers to common questions',
    icon: '❓',
    articles: helpArticles.filter(article => article.type === 'faq'),
    targetRoles: ['student', 'teacher', 'parent'],
    order: 5
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Solutions for technical issues and problems',
    icon: '🔧',
    articles: helpArticles.filter(article => article.category === 'technical-support' || article.type === 'troubleshooting'),
    targetRoles: ['student', 'teacher', 'parent'],
    order: 6
  },
  {
    id: 'privacy-safety',
    title: 'Privacy & Safety',
    description: 'Understanding data protection and safety features',
    icon: '🔒',
    articles: helpArticles.filter(article => article.category === 'privacy-safety'),
    targetRoles: ['student', 'teacher', 'parent'],
    order: 7
  }
];

// Featured articles for the help home page
export const featuredArticles = helpArticles.filter(article => article.featured);

// Quick links for common tasks
export const quickLinks = [
  { title: 'Reset Password', path: '/help/password-reset-faq', roles: ['student', 'teacher', 'parent'] },
  { title: 'Getting Started', path: '/help/getting-started-overview', roles: ['student', 'teacher', 'parent'] },
  { title: 'How to Journal', path: '/help/student-journaling-guide', roles: ['student'] },
  { title: 'Classroom Management', path: '/help/teacher-classroom-management', roles: ['teacher'] },
  { title: 'Child\'s Dashboard', path: '/help/parent-dashboard-guide', roles: ['parent'] },
  { title: 'Privacy & Safety', path: '/help/privacy-safety-overview', roles: ['student', 'teacher', 'parent'] }
]; 