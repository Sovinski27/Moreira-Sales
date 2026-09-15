const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');
code = code.replace(/useState<'clientes' \| 'config' \| 'ranking' \| 'churn'>/, "useState<'clientes' | 'config' | 'ranking' | 'churn' | 'catalogo' | 'bi' | 'cmv'>");
fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
