// Response Compactor
// Removes null, undefined, empty arrays/objects from responses to reduce token consumption

export class ResponseCompactor {
  /**
   * Recursively remove null, undefined, and empty values from an object or array
   * Preserves 0, false, and empty strings as they can be meaningful values
   */
  static compact(data: any): any {
    if (data === null || data === undefined) {
      return undefined;
    }

    if (Array.isArray(data)) {
      return this.compactArray(data);
    }

    if (typeof data === 'object' && data.constructor === Object) {
      return this.compactObject(data);
    }

    // Primitive values: keep as-is (including 0, false, '', etc.)
    return data;
  }

  private static compactObject(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip null and undefined
      if (value === null || value === undefined) {
        continue;
      }

      // Skip empty arrays
      if (Array.isArray(value) && value.length === 0) {
        continue;
      }

      // Skip empty objects
      if (typeof value === 'object' && value.constructor === Object && Object.keys(value).length === 0) {
        continue;
      }

      // Recursively compact nested structures
      const compactedValue = this.compact(value);
      if (compactedValue !== undefined) {
        result[key] = compactedValue;
      }
    }

    return result;
  }

  private static compactArray(arr: any[]): any[] {
    return arr
      .map(item => this.compact(item))
      .filter(item => item !== undefined);
  }

  /**
   * Estimate the token cost reduction from compacting
   * Returns percentage of tokens saved (rough estimate)
   */
  static estimateSavings(original: any, compacted: any): number {
    const originalSize = JSON.stringify(original).length;
    const compactedSize = JSON.stringify(compacted).length;

    if (originalSize === 0) return 0;
    return Math.round(((originalSize - compactedSize) / originalSize) * 100);
  }
}
