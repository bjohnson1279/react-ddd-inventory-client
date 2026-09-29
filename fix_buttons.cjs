const fs = require('fs');
const path = require('path');

function checkButtons(dir) {
    let filesUpdated = 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            filesUpdated += checkButtons(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let lines = content.split('\n');
            let needsUpdate = false;

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('<button') && !lines[i].includes('disabled=') && !lines[i].includes('Dismiss error') && !lines[i].includes('Dismiss success')) {
                    // check if the button uses an action handle
                    let hasClick = false;
                    for (let j = i; j < Math.min(i + 5, lines.length); j++) {
                        if (lines[j].includes('onClick={handle') || lines[j].includes('onClick={() => handle') || lines[j].includes('type="submit"')) {
                            hasClick = true;
                            break;
                        }
                    }
                    if (hasClick && !lines[i].includes('type="button"')) {
                        // try to append disabled={loading} aria-busy={loading}
                        // if loading is defined in this scope. Wait, what if `loading` isn't defined?
                        // Or what if it's `approving`, `isSubmitting`, `isScanning`, `isRefreshing`, `isOnline`...
                        console.log(`Potential button to update in ${fullPath}:${i+1}`);
                        console.log(lines[i]);
                    }
                }
            }
        }
    }
    return filesUpdated;
}

checkButtons('src/components');
