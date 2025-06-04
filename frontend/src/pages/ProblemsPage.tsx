import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

export const ProblemsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedSubject, setSelectedSubject] = useState<string>('math');
  const [difficulty, setDifficulty] = useState<string>('medium');

  const subjects = [
    { id: 'math', name: 'Mathematics', icon: '🔢' },
    { id: 'science', name: 'Science', icon: '🔬' },
    { id: 'english', name: 'English', icon: '📝' },
    { id: 'history', name: 'History', icon: '📚' },
  ];

  const problems = [
    {
      id: 1,
      subject: 'math',
      title: 'Solving Linear Equations',
      difficulty: 'medium',
      description: 'Practice solving equations with one variable',
      estimatedTime: '15 minutes'
    },
    {
      id: 2,
      subject: 'science',
      title: 'Chemical Reactions',
      difficulty: 'hard',
      description: 'Understanding chemical equations and balancing',
      estimatedTime: '20 minutes'
    },
    {
      id: 3,
      subject: 'english',
      title: 'Essay Structure',
      difficulty: 'easy',
      description: 'Learn the basics of paragraph organization',
      estimatedTime: '10 minutes'
    }
  ];

  const filteredProblems = problems.filter(p => 
    p.subject === selectedSubject && 
    (difficulty === 'all' || p.difficulty === difficulty)
  );

  const startProblem = (problemId: number) => {
    console.log(`Starting problem ${problemId} for user ${user?.id}`);
    // TODO: Navigate to problem solving interface
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Guided Problem Solving</h1>
          <p className="text-gray-600 mt-2">
            Choose a subject and work through problems with AI guidance
          </p>
        </div>

        {/* Subject Selection */}
        <div className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {subjects.map((subject) => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubject(subject.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedSubject === subject.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">{subject.icon}</div>
                <div className="font-medium">{subject.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Filter */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Difficulty Level
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Problems List */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProblems.map((problem) => (
            <div key={problem.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{problem.title}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  problem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                  problem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {problem.difficulty}
                </span>
              </div>
              
              <p className="text-gray-600 mb-4">{problem.description}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">⏱️ {problem.estimatedTime}</span>
                <button
                  onClick={() => startProblem(problem.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start Problem
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredProblems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No problems found for the selected criteria.</p>
            <p className="text-gray-400 mt-2">Try selecting a different difficulty level.</p>
          </div>
        )}

        {/* AI Guidance Info */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">🤖 AI-Powered Learning</h3>
          <p className="text-blue-800">
            Each problem comes with personalized AI guidance that adapts to your learning style. 
            Get hints, explanations, and alternative solution paths as you work through challenges.
          </p>
        </div>
      </div>
    </div>
  );
}; 