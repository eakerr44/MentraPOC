#!/usr/bin/env node

/**
 * Student Documentation Validation Script
 * Tests the student user guides for proper structure and accessibility
 */

const fs = require('fs');
const path = require('path');

class StudentGuideValidator {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            tests: []
        };
    }

    test(description, testFn) {
        try {
            const result = testFn();
            if (result) {
                this.results.passed++;
                this.results.tests.push({ description, status: 'PASS', details: result });
                console.log(`✅ PASS | ${description}`);
                if (typeof result === 'string') {
                    console.log(`       ${result}`);
                }
            } else {
                throw new Error('Test returned false');
            }
        } catch (error) {
            this.results.failed++;
            this.results.tests.push({ description, status: 'FAIL', error: error.message });
            console.log(`❌ FAIL | ${description}`);
            console.log(`       ${error.message}`);
        }
    }

    async runTests() {
        console.log('🎓 Testing Mentra Student User Guides...\n');

        // Test file existence and accessibility
        console.log('📚 Testing documentation files...');
        this.testFileExists('student-user-guide.md', 'Student User Guide');
        this.testFileExists('student-quick-reference.md', 'Student Quick Reference');

        // Test file content structure
        console.log('\n📖 Testing content structure...');
        this.testGuideStructure();
        this.testQuickReferenceStructure();

        // Test content completeness
        console.log('\n🔍 Testing content completeness...');
        this.testContentCompleteness();

        // Test student-friendly language
        console.log('\n👥 Testing student-friendly content...');
        this.testStudentFriendlyLanguage();

        // Print summary
        this.printSummary();
    }

    testFileExists(filename, description) {
        this.test(`Documentation: ${filename}`, () => {
            const filePath = path.join(__dirname, filename);
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filename}`);
            }
            return 'File exists and accessible';
        });

        this.test(`Content: ${filename}`, () => {
            const filePath = path.join(__dirname, filename);
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.length < 1000) {
                throw new Error(`File too short: ${content.length} characters`);
            }
            return `${content.length} characters`;
        });
    }

    testGuideStructure() {
        this.test('Student Guide Structure', () => {
            const content = fs.readFileSync(path.join(__dirname, 'student-user-guide.md'), 'utf8');
            
            const requiredSections = [
                'What is Mentra?',
                'Your Daily Learning Journal',
                'Guided Problem Solving',
                'Your Learning Dashboard',
                'Tips for Success',
                'Getting Help'
            ];

            const missingSections = requiredSections.filter(section => 
                !content.includes(section)
            );

            if (missingSections.length > 0) {
                throw new Error(`Missing sections: ${missingSections.join(', ')}`);
            }

            return `All ${requiredSections.length} required sections present`;
        });
    }

    testQuickReferenceStructure() {
        this.test('Quick Reference Structure', () => {
            const content = fs.readFileSync(path.join(__dirname, 'student-quick-reference.md'), 'utf8');
            
            const requiredSections = [
                'Getting Started Checklist',
                'Journal Quick Actions',
                'Problem Solving Quick Guide',
                'Dashboard Overview',
                'Quick Troubleshooting'
            ];

            const missingSections = requiredSections.filter(section => 
                !content.includes(section)
            );

            if (missingSections.length > 0) {
                throw new Error(`Missing sections: ${missingSections.join(', ')}`);
            }

            return `All ${requiredSections.length} quick reference sections present`;
        });
    }

    testContentCompleteness() {
        this.test('Journal Features Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'student-user-guide.md'), 'utf8');
            
            const journalFeatures = [
                'Creating Your First Journal Entry',
                'Privacy and Sharing',
                'Using AI Reflection Prompts',
                'Emotional Intelligence Features',
                'Mood Tracking',
                'Using Tags'
            ];

            const missingFeatures = journalFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing journal features: ${missingFeatures.join(', ')}`);
            }

            return `All ${journalFeatures.length} journal features documented`;
        });

        this.test('Problem Solving Features Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'student-user-guide.md'), 'utf8');
            
            const problemFeatures = [
                'How AI Scaffolding Works',
                'Mistake Analysis and Learning',
                'Multiple Solution Paths',
                'Problem Session Features',
                'Starting a Problem Session'
            ];

            const missingFeatures = problemFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing problem-solving features: ${missingFeatures.join(', ')}`);
            }

            return `All ${problemFeatures.length} problem-solving features documented`;
        });

        this.test('Dashboard Features Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'student-user-guide.md'), 'utf8');
            
            const dashboardFeatures = [
                'Learning Summary Cards',
                'Progress Tracking',
                'Goal Setting and Achievement',
                'Growth Visualization',
                'Learning Insights'
            ];

            const missingFeatures = dashboardFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing dashboard features: ${missingFeatures.join(', ')}`);
            }

            return `All ${dashboardFeatures.length} dashboard features documented`;
        });
    }

    testStudentFriendlyLanguage() {
        this.test('Student-Friendly Language', () => {
            const content = fs.readFileSync(path.join(__dirname, 'student-user-guide.md'), 'utf8');
            
            // Check for student-friendly indicators
            const friendlyIndicators = [
                'you', 'your', 'yourself',  // Personal pronouns
                '!',                        // Encouraging tone
                'Let\'s', 'Try', 'Remember' // Action-oriented language
            ];

            const indicatorCounts = friendlyIndicators.map(indicator => 
                (content.match(new RegExp(indicator, 'gi')) || []).length
            );

            const totalIndicators = indicatorCounts.reduce((sum, count) => sum + count, 0);

            if (totalIndicators < 50) {
                throw new Error(`Only ${totalIndicators} student-friendly language indicators found`);
            }

            return `${totalIndicators} student-friendly language indicators found`;
        });

        this.test('Age-Appropriate Examples', () => {
            const content = fs.readFileSync(path.join(__dirname, 'student-user-guide.md'), 'utf8');
            
            // Check for concrete examples students can relate to
            const exampleIndicators = [
                'Example',
                'For example',
                'stickers',
                'math problem',
                'homework',
                'classwork'
            ];

            const foundExamples = exampleIndicators.filter(indicator => 
                content.toLowerCase().includes(indicator.toLowerCase())
            );

            if (foundExamples.length < 4) {
                throw new Error(`Only ${foundExamples.length} age-appropriate examples found`);
            }

            return `${foundExamples.length} age-appropriate examples found`;
        });

        this.test('Encouraging Tone', () => {
            const content = fs.readFileSync(path.join(__dirname, 'student-user-guide.md'), 'utf8');
            
            const encouragingPhrases = [
                'Congratulations',
                'Great job',
                'You can do',
                'celebrate',
                'proud',
                'success',
                'achievement'
            ];

            const foundPhrases = encouragingPhrases.filter(phrase => 
                content.toLowerCase().includes(phrase.toLowerCase())
            );

            if (foundPhrases.length < 5) {
                throw new Error(`Only ${foundPhrases.length} encouraging phrases found`);
            }

            return `${foundPhrases.length} encouraging phrases found`;
        });
    }

    printSummary() {
        console.log('\n══════════════════════════════════════════════════════════════════════');
        console.log('📊 STUDENT GUIDES TEST RESULTS');
        console.log('══════════════════════════════════════════════════════════════════════');
        
        const totalTests = this.results.passed + this.results.failed;
        const successRate = totalTests > 0 ? ((this.results.passed / totalTests) * 100).toFixed(1) : 0;

        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Success Rate: ${successRate}%`);

        if (this.results.failed > 0) {
            console.log('\n⚠️ Some tests failed. Please review the issues above.');
        } else {
            console.log('\n🎉 All tests passed! Student guides are ready for use.');
        }

        console.log('\n📋 TASK 6.3 STUDENT GUIDES SUMMARY:');
        console.log('• Comprehensive User Guide: Step-by-step instructions for all features');
        console.log('• Quick Reference Guide: Fast lookup for common tasks and tips');
        console.log('• Student-Friendly Language: Age-appropriate and encouraging tone');
        console.log('• Complete Feature Coverage: Journal, problem-solving, and dashboard');
        console.log('• Practical Examples: Real scenarios students can relate to');
        console.log('• Support Information: Help resources and troubleshooting');

        console.log('\n📚 Student guides documentation completed.');
    }
}

// Run the tests
async function main() {
    const validator = new StudentGuideValidator();
    await validator.runTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = StudentGuideValidator; 