const https = require('https');
const fs = require('fs');
const path = require('path');

// Utility to download a file
function downloadFile(url, dest, headers = {}) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, { headers }, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return downloadFile(response.headers.location, dest, headers).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

// Download Material Symbols font
async function downloadFont() {
    const fontDir = path.join(__dirname, 'frontend', 'public', 'assets', 'fonts');
    if (!fs.existsSync(fontDir)) {
        fs.mkdirSync(fontDir, { recursive: true });
    }

    const cssUrl = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0';
    console.log('Fetching Google Fonts CSS...');
    
    return new Promise((resolve, reject) => {
        https.get(cssUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', async () => {
                const match = data.match(/url\((https:\/\/[^\)]+\.woff2)\)/);
                if (match && match[1]) {
                    const woff2Url = match[1];
                    console.log(`Downloading font from: ${woff2Url}`);
                    const fontPath = path.join(fontDir, 'material-symbols-rounded.woff2');
                    try {
                        await downloadFile(woff2Url, fontPath);
                        console.log('Font downloaded successfully!');
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error('Could not extract WOFF2 URL from CSS.'));
                }
            });
        }).on('error', reject);
    });
}

// Download or copy BHU Logo
async function downloadLogo() {
    const backendAssets = path.join(__dirname, 'backend', 'assets');
    if (!fs.existsSync(backendAssets)) {
        fs.mkdirSync(backendAssets, { recursive: true });
    }
    
    const sourceLogo = path.join(__dirname, 'frontend', 'public', 'BHUlogo.png');
    const destLogo = path.join(backendAssets, 'bhu-logo.png');
    
    console.log('Copying BHU Logo from frontend/public...');
    if (fs.existsSync(sourceLogo)) {
        fs.copyFileSync(sourceLogo, destLogo);
        console.log('Logo copied successfully!');
    } else {
        console.error('Source logo not found at ' + sourceLogo);
    }
}

async function main() {
    try {
        await downloadFont();
        await downloadLogo();
        console.log('All downloads completed!');
    } catch (e) {
        console.error('Error during downloads:', e);
    }
}

main();
