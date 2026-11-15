let jqueryLoaded = false;
let kendoLoaded = false;
let chartsLoaded = false;
let recaptchaLoaded = false;

export const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      resolve();
    };
    script.onerror = (error) => {
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(script);
  });
};

export const loadJQuery = async (): Promise<void> => {
  if (jqueryLoaded) {
    return;
  }
  
  if (window.jQueryLoadPromise === undefined) {
    window.jQueryLoadPromise = loadScript('/scripts/jquery.js')
      .then(() => {
        if (typeof window.jQuery === 'undefined') {
          throw new Error('jQuery object not found after script load');
        }
        jqueryLoaded = true;
      });
  }
  
  try {
    await window.jQueryLoadPromise;
  } catch (error) {
    jqueryLoaded = false;
    throw error;
  }
};

export const loadKendo = async (): Promise<void> => {
  if (kendoLoaded) {
    return;
  }
  
  try {
    // Ensure jQuery is loaded first
    await loadJQuery();
    
    // Reset kendoLoadPromise if kendo is not loaded
    if (!kendoLoaded) {
      window.kendoLoadPromise = loadScript('/scripts/kendo.js')
        .then(() => {
          // Add a small delay to ensure script is fully evaluated
          return new Promise<void>((resolve, reject) => {
            setTimeout(() => {
              try {
                if (typeof window.kendo === 'undefined') {
                  const error = new Error('Kendo object not found after script load');
                  reject(error);
                  return;
                }
                kendoLoaded = true;
                resolve();
              } catch (error) {
                reject(error);
              }
            }, 50); // Small delay to ensure script evaluation
          });
        })
        .catch(error => {
          kendoLoaded = false;
          window.kendoLoadPromise = undefined; // Reset the promise on error
          throw error;
        });
    }
    
    await window.kendoLoadPromise;
  } catch (error) {
    kendoLoaded = false;
    window.kendoLoadPromise = undefined; // Reset the promise on error
    throw error;
  }
};

export const loadCharts = async (): Promise<void> => {
  if (chartsLoaded) {
    return;
  }
  
  try {
    // First ensure we have a clean state
    window.chartsLoadPromise = undefined;
    window.chartsInitPromise = undefined;
    chartsLoaded = false;

    // Create the initial load promise
    window.chartsLoadPromise = loadScript('/scripts/charts_loader.js');
    
    await window.chartsLoadPromise;

    // Create a separate promise for initialization
    window.chartsInitPromise = new Promise<void>((resolve, reject) => {
      // Add a small delay to ensure script is evaluated
      setTimeout(() => {
        try {
          if (typeof window.google === 'undefined') {
            throw new Error('Google object not found after script load');
          }
          
          if (typeof window.google.charts === 'undefined') {
            throw new Error('Google Charts object not found after script load');
          }
          
          window.google.charts.load('current', { packages: ['corechart'] });
          
          window.google.charts.setOnLoadCallback(() => {
            chartsLoaded = true;
            resolve();
          });
        } catch (error) {
          reject(error);
        }
      }, 100);
    });

    await window.chartsInitPromise;
  } catch (error) {
    // Reset everything on error
    window.chartsLoadPromise = undefined;
    window.chartsInitPromise = undefined;
    chartsLoaded = false;
    throw error;
  }
};