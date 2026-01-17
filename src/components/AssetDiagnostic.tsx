import { useState, useEffect, useCallback } from "react";
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Folder, FileVideo, FileAudio, FileImage, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AssetCategory {
  id: string;
  name: string;
  path: string;
  expectedCount: number;
  expectedFormats: string[];
  icon: React.ReactNode;
}

interface ScanResult {
  category: string;
  expectedCount: number;
  foundCount: number;
  lfsPointerCount: number;
  realFileCount: number;
  status: "ok" | "partial" | "error";
  files: { name: string; isLfs: boolean }[];
}

const ASSET_CATEGORIES: AssetCategory[] = [
  { id: "lens-flare", name: "Lens Flare", path: "/assets/envato/lens-flare/", expectedCount: 455, expectedFormats: ["PNG"], icon: <FileImage className="h-4 w-4" /> },
  { id: "light-leak", name: "Light Leak", path: "/assets/envato/light-leak/", expectedCount: 17, expectedFormats: ["WebM", "MP4"], icon: <FileVideo className="h-4 w-4" /> },
  { id: "particles", name: "Particles", path: "/assets/envato/particles/", expectedCount: 37, expectedFormats: ["WebM", "MP4"], icon: <FileVideo className="h-4 w-4" /> },
  { id: "transitions", name: "Transitions", path: "/assets/envato/transitions/", expectedCount: 32, expectedFormats: ["MP4"], icon: <FileVideo className="h-4 w-4" /> },
  { id: "textures", name: "Textures", path: "/assets/envato/textures/", expectedCount: 215, expectedFormats: ["PNG", "MP4"], icon: <FileImage className="h-4 w-4" /> },
  { id: "3d-models", name: "3D Models", path: "/assets/envato/3d-models/", expectedCount: 22, expectedFormats: ["GLB"], icon: <Folder className="h-4 w-4" /> },
  { id: "fonts", name: "Fonts", path: "/assets/envato/fonts/", expectedCount: 9, expectedFormats: ["TTF"], icon: <FileType className="h-4 w-4" /> },
  { id: "audio-modern", name: "Audio Modern", path: "/assets/envato/audio/modern/", expectedCount: 10, expectedFormats: ["MP3"], icon: <FileAudio className="h-4 w-4" /> },
  { id: "audio-traditional", name: "Audio Traditional", path: "/assets/envato/audio/traditional/", expectedCount: 8, expectedFormats: ["MP3"], icon: <FileAudio className="h-4 w-4" /> },
  { id: "audio-percussion", name: "Audio Percussion", path: "/assets/envato/audio/percussion/", expectedCount: 8, expectedFormats: ["MP3"], icon: <FileAudio className="h-4 w-4" /> },
];

// Known files per category (for static checking since we can't list directories in browser)
const KNOWN_FILES: Record<string, string[]> = {
  "lens-flare": Array.from({ length: 455 }, (_, i) => `flare-${String(i + 1).padStart(3, '0')}.png`),
  "light-leak": [
    "leak-001.webm", "leak-002.webm", "leak-012.webm", "leak-013.webm", "leak-014.webm",
    "leak-015.webm", "leak-017.webm", "leak-020.webm", "leak-001.mp4", "leak-002.mp4",
    "leak-003.mp4", "leak-004.mp4", "leak-005.mp4", "leak-006.mp4", "leak-007.mp4",
    "leak-008.mp4", "leak-009.mp4"
  ],
  "particles": Array.from({ length: 37 }, (_, i) => `particle-${String(i + 1).padStart(3, '0')}.webm`),
  "transitions": Array.from({ length: 32 }, (_, i) => `transition-${String(i + 1).padStart(3, '0')}.mp4`),
  "textures": [
    ...Array.from({ length: 215 }, (_, i) => `video-${String(i + 1).padStart(3, '0')}.mp4`),
  ],
  "3d-models": Array.from({ length: 22 }, (_, i) => `model-${String(i + 1).padStart(3, '0')}.glb`),
  "fonts": [
    "AfricanSpirit.ttf", "BaribaScript.ttf", "KanembuDisplay.ttf",
    "SahelSans.ttf", "WestAfricaBold.ttf", "ZarmaRegular.ttf",
    "DendiBold.ttf", "FulfuldeLight.ttf", "HausaMedium.ttf"
  ],
  "audio-modern": Array.from({ length: 10 }, (_, i) => `audio-${String(i + 9).padStart(4, '0')}.mp3`),
  "audio-traditional": Array.from({ length: 8 }, (_, i) => `audio-${String(i + 1).padStart(4, '0')}.mp3`),
  "audio-percussion": Array.from({ length: 8 }, (_, i) => `audio-${String(i + 5).padStart(4, '0')}.mp3`),
};

async function checkIfLfsPointer(url: string): Promise<{ exists: boolean; isLfs: boolean }> {
  try {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      return { exists: false, isLfs: false };
    }
    
    // Check content type and size
    const contentType = response.headers.get('content-type') || '';
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    
    // LFS pointers are small text files (usually < 200 bytes)
    if (contentLength > 0 && contentLength < 500 && contentType.includes('text')) {
      const text = await response.text();
      if (text.includes('version https://git-lfs.github.com')) {
        return { exists: true, isLfs: true };
      }
    }
    
    // For binary files, read first few bytes
    if (contentLength < 500) {
      const text = await response.clone().text();
      if (text.startsWith('version https://git-lfs')) {
        return { exists: true, isLfs: true };
      }
    }
    
    return { exists: true, isLfs: false };
  } catch {
    return { exists: false, isLfs: false };
  }
}

export function AssetDiagnostic() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentCategory, setCurrentCategory] = useState("");
  const [results, setResults] = useState<ScanResult[]>([]);

  const runScan = useCallback(async () => {
    setIsScanning(true);
    setScanProgress(0);
    setResults([]);
    
    const newResults: ScanResult[] = [];
    let totalChecked = 0;
    const totalFiles = Object.values(KNOWN_FILES).reduce((sum, arr) => sum + arr.length, 0);
    
    for (const category of ASSET_CATEGORIES) {
      setCurrentCategory(category.name);
      const files = KNOWN_FILES[category.id] || [];
      const categoryResult: ScanResult = {
        category: category.name,
        expectedCount: category.expectedCount,
        foundCount: 0,
        lfsPointerCount: 0,
        realFileCount: 0,
        status: "error",
        files: [],
      };
      
      // Check a sample of files (max 10 per category for speed)
      const sampleSize = Math.min(files.length, 10);
      const sampleIndices = files.length <= 10 
        ? files.map((_, i) => i)
        : [0, 1, 2, Math.floor(files.length / 4), Math.floor(files.length / 2), 
           Math.floor(files.length * 3 / 4), files.length - 3, files.length - 2, files.length - 1,
           Math.floor(Math.random() * files.length)];
      
      for (const idx of sampleIndices.slice(0, sampleSize)) {
        const file = files[idx];
        if (!file) continue;
        
        const url = `${category.path}${file}`;
        const { exists, isLfs } = await checkIfLfsPointer(url);
        
        if (exists) {
          categoryResult.foundCount++;
          if (isLfs) {
            categoryResult.lfsPointerCount++;
          } else {
            categoryResult.realFileCount++;
          }
          categoryResult.files.push({ name: file, isLfs });
        }
        
        totalChecked++;
        setScanProgress(Math.round((totalChecked / (ASSET_CATEGORIES.length * sampleSize)) * 100));
      }
      
      // Extrapolate to full count
      if (categoryResult.files.length > 0) {
        const realRatio = categoryResult.realFileCount / categoryResult.files.length;
        const lfsRatio = categoryResult.lfsPointerCount / categoryResult.files.length;
        
        categoryResult.foundCount = Math.round(files.length * (categoryResult.foundCount / sampleSize));
        categoryResult.realFileCount = Math.round(files.length * realRatio);
        categoryResult.lfsPointerCount = Math.round(files.length * lfsRatio);
      }
      
      // Determine status
      if (categoryResult.realFileCount >= categoryResult.expectedCount * 0.9) {
        categoryResult.status = "ok";
      } else if (categoryResult.realFileCount > 0) {
        categoryResult.status = "partial";
      } else {
        categoryResult.status = "error";
      }
      
      newResults.push(categoryResult);
    }
    
    setResults(newResults);
    setCurrentCategory("");
    setIsScanning(false);
    setScanProgress(100);
  }, []);

  useEffect(() => {
    runScan();
  }, [runScan]);

  const getStatusBadge = (status: ScanResult["status"]) => {
    switch (status) {
      case "ok":
        return (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            OK
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Partiel
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            LFS
          </Badge>
        );
    }
  };

  const getProgressColor = (result: ScanResult) => {
    const percentage = (result.realFileCount / result.expectedCount) * 100;
    if (percentage >= 90) return "bg-green-500";
    if (percentage >= 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  const totalExpected = ASSET_CATEGORIES.reduce((sum, cat) => sum + cat.expectedCount, 0);
  const totalReal = results.reduce((sum, r) => sum + r.realFileCount, 0);
  const totalLfs = results.reduce((sum, r) => sum + r.lfsPointerCount, 0);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Diagnostic des Assets</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Vérification des fichiers dans public/assets/envato/
          </p>
        </div>
        <Button 
          onClick={runScan} 
          disabled={isScanning}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scan en cours...' : 'Re-scan'}
        </Button>
      </div>

      {/* Global Progress */}
      {isScanning && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Scan: {currentCategory}</span>
            <span className="font-medium">{scanProgress}%</span>
          </div>
          <Progress value={scanProgress} className="h-2" />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Attendu</div>
          <div className="text-2xl font-bold text-foreground">{totalExpected}</div>
          <div className="text-xs text-muted-foreground">fichiers</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Réels (OK)</div>
          <div className="text-2xl font-bold text-green-600">{totalReal}</div>
          <div className="text-xs text-green-600/70">binaires valides</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">LFS Pointeurs</div>
          <div className="text-2xl font-bold text-red-600">{totalLfs}</div>
          <div className="text-xs text-red-600/70">à remplacer</div>
        </div>
      </div>

      {/* Results Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Catégorie</TableHead>
              <TableHead className="text-center font-semibold">Attendu</TableHead>
              <TableHead className="text-center font-semibold">Trouvé</TableHead>
              <TableHead className="text-center font-semibold">LFS</TableHead>
              <TableHead className="font-semibold">Progression</TableHead>
              <TableHead className="text-center font-semibold">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {isScanning ? 'Analyse en cours...' : 'Aucun résultat'}
                </TableCell>
              </TableRow>
            ) : (
              results.map((result) => {
                const category = ASSET_CATEGORIES.find(c => c.name === result.category);
                const percentage = Math.round((result.realFileCount / result.expectedCount) * 100);
                
                return (
                  <TableRow key={result.category}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {category?.icon}
                        <span className="font-medium">{result.category}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{result.expectedCount}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-green-600 font-medium">{result.realFileCount}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={result.lfsPointerCount > 0 ? "text-red-600 font-medium" : "text-muted-foreground"}>
                        {result.lfsPointerCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${getProgressColor(result)}`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {percentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(result.status)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>OK (≥90%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span>Partiel (30-90%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>LFS/Manquant (&lt;30%)</span>
        </div>
      </div>
    </div>
  );
}
