import { useState, useEffect } from 'react';
import { multiPropertyApi } from '../../services/advancedFeaturesApi';
import type { HotelProfile } from '../../types';
import { Building2 as BuildingOfficeIcon, Check as CheckIcon } from 'lucide-react';

interface PropertySwitcherProps {
  currentPropertyId?: string;
  onPropertyChange?: (property: HotelProfile) => void;
}

export default function PropertySwitcher({ currentPropertyId, onPropertyChange }: PropertySwitcherProps) {
  const [properties, setProperties] = useState<HotelProfile[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentProperty, setCurrentProperty] = useState<HotelProfile | null>(null);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      const data = await multiPropertyApi.getAllProperties();
      setProperties(data);
      
      if (currentPropertyId) {
        const current = data.find(p => p.hotelCode === currentPropertyId);
        if (current) setCurrentProperty(current);
      } else if (data.length > 0) {
        setCurrentProperty(data[0]);
      }
    } catch (err) {
      console.error('Failed to load properties', err);
    }
  };

  const handleSwitch = async (property: HotelProfile) => {
    try {
      await multiPropertyApi.switchProperty(property.hotelCode);
      setCurrentProperty(property);
      setIsOpen(false);
      
      if (onPropertyChange) {
        onPropertyChange(property);
      }
      
      // In a real app, you might want to reload the page or update auth context
      alert(`Switched to ${property.name}. Please refresh to see updates.`);
    } catch (err) {
      console.error('Failed to switch property', err);
      alert('Failed to switch property');
    }
  };

  if (properties.length <= 1) {
    return null; // Don't show switcher if only one property
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
      >
        <BuildingOfficeIcon className="h-5 w-5 text-gray-600" />
        <div className="text-left">
          <div className="text-sm font-medium">{currentProperty?.name || 'Select Property'}</div>
          <div className="text-xs text-gray-500">{currentProperty?.hotelCode}</div>
        </div>
        <svg
          className={`h-4 w-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            <div className="p-2 border-b">
              <div className="text-sm font-medium text-gray-700 px-2 py-1">Select Property</div>
            </div>
            <div className="p-2 space-y-1">
              {properties.map((property) => (
                <button
                  key={property.hotelCode}
                  onClick={() => handleSwitch(property)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-100 transition-colors ${
                    currentProperty?.hotelCode === property.hotelCode ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                    <div className="text-left">
                      <div className="text-sm font-medium">{property.name}</div>
                      <div className="text-xs text-gray-500">{property.city}, {property.state}</div>
                    </div>
                  </div>
                  {currentProperty?.hotelCode === property.hotelCode && (
                    <CheckIcon className="h-5 w-5 text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
