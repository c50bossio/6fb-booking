"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/Label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  UserPlus, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle,
  Mail,
  Copy,
  RefreshCw
} from "lucide-react"
import { api } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import { format } from "date-fns"

interface Invitation {
  id: number
  email: string
  first_name?: string
  last_name?: string
  role: string
  organization_id: number
  organization_name: string
  status: string
  created_at: string
  expires_at: string
  days_until_expiry: number
  invited_by_name: string
  message?: string
  invitation_url?: string
}

interface InvitationListResponse {
  invitations: Invitation[]
  total: number
  pending_count: number
  accepted_count: number
}

export default function StaffInvitationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [acceptedCount, setAcceptedCount] = useState(0)
  const [activeTab, setActiveTab] = useState("all")
  const [showNewInvitation, setShowNewInvitation] = useState(false)
  
  // New invitation form state
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteFirstName, setInviteFirstName] = useState("")
  const [inviteLastName, setInviteLastName] = useState("")
  const [inviteRole, setInviteRole] = useState("barber")
  const [inviteMessage, setInviteMessage] = useState("")
  
  // Get user's organization ID (assuming it's stored in the user object)
  const organizationId = user?.organization_id || user?.organizations?.[0]?.id

  useEffect(() => {
    if (organizationId) {
      fetchInvitations()
    }
  }, [organizationId, activeTab])

  const fetchInvitations = async () => {
    if (!organizationId) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({
        organization_id: organizationId.toString()
      })
      
      if (activeTab !== "all") {
        params.append("status", activeTab)
      }
      
      const response = await api.get<InvitationListResponse>(`/invitations/?${params}`)
      setInvitations(response.invitations)
      setPendingCount(response.pending_count)
      setAcceptedCount(response.accepted_count)
    } catch (error) {
      console.error("Failed to fetch invitations:", error)
      toast({
        title: "Error",
        description: "Failed to load invitations",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const sendInvitation = async () => {
    if (!organizationId || !inviteEmail) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await api.post<Invitation>("/invitations/", {
        email: inviteEmail,
        first_name: inviteFirstName || undefined,
        last_name: inviteLastName || undefined,
        role: inviteRole,
        message: inviteMessage || undefined,
        organization_id: organizationId
      })

      toast({
        title: "Success",
        description: `Invitation sent to ${response.email}`
      })

      // Reset form
      setInviteEmail("")
      setInviteFirstName("")
      setInviteLastName("")
      setInviteRole("barber")
      setInviteMessage("")
      setShowNewInvitation(false)

      // Refresh list
      fetchInvitations()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to send invitation",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const resendInvitation = async (invitationId: number) => {
    setLoading(true)
    try {
      await api.post(`/invitations/${invitationId}/resend`)
      toast({
        title: "Success",
        description: "Invitation resent successfully"
      })
      fetchInvitations()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend invitation",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const cancelInvitation = async (invitationId: number) => {
    if (!confirm("Are you sure you want to cancel this invitation?")) return

    setLoading(true)
    try {
      await api.delete(`/invitations/${invitationId}`)
      toast({
        title: "Success",
        description: "Invitation cancelled"
      })
      fetchInvitations()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel invitation",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const copyInvitationLink = (url: string) => {
    navigator.clipboard.writeText(url)
    toast({
      title: "Copied",
      description: "Invitation link copied to clipboard"
    })
  }

  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      barber: "Barber",
      receptionist: "Receptionist",
      shop_manager: "Shop Manager"
    }
    return roleMap[role] || role
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case "accepted":
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>
      case "expired":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Expired</Badge>
      case "cancelled":
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (!organizationId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              You need to be part of an organization to manage staff invitations.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Staff Invitations</h1>
        <p className="text-muted-foreground">
          Invite team members to join your organization
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Team Overview</CardTitle>
              <CardDescription>
                {pendingCount} pending invitations, {acceptedCount} accepted
              </CardDescription>
            </div>
            <Dialog open={showNewInvitation} onOpenChange={setShowNewInvitation}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Team Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to join your organization
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="team.member@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={inviteFirstName}
                        onChange={(e) => setInviteFirstName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={inviteLastName}
                        onChange={(e) => setInviteLastName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="barber">Barber</SelectItem>
                        <SelectItem value="receptionist">Receptionist</SelectItem>
                        <SelectItem value="shop_manager">Shop Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="message">Personal Message (Optional)</Label>
                    <Textarea
                      id="message"
                      placeholder="Welcome to the team! We're excited to have you join us..."
                      value={inviteMessage}
                      onChange={(e) => setInviteMessage(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowNewInvitation(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={sendInvitation} disabled={loading}>
                    <Send className="w-4 h-4 mr-2" />
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="accepted">Accepted</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading invitations...</p>
                </div>
              ) : invitations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No invitations found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invitation.email}</p>
                            {(invitation.first_name || invitation.last_name) && (
                              <p className="text-sm text-muted-foreground">
                                {invitation.first_name} {invitation.last_name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getRoleDisplay(invitation.role)}</TableCell>
                        <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">
                              {format(new Date(invitation.created_at), "MMM d, yyyy")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              by {invitation.invited_by_name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {invitation.status === "pending" && (
                            <div>
                              <p className="text-sm">
                                {invitation.days_until_expiry} days left
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(invitation.expires_at), "MMM d, yyyy")}
                              </p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {invitation.status === "pending" && (
                              <>
                                {invitation.invitation_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyInvitationLink(invitation.invitation_url!)}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => resendInvitation(invitation.id)}
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => cancelInvitation(invitation.id)}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}