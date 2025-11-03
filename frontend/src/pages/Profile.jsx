import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Eye, EyeOff, Save } from "lucide-react"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Separator } from "../components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog"
import { useAuth } from "../contexts/AuthContext"
import { authApi } from "../lib/api"
import { cn } from "../lib/utils"

export default function Profile() {
  const navigate = useNavigate()
  const { user, isAuthenticated, login } = useAuth()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Profile form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [birthdate, setBirthdate] = useState("")
  const [gender, setGender] = useState("")

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  // Modal states
  const [showProfileConfirm, setShowProfileConfirm] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [pendingProfileData, setPendingProfileData] = useState(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login")
    }
  }, [isAuthenticated, navigate])

  // Load user data
  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setEmail(user.email || "")
      setBirthdate(user.birthdate || "")
      setGender(user.gender || "")
    }
  }, [user])

  // Fetch fresh user data
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: authApi.getCurrentUser,
    enabled: isAuthenticated,
    retry: false,
  })

  // Update local state when fresh data is fetched
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "")
      setEmail(currentUser.email || "")
      setBirthdate(currentUser.birthdate || "")
      setGender(currentUser.gender || "")
    }
  }, [currentUser])

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: (profileData) => authApi.updateProfile(profileData),
    onSuccess: (data) => {
      login(data, localStorage.getItem("token"))
      toast.success("Profile updated!", {
        description: "Your profile information has been updated successfully.",
      })
    },
    onError: (error) => {
      console.error("Profile update error:", error)
      toast.error("Update failed", {
        description: error.message || "Please check your information and try again.",
      })
    },
  })

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }) =>
      authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success("Password changed!", {
        description: "Your password has been updated successfully.",
      })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    },
    onError: (error) => {
      console.error("Password change error:", error)
      toast.error("Password change failed", {
        description: error.message || "Please check your current password and try again.",
      })
    },
  })

  const handleProfileSubmit = (e) => {
    e.preventDefault()
    
    const profileData = {}
    if (name !== user?.name) profileData.name = name
    if (email !== user?.email) profileData.email = email
    if (birthdate !== user?.birthdate) profileData.birthdate = birthdate
    if (gender !== user?.gender) profileData.gender = gender

    if (Object.keys(profileData).length === 0) {
      toast.info("No changes detected", {
        description: "You haven't made any changes to your profile.",
      })
      return
    }

    // Store pending data and show confirmation
    setPendingProfileData(profileData)
    setShowProfileConfirm(true)
  }

  const confirmProfileUpdate = () => {
    if (pendingProfileData) {
      updateProfileMutation.mutate(pendingProfileData)
      setShowProfileConfirm(false)
      setPendingProfileData(null)
    }
  }

  const handlePasswordSubmit = (e) => {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match", {
        description: "Please make sure both password fields match.",
      })
      return
    }

    // Show confirmation dialog
    setShowPasswordConfirm(true)
  }

  const confirmPasswordChange = () => {
    changePasswordMutation.mutate({ currentPassword, newPassword })
    setShowPasswordConfirm(false)
  }

  const passwordMatch = confirmPassword === "" || newPassword === confirmPassword

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account information and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Full Name</Label>
                <Input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-birthdate">Date of Birth</Label>
                <Input
                  id="profile-birthdate"
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-gender">Gender</Label>
                <Select value={gender} onValueChange={setGender} required>
                  <SelectTrigger id="profile-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={updateProfileMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password Card */}
        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter your current password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Enter new password (min. 6 characters)"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm your new password"
                    className={cn(
                      "pr-10",
                      confirmPassword && !passwordMatch && "border-destructive focus-visible:ring-destructive/20"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {confirmPassword && !passwordMatch && (
                  <p className="text-sm text-destructive">
                    Passwords do not match
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={changePasswordMutation.isPending || !passwordMatch}
              >
                <Save className="w-4 h-4 mr-2" />
                {changePasswordMutation.isPending ? "Updating..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Profile Update Confirmation Modal */}
      <AlertDialog open={showProfileConfirm} onOpenChange={setShowProfileConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Profile Update</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update your profile information? This action will modify your personal details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmProfileUpdate}>
              Update Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password Change Confirmation Modal */}
      <AlertDialog open={showPasswordConfirm} onOpenChange={setShowPasswordConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Password Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to change your password? You will need to use your new password for future logins.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPasswordChange}>
              Change Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

