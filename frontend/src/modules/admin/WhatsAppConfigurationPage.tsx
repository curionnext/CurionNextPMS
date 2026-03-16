import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { whatsappApi } from '../../services/advancedFeaturesApi';
import type { WhatsAppConfig, WhatsAppMessage } from '../../types';
import {
  CheckCircle as CheckCircleIcon,
  MessageSquare as ChatBubbleLeftIcon
} from 'lucide-react';

export default function WhatsAppConfigurationPage() {
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    isEnabled: false,
    provider: 'TWILIO' as WhatsAppConfig['provider'],
    credentials: {
      accountSid: '',
      authToken: '',
      phoneNumberId: ''
    },
    automationSettings: {
      sendBookingConfirmation: true,
      sendCheckinReminder: true,
      checkinReminderHoursBefore: 24,
      sendCheckoutReminder: false,
      checkoutReminderHoursBefore: 2,
      sendPaymentReminder: false,
      sendFeedbackRequest: false
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configData, messagesData] = await Promise.all([
        whatsappApi.getConfig(),
        whatsappApi.getMessages({ limit: 50 })
      ]);
      
      if (configData) {
        setConfig(configData);
        const credentials = configData.credentials || { accountSid: '', authToken: '', phoneNumberId: '' };
        setFormData({
          isEnabled: configData.isEnabled,
          provider: configData.provider,
          credentials: {
            accountSid: typeof credentials === 'object' ? credentials.accountSid || '' : '',
            authToken: typeof credentials === 'object' ? credentials.authToken || '' : '',
            phoneNumberId: typeof credentials === 'object' ? credentials.phoneNumberId || '' : ''
          },
          automationSettings: configData.automationSettings
        });
      }
      
      setMessages(messagesData);
    } catch (err) {
      setError('Failed to load WhatsApp data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      await whatsappApi.updateConfig(formData);
      alert('Configuration saved successfully');
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await whatsappApi.testConnection();
      alert(result.message);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Connection test failed');
    }
  };

  const getMessageStatusBadge = (status: WhatsAppMessage['status']) => {
    const variants: Record<string, string> = {
      QUEUED: 'bg-gray-100 text-gray-800',
      SENT: 'bg-blue-100 text-blue-800',
      DELIVERED: 'bg-green-100 text-green-800',
      READ: 'bg-purple-100 text-purple-800',
      FAILED: 'bg-red-100 text-red-800'
    };

    return <Badge className={variants[status]}>{status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">WhatsApp Configuration</h1>
        <p className="text-gray-600 mt-1">Configure automated WhatsApp messaging</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Business API Settings</CardTitle>
          <CardDescription>Configure your WhatsApp Business API connection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              id="isEnabled"
              checked={formData.isEnabled}
              onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
            />
            <Label htmlFor="isEnabled" className="font-medium">Enable WhatsApp Integration</Label>
          </div>

          <div>
            <Label htmlFor="provider">Provider</Label>
            <select
              id="provider"
              className="w-full mt-1 p-2 border rounded-md"
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
            >
              <option value="TWILIO">Twilio</option>
              <option value="META">Meta (Facebook)</option>
              <option value="GUPSHUP">Gupshup</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {formData.provider === 'TWILIO' && (
            <>
              <div>
                <Label htmlFor="accountSid">Account SID</Label>
                <Input
                  id="accountSid"
                  value={formData.credentials.accountSid || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    credentials: { ...formData.credentials, accountSid: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="authToken">Auth Token</Label>
                <Input
                  id="authToken"
                  type="password"
                  value={formData.credentials.authToken || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    credentials: { ...formData.credentials, authToken: e.target.value }
                  })}
                />
              </div>
            </>
          )}

          {formData.provider === 'META' && (
            <>
              <div>
                <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                <Input
                  id="phoneNumberId"
                  value={formData.credentials.phoneNumberId || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    credentials: { ...formData.credentials, phoneNumberId: e.target.value }
                  })}
                />
              </div>
              <div>
                <Label htmlFor="accessToken">Access Token</Label>
                <Input
                  id="accessToken"
                  type="password"
                  value={(formData.credentials as any).accessToken || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    credentials: { ...formData.credentials, accessToken: e.target.value } as any
                  })}
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSaveConfig} disabled={loading}>
              {loading ? 'Saving...' : 'Save Configuration'}
            </Button>
            {config && (
              <Button variant="outline" onClick={handleTestConnection}>
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Test Connection
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Settings</CardTitle>
          <CardDescription>Configure automated message triggers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sendBookingConfirmation">Booking Confirmation</Label>
                <p className="text-sm text-gray-600">Send confirmation after booking</p>
              </div>
              <input
                type="checkbox"
                id="sendBookingConfirmation"
                checked={formData.automationSettings.sendBookingConfirmation}
                onChange={(e) => setFormData({
                  ...formData,
                  automationSettings: { ...formData.automationSettings, sendBookingConfirmation: e.target.checked }
                })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sendCheckinReminder">Check-in Reminder</Label>
                <p className="text-sm text-gray-600">Remind guest before check-in</p>
              </div>
              <input
                type="checkbox"
                id="sendCheckinReminder"
                checked={formData.automationSettings.sendCheckinReminder}
                onChange={(e) => setFormData({
                  ...formData,
                  automationSettings: { ...formData.automationSettings, sendCheckinReminder: e.target.checked }
                })}
              />
            </div>

            {formData.automationSettings.sendCheckinReminder && (
              <div className="ml-6">
                <Label htmlFor="checkinReminderHours">Hours before check-in</Label>
                <Input
                  id="checkinReminderHours"
                  type="number"
                  value={formData.automationSettings.checkinReminderHoursBefore}
                  onChange={(e) => setFormData({
                    ...formData,
                    automationSettings: {
                      ...formData.automationSettings,
                      checkinReminderHoursBefore: parseInt(e.target.value)
                    }
                  })}
                  className="w-32"
                />
              </div>
            )}
          </div>

          <Button onClick={handleSaveConfig} disabled={loading} className="w-full">
            Save Automation Settings
          </Button>
        </CardContent>
      </Card>

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Messages</CardTitle>
          <CardDescription>Last 50 WhatsApp messages sent</CardDescription>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No messages sent yet</p>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <ChatBubbleLeftIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{message.recipientName || message.recipientPhone}</p>
                      <p className="text-sm text-gray-600">{message.templateType.replace('_', ' ')}</p>
                      <p className="text-xs text-gray-500">{new Date(message.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  {getMessageStatusBadge(message.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
