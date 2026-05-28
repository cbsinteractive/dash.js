const fs = require('fs');
const path = require('path');


const precommitTemplate = `#!/usr/bin/env node

var exec = require('child_process').exec;

exec('npm run lint', {
       cwd: '${__dirname.toString().replace(/\\/g, '\\\\').replace(/'/g, '\\\'')}'
     }, function (err, stdout, stderr) {

  var exitCode = 0;
  if (err) {
    console.log(stderr || err);
    exitCode = -1;
  }

  process.exit(exitCode);
}).stdout.on('data', function (chunk){
    process.stdout.write(chunk);
});
`;

const callerTemplate = `#!/bin/sh

node .git/hooks/pre-commit.cjs;`

function resolveGitHooksDir() {
    const gitPath = path.join(`${__dirname}`, '.git');
    try {
        const stat = fs.statSync(gitPath);
        if (stat.isDirectory()) {
            return path.join(gitPath, 'hooks');
        }
        // .git is a file (worktree); read its contents to find the real git dir.
        const gitContent = fs.readFileSync(gitPath, 'utf8').trim();
        const match = gitContent.match(/^gitdir: (.+)$/m);
        if (match) {
            return path.join(match[1], 'hooks');
        }
    } catch (e) {
        // Fall through to the non-worktree default.
    }
    return path.join(`${__dirname}`, '.git', 'hooks');
}

const pathToHooksFolder = resolveGitHooksDir();

function writeHook(name, content) {
    const precommitFile = path.join(pathToHooksFolder, name);
    fs.writeFile(precommitFile, content, { mode: 0o755 }, (err) => {
        if (err) throw err;
        console.log(`${precommitFile} created.`);
    });
}

fs.access(pathToHooksFolder, (err) => {
    if (err) {
        fs.mkdir(pathToHooksFolder, { recursive: true }, (err) => {
            if (err) throw err;
            writeHook('pre-commit.cjs', precommitTemplate);
            writeHook('pre-commit', callerTemplate);
        });
    } else {
        writeHook('pre-commit.cjs', precommitTemplate);
        writeHook('pre-commit', callerTemplate);
    }
});
