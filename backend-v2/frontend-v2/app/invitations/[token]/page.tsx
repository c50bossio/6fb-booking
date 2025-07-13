"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Badge } from "@/components/ui/Badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Building2, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"
import { api } from "@/lib/api"

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
}

export default function AcceptInvitationPage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    fetchInvitation()
  }, [params.token])

  const fetchInvitation = async () => {
    try {
      const response = await api.get<Invitation>(`/invitations/${params.token}`)
      setInvitation(response)
      
      // Pre-fill name if provided
      if (response.first_name || response.last_name) {
        setName(`${response.first_name || ""} ${response.last_name || ""}`.trim())
      }
    } catch (error: any) {
      console.error("Failed to fetch invitation:", error)
      setError(error.response?.data?.detail || "Invalid or expired invitation")
    } finally {
      setLoading(false)
    }
  }

  const acceptInvitation = async () => {
    if (!password || password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      })
      return
    }

    setAccepting(true)
    try {
      const response = await api.post(`/invitations/${params.token}/accept`, {
        password,
        name: name || undefined
      })

      toast({
        title: "Success",
        description: "Your account has been created successfully!"
      })

      // Redirect to login or dashboard
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to accept invitation",
        variant: "destructive"
      })
    } finally {
      setAccepting(false)
    }
  }

  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      barber: "Barber",
      receptionist: "Receptionist",
      shop_manager: "Shop Manager"
    }
    return roleMap[role] || role
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-blue-500" />
      case "accepted":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "expired":
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {error || "This invitation link is invalid or has expired."}
            </p>
            <Button onClick={() => router.push("/")} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (invitation.status === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Invitation Already Accepted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This invitation has already been accepted.
            </p>
            <Button onClick={() => router.push("/login")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (invitation.status === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Invitation Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This invitation has expired. Please contact {invitation.invited_by_name} for a new invitation.
            </p>
            <Button onClick={() => router.push("/")} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <CardTitle>Join {invitation.organization_name}</CardTitle>
              <CardDescription>
                You've been invited as a {getRoleDisplay(invitation.role)}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Invitation Details */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Invited by</span>
                <span className="font-medium">{invitation.invited_by_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Your email</span>
                <span className="font-medium">{invitation.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Expires in</span>
                <Badge variant="secondary">
                  {invitation.days_until_expiry} days
                </Badge>
              </div>
            </div>

            {/* Personal Message */}
            {invitation.message && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Message from {invitation.invited_by_name}:</strong>
                  <p className="mt-1">{invitation.message}</p>
                </AlertDescription>
              </Alert>
            )}

            {/* Account Setup Form */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="password">Create Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={acceptInvitation}
                disabled={accepting || !password || !confirmPassword}
                className="flex-1"
              >
                {accepting ? "Creating Account..." : "Accept & Join"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}