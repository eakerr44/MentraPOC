#!/usr/bin/env node

/**
 * Troubleshooting Documentation Validation Script
 * Tests troubleshooting guides and FAQ for proper structure, completeness, and coverage
 */

const fs = require('fs');
const path = require('path');

class TroubleshootingDocsValidator {
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
        console.log('🔧 Testing Mentra Troubleshooting Documentation...\n');

        // Test file existence and accessibility
        console.log('📚 Testing documentation files...');
        this.testFileExists('troubleshooting-guide.md', 'Troubleshooting Guide');
        this.testFileExists('frequently-asked-questions.md', 'FAQ Document');

        // Test content structure
        console.log('\n📖 Testing content structure...');
        this.testTroubleshootingGuideStructure();
        this.testFAQStructure();

        // Test technical troubleshooting coverage
        console.log('\n🔧 Testing technical troubleshooting coverage...');
        this.testTechnicalTroubleshooting();

        // Test user-specific FAQ coverage
        console.log('\n👥 Testing user-specific FAQ coverage...');
        this.testUserSpecificFAQ();

        // Test common issues coverage
        console.log('\n🚨 Testing common issues coverage...');
        this.testCommonIssuesCoverage();

        // Test emergency procedures
        console.log('\n🆘 Testing emergency procedures...');
        this.testEmergencyProcedures();

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

    testTroubleshootingGuideStructure() {
        this.test('Troubleshooting Guide Structure', () => {
            const content = fs.readFileSync(path.join(__dirname, 'troubleshooting-guide.md'), 'utf8');
            
            const requiredSections = [
                'Quick Reference',
                'Installation Issues',
                'Database Issues',
                'API & Network Issues',
                'Frontend Issues',
                'AI Service Issues',
                'Environment Issues',
                'Performance Issues',
                'Emergency Procedures',
                'Diagnostic Tools'
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

    testFAQStructure() {
        this.test('FAQ Structure', () => {
            const content = fs.readFileSync(path.join(__dirname, 'frequently-asked-questions.md'), 'utf8');
            
            const requiredSections = [
                'Getting Started',
                'Account and Access',
                'Student Questions',
                'Teacher Questions',
                'Parent Questions',
                'Technical Issues',
                'Privacy and Safety',
                'Platform Features',
                'Troubleshooting'
            ];

            const missingSections = requiredSections.filter(section => 
                !content.includes(section)
            );

            if (missingSections.length > 0) {
                throw new Error(`Missing sections: ${missingSections.join(', ')}`);
            }

            return `All ${requiredSections.length} FAQ sections present`;
        });
    }

    testTechnicalTroubleshooting() {
        this.test('Node.js and Installation Issues', () => {
            const content = fs.readFileSync(path.join(__dirname, 'troubleshooting-guide.md'), 'utf8');
            
            const nodeIssues = [
                'Node version not supported',
                'npm EACCES permission denied',
                'gyp ERR! build error',
                'Module not found',
                'Version conflict'
            ];

            const missingIssues = nodeIssues.filter(issue => 
                !content.includes(issue)
            );

            if (missingIssues.length > 0) {
                throw new Error(`Missing Node.js issues: ${missingIssues.join(', ')}`);
            }

            return `All ${nodeIssues.length} Node.js issues covered`;
        });

        this.test('Docker Issues Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'troubleshooting-guide.md'), 'utf8');
            
            const dockerIssues = [
                'Cannot connect to the Docker daemon',
                'Port already in use',
                'No space left on device',
                'Docker containers',
                'docker-compose'
            ];

            const missingIssues = dockerIssues.filter(issue => 
                !content.includes(issue)
            );

            if (missingIssues.length > 0) {
                throw new Error(`Missing Docker issues: ${missingIssues.join(', ')}`);
            }

            return `All ${dockerIssues.length} Docker issues covered`;
        });

        this.test('Database Troubleshooting Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'troubleshooting-guide.md'), 'utf8');
            
            const databaseIssues = [
                'Connection refused',
                'password authentication failed',
                'Migration failed',
                'Slow database queries',
                'High memory usage by PostgreSQL',
                'pg_dump',
                'pg_restore'
            ];

            const missingIssues = databaseIssues.filter(issue => 
                !content.includes(issue)
            );

            if (missingIssues.length > 0) {
                throw new Error(`Missing database issues: ${missingIssues.join(', ')}`);
            }

            return `All ${databaseIssues.length} database issues covered`;
        });

        this.test('API and Network Issues Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'troubleshooting-guide.md'), 'utf8');
            
            const apiIssues = [
                'Cannot reach API endpoints',
                'CORS errors',
                '401 Unauthorized',
                'SSL certificate errors',
                'Mixed content'
            ];

            const missingIssues = apiIssues.filter(issue => 
                !content.includes(issue)
            );

            if (missingIssues.length > 0) {
                throw new Error(`Missing API issues: ${missingIssues.join(', ')}`);
            }

            return `All ${apiIssues.length} API/network issues covered`;
        });

        this.test('Frontend Issues Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'troubleshooting-guide.md'), 'utf8');
            
            const frontendIssues = [
                'Build failed',
                'Out of memory',
                'White screen',
                'Hot reload not working',
                'TypeScript errors'
            ];

            const missingIssues = frontendIssues.filter(issue => 
                !content.includes(issue)
            );

            if (missingIssues.length > 0) {
                throw new Error(`Missing frontend issues: ${missingIssues.join(', ')}`);
            }

            return `All ${frontendIssues.length} frontend issues covered`;
        });
    }

    testUserSpecificFAQ() {
        this.test('Student FAQ Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'frequently-asked-questions.md'), 'utf8');
            
            const studentTopics = [
                'Daily Learning and Journaling',
                'Problem Solving and AI Assistance',
                'Progress and Goals',
                'What should I write in my learning journal',
                'How does the AI helper work',
                'Is using the AI helper considered cheating',
                'How do I set learning goals',
                'achievement badges'
            ];

            const missingTopics = studentTopics.filter(topic => 
                !content.includes(topic)
            );

            if (missingTopics.length > 0) {
                throw new Error(`Missing student topics: ${missingTopics.join(', ')}`);
            }

            return `All ${studentTopics.length} student topics covered`;
        });

        this.test('Teacher FAQ Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'frequently-asked-questions.md'), 'utf8');
            
            const teacherTopics = [
                'Classroom Management',
                'Student Support and Intervention',
                'Communication and Collaboration',
                'Professional Development',
                'How do I create and manage assignments',
                'Can I customize the AI scaffolding',
                'How do I monitor student progress',
                'intervention tools'
            ];

            const missingTopics = teacherTopics.filter(topic => 
                !content.includes(topic)
            );

            if (missingTopics.length > 0) {
                throw new Error(`Missing teacher topics: ${missingTopics.join(', ')}`);
            }

            return `All ${teacherTopics.length} teacher topics covered`;
        });

        this.test('Parent FAQ Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'frequently-asked-questions.md'), 'utf8');
            
            const parentTopics = [
                'Understanding Your Child\'s Progress',
                'Communication with Teachers',
                'Privacy and Safety Concerns',
                'Technical Support for Families',
                'How do I read my child\'s dashboard',
                'engagement level',
                'How can I support my child\'s learning at home',
                'Is my child\'s information safe'
            ];

            const missingTopics = parentTopics.filter(topic => 
                !content.includes(topic)
            );

            if (missingTopics.length > 0) {
                throw new Error(`Missing parent topics: ${missingTopics.join(', ')}`);
            }

            return `All ${parentTopics.length} parent topics covered`;
        });
    }

    testCommonIssuesCoverage() {
        this.test('Login and Authentication Issues', () => {
            const content = fs.readFileSync(path.join(__dirname, 'frequently-asked-questions.md'), 'utf8');
            
            const authIssues = [
                'I forgot my password',
                'My login isn\'t working',
                'Can I change my username',
                'How do I update my profile information',
                'password reset'
            ];

            const missingIssues = authIssues.filter(issue => 
                !content.includes(issue)
            );

            if (missingIssues.length > 0) {
                throw new Error(`Missing auth issues: ${missingIssues.join(', ')}`);
            }

            return `All ${authIssues.length} authentication issues covered`;
        });

        this.test('Technical Support Issues', () => {
            const content = fs.readFileSync(path.join(__dirname, 'frequently-asked-questions.md'), 'utf8');
            
            const techIssues = [
                'The page won\'t load',
                'I can\'t submit my assignment',
                'My microphone or camera isn\'t working',
                'Which browsers work best',
                'My work disappeared',
                'progress showing up correctly'
            ];

            const missingIssues = techIssues.filter(issue => 
                !content.includes(issue)
            );

            if (missingIssues.length > 0) {
                throw new Error(`Missing tech support issues: ${missingIssues.join(', ')}`);
            }

            return `All ${techIssues.length} technical support issues covered`;
        });

        this.test('Privacy and Safety Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'frequently-asked-questions.md'), 'utf8');
            
            const privacyTopics = [
                'Data Protection',
                'Digital Citizenship',
                'Safety Features',
                'What information does Mentra collect',
                'Who can see my child\'s information',
                'How long is student data kept',
                'appropriate behavior',
                'inappropriate content'
            ];

            const missingTopics = privacyTopics.filter(topic => 
                !content.includes(topic)
            );

            if (missingTopics.length > 0) {
                throw new Error(`Missing privacy topics: ${missingTopics.join(', ')}`);
            }

            return `All ${privacyTopics.length} privacy and safety topics covered`;
        });

        this.test('Platform Features Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'frequently-asked-questions.md'), 'utf8');
            
            const featureTopics = [
                'Learning Tools',
                'Collaboration Features',
                'Assessment and Feedback',
                'AI learning assistant',
                'learning pathways',
                'group projects',
                'formative feedback'
            ];

            const missingTopics = featureTopics.filter(topic => 
                !content.includes(topic)
            );

            if (missingTopics.length > 0) {
                throw new Error(`Missing feature topics: ${missingTopics.join(', ')}`);
            }

            return `All ${featureTopics.length} platform feature topics covered`;
        });
    }

    testEmergencyProcedures() {
        this.test('Emergency Procedures Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'troubleshooting-guide.md'), 'utf8');
            
            const emergencyProcedures = [
                'System Recovery',
                'Complete System Failure',
                'Database Corruption',
                'SSL Certificate Expired',
                'Emergency Commands',
                'When to Escalate'
            ];

            const missingProcedures = emergencyProcedures.filter(procedure => 
                !content.includes(procedure)
            );

            if (missingProcedures.length > 0) {
                throw new Error(`Missing emergency procedures: ${missingProcedures.join(', ')}`);
            }

            return `All ${emergencyProcedures.length} emergency procedures covered`;
        });

        this.test('Diagnostic Tools Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'troubleshooting-guide.md'), 'utf8');
            
            const diagnosticTools = [
                'Log Analysis',
                'System Monitoring',
                'Grep Commands',
                'Resource Usage Commands',
                'Diagnostic Script',
                'netstat',
                'htop'
            ];

            const missingTools = diagnosticTools.filter(tool => 
                !content.includes(tool)
            );

            if (missingTools.length > 0) {
                throw new Error(`Missing diagnostic tools: ${missingTools.join(', ')}`);
            }

            return `All ${diagnosticTools.length} diagnostic tools covered`;
        });

        this.test('Contact and Support Information', () => {
            const faqContent = fs.readFileSync(path.join(__dirname, 'frequently-asked-questions.md'), 'utf8');
            const troubleContent = fs.readFileSync(path.join(__dirname, 'troubleshooting-guide.md'), 'utf8');
            
            const supportInfo = [
                'Contact Information',
                'Emergency Support',
                'Escalation Contacts',
                'Getting Help',
                'When to Escalate'
            ];

            const combinedContent = faqContent + troubleContent;
            const missingInfo = supportInfo.filter(info => 
                !combinedContent.includes(info)
            );

            if (missingInfo.length > 0) {
                throw new Error(`Missing support information: ${missingInfo.join(', ')}`);
            }

            return `All ${supportInfo.length} support information sections covered`;
        });
    }

    printSummary() {
        console.log('\n══════════════════════════════════════════════════════════════════════');
        console.log('📊 TROUBLESHOOTING DOCUMENTATION TEST RESULTS');
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
            console.log('\n🎉 All tests passed! Troubleshooting documentation is ready for use.');
        }

        console.log('\n📋 TASK 6.7 TROUBLESHOOTING DOCUMENTATION SUMMARY:');
        console.log('• Comprehensive Troubleshooting Guide: Technical issues, installation, database, API, frontend problems');
        console.log('• Extensive FAQ Document: User-facing questions for students, teachers, and parents');
        console.log('• Emergency Procedures: System recovery, database corruption, security incidents');
        console.log('• Diagnostic Tools: Log analysis, system monitoring, performance troubleshooting');
        console.log('• User Support: Account issues, platform features, privacy and safety guidance');
        console.log('• Multi-Persona Coverage: Specific guidance for each user role and common scenarios');
        console.log('• Contact Information: Support channels, escalation procedures, emergency contacts');
        console.log('• Technical Coverage: Node.js, Docker, databases, APIs, frontend build issues');

        console.log('\n🔧 Troubleshooting guides and FAQ documentation completed.');
    }
}

// Run the tests
async function main() {
    const validator = new TroubleshootingDocsValidator();
    await validator.runTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = TroubleshootingDocsValidator; 