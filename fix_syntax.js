const fs = require('fs');
let code = fs.readFileSync('src/components/PosModule.tsx', 'utf-8');
code = code.replace(/<\/button>\n\s*\); \}\)\}/g, '</button>\n              );\n            })}');
fs.writeFileSync('src/components/PosModule.tsx', code);
