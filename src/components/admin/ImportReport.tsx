import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';

interface ImportReportProps {
  report: {
    total: number;
    imported: number;
    skipped: number;
    duplicates: number;
    errors: number;
    source: string;
    type: string;
    timestamp: string;
  };
}

export function ImportReport({ report }: ImportReportProps) {
  const successRate = ((report.imported / report.total) * 100).toFixed(1);
  
  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Rapport d'Import Détaillé
            </CardTitle>
            <CardDescription>
              Import effectué le {new Date(report.timestamp).toLocaleString('fr-FR')}
            </CardDescription>
          </div>
          <Badge variant={report.imported > 0 ? "default" : "destructive"}>
            {successRate}% Succès
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex flex-col p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Total Analysé</div>
            <div className="text-2xl font-bold">{report.total.toLocaleString()}</div>
          </div>
          
          <div className="flex flex-col p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-1 text-sm text-green-700 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              Importés
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {report.imported.toLocaleString()}
            </div>
          </div>
          
          <div className="flex flex-col p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center gap-1 text-sm text-yellow-700 dark:text-yellow-400">
              <AlertCircle className="h-4 w-4" />
              Ignorés
            </div>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
              {report.skipped.toLocaleString()}
            </div>
          </div>
          
          <div className="flex flex-col p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="text-sm text-blue-700 dark:text-blue-400">Doublons</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {report.duplicates.toLocaleString()}
            </div>
          </div>
          
          {report.errors > 0 && (
            <div className="flex flex-col p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-1 text-sm text-red-700 dark:text-red-400">
                <XCircle className="h-4 w-4" />
                Erreurs
              </div>
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                {report.errors.toLocaleString()}
              </div>
            </div>
          )}
          
          <div className="flex flex-col p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">Type</div>
            <div className="text-xl font-semibold capitalize">{report.type}</div>
          </div>
        </div>
        
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-sm font-medium mb-1">Source d'Import</div>
          <code className="text-xs text-muted-foreground">{report.source}</code>
        </div>
      </CardContent>
    </Card>
  );
}
