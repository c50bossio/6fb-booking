"""
Schema Markup Generation and Validation Service
Generates structured data markup for local businesses to improve SEO
and search engine understanding
"""

import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, time
import re
import httpx
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class SchemaMarkupService:
    """Service for generating and validating schema markup"""

    def __init__(self):
        self.schema_base_url = "https://schema.org"
        self.validator_url = "https://validator.schema.org"
        self.google_validator_url = (
            "https://search.google.com/structured-data/testing-tool/u/0/"
        )

        # Schema types commonly used for local businesses
        self.supported_schema_types = [
            "LocalBusiness",
            "BeautySalon",
            "HairSalon",
            "Organization",
            "Place",
            "PostalAddress",
            "GeoCoordinates",
            "OpeningHoursSpecification",
            "Review",
            "AggregateRating",
        ]

    def generate_local_business_schema(
        self, business_data: Dict[str, Any], business_type: str = "BeautySalon"
    ) -> Dict[str, Any]:
        """Generate LocalBusiness schema markup"""
        try:
            schema = {
                "@context": "https://schema.org",
                "@type": business_type,
                "name": business_data.get("business_name", ""),
                "description": business_data.get("business_description", ""),
                "url": business_data.get("business_website", ""),
                "telephone": business_data.get("business_phone", ""),
                "email": business_data.get("business_email", ""),
                "priceRange": business_data.get("price_range", "$$"),
                "image": self._format_images(business_data.get("images", [])),
                "address": self._generate_postal_address(business_data),
                "geo": self._generate_geo_coordinates(business_data),
                "openingHoursSpecification": self._generate_opening_hours(
                    business_data.get("business_hours", {})
                ),
            }

            # Add optional fields if available
            if business_data.get("founded_year"):
                schema["foundingDate"] = str(business_data["founded_year"])

            if business_data.get("services"):
                schema["hasOfferCatalog"] = self._generate_service_catalog(
                    business_data["services"]
                )

            if business_data.get("social_media"):
                schema["sameAs"] = business_data["social_media"]

            if business_data.get("reviews_data"):
                schema["aggregateRating"] = self._generate_aggregate_rating(
                    business_data["reviews_data"]
                )
                schema["review"] = self._generate_reviews(
                    business_data["reviews_data"].get("reviews", [])
                )

            if business_data.get("payment_methods"):
                schema["paymentAccepted"] = business_data["payment_methods"]

            if business_data.get("languages"):
                schema["knowsLanguage"] = business_data["languages"]

            # Remove empty fields
            schema = {k: v for k, v in schema.items() if v}

            return schema

        except Exception as e:
            logger.error(f"Error generating LocalBusiness schema: {str(e)}")
            raise

    def generate_organization_schema(
        self, business_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate Organization schema markup"""
        try:
            schema = {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": business_data.get("business_name", ""),
                "description": business_data.get("business_description", ""),
                "url": business_data.get("business_website", ""),
                "logo": business_data.get("logo_url", ""),
                "contactPoint": {
                    "@type": "ContactPoint",
                    "telephone": business_data.get("business_phone", ""),
                    "contactType": "customer service",
                    "availableLanguage": business_data.get("languages", ["English"]),
                },
                "address": self._generate_postal_address(business_data),
                "sameAs": business_data.get("social_media", []),
            }

            # Add founder information if available
            if business_data.get("founder_name"):
                schema["founder"] = {
                    "@type": "Person",
                    "name": business_data["founder_name"],
                }

            # Remove empty fields
            schema = {k: v for k, v in schema.items() if v}

            return schema

        except Exception as e:
            logger.error(f"Error generating Organization schema: {str(e)}")
            raise

    def generate_review_schema(self, review_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate Review schema markup"""
        try:
            schema = {
                "@context": "https://schema.org",
                "@type": "Review",
                "reviewBody": review_data.get("review_text", ""),
                "reviewRating": {
                    "@type": "Rating",
                    "ratingValue": review_data.get("rating", 5),
                    "bestRating": 5,
                    "worstRating": 1,
                },
                "author": {
                    "@type": "Person",
                    "name": review_data.get("reviewer_name", "Anonymous"),
                },
                "datePublished": review_data.get(
                    "review_date", datetime.now().isoformat()
                ),
                "itemReviewed": {
                    "@type": "LocalBusiness",
                    "name": review_data.get("business_name", ""),
                    "address": review_data.get("business_address", ""),
                },
            }

            return schema

        except Exception as e:
            logger.error(f"Error generating Review schema: {str(e)}")
            raise

    def generate_breadcrumb_schema(
        self, breadcrumbs: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """Generate BreadcrumbList schema markup"""
        try:
            schema = {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": [],
            }

            for i, breadcrumb in enumerate(breadcrumbs, 1):
                item = {
                    "@type": "ListItem",
                    "position": i,
                    "name": breadcrumb.get("name", ""),
                    "item": breadcrumb.get("url", ""),
                }
                schema["itemListElement"].append(item)

            return schema

        except Exception as e:
            logger.error(f"Error generating Breadcrumb schema: {str(e)}")
            raise

    def generate_faq_schema(self, faq_data: List[Dict[str, str]]) -> Dict[str, Any]:
        """Generate FAQPage schema markup"""
        try:
            schema = {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [],
            }

            for faq in faq_data:
                question = {
                    "@type": "Question",
                    "name": faq.get("question", ""),
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": faq.get("answer", ""),
                    },
                }
                schema["mainEntity"].append(question)

            return schema

        except Exception as e:
            logger.error(f"Error generating FAQ schema: {str(e)}")
            raise

    def generate_service_schema(self, service_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate Service schema markup"""
        try:
            schema = {
                "@context": "https://schema.org",
                "@type": "Service",
                "name": service_data.get("service_name", ""),
                "description": service_data.get("service_description", ""),
                "provider": {
                    "@type": "LocalBusiness",
                    "name": service_data.get("business_name", ""),
                },
                "serviceType": service_data.get("service_category", ""),
                "areaServed": {"@type": "City", "name": service_data.get("city", "")},
            }

            # Add pricing if available
            if service_data.get("price"):
                schema["offers"] = {
                    "@type": "Offer",
                    "price": service_data["price"],
                    "priceCurrency": service_data.get("currency", "USD"),
                }

            return schema

        except Exception as e:
            logger.error(f"Error generating Service schema: {str(e)}")
            raise

    # Helper Methods

    def _generate_postal_address(self, business_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate PostalAddress schema"""
        address = {
            "@type": "PostalAddress",
            "streetAddress": business_data.get("business_address", ""),
            "addressLocality": business_data.get("business_city", ""),
            "addressRegion": business_data.get("business_state", ""),
            "postalCode": business_data.get("business_zip", ""),
            "addressCountry": business_data.get("business_country", "US"),
        }

        # Remove empty fields
        return {k: v for k, v in address.items() if v}

    def _generate_geo_coordinates(
        self, business_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Generate GeoCoordinates schema"""
        latitude = business_data.get("latitude")
        longitude = business_data.get("longitude")

        if latitude and longitude:
            return {
                "@type": "GeoCoordinates",
                "latitude": str(latitude),
                "longitude": str(longitude),
            }

        return None

    def _generate_opening_hours(
        self, hours_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate OpeningHoursSpecification schema"""
        opening_hours = []

        day_mapping = {
            "monday": "Monday",
            "tuesday": "Tuesday",
            "wednesday": "Wednesday",
            "thursday": "Thursday",
            "friday": "Friday",
            "saturday": "Saturday",
            "sunday": "Sunday",
        }

        for day, hours in hours_data.items():
            if day in day_mapping and hours.get("is_open"):
                spec = {
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": day_mapping[day],
                    "opens": hours.get("open", ""),
                    "closes": hours.get("close", ""),
                }
                opening_hours.append(spec)

        return opening_hours

    def _generate_aggregate_rating(
        self, reviews_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate AggregateRating schema"""
        return {
            "@type": "AggregateRating",
            "ratingValue": str(reviews_data.get("average_rating", 0)),
            "reviewCount": str(reviews_data.get("total_reviews", 0)),
            "bestRating": "5",
            "worstRating": "1",
        }

    def _generate_reviews(self, reviews: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate Review schemas for multiple reviews"""
        review_schemas = []

        for review in reviews[:5]:  # Limit to 5 reviews
            try:
                review_schema = {
                    "@type": "Review",
                    "reviewBody": review.get("review_text", ""),
                    "reviewRating": {
                        "@type": "Rating",
                        "ratingValue": str(review.get("rating", 5)),
                    },
                    "author": {
                        "@type": "Person",
                        "name": review.get("reviewer_name", "Anonymous"),
                    },
                    "datePublished": review.get("review_date", ""),
                }
                review_schemas.append(review_schema)
            except Exception as e:
                logger.warning(f"Error generating review schema: {str(e)}")
                continue

        return review_schemas

    def _generate_service_catalog(
        self, services: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate OfferCatalog schema for services"""
        catalog = {"@type": "OfferCatalog", "name": "Services", "itemListElement": []}

        for service in services:
            offer = {
                "@type": "Offer",
                "itemOffered": {
                    "@type": "Service",
                    "name": service.get("name", ""),
                    "description": service.get("description", ""),
                },
            }

            if service.get("price"):
                offer["price"] = str(service["price"])
                offer["priceCurrency"] = "USD"

            catalog["itemListElement"].append(offer)

        return catalog

    def _format_images(self, images: List[str]) -> List[str]:
        """Format and validate image URLs"""
        formatted_images = []

        for image_url in images:
            if self._is_valid_url(image_url):
                formatted_images.append(image_url)

        return formatted_images

    def _is_valid_url(self, url: str) -> bool:
        """Validate URL format"""
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except Exception:
            return False

    # Validation Methods

    async def validate_schema_markup(
        self, schema_json: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate schema markup against schema.org standards"""
        try:
            validation_result = {
                "is_valid": True,
                "errors": [],
                "warnings": [],
                "suggestions": [],
            }

            # Basic structure validation
            if "@context" not in schema_json:
                validation_result["errors"].append("Missing @context property")
                validation_result["is_valid"] = False

            if "@type" not in schema_json:
                validation_result["errors"].append("Missing @type property")
                validation_result["is_valid"] = False

            # Type-specific validation
            schema_type = schema_json.get("@type")
            if schema_type == "LocalBusiness" or schema_type in [
                "BeautySalon",
                "HairSalon",
            ]:
                validation_result = await self._validate_local_business_schema(
                    schema_json, validation_result
                )
            elif schema_type == "Organization":
                validation_result = await self._validate_organization_schema(
                    schema_json, validation_result
                )

            # JSON structure validation
            try:
                json.dumps(schema_json)
            except (TypeError, ValueError) as e:
                validation_result["errors"].append(f"Invalid JSON structure: {str(e)}")
                validation_result["is_valid"] = False

            return validation_result

        except Exception as e:
            logger.error(f"Error validating schema markup: {str(e)}")
            return {
                "is_valid": False,
                "errors": [f"Validation error: {str(e)}"],
                "warnings": [],
                "suggestions": [],
            }

    async def _validate_local_business_schema(
        self, schema_json: Dict[str, Any], validation_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate LocalBusiness specific requirements"""
        required_fields = ["name", "address", "telephone"]
        recommended_fields = [
            "description",
            "url",
            "openingHoursSpecification",
            "image",
            "geo",
            "aggregateRating",
        ]

        # Check required fields
        for field in required_fields:
            if field not in schema_json or not schema_json[field]:
                validation_result["errors"].append(f"Missing required field: {field}")
                validation_result["is_valid"] = False

        # Check recommended fields
        for field in recommended_fields:
            if field not in schema_json or not schema_json[field]:
                validation_result["warnings"].append(
                    f"Missing recommended field: {field}"
                )

        # Validate address structure
        if "address" in schema_json and isinstance(schema_json["address"], dict):
            address = schema_json["address"]
            if address.get("@type") != "PostalAddress":
                validation_result["warnings"].append(
                    "Address should have @type: PostalAddress"
                )

        # Validate opening hours
        if "openingHoursSpecification" in schema_json:
            hours = schema_json["openingHoursSpecification"]
            if not isinstance(hours, list) or len(hours) == 0:
                validation_result["warnings"].append(
                    "OpeningHoursSpecification should be a non-empty array"
                )

        return validation_result

    async def _validate_organization_schema(
        self, schema_json: Dict[str, Any], validation_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate Organization specific requirements"""
        required_fields = ["name", "url"]
        recommended_fields = [
            "description",
            "logo",
            "contactPoint",
            "address",
            "sameAs",
        ]

        # Check required fields
        for field in required_fields:
            if field not in schema_json or not schema_json[field]:
                validation_result["errors"].append(f"Missing required field: {field}")
                validation_result["is_valid"] = False

        # Check recommended fields
        for field in recommended_fields:
            if field not in schema_json or not schema_json[field]:
                validation_result["warnings"].append(
                    f"Missing recommended field: {field}"
                )

        return validation_result

    def generate_json_ld_script(self, schema_json: Dict[str, Any]) -> str:
        """Generate JSON-LD script tag for HTML insertion"""
        try:
            json_string = json.dumps(schema_json, indent=2, ensure_ascii=False)
            script_tag = (
                f'<script type="application/ld+json">\n{json_string}\n</script>'
            )
            return script_tag
        except Exception as e:
            logger.error(f"Error generating JSON-LD script: {str(e)}")
            raise

    def extract_schema_from_url(self, url: str) -> List[Dict[str, Any]]:
        """Extract existing schema markup from a webpage"""
        # This would implement web scraping to extract schema markup
        # For now, returning a placeholder
        # In a real implementation, this would use BeautifulSoup or similar
        # to parse HTML and extract JSON-LD, microdata, or RDFa

        logger.info(f"Schema extraction from {url} not yet implemented")
        return []

    def get_schema_suggestions(
        self, business_type: str, current_schema: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Get suggestions for improving schema markup"""
        suggestions = []

        # Business type specific suggestions
        if business_type.lower() in ["beauty salon", "hair salon", "barbershop"]:
            suggestions.extend(
                [
                    {
                        "type": "enhancement",
                        "title": "Add Service Catalog",
                        "description": "Include detailed services with pricing",
                        "impact": "high",
                        "implementation": "Add hasOfferCatalog property with service details",
                    },
                    {
                        "type": "enhancement",
                        "title": "Include Staff Information",
                        "description": "Add employee/stylist information",
                        "impact": "medium",
                        "implementation": "Add employee property with Person schema",
                    },
                    {
                        "type": "enhancement",
                        "title": "Add Amenities",
                        "description": "List available amenities and features",
                        "impact": "medium",
                        "implementation": "Add amenityFeature property",
                    },
                ]
            )

        # General suggestions
        suggestions.extend(
            [
                {
                    "type": "seo",
                    "title": "Add FAQ Schema",
                    "description": "Include frequently asked questions",
                    "impact": "high",
                    "implementation": "Create separate FAQPage schema markup",
                },
                {
                    "type": "rich_results",
                    "title": "Implement Review Schema",
                    "description": "Add customer review markup",
                    "impact": "high",
                    "implementation": "Include review and aggregateRating properties",
                },
                {
                    "type": "local_seo",
                    "title": "Add Geographic Coordinates",
                    "description": "Include precise location coordinates",
                    "impact": "medium",
                    "implementation": "Add geo property with GeoCoordinates",
                },
            ]
        )

        return suggestions


# Dependency injection function
def get_schema_markup_service() -> SchemaMarkupService:
    """Dependency injection for SchemaMarkupService"""
    return SchemaMarkupService()
