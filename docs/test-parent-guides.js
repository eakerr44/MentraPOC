#!/usr/bin/env node

/**
 * Parent Documentation Validation Script
 * Tests the parent user guides for proper structure, completeness, and family-friendly language
 */

const fs = require('fs');
const path = require('path');

class ParentGuideValidator {
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
        console.log('👨‍👩‍👧‍👦 Testing Mentra Parent User Guides...\n');

        // Test file existence and accessibility
        console.log('📚 Testing documentation files...');
        this.testFileExists('parent-user-guide.md', 'Parent User Guide');
        this.testFileExists('parent-quick-reference.md', 'Parent Quick Reference');

        // Test file content structure
        console.log('\n📖 Testing content structure...');
        this.testParentGuideStructure();
        this.testQuickReferenceStructure();

        // Test content completeness
        console.log('\n🔍 Testing content completeness...');
        this.testContentCompleteness();

        // Test family-friendly language and tone
        console.log('\n👨‍👩‍👧‍👦 Testing family-friendly content...');
        this.testFamilyFriendlyLanguage();

        // Test parent-specific features
        console.log('\n🏠 Testing parent-specific features...');
        this.testParentFeatureCoverage();

        // Test home learning support guidance
        console.log('\n📚 Testing home learning support...');
        this.testHomeLearningSupport();

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
            if (content.length < 3000) {
                throw new Error(`File too short: ${content.length} characters`);
            }
            return `${content.length} characters`;
        });
    }

    testParentGuideStructure() {
        this.test('Parent Guide Structure', () => {
            const content = fs.readFileSync(path.join(__dirname, 'parent-user-guide.md'), 'utf8');
            
            const requiredSections = [
                'What Mentra Offers Families',
                'Your Family Dashboard',
                'Weekly Family Summaries',
                'Individual Child Insights',
                'Communicating with Teachers',
                'Learning Tips and Home Support',
                'Family Learning Goals',
                'Supporting Different Types of Learners'
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
            const content = fs.readFileSync(path.join(__dirname, 'parent-quick-reference.md'), 'utf8');
            
            const requiredSections = [
                'Daily Family Learning Checklist',
                'Dashboard Quick Navigation',
                'Understanding Child Engagement Levels',
                'Teacher Communication Quick Guide',
                'Family Goal Setting Quick Start',
                'Celebration & Recognition Ideas'
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
            const content = fs.readFileSync(path.join(__dirname, 'parent-user-guide.md'), 'utf8');
            
            const dashboardFeatures = [
                'Dashboard Overview',
                'Family Stats',
                'Dashboard Navigation',
                'Engagement Levels',
                'Family Overview',
                'Weekly Summary',
                'My Children',
                'Teacher Messages',
                'Learning Tips',
                'Family Goals'
            ];

            const missingFeatures = dashboardFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing dashboard features: ${missingFeatures.join(', ')}`);
            }

            return `All ${dashboardFeatures.length} dashboard features documented`;
        });

        this.test('Communication Features Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'parent-user-guide.md'), 'utf8');
            
            const communicationFeatures = [
                'Teacher Communication Center',
                'Types of Communications',
                'Sending Effective Messages',
                'Message Templates',
                'Building Strong Home-School Partnerships',
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

        this.test('Learning Support Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'parent-user-guide.md'), 'utf8');
            
            const learningSupportFeatures = [
                'Personalized Learning Recommendations',
                'Learning Tips',
                'Creating a Learning-Supportive Home Environment',
                'Physical Environment',
                'Family Learning Culture',
                'Managing Screen Time and Technology'
            ];

            const missingFeatures = learningSupportFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing learning support features: ${missingFeatures.join(', ')}`);
            }

            return `All ${learningSupportFeatures.length} learning support features documented`;
        });
    }

    testFamilyFriendlyLanguage() {
        this.test('Family-Friendly Language and Tone', () => {
            const content = fs.readFileSync(path.join(__dirname, 'parent-user-guide.md'), 'utf8');
            
            // Check for family-friendly indicators
            const familyFriendlyIndicators = [
                'your child', 'your family', 'family learning',  // Family-oriented language
                'celebrate', 'support', 'encourage',             // Positive, supportive language
                'together', 'partnership', 'collaboration'       // Community-focused language
            ];

            const indicatorCounts = familyFriendlyIndicators.map(indicator => 
                (content.match(new RegExp(indicator, 'gi')) || []).length
            );

            const totalIndicators = indicatorCounts.reduce((sum, count) => sum + count, 0);

            if (totalIndicators < 30) {
                throw new Error(`Only ${totalIndicators} family-friendly language indicators found`);
            }

            return `${totalIndicators} family-friendly language indicators found`;
        });

        this.test('Warm and Supportive Tone', () => {
            const content = fs.readFileSync(path.join(__dirname, 'parent-user-guide.md'), 'utf8');
            
            // Check for warm, supportive language
            const warmToneIndicators = [
                'welcome',
                'journey',
                'growth',
                'thrive',
                'joy',
                'love',
                'celebrate',
                'achievements'
            ];

            const foundTones = warmToneIndicators.filter(tone => 
                content.toLowerCase().includes(tone.toLowerCase())
            );

            if (foundTones.length < 6) {
                throw new Error(`Only ${foundTones.length} warm tone indicators found`);
            }

            return `${foundTones.length} warm and supportive tone indicators found`;
        });

        this.test('Practical and Actionable Content', () => {
            const content = fs.readFileSync(path.join(__dirname, 'parent-user-guide.md'), 'utf8');
            
            const practicalIndicators = [
                'how to',
                'tips',
                'strategies',
                'activities',
                'examples',
                'templates',
                'checklist'
            ];

            const foundPractical = practicalIndicators.filter(practical => 
                content.toLowerCase().includes(practical.toLowerCase())
            );

            if (foundPractical.length < 5) {
                throw new Error(`Only ${foundPractical.length} practical guidance elements found`);
            }

            return `${foundPractical.length} practical guidance elements found`;
        });
    }

    testParentFeatureCoverage() {
        this.test('Family Dashboard Features', () => {
            const content = fs.readFileSync(path.join(__dirname, 'parent-user-guide.md'), 'utf8');
            
            const familyDashboardFeatures = [
                'Family Overview',
                'Weekly Summary',
                'My Children',
                'Teacher Messages',
                'Learning Tips',
                'Family Goals',
                'Individual Child Insights',
                'Family Stats'
            ];

            const missingFeatures = familyDashboardFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing family dashboard features: ${missingFeatures.join(', ')}`);
            }

            return `All ${familyDashboardFeatures.length} family dashboard features documented`;
        });

        this.test('Family Goal Setting Features', () => {
            const content = fs.readFileSync(path.join(__dirname, 'parent-user-guide.md'), 'utf8');
            
            const goalSettingFeatures = [
                'Setting Meaningful Family Goals',
                'Types of Family Goals',
                'Creating Effective Family Goals',
                'Tracking Goal Progress',
                'Weekly Check-ins',
                'Goal Activities and Celebrations'
            ];

            const missingFeatures = goalSettingFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing goal setting features: ${missingFeatures.join(', ')}`);
            }

            return `All ${goalSettingFeatures.length} goal setting features documented`;
        });

        this.test('Parent Communication Features', () => {
            const content = fs.readFileSync(path.join(__dirname, 'parent-user-guide.md'), 'utf8');
            
            const communicationFeatures = [
                'Achievement Celebrations',
                'Learning Inquiries',
                'Home Support Coordination',
                'Concern Sharing',
                'Be Specific and Clear',
                'Be Collaborative',
                'Be Timely'
            ];

            const missingFeatures = communicationFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing communication features: ${missingFeatures.join(', ')}`);
            }

            return `All ${communicationFeatures.length} communication features documented`;
        });

        this.test('Child Support and Understanding Features', () => {
            const content = fs.readFileSync(path.join(__dirname, 'parent-user-guide.md'), 'utf8');
            
            const childSupportFeatures = [
                'Learning Style Insights',
                'Supporting Different Learning Styles',
                'Visual Learners',
                'Auditory Learners',
                'Kinesthetic Learners',
                'Social Learners',
                'Independent Learners',
                'Struggling Learners',
                'Advanced Learners'
            ];

            const missingFeatures = childSupportFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing child support features: ${missingFeatures.join(', ')}`);
            }

            return `All ${childSupportFeatures.length} child support features documented`;
        });
    }

    testHomeLearningSupport() {
        this.test('Home Environment Guidance', () => {
            const content = fs.readFileSync(path.join(__dirname, 'parent-user-guide.md'), 'utf8');
            
            const homeEnvironmentFeatures = [
                'Designated Learning Spaces',
                'Learning Materials',
                'Family Learning Culture',
                'Routine and Structure',
                'Physical Environment',
                'Learning as a Family Value'
            ];

            const missingFeatures = homeEnvironmentFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing home environment features: ${missingFeatures.join(', ')}`);
            }

            return `All ${homeEnvironmentFeatures.length} home environment features documented`;
        });

        this.test('Learning Routine and Time Management', () => {
            const content = fs.readFileSync(path.join(__dirname, 'parent-user-guide.md'), 'utf8');
            
            const routineFeatures = [
                'Creating Effective Learning Routines',
                'Daily Learning Routines',
                'Weekly Learning Structure',
                'After-School Transition Time',
                'Homework and Study Time',
                'Family Learning Time'
            ];

            const missingFeatures = routineFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing routine features: ${missingFeatures.join(', ')}`);
            }

            return `All ${routineFeatures.length} routine and time management features documented`;
        });

        this.test('Technology and Screen Time Guidance', () => {
            const content = fs.readFileSync(path.join(__dirname, 'parent-user-guide.md'), 'utf8');
            
            const technologyFeatures = [
                'Using Technology Effectively',
                'Digital Learning Tools',
                'Educational Technology at Home',
                'Balancing Screen Time',
                'Supporting Digital Citizenship',
                'Digital Wellness'
            ];

            const missingFeatures = technologyFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing technology features: ${missingFeatures.join(', ')}`);
            }

            return `All ${technologyFeatures.length} technology guidance features documented`;
        });

        this.test('Celebration and Recognition Guidance', () => {
            const content = fs.readFileSync(path.join(__dirname, 'parent-user-guide.md'), 'utf8');
            
            const celebrationFeatures = [
                'Celebrating Learning and Growth',
                'Recognition and Celebration Strategies',
                'What to Celebrate',
                'Effort Over Outcome',
                'Growth and Progress',
                'Character Development',
                'Creating Family Learning Traditions'
            ];

            const missingFeatures = celebrationFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing celebration features: ${missingFeatures.join(', ')}`);
            }

            return `All ${celebrationFeatures.length} celebration and recognition features documented`;
        });

        this.test('Support Resources and Troubleshooting', () => {
            const content = fs.readFileSync(path.join(__dirname, 'parent-user-guide.md'), 'utf8');
            
            const supportFeatures = [
                'When to Seek Additional Support',
                'Recognizing When Your Child Needs More Help',
                'Getting Help and Support',
                'Troubleshooting Common Challenges',
                'Technology and Dashboard Issues',
                'Learning and Motivation Challenges'
            ];

            const missingFeatures = supportFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing support features: ${missingFeatures.join(', ')}`);
            }

            return `All ${supportFeatures.length} support and troubleshooting features documented`;
        });
    }

    printSummary() {
        console.log('\n══════════════════════════════════════════════════════════════════════');
        console.log('📊 PARENT GUIDES TEST RESULTS');
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
            console.log('\n🎉 All tests passed! Parent guides are ready for use.');
        }

        console.log('\n📋 TASK 6.5 PARENT GUIDES SUMMARY:');
        console.log('• Comprehensive User Guide: Complete family dashboard and home learning support guide');
        console.log('• Quick Reference Guide: Fast lookup for daily family learning tasks');
        console.log('• Family-Friendly Language: Warm, supportive tone appropriate for parents');
        console.log('• Complete Feature Coverage: Dashboard, communication, goals, learning support');
        console.log('• Home Learning Support: Detailed guidance for supporting learning at home');
        console.log('• Learning Style Support: Strategies for different types of learners');
        console.log('• Technology Balance: Screen time and digital citizenship guidance');
        console.log('• Celebration Culture: Recognition and family learning tradition building');

        console.log('\n👨‍👩‍👧‍👦 Parent guides documentation completed.');
    }
}

// Run the tests
async function main() {
    const validator = new ParentGuideValidator();
    await validator.runTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ParentGuideValidator; 