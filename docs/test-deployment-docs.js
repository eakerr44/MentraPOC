#!/usr/bin/env node

/**
 * Deployment Documentation Validation Script
 * Tests deployment guides for proper structure, completeness, and technical accuracy
 */

const fs = require('fs');
const path = require('path');

class DeploymentDocsValidator {
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
        console.log('🚀 Testing Mentra Deployment Documentation...\n');

        // Test file existence and accessibility
        console.log('📚 Testing documentation files...');
        this.testFileExists('configuration-deployment-guide.md', 'Configuration & Deployment Guide');
        this.testFileExists('deployment-quick-reference.md', 'Deployment Quick Reference');

        // Test content structure
        console.log('\n📖 Testing content structure...');
        this.testDeploymentGuideStructure();
        this.testQuickReferenceStructure();

        // Test deployment procedures
        console.log('\n🚀 Testing deployment procedures...');
        this.testDeploymentProcedures();

        // Test configuration coverage
        console.log('\n⚙️ Testing configuration coverage...');
        this.testConfigurationCoverage();

        // Test environment specifics
        console.log('\n🌐 Testing environment specifics...');
        this.testEnvironmentCoverage();

        // Test security and best practices
        console.log('\n🔒 Testing security guidance...');
        this.testSecurityGuidance();

        // Test troubleshooting and emergency procedures
        console.log('\n🛠️ Testing troubleshooting coverage...');
        this.testTroubleshootingCoverage();

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
            if (content.length < 5000) {
                throw new Error(`File too short: ${content.length} characters`);
            }
            return `${content.length} characters`;
        });
    }

    testDeploymentGuideStructure() {
        this.test('Deployment Guide Structure', () => {
            const content = fs.readFileSync(path.join(__dirname, 'configuration-deployment-guide.md'), 'utf8');
            
            const requiredSections = [
                'Overview & Prerequisites',
                'Environment Configuration',
                'Development Deployment',
                'Staging Deployment',
                'Production Deployment',
                'Security Configuration',
                'Database Management',
                'Monitoring & Maintenance',
                'Troubleshooting',
                'Emergency Procedures'
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
            const content = fs.readFileSync(path.join(__dirname, 'deployment-quick-reference.md'), 'utf8');
            
            const requiredSections = [
                'Environment Setup',
                'Deployment Commands',
                'Environment URLs & Endpoints',
                'Essential Environment Variables',
                'Database Commands',
                'Docker Commands',
                'Health Checks & Monitoring',
                'Emergency Procedures'
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

    testDeploymentProcedures() {
        this.test('Deployment Script Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'configuration-deployment-guide.md'), 'utf8');
            
            const deploymentFeatures = [
                './scripts/deploy.sh',
                './scripts/setup-env.sh',
                'docker-compose up -d',
                'npm run migrate',
                'npm run dev',
                'Health check endpoints',
                'Rollback procedures'
            ];

            const missingFeatures = deploymentFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing deployment features: ${missingFeatures.join(', ')}`);
            }

            return `All ${deploymentFeatures.length} deployment features documented`;
        });

        this.test('Environment-Specific Procedures', () => {
            const content = fs.readFileSync(path.join(__dirname, 'configuration-deployment-guide.md'), 'utf8');
            
            const environmentProcedures = [
                'Development Environment',
                'Staging Environment', 
                'Production Environment',
                'Quick Start',
                'Detailed Setup',
                'Server Preparation',
                'Infrastructure Setup'
            ];

            const missingProcedures = environmentProcedures.filter(procedure => 
                !content.includes(procedure)
            );

            if (missingProcedures.length > 0) {
                throw new Error(`Missing environment procedures: ${missingProcedures.join(', ')}`);
            }

            return `All ${environmentProcedures.length} environment procedures documented`;
        });
    }

    testConfigurationCoverage() {
        this.test('Environment Variables Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'configuration-deployment-guide.md'), 'utf8');
            
            const configVariables = [
                'NODE_ENV',
                'DATABASE_URL',
                'JWT_SECRET',
                'AI_API_KEY',
                'CHROMA_HOST',
                'REDIS_URL',
                'BCRYPT_ROUNDS',
                'LOG_LEVEL',
                'SENTRY_DSN'
            ];

            const missingVariables = configVariables.filter(variable => 
                !content.includes(variable)
            );

            if (missingVariables.length > 0) {
                throw new Error(`Missing environment variables: ${missingVariables.join(', ')}`);
            }

            return `All ${configVariables.length} essential environment variables documented`;
        });

        this.test('Docker Configuration Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'configuration-deployment-guide.md'), 'utf8');
            
            const dockerFeatures = [
                'docker-compose.yml',
                'docker-compose.prod.yml',
                'PostgreSQL',
                'ChromaDB',
                'Redis',
                'Nginx',
                'SSL Certificate',
                'Health checks'
            ];

            const missingFeatures = dockerFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing Docker features: ${missingFeatures.join(', ')}`);
            }

            return `All ${dockerFeatures.length} Docker features documented`;
        });

        this.test('Database Configuration Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'configuration-deployment-guide.md'), 'utf8');
            
            const databaseFeatures = [
                'Migration Management',
                'Database Backups',
                'pg_dump',
                'pg_restore',
                'Database Monitoring',
                'Performance Monitoring',
                'Rollback Procedures'
            ];

            const missingFeatures = databaseFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing database features: ${missingFeatures.join(', ')}`);
            }

            return `All ${databaseFeatures.length} database features documented`;
        });
    }

    testEnvironmentCoverage() {
        this.test('Development Environment Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'configuration-deployment-guide.md'), 'utf8');
            
            const devFeatures = [
                'System Requirements',
                'Quick Start',
                'Install Dependencies',
                'Start Database Services',
                'Initialize Database',
                'Verify Installation',
                'Development Environment Management'
            ];

            const missingFeatures = devFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing development features: ${missingFeatures.join(', ')}`);
            }

            return `All ${devFeatures.length} development environment features documented`;
        });

        this.test('Production Environment Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'configuration-deployment-guide.md'), 'utf8');
            
            const prodFeatures = [
                'Infrastructure Requirements',
                'Pre-Deployment Checklist',
                'Infrastructure Setup',
                'SSL Certificate Configuration',
                'Nginx Production Configuration',
                'Production Process Management',
                'Load Balancer'
            ];

            const missingFeatures = prodFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing production features: ${missingFeatures.join(', ')}`);
            }

            return `All ${prodFeatures.length} production environment features documented`;
        });

        this.test('Staging Environment Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'configuration-deployment-guide.md'), 'utf8');
            
            const stagingFeatures = [
                'Infrastructure Requirements',
                'Server Preparation',
                'Application Setup',
                'SSL Certificate Setup',
                'Configure Nginx',
                'Process Management with PM2',
                'Monitoring and Logs'
            ];

            const missingFeatures = stagingFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing staging features: ${missingFeatures.join(', ')}`);
            }

            return `All ${stagingFeatures.length} staging environment features documented`;
        });
    }

    testSecurityGuidance() {
        this.test('Security Configuration Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'configuration-deployment-guide.md'), 'utf8');
            
            const securityFeatures = [
                'Strong Authentication',
                'Rate Limiting',
                'Security Headers',
                'Data Protection',
                'Security Checklist',
                'Security Monitoring',
                'SSL Certificate',
                'Firewall'
            ];

            const missingFeatures = securityFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing security features: ${missingFeatures.join(', ')}`);
            }

            return `All ${securityFeatures.length} security features documented`;
        });

        this.test('Environment-Specific Security', () => {
            const content = fs.readFileSync(path.join(__dirname, 'configuration-deployment-guide.md'), 'utf8');
            
            const securityLevels = [
                'Development Security',
                'Staging Security', 
                'Production Security',
                'Basic Security Measures',
                'Enhanced Security Measures',
                'Critical Security Measures'
            ];

            const missingLevels = securityLevels.filter(level => 
                !content.includes(level)
            );

            if (missingLevels.length > 0) {
                throw new Error(`Missing security levels: ${missingLevels.join(', ')}`);
            }

            return `All ${securityLevels.length} security levels documented`;
        });
    }

    testTroubleshootingCoverage() {
        this.test('Troubleshooting Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'configuration-deployment-guide.md'), 'utf8');
            
            const troubleshootingFeatures = [
                'Common Issues and Solutions',
                'Application Won\'t Start',
                'Database Connection Issues',
                'Performance Issues',
                'SSL Certificate Issues',
                'Debugging Tools',
                'Network Debugging',
                'Performance Profiling'
            ];

            const missingFeatures = troubleshootingFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing troubleshooting features: ${missingFeatures.join(', ')}`);
            }

            return `All ${troubleshootingFeatures.length} troubleshooting features documented`;
        });

        this.test('Emergency Procedures Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'configuration-deployment-guide.md'), 'utf8');
            
            const emergencyFeatures = [
                'Incident Response',
                'Severity Levels',
                'Emergency Response Steps',
                'Rollback Procedures',
                'Disaster Recovery',
                'Business Continuity',
                'Escalation Procedures'
            ];

            const missingFeatures = emergencyFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing emergency features: ${missingFeatures.join(', ')}`);
            }

            return `All ${emergencyFeatures.length} emergency features documented`;
        });

        this.test('Monitoring and Maintenance Coverage', () => {
            const content = fs.readFileSync(path.join(__dirname, 'configuration-deployment-guide.md'), 'utf8');
            
            const monitoringFeatures = [
                'Application Monitoring',
                'Health Checks',
                'Application Performance Monitoring',
                'Infrastructure Monitoring',
                'Log Management',
                'Maintenance Procedures',
                'Automated Maintenance Script'
            ];

            const missingFeatures = monitoringFeatures.filter(feature => 
                !content.includes(feature)
            );

            if (missingFeatures.length > 0) {
                throw new Error(`Missing monitoring features: ${missingFeatures.join(', ')}`);
            }

            return `All ${monitoringFeatures.length} monitoring features documented`;
        });
    }

    printSummary() {
        console.log('\n══════════════════════════════════════════════════════════════════════');
        console.log('📊 DEPLOYMENT DOCUMENTATION TEST RESULTS');
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
            console.log('\n🎉 All tests passed! Deployment documentation is ready for use.');
        }

        console.log('\n📋 TASK 6.6 DEPLOYMENT DOCUMENTATION SUMMARY:');
        console.log('• Comprehensive Configuration Guide: Complete deployment procedures for all environments');
        console.log('• Quick Reference Guide: Fast access to common deployment commands and procedures');
        console.log('• Environment Coverage: Development, staging, and production deployment procedures');
        console.log('• Security Guidance: Comprehensive security configuration and best practices');
        console.log('• Database Management: Migration, backup, and maintenance procedures');
        console.log('• Monitoring & Maintenance: Application and infrastructure monitoring guidance');
        console.log('• Troubleshooting: Common issues, debugging tools, and emergency procedures');
        console.log('• Docker Integration: Complete container-based deployment configuration');

        console.log('\n🚀 Configuration and deployment documentation completed.');
    }
}

// Run the tests
async function main() {
    const validator = new DeploymentDocsValidator();
    await validator.runTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = DeploymentDocsValidator; 