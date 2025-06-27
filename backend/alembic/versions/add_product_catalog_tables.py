"""Add product catalog tables

Revision ID: add_product_catalog_tables
Revises: 20250627120000_add_shopify_integration_tables
Create Date: 2025-06-27 14:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_product_catalog_tables"
down_revision = "20250627120000"
branch_labels = None
depends_on = None


def upgrade():
    # Create products table
    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sku", sa.String(length=100), nullable=True),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("cost_price", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("compare_at_price", sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("subcategory", sa.String(length=100), nullable=True),
        sa.Column("brand", sa.String(length=100), nullable=True),
        sa.Column("tags", sa.Text(), nullable=True),
        sa.Column("track_inventory", sa.Boolean(), nullable=True),
        sa.Column("inventory_quantity", sa.Integer(), nullable=True),
        sa.Column("low_stock_threshold", sa.Integer(), nullable=True),
        sa.Column("allow_oversell", sa.Boolean(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "active",
                "inactive",
                "out_of_stock",
                "discontinued",
                name="productstatus",
            ),
            nullable=True,
        ),
        sa.Column("is_featured", sa.Boolean(), nullable=True),
        sa.Column(
            "source",
            sa.Enum("manual", "square", "shopify", name="productsource"),
            nullable=True,
        ),
        sa.Column(
            "sync_status",
            sa.Enum("pending", "synced", "error", "manual", name="syncstatus"),
            nullable=True,
        ),
        sa.Column("square_catalog_id", sa.String(length=100), nullable=True),
        sa.Column("square_variation_id", sa.String(length=100), nullable=True),
        sa.Column("square_location_id", sa.String(length=100), nullable=True),
        sa.Column("square_category_id", sa.String(length=100), nullable=True),
        sa.Column("shopify_product_id", sa.String(length=100), nullable=True),
        sa.Column("shopify_variant_id", sa.String(length=100), nullable=True),
        sa.Column("shopify_handle", sa.String(length=255), nullable=True),
        sa.Column("shopify_collection_id", sa.String(length=100), nullable=True),
        sa.Column("last_sync_at", sa.DateTime(), nullable=True),
        sa.Column("last_sync_error", sa.Text(), nullable=True),
        sa.Column("sync_attempts", sa.Integer(), nullable=True),
        sa.Column("external_updated_at", sa.DateTime(), nullable=True),
        sa.Column("commission_rate", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("commission_type", sa.String(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["updated_by"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for products table
    op.create_index(op.f("ix_products_id"), "products", ["id"], unique=False)
    op.create_index(op.f("ix_products_name"), "products", ["name"], unique=False)
    op.create_index(op.f("ix_products_sku"), "products", ["sku"], unique=True)
    op.create_index(
        op.f("ix_products_category"), "products", ["category"], unique=False
    )
    op.create_index(op.f("ix_products_status"), "products", ["status"], unique=False)
    op.create_index(op.f("ix_products_source"), "products", ["source"], unique=False)
    op.create_index(
        op.f("ix_products_sync_status"), "products", ["sync_status"], unique=False
    )
    op.create_index(
        op.f("ix_products_square_catalog_id"),
        "products",
        ["square_catalog_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_products_square_variation_id"),
        "products",
        ["square_variation_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_products_shopify_product_id"),
        "products",
        ["shopify_product_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_products_shopify_variant_id"),
        "products",
        ["shopify_variant_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_products_shopify_handle"), "products", ["shopify_handle"], unique=True
    )

    # Create product_categories table
    op.create_table(
        "product_categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=True),
        sa.Column("square_category_id", sa.String(length=100), nullable=True),
        sa.Column("shopify_collection_id", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["parent_id"],
            ["product_categories.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index(
        op.f("ix_product_categories_id"), "product_categories", ["id"], unique=False
    )

    # Create product_sync_logs table
    op.create_table(
        "product_sync_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("sync_type", sa.String(length=20), nullable=False),
        sa.Column(
            "source_platform",
            sa.Enum("manual", "square", "shopify", name="productsource"),
            nullable=False,
        ),
        sa.Column("sync_direction", sa.String(length=10), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "synced", "error", "manual", name="syncstatus"),
            nullable=False,
        ),
        sa.Column("records_processed", sa.Integer(), nullable=True),
        sa.Column("records_created", sa.Integer(), nullable=True),
        sa.Column("records_updated", sa.Integer(), nullable=True),
        sa.Column("records_failed", sa.Integer(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("error_code", sa.String(length=50), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("initiated_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(
            ["initiated_by"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_product_sync_logs_id"), "product_sync_logs", ["id"], unique=False
    )
    op.create_index(
        op.f("ix_product_sync_logs_product_id"),
        "product_sync_logs",
        ["product_id"],
        unique=False,
    )

    # Add product_id column to product_sales table to link to unified catalog
    try:
        op.add_column(
            "product_sales", sa.Column("product_id", sa.Integer(), nullable=True)
        )
        op.create_foreign_key(
            "fk_product_sales_product_id",
            "product_sales",
            "products",
            ["product_id"],
            ["id"],
        )
    except Exception as e:
        # Column might already exist from previous migration attempts
        print(f"Note: product_id column may already exist in product_sales: {e}")

    # Set default values for new columns
    op.execute(
        "UPDATE products SET track_inventory = true WHERE track_inventory IS NULL"
    )
    op.execute(
        "UPDATE products SET inventory_quantity = 0 WHERE inventory_quantity IS NULL"
    )
    op.execute(
        "UPDATE products SET low_stock_threshold = 5 WHERE low_stock_threshold IS NULL"
    )
    op.execute(
        "UPDATE products SET allow_oversell = false WHERE allow_oversell IS NULL"
    )
    op.execute("UPDATE products SET status = 'active' WHERE status IS NULL")
    op.execute("UPDATE products SET is_featured = false WHERE is_featured IS NULL")
    op.execute("UPDATE products SET source = 'manual' WHERE source IS NULL")
    op.execute("UPDATE products SET sync_status = 'manual' WHERE sync_status IS NULL")
    op.execute("UPDATE products SET sync_attempts = 0 WHERE sync_attempts IS NULL")
    op.execute(
        "UPDATE products SET commission_type = 'percentage' WHERE commission_type IS NULL"
    )

    # Set default values for product_categories
    op.execute("UPDATE product_categories SET sort_order = 0 WHERE sort_order IS NULL")
    op.execute("UPDATE product_categories SET is_active = true WHERE is_active IS NULL")

    # Set default values for product_sync_logs
    op.execute(
        "UPDATE product_sync_logs SET records_processed = 0 WHERE records_processed IS NULL"
    )
    op.execute(
        "UPDATE product_sync_logs SET records_created = 0 WHERE records_created IS NULL"
    )
    op.execute(
        "UPDATE product_sync_logs SET records_updated = 0 WHERE records_updated IS NULL"
    )
    op.execute(
        "UPDATE product_sync_logs SET records_failed = 0 WHERE records_failed IS NULL"
    )


def downgrade():
    # Remove product_id column from product_sales
    try:
        op.drop_constraint(
            "fk_product_sales_product_id", "product_sales", type_="foreignkey"
        )
        op.drop_column("product_sales", "product_id")
    except Exception as e:
        print(f"Note: Error removing product_id column: {e}")

    # Drop indexes and tables in reverse order
    op.drop_index(
        op.f("ix_product_sync_logs_product_id"), table_name="product_sync_logs"
    )
    op.drop_index(op.f("ix_product_sync_logs_id"), table_name="product_sync_logs")
    op.drop_table("product_sync_logs")

    op.drop_index(op.f("ix_product_categories_id"), table_name="product_categories")
    op.drop_table("product_categories")

    op.drop_index(op.f("ix_products_shopify_handle"), table_name="products")
    op.drop_index(op.f("ix_products_shopify_variant_id"), table_name="products")
    op.drop_index(op.f("ix_products_shopify_product_id"), table_name="products")
    op.drop_index(op.f("ix_products_square_variation_id"), table_name="products")
    op.drop_index(op.f("ix_products_square_catalog_id"), table_name="products")
    op.drop_index(op.f("ix_products_sync_status"), table_name="products")
    op.drop_index(op.f("ix_products_source"), table_name="products")
    op.drop_index(op.f("ix_products_status"), table_name="products")
    op.drop_index(op.f("ix_products_category"), table_name="products")
    op.drop_index(op.f("ix_products_sku"), table_name="products")
    op.drop_index(op.f("ix_products_name"), table_name="products")
    op.drop_index(op.f("ix_products_id"), table_name="products")
    op.drop_table("products")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS productstatus")
    op.execute("DROP TYPE IF EXISTS productsource")
    op.execute("DROP TYPE IF EXISTS syncstatus")
