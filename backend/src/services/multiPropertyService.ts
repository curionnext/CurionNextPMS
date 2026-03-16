import { nanoid } from "nanoid";
import { db } from "../db/index.js";
import { HttpError } from "../middlewares/errorHandler.js";
import type {
  PropertyGroup,
  PropertyProfile,
  PropertyFeatureFlags
} from "../types/domain.js";

const propertyGroupsTable = db.propertyGroups;
const propertyTable = db.property;

const now = () => new Date().toISOString();

/**
 * Multi-Property Service
 * Handles multi-property operations:
 * - Property group management
 * - Feature flag management per property
 * - Cross-property reporting
 * - Centralized property switching
 */
export const multiPropertyService = {
  /**
   * Get all property groups
   */
  async getPropertyGroups(): Promise<PropertyGroup[]> {
    return await propertyGroupsTable.getAll();
  },

  /**
   * Get property group by ID
   */
  async getPropertyGroupById(id: string): Promise<PropertyGroup> {
    const group = await propertyGroupsTable.findById(id);
    if (!group) {
      throw new HttpError(404, "Property group not found");
    }
    return group;
  },

  /**
   * Create property group
   */
  async createPropertyGroup(input: {
    name: string;
    description?: string;
    properties: string[];
  }): Promise<PropertyGroup> {
    // Validate properties exist
    for (const hotelId of input.properties) {
      const property = await propertyTable.findOne({ hotelId });
      if (!property) {
        throw new HttpError(400, `Property ${hotelId} not found`);
      }
    }

    const group: PropertyGroup = {
      id: nanoid(),
      name: input.name,
      description: input.description,
      properties: input.properties,
      createdAt: now(),
      updatedAt: now()
    };

    await propertyGroupsTable.insert(group);
    return group;
  },

  /**
   * Update property group
   */
  async updatePropertyGroup(
    id: string,
    updates: Partial<Omit<PropertyGroup, "id" | "createdAt" | "updatedAt">>
  ): Promise<PropertyGroup> {
    const group = await this.getPropertyGroupById(id);

    // Validate properties if updated
    if (updates.properties) {
      for (const hotelId of updates.properties) {
        const property = await propertyTable.findOne({ hotelId });
        if (!property) {
          throw new HttpError(400, `Property ${hotelId} not found`);
        }
      }
    }

    const updated: PropertyGroup = {
      ...group,
      ...updates,
      updatedAt: now()
    };

    await propertyGroupsTable.update(id, updated);
    return updated;
  },

  /**
   * Delete property group
   */
  async deletePropertyGroup(id: string): Promise<void> {
    await this.getPropertyGroupById(id);
    await propertyGroupsTable.delete(id);
  },

  /**
   * Get all properties
   */
  async getAllProperties(): Promise<PropertyProfile[]> {
    return await propertyTable.getAll();
  },

  /**
   * Get property by hotelId
   */
  async getPropertyById(hotelId: string): Promise<PropertyProfile> {
    const property = await propertyTable.findOne({ hotelId });
    if (!property) {
      throw new HttpError(404, "Property not found");
    }
    return property;
  },

  /**
   * Get properties in a group
   */
  async getPropertiesInGroup(groupId: string): Promise<PropertyProfile[]> {
    const group = await this.getPropertyGroupById(groupId);
    const properties: PropertyProfile[] = [];

    for (const hotelId of group.properties) {
      try {
        const property = await this.getPropertyById(hotelId);
        properties.push(property);
      } catch (error) {
        // Skip if property not found
      }
    }

    return properties;
  },

  /**
   * Get feature flags for a property
   */
  async getPropertyFeatures(hotelId: string): Promise<PropertyFeatureFlags> {
    const property = await this.getPropertyById(hotelId);

    // Default feature flags
    const defaultFeatures: PropertyFeatureFlags = {
      nightAuditEnabled: false,
      otaIntegrationEnabled: false,
      whatsappEnabled: false,
      multiPropertyEnabled: false
    };

    // Check if property has features in metadata
    const metadata = (property as { features?: Partial<PropertyFeatureFlags> }).features;
    if (metadata) {
      return { ...defaultFeatures, ...metadata };
    }

    return defaultFeatures;
  },

  /**
   * Update feature flags for a property
   */
  async updatePropertyFeatures(
    hotelId: string,
    features: Partial<PropertyFeatureFlags>
  ): Promise<PropertyFeatureFlags> {
    const property = await this.getPropertyById(hotelId);

    const currentFeatures = await this.getPropertyFeatures(hotelId);
    const updatedFeatures: PropertyFeatureFlags = {
      ...currentFeatures,
      ...features
    };

    // Store features in property metadata
    const updatedProperty = {
      ...property,
      features: updatedFeatures,
      updatedAt: now()
    } as any;

    await propertyTable.update(property.id, updatedProperty);

    return updatedFeatures;
  },

  /**
   * Check if feature is enabled for property
   */
  async isFeatureEnabled(
    hotelId: string,
    feature: keyof PropertyFeatureFlags
  ): Promise<boolean> {
    const features = await this.getPropertyFeatures(hotelId);
    return features[feature] || false;
  },

  /**
   * Get properties with specific feature enabled
   */
  async getPropertiesWithFeature(
    feature: keyof PropertyFeatureFlags
  ): Promise<PropertyProfile[]> {
    const allProperties = await this.getAllProperties();
    const propertiesWithFeature: PropertyProfile[] = [];

    for (const property of allProperties) {
      const isEnabled = await this.isFeatureEnabled(property.hotelId, feature);
      if (isEnabled) {
        propertiesWithFeature.push(property);
      }
    }

    return propertiesWithFeature;
  },

  /**
   * Get property statistics across all properties
   */
  async getMultiPropertyStats(): Promise<{
    totalProperties: number;
    totalGroups: number;
    featureAdoption: Record<keyof PropertyFeatureFlags, number>;
  }> {
    const allProperties = await this.getAllProperties();
    const allGroups = await this.getPropertyGroups();

    const featureAdoption: Record<keyof PropertyFeatureFlags, number> = {
      nightAuditEnabled: 0,
      otaIntegrationEnabled: 0,
      whatsappEnabled: 0,
      multiPropertyEnabled: 0
    };

    for (const property of allProperties) {
      const features = await this.getPropertyFeatures(property.hotelId);

      if (features.nightAuditEnabled) featureAdoption.nightAuditEnabled++;
      if (features.otaIntegrationEnabled) featureAdoption.otaIntegrationEnabled++;
      if (features.whatsappEnabled) featureAdoption.whatsappEnabled++;
      if (features.multiPropertyEnabled) featureAdoption.multiPropertyEnabled++;
    }

    return {
      totalProperties: allProperties.length,
      totalGroups: allGroups.length,
      featureAdoption
    };
  },

  /**
   * Switch context to different property (returns property details)
   */
  async switchProperty(hotelId: string): Promise<PropertyProfile> {
    return await this.getPropertyById(hotelId);
  }
};
