// src/components/templates/OneTakePro/config.ts

/**
 * Configuration One-Take Pro Ultra
 * 
 * Modifiez ces valeurs pour ajuster le comportement des effets
 */

export const EFFECT_CONFIG = {
  /**
   * Seuils de déclenchement des effets (0-1)
   */
  thresholds: {
    lensFlare: 0.6,      // Beat doit être >= 0.6 pour lens flare
    lightLeak: 0.8,      // Beat doit être >= 0.8 pour light leak
    lightLeakChance: 0.3 // 30% de chance sur beats forts
  },
  
  /**
   * Durées des effets (millisecondes)
   */
  durations: {
    lensFlare: {
      min: 500,
      max: 800,
      fadeOut: 0.6
    },
    throttle: 250
  },
  
  /**
   * Opacités (0-1)
   */
  opacities: {
    lensFlare: {
      min: 0.5,
      max: 0.9
    },
    lightLeak: {
      base: 0.6,
      boost: 0.2
    },
    smoke: 0.3,
    fire: 0.4
  },
  
  /**
   * Échelles/tailles
   */
  scales: {
    lensFlare: {
      min: 0.6,
      max: 1.1,
      width: 0.4
    },
    smoke: {
      height: 300
    },
    fire: {
      height: 250
    }
  },
  
  /**
   * Positions des effets
   */
  positions: {
    lensFlare: {
      x: { min: 0.6, max: 0.9 },
      y: { min: 0.05, max: 0.25 }
    },
    smoke: {
      bottom: 300
    },
    fire: {
      bottom: 250
    }
  },
  
  /**
   * Vitesses d'animation
   */
  fadeSpeed: {
    lensFlare: {
      fadeIn: 0.08,
      fadeOut: 0.06
    },
    lightLeak: {
      fadeIn: 0.08,
      fadeOut: 0.06
    },
    continuous: {
      fadeIn: 0.02
    }
  },
  
  /**
   * Blend modes
   */
  blendModes: {
    lensFlare: 'screen',
    lightLeak: 'screen',
    smoke: 'multiply',
    fire: 'screen'
  },
  
  /**
   * Effets continus
   */
  continuous: {
    smoke: {
      enabled: false,
      opacity: 0.3
    },
    fire: {
      enabled: false,
      opacity: 0.4
    }
  }
};

/**
 * Profils prédéfinis
 */
export const PRESET_PROFILES = {
  subtle: {
    thresholds: {
      lensFlare: 0.7,
      lightLeak: 0.9,
      lightLeakChance: 0.2
    },
    opacities: {
      lensFlare: { min: 0.3, max: 0.6 },
      lightLeak: { base: 0.4, boost: 0.1 }
    }
  },
  
  intense: {
    thresholds: {
      lensFlare: 0.5,
      lightLeak: 0.7,
      lightLeakChance: 0.5
    },
    opacities: {
      lensFlare: { min: 0.7, max: 1.0 },
      lightLeak: { base: 0.8, boost: 0.2 }
    }
  },
  
  epic: {
    thresholds: {
      lensFlare: 0.4,
      lightLeak: 0.6,
      lightLeakChance: 0.7
    },
    opacities: {
      lensFlare: { min: 0.8, max: 1.0 },
      lightLeak: { base: 0.9, boost: 0.1 }
    },
    continuous: {
      smoke: { enabled: true, opacity: 0.4 },
      fire: { enabled: true, opacity: 0.5 }
    }
  }
};

/**
 * Appliquer un profil prédéfini
 */
export function applyPreset(presetName: keyof typeof PRESET_PROFILES): void {
  const preset = PRESET_PROFILES[presetName];
  Object.assign(EFFECT_CONFIG, preset);
  console.log(`✅ Profil "${presetName}" appliqué`);
}
