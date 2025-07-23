-- Create hybrid payment system tables

-- Payment processor connections table
CREATE TABLE IF NOT EXISTS payment_processor_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barber_id INTEGER NOT NULL REFERENCES users(id),
    processor_type VARCHAR(50) NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    account_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    connection_data JSON,
    webhook_url VARCHAR(500),
    webhook_secret VARCHAR(255),
    supports_payments BOOLEAN NOT NULL DEFAULT 1,
    supports_refunds BOOLEAN NOT NULL DEFAULT 1,
    supports_recurring BOOLEAN NOT NULL DEFAULT 0,
    default_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    processing_fees JSON,
    last_sync_at DATETIME,
    last_transaction_at DATETIME,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    total_volume REAL NOT NULL DEFAULT 0.0,
    connected_at DATETIME,
    disconnected_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_error TEXT,
    error_count INTEGER NOT NULL DEFAULT 0
);

-- External transactions table
CREATE TABLE IF NOT EXISTS external_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connection_id INTEGER NOT NULL REFERENCES payment_processor_connections(id),
    appointment_id INTEGER REFERENCES appointments(id),
    external_transaction_id VARCHAR(255) NOT NULL,
    external_charge_id VARCHAR(255),
    external_customer_id VARCHAR(255),
    amount REAL NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    processing_fee REAL NOT NULL DEFAULT 0.0,
    net_amount REAL NOT NULL,
    payment_method VARCHAR(50),
    last_four VARCHAR(4),
    brand VARCHAR(20),
    status VARCHAR(20) NOT NULL,
    processed_at DATETIME,
    refunded_at DATETIME,
    refund_amount REAL NOT NULL DEFAULT 0.0,
    commission_rate REAL,
    commission_amount REAL NOT NULL DEFAULT 0.0,
    commission_collected BOOLEAN NOT NULL DEFAULT 0,
    external_metadata JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Platform collections table
CREATE TABLE IF NOT EXISTS platform_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barber_id INTEGER NOT NULL REFERENCES users(id),
    connection_id INTEGER REFERENCES payment_processor_connections(id),
    external_transaction_id INTEGER REFERENCES external_transactions(id),
    collection_type VARCHAR(20) NOT NULL,
    amount REAL NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    description TEXT,
    reference_id VARCHAR(255),
    reference_type VARCHAR(50),
    period_start DATETIME,
    period_end DATETIME,
    due_date DATETIME NOT NULL,
    grace_period_days INTEGER NOT NULL DEFAULT 7,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    collection_method VARCHAR(50),
    collection_account VARCHAR(255),
    external_collection_id VARCHAR(255),
    collected_at DATETIME,
    failed_at DATETIME,
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at DATETIME,
    failure_reason TEXT,
    dispute_reason TEXT,
    waived_reason TEXT,
    waived_by_id INTEGER REFERENCES users(id),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Hybrid payment configs table
CREATE TABLE IF NOT EXISTS hybrid_payment_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barber_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    payment_mode VARCHAR(20) NOT NULL DEFAULT 'centralized',
    primary_processor VARCHAR(50),
    fallback_to_platform BOOLEAN NOT NULL DEFAULT 1,
    collection_method VARCHAR(50) NOT NULL DEFAULT 'ach',
    collection_frequency VARCHAR(20) NOT NULL DEFAULT 'weekly',
    collection_day INTEGER,
    auto_collection BOOLEAN NOT NULL DEFAULT 1,
    minimum_collection_amount REAL NOT NULL DEFAULT 10.0,
    collection_buffer_days INTEGER NOT NULL DEFAULT 3,
    maximum_outstanding REAL NOT NULL DEFAULT 1000.0,
    notify_before_collection BOOLEAN NOT NULL DEFAULT 1,
    notification_days_ahead INTEGER NOT NULL DEFAULT 2,
    collection_email VARCHAR(255),
    collection_phone VARCHAR(20),
    bank_account_config JSON,
    backup_payment_method VARCHAR(255),
    enable_installments BOOLEAN NOT NULL DEFAULT 0,
    enable_early_payment_discount BOOLEAN NOT NULL DEFAULT 0,
    early_payment_discount_rate REAL NOT NULL DEFAULT 0.02,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_collection_at DATETIME
);

-- Payment mode history table
CREATE TABLE IF NOT EXISTS payment_mode_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barber_id INTEGER NOT NULL REFERENCES users(id),
    previous_mode VARCHAR(20),
    new_mode VARCHAR(20) NOT NULL,
    change_reason TEXT,
    changed_by_id INTEGER REFERENCES users(id),
    effective_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pending_collections_affected INTEGER NOT NULL DEFAULT 0,
    active_connections_affected INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_processor_connections_barber_status ON payment_processor_connections(barber_id, status);
CREATE INDEX IF NOT EXISTS idx_external_transactions_connection_status ON external_transactions(connection_id, status);
CREATE INDEX IF NOT EXISTS idx_external_transactions_appointment ON external_transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_platform_collections_barber_status ON platform_collections(barber_id, status);
CREATE INDEX IF NOT EXISTS idx_platform_collections_due_date ON platform_collections(due_date);
CREATE INDEX IF NOT EXISTS idx_platform_collections_type_status ON platform_collections(collection_type, status);
CREATE INDEX IF NOT EXISTS idx_payment_mode_history_barber ON payment_mode_history(barber_id);
CREATE INDEX IF NOT EXISTS idx_hybrid_payment_configs_barber ON hybrid_payment_configs(barber_id);