let tidioLoaded = false;

declare global {
  interface Window {
    tidioChatApi?: any;
  }
}

const TIDIO_SCRIPT_ID = 'tidio-script';

export type TidioUserContext = {
  email?: string;
  name?: string;
  language?: string;
  company?: string;
  activeCompanyId?: string;
  [key: string]: any;
};

const queueTidioCommand = (command: unknown[]): void => {
  const api = window.tidioChatApi;

  if (!api) {
    window.tidioChatApi = [command];
    return;
  }

  if (Array.isArray(api) && typeof api.push === 'function') {
    api.push(command);
    return;
  }

  if (typeof api === 'function') {
    try {
      api(...command);
      return;
    } catch {
      // fallback below
    }
  }

  if (api && typeof api.push === 'function') {
    api.push(command);
    return;
  }

  // Replace unsupported API shape with a queue for future script handling.
  window.tidioChatApi = [command];
};

export function loadTidio(publicKey: string, onLoad?: () => void): void {
  if (!publicKey) {
    return;
  }

  if (!window.tidioChatApi) {
    window.tidioChatApi = [];
  }

  if (tidioLoaded) {
    onLoad?.();
    return;
  }

  const existingScript = document.getElementById(TIDIO_SCRIPT_ID) as HTMLScriptElement | null;
  if (existingScript) {
    const scriptReadyState = (existingScript as any).readyState;
    const isLoaded =
      existingScript.getAttribute('data-loaded') === 'true' ||
      scriptReadyState === 'complete' ||
      scriptReadyState === 'loaded';

    if (isLoaded) {
      tidioLoaded = true;
      // Add substantial delay to allow Tidio API to fully initialize and render the chat widget
      setTimeout(() => {
        onLoad?.();
      }, 500);
      return;
    }

    // Script exists but not fully loaded; wait for load event
    const loadHandler = () => {
      tidioLoaded = true;
      existingScript.removeEventListener('load', loadHandler);
      onLoad?.();
    };

    existingScript.addEventListener('load', loadHandler);

    // Safety timeout: if load event doesn't fire within 3 seconds, call onLoad anyway
    // (script may have loaded but event was missed)
    setTimeout(() => {
      if (!tidioLoaded) {
        tidioLoaded = true;
        existingScript.removeEventListener('load', loadHandler);
        onLoad?.();
      }
    }, 3000);

    return;
  }

  const script = document.createElement('script');
  script.src = `https://code.tidio.co/${publicKey}.js`;
  script.async = true;
  script.id = TIDIO_SCRIPT_ID;

  script.onload = () => {
    script.setAttribute('data-loaded', 'true');
    tidioLoaded = true;
    onLoad?.();
  };

  script.onerror = () => {
    console.error('Tidio failed to load:', script.src);
  };

  document.body.appendChild(script);
}

export function setTidioUser(context: TidioUserContext, onSet?: () => void): void {
  // Add delay to ensure Tidio API is fully initialized
  setTimeout(() => {
    if (!window.tidioChatApi) {
      window.tidioChatApi = [];
    }

    const visitorData = {
      email: context.email,
      name: context.name,
      language: context.language,
      company: context.company,
      activeCompanyId: context.activeCompanyId,
    };

    const filteredData = Object.entries(visitorData).reduce<Record<string, any>>((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});

    if (Object.keys(filteredData).length > 0) {
      // Check if API is available as a proper Tidio object with setVisitorData method
      if (typeof window.tidioChatApi === 'object' && window.tidioChatApi && typeof window.tidioChatApi.setVisitorData === 'function') {
        window.tidioChatApi.setVisitorData(filteredData);
      } else {
        // Fallback: queue the command if API is still initializing
        queueTidioCommand(['setVisitorData', filteredData]);
      }
    }

    onSet?.();
  }, 300);
}

export function showTidio(): void {
  if (window.tidioChatApi && typeof window.tidioChatApi.show === 'function') {
    window.tidioChatApi.show();
  }
}

export function hideTidio(): void {
  if (window.tidioChatApi && typeof window.tidioChatApi.hide === 'function') {
    window.tidioChatApi.hide();
  }
}

export function unloadTidio(): void {
  hideTidio();

  // If hide is not available, remove everything
  if (!window.tidioChatApi || typeof window.tidioChatApi.hide !== 'function') {
    const script = document.getElementById(TIDIO_SCRIPT_ID);
    if (script) {
      script.remove();
    }

    const chatIframe = document.querySelector('iframe[src*="tidio.co"]');
    if (chatIframe && chatIframe.parentElement) {
      chatIframe.parentElement.removeChild(chatIframe);
    }

    const chatRoot = document.querySelector('#tidio-chat');
    if (chatRoot && chatRoot.parentElement) {
      chatRoot.parentElement.removeChild(chatRoot);
    }

    if (window.tidioChatApi) {
      delete window.tidioChatApi;
    }

    tidioLoaded = false;
  }
}
