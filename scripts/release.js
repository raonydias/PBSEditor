const fs = require("fs");
const path = require("path");

const root = process.cwd();
const releaseDir = path.join(root, "release");
const clientDist = path.join(root, "client", "dist");
const targetClient = path.join(releaseDir, "client", "dist");
const readmePath = path.join(releaseDir, "README.md");

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const copyDir = (src, dest) => {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

if (!fs.existsSync(clientDist)) {
  console.error("Missing client/dist. Run npm run build first.");
  process.exit(1);
}

ensureDir(releaseDir);
copyDir(clientDist, targetClient);
const readme = `# PBS Editor (Release)

## Quick start
1) Unzip this folder into the root of your Pokemon Essentials project.
   - The folder should be alongside PBS/, Graphics/, Audio/, etc.
2) Run PBSEditor.exe.
3) Open http://localhost:5174 in your browser.

## Behavior
- Reads from ./PBS/
- Writes exports to ./PBS_Output/
- Never overwrites your original PBS files.

## Stop the server
- Close the terminal window running PBSEditor.exe.

## Troubleshooting
- If Windows Firewall prompts, allow access for localhost.
- If the page does not load, make sure PBSEditor.exe is still running.
`;
fs.writeFileSync(readmePath, readme, "utf8");

console.log("Release assets prepared:");
console.log("- release/PBSEditor.exe");
console.log("- release/client/dist");
console.log("- release/README.md");
