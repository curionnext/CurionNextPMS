# Real OTA Integration Guide

This document outlines how to implement real integrations with major OTA (Online Travel Agency) platforms.

## Overview

The current implementation uses simulated adapters for development. This guide provides information on implementing actual API integrations.

## Supported OTAs

### 1. Booking.com (Channel Manager API)

**Documentation**: https://connect.booking.com/user_guide/site/en-US/

**Authentication**: API Key + Property ID

**Key Endpoints**:
- `POST /v2.1/bookings` - Retrieve new bookings
- `POST /v2.1/availability` - Update room availability
- `POST /v2.1/rates` - Update room rates
- `GET /v2.1/reservations` - Fetch reservations

**Required Credentials**:
```typescript
{
  hotelId: string;      // Property ID from Booking.com
  apiKey: string;       // API authentication key
  endpoint: string;     // API endpoint URL (production/sandbox)
}
```

**Implementation Notes**:
- Uses XML-based API
- Requires property verification
- Rate limiting: 1000 requests/minute
- Supports push/pull models
- Real-time inventory sync

**Example Request** (Push Availability):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<request>
  <hotel_id>12345</hotel_id>
  <room_id>DELUXE</room_id>
  <date_from>2026-01-01</date_from>
  <date_to>2026-01-31</date_to>
  <availability>10</availability>
</request>
```

### 2. Expedia (Rapid API / EPS)

**Documentation**: https://developers.expediagroup.com/

**Authentication**: API Key + Secret

**Key Endpoints**:
- `POST /v3/properties/{propertyId}/availability` - Update availability
- `POST /v3/properties/{propertyId}/rates` - Update rates
- `GET /v3/bookings` - Retrieve bookings
- `POST /v3/bookings/{bookingId}/confirm` - Confirm booking

**Required Credentials**:
```typescript
{
  propertyId: string;   // Expedia Property ID
  apiKey: string;       // API Key
  secret: string;       // API Secret
  endpoint: string;     // API base URL
}
```

**Implementation Notes**:
- RESTful JSON API
- OAuth 2.0 authentication
- Webhook support for real-time updates
- Rate limiting: 10 requests/second
- Sandbox environment available

**Example Request** (Update Rates):
```json
{
  "property_id": "12345",
  "room_type_id": "DELUXE",
  "date_from": "2026-01-01",
  "date_to": "2026-01-31",
  "rate": 150.00,
  "currency": "USD"
}
```

### 3. MakeMyTrip (Extranet API)

**Documentation**: Contact MakeMyTrip B2B team for API access

**Authentication**: Hotel ID + API Token

**Key Endpoints**:
- `POST /api/v1/inventory/update` - Update inventory
- `POST /api/v1/rates/update` - Update rates
- `GET /api/v1/bookings` - Fetch bookings
- `POST /api/v1/bookings/confirm` - Confirm booking

**Required Credentials**:
```typescript
{
  hotelId: string;      // MMT Hotel ID
  apiToken: string;     // API authentication token
  endpoint: string;     // API base URL
}
```

**Implementation Notes**:
- JSON-based REST API
- Token-based authentication
- India-focused platform
- Supports INR currency
- Manual property onboarding required

**Example Request** (Push Inventory):
```json
{
  "hotel_id": "MMT12345",
  "room_type": "DELUXE",
  "check_in": "2026-01-01",
  "check_out": "2026-01-31",
  "inventory": 10,
  "rate": 5000,
  "currency": "INR"
}
```

### 4. Agoda (YCS - Yield Control System)

**Documentation**: https://ycs.agoda.com/

**Authentication**: Property ID + Username + Password

**Key Endpoints**:
- `POST /YCS/UpdateAvailability` - Update availability
- `POST /YCS/UpdateRates` - Update rates
- `GET /YCS/RetrieveBookings` - Get bookings
- `POST /YCS/ConfirmBooking` - Confirm reservation

**Required Credentials**:
```typescript
{
  propertyId: string;   // Agoda Property ID
  username: string;     // YCS username
  password: string;     // YCS password
  endpoint: string;     // YCS endpoint URL
}
```

**Implementation Notes**:
- SOAP-based API (XML)
- Session-based authentication
- Strong focus on APAC region
- Daily rate push recommended
- Requires channel manager certification

## Implementation Steps

### Step 1: Obtain API Credentials

Each OTA requires registration and approval:

1. **Booking.com**: Sign up at https://partner.booking.com/
2. **Expedia**: Register at https://developer.expediagroup.com/
3. **MakeMyTrip**: Contact B2B sales team
4. **Agoda**: Apply through partner portal

### Step 2: Update Adapter Files

Replace simulated code in:
- `backend/src/services/adapters/BookingComAdapter.ts`
- `backend/src/services/adapters/ExpediaAdapter.ts`
- `backend/src/services/adapters/MakeMyTripAdapter.ts`
- `backend/src/services/adapters/AgodaAdapter.ts`

### Step 3: Add HTTP Client

Install axios or use native fetch:
```bash
npm install axios
```

### Step 4: Implement Real API Calls

Example for Booking.com rate push:
```typescript
async pushRates(credentials, mappings, rates) {
  const response = await axios.post(
    `${credentials.endpoint}/v2.1/rates`,
    {
      hotel_id: credentials.hotelId,
      rates: rates.map(r => ({
        room_id: r.otaRoomTypeId,
        date: r.date,
        rate: r.rate,
        currency: r.currency
      }))
    },
    {
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return this.createResult(
    response.data.success,
    response.data.processed,
    response.data.failed,
    response.data.errors
  );
}
```

### Step 5: Add Error Handling

Implement retry logic and proper error handling:
```typescript
async callOTAApi(apiCall: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await this.delay(Math.pow(2, i) * 1000); // Exponential backoff
    }
  }
}
```

### Step 6: Add Logging

Log all OTA API calls for debugging:
```typescript
import { logger } from '../config/logger.js';

logger.info('OTA API Call', {
  provider: 'BOOKING_COM',
  operation: 'pushRates',
  hotelId: credentials.hotelId,
  rateCount: rates.length
});
```

### Step 7: Configure Webhooks

Set up webhook endpoints for real-time updates:
```typescript
// backend/src/routes/webhooks/ota.router.ts
router.post('/webhooks/ota/:provider/booking', async (req, res) => {
  const { provider } = req.params;
  const bookingData = req.body;
  
  // Verify webhook signature
  // Process booking
  // Store in database
  
  res.status(200).json({ received: true });
});
```

## Security Considerations

1. **Credentials Storage**: Store API keys in environment variables
2. **Encryption**: Encrypt credentials in database
3. **HTTPS Only**: All OTA communication must use HTTPS
4. **Rate Limiting**: Implement rate limiting to avoid API throttling
5. **Webhook Validation**: Verify webhook signatures

## Testing

### Sandbox Environments

- **Booking.com**: https://sandbox.booking.com
- **Expedia**: https://test.ean.com
- **MakeMyTrip**: Contact for sandbox access
- **Agoda**: Contact for test credentials

### Test Scenarios

1. Connection test
2. Rate push (single day, multiple days)
3. Inventory push
4. Booking retrieval
5. Booking confirmation
6. Error handling (invalid credentials, rate limits, etc.)

## Monitoring & Alerts

Set up monitoring for:
- API response times
- Error rates
- Sync failures
- Webhook delivery failures

## Compliance

Each OTA has certification requirements:
- API integration must be tested and approved
- Regular sync frequency requirements
- Data accuracy requirements
- Response time SLAs

## Cost Considerations

- API usage fees (varies by OTA)
- Channel manager fees
- Transaction fees per booking
- Setup and integration costs

## Support

- **Booking.com**: partner.support@booking.com
- **Expedia**: developer@expediagroup.com
- **MakeMyTrip**: B2B support team
- **Agoda**: Partner support portal

## Next Steps

1. Choose OTAs to integrate
2. Apply for API access
3. Obtain sandbox credentials
4. Implement and test integration
5. Get certification approval
6. Deploy to production

---

**Note**: The current implementation uses simulated adapters for development and demonstration purposes. Production deployment requires actual API credentials and proper certification from each OTA platform.
