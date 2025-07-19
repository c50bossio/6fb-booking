"""
Tests for staff invitation system.

This module tests the invitation API endpoints including:
- Creating invitations
- Listing invitations
- Accepting invitations
- Permission checks
"""

import pytest
from datetime import datetime, timedelta
from fastapi import status
from sqlalchemy.orm import Session

from models import User, Organization, UserOrganization
from models.invitation import StaffInvitation, InvitationStatus, InvitationRole
from models.organization import UserRole


@pytest.fixture
def organization_owner(db_session: Session):
    """Create an organization owner user"""
    user = User(
        email="owner@barbershop.com",
        name="Shop Owner",
        unified_role="shop_owner",
        hashed_password="hashed",
        is_active=True,
        is_verified=True
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def barbershop(db_session: Session):
    """Create a test barbershop organization"""
    org = Organization(
        name="Test Barbershop",
        slug="test-barbershop",
        chairs_count=5,
        subscription_status="active"
    )
    db_session.add(org)
    db_session.commit()
    return org


@pytest.fixture
def owner_membership(db_session: Session, organization_owner, barbershop):
    """Create owner membership in organization"""
    membership = UserOrganization(
        user_id=organization_owner.id,
        organization_id=barbershop.id,
        role=UserRole.OWNER.value,
        is_primary=True,
        can_manage_billing=True,
        can_manage_staff=True
    )
    db_session.add(membership)
    db_session.commit()
    return membership


@pytest.fixture
def auth_headers(test_client, organization_owner):
    """Get auth headers for organization owner"""
    response = test_client.post(
        "/api/v2/auth/login",
        json={"email": organization_owner.email, "password": "testpass123"}
    )
    # For testing, we'll simulate the token
    return {"Authorization": f"Bearer test-token-{organization_owner.id}"}


class TestInvitationCreation:
    """Test invitation creation endpoints"""
    
    def test_create_barber_invitation(self, test_client, auth_headers, barbershop, db_session):
        """Test creating an invitation for a barber"""
        invitation_data = {
            "email": "newbarber@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "role": "barber",
            "message": "Welcome to our barbershop!",
            "organization_id": barbershop.id
        }
        
        response = test_client.post(
            "/api/v2/invitations/",
            json=invitation_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        
        assert data["email"] == invitation_data["email"]
        assert data["first_name"] == invitation_data["first_name"]
        assert data["role"] == "barber"
        assert data["organization_name"] == barbershop.name
        assert data["status"] == "pending"
        assert "invitation_url" in data
        
        # Verify invitation was created in database
        invitation = db_session.query(StaffInvitation).filter_by(
            email=invitation_data["email"]
        ).first()
        assert invitation is not None
        assert invitation.invited_role == InvitationRole.BARBER
    
    def test_create_receptionist_invitation(self, test_client, auth_headers, barbershop):
        """Test creating an invitation for a receptionist"""
        invitation_data = {
            "email": "receptionist@example.com",
            "role": "receptionist",
            "organization_id": barbershop.id
        }
        
        response = test_client.post(
            "/api/v2/invitations/",
            json=invitation_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["role"] == "receptionist"
    
    def test_duplicate_pending_invitation(self, test_client, auth_headers, barbershop, db_session):
        """Test that duplicate pending invitations are rejected"""
        # Create first invitation
        invitation_data = {
            "email": "duplicate@example.com",
            "role": "barber",
            "organization_id": barbershop.id
        }
        
        response1 = test_client.post(
            "/api/v2/invitations/",
            json=invitation_data,
            headers=auth_headers
        )
        assert response1.status_code == status.HTTP_201_CREATED
        
        # Try to create duplicate
        response2 = test_client.post(
            "/api/v2/invitations/",
            json=invitation_data,
            headers=auth_headers
        )
        assert response2.status_code == status.HTTP_400_BAD_REQUEST
        assert "pending invitation already exists" in response2.json()["detail"]
    
    def test_invite_existing_member(self, test_client, auth_headers, barbershop, db_session, organization_owner):
        """Test inviting someone who is already a member"""
        # Create existing member
        existing_barber = User(
            email="existing@example.com",
            name="Existing Barber",
            unified_role="barber",
            hashed_password="hashed",
            is_active=True
        )
        db_session.add(existing_barber)
        db_session.flush()
        
        membership = UserOrganization(
            user_id=existing_barber.id,
            organization_id=barbershop.id,
            role=UserRole.BARBER.value
        )
        db_session.add(membership)
        db_session.commit()
        
        # Try to invite them again
        invitation_data = {
            "email": "existing@example.com",
            "role": "barber",
            "organization_id": barbershop.id
        }
        
        response = test_client.post(
            "/api/v2/invitations/",
            json=invitation_data,
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already a member" in response.json()["detail"]


class TestInvitationList:
    """Test invitation listing endpoints"""
    
    def test_list_organization_invitations(self, test_client, auth_headers, barbershop, db_session, organization_owner):
        """Test listing all invitations for an organization"""
        # Create some test invitations
        invitations = [
            StaffInvitation(
                email=f"barber{i}@example.com",
                invited_role=InvitationRole.BARBER,
                organization_id=barbershop.id,
                invited_by_id=organization_owner.id,
                status=InvitationStatus.PENDING
            )
            for i in range(3)
        ]
        
        # Add one accepted invitation
        accepted = StaffInvitation(
            email="accepted@example.com",
            invited_role=InvitationRole.RECEPTIONIST,
            organization_id=barbershop.id,
            invited_by_id=organization_owner.id,
            status=InvitationStatus.ACCEPTED
        )
        invitations.append(accepted)
        
        db_session.add_all(invitations)
        db_session.commit()
        
        # List invitations
        response = test_client.get(
            f"/api/v2/invitations/?organization_id={barbershop.id}",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["total"] == 4
        assert data["pending_count"] == 3
        assert data["accepted_count"] == 1
        assert len(data["invitations"]) == 4
    
    def test_filter_by_status(self, test_client, auth_headers, barbershop, db_session, organization_owner):
        """Test filtering invitations by status"""
        # Create invitations with different statuses
        pending = StaffInvitation(
            email="pending@example.com",
            invited_role=InvitationRole.BARBER,
            organization_id=barbershop.id,
            invited_by_id=organization_owner.id,
            status=InvitationStatus.PENDING
        )
        
        accepted = StaffInvitation(
            email="accepted@example.com",
            invited_role=InvitationRole.BARBER,
            organization_id=barbershop.id,
            invited_by_id=organization_owner.id,
            status=InvitationStatus.ACCEPTED
        )
        
        db_session.add_all([pending, accepted])
        db_session.commit()
        
        # Filter for pending only
        response = test_client.get(
            f"/api/v2/invitations/?organization_id={barbershop.id}&status=pending",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 1
        assert data["invitations"][0]["status"] == "pending"


class TestInvitationAcceptance:
    """Test invitation acceptance flow"""
    
    def test_get_invitation_by_token(self, test_client, db_session, barbershop, organization_owner):
        """Test retrieving invitation details by token"""
        invitation = StaffInvitation(
            email="invited@example.com",
            first_name="Invited",
            last_name="User",
            invited_role=InvitationRole.BARBER,
            organization_id=barbershop.id,
            invited_by_id=organization_owner.id,
            message="Welcome aboard!"
        )
        db_session.add(invitation)
        db_session.commit()
        
        # Get invitation by token (no auth required)
        response = test_client.get(f"/api/v2/invitations/{invitation.token}")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["email"] == invitation.email
        assert data["first_name"] == invitation.first_name
        assert data["role"] == "barber"
        assert data["message"] == invitation.message
        assert data["organization_name"] == barbershop.name
    
    def test_accept_invitation_new_user(self, test_client, db_session, barbershop, organization_owner):
        """Test accepting invitation as a new user"""
        invitation = StaffInvitation(
            email="newuser@example.com",
            first_name="New",
            last_name="User",
            invited_role=InvitationRole.BARBER,
            organization_id=barbershop.id,
            invited_by_id=organization_owner.id
        )
        db_session.add(invitation)
        db_session.commit()
        
        # Accept invitation
        accept_data = {
            "password": "securepassword123",
            "name": "New User"
        }
        
        response = test_client.post(
            f"/api/v2/invitations/{invitation.token}/accept",
            json=accept_data
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["message"] == "Invitation accepted successfully"
        assert "user_id" in data
        assert data["organization_id"] == barbershop.id
        
        # Verify user was created
        user = db_session.query(User).filter_by(email=invitation.email).first()
        assert user is not None
        assert user.name == "New User"
        assert user.unified_role == "barber"
        
        # Verify organization membership
        membership = db_session.query(UserOrganization).filter_by(
            user_id=user.id,
            organization_id=barbershop.id
        ).first()
        assert membership is not None
        assert membership.role == "barber"
        
        # Verify invitation status
        db_session.refresh(invitation)
        assert invitation.status == InvitationStatus.ACCEPTED
        assert invitation.accepted_by_id == user.id
    
    def test_accept_expired_invitation(self, test_client, db_session, barbershop, organization_owner):
        """Test that expired invitations cannot be accepted"""
        invitation = StaffInvitation(
            email="expired@example.com",
            invited_role=InvitationRole.BARBER,
            organization_id=barbershop.id,
            invited_by_id=organization_owner.id,
            expires_at=datetime.utcnow() - timedelta(days=1)  # Expired yesterday
        )
        db_session.add(invitation)
        db_session.commit()
        
        accept_data = {"password": "password123"}
        
        response = test_client.post(
            f"/api/v2/invitations/{invitation.token}/accept",
            json=accept_data
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "expired" in response.json()["detail"]


class TestInvitationPermissions:
    """Test permission checks for invitation management"""
    
    def test_barber_cannot_send_invitations(self, test_client, db_session, barbershop):
        """Test that regular barbers cannot send invitations"""
        # Create a barber user
        barber = User(
            email="barber@example.com",
            name="Regular Barber",
            unified_role="barber",
            hashed_password="hashed",
            is_active=True
        )
        db_session.add(barber)
        db_session.flush()
        
        membership = UserOrganization(
            user_id=barber.id,
            organization_id=barbershop.id,
            role=UserRole.BARBER.value
        )
        db_session.add(membership)
        db_session.commit()
        
        # Simulate barber auth
        barber_headers = {"Authorization": f"Bearer test-token-{barber.id}"}
        
        invitation_data = {
            "email": "newinvite@example.com",
            "role": "barber",
            "organization_id": barbershop.id
        }
        
        response = test_client.post(
            "/api/v2/invitations/",
            json=invitation_data,
            headers=barber_headers
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestInvitationManagement:
    """Test invitation management features"""
    
    def test_resend_invitation(self, test_client, auth_headers, db_session, barbershop, organization_owner):
        """Test resending invitation email"""
        invitation = StaffInvitation(
            email="resend@example.com",
            invited_role=InvitationRole.BARBER,
            organization_id=barbershop.id,
            invited_by_id=organization_owner.id
        )
        db_session.add(invitation)
        db_session.commit()
        
        response = test_client.post(
            f"/api/v2/invitations/{invitation.id}/resend",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "resent successfully" in data["message"]
        
        # Verify send count increased
        db_session.refresh(invitation)
        assert invitation.email_send_count == 1
    
    def test_cancel_invitation(self, test_client, auth_headers, db_session, barbershop, organization_owner):
        """Test cancelling a pending invitation"""
        invitation = StaffInvitation(
            email="cancel@example.com",
            invited_role=InvitationRole.BARBER,
            organization_id=barbershop.id,
            invited_by_id=organization_owner.id
        )
        db_session.add(invitation)
        db_session.commit()
        
        response = test_client.delete(
            f"/api/v2/invitations/{invitation.id}",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify invitation was cancelled
        db_session.refresh(invitation)
        assert invitation.status == InvitationStatus.CANCELLED