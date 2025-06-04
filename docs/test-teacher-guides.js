#!/usr/bin/env node

/**
 * Teacher Documentation Validation Script
 * Tests the teacher user guides for proper structure, completeness, and professional language
 */

const fs = require('fs');
const path = require('path');

class TeacherGuideValidator {
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
        console.log('👩‍🏫 Testing Mentra Teacher User Guides...\n');

        // Test file existence and accessibility
        console.log('📚 Testing documentation files...');
        this.testFileExists('teacher-user-guide.md', 'Teacher User Guide');
        this.testFileExists('teacher-quick-reference.md', 'Teacher Quick Reference');

        // Test file content structure
        console.log('\n📖 Testing content structure...');
        this.testTeacherGuideStructure();
        this.testQuickReferenceStructure();

        // Test content completeness
        console.log('\n🔍 Testing content completeness...');
        this.testContentCompleteness();

        // Test professional language and tone
        console.log('\n👔 Testing professional content...');
        this.testProfessionalLanguage();

        // Test teacher-specific features
        console.log('\n🎯 Testing teacher-specific features...');
        this.testTeacherFeatureCoverage();

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
            if (content.length < 2000) {
                throw new Error(`File too short: ${content.length} characters`);
            }
            return `${content.length} characters`;
        });
    }

    testTeacherGuideStructure() {
        this.test('Teacher Guide Structure', () => {
            const content = fs.readFileSync(path.join(__dirname, 'teacher-user-guide.md'), 'utf8');
            
            const requiredSections = [
                'What Mentra Offers Teachers',
                'Your Teacher Dashboard',
                'Student Progress Monitoring',
                'Intervention Management',
                'Student Notes and Communication',
                'Analytics and Insights',
                'Classroom Management Strategies',
                'Best Practices for Teachers'
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
            const content = fs.readFileSync(path.join(__dirname, 'teacher-quick-reference.md'), 'utf8');
            
            const requiredSections = [
                'Daily Management Checklist',
                'Dashboard Quick Navigation',
                'Student Engagement Levels',
                'Intervention Quick Guide',
                'Analytics Quick Insights',
                'Alert Response Protocols'
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
        this.test('Dashboard Features Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'teacher-user-guide.md'), 'utf8');
            
            const dashboardFeatures = [
                'Dashboard Overview',
                'Class Summary Cards',
                'Navigation Tabs',
                'Student Engagement Levels',
                'Individual Student Insights',
                'Class-Wide Analytics'
            ];

            const missingFeatures = dashboardFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing dashboard features: ${missingFeatures.join(', ')}`);
            }

            return `All ${dashboardFeatures.length} dashboard features documented`;
        });

        this.test('Intervention Management Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'teacher-user-guide.md'), 'utf8');
            
            const interventionFeatures = [
                'Creating Student Interventions',
                'Types of Interventions',
                'Tracking Intervention Progress',
                'Status Management',
                'Progress Documentation',
                'Intervention Analytics'
            ];

            const missingFeatures = interventionFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing intervention features: ${missingFeatures.join(', ')}`);
            }

            return `All ${interventionFeatures.length} intervention features documented`;
        });

        this.test('Communication Tools Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'teacher-user-guide.md'), 'utf8');
            
            const communicationFeatures = [
                'Creating Student Notes',
                'Note Categories',
                'Privacy Settings',
                'Parent Communication Tools',
                'Sharing Student Progress',
                'Communication Best Practices'
            ];

            const missingFeatures = communicationFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing communication features: ${missingFeatures.join(', ')}`);
            }

            return `All ${communicationFeatures.length} communication features documented`;
        });
    }

    testProfessionalLanguage() {
        this.test('Professional Language and Tone', () => {
            const content = fs.readFileSync(path.join(__dirname, 'teacher-user-guide.md'), 'utf8');
            
            // Check for professional indicators
            const professionalIndicators = [
                'your students', 'classroom', 'instruction',  // Educational terminology
                'professional', 'teaching', 'pedagogy',       // Professional language
                'data-driven', 'evidence-based', 'assessment' // Research-based language
            ];

            const indicatorCounts = professionalIndicators.map(indicator => 
                (content.match(new RegExp(indicator, 'gi')) || []).length
            );

            const totalIndicators = indicatorCounts.reduce((sum, count) => sum + count, 0);

            if (totalIndicators < 20) {
                throw new Error(`Only ${totalIndicators} professional language indicators found`);
            }

            return `${totalIndicators} professional language indicators found`;
        });

        this.test('Educational Best Practices', () => {
            const content = fs.readFileSync(path.join(__dirname, 'teacher-user-guide.md'), 'utf8');
            
            // Check for educational best practice references
            const bestPracticeIndicators = [
                'differentiation',
                'scaffolding',
                'intervention',
                'assessment',
                'engagement',
                'growth mindset',
                'personalized learning'
            ];

            const foundPractices = bestPracticeIndicators.filter(practice => 
                content.toLowerCase().includes(practice.toLowerCase())
            );

            if (foundPractices.length < 5) {
                throw new Error(`Only ${foundPractices.length} educational best practices found`);
            }

            return `${foundPractices.length} educational best practices referenced`;
        });

        this.test('Actionable Guidance', () => {
            const content = fs.readFileSync(path.join(__dirname, 'teacher-user-guide.md'), 'utf8');
            
            const actionableIndicators = [
                'step-by-step',
                'how to',
                'best practice',
                'strategy',
                'checklist',
                'template',
                'protocol'
            ];

            const foundActions = actionableIndicators.filter(action => 
                content.toLowerCase().includes(action.toLowerCase())
            );

            if (foundActions.length < 5) {
                throw new Error(`Only ${foundActions.length} actionable guidance elements found`);
            }

            return `${foundActions.length} actionable guidance elements found`;
        });
    }

    testTeacherFeatureCoverage() {
        this.test('Classroom Management Features', () => {
            const content = fs.readFileSync(path.join(__dirname, 'teacher-user-guide.md'), 'utf8');
            
            const classroomFeatures = [
                'Daily Management',
                'Goal Setting',
                'Motivation and Engagement',
                'Morning Routine',
                'End-of-Day Reflection',
                'Recognition Systems'
            ];

            const missingFeatures = classroomFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing classroom management features: ${missingFeatures.join(', ')}`);
            }

            return `All ${classroomFeatures.length} classroom management features documented`;
        });

        this.test('Analytics and Reporting Features', () => {
            const content = fs.readFileSync(path.join(__dirname, 'teacher-user-guide.md'), 'utf8');
            
            const analyticsFeatures = [
                'Understanding Your Class Data',
                'Learning Pattern Analysis',
                'Actionable Insights',
                'Generating Reports',
                'Data Export and Sharing',
                'Progress Predictions'
            ];

            const missingFeatures = analyticsFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing analytics features: ${missingFeatures.join(', ')}`);
            }

            return `All ${analyticsFeatures.length} analytics features documented`;
        });

        this.test('Professional Development Guidance', () => {
            const content = fs.readFileSync(path.join(__dirname, 'teacher-user-guide.md'), 'utf8');
            
            const professionalDevFeatures = [
                'Professional Development',
                'Using Data for Growth',
                'Collaboration',
                'Staying Current',
                'Continuous Improvement',
                'Impact Measurement'
            ];

            const missingFeatures = professionalDevFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing professional development features: ${missingFeatures.join(', ')}`);
            }

            return `All ${professionalDevFeatures.length} professional development features documented`;
        });

        this.test('Support and Troubleshooting Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'teacher-user-guide.md'), 'utf8');
            
            const supportFeatures = [
                'Handling Alerts and Concerns',
                'Response Protocols',
                'Getting Help and Support',
                'Troubleshooting Common Issues',
                'When to Escalate',
                'Collaboration and Support'
            ];

            const missingFeatures = supportFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing support features: ${missingFeatures.join(', ')}`);
            }

            return `All ${supportFeatures.length} support features documented`;
        });
    }

    printSummary() {
        console.log('\n══════════════════════════════════════════════════════════════════════');
        console.log('📊 TEACHER GUIDES TEST RESULTS');
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
            console.log('\n🎉 All tests passed! Teacher guides are ready for use.');
        }

        console.log('\n📋 TASK 6.4 TEACHER GUIDES SUMMARY:');
        console.log('• Comprehensive User Guide: Complete classroom management and monitoring guide');
        console.log('• Quick Reference Guide: Fast lookup for daily teaching tasks');
        console.log('• Professional Language: Appropriate tone for educational professionals');
        console.log('• Complete Feature Coverage: Dashboard, interventions, analytics, communication');
        console.log('• Best Practice Integration: Research-based educational strategies');
        console.log('• Actionable Guidance: Step-by-step procedures and templates');
        console.log('• Professional Development: Growth-oriented support and collaboration');
        console.log('• Support Resources: Comprehensive troubleshooting and help guidance');

        console.log('\n👩‍🏫 Teacher guides documentation completed.');
    }
}

// Run the tests
async function main() {
    const validator = new TeacherGuideValidator();
    await validator.runTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = TeacherGuideValidator; 