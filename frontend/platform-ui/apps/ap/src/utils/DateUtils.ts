import StringUtils from "./StringUtils"; // Direct import to avoid barrel file issues in tests

export default class DateUtils {
  /**
   * Given a ...
   * example: "2015-10-29 00:00:00.000000" -> 2015-10-29
   *
   * @param {string} value
   * @return {number[]} - A list of numbers
   */
  static getDateFromDateSpaceTimeFormat(
    value: string,
    options?: Partial<{}>
  ): string {
    // Init
    // let {} = options || {};

    // Validate
    if (StringUtils.isEmpty(value)) {
      return "";
    }

    // Extract the date
    const valueFormatted = value.split(" ")[0];

    return valueFormatted;
  }

  static getISODate(date: string, options?: Partial<{}>): string {
    // Validate
    if (StringUtils.isEmpty(date)) {
      return "";
    }

    const splitDate = date.split("T");
    if (splitDate.length > 0) {
      // Use native Date instead of moment
      const dateObj = new Date(splitDate[0]);
      if (isNaN(dateObj.getTime())) {
        return "";
      }
      return dateObj.toISOString().split('T')[0];
    } else {
      // Use native Date instead of moment
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return "";
      }
      return dateObj.toISOString().split('T')[0];
    }
  }

  /**
   * Format date using Intl.DateTimeFormat (replaces moment.utc().locale().format())
   * @param date - Date string or Date object
   * @param locale - Locale string (e.g., 'en', 'es')
   * @param options - Intl.DateTimeFormat options
   * @returns Formatted date string
   */
  static formatDate(date: string | Date, locale: string = 'en', options?: Intl.DateTimeFormatOptions): string {
    // Validar que la fecha no sea undefined, null o vacía
    if (!date) {
      return '';
    }
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    };

    return new Intl.DateTimeFormat(locale, options || defaultOptions).format(dateObj);
  }

  /**
   * Add days to a date (replaces moment().add(days, 'days'))
   * @param date - Date string or Date object
   * @param days - Number of days to add
   * @returns New Date object
   */
  static addDays(date: string | Date, days: number): Date {
    // Validar que la fecha no sea undefined, null o vacía
    if (!date) {
      throw new Error('Date parameter is required');
    }
    
    let dateObj: Date;
    
    if (typeof date === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-').map(Number);
        dateObj = new Date(year, month - 1, day); // month es 0-indexed
      } else {
        dateObj = new Date(date);
      }
    } else {
      dateObj = date;
    }
    
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date provided');
    }
    
    const result = new Date(dateObj);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Calculate difference between two dates in days (replaces moment().diff())
   * @param date1 - First date
   * @param date2 - Second date
   * @returns Difference in days
   */
  static diffInDays(date1: string | Date, date2: string | Date): number {
    // Validar que las fechas no sean undefined, null o vacías
    if (!date1 || !date2) {
      throw new Error('Both date parameters are required');
    }
    
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      throw new Error('Invalid date provided');
    }
    
    const timeDiff = d2.getTime() - d1.getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Check if date1 is after date2 (replaces moment().isAfter())
   * @param date1 - First date
   * @param date2 - Second date
   * @returns True if date1 is after date2
   */
  static isAfter(date1: string | Date, date2: string | Date): boolean {
    // Validar que las fechas no sean undefined, null o vacías
    if (!date1 || !date2) {
      return false;
    }
    
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      return false;
    }
    
    return d1.getTime() > d2.getTime();
  }

  /**
   * Format date as YYYY-MM-DD (replaces moment().format('YYYY-MM-DD'))
   * @param date - Date string or Date object
   * @returns Formatted date string
   */
  static formatYYYYMMDD(date: string | Date): string {
    // Validar que la fecha no sea undefined, null o vacía
    if (!date) {
      return '';
    }
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return '';
    }

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Get timezone names (replaces moment.tz.names())
   * This is a simplified list of common timezones
   * @returns Array of timezone names
   */
  static getTimezoneNames(): string[] {
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Anchorage',
      'America/Honolulu',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Madrid',
      'Europe/Rome',
      'Europe/Amsterdam',
      'Europe/Brussels',
      'Europe/Vienna',
      'Europe/Zurich',
      'Europe/Stockholm',
      'Europe/Oslo',
      'Europe/Copenhagen',
      'Europe/Helsinki',
      'Europe/Warsaw',
      'Europe/Prague',
      'Europe/Budapest',
      'Europe/Bucharest',
      'Europe/Sofia',
      'Europe/Athens',
      'Europe/Istanbul',
      'Europe/Moscow',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Asia/Hong_Kong',
      'Asia/Singapore',
      'Asia/Seoul',
      'Asia/Bangkok',
      'Asia/Jakarta',
      'Asia/Manila',
      'Asia/Kolkata',
      'Asia/Dubai',
      'Asia/Tehran',
      'Asia/Jerusalem',
      'Australia/Sydney',
      'Australia/Melbourne',
      'Australia/Perth',
      'Australia/Adelaide',
      'Pacific/Auckland',
      'Pacific/Fiji',
      'Pacific/Honolulu'
    ];
  }

  // Function for formatting timestamp
  static formatDateForTimestamp(date: Date): string {
    const pad = (n: number) => (n < 10 ? "0" + n : n.toString());
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1); // Months are zero-indexed
    const day = pad(date.getUTCDate());
    const hours = pad(date.getUTCHours());
    const minutes = pad(date.getUTCMinutes());
    const seconds = pad(date.getUTCSeconds());
    const milliseconds = date
      .getUTCMilliseconds()
      .toString()
      .padStart(3, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}Z`;
  }

  // Function for formatting date for <input type="date">
  static formatDateForInput(date: string): string {
    // Convert the string to a Date object
    const dateObj = new Date(date);

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      throw new Error("Invalid date string");
    }

    const pad = (n: number) => (n < 10 ? "0" + n : n.toString());

    const year = dateObj.getFullYear();
    const month = pad(dateObj.getMonth() + 1); // Months are zero-indexed
    const day = pad(dateObj.getDate());
    const hour = pad(dateObj.getHours());
    const minute = pad(dateObj.getMinutes());

    return `${year}-${month}-${day} ${hour}:${minute}`; // YYYY-MM-DD format
  }




  static parseDateValidation(dateStr: string, locale: string = navigator.language || "es-ES"): Date | null {
    if (!dateStr) return null;

    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) return isoDate;

    
    const isES = locale.startsWith("es"); 
    const isUS = locale.startsWith("en-US"); 
    const isISO = /^\d{4}-\d{2}-\d{2}$/.test(dateStr); 

    if (isISO) {          
      return new Date(dateStr);
    }

    const parts = dateStr.split(/[\/\-]/).map(Number); 

    if (parts.length === 3) {
      let day, month, year;

      if (isES) {            
        [day, month, year] = parts;
      } else if (isUS) {            
        [month, day, year] = parts;
      } else {            
        return null;
      }
      return new Date(year, month - 1, day);
    }
    return null;
  }





}
