import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { multiPropertyApi } from '../../services/advancedFeaturesApi';
import type { HotelProfile, PropertyFeatureFlags } from '../../types';
import { CheckCircle as CheckCircleIcon, XCircle as XCircleIcon } from 'lucide-react';

export default function FeatureFlagsPage() {
  const [properties, setProperties] = useState<HotelProfile[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<HotelProfile | null>(null);
  const [features, setFeatures] = useState<PropertyFeatureFlags | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      loadFeatures(selectedProperty.hotelCode);
    }
  }, [selectedProperty]);

  const loadProperties = async () => {
    try {
      const data = await multiPropertyApi.getAllProperties();
      setProperties(data);
      if (data.length > 0) {
        setSelectedProperty(data[0]);
      }
    } catch (err) {
      setError('Failed to load properties');
      console.error(err);
    }
  };

  const loadFeatures = async (hotelId: string) => {
    try {
      setLoading(true);
      const data = await multiPropertyApi.getPropertyFeatures(hotelId);
      setFeatures(data);
    } catch (err) {
      setError('Failed to load feature flags');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeature = async (feature: keyof PropertyFeatureFlags) => {
    if (!selectedProperty || !features) return;

    try {
      setLoading(true);
      setError(null);
      const updated = await multiPropertyApi.updatePropertyFeatures(
        selectedProperty.hotelCode,
        { [feature]: !features[feature] }
      );
      setFeatures(updated);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update feature');
    } finally {
      setLoading(false);
    }
  };

  const featureDescriptions: Record<keyof PropertyFeatureFlags, { title: string; description: string }> = {
    nightAuditEnabled: {
      title: 'Night Audit Engine',
      description: 'Automated end-of-day processing, revenue posting, and report generation'
    },
    otaIntegrationEnabled: {
      title: 'OTA Integration',
      description: 'Connect with online travel agencies like Booking.com, Expedia, and Airbnb'
    },
    whatsappEnabled: {
      title: 'WhatsApp Automation',
      description: 'Automated guest communications via WhatsApp Business API'
    },
    multiPropertyEnabled: {
      title: 'Multi-Property Management',
      description: 'Manage multiple properties from a single dashboard'
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Feature Flags</h1>
        <p className="text-gray-600 mt-1">Enable or disable advanced features per property</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Property Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Property</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            className="w-full p-2 border rounded-md"
            value={selectedProperty?.hotelCode || ''}
            onChange={(e) => {
              const property = properties.find(p => p.hotelCode === e.target.value);
              if (property) setSelectedProperty(property);
            }}
          >
            {properties.map((property) => (
              <option key={property.hotelCode} value={property.hotelCode}>
                {property.name} ({property.hotelCode})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      {selectedProperty && features && (
        <div className="grid gap-4">
          {Object.entries(featureDescriptions).map(([key, { title, description }]) => {
            const featureKey = key as keyof PropertyFeatureFlags;
            const isEnabled = features[featureKey];

            return (
              <Card key={key}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {isEnabled ? (
                          <CheckCircleIcon className="h-6 w-6 text-green-600" />
                        ) : (
                          <XCircleIcon className="h-6 w-6 text-gray-400" />
                        )}
                        <h3 className="text-lg font-semibold">{title}</h3>
                      </div>
                      <p className="text-gray-600 ml-9">{description}</p>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => handleToggleFeature(featureKey)}
                        disabled={loading}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isEnabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Stats */}
      {selectedProperty && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Night Audit</p>
                <p className="text-xl font-bold">
                  {features?.nightAuditEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">OTA Integration</p>
                <p className="text-xl font-bold">
                  {features?.otaIntegrationEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">WhatsApp</p>
                <p className="text-xl font-bold">
                  {features?.whatsappEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Multi-Property</p>
                <p className="text-xl font-bold">
                  {features?.multiPropertyEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
