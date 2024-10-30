const fs = require('fs');
const path = require('path');

const results = {
    valid: true,
    errors: []
};

function validateTranslation(filePath, baseTranslation) {
    try {
        // Read the translation file
        const content = fs.readFileSync(filePath, 'utf8');
        const filename = path.basename(filePath);

        // Common JSON issues check before parsing
        if (content.includes("'")) {
            results.errors.push(`${filename}: Found single quotes (') - JSON requires double quotes (")`);
            results.valid = false;
        }

        if (/,(\s*[}\]])/g.test(content)) {
            results.errors.push(`${filename}: Found trailing comma(s) - JSON doesn't allow trailing commas`);
            results.valid = false;
        }

        // Try to parse JSON
        try {
            const translation = JSON.parse(content);
            console.log(`✓ ${filename} is valid JSON`);

            // Check structure against base translation
            const baseKeys = Object.keys(baseTranslation);
            const translationKeys = Object.keys(translation);
            
            const missingKeys = baseKeys.filter(key => !translationKeys.includes(key));
            const extraKeys = translationKeys.filter(key => !baseKeys.includes(key));
            
            if (missingKeys.length > 0) {
                results.valid = false;
                results.errors.push(`${filename} is missing these keys that exist in en-US.json:\n${missingKeys.map(k => `  - ${k}`).join('\n')}`);
            }
            
            if (extraKeys.length > 0) {
                results.valid = false;
                results.errors.push(`${filename} has these extra keys that don't exist in en-US.json:\n${extraKeys.map(k => `  - ${k}`).join('\n')}`);
            }

        } catch (parseError) {
            results.valid = false;
            
            // Get detailed position info
            const lines = content.split('\n');
            let lineNo = 0;
            let charNo = 0;
            const pos = parseError.message.match(/position (\d+)/)?.[1];
            
            if (pos) {
                for (let i = 0; i < pos; i++) {
                    if (content[i] === '\n') {
                        lineNo++;
                        charNo = 0;
                    } else {
                        charNo++;
                    }
                }

                // Show the problematic line and point to the error
                const errorLine = lines[lineNo];
                const pointer = ' '.repeat(charNo) + '^';
                
                results.errors.push(
                    `${filename} has invalid JSON at line ${lineNo + 1}, column ${charNo + 1}:\n` +
                    `${errorLine}\n${pointer}\n` +
                    `Error: ${parseError.message}`
                );

                // Add helpful hints based on common errors
                if (parseError.message.includes('Expected')) {
                    if (parseError.message.includes('Expected ,')) {
                        results.errors.push('Hint: Missing comma between properties');
                    } else if (parseError.message.includes('Expected "')) {
                        results.errors.push('Hint: Missing quotes around property name or value');
                    } else if (parseError.message.includes('Expected }')) {
                        results.errors.push('Hint: Missing closing brace');
                    }
                }
            } else {
                // Fallback if we can't get position info
                results.errors.push(`${filename} has invalid JSON: ${parseError.message}`);
            }
        }
        
    } catch (error) {
        results.valid = false;
        results.errors.push(`Error reading ${path.basename(filePath)}: ${error.message}`);
    }
}

function main() {
    try {
        // Load base translation
        const baseTranslation = require('../en-US.json');
        
        // Get files to validate
        const changedFiles = process.env.CHANGED_FILES ? 
            process.env.CHANGED_FILES.split(',') : 
            fs.readdirSync('translations').filter(f => f.endsWith('.json'));
            
        changedFiles.forEach(file => {
            const filePath = path.join('translations', file);
            if (fs.existsSync(filePath)) {
                console.log(`\nValidating ${file}...`);
                validateTranslation(filePath, baseTranslation);
            }
        });
        
        // Save results for GitHub Actions
        fs.writeFileSync('validation-results.json', JSON.stringify(results, null, 2));
        
        if (!results.valid) {
            console.error('\nValidation failed:');
            results.errors.forEach(error => console.error(`\n❌ ${error}`));
            process.exit(1);
        } else {
            console.log('\n✅ All validations passed!');
            process.exit(0);
        }
        
    } catch (error) {
        results.errors.push(`Validation script error: ${error.message}`);
        fs.writeFileSync('validation-results.json', JSON.stringify({
            valid: false,
            errors: results.errors
        }, null, 2));
        process.exit(1);
    }
}

main();