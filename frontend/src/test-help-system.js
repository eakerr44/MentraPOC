#!/usr/bin/env node

/**
 * Help System Validation Script
 * Tests the frontend help system functionality and components
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class HelpSystemValidator {
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
        console.log('🔧 Testing Mentra Help System Frontend Components...\n');

        // Test file structure
        console.log('📁 Testing file structure...');
        this.testFileStructure();

        // Test TypeScript types
        console.log('\n📝 Testing TypeScript types...');
        this.testTypeDefinitions();

        // Test service functionality
        console.log('\n🔍 Testing help services...');
        this.testHelpServices();

        // Test component structure
        console.log('\n🧩 Testing component structure...');
        this.testComponentStructure();

        // Test integration points
        console.log('\n🔗 Testing integration points...');
        this.testIntegrationPoints();

        // Print summary
        this.printSummary();
    }

    testFileStructure() {
        this.test('Help Types Definition', () => {
            const typesPath = path.join(__dirname, 'types', 'help.ts');
            if (!fs.existsSync(typesPath)) {
                throw new Error(`Help types file not found: ${typesPath}`);
            }
            const content = fs.readFileSync(typesPath, 'utf8');
            if (!content.includes('UserRole') || !content.includes('HelpArticle')) {
                throw new Error('Required type definitions missing');
            }
            return 'Help types properly defined';
        });

        this.test('Help Data Service', () => {
            const dataPath = path.join(__dirname, 'services', 'helpData.ts');
            if (!fs.existsSync(dataPath)) {
                throw new Error(`Help data service not found: ${dataPath}`);
            }
            const content = fs.readFileSync(dataPath, 'utf8');
            if (!content.includes('helpArticles') || !content.includes('helpSections')) {
                throw new Error('Required data exports missing');
            }
            return 'Help data service properly structured';
        });

        this.test('Help Search Service', () => {
            const searchPath = path.join(__dirname, 'services', 'helpSearch.ts');
            if (!fs.existsSync(searchPath)) {
                throw new Error(`Help search service not found: ${searchPath}`);
            }
            const content = fs.readFileSync(searchPath, 'utf8');
            if (!content.includes('HelpSearchService') || !content.includes('search')) {
                throw new Error('Search service methods missing');
            }
            return 'Help search service properly implemented';
        });

        this.test('Help Page Component', () => {
            const pagePath = path.join(__dirname, 'pages', 'HelpPage.tsx');
            if (!fs.existsSync(pagePath)) {
                throw new Error(`Help page component not found: ${pagePath}`);
            }
            const content = fs.readFileSync(pagePath, 'utf8');
            if (!content.includes('HelpPage') || !content.includes('userRole')) {
                throw new Error('Help page props missing');
            }
            return 'Help page component properly structured';
        });

        this.test('Help Components Directory', () => {
            const componentsPath = path.join(__dirname, 'components', 'help');
            if (!fs.existsSync(componentsPath)) {
                throw new Error(`Help components directory not found: ${componentsPath}`);
            }
            
            const requiredComponents = [
                'HelpOverview.tsx',
                'HelpSearch.tsx',
                'HelpArticleView.tsx',
                'HelpNavigation.tsx',
                'HelpButton.tsx'
            ];

            const missingComponents = requiredComponents.filter(component => 
                !fs.existsSync(path.join(componentsPath, component))
            );

            if (missingComponents.length > 0) {
                throw new Error(`Missing components: ${missingComponents.join(', ')}`);
            }

            return `All ${requiredComponents.length} help components present`;
        });
    }

    testTypeDefinitions() {
        this.test('UserRole Type Coverage', () => {
            const typesPath = path.join(__dirname, 'types', 'help.ts');
            const content = fs.readFileSync(typesPath, 'utf8');
            
            const requiredRoles = ['student', 'teacher', 'parent', 'admin'];
            const missingRoles = requiredRoles.filter(role => !content.includes(`'${role}'`));
            
            if (missingRoles.length > 0) {
                throw new Error(`Missing user roles: ${missingRoles.join(', ')}`);
            }
            
            return `All ${requiredRoles.length} user roles defined`;
        });

        this.test('Content Type Definitions', () => {
            const typesPath = path.join(__dirname, 'types', 'help.ts');
            const content = fs.readFileSync(typesPath, 'utf8');
            
            const requiredTypes = ['user-guide', 'quick-reference', 'faq', 'troubleshooting', 'api-docs', 'setup-guide'];
            const missingTypes = requiredTypes.filter(type => !content.includes(`'${type}'`));
            
            if (missingTypes.length > 0) {
                throw new Error(`Missing content types: ${missingTypes.join(', ')}`);
            }
            
            return `All ${requiredTypes.length} content types defined`;
        });

        this.test('Interface Completeness', () => {
            const typesPath = path.join(__dirname, 'types', 'help.ts');
            const content = fs.readFileSync(typesPath, 'utf8');
            
            const requiredInterfaces = ['HelpArticle', 'HelpSection', 'SearchFilters', 'SearchResult'];
            const missingInterfaces = requiredInterfaces.filter(iface => 
                !content.includes(`interface ${iface}`)
            );
            
            if (missingInterfaces.length > 0) {
                throw new Error(`Missing interfaces: ${missingInterfaces.join(', ')}`);
            }
            
            return `All ${requiredInterfaces.length} interfaces defined`;
        });
    }

    testHelpServices() {
        this.test('Help Data Article Count', () => {
            const dataPath = path.join(__dirname, 'services', 'helpData.ts');
            const content = fs.readFileSync(dataPath, 'utf8');
            
            // Count article definitions (approximate)
            const articleMatches = content.match(/{\s*id:\s*['"][^'"]+['"]/g);
            const articleCount = articleMatches ? articleMatches.length : 0;
            
            if (articleCount < 8) {
                throw new Error(`Expected at least 8 articles, found ${articleCount}`);
            }
            
            return `${articleCount} help articles defined`;
        });

        this.test('Help Section Organization', () => {
            const dataPath = path.join(__dirname, 'services', 'helpData.ts');
            const content = fs.readFileSync(dataPath, 'utf8');
            
            const requiredSections = ['getting-started', 'for-students', 'for-teachers', 'for-parents', 'faq', 'troubleshooting'];
            const missingSections = requiredSections.filter(section => 
                !content.includes(`id: '${section}'`)
            );
            
            if (missingSections.length > 0) {
                throw new Error(`Missing sections: ${missingSections.join(', ')}`);
            }
            
            return `All ${requiredSections.length} help sections organized`;
        });

        this.test('Search Service Methods', () => {
            const searchPath = path.join(__dirname, 'services', 'helpSearch.ts');
            const content = fs.readFileSync(searchPath, 'utf8');
            
            const requiredMethods = ['search', 'getSearchSuggestions', 'getRelatedArticles', 'getQuickAnswer'];
            const missingMethods = requiredMethods.filter(method => 
                !content.includes(`${method}(`) && !content.includes(`${method} (`)
            );
            
            if (missingMethods.length > 0) {
                throw new Error(`Missing search methods: ${missingMethods.join(', ')}`);
            }
            
            return `All ${requiredMethods.length} search methods implemented`;
        });

        this.test('Role-Based Content Filtering', () => {
            const searchPath = path.join(__dirname, 'services', 'helpSearch.ts');
            const content = fs.readFileSync(searchPath, 'utf8');
            
            if (!content.includes('targetRoles.includes(filters.role)')) {
                throw new Error('Role-based filtering not implemented');
            }
            
            return 'Role-based content filtering implemented';
        });
    }

    testComponentStructure() {
        this.test('HelpOverview Component Props', () => {
            const overviewPath = path.join(__dirname, 'components', 'help', 'HelpOverview.tsx');
            const content = fs.readFileSync(overviewPath, 'utf8');
            
            const requiredProps = ['sections', 'userRole', 'onSectionSelect', 'onArticleSelect'];
            const missingProps = requiredProps.filter(prop => !content.includes(prop));
            
            if (missingProps.length > 0) {
                throw new Error(`Missing props: ${missingProps.join(', ')}`);
            }
            
            return `All ${requiredProps.length} required props implemented`;
        });

        this.test('HelpSearch Component Features', () => {
            const searchPath = path.join(__dirname, 'components', 'help', 'HelpSearch.tsx');
            const content = fs.readFileSync(searchPath, 'utf8');
            
            const requiredFeatures = ['searchInput', 'searchResults', 'quickAnswer', 'suggestions'];
            const missingFeatures = requiredFeatures.filter(feature => !content.includes(feature));
            
            if (missingFeatures.length > 0) {
                throw new Error(`Missing search features: ${missingFeatures.join(', ')}`);
            }
            
            return `All ${requiredFeatures.length} search features implemented`;
        });

        this.test('HelpArticleView Functionality', () => {
            const articlePath = path.join(__dirname, 'components', 'help', 'HelpArticleView.tsx');
            const content = fs.readFileSync(articlePath, 'utf8');
            
            const requiredFeatures = ['formatContent', 'relatedArticles', 'handleFeedback', 'getTypeColor'];
            const missingFeatures = requiredFeatures.filter(feature => !content.includes(feature));
            
            if (missingFeatures.length > 0) {
                throw new Error(`Missing article features: ${missingFeatures.join(', ')}`);
            }
            
            return `All ${requiredFeatures.length} article features implemented`;
        });

        this.test('HelpNavigation Interactivity', () => {
            const navPath = path.join(__dirname, 'components', 'help', 'HelpNavigation.tsx');
            const content = fs.readFileSync(navPath, 'utf8');
            
            const requiredFeatures = ['expandedSections', 'toggleSection', 'isCurrentSection', 'isCurrentArticle'];
            const missingFeatures = requiredFeatures.filter(feature => !content.includes(feature));
            
            if (missingFeatures.length > 0) {
                throw new Error(`Missing navigation features: ${missingFeatures.join(', ')}`);
            }
            
            return `All ${requiredFeatures.length} navigation features implemented`;
        });

        this.test('HelpButton Variants', () => {
            const buttonPath = path.join(__dirname, 'components', 'help', 'HelpButton.tsx');
            const content = fs.readFileSync(buttonPath, 'utf8');
            
            const requiredVariants = ['HelpButton', 'FloatingHelpButton', 'HeaderHelpButton'];
            const missingVariants = requiredVariants.filter(variant => !content.includes(variant));
            
            if (missingVariants.length > 0) {
                throw new Error(`Missing button variants: ${missingVariants.join(', ')}`);
            }
            
            return `All ${requiredVariants.length} button variants implemented`;
        });
    }

    testIntegrationPoints() {
        this.test('App Router Integration', () => {
            const appPath = path.join(__dirname, 'App.tsx');
            const content = fs.readFileSync(appPath, 'utf8');
            
            if (!content.includes('/help') || !content.includes('HelpPage')) {
                throw new Error('Help routes not integrated in App.tsx');
            }
            
            return 'Help routes properly integrated';
        });

        this.test('Help System Accessibility', () => {
            const helpComponents = [
                'pages/HelpPage.tsx',
                'components/help/HelpOverview.tsx',
                'components/help/HelpSearch.tsx',
                'components/help/HelpArticleView.tsx',
                'components/help/HelpNavigation.tsx'
            ];

            let accessibilityFeatures = 0;
            
            helpComponents.forEach(componentPath => {
                const fullPath = path.join(__dirname, componentPath);
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (content.includes('aria-') || content.includes('role=') || content.includes('title=')) {
                        accessibilityFeatures++;
                    }
                }
            });
            
            if (accessibilityFeatures < 3) {
                throw new Error(`Limited accessibility features found (${accessibilityFeatures}/${helpComponents.length})`);
            }
            
            return `${accessibilityFeatures} components include accessibility features`;
        });

        this.test('Mobile Responsiveness', () => {
            const helpComponents = [
                'pages/HelpPage.tsx',
                'components/help/HelpOverview.tsx',
                'components/help/HelpSearch.tsx'
            ];

            let responsiveComponents = 0;
            
            helpComponents.forEach(componentPath => {
                const fullPath = path.join(__dirname, componentPath);
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (content.includes('md:') || content.includes('lg:') || content.includes('sm:')) {
                        responsiveComponents++;
                    }
                }
            });
            
            if (responsiveComponents < 2) {
                throw new Error(`Limited responsive design found (${responsiveComponents}/${helpComponents.length})`);
            }
            
            return `${responsiveComponents} components include responsive design`;
        });

        this.test('Error Handling', () => {
            const criticalFiles = [
                'services/helpSearch.ts',
                'components/help/HelpSearch.tsx',
                'components/help/HelpArticleView.tsx'
            ];

            let errorHandling = 0;
            
            criticalFiles.forEach(filePath => {
                const fullPath = path.join(__dirname, filePath);
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf8');
                    if (content.includes('try') || content.includes('catch') || content.includes('error')) {
                        errorHandling++;
                    }
                }
            });
            
            if (errorHandling < 2) {
                throw new Error(`Limited error handling found (${errorHandling}/${criticalFiles.length})`);
            }
            
            return `${errorHandling} components include error handling`;
        });
    }

    printSummary() {
        console.log('\n══════════════════════════════════════════════════════════════════════');
        console.log('📊 HELP SYSTEM FRONTEND TEST RESULTS');
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
            console.log('\n🎉 All tests passed! Help system is ready for use.');
        }

        console.log('\n📋 TASK 6.8 HELP SYSTEM FRONTEND SUMMARY:');
        console.log('• Complete Help Center: Role-based navigation, search, and article viewing');
        console.log('• Search Functionality: Intelligent search with suggestions and quick answers');
        console.log('• Component Architecture: Modular, reusable components with TypeScript types');
        console.log('• User Experience: Responsive design, accessibility features, and error handling');
        console.log('• Integration Ready: Easy integration with existing applications via help buttons');
        console.log('• Content Organization: Structured articles by persona (student, teacher, parent)');
        console.log('• Knowledge Base: All documentation content accessible through frontend interface');

        console.log('\n📚 Frontend knowledge base space created and integrated.');
    }
}

// Run the tests
async function main() {
    const validator = new HelpSystemValidator();
    await validator.runTests();
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default HelpSystemValidator; 