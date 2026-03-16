import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card } from '../../components/ui/Card';
import { Building2, MapPin, FileText, Calendar } from 'lucide-react';
import ChannelManager from './components/ChannelManager';
import RoomMappingPanel from './components/RoomMappingPanel';
import SyncLogsViewer from './components/SyncLogsViewer';
import OTAReservationsViewer from './components/OTAReservationsViewer';

export default function OTAManagementPage() {
  const [activeTab, setActiveTab] = useState('channels');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">OTA Management</h1>
          <p className="text-gray-600 mt-1">
            Manage OTA integrations, room mappings, and synchronization
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="channels" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Channel Manager</span>
            <span className="sm:hidden">Channels</span>
          </TabsTrigger>
          <TabsTrigger value="mappings" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Room Mapping</span>
            <span className="sm:hidden">Mapping</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Sync Logs</span>
            <span className="sm:hidden">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="reservations" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">OTA Reservations</span>
            <span className="sm:hidden">Bookings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          <Card className="p-6">
            <ChannelManager />
          </Card>
        </TabsContent>

        <TabsContent value="mappings" className="space-y-4">
          <Card className="p-6">
            <RoomMappingPanel />
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card className="p-6">
            <SyncLogsViewer />
          </Card>
        </TabsContent>

        <TabsContent value="reservations" className="space-y-4">
          <Card className="p-6">
            <OTAReservationsViewer />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
