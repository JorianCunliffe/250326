// config-manager.js
// Manages user configuration storage and retrieval

class ConfigManager {
    constructor() {
      // Default configuration schema
      this.configSchema = {
        name: { type: 'string', default: '' },
        birthdate: { type: 'date', default: null },
        personalInfo: { type: 'string', default: '' },
        prompts: { type: 'array', default: [] },
        browserUuid: { type: 'string', default: crypto.randomUUID() }
      };
      
      // Current configuration
      this.config = this.getDefaults();
      
      // Initialization status
      this.initialized = false;
      
      // Storage key
      this.storageKey = 'trilliumConfig';
      
      // Event callbacks
      this.onUpdate = null;
    }
    
    /**
     * Initialize the configuration manager
     * @param {Function} onUpdate - Callback for config updates
     * @returns {Promise<ConfigManager>} The manager instance for chaining
     */
    async initialize(onUpdate = null) {
      try {
        // Set update callback if provided
        if (onUpdate && typeof onUpdate === 'function') {
          this.onUpdate = onUpdate;
        }
        
        // Load from storage or set defaults
        const stored = await chrome.storage.local.get(this.storageKey);
        
        if (stored[this.storageKey]) {
          this.config = this.validateConfig(stored[this.storageKey]);
        } else {
          // First-time setup - create a new UUID
          this.config.browserUuid = crypto.randomUUID();
          await this.saveConfig(this.config);
        }
        
        this.initialized = true;
        
        // Set up storage change listener
        chrome.storage.onChanged.addListener(this.handleStorageChange.bind(this));
        
        return this;
      } catch (error) {
        console.error('Failed to initialize config:', error);
        return this;
      }
    }
    
    /**
     * Validate and sanitize a configuration object
     * @param {Object} config - The configuration to validate
     * @returns {Object} Validated configuration
     */
    validateConfig(config) {
      const validated = {};
      
      // Go through each field in the schema
      Object.keys(this.configSchema).forEach(key => {
        const field = this.configSchema[key];
        
        // If field exists in the config
        if (key in config) {
          const value = config[key];
          
          // Type validation
          switch (field.type) {
            case 'string':
              validated[key] = typeof value === 'string' ? value : field.default;
              break;
              
            case 'date':
              if (value === null) {
                validated[key] = null;
              } else {
                // Try to parse as date if it's a string
                try {
                  validated[key] = typeof value === 'string' ? new Date(value).toISOString() : 
                                  value instanceof Date ? value.toISOString() : field.default;
                } catch (e) {
                  validated[key] = field.default;
                }
              }
              break;
              
            case 'array':
              validated[key] = Array.isArray(value) ? value : field.default;
              break;
              
            default:
              validated[key] = value;
          }
        } else {
          // Use default if field doesn't exist
          validated[key] = field.default;
        }
      });
      
      return validated;
    }
    
    /**
     * React to storage changes
     * @param {Object} changes - Storage changes
     * @param {string} areaName - Storage area name
     */
    handleStorageChange(changes, areaName) {
      if (areaName !== 'local') return;
      
      // Check if our config key changed
      if (changes[this.storageKey]) {
        const newValue = changes[this.storageKey].newValue;
        
        // Update our local copy
        if (newValue) {
          this.config = this.validateConfig(newValue);
          
          // Notify listeners
          if (this.onUpdate) {
            this.onUpdate(this.config);
          }
        }
      }
    }
    
    /**
     * Save configuration to storage
     * @param {Object} updates - Configuration updates
     * @returns {Promise<Object>} Updated configuration
     */
    async saveConfig(updates) {
      try {
        // Merge with current config
        this.config = { ...this.config, ...updates };
        
        // Validate the merged config
        this.config = this.validateConfig(this.config);
        
        // Save to storage
        await chrome.storage.local.set({ [this.storageKey]: this.config });
        
        // Notify listeners directly (not relying on storage event)
        if (this.onUpdate) {
          this.onUpdate(this.config);
        }
        
        return this.config;
      } catch (error) {
        console.error('Failed to save config:', error);
        return this.config;
      }
    }
    
    /**
     * Get current configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
      return { ...this.config }; // Return a copy to prevent direct modification
    }
    
    /**
     * Get default configuration values
     * @returns {Object} Default configuration
     */
    getDefaults() {
      const defaults = {};
      
      Object.keys(this.configSchema).forEach(key => {
        defaults[key] = this.configSchema[key].default;
      });
      
      return defaults;
    }
    
    /**
     * Reset configuration to defaults
     * @returns {Promise<Object>} Default configuration
     */
    async resetConfig() {
      const defaults = this.getDefaults();
      
      // Keep the existing UUID
      if (this.config.browserUuid) {
        defaults.browserUuid = this.config.browserUuid;
      }
      
      return await this.saveConfig(defaults);
    }
    
    /**
     * Check if the configuration has been initialized
     * @returns {boolean} Initialization status
     */
    isInitialized() {
      return this.initialized;
    }
    
    /**
     * Clean up resources
     */
    cleanup() {
      chrome.storage.onChanged.removeListener(this.handleStorageChange.bind(this));
    }
  }
  
  export default ConfigManager;