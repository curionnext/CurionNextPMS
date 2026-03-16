$ErrorActionPreference = "Continue"
$base = "http://localhost:4001/api"
$results = @()

function ApiCall {
    param($Method, $Url, $Body, $Token)
    $headers = @{}
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    try {
        $params = @{
            Uri             = "$base$Url"
            Method          = $Method
            ContentType     = "application/json"
            UseBasicParsing = $true
            Headers         = $headers
        }
        if ($Body) { $params["Body"] = ($Body | ConvertTo-Json -Depth 5) }
        $r = Invoke-WebRequest @params
        $parsed = $r.Content | ConvertFrom-Json
        return @{ok = $true; data = $parsed; status = [int]$r.StatusCode }
    }
    catch {
        $status = 0
        $detail = ""
        try { $status = [int]$_.Exception.Response.StatusCode } catch {}
        try { 
            $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $detail = $sr.ReadToEnd()
            $sr.Close()
        }
        catch {}
        return @{ok = $false; status = $status; detail = $detail; message = $_.Exception.Message }
    }
}

function Log($test, $pass, $msg) {
    $tag = if ($pass) { "PASS" } else { "FAIL" }
    $script:results += "$tag | $test | $msg"
}

# ==========================================
# 1. AUTH
# ==========================================
$login = ApiCall POST "/auth/login" @{hotelCode = "HOTEL001"; username = "admin"; password = "Password!123"; shiftName = "TestShift" }
if ($login.ok -and $login.data.data.token) {
    Log "Login" $true "JWT obtained"
    $token = $login.data.data.token
    $userId = $login.data.data.user.id
    $hotelId = $login.data.data.user.hotelId
    $hotelCode = $login.data.data.user.hotelCode
}
else {
    Log "Login" $false "BLOCKED: $($login.detail)"
    $results | Out-File -FilePath "test-results.txt" -Encoding utf8
    exit 1
}

# Wrong credentials
$bad = ApiCall POST "/auth/login" @{hotelCode = "HOTEL001"; username = "admin"; password = "WRONG"; shiftName = "Morning" }
Log "Wrong Password" (-not $bad.ok -and $bad.status -eq 401) "Status: $($bad.status)"

# Missing fields
$bad2 = ApiCall POST "/auth/login" @{hotelCode = "HOTEL001"; username = "admin" }
Log "Missing Fields" (-not $bad2.ok -and $bad2.status -eq 400) "Status: $($bad2.status)"

# Auth/me
$me = ApiCall GET "/auth/me" $null $token
Log "Auth Me" ($me.ok -and $me.data.data.user) "User: $($me.data.data.user.username)"

# No token
$noAuth = ApiCall GET "/auth/me" $null $null
Log "No Token Rejected" (-not $noAuth.ok -and $noAuth.status -eq 401) "Status: $($noAuth.status)"

# ==========================================
# 2. PROPERTY
# ==========================================
$prop = ApiCall GET "/property/profile" $null $token
Log "Property Profile" ($prop.ok) "Name: $($prop.data.data.hotelName)"

$rooms = ApiCall GET "/property/rooms" $null $token
Log "List Rooms" ($rooms.ok) "Count: $($rooms.data.data.Count)"

$roomTypes = ApiCall GET "/property/room-types" $null $token
Log "List Room Types" ($roomTypes.ok) "Count: $($roomTypes.data.data.Count)"

# CORRECTED: /taxes not /tax
$tax = ApiCall GET "/property/taxes" $null $token
Log "Tax Config" ($tax.ok) "Loaded"

$floors = ApiCall GET "/property/floors" $null $token
Log "List Floors" ($floors.ok) "Count: $($floors.data.data.Count)"

# ==========================================
# 3. RESERVATIONS
# ==========================================
$res = ApiCall GET "/reservations" $null $token
$resCount = 0
if ($res.ok -and $res.data.data.reservations) { $resCount = $res.data.data.reservations.Count }
Log "List Reservations" ($res.ok) "Count: $resCount"

# Get availability
$avail = ApiCall GET "/reservations/availability?arrivalDate=2026-04-01&departureDate=2026-04-03&roomType=Deluxe" $null $token
Log "Check Availability" ($avail.ok) "$(if($avail.ok){'Loaded'}else{"$($avail.status): $($avail.detail)"})"

# Create guest first (needed for reservation)
$newGuest = ApiCall POST "/guests" @{
    hotelId     = $hotelId
    hotelCode   = $hotelCode
    firstName   = "Integration"
    lastName    = "Test"
    email       = "integration@test.com"
    phone       = "+919876543210"
    nationality = "IN"
} $token
$guestId = $null
if ($newGuest.ok) { 
    $guestId = $newGuest.data.data.id
    Log "Create Guest" $true "ID: $guestId"
}
else {
    Log "Create Guest" $false "$($newGuest.status): $($newGuest.detail)"
}

# Create reservation with proper schema
if ($guestId) {
    $newRes = ApiCall POST "/reservations" @{
        hotelId       = $hotelId
        hotelCode     = $hotelCode
        guestId       = $guestId
        roomType      = "Deluxe"
        arrivalDate   = "2026-04-10"
        departureDate = "2026-04-12"
        adults        = 2
        children      = 0
        nightlyRate   = 5000
        ratePlan      = "BAR"
        source        = "DIRECT"
    } $token
    if ($newRes.ok) {
        $resId = $newRes.data.data.reservation.id
        Log "Create Reservation" $true "ID: $resId"
    }
    else {
        $resId = $null
        Log "Create Reservation" $false "$($newRes.status): $($newRes.detail)"
    }
}

# Update reservation
if ($resId) {
    $upd = ApiCall PUT "/reservations/$resId" @{nightlyRate = 5500; notes = "Updated by test" } $token
    Log "Update Reservation" ($upd.ok) "$(if($upd.ok){'Updated'}else{"$($upd.status): $($upd.detail)"})"
}

# ==========================================
# 4. GUESTS
# ==========================================
$guests = ApiCall GET "/guests" $null $token
Log "List Guests" ($guests.ok) "Count: $($guests.data.data.Count)"

if ($guestId) {
    $oneGuest = ApiCall GET "/guests/$guestId" $null $token
    Log "Get Guest By ID" ($oneGuest.ok) "$(if($oneGuest.ok){'Found'}else{"$($oneGuest.status)"})"
}

# ==========================================
# 5. CHECK-IN / CHECK-OUT
# ==========================================
# First get an available room
$availRoomId = $null
if ($rooms.ok -and $rooms.data.data.Count -gt 0) {
    foreach ($rm in $rooms.data.data) {
        if ($rm.status -eq "AVAILABLE") {
            $availRoomId = $rm.id
            break
        }
    }
}

# Assign room then check in
if ($resId -and $availRoomId) {
    $assign = ApiCall PUT "/operations/room/assign" @{reservationId = $resId; roomId = $availRoomId } $token
    Log "Assign Room" ($assign.ok) "$(if($assign.ok){'Assigned'}else{"$($assign.status): $($assign.detail)"})"

    $ci = ApiCall POST "/operations/checkin" @{reservationId = $resId; roomId = $availRoomId } $token
    Log "Check-In" ($ci.ok) "$(if($ci.ok){'Checked in'}else{"$($ci.status): $($ci.detail)"})"
}
elseif ($resId) {
    # Try checkin without room assignment
    $ci = ApiCall POST "/operations/checkin" @{reservationId = $resId } $token
    Log "Check-In (no room)" ($ci.ok) "$(if($ci.ok){'Checked in'}else{"$($ci.status): $($ci.detail)"})"
}

# ==========================================
# 6. BILLING
# ==========================================
if ($resId) {
    $bill = ApiCall GET "/billing/$resId" $null $token
    Log "Get Billing" ($bill.ok) "$(if($bill.ok){'Loaded'}else{"$($bill.status): $($bill.detail)"})"
}

# ==========================================
# 7. DASHBOARD
# ==========================================
$dash = ApiCall GET "/dashboard/summary" $null $token
Log "Dashboard Summary" ($dash.ok) "$(if($dash.ok){'Loaded'}else{$dash.detail})"

# ==========================================
# 8. ALERTS
# ==========================================
$alerts = ApiCall GET "/alerts" $null $token
Log "Alerts" ($alerts.ok) "$(if($alerts.ok){'Loaded'}else{$alerts.detail})"

# ==========================================
# 9. REPORTS
# ==========================================
$rev = ApiCall GET "/reports/revenue?period=daily" $null $token
Log "Revenue Report" ($rev.ok) "$(if($rev.ok){'Loaded'}else{$rev.detail})"

# ==========================================
# 10. CHECK-OUT
# ==========================================
if ($resId) {
    $co = ApiCall POST "/operations/checkout" @{reservationId = $resId } $token
    Log "Check-Out" ($co.ok) "$(if($co.ok){'Checked out'}else{"$($co.status): $($co.detail)"})"
}

# ==========================================
# 11. OTA (corrected endpoints)
# ==========================================
$otaCh = ApiCall GET "/ota/channels" $null $token
Log "OTA Channels" ($otaCh.ok) "$(if($otaCh.ok){'Loaded'}else{"$($otaCh.status): $($otaCh.detail)"})"

$otaLogs = ApiCall GET "/ota/sync-logs" $null $token
Log "OTA Sync Logs" ($otaLogs.ok) "$(if($otaLogs.ok){'Loaded'}else{"$($otaLogs.status): $($otaLogs.detail)"})"

# ==========================================
# 12. WHATSAPP
# ==========================================
$wa = ApiCall GET "/whatsapp/config" $null $token
Log "WhatsApp Config" ($wa.ok) "$(if($wa.ok){'Loaded'}else{"$($wa.status): $($wa.detail)"})"

# ==========================================
# 13. MULTI-PROPERTY
# ==========================================
$mp = ApiCall GET "/multi-property/properties" $null $token
Log "Multi-Property List" ($mp.ok) "$(if($mp.ok){'Loaded'}else{$mp.detail})"

# ==========================================
# 14. NIGHT AUDIT (corrected endpoints)
# ==========================================
$naList = ApiCall GET "/night-audit" $null $token
Log "Night Audit List" ($naList.ok) "$(if($naList.ok){'Loaded'}else{"$($naList.status): $($naList.detail)"})"

$naLatest = ApiCall GET "/night-audit/latest" $null $token
Log "Night Audit Latest" ($naLatest.ok -or $naLatest.status -eq 404) "$(if($naLatest.ok){'Loaded'}else{"$($naLatest.status): $($naLatest.detail)"})"

$naCheck = ApiCall GET "/night-audit/check-required" $null $token
Log "Night Audit Check" ($naCheck.ok) "$(if($naCheck.ok){'Loaded'}else{"$($naCheck.status): $($naCheck.detail)"})"

# ==========================================
# 15. TRANSACTION LOGS
# ==========================================
$tl = ApiCall GET "/transaction-logs" $null $token
Log "Transaction Logs" ($tl.ok) "$(if($tl.ok){'Loaded'}else{"$($tl.status): $($tl.detail)"})"

# ==========================================
# 16. DELETE RESERVATION (cleanup)
# ==========================================
if ($resId) {
    $del = ApiCall DELETE "/reservations/$resId" $null $token
    Log "Delete Reservation" ($del.ok -or $del.status -eq 204) "$(if($del.ok -or $del.status -eq 204){'Deleted'}else{"$($del.status): $($del.detail)"})"
}

# ==========================================
# 17. LOGOUT
# ==========================================
$logout = ApiCall POST "/auth/logout" $null $token
Log "Logout" ($logout.ok) "$(if($logout.ok){'Shift closed'}else{$logout.detail})"

# Write results
$results | Out-File -FilePath "test-results.txt" -Encoding utf8
$pass = ($results | Where-Object { $_ -match '^PASS' }).Count
$fail = ($results | Where-Object { $_ -match '^FAIL' }).Count
"---SUMMARY: PASS=$pass FAIL=$fail---" | Out-File -FilePath "test-results.txt" -Append -Encoding utf8
Write-Host "PASS: $pass  FAIL: $fail"
