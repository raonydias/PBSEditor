const fs = require("fs");
const path = require("path");

const root = process.cwd();
const releaseDir = path.join(root, "release");
const readmePath = path.join(releaseDir, "README.md");

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

ensureDir(releaseDir);
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
console.log("- release/README.md");
