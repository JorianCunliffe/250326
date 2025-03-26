// setup-form.js
// This file handles the configuration form UI and logic

class SetupForm {
    constructor(configManager) {
      this.configManager = configManager;
      this.formElement = document.getElementById('setup-form');
      this.overlayElement = document.getElementById('setup-overlay');
      this.setupButton = document.getElementById('setup-button');
      this.cancelButton = document.getElementById('cancel-setup');
      this.saveButton = document.getElementById('save-setup');
      
      // Form fields
      this.nameInput = document.getElementById('user-name');
      this.birthdateInput = document.getElementById('user-birthdate');
      this.personalInfoInput = document.getElementById('personal-info');
      this.promptsInput = document.getElementById('custom-prompts');
    }
    
    initialize() {
      // Register event listeners
      this.setupButton.addEventListener('click', () => this.showForm());
      this.cancelButton.addEventListener('click', () => this.hideForm());
      this.saveButton.addEventListener('click', () => this.saveConfig());
      
      // Load existing config into form fields
      this.loadConfigIntoForm();
      
      return this;
    }
    
    async loadConfigIntoForm() {
      const config = this.configManager.getConfig();
      
      this.nameInput.value = config.name || '';
      
      if (config.birthdate) {
        // Format date as YYYY-MM-DD for the input field
        const date = new Date(config.birthdate);
        const formattedDate = date.toISOString().split('T')[0];
        this.birthdateInput.value = formattedDate;
      } else {
        this.birthdateInput.value = '';
      }
      
      this.personalInfoInput.value = config.personalInfo || '';
      
      // Convert prompts array to comma-separated string
      if (config.prompts && Array.isArray(config.prompts)) {
        this.promptsInput.value = config.prompts.join(',');
      } else {
        this.promptsInput.value = '';
      }
    }
    
    showForm() {
      // Reload current config values
      this.loadConfigIntoForm();
      
      // Show form
      this.overlayElement.classList.add('active');
      this.formElement.classList.add('active');
    }
    
    hideForm() {
      this.overlayElement.classList.remove('active');
      this.formElement.classList.remove('active');
    }
    
    async saveConfig() {
      try {
        // Parse prompts from comma-separated string to array
        let prompts = [];
        if (this.promptsInput.value.trim()) {
          prompts = this.promptsInput.value
            .split(',')
            .map(prompt => prompt.trim())
            .filter(prompt => prompt.length > 0);
        }
        
        // Parse birthdate
        let birthdate = null;
        if (this.birthdateInput.value) {
          birthdate = new Date(this.birthdateInput.value).toISOString();
        }
        
        // Create new config object
        const updatedConfig = {
          name: this.nameInput.value.trim(),
          birthdate: birthdate,
          personalInfo: this.personalInfoInput.value.trim(),
          prompts: prompts
          // Don't modify browserUuid
        };
        
        // Save configuration
        await this.configManager.saveConfig(updatedConfig);
        
        // Hide the form
        this.hideForm();
        
        // Trigger event to notify about config changes
        window.dispatchEvent(new CustomEvent('configUpdated', {
          detail: this.configManager.getConfig()
        }));
        
        // Show success message
        this.showMessage('Configuration saved successfully!');
      } catch (error) {
        console.error('Failed to save configuration:', error);
        this.showMessage('Error saving configuration', true);
      }
    }
    
    showMessage(message, isError = false) {
      const messageElement = isError
        ? document.getElementById('errorMessage')
        : document.getElementById('successMessage');
      
      if (messageElement) {
        messageElement.textContent = message;
        messageElement.style.display = 'block';
        
        setTimeout(() => {
          messageElement.style.display = 'none';
        }, 3000);
      }
    }
  }
  
  // Make the class available globally
  // No export needed for direct script inclusion