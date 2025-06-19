-- Check Trafft Integration Data
-- Run these queries in Render Shell

-- 1. Check if we have any appointments from Trafft
SELECT COUNT(*) as trafft_appointments 
FROM appointments 
WHERE trafft_appointment_id IS NOT NULL;

-- 2. Show recent appointments with Trafft IDs
SELECT 
    id,
    trafft_appointment_id,
    trafft_booking_uuid,
    appointment_date,
    appointment_time,
    service_name,
    service_revenue,
    status,
    trafft_sync_status,
    trafft_last_sync,
    created_at
FROM appointments 
WHERE trafft_appointment_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 3. Check barbers with Trafft employee emails
SELECT 
    id,
    first_name,
    last_name,
    email,
    trafft_employee_email,
    created_at
FROM barbers
WHERE trafft_employee_email IS NOT NULL
ORDER BY created_at DESC;

-- 4. Check recently created clients
SELECT 
    id,
    first_name,
    last_name,
    email,
    phone,
    total_visits,
    created_at
FROM clients
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check appointment details with client and barber names
SELECT 
    a.trafft_appointment_id,
    a.appointment_date,
    a.service_name,
    a.service_revenue,
    a.status,
    c.first_name || ' ' || c.last_name as client_name,
    b.first_name || ' ' || b.last_name as barber_name,
    a.trafft_location_name
FROM appointments a
LEFT JOIN clients c ON a.client_id = c.id
LEFT JOIN barbers b ON a.barber_id = b.id
WHERE a.trafft_appointment_id IS NOT NULL
ORDER BY a.created_at DESC
LIMIT 5;

-- 6. Summary statistics
SELECT 
    'Total Trafft Appointments' as metric,
    COUNT(*) as count
FROM appointments 
WHERE trafft_appointment_id IS NOT NULL
UNION ALL
SELECT 
    'Trafft Barbers Connected',
    COUNT(DISTINCT barber_id)
FROM appointments 
WHERE trafft_appointment_id IS NOT NULL
UNION ALL
SELECT 
    'Trafft Clients Imported',
    COUNT(DISTINCT client_id)
FROM appointments 
WHERE trafft_appointment_id IS NOT NULL;