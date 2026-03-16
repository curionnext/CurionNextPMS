import { BookingComAdapter } from "./BookingComAdapter.js";
import { MakeMyTripAdapter } from "./MakeMyTripAdapter.js";
import { AgodaAdapter } from "./AgodaAdapter.js";
import type { IOTAAdapter } from "./BaseOTAAdapter.js";
import type { OTAProvider } from "../../types/domain.js";

export * from "./BaseOTAAdapter.js";
export * from "./BookingComAdapter.js";
export * from "./MakeMyTripAdapter.js";
export * from "./AgodaAdapter.js";

/**
 * OTA Adapter Registry
 * Central registry for all OTA adapters
 */
export class OTAAdapterRegistry {
  private static adapters: Map<OTAProvider, IOTAAdapter> = new Map();
  
  /**
   * Initialize all adapters
   */
  static initialize() {
    this.adapters.set("BOOKING_COM", new BookingComAdapter());
    this.adapters.set("MAKEMYTRIP", new MakeMyTripAdapter());
    this.adapters.set("AIRBNB", new AgodaAdapter()); // Placeholder
    
    // Note: EXPEDIA and GOIBIBO can be added similarly
    console.log(`✅ Initialized ${this.adapters.size} OTA adapters`);
  }
  
  /**
   * Get adapter for a provider
   */
  static getAdapter(provider: OTAProvider): IOTAAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`No adapter found for provider: ${provider}`);
    }
    return adapter;
  }
  
  /**
   * Check if adapter exists for provider
   */
  static hasAdapter(provider: OTAProvider): boolean {
    return this.adapters.has(provider);
  }
  
  /**
   * Get all available providers
   */
  static getAvailableProviders(): OTAProvider[] {
    return Array.from(this.adapters.keys());
  }
}

// Initialize adapters on module load
OTAAdapterRegistry.initialize();
