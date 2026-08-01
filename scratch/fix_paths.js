const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== '.git' && f !== 'node_modules' && f !== 'extensions') {
        walkDir(dirPath, callback);
      }
    } else {
      if (f.endsWith('.html')) {
        callback(dirPath);
      }
    }
  });
}

walkDir(rootDir, (filePath) => {
  const relativePath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (relativePath === 'index.html') {
    // Root index.html: make relative to current directory
    content = content
      .replace(/href="\/css\//g, 'href="css/')
      .replace(/src="\/js\//g, 'src="js/')
      .replace(/href="\/contact"/g, 'href="contact/"')
      .replace(/href="\/resources"/g, 'href="resources/"')
      .replace(/href="\/projects"/g, 'href="projects/"')
      .replace(/href="\/case-studies"/g, 'href="case-studies/"')
      .replace(/href="\/articles"/g, 'href="articles/"')
      .replace(/href="\/about"/g, 'href="about/"');
  } else {
    // Subfolder index.html (like articles/index.html, admin/index.html, etc.): make relative to parent directory
    content = content
      .replace(/href="\/css\//g, 'href="../css/')
      .replace(/href="\/admin\//g, 'href="../admin/')
      .replace(/src="\/js\//g, 'src="../js/')
      .replace(/src="\/admin\//g, 'src="../admin/')
      .replace(/href="\/contact"/g, 'href="../contact/"')
      .replace(/href="\/resources"/g, 'href="../resources/"')
      .replace(/href="\/projects"/g, 'href="../projects/"')
      .replace(/href="\/case-studies"/g, 'href="../case-studies/"')
      .replace(/href="\/articles"/g, 'href="../articles/"')
      .replace(/href="\/about"/g, 'href="../about/"')
      .replace(/href="\/article"/g, 'href="../article/"')
      .replace(/href="\/project"/g, 'href="../project/"')
      .replace(/href="\/case-study"/g, 'href="../case-study/"')
      .replace(/href="\/resource"/g, 'href="../resource/"')
      .replace(/href="\/"/g, 'href="../"');
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated paths in ${relativePath}`);
});
