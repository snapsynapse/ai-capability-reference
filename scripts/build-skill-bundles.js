#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');
const SURFACE_SKILL_DIRS = [
    '.claude/skills',
    '.perplexity/skills',
    '.codex/skills'
];
const TARGETS = [
    { id: 'perplexity', ext: '.zip', platform: 'Perplexity', surface: 'Chat' },
    { id: 'claude', ext: '.skill', platform: 'Anthropic Claude', surface: 'Chat' },
    { id: 'codex', ext: '', platform: 'Codex', surface: 'Desktop' }
];

function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return { frontmatter: {}, body: content };

    const frontmatter = {};
    const lines = match[1].split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (!keyMatch) continue;

        const key = keyMatch[1].trim();
        const rawValue = keyMatch[2];

        if (rawValue === '>-'
            || rawValue === '|'
            || rawValue === '>') {
            const blockLines = [];
            let j = i + 1;
            while (j < lines.length) {
                if (/^\S/.test(lines[j])) break;
                blockLines.push(lines[j].replace(/^\s{2}/, ''));
                j++;
            }
            frontmatter[key] = blockLines.join('\n').trim().replace(/\n+/g, ' ');
            i = j - 1;
            continue;
        }

        frontmatter[key] = rawValue.trim();
    }

    return {
        frontmatter,
        body: content.slice(match[0].length).trim()
    };
}

function listSkillNames() {
    if (!fs.existsSync(SKILLS_DIR)) return [];
    return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .filter(name => fs.existsSync(path.join(SKILLS_DIR, name, 'src', 'SKILL.md')))
        .sort();
}

function listSkillDirectories() {
    if (!fs.existsSync(SKILLS_DIR)) return [];
    return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort();
}

function validateCanonicalSkillLayout() {
    const errors = [];

    listSkillDirectories().forEach(skillName => {
        const legacyRootSkill = path.join(SKILLS_DIR, skillName, 'SKILL.md');
        const canonicalSkill = path.join(SKILLS_DIR, skillName, 'src', 'SKILL.md');

        if (fs.existsSync(legacyRootSkill)) {
            errors.push(`Canonical skill source for "${skillName}" must live at skills/${skillName}/src/SKILL.md, not skills/${skillName}/SKILL.md.`);
        }

        if (!fs.existsSync(canonicalSkill) && fs.existsSync(path.join(SKILLS_DIR, skillName))) {
            errors.push(`Skill "${skillName}" is missing src/SKILL.md.`);
        }
    });

    if (errors.length) {
        throw new Error(`Skill layout validation failed:\n- ${errors.join('\n- ')}`);
    }
}

function trackedFiles(paths) {
    try {
        const output = execFileSync('git', ['ls-files', ...paths], {
            cwd: ROOT,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore']
        }).trim();
        return output ? output.split('\n').filter(Boolean) : [];
    } catch (error) {
        return [];
    }
}

function validateNoTrackedSurfaceSkillCopies() {
    const trackedSurfaceFiles = trackedFiles(SURFACE_SKILL_DIRS)
        .filter(filepath => fs.existsSync(path.join(ROOT, filepath)))
        .filter(filepath => /\/skills\/[^/]+\/SKILL\.md$/.test(filepath));

    if (!trackedSurfaceFiles.length) return;

    const lines = trackedSurfaceFiles.map(filepath => {
        const parts = filepath.split('/');
        const skillName = parts[parts.indexOf('skills') + 1] || 'unknown-skill';
        return `${filepath} -> canonical source should be skills/${skillName}/src/SKILL.md`;
    });

    throw new Error(
        'Tracked platform-local skill copies detected. Remove these tracked duplicates and rebuild from canonical sources:\n' +
        lines.map(line => `- ${line}`).join('\n')
    );
}

function walkFiles(dir, baseDir = dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    const files = [];

    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            files.push(...walkFiles(fullPath, baseDir));
            continue;
        }
        files.push(path.relative(baseDir, fullPath).replace(/\\/g, '/'));
    }

    return files.sort();
}

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function removeDir(dir) {
    fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(source, target) {
    ensureDir(target);
    for (const relativePath of walkFiles(source)) {
        const sourcePath = path.join(source, relativePath);
        const targetPath = path.join(target, relativePath);
        ensureDir(path.dirname(targetPath));
        fs.copyFileSync(sourcePath, targetPath);
    }
}

function sha256(filepath) {
    const hash = crypto.createHash('sha256');
    hash.update(fs.readFileSync(filepath));
    return `sha256:${hash.digest('hex')}`;
}

function normalizeSemverish(version) {
    if (version === undefined || version === null || version === '') return '0.0.0';
    const text = String(version).trim();
    if (!text) return '0.0.0';

    const parts = text.split('.').map(part => Number(part));
    if (parts.some(part => !Number.isFinite(part) || part < 0)) return '0.0.0';

    while (parts.length < 3) parts.push(0);
    return parts.slice(0, 3).join('.');
}

function compareSemverish(a, b) {
    const aParts = normalizeSemverish(a).split('.').map(Number);
    const bParts = normalizeSemverish(b).split('.').map(Number);

    for (let i = 0; i < 3; i++) {
        if (aParts[i] > bParts[i]) return 1;
        if (aParts[i] < bParts[i]) return -1;
    }

    return 0;
}

function bundleVersionFromSrc(srcDir) {
    const files = walkFiles(srcDir);
    let version = '1.0.0';

    files.forEach(relativePath => {
        const content = fs.readFileSync(path.join(srcDir, relativePath), 'utf8');
        const { frontmatter } = parseFrontmatter(content);
        const fileVersion = frontmatter.version || '';
        if (compareSemverish(fileVersion, version) > 0) {
            version = normalizeSemverish(fileVersion);
        }
    });

    return version;
}

function buildManifest(skillName, stagedSkillDir, target, bundleVersion, skillDescription) {
    const files = walkFiles(stagedSkillDir).filter(file => file !== 'MANIFEST.yaml');
    const entries = files.map(relativePath => {
        const content = fs.readFileSync(path.join(stagedSkillDir, relativePath), 'utf8');
        const { frontmatter } = parseFrontmatter(content);
        const role = relativePath === 'SKILL.md' ? 'skill' : (frontmatter.file_role || 'reference');
        const version = normalizeSemverish(frontmatter.version || bundleVersion);
        return {
            path: relativePath,
            role,
            version,
            hash: sha256(path.join(stagedSkillDir, relativePath))
        };
    });

    const lines = [
        `bundle: ${skillName}`,
        `bundle_version: ${bundleVersion}`,
        `bundle_date: ${new Date().toISOString().split('T')[0]}`,
        'description: >-',
        `  ${skillDescription}`,
        '',
        'compatibility:',
        '  designed_for:',
        `    platform: ${target.platform}`,
        `    surface: ${target.surface}`,
        '  tested_on:',
        `    - platform: ${target.platform}`,
        `      surface: ${target.surface}`,
        '      status: generated',
        `      date: ${new Date().toISOString().split('T')[0]}`,
        '      notes: Built from canonical repo source.',
        '  spec_version: agentskills.io/1.0',
        '  frontmatter_mode: minimal',
        '',
        'files:'
    ];

    entries.forEach(entry => {
        lines.push(`  - path: ${entry.path}`);
        lines.push(`    role: ${entry.role}`);
        lines.push(`    version: ${entry.version}`);
        lines.push(`    hash: ${entry.hash}`);
    });

    fs.writeFileSync(path.join(stagedSkillDir, 'MANIFEST.yaml'), `${lines.join('\n')}\n`);
}

function packageTarget(skillName, srcDir, distDir, target) {
    const skillContent = fs.readFileSync(path.join(srcDir, 'SKILL.md'), 'utf8');
    const { frontmatter } = parseFrontmatter(skillContent);
    const bundleVersion = bundleVersionFromSrc(srcDir);

    ensureDir(distDir);

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `${skillName}-${target.id}-`));
    const stagedSkillDir = path.join(tempRoot, skillName);

    copyDir(srcDir, stagedSkillDir);
    buildManifest(skillName, stagedSkillDir, target, bundleVersion, frontmatter.description || `${skillName} skill`);

    if (target.id === 'codex') {
        const outDir = path.join(distDir, target.id, skillName);
        removeDir(outDir);
        copyDir(stagedSkillDir, outDir);
        removeDir(tempRoot);
        return outDir;
    }

    const targetDir = path.join(distDir, target.id);
    ensureDir(targetDir);
    const archivePath = path.join(targetDir, `${skillName}${target.ext}`);
    fs.rmSync(archivePath, { force: true });
    execFileSync('zip', ['-qr', archivePath, skillName], { cwd: tempRoot });
    removeDir(tempRoot);
    return archivePath;
}

function main() {
    validateCanonicalSkillLayout();
    validateNoTrackedSurfaceSkillCopies();

    const requestedSkills = process.argv.slice(2);
    const skillNames = requestedSkills.length ? requestedSkills : listSkillNames();

    if (!skillNames.length) {
        console.error('No skills found.');
        process.exit(1);
    }

    skillNames.forEach(skillName => {
        const skillDir = path.join(SKILLS_DIR, skillName);
        const srcDir = path.join(skillDir, 'src');
        const distDir = path.join(skillDir, 'dist');

        if (!fs.existsSync(path.join(srcDir, 'SKILL.md'))) {
            console.error(`Skipping ${skillName}: missing src/SKILL.md`);
            return;
        }

        TARGETS.forEach(target => {
            const output = packageTarget(skillName, srcDir, distDir, target);
            console.log(`${skillName} -> ${target.id}: ${path.relative(ROOT, output)}`);
        });
    });
}

main();
