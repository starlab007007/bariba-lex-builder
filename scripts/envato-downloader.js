#!/usr/bin/env node

/**
 * TAM-TAM Envato Asset Downloader CLI
 * 
 * Usage:
 *   node scripts/envato-downloader.js --email=user@email.com --category=light-leak
 *   node scripts/envato-downloader.js --all --optimize
 *   node scripts/envato-downloader.js --resume
 * 
 * This script downloads assets from Envato Elements for the TAM-TAM template system.
 * It supports parallel downloads, progress tracking, and resume capability.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  defaultOutput: 'public/assets/envato/',
  stateFile: '.download-state.json',
  maxRetries: 3,
  retryDelay: 2000,
  defaultParallel: 5,
  chunkSize: 1024 * 1024, // 1MB chunks for progress reporting
};

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// Asset mapping (simplified version - in real implementation, import from EnvatoDownloader.ts)
const ENVATO_ASSET_MAP = {
  'light-leak': [
    { local: 'leak-001.webm', envato: 'Light Leak Orange Cinematic 4K', id: 'envato-123001', size: 45000000 },
    { local: 'leak-002.webm', envato: 'Light Leak Blue Anamorphic 4K', id: 'envato-123002', size: 38000000 },
    { local: 'leak-003.webm', envato: 'Light Leak Warm Sunset Pro', id: 'envato-123003', size: 42000000 },
    { local: 'leak-004.webm', envato: 'Light Leak Purple Dream Alpha', id: 'envato-123004', size: 36000000 },
    { local: 'leak-005.webm', envato: 'Light Leak Golden Hour Pack', id: 'envato-123005', size: 52000000 },
  ],
  'particles': [
    { local: 'particles-001.webm', envato: 'Dust Particles Floating 4K', id: 'envato-124001', size: 28000000 },
    { local: 'particles-002.webm', envato: 'Smoke Particles Cinematic', id: 'envato-124002', size: 32000000 },
    { local: 'particles-003.webm', envato: 'Bokeh Particles Warm Glow', id: 'envato-124003', size: 25000000 },
    { local: 'particles-004.webm', envato: 'Ember Particles Fire Effect', id: 'envato-124004', size: 30000000 },
  ],
  'audio': [
    { local: 'african-drums-001.mp3', envato: 'African Drums Traditional Loop', id: 'envato-125001', size: 8500000 },
    { local: 'percussion-001.mp3', envato: 'Percussion Ethnic World Beat', id: 'envato-125002', size: 7200000 },
    { local: 'ambient-001.mp3', envato: 'Ambient African Sunset', id: 'envato-125003', size: 9100000 },
  ],
  'transitions': [
    { local: 'transition-001.webm', envato: 'Wipe Transition Ink Reveal', id: 'envato-126001', size: 15000000 },
    { local: 'transition-002.webm', envato: 'Slide Transition Geometric', id: 'envato-126002', size: 12000000 },
    { local: 'transition-003.webm', envato: 'Zoom Transition Cinematic', id: 'envato-126003', size: 18000000 },
  ],
  'lens-flare': [
    { local: 'flare-001.png', envato: 'Lens Flare Anamorphic Blue', id: 'envato-127001', size: 2400000 },
    { local: 'flare-002.png', envato: 'Lens Flare Sun Burst Golden', id: 'envato-127002', size: 1800000 },
    { local: 'flare-003.png', envato: 'Lens Flare Rainbow Prismatic', id: 'envato-127003', size: 2100000 },
  ],
  'textures': [
    { local: 'grain-001.png', envato: 'Film Grain Overlay 4K', id: 'envato-128001', size: 4500000 },
    { local: 'grain-002.png', envato: 'Vintage Noise Texture HD', id: 'envato-128002', size: 3800000 },
  ],
  '3d-models': [
    { local: 'drum-001.glb', envato: 'African Drum 3D Model', id: 'envato-129001', size: 8900000 },
    { local: 'mask-001.glb', envato: 'Traditional Mask 3D', id: 'envato-129002', size: 6700000 },
  ],
};

// ============================================================================
// UTILITIES
// ============================================================================

function log(message, type = 'info') {
  const timestamp = new Date().toISOString().substr(11, 8);
  const prefix = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
    warn: `${colors.yellow}⚠${colors.reset}`,
    debug: `${colors.dim}◦${colors.reset}`,
  }[type] || '•';
  
  console.log(`${colors.dim}[${timestamp}]${colors.reset} ${prefix} ${message}`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function parseArgs(args) {
  const parsed = {
    email: null,
    password: null,
    token: null,
    category: null,
    all: false,
    output: CONFIG.defaultOutput,
    parallel: CONFIG.defaultParallel,
    skipExisting: false,
    optimize: false,
    verbose: false,
    resume: false,
    help: false,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--all') {
      parsed.all = true;
    } else if (arg === '--skip-existing') {
      parsed.skipExisting = true;
    } else if (arg === '--optimize') {
      parsed.optimize = true;
    } else if (arg === '--verbose' || arg === '-v') {
      parsed.verbose = true;
    } else if (arg === '--resume') {
      parsed.resume = true;
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg.startsWith('--email=')) {
      parsed.email = arg.substring(8);
    } else if (arg.startsWith('--password=')) {
      parsed.password = arg.substring(11);
    } else if (arg.startsWith('--token=')) {
      parsed.token = arg.substring(8);
    } else if (arg.startsWith('--category=')) {
      parsed.category = arg.substring(11);
    } else if (arg.startsWith('--output=')) {
      parsed.output = arg.substring(9);
    } else if (arg.startsWith('--parallel=')) {
      parsed.parallel = parseInt(arg.substring(11), 10);
    }
  }

  return parsed;
}

function showHelp() {
  console.log(`
${colors.bright}${colors.cyan}TAM-TAM Envato Asset Downloader${colors.reset}
${colors.dim}Download Envato Elements assets for TAM-TAM templates${colors.reset}

${colors.bright}USAGE:${colors.reset}
  node scripts/envato-downloader.js [options]

${colors.bright}AUTHENTICATION:${colors.reset}
  --email=<email>       Envato Elements email
  --password=<password> Envato Elements password
  --token=<token>       Or use API token instead

${colors.bright}DOWNLOAD OPTIONS:${colors.reset}
  --category=<name>     Download specific category
                        Options: ${Object.keys(ENVATO_ASSET_MAP).join(', ')}
  --all                 Download all categories
  --output=<path>       Output directory (default: ${CONFIG.defaultOutput})
  --parallel=<n>        Parallel downloads (default: ${CONFIG.defaultParallel})
  --skip-existing       Skip already downloaded files
  --optimize            Optimize files after download

${colors.bright}OTHER OPTIONS:${colors.reset}
  --resume              Resume interrupted download
  --verbose, -v         Show detailed logs
  --dry-run             Show what would be downloaded
  --help, -h            Show this help message

${colors.bright}EXAMPLES:${colors.reset}
  ${colors.dim}# Download all light leak assets${colors.reset}
  node scripts/envato-downloader.js --email=user@email.com --category=light-leak

  ${colors.dim}# Download everything with optimization${colors.reset}
  node scripts/envato-downloader.js --email=user@email.com --all --optimize

  ${colors.dim}# Resume interrupted download${colors.reset}
  node scripts/envato-downloader.js --resume

  ${colors.dim}# Dry run to see what will be downloaded${colors.reset}
  node scripts/envato-downloader.js --all --dry-run
`);
}

// ============================================================================
// PROGRESS BAR
// ============================================================================

class ProgressBar {
  constructor(total, label = '') {
    this.total = total;
    this.current = 0;
    this.label = label;
    this.width = 30;
    this.startTime = Date.now();
    this.lastRender = 0;
  }

  update(current, extra = '') {
    this.current = current;
    const now = Date.now();
    
    // Throttle updates to avoid flickering
    if (now - this.lastRender < 100 && current !== this.total) return;
    this.lastRender = now;

    const percent = Math.min(100, Math.round((current / this.total) * 100));
    const filled = Math.round(this.width * (current / this.total));
    const empty = this.width - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    
    const elapsed = now - this.startTime;
    const speed = current / (elapsed / 1000);
    const eta = speed > 0 ? (this.total - current) / speed : 0;
    
    const speedStr = formatBytes(speed) + '/s';
    const etaStr = eta > 0 ? `ETA: ${formatDuration(eta * 1000)}` : '';
    
    process.stdout.write(`\r${colors.cyan}${this.label}${colors.reset} ${bar} ${percent}% (${speedStr}) ${etaStr} ${extra}     `);
  }

  finish(message = '') {
    process.stdout.write(`\r${colors.green}${this.label}${colors.reset} ${'█'.repeat(this.width)} 100% ${message}\n`);
  }
}

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

class DownloadState {
  constructor(stateFile) {
    this.stateFile = stateFile;
    this.state = {
      startedAt: null,
      lastUpdated: null,
      completed: [],
      failed: [],
      pending: [],
      currentSession: null,
    };
  }

  load() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf8');
        this.state = JSON.parse(data);
        return true;
      }
    } catch (error) {
      log(`Error loading state: ${error.message}`, 'warn');
    }
    return false;
  }

  save() {
    try {
      this.state.lastUpdated = new Date().toISOString();
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
    } catch (error) {
      log(`Error saving state: ${error.message}`, 'error');
    }
  }

  start(assets) {
    this.state.startedAt = new Date().toISOString();
    this.state.pending = assets.map(a => a.id);
    this.state.completed = [];
    this.state.failed = [];
    this.state.currentSession = {
      totalAssets: assets.length,
      totalBytes: assets.reduce((sum, a) => sum + (a.size || 0), 0),
    };
    this.save();
  }

  markCompleted(assetId) {
    this.state.completed.push(assetId);
    this.state.pending = this.state.pending.filter(id => id !== assetId);
    this.save();
  }

  markFailed(assetId, error) {
    this.state.failed.push({ id: assetId, error, timestamp: new Date().toISOString() });
    this.state.pending = this.state.pending.filter(id => id !== assetId);
    this.save();
  }

  getPending() {
    return this.state.pending;
  }

  getStats() {
    return {
      completed: this.state.completed.length,
      failed: this.state.failed.length,
      pending: this.state.pending.length,
      total: this.state.completed.length + this.state.failed.length + this.state.pending.length,
    };
  }

  clear() {
    if (fs.existsSync(this.stateFile)) {
      fs.unlinkSync(this.stateFile);
    }
    this.state = {
      startedAt: null,
      lastUpdated: null,
      completed: [],
      failed: [],
      pending: [],
      currentSession: null,
    };
  }
}

// ============================================================================
// ENVATO API (Simulated - replace with real API calls)
// ============================================================================

class EnvatoClient {
  constructor(email, password, token) {
    this.email = email;
    this.password = password;
    this.token = token;
    this.authenticated = false;
    this.sessionToken = null;
  }

  async authenticate() {
    log('Authenticating with Envato Elements...', 'info');
    
    // Simulate authentication delay
    await new Promise(r => setTimeout(r, 1500));
    
    // In real implementation, this would call Envato's OAuth API
    if (this.token) {
      this.sessionToken = this.token;
      this.authenticated = true;
      log('Authenticated with API token', 'success');
      return true;
    }
    
    if (this.email && this.password) {
      // Simulate successful authentication
      this.sessionToken = 'session_' + Date.now();
      this.authenticated = true;
      log(`Authenticated as ${this.email}`, 'success');
      return true;
    }
    
    throw new Error('No valid credentials provided');
  }

  async getDownloadUrl(assetId) {
    if (!this.authenticated) {
      throw new Error('Not authenticated');
    }
    
    // In real implementation, this would call Envato's download API
    // For simulation, we'll return a placeholder URL
    // The actual URL would be obtained from Envato Elements API
    
    // Simulate API call delay
    await new Promise(r => setTimeout(r, 200));
    
    // Return simulated download URL (in reality, this comes from Envato API)
    return `https://elements-api.envato.com/download/${assetId}?token=${this.sessionToken}`;
  }

  async downloadFile(url, outputPath, onProgress) {
    return new Promise((resolve, reject) => {
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Simulate download with fake data for demo
      // In real implementation, this would download from the actual URL
      const fakeSize = 1000000 + Math.random() * 5000000; // 1-6 MB
      let downloaded = 0;
      const chunkSize = 100000;
      
      const interval = setInterval(() => {
        downloaded += chunkSize;
        if (onProgress) {
          onProgress(Math.min(downloaded, fakeSize), fakeSize);
        }
        
        if (downloaded >= fakeSize) {
          clearInterval(interval);
          
          // Create a placeholder file
          fs.writeFileSync(outputPath, `# Placeholder for ${path.basename(outputPath)}\n# This file would be downloaded from Envato Elements\n# Size: ${formatBytes(fakeSize)}\n`);
          
          resolve({
            size: fakeSize,
            path: outputPath,
          });
        }
      }, 50);
    });
  }
}

// ============================================================================
// DOWNLOAD MANAGER
// ============================================================================

class DownloadManager {
  constructor(options) {
    this.options = options;
    this.client = new EnvatoClient(options.email, options.password, options.token);
    this.state = new DownloadState(CONFIG.stateFile);
    this.stats = {
      downloaded: 0,
      failed: 0,
      skipped: 0,
      totalBytes: 0,
      startTime: null,
    };
  }

  getAssetsToDownload() {
    const categories = this.options.all 
      ? Object.keys(ENVATO_ASSET_MAP)
      : [this.options.category];
    
    const assets = [];
    for (const cat of categories) {
      if (ENVATO_ASSET_MAP[cat]) {
        for (const asset of ENVATO_ASSET_MAP[cat]) {
          assets.push({
            ...asset,
            category: cat,
            outputPath: path.join(this.options.output, cat, asset.local),
          });
        }
      } else {
        log(`Unknown category: ${cat}`, 'warn');
      }
    }
    
    return assets;
  }

  filterExisting(assets) {
    if (!this.options.skipExisting) return assets;
    
    return assets.filter(asset => {
      const exists = fs.existsSync(asset.outputPath);
      if (exists && this.options.verbose) {
        log(`Skipping existing: ${asset.local}`, 'debug');
      }
      return !exists;
    });
  }

  async downloadAsset(asset, index, total) {
    const label = `[${String(index + 1).padStart(String(total).length, ' ')}/${total}]`;
    
    try {
      if (this.options.verbose) {
        log(`${label} Getting download URL for ${asset.envato}...`, 'debug');
      }
      
      const downloadUrl = await this.client.getDownloadUrl(asset.id);
      
      const progress = new ProgressBar(asset.size || 1000000, `${label} ${asset.local}`);
      
      const result = await this.client.downloadFile(
        downloadUrl, 
        asset.outputPath,
        (downloaded, total) => progress.update(downloaded)
      );
      
      progress.finish(`${colors.green}✓${colors.reset} ${formatBytes(result.size)}`);
      
      this.stats.downloaded++;
      this.stats.totalBytes += result.size;
      this.state.markCompleted(asset.id);
      
      return { success: true, asset, result };
    } catch (error) {
      console.log(`\r${label} ${colors.red}✗${colors.reset} ${asset.local}: ${error.message}            `);
      
      this.stats.failed++;
      this.state.markFailed(asset.id, error.message);
      
      return { success: false, asset, error };
    }
  }

  async run() {
    console.log(`\n${colors.bright}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}║${colors.reset}        ${colors.bright}TAM-TAM Envato Asset Downloader${colors.reset}                  ${colors.bright}${colors.cyan}║${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    this.stats.startTime = Date.now();

    // Resume mode
    if (this.options.resume) {
      if (!this.state.load()) {
        log('No previous download session found', 'error');
        process.exit(1);
      }
      
      const stats = this.state.getStats();
      log(`Resuming download: ${stats.completed} completed, ${stats.pending} pending, ${stats.failed} failed`, 'info');
      
      if (stats.pending === 0) {
        log('All downloads already completed', 'success');
        process.exit(0);
      }
    }

    // Authenticate
    try {
      await this.client.authenticate();
    } catch (error) {
      log(`Authentication failed: ${error.message}`, 'error');
      process.exit(1);
    }

    // Get assets
    let assets = this.getAssetsToDownload();
    
    if (this.options.resume) {
      const pendingIds = this.state.getPending();
      assets = assets.filter(a => pendingIds.includes(a.id));
    }
    
    assets = this.filterExisting(assets);
    
    if (assets.length === 0) {
      log('No assets to download', 'info');
      process.exit(0);
    }

    // Dry run
    if (this.options.dryRun) {
      console.log(`\n${colors.bright}Assets to download:${colors.reset}\n`);
      for (const asset of assets) {
        console.log(`  ${colors.cyan}•${colors.reset} [${asset.category}] ${asset.local}`);
        console.log(`    ${colors.dim}${asset.envato} (${formatBytes(asset.size || 0)})${colors.reset}`);
      }
      const totalSize = assets.reduce((sum, a) => sum + (a.size || 0), 0);
      console.log(`\n  ${colors.bright}Total: ${assets.length} assets (${formatBytes(totalSize)})${colors.reset}\n`);
      process.exit(0);
    }

    // Initialize state
    if (!this.options.resume) {
      this.state.start(assets);
    }

    // Show download plan
    const totalSize = assets.reduce((sum, a) => sum + (a.size || 0), 0);
    console.log(`${colors.bright}Download Plan:${colors.reset}`);
    console.log(`  • Assets: ${assets.length}`);
    console.log(`  • Total size: ${formatBytes(totalSize)}`);
    console.log(`  • Parallel downloads: ${this.options.parallel}`);
    console.log(`  • Output: ${this.options.output}`);
    console.log(`  • Optimize: ${this.options.optimize ? 'Yes' : 'No'}`);
    console.log('');

    // Download in parallel batches
    const results = [];
    for (let i = 0; i < assets.length; i += this.options.parallel) {
      const batch = assets.slice(i, i + this.options.parallel);
      const batchResults = await Promise.all(
        batch.map((asset, j) => this.downloadAsset(asset, i + j, assets.length))
      );
      results.push(...batchResults);
    }

    // Optimize if requested
    if (this.options.optimize) {
      console.log('');
      log('Optimizing downloaded assets...', 'info');
      // In real implementation, this would run ffmpeg/imagemagick
      await new Promise(r => setTimeout(r, 2000));
      log('Optimization complete', 'success');
    }

    // Summary
    const duration = Date.now() - this.stats.startTime;
    console.log('');
    console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}                         SUMMARY${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`);
    console.log('');
    
    if (this.stats.failed === 0) {
      console.log(`  ${colors.green}✓${colors.reset} ${colors.bright}Completed: ${this.stats.downloaded}/${assets.length} assets downloaded${colors.reset}`);
    } else {
      console.log(`  ${colors.yellow}⚠${colors.reset} ${colors.bright}Completed with errors${colors.reset}`);
      console.log(`    ${colors.green}•${colors.reset} Downloaded: ${this.stats.downloaded}`);
      console.log(`    ${colors.red}•${colors.reset} Failed: ${this.stats.failed}`);
      console.log(`    ${colors.dim}•${colors.reset} Skipped: ${this.stats.skipped}`);
    }
    
    console.log(`  ${colors.dim}•${colors.reset} Total size: ${formatBytes(this.stats.totalBytes)}`);
    console.log(`  ${colors.dim}•${colors.reset} Duration: ${formatDuration(duration)}`);
    console.log(`  ${colors.dim}•${colors.reset} Avg speed: ${formatBytes(this.stats.totalBytes / (duration / 1000))}/s`);
    console.log('');

    // Show failed assets
    if (this.stats.failed > 0) {
      console.log(`${colors.red}Failed downloads:${colors.reset}`);
      for (const item of this.state.state.failed) {
        console.log(`  ${colors.red}•${colors.reset} ${item.id}: ${item.error}`);
      }
      console.log('');
      console.log(`${colors.dim}Run with --resume to retry failed downloads${colors.reset}`);
    } else {
      // Clear state file on success
      this.state.clear();
    }

    console.log('');
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  // Validate arguments
  if (!args.resume) {
    if (!args.email && !args.token) {
      log('Error: --email or --token is required', 'error');
      log('Use --help for usage information', 'info');
      process.exit(1);
    }

    if (!args.category && !args.all) {
      log('Error: --category=<name> or --all is required', 'error');
      log(`Available categories: ${Object.keys(ENVATO_ASSET_MAP).join(', ')}`, 'info');
      process.exit(1);
    }
  }

  // Handle interrupts
  process.on('SIGINT', () => {
    console.log('\n');
    log('Download interrupted. Run with --resume to continue.', 'warn');
    process.exit(1);
  });

  // Run downloader
  const manager = new DownloadManager(args);
  await manager.run();
}

main().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  if (process.env.DEBUG) {
    console.error(error);
  }
  process.exit(1);
});
