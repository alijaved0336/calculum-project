export {};

declare global {
  // eslint-disable-next-line no-var
  var $: any;
  // eslint-disable-next-line no-var
  var __APOLLO_CLIENT__: any;
  // eslint-disable-next-line no-var
  var gc: (() => void) | undefined;

  interface Window {
    jQuery: any;
    kendo: any;
    google: any;
    jQueryLoadPromise: Promise<void> | undefined;
    kendoLoadPromise: Promise<void> | undefined;
    chartsLoadPromise: Promise<void> | undefined;
    chartsInitPromise: Promise<void> | undefined;
    $: any;
    testSecureLS?: any;
    debugPiniaStorage?: any;
    __APOLLO_CLIENT__?: any;
    gc?: () => void;
    // Timer IDs
    intervalDownCount?: number;
    monitoringInterval?: number;
    cleanupInterval?: number;
    memoryMonitorInterval?: number;
    [key: string]: any; // Allow dynamic properties for timer IDs
  }
} 