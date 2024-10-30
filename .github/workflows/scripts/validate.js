const fs = require('fs');
const path = require('path');

// Results object to be saved for PR comments
const results = {
    valid: true,
    errors: []
};

function validateTranslations() {
    try {
        // Load base translation
        const baseTranslationPath = path.join(process.cwd(), 'en_US.json');
        let baseTranslation;
        
        try {
            baseTranslation = JSON.parse(fs.readFileSync(baseTranslationPath, 'utf8'));
            console.log('✓ Base translation (en_US.json) is valid JSON');
        } catch (error) {
            results.valid = false;
            results.errors.push('❌ Base translation (en_US.json) is not valid JSON');
            console.error('❌ Base translation (en_US.json) is not valid JSON');
            saveResults();
            process.exit(1);
        }
        
        const baseKeys = Object.keys(baseTranslation);
        
        // Get all translation files
        const translationsDir = path.join(process.cwd(), 'translations');
        if (!fs.existsSync(translationsDir)) {
            console.log('ℹ️ No translations directory found. Skipping validation.');
            saveResults();
            process.exit(0);
        }
        
        const files = fs.readdirSync(translationsDir)
            .filter(file => file.endsWith('.json'));
            
        // Validate each translation file
        files.forEach(file => {
            const filePath = path.join(translationsDir, file);
            console.log(`\nValidating ${file}...`);
            
            try {
                // Check if it's valid JSON
                const translation = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                console.log(`✓ ${file} is valid JSON`);
                
                // Check for missing keys
                const translationKeys = Object.keys(translation);
                const missingKeys = baseKeys.filter(key => !translationKeys.includes(key));
                
                if (missingKeys.length > 0) {
                    results.valid = false;
                    const error = `❌ ${file} is missing translations for: ${missingKeys.join(', ')}`;
                    results.errors.push(error);
                    console.error(error);
                } else {
                    console.log(`✓ ${file} has all required translations`);
                }
                
                // Check for extra keys
                const extraKeys = translationKeys.filter(key => !baseKeys.includes(key));
                if (extraKeys.length > 0) {
                    results.valid = false;
                    const error = `❌ ${file} has extra keys that don't exist in en_US.json: ${extraKeys.join(', ')}`;
                    results.errors.push(error);
                    console.error(error);
                }
                
            } catch (error) {
                results.valid = false;
                const errorMsg = `❌ ${file} is not valid JSON`;
                results.errors.push(errorMsg);
                console.error(errorMsg);
            }
        });
        
        saveResults();
        process.exit(results.valid ? 0 : 1);
        
    } catch (error) {
        results.valid = false;
        results.errors.push('❌ Unexpected error during validation');
        saveResults();
        process.exit(1);
    }
}

function saveResults() {
    fs.writeFileSync('validation-results.json', JSON.stringify(results, null, 2));
}

validateTranslations();