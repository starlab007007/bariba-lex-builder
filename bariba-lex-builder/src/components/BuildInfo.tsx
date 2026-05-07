/**
 * BuildInfo - Displays build version info for production verification
 * Shows commit SHA and build time to verify deployment sync
 */

const BUILD_SHA = import.meta.env.VITE_BUILD_SHA || 'dev';
const BUILD_TIME = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();

interface BuildInfoProps {
  className?: string;
  minimal?: boolean;
}

export const BuildInfo = ({ className = '', minimal = false }: BuildInfoProps) => {
  const shortSha = BUILD_SHA.slice(0, 7);
  
  if (minimal) {
    return (
      <span className={`text-xs text-muted-foreground font-mono ${className}`}>
        v{shortSha}
      </span>
    );
  }

  return (
    <div className={`text-xs text-muted-foreground font-mono space-y-0.5 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground/60">Build:</span>
        <span className="font-semibold">{shortSha}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground/60">Time:</span>
        <span>{new Date(BUILD_TIME).toLocaleString('fr-FR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })}</span>
      </div>
    </div>
  );
};

export const getBuildInfo = () => ({
  sha: BUILD_SHA,
  shortSha: BUILD_SHA.slice(0, 7),
  time: BUILD_TIME,
  isDev: BUILD_SHA === 'dev'
});
