import { useState, useEffect, useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Eye, EyeOff, Save, Upload, User as UserIcon, X } from "lucide-react"
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

  // Image upload
  const fileInputRef = useRef(null)
  const [imagePreview, setImagePreview] = useState(null)

  // Helper function to get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
    return `${API_BASE_URL}/api/storage/${imagePath}`
  }

  // Note: Authentication check is now handled by ProtectedRoute component
  // This component will only render if user is authenticated

  // Fetch fresh user data from server
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: authApi.getCurrentUser,
    enabled: isAuthenticated,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
    gcTime: 0,
  })

  // Update local state from server or context
  useEffect(() => {
    const userData = currentUser || user
    if (!userData) return

    setName(userData.name || "")
    setEmail(userData.email || "")
    setBirthdate(userData.birthdate || "")
    setGender(userData.gender || "")
    
    const imagePath = currentUser?.image_path || user?.image_path
    if (imagePath && imagePath !== null && imagePath !== undefined && imagePath !== "") {
      setImagePreview(getImageUrl(imagePath))
    } else {
      setImagePreview(null)
    }
  }, [currentUser, user])

  const queryClient = useQueryClient()

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: (profileData) => authApi.updateProfile(profileData),
    onSuccess: (data) => {
      queryClient.setQueryData(["currentUser"], data)
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
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

  // Image upload mutation
  const uploadImageMutation = useMutation({
    mutationFn: (file) => authApi.uploadImage(file),
    onSuccess: (data) => {
      login(data, localStorage.getItem("token"))
      queryClient.setQueryData(["currentUser"], data)
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      toast.success("Image uploaded!", {
        description: "Your profile image has been updated successfully.",
      })
      if (data.image_path) {
        setImagePreview(getImageUrl(data.image_path))
      }
    },
    onError: (error) => {
      console.error("Image upload error:", error)
      toast.error("Upload failed", {
        description: error.message || "Please try again.",
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

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type", {
        description: "Please upload a JPEG, PNG, GIF, or WebP image.",
      })
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", {
        description: "Please upload an image smaller than 5MB.",
      })
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result)
    }
    reader.readAsDataURL(file)

    // Upload immediately
    uploadImageMutation.mutate(file)
  }

  const handleRemoveImage = () => {
    // Note: We'd need a delete endpoint to fully remove the image
    // For now, just clear preview (user can upload new one)
    setImagePreview(null)
    toast.info("To remove your image, upload a new one")
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account information and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Profile Information and Password Change */}
        <div className="lg:col-span-2 space-y-6">
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

        {/* Right Side: Profile Picture */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>Update your profile image</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div className="relative">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-muted"
                    onError={(e) => {
                      setImagePreview(null)
                      e.target.style.display = "none"
                    }}
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center border-4 border-muted">
                    <UserIcon className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
                {uploadImageMutation.isPending && (
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadImageMutation.isPending}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {imagePreview ? "Change" : "Upload"}
                </Button>
                {imagePreview && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveImage}
                    disabled={uploadImageMutation.isPending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
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

