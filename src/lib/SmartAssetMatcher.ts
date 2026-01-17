/**
 * SmartAssetMatcher - Système intelligent de matching d'assets
 * 
 * Analyse sémantique, auto-matching avec confiance, apprentissage,
 * règles personnalisées et résolution de conflits
 */

import { ENVATO_ASSET_MAP, EnvatoAssetMapping } from './EnvatoDownloader';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface MatchResult {
  localPath: string;
  localName: string;
  category: string;
  confidence: number;
  matchReasons: string[];
  alternativeMatches: AlternativeMatch[];
  metadata: FileMetadata;
}

export interface AlternativeMatch {
  localPath: string;
  localName: string;
  confidence: number;
  reasons: string[];
}

export interface BulkMatchResult {
  matches: BulkFileMatch[];
  conflicts: ConflictInfo[];
  unmatched: UnmatchedFile[];
  stats: MatchingStats;
}

export interface BulkFileMatch {
  file: File;
  fileName: string;
  bestMatch: MatchResult | null;
  status: 'matched' | 'conflict' | 'unmatched' | 'manual';
  userSelection?: string;
}

export interface ConflictInfo {
  file: File;
  fileName: string;
  possibleMatches: MatchResult[];
  recommendation: MatchResult | null;
  resolved: boolean;
  resolution?: string;
}

export interface UnmatchedFile {
  file: File;
  fileName: string;
  reason: string;
  suggestedCategory?: string;
}

export interface MatchingStats {
  totalFiles: number;
  autoMatched: number;
  conflicts: number;
  unmatched: number;
  averageConfidence: number;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  extension: string;
  keywords: string[];
  detectedCategory: string | null;
  resolution?: { width: number; height: number };
  duration?: number;
  hasAlpha?: boolean;
  dominantColor?: string;
}

export interface MatchingRule {
  id: string;
  name: string;
  description: string;
  priority: number;
  condition: RuleCondition;
  action: RuleAction;
  enabled: boolean;
  createdAt: Date;
  usageCount: number;
}

export interface RuleCondition {
  type: 'keyword' | 'extension' | 'author' | 'size' | 'resolution' | 'regex' | 'combined';
  value: string | string[] | RegExp | CombinedCondition;
  operator?: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan';
}

export interface CombinedCondition {
  logic: 'AND' | 'OR';
  conditions: RuleCondition[];
}

export interface RuleAction {
  type: 'assignCategory' | 'assignSlot' | 'setPriority' | 'skip' | 'transform';
  value: string;
  transformFn?: (filename: string) => string;
}

export interface MatchingRules {
  version: string;
  exportedAt: Date;
  rules: MatchingRule[];
  learnedAssociations: LearnedAssociation[];
}

export interface LearnedAssociation {
  pattern: string;
  targetPath: string;
  confidence: number;
  usageCount: number;
  lastUsed: Date;
}

export interface VisualAnalysis {
  dominantColors: string[];
  brightness: number;
  hasTransparency: boolean;
  motionIntensity?: number;
  sceneType?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'light-leak': ['light', 'leak', 'flare', 'glow', 'bokeh', 'anamorphic', 'lens', 'optical', 'cinematic', 'film'],
  'particles': ['particle', 'dust', 'smoke', 'fog', 'mist', 'floating', 'sparkle', 'glitter', 'ember', 'ash'],
  'transitions': ['transition', 'wipe', 'slide', 'zoom', 'fade', 'swipe', 'morph', 'dissolve'],
  'textures': ['texture', 'grain', 'noise', 'overlay', 'grunge', 'scratch', 'vintage', 'film-grain'],
  'lens-flare': ['lens', 'flare', 'sun', 'bright', 'rainbow', 'prismatic', 'optical'],
  'audio': ['music', 'sound', 'sfx', 'audio', 'beat', 'drum', 'percussion', 'ambient', 'loop'],
  '3d-models': ['3d', 'model', 'gltf', 'glb', 'mesh', 'object', 'character', 'prop'],
  'fonts': ['font', 'typeface', 'typography', 'type', 'lettering']
};

const QUALITY_KEYWORDS: Record<string, number> = {
  '4k': 1.2,
  'uhd': 1.2,
  '2160': 1.2,
  'hd': 1.0,
  '1080': 1.0,
  'alpha': 1.3,
  'transparent': 1.3,
  'prores': 1.1,
  'premium': 1.1,
  'pro': 1.05,
  'cinematic': 1.1
};

const EXTENSION_CATEGORIES: Record<string, string[]> = {
  'video': ['mp4', 'mov', 'webm', 'avi', 'mkv', 'prores'],
  'image': ['png', 'jpg', 'jpeg', 'webp', 'tiff', 'exr'],
  'audio': ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac'],
  '3d': ['glb', 'gltf', 'obj', 'fbx', 'blend'],
  'font': ['ttf', 'otf', 'woff', 'woff2']
};

const STORAGE_KEY = 'tamtam_smart_matcher_rules';
const LEARNED_KEY = 'tamtam_learned_associations';

// ============================================================================
// SMART ASSET MATCHER CLASS
// ============================================================================

export class SmartAssetMatcher {
  private rules: MatchingRule[] = [];
  private learnedAssociations: LearnedAssociation[] = [];
  private assetMap: Map<string, EnvatoAssetMapping> = new Map();
  private categorySlots: Map<string, string[]> = new Map();

  constructor() {
    this.initializeAssetMap();
    this.loadRules();
    this.loadLearnedAssociations();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  private initializeAssetMap(): void {
    // Build asset map from ENVATO_ASSET_MAP
    Object.entries(ENVATO_ASSET_MAP).forEach(([category, assets]) => {
      if (!this.categorySlots.has(category)) {
        this.categorySlots.set(category, []);
      }
      
      assets.forEach((asset: EnvatoAssetMapping) => {
        this.assetMap.set(asset.local, asset);
        this.categorySlots.get(category)!.push(asset.local);
      });
    });
  }

  private loadRules(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.rules = parsed.map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt)
        }));
      } else {
        this.rules = this.getDefaultRules();
      }
    } catch {
      this.rules = this.getDefaultRules();
    }
  }

  private loadLearnedAssociations(): void {
    try {
      const stored = localStorage.getItem(LEARNED_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.learnedAssociations = parsed.map((a: any) => ({
          ...a,
          lastUsed: new Date(a.lastUsed)
        }));
      }
    } catch {
      this.learnedAssociations = [];
    }
  }

  private saveRules(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.rules));
  }

  private saveLearnedAssociations(): void {
    localStorage.setItem(LEARNED_KEY, JSON.stringify(this.learnedAssociations));
  }

  private getDefaultRules(): MatchingRule[] {
    return [
      {
        id: 'rule-bokeh-particles',
        name: 'Bokeh to Particles',
        description: 'Files containing "bokeh" go to particles category',
        priority: 10,
        condition: { type: 'keyword', value: 'bokeh', operator: 'contains' },
        action: { type: 'assignCategory', value: 'particles' },
        enabled: true,
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'rule-mov-alpha',
        name: 'MOV with Alpha to Light Leaks',
        description: 'MOV files with alpha channel go to light-leak category',
        priority: 8,
        condition: {
          type: 'combined',
          value: {
            logic: 'AND',
            conditions: [
              { type: 'extension', value: 'mov', operator: 'equals' },
              { type: 'keyword', value: 'alpha', operator: 'contains' }
            ]
          }
        },
        action: { type: 'assignCategory', value: 'light-leak' },
        enabled: true,
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'rule-dust-particles',
        name: 'Dust/Smoke to Particles',
        description: 'Files with dust, smoke, or fog keywords',
        priority: 9,
        condition: { type: 'keyword', value: ['dust', 'smoke', 'fog'], operator: 'contains' },
        action: { type: 'assignCategory', value: 'particles' },
        enabled: true,
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'rule-transition-wipe',
        name: 'Wipe/Slide to Transitions',
        description: 'Files with transition keywords',
        priority: 9,
        condition: { type: 'keyword', value: ['wipe', 'slide', 'transition', 'swipe'], operator: 'contains' },
        action: { type: 'assignCategory', value: 'transitions' },
        enabled: true,
        createdAt: new Date(),
        usageCount: 0
      },
      {
        id: 'rule-audio-music',
        name: 'Audio Files',
        description: 'Audio extensions go to audio category',
        priority: 10,
        condition: { type: 'extension', value: ['mp3', 'wav', 'ogg', 'm4a'], operator: 'equals' },
        action: { type: 'assignCategory', value: 'audio' },
        enabled: true,
        createdAt: new Date(),
        usageCount: 0
      }
    ];
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Match a single file to the best local asset slot
   */
  async matchFile(file: File): Promise<MatchResult[]> {
    const metadata = await this.extractMetadata(file);
    const matches = this.findMatches(metadata);
    
    // Sort by confidence
    matches.sort((a, b) => b.confidence - a.confidence);
    
    return matches;
  }

  /**
   * Match multiple files in bulk
   */
  async matchBulk(files: File[]): Promise<BulkMatchResult> {
    const matches: BulkFileMatch[] = [];
    const conflicts: ConflictInfo[] = [];
    const unmatched: UnmatchedFile[] = [];
    const usedSlots = new Set<string>();
    
    let totalConfidence = 0;
    let matchedCount = 0;

    for (const file of files) {
      const fileMatches = await this.matchFile(file);
      
      if (fileMatches.length === 0) {
        unmatched.push({
          file,
          fileName: file.name,
          reason: 'No matching asset slot found',
          suggestedCategory: this.suggestCategory(file.name)
        });
      } else {
        // Filter out already used slots
        const availableMatches = fileMatches.filter(m => !usedSlots.has(m.localPath));
        
        if (availableMatches.length === 0) {
          unmatched.push({
            file,
            fileName: file.name,
            reason: 'All matching slots already assigned'
          });
        } else if (availableMatches.length === 1 || availableMatches[0].confidence > 0.85) {
          // Clear winner
          const bestMatch = availableMatches[0];
          usedSlots.add(bestMatch.localPath);
          matches.push({
            file,
            fileName: file.name,
            bestMatch,
            status: 'matched'
          });
          totalConfidence += bestMatch.confidence;
          matchedCount++;
        } else {
          // Multiple possible matches - conflict
          const recommendation = this.resolveConflict(availableMatches, file.name);
          conflicts.push({
            file,
            fileName: file.name,
            possibleMatches: availableMatches,
            recommendation,
            resolved: false
          });
          matches.push({
            file,
            fileName: file.name,
            bestMatch: recommendation,
            status: 'conflict'
          });
        }
      }
    }

    const stats: MatchingStats = {
      totalFiles: files.length,
      autoMatched: matchedCount,
      conflicts: conflicts.length,
      unmatched: unmatched.length,
      averageConfidence: matchedCount > 0 ? totalConfidence / matchedCount : 0
    };

    return { matches, conflicts, unmatched, stats };
  }

  /**
   * Add a custom matching rule
   */
  addCustomRule(rule: Omit<MatchingRule, 'id' | 'createdAt' | 'usageCount'>): MatchingRule {
    const newRule: MatchingRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      usageCount: 0
    };
    
    this.rules.push(newRule);
    this.rules.sort((a, b) => b.priority - a.priority);
    this.saveRules();
    
    return newRule;
  }

  /**
   * Update an existing rule
   */
  updateRule(ruleId: string, updates: Partial<MatchingRule>): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index === -1) return false;
    
    this.rules[index] = { ...this.rules[index], ...updates };
    this.rules.sort((a, b) => b.priority - a.priority);
    this.saveRules();
    
    return true;
  }

  /**
   * Delete a rule
   */
  deleteRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index === -1) return false;
    
    this.rules.splice(index, 1);
    this.saveRules();
    
    return true;
  }

  /**
   * Get all rules
   */
  getRules(): MatchingRule[] {
    return [...this.rules];
  }

  /**
   * Export all rules and learned associations
   */
  exportRules(): MatchingRules {
    return {
      version: '1.0.0',
      exportedAt: new Date(),
      rules: [...this.rules],
      learnedAssociations: [...this.learnedAssociations]
    };
  }

  /**
   * Import rules and learned associations
   */
  importRules(rules: MatchingRules): { imported: number; skipped: number } {
    let imported = 0;
    let skipped = 0;

    for (const rule of rules.rules) {
      const exists = this.rules.some(r => r.id === rule.id);
      if (!exists) {
        this.rules.push({
          ...rule,
          createdAt: new Date(rule.createdAt)
        });
        imported++;
      } else {
        skipped++;
      }
    }

    for (const association of rules.learnedAssociations) {
      const exists = this.learnedAssociations.some(
        a => a.pattern === association.pattern && a.targetPath === association.targetPath
      );
      if (!exists) {
        this.learnedAssociations.push({
          ...association,
          lastUsed: new Date(association.lastUsed)
        });
        imported++;
      }
    }

    this.saveRules();
    this.saveLearnedAssociations();

    return { imported, skipped };
  }

  /**
   * Learn from user's manual selection
   */
  learnFromSelection(fileName: string, selectedPath: string): void {
    const pattern = this.extractPattern(fileName);
    
    const existingIndex = this.learnedAssociations.findIndex(
      a => a.pattern === pattern
    );

    if (existingIndex !== -1) {
      const existing = this.learnedAssociations[existingIndex];
      if (existing.targetPath === selectedPath) {
        existing.usageCount++;
        existing.confidence = Math.min(1, existing.confidence + 0.05);
        existing.lastUsed = new Date();
      } else {
        // User chose differently, reduce confidence of old association
        existing.confidence = Math.max(0.1, existing.confidence - 0.1);
        // Add new association
        this.learnedAssociations.push({
          pattern,
          targetPath: selectedPath,
          confidence: 0.6,
          usageCount: 1,
          lastUsed: new Date()
        });
      }
    } else {
      this.learnedAssociations.push({
        pattern,
        targetPath: selectedPath,
        confidence: 0.6,
        usageCount: 1,
        lastUsed: new Date()
      });
    }

    this.saveLearnedAssociations();
  }

  /**
   * Get learned associations
   */
  getLearnedAssociations(): LearnedAssociation[] {
    return [...this.learnedAssociations];
  }

  /**
   * Clear all learned associations
   */
  clearLearnedAssociations(): void {
    this.learnedAssociations = [];
    this.saveLearnedAssociations();
  }

  /**
   * Analyze visual content of an image/video (simplified without TensorFlow)
   */
  async analyzeVisualContent(file: File): Promise<VisualAnalysis | null> {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return null;
    }

    try {
      if (file.type.startsWith('image/')) {
        return await this.analyzeImage(file);
      } else {
        return await this.analyzeVideo(file);
      }
    } catch (error) {
      console.error('Visual analysis failed:', error);
      return null;
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private async extractMetadata(file: File): Promise<FileMetadata> {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    const keywords = this.extractKeywords(nameWithoutExt);
    const detectedCategory = this.detectCategory(keywords, extension);

    const metadata: FileMetadata = {
      name: file.name,
      size: file.size,
      type: file.type,
      extension,
      keywords,
      detectedCategory
    };

    // Try to extract resolution for images/videos
    if (file.type.startsWith('image/')) {
      const dimensions = await this.getImageDimensions(file);
      if (dimensions) {
        metadata.resolution = dimensions;
      }
    } else if (file.type.startsWith('video/')) {
      const videoInfo = await this.getVideoInfo(file);
      if (videoInfo) {
        metadata.resolution = videoInfo.resolution;
        metadata.duration = videoInfo.duration;
      }
    }

    // Check for alpha channel indicators
    metadata.hasAlpha = this.hasAlphaIndicator(file.name, file.type);

    return metadata;
  }

  private extractKeywords(filename: string): string[] {
    // Normalize filename
    const normalized = filename
      .toLowerCase()
      .replace(/[_-]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\d+/g, ' $& ');

    // Split into words
    const words = normalized.split(/\s+/).filter(w => w.length > 1);

    // Add common variations
    const expanded: string[] = [...words];
    
    // Handle compound words
    if (words.includes('light') && words.includes('leak')) {
      expanded.push('light-leak', 'lightleak');
    }
    if (words.includes('lens') && words.includes('flare')) {
      expanded.push('lens-flare', 'lensflare');
    }

    return [...new Set(expanded)];
  }

  private detectCategory(keywords: string[], extension: string): string | null {
    const scores: Record<string, number> = {};

    // Check extension-based category
    for (const [type, extensions] of Object.entries(EXTENSION_CATEGORIES)) {
      if (extensions.includes(extension)) {
        if (type === 'audio') return 'audio';
        if (type === '3d') return '3d-models';
        if (type === 'font') return 'fonts';
      }
    }

    // Score based on keywords
    for (const [category, categoryKeywords] of Object.entries(CATEGORY_KEYWORDS)) {
      scores[category] = 0;
      for (const keyword of keywords) {
        for (const catKeyword of categoryKeywords) {
          if (keyword.includes(catKeyword) || catKeyword.includes(keyword)) {
            scores[category] += keyword === catKeyword ? 2 : 1;
          }
        }
      }
    }

    // Find highest scoring category
    let maxScore = 0;
    let bestCategory: string | null = null;
    for (const [category, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestCategory = category;
      }
    }

    return maxScore >= 2 ? bestCategory : null;
  }

  private findMatches(metadata: FileMetadata): MatchResult[] {
    const matches: MatchResult[] = [];

    // First, check learned associations
    const learnedMatch = this.checkLearnedAssociations(metadata);
    if (learnedMatch) {
      matches.push(learnedMatch);
    }

    // Then, apply custom rules
    const ruleMatches = this.applyRules(metadata);
    matches.push(...ruleMatches);

    // Finally, use keyword matching
    const keywordMatches = this.matchByKeywords(metadata);
    matches.push(...keywordMatches);

    // Deduplicate and merge
    return this.deduplicateMatches(matches);
  }

  private checkLearnedAssociations(metadata: FileMetadata): MatchResult | null {
    const pattern = this.extractPattern(metadata.name);
    
    const associations = this.learnedAssociations
      .filter(a => this.patternMatches(pattern, a.pattern))
      .sort((a, b) => b.confidence - a.confidence);

    if (associations.length > 0 && associations[0].confidence > 0.5) {
      const best = associations[0];
      const assetInfo = this.assetMap.get(best.targetPath);
      
      if (assetInfo) {
        return {
          localPath: best.targetPath,
          localName: best.targetPath.split('/').pop() || '',
          category: best.targetPath.split('/').slice(-2, -1)[0] || 'unknown',
          confidence: best.confidence * 0.95, // Slight penalty for learned matches
          matchReasons: ['Learned from previous selection', `Used ${best.usageCount} times`],
          alternativeMatches: [],
          metadata
        };
      }
    }

    return null;
  }

  private applyRules(metadata: FileMetadata): MatchResult[] {
    const matches: MatchResult[] = [];

    for (const rule of this.rules.filter(r => r.enabled)) {
      if (this.evaluateCondition(rule.condition, metadata)) {
        const result = this.executeRuleAction(rule, metadata);
        if (result) {
          rule.usageCount++;
          matches.push(result);
        }
      }
    }

    this.saveRules();
    return matches;
  }

  private evaluateCondition(condition: RuleCondition, metadata: FileMetadata): boolean {
    switch (condition.type) {
      case 'keyword': {
        const values = Array.isArray(condition.value) ? condition.value : [condition.value as string];
        const nameNormalized = metadata.name.toLowerCase();
        return values.some(v => {
          const val = v.toLowerCase();
          switch (condition.operator) {
            case 'equals': return nameNormalized === val;
            case 'startsWith': return nameNormalized.startsWith(val);
            case 'endsWith': return nameNormalized.endsWith(val);
            case 'contains':
            default: return nameNormalized.includes(val) || metadata.keywords.includes(val);
          }
        });
      }

      case 'extension': {
        const values = Array.isArray(condition.value) ? condition.value : [condition.value as string];
        return values.some(v => metadata.extension === v.toLowerCase());
      }

      case 'size': {
        const sizeVal = parseInt(condition.value as string);
        switch (condition.operator) {
          case 'greaterThan': return metadata.size > sizeVal;
          case 'lessThan': return metadata.size < sizeVal;
          default: return metadata.size === sizeVal;
        }
      }

      case 'regex': {
        const regex = new RegExp(condition.value as string, 'i');
        return regex.test(metadata.name);
      }

      case 'combined': {
        const combined = condition.value as CombinedCondition;
        if (combined.logic === 'AND') {
          return combined.conditions.every(c => this.evaluateCondition(c, metadata));
        } else {
          return combined.conditions.some(c => this.evaluateCondition(c, metadata));
        }
      }

      default:
        return false;
    }
  }

  private executeRuleAction(rule: MatchingRule, metadata: FileMetadata): MatchResult | null {
    switch (rule.action.type) {
      case 'assignCategory': {
        const category = rule.action.value;
        const slots = this.categorySlots.get(category) || [];
        
        if (slots.length > 0) {
          // Find best slot in category
          const bestSlot = this.findBestSlotInCategory(category, metadata);
          if (bestSlot) {
            return {
              localPath: bestSlot,
              localName: bestSlot.split('/').pop() || '',
              category,
              confidence: 0.85,
              matchReasons: [`Rule: ${rule.name}`, `Category: ${category}`],
              alternativeMatches: slots
                .filter(s => s !== bestSlot)
                .slice(0, 3)
                .map(s => ({
                  localPath: s,
                  localName: s.split('/').pop() || '',
                  confidence: 0.7,
                  reasons: ['Same category']
                })),
              metadata
            };
          }
        }
        break;
      }

      case 'assignSlot': {
        const slot = rule.action.value;
        if (this.assetMap.has(slot)) {
          return {
            localPath: slot,
            localName: slot.split('/').pop() || '',
            category: slot.split('/').slice(-2, -1)[0] || 'unknown',
            confidence: 0.95,
            matchReasons: [`Rule: ${rule.name}`, 'Direct slot assignment'],
            alternativeMatches: [],
            metadata
          };
        }
        break;
      }
    }

    return null;
  }

  private matchByKeywords(metadata: FileMetadata): MatchResult[] {
    const results: MatchResult[] = [];
    const category = metadata.detectedCategory;

    if (!category) return results;

    const slots = this.categorySlots.get(category) || [];
    
    for (const slot of slots) {
      const assetInfo = this.assetMap.get(slot);
      if (!assetInfo) continue;

      const score = this.calculateMatchScore(metadata, assetInfo, slot);
      
      if (score > 0.3) {
        results.push({
          localPath: slot,
          localName: slot.split('/').pop() || '',
          category,
          confidence: score,
          matchReasons: this.getMatchReasons(metadata, assetInfo),
          alternativeMatches: [],
          metadata
        });
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateMatchScore(
    metadata: FileMetadata, 
    assetInfo: EnvatoAssetMapping, 
    slot: string
  ): number {
    let score = 0.5; // Base score

    const slotName = slot.split('/').pop() || '';
    const slotKeywords = this.extractKeywords(slotName);
    const envatoKeywords = this.extractKeywords(assetInfo.envato);

    // Keyword overlap
    const allTargetKeywords = [...slotKeywords, ...envatoKeywords];
    const overlap = metadata.keywords.filter(k => 
      allTargetKeywords.some(tk => tk.includes(k) || k.includes(tk))
    ).length;
    score += overlap * 0.1;

    // Quality boost
    for (const [keyword, boost] of Object.entries(QUALITY_KEYWORDS)) {
      if (metadata.keywords.includes(keyword)) {
        score *= boost;
      }
    }

    // Extension match
    const expectedExt = slot.split('.').pop();
    if (metadata.extension === expectedExt) {
      score += 0.1;
    }

    // Resolution match (if available)
    if (metadata.resolution) {
      if (metadata.resolution.width >= 1920 && metadata.resolution.height >= 1080) {
        score += 0.1;
      }
    }

    return Math.min(1, score);
  }

  private getMatchReasons(metadata: FileMetadata, assetInfo: EnvatoAssetMapping): string[] {
    const reasons: string[] = [];
    
    if (metadata.detectedCategory) {
      reasons.push(`Category: ${metadata.detectedCategory}`);
    }
    
    const matchingKeywords = metadata.keywords.filter(k => 
      assetInfo.envato.toLowerCase().includes(k)
    );
    if (matchingKeywords.length > 0) {
      reasons.push(`Keywords: ${matchingKeywords.slice(0, 3).join(', ')}`);
    }

    if (metadata.hasAlpha) {
      reasons.push('Has alpha channel');
    }

    if (metadata.resolution) {
      reasons.push(`Resolution: ${metadata.resolution.width}x${metadata.resolution.height}`);
    }

    return reasons;
  }

  private findBestSlotInCategory(category: string, metadata: FileMetadata): string | null {
    const slots = this.categorySlots.get(category) || [];
    
    let bestSlot: string | null = null;
    let bestScore = 0;

    for (const slot of slots) {
      const assetInfo = this.assetMap.get(slot);
      if (!assetInfo) continue;

      const score = this.calculateMatchScore(metadata, assetInfo, slot);
      if (score > bestScore) {
        bestScore = score;
        bestSlot = slot;
      }
    }

    return bestSlot;
  }

  private resolveConflict(matches: MatchResult[], fileName: string): MatchResult | null {
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];

    // Prioritize by:
    // 1. Confidence score
    // 2. Keyword similarity
    // 3. Quality indicators

    const scored = matches.map(match => {
      let score = match.confidence;
      
      // Boost for exact keyword matches
      const fileKeywords = this.extractKeywords(fileName);
      const slotKeywords = this.extractKeywords(match.localName);
      const exactMatches = fileKeywords.filter(fk => slotKeywords.includes(fk)).length;
      score += exactMatches * 0.1;

      // Boost for quality indicators
      if (fileKeywords.includes('4k') || fileKeywords.includes('uhd')) {
        score += 0.05;
      }

      return { match, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].match;
  }

  private deduplicateMatches(matches: MatchResult[]): MatchResult[] {
    const seen = new Map<string, MatchResult>();

    for (const match of matches) {
      const existing = seen.get(match.localPath);
      if (!existing || match.confidence > existing.confidence) {
        seen.set(match.localPath, match);
      }
    }

    return Array.from(seen.values());
  }

  private extractPattern(filename: string): string {
    // Extract a pattern that can be used for future matching
    return filename
      .toLowerCase()
      .replace(/\d+/g, '#')
      .replace(/[_-]+/g, '-')
      .replace(/\.[^/.]+$/, '');
  }

  private patternMatches(pattern1: string, pattern2: string): boolean {
    // Simple pattern matching
    const normalize = (p: string) => p.replace(/#/g, '').replace(/-+/g, '');
    const n1 = normalize(pattern1);
    const n2 = normalize(pattern2);
    
    return n1.includes(n2) || n2.includes(n1) || 
           this.levenshteinDistance(n1, n2) < Math.max(n1.length, n2.length) * 0.3;
  }

  private levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  private suggestCategory(filename: string): string | undefined {
    const keywords = this.extractKeywords(filename);
    return this.detectCategory(keywords, filename.split('.').pop() || '') || undefined;
  }

  private hasAlphaIndicator(filename: string, mimeType: string): boolean {
    const lowerName = filename.toLowerCase();
    return (
      lowerName.includes('alpha') ||
      lowerName.includes('transparent') ||
      lowerName.includes('prores444') ||
      lowerName.includes('prores4444') ||
      mimeType === 'video/quicktime' ||
      mimeType === 'image/png' ||
      mimeType === 'image/webp'
    );
  }

  private async getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  }

  private async getVideoInfo(file: File): Promise<{ 
    resolution: { width: number; height: number }; 
    duration: number 
  } | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        resolve({
          resolution: { width: video.videoWidth, height: video.videoHeight },
          duration: video.duration
        });
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => resolve(null);
      video.src = URL.createObjectURL(file);
    });
  }

  private async analyzeImage(file: File): Promise<VisualAnalysis> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve({
            dominantColors: [],
            brightness: 0.5,
            hasTransparency: file.type === 'image/png'
          });
          return;
        }

        // Sample a smaller version for performance
        const sampleSize = 100;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const analysis = this.analyzePixelData(imageData.data);

        URL.revokeObjectURL(img.src);
        resolve(analysis);
      };
      img.onerror = () => {
        resolve({
          dominantColors: [],
          brightness: 0.5,
          hasTransparency: false
        });
      };
      img.src = URL.createObjectURL(file);
    });
  }

  private async analyzeVideo(file: File): Promise<VisualAnalysis> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          resolve({
            dominantColors: [],
            brightness: 0.5,
            hasTransparency: false
          });
          return;
        }

        const sampleSize = 100;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        
        // Seek to 25% of the video
        video.currentTime = video.duration * 0.25;
        
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, sampleSize, sampleSize);
          const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
          const analysis = this.analyzePixelData(imageData.data);
          
          URL.revokeObjectURL(video.src);
          resolve({
            ...analysis,
            motionIntensity: 0.5 // Would require frame-by-frame analysis
          });
        };
      };
      
      video.onerror = () => {
        resolve({
          dominantColors: [],
          brightness: 0.5,
          hasTransparency: false
        });
      };
      
      video.src = URL.createObjectURL(file);
    });
  }

  private analyzePixelData(data: Uint8ClampedArray): VisualAnalysis {
    const colorCounts: Record<string, number> = {};
    let totalBrightness = 0;
    let hasTransparency = false;
    let pixelCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a < 255) hasTransparency = true;
      if (a < 128) continue; // Skip mostly transparent pixels

      // Quantize color to reduce unique values
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const colorKey = `${qr},${qg},${qb}`;
      
      colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
      totalBrightness += (r + g + b) / 3;
      pixelCount++;
    }

    // Get top colors
    const sortedColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number);
        return `rgb(${r},${g},${b})`;
      });

    return {
      dominantColors: sortedColors,
      brightness: pixelCount > 0 ? totalBrightness / (pixelCount * 255) : 0.5,
      hasTransparency
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const smartAssetMatcher = new SmartAssetMatcher();
