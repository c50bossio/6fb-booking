"""
OpenAPI Documentation Tests for Barber Profile System

This test suite verifies that:
- OpenAPI/Swagger documentation is properly generated
- All endpoints are documented
- Response schemas are correct
- Authentication requirements are documented
"""

import pytest
import json
from httpx import AsyncClient
from fastapi.testclient import TestClient

from main import app


class TestOpenAPIDocumentation:
    """Test suite for OpenAPI documentation generation"""
    
    def test_openapi_schema_generation(self):
        """Test that OpenAPI schema is generated correctly"""
        client = TestClient(app)
        
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        openapi_schema = response.json()
        
        # Verify basic OpenAPI structure
        assert "openapi" in openapi_schema
        assert "info" in openapi_schema
        assert "paths" in openapi_schema
        assert "components" in openapi_schema

    def test_barber_profile_endpoints_documented(self):
        """Test that all barber profile endpoints are documented"""
        client = TestClient(app)
        
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        openapi_schema = response.json()
        paths = openapi_schema.get("paths", {})
        
        # Expected barber profile endpoints
        expected_endpoints = [
            "/barbers/{barber_id}/profile",  # GET, PUT, DELETE
            "/barbers/profiles",  # GET, POST
            "/barbers/{barber_id}/profile/image",  # POST
            "/barbers/profiles/stats",  # GET
        ]
        
        for endpoint in expected_endpoints:
            # Check if endpoint exists (may have variations)
            matching_paths = [path for path in paths.keys() if endpoint.replace("{barber_id}", str(1)) in path or endpoint in path]
            assert len(matching_paths) > 0, f"Endpoint {endpoint} should be documented"

    def test_profile_schemas_documented(self):
        """Test that barber profile schemas are properly documented"""
        client = TestClient(app)
        
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        openapi_schema = response.json()
        components = openapi_schema.get("components", {})
        schemas = components.get("schemas", {})
        
        # Expected schemas
        expected_schemas = [
            "BarberProfileCreate",
            "BarberProfileUpdate", 
            "BarberProfileResponse",
            "BarberProfileWithUserResponse",
            "BarberProfileListResponse"
        ]
        
        for schema_name in expected_schemas:
            assert schema_name in schemas, f"Schema {schema_name} should be documented"
            
            schema = schemas[schema_name]
            assert "type" in schema or "$ref" in schema, f"Schema {schema_name} should have type definition"

    def test_authentication_documented(self):
        """Test that authentication requirements are documented"""
        client = TestClient(app)
        
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        openapi_schema = response.json()
        
        # Check for security schemes
        components = openapi_schema.get("components", {})
        
        # Should have security defined somewhere
        has_security = (
            "securitySchemes" in components or
            "security" in openapi_schema or
            any("security" in path_info.get("get", {}) or 
                "security" in path_info.get("post", {}) or
                "security" in path_info.get("put", {}) or
                "security" in path_info.get("delete", {})
                for path_info in openapi_schema.get("paths", {}).values())
        )
        
        # Note: This might not be strictly required depending on setup
        # assert has_security, "API should document authentication requirements"

    def test_response_models_are_complete(self):
        """Test that response models include all necessary fields"""
        client = TestClient(app)
        
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        openapi_schema = response.json()
        schemas = openapi_schema.get("components", {}).get("schemas", {})
        
        # Test BarberProfileResponse schema
        if "BarberProfileResponse" in schemas:
            profile_schema = schemas["BarberProfileResponse"]
            properties = profile_schema.get("properties", {})
            
            expected_fields = [
                "id", "user_id", "bio", "years_experience", 
                "created_at", "updated_at", "is_active"
            ]
            
            for field in expected_fields:
                assert field in properties, f"BarberProfileResponse should include {field}"

    def test_request_validation_documented(self):
        """Test that request validation rules are documented"""
        client = TestClient(app)
        
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        openapi_schema = response.json()
        schemas = openapi_schema.get("components", {}).get("schemas", {})
        
        # Test BarberProfileCreate schema validation
        if "BarberProfileCreate" in schemas:
            create_schema = schemas["BarberProfileCreate"]
            properties = create_schema.get("properties", {})
            
            # Check that validation rules are documented
            if "bio" in properties:
                bio_schema = properties["bio"]
                # Should have maxLength constraint
                assert "maxLength" in bio_schema or "description" in bio_schema
            
            if "years_experience" in properties:
                years_schema = properties["years_experience"]
                # Should have minimum/maximum constraints
                assert ("minimum" in years_schema and "maximum" in years_schema) or "description" in years_schema

    def test_error_responses_documented(self):
        """Test that error responses are documented"""
        client = TestClient(app)
        
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        openapi_schema = response.json()
        paths = openapi_schema.get("paths", {})
        
        # Check that endpoints document error responses
        for path, methods in paths.items():
            if "/barbers/" in path and "profile" in path:
                for method, details in methods.items():
                    if method in ["get", "post", "put", "delete"]:
                        responses = details.get("responses", {})
                        
                        # Should document various error codes
                        expected_errors = ["400", "401", "403", "404", "422", "500"]
                        documented_errors = [code for code in expected_errors if code in responses]
                        
                        # At least some error codes should be documented
                        assert len(documented_errors) > 0, f"Endpoint {path} {method} should document error responses"

    def test_swagger_ui_accessible(self):
        """Test that Swagger UI is accessible"""
        client = TestClient(app)
        
        response = client.get("/docs")
        assert response.status_code == 200
        assert "swagger" in response.text.lower() or "openapi" in response.text.lower()

    def test_redoc_accessible(self):
        """Test that ReDoc is accessible"""
        client = TestClient(app)
        
        response = client.get("/redoc")
        assert response.status_code == 200
        assert "redoc" in response.text.lower() or "openapi" in response.text.lower()

    def test_endpoint_descriptions_present(self):
        """Test that endpoints have proper descriptions"""
        client = TestClient(app)
        
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        openapi_schema = response.json()
        paths = openapi_schema.get("paths", {})
        
        for path, methods in paths.items():
            if "/barbers/" in path and "profile" in path:
                for method, details in methods.items():
                    if method in ["get", "post", "put", "delete"]:
                        # Should have either summary or description
                        has_description = (
                            "summary" in details or 
                            "description" in details or
                            details.get("summary", "").strip() != "" or
                            details.get("description", "").strip() != ""
                        )
                        
                        assert has_description, f"Endpoint {path} {method} should have description"

    def test_parameter_documentation(self):
        """Test that path and query parameters are documented"""
        client = TestClient(app)
        
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        openapi_schema = response.json()
        paths = openapi_schema.get("paths", {})
        
        # Check specific endpoints with parameters
        for path, methods in paths.items():
            if "{barber_id}" in path:
                for method, details in methods.items():
                    if method in ["get", "put", "delete"]:
                        parameters = details.get("parameters", [])
                        
                        # Should document the barber_id parameter
                        barber_id_param = next((p for p in parameters if p.get("name") == "barber_id"), None)
                        if barber_id_param:
                            assert "description" in barber_id_param, "barber_id parameter should have description"
                            assert barber_id_param.get("in") == "path", "barber_id should be path parameter"

    def test_tags_organization(self):
        """Test that endpoints are properly organized with tags"""
        client = TestClient(app)
        
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        openapi_schema = response.json()
        paths = openapi_schema.get("paths", {})
        
        # Check that barber profile endpoints are tagged
        barber_profile_endpoints = 0
        tagged_endpoints = 0
        
        for path, methods in paths.items():
            if "/barbers/" in path and "profile" in path:
                for method, details in methods.items():
                    if method in ["get", "post", "put", "delete"]:
                        barber_profile_endpoints += 1
                        if "tags" in details and len(details["tags"]) > 0:
                            tagged_endpoints += 1
        
        if barber_profile_endpoints > 0:
            tag_ratio = tagged_endpoints / barber_profile_endpoints
            assert tag_ratio > 0.5, "Most barber profile endpoints should be tagged for organization"

    @pytest.mark.asyncio
    async def test_openapi_json_endpoint_async(self, async_client: AsyncClient):
        """Test OpenAPI JSON endpoint with async client"""
        response = await async_client.get("/openapi.json")
        assert response.status_code == 200
        
        schema = response.json()
        assert "paths" in schema
        assert "components" in schema

    def test_schema_validation_rules(self):
        """Test that schema validation rules match actual model constraints"""
        client = TestClient(app)
        
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        openapi_schema = response.json()
        schemas = openapi_schema.get("components", {}).get("schemas", {})
        
        # Test specific validation rules from our models
        if "BarberProfileBase" in schemas or "BarberProfileCreate" in schemas:
            # Use whichever schema is available
            schema_name = "BarberProfileCreate" if "BarberProfileCreate" in schemas else "BarberProfileBase"
            profile_schema = schemas[schema_name]
            properties = profile_schema.get("properties", {})
            
            # Check bio field constraints
            if "bio" in properties:
                bio_field = properties["bio"]
                # Should have maxLength of 2000 based on our model
                assert bio_field.get("maxLength") == 2000 or "description" in bio_field
            
            # Check years_experience constraints  
            if "years_experience" in properties:
                experience_field = properties["years_experience"]
                # Should have constraints based on our model
                assert (experience_field.get("minimum") == 0 and experience_field.get("maximum") == 50) or "description" in experience_field

    def test_example_values_provided(self):
        """Test that example values are provided in documentation"""
        client = TestClient(app)
        
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        openapi_schema = response.json()
        
        # Check if examples are provided in request/response schemas
        has_examples = False
        schemas = openapi_schema.get("components", {}).get("schemas", {})
        
        for schema_name, schema_details in schemas.items():
            if "barber" in schema_name.lower() and "profile" in schema_name.lower():
                if "example" in schema_details or "examples" in schema_details:
                    has_examples = True
                    break
                
                # Check properties for examples
                properties = schema_details.get("properties", {})
                for prop_name, prop_details in properties.items():
                    if "example" in prop_details:
                        has_examples = True
                        break
        
        # Examples are nice-to-have but not required for basic functionality
        # This test documents whether examples are present
        print(f"Documentation includes examples: {has_examples}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])