const fs = require('fs');
let content = fs.readFileSync('src/pages/CaixaPage.tsx', 'utf8');

// Replace alerts
content = content.replace(/alert\('([^']+)'\);/g, "setAlertConfig({ isOpen: true, title: 'Aviso', message: '$1' });");
content = content.replace(/alert\("([^"]+)"\);/g, 'setAlertConfig({ isOpen: true, title: "Aviso", message: "$1" });');

// Add AlertModal to the bottom if not present
if (!content.includes('<AlertModal isOpen={alertConfig.isOpen}')) {
  content = content.replace(
    /    <\/div>\s*<\/div>\s*\);\s*\};\s*$/m,
    `      <AlertModal isOpen={alertConfig.isOpen} title={alertConfig.title || 'Aviso'} message={alertConfig.message} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} />
    </div>
  );
};
`
  );
}

fs.writeFileSync('src/pages/CaixaPage.tsx', content);
