#!/usr/bin/env python3
"""
Service Consolidation Script for BookedBarber V2

This script identifies and archives duplicate service files to reduce code bloat
while maintaining the working service implementations.
"""

import shutil
from pathlib import Path
from datetime import datetime

def create_consolidation_report():
    """Create a report of service consolidation actions."""
    
    backend_dir = Path(__file__).parent.parent
    services_dir = backend_dir / "services"
    archived_dir = backend_dir / "archived" / "services" / f"consolidation_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Services to consolidate
    booking_services = [
        "booking_service.py",           # KEEP - Used by appointments router
        "booking_service_enhanced.py",  # ARCHIVE - Duplicate functionality
        "booking_service_wrapper.py",   # ARCHIVE - Wrapper around main service
        "cached_booking_service.py",    # ARCHIVE - Caching layer not used
        "enhanced_booking_service.py",  # ARCHIVE - Enhanced version not used
    ]
    
    calendar_services = [
        "google_calendar_service.py",                    # KEEP - Main service
        "enhanced_google_calendar_service.py",          # ARCHIVE - Duplicate
        "google_calendar_integration_service.py",       # ARCHIVE - Duplicate
        "calendar_sync_service.py",                      # ARCHIVE - Specific sync feature
        "calendar_twoway_sync_service.py",              # ARCHIVE - Enhanced sync
        "calendar_webhook_service.py",                  # ARCHIVE - Webhook handling
    ]
    
    analytics_services = [
        "analytics_service.py",                 # KEEP - Main analytics
        "enhanced_analytics_service.py",        # ARCHIVE - Enhanced version
        "enterprise_analytics_service.py",     # ARCHIVE - Enterprise features
        "enterprise_analytics_service_mock.py", # ARCHIVE - Mock version
        "email_analytics.py",                   # ARCHIVE - Specific email analytics
    ]
    
    print("📊 BookedBarber V2 Service Consolidation Report")
    print("=" * 55)
    print(f"Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    total_services = 0
    services_to_archive = 0
    services_to_keep = 0
    
    # Analyze booking services
    print("🔄 Booking Services Analysis")
    print("-" * 30)
    for service in booking_services:
        service_path = services_dir / service
        if service_path.exists():
            total_services += 1
            if service == "booking_service.py":
                print(f"✅ KEEP    {service} (Used by appointments router)")
                services_to_keep += 1
            else:
                print(f"📦 ARCHIVE {service} (Duplicate functionality)")
                services_to_archive += 1
        else:
            print(f"❌ MISSING {service}")
    
    print()
    
    # Analyze calendar services  
    print("📅 Calendar Services Analysis")
    print("-" * 30)
    for service in calendar_services:
        service_path = services_dir / service
        if service_path.exists():
            total_services += 1
            if service == "google_calendar_service.py":
                print(f"✅ KEEP    {service} (Main calendar service)")
                services_to_keep += 1
            else:
                print(f"📦 ARCHIVE {service} (Duplicate functionality)")
                services_to_archive += 1
        else:
            print(f"❌ MISSING {service}")
    
    print()
    
    # Analyze analytics services
    print("📈 Analytics Services Analysis")
    print("-" * 30)
    for service in analytics_services:
        service_path = services_dir / service
        if service_path.exists():
            total_services += 1
            if service == "analytics_service.py":
                print(f"✅ KEEP    {service} (Main analytics service)")
                services_to_keep += 1
            else:
                print(f"📦 ARCHIVE {service} (Duplicate functionality)")
                services_to_archive += 1
        else:
            print(f"❌ MISSING {service}")
    
    print()
    print("=" * 55)
    print("📊 CONSOLIDATION SUMMARY")
    print("=" * 55)
    print(f"Total Services Analyzed: {total_services}")
    print(f"Services to Keep: {services_to_keep}")
    print(f"Services to Archive: {services_to_archive}")
    print(f"Potential Reduction: {services_to_archive}/{total_services} ({(services_to_archive/total_services*100):.1f}%)")
    
    return {
        'booking_services': booking_services,
        'calendar_services': calendar_services,
        'analytics_services': analytics_services,
        'archive_dir': archived_dir,
        'services_dir': services_dir,
        'stats': {
            'total': total_services,
            'keep': services_to_keep,
            'archive': services_to_archive
        }
    }

def perform_consolidation(dry_run=True):
    """Perform the actual service consolidation."""
    
    report = create_consolidation_report()
    
    if dry_run:
        print()
        print("🔍 DRY RUN MODE - No files will be moved")
        print("   Run with --execute to perform actual consolidation")
        return report
        
    print()
    print("🚀 PERFORMING CONSOLIDATION...")
    print("-" * 30)
    
    # Create archive directory
    archive_dir = report['archive_dir']
    archive_dir.mkdir(parents=True, exist_ok=True)
    
    services_dir = report['services_dir']
    archived_count = 0
    
    # Archive services (excluding the ones to keep)
    all_services = (
        report['booking_services'][1:] +  # Skip first (keep)
        report['calendar_services'][1:] + # Skip first (keep)  
        report['analytics_services'][1:]  # Skip first (keep)
    )
    
    for service in all_services:
        service_path = services_dir / service
        if service_path.exists():
            archive_path = archive_dir / service
            shutil.move(str(service_path), str(archive_path))
            print(f"📦 Archived: {service}")
            archived_count += 1
    
    # Create consolidation log
    log_content = f"""# BookedBarber V2 Service Consolidation Log

Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Archive Location: {archive_dir}

## Services Archived ({archived_count} files)

### Booking Services
"""
    
    for service in report['booking_services'][1:]:
        if (archive_dir / service).exists():
            log_content += f"- {service} (Duplicate of booking_service.py)\n"
    
    log_content += "\n### Calendar Services\n"
    for service in report['calendar_services'][1:]:
        if (archive_dir / service).exists():
            log_content += f"- {service} (Duplicate of google_calendar_service.py)\n"
            
    log_content += "\n### Analytics Services\n"
    for service in report['analytics_services'][1:]:
        if (archive_dir / service).exists():
            log_content += f"- {service} (Duplicate of analytics_service.py)\n"
    
    log_content += f"""
## Services Kept

- booking_service.py (Used by appointments router)
- google_calendar_service.py (Main calendar service)
- analytics_service.py (Main analytics service)

## Recovery Instructions

To restore any archived service:
```bash
cp {archive_dir}/[service_name] {services_dir}/[service_name]
```

## Statistics

- Total services analyzed: {report['stats']['total']}
- Services archived: {archived_count}
- Services kept: {report['stats']['keep']}
- Code reduction: {(archived_count/report['stats']['total']*100):.1f}%
"""
    
    log_path = archive_dir / "CONSOLIDATION_LOG.md"
    with open(log_path, 'w') as f:
        f.write(log_content)
    
    print(f"✅ Consolidation completed!")
    print(f"   Archived {archived_count} duplicate services")
    print(f"   Archive location: {archive_dir}")
    print(f"   Log file: {log_path}")
    
    return report

def main():
    """Main entry point."""
    import sys
    
    if "--execute" in sys.argv:
        perform_consolidation(dry_run=False)
    elif "--report" in sys.argv:
        create_consolidation_report()
    else:
        print("BookedBarber V2 Service Consolidation")
        print()
        print("Usage:")
        print("  python consolidate_services.py           # Dry run (shows what would be done)")
        print("  python consolidate_services.py --execute # Actually perform consolidation")
        print("  python consolidate_services.py --report  # Generate report only")
        print()
        perform_consolidation(dry_run=True)

if __name__ == "__main__":
    main()