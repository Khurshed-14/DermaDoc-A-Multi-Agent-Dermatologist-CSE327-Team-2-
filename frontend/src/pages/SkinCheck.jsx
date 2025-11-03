import { useState, useRef, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { Upload, Camera, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog"
import { useAuth } from "../contexts/AuthContext"
import { skinCheckApi } from "../lib/api"
import { cn } from "../lib/utils"

let BodyComponent = null

// Fallback body part selection if BodyComponent is not available
const BODY_PARTS = [
    { id: "head", label: "Head" },
    { id: "neck", label: "Neck" },
    { id: "chest", label: "Chest" },
    { id: "abdomen", label: "Abdomen" },
    { id: "back", label: "Back" },
    { id: "left_arm", label: "Left Arm" },
    { id: "right_arm", label: "Right Arm" },
    { id: "left_leg", label: "Left Leg" },
    { id: "right_leg", label: "Right Leg" },
    { id: "left_hand", label: "Left Hand" },
    { id: "right_hand", label: "Right Hand" },
    { id: "left_foot", label: "Left Foot" },
    { id: "right_foot", label: "Right Foot" },
]

export default function SkinCheck() {
    const { isAuthenticated } = useAuth()
    const fileInputRef = useRef(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [selectedBodyPart, setSelectedBodyPart] = useState(null)
    const [showConfirmDialog, setShowConfirmDialog] = useState(false)
    const [pendingFile, setPendingFile] = useState(null)
    const [hasBodyComponent, setHasBodyComponent] = useState(false)

    // Try to load BodyComponent
    useEffect(() => {
        import("@darshanpatel2608/human-body-react")
            .then((module) => {
                BodyComponent = module.BodyComponent
                setHasBodyComponent(true)
            })
            .catch(() => {
                console.warn("BodyComponent not available, using fallback UI")
                setHasBodyComponent(false)
            })
    }, [])

    // Apply and maintain highlighting to selected body part
    useEffect(() => {
        if (!hasBodyComponent) return

        const applyHighlighting = () => {
            const wrapper = document.querySelector('.body-component-wrapper')
            if (!wrapper) return

            const svg = wrapper.querySelector('svg')
            if (!svg) return

            // Clear all previous selections
            const allPaths = svg.querySelectorAll('path')
            const allGroups = svg.querySelectorAll('g')

            allPaths.forEach((path) => {
                if (!selectedBodyPart || !path.hasAttribute('data-permanent-selected')) {
                    path.style.removeProperty('fill')
                    path.style.removeProperty('stroke')
                    path.style.removeProperty('stroke-width')
                    path.style.removeProperty('filter')
                    path.removeAttribute('data-permanent-selected')
                    path.removeAttribute('data-selected')
                }
            })

            // Clear all groups and their paths
            allGroups.forEach((group) => {
                const groupPaths = group.querySelectorAll('path')
                const hasPermanent = groupPaths.some(p => p.hasAttribute('data-permanent-selected')) ||
                                    group.hasAttribute('data-permanent-selected')
                
                if (!selectedBodyPart || !hasPermanent) {
                    group.style.removeProperty('fill')
                    groupPaths.forEach((path) => {
                        path.style.removeProperty('fill')
                        path.style.removeProperty('stroke')
                        path.style.removeProperty('stroke-width')
                        path.style.removeProperty('filter')
                        path.removeAttribute('data-permanent-selected')
                        path.removeAttribute('data-selected')
                    })
                    group.removeAttribute('data-permanent-selected')
                }
            })

            if (!selectedBodyPart) {
                return
            }

            // Apply highlighting to the currently selected part
            const partName = selectedBodyPart.toLowerCase().replace(/_/g, '')
            const partNameWithUnderscore = selectedBodyPart.toLowerCase()
            const partNameWithSpace = selectedBodyPart.toLowerCase().replace(/_/g, ' ')
            const partNameCamelCase = selectedBodyPart.split('_').map((word, i) => 
                i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join('')
            
            // Mapping of part names to possible component identifiers
            const partNameMap = {
                'head': ['head', 'skull', 'face', 'facefront', 'headfront'],
                'neck': ['neck', 'cervical', 'neckfront'],
                'chest': ['chest', 'thorax', 'upperchest', 'upper_chest', 'chestfront', 'torso', 'torsofront'],
                'abdomen': ['abdomen', 'stomach', 'belly', 'torso', 'abdominal', 'stomachfront', 'abdomenfront'],
                'back': ['back', 'spine', 'posterior', 'backside', 'rear'],
                'left_arm': ['leftarm', 'left_arm', 'larm', 'leftupperarm', 'left_upper_arm', 'armleft', 'upperarmleft', 'leftarmfront'],
                'right_arm': ['rightarm', 'right_arm', 'rarm', 'rightupperarm', 'right_upper_arm', 'armright', 'upperarmright', 'rightarmfront'],
                'left_leg': ['leftleg', 'left_leg', 'lleg', 'leftlowerleg', 'left_lower_leg', 'legleft', 'lowerlegleft', 'leftlegfront'],
                'right_leg': ['rightleg', 'right_leg', 'rleg', 'rightlowerleg', 'right_lower_leg', 'legright', 'lowerlegright', 'rightlegfront'],
                'left_hand': ['lefthand', 'left_hand', 'lhand', 'handleft', 'leftwrist', 'left_handfront'],
                'right_hand': ['righthand', 'right_hand', 'rhand', 'handright', 'rightwrist', 'right_handfront'],
                'left_foot': ['leftfoot', 'left_foot', 'lfoot', 'footleft', 'leftankle', 'left_footfront'],
                'right_foot': ['rightfoot', 'right_foot', 'rfoot', 'footright', 'rightankle', 'right_footfront'],
            }
            
            // Get all possible names for this part
            const possibleNames = [
                partName,
                partNameWithUnderscore,
                partNameWithSpace,
                partNameCamelCase,
                ...(partNameMap[selectedBodyPart.toLowerCase()] || [])
            ]
            
            // Check all paths and groups for matches with the selected body part
            const allElements = [...svg.querySelectorAll('path'), ...svg.querySelectorAll('g')]
            
            allElements.forEach((element) => {
                const elementId = (element.getAttribute('id') || '').toLowerCase()
                const elementClass = (element.getAttribute('class') || '').toLowerCase()
                const elementDataPart = (element.getAttribute('data-part') || '').toLowerCase()
                const elementDataName = (element.getAttribute('data-name') || '').toLowerCase()
                const elementTitle = (element.getAttribute('title') || '').toLowerCase()
                
                const parent = element.parentElement
                const parentId = parent ? (parent.getAttribute('id') || '').toLowerCase() : ''
                const parentDataPart = parent ? (parent.getAttribute('data-part') || '').toLowerCase() : ''
                
                // Check if this element matches any of the possible names
                const isMatch = possibleNames.some(name => {
                    if (elementId === name || elementDataPart === name || elementDataName === name) {
                        return true
                    }
                    if (elementId && elementId === name.replace(/[^a-z0-9]/g, '')) {
                        return true
                    }
                    if (parentId === name || parentDataPart === name) {
                        return true
                    }
                    const wordBoundary = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
                    if (wordBoundary.test(elementId) || wordBoundary.test(elementDataPart) || 
                        wordBoundary.test(elementDataName) || wordBoundary.test(parentId)) {
                        return true
                    }
                    return false
                })

                if (isMatch) {
                    if (element.tagName === 'path' || element.tagName === 'circle' || 
                        element.tagName === 'rect' || element.tagName === 'polygon' || 
                        element.tagName === 'ellipse') {
                        element.style.setProperty('fill', 'hsl(var(--primary) / 0.3)', 'important')
                        element.style.setProperty('stroke', 'hsl(var(--primary))', 'important')
                        element.style.setProperty('stroke-width', '3px', 'important')
                        element.style.setProperty('filter', 'drop-shadow(0 0 2px hsl(var(--primary) / 0.2))', 'important')
                        element.setAttribute('data-permanent-selected', 'true')
                        element.setAttribute('data-selected', 'true')
                        if (parent && parent.tagName === 'g') {
                            parent.setAttribute('data-permanent-selected', 'true')
                        }
                    } else if (element.tagName === 'g') {
                        element.style.setProperty('fill', 'hsl(var(--primary) / 0.3)', 'important')
                        const childElements = element.querySelectorAll('path, circle, rect, polygon, ellipse')
                        childElements.forEach((child) => {
                            child.style.setProperty('fill', 'hsl(var(--primary) / 0.3)', 'important')
                            child.style.setProperty('stroke', 'hsl(var(--primary))', 'important')
                            child.style.setProperty('stroke-width', '3px', 'important')
                            child.style.setProperty('filter', 'drop-shadow(0 0 2px hsl(var(--primary) / 0.2))', 'important')
                            child.setAttribute('data-permanent-selected', 'true')
                            child.setAttribute('data-selected', 'true')
                        })
                        element.setAttribute('data-permanent-selected', 'true')
                    }
                    if (parent && parent.tagName === 'g' && !parent.hasAttribute('data-permanent-selected')) {
                        const parentPaths = parent.querySelectorAll('path, circle, rect, polygon, ellipse')
                        parentPaths.forEach((path) => {
                            path.style.setProperty('fill', 'hsl(var(--primary) / 0.3)', 'important')
                            path.style.setProperty('stroke', 'hsl(var(--primary))', 'important')
                            path.style.setProperty('stroke-width', '3px', 'important')
                            path.style.setProperty('filter', 'drop-shadow(0 0 2px hsl(var(--primary) / 0.2))', 'important')
                            path.setAttribute('data-permanent-selected', 'true')
                            path.setAttribute('data-selected', 'true')
                        })
                        parent.setAttribute('data-permanent-selected', 'true')
                    }
                }
            })

            // Check for elements styled by the component that might correspond to our selected part
            const filledElements = svg.querySelectorAll('[style*="fill"]')
            filledElements.forEach((element) => {
                const computedFill = window.getComputedStyle(element).fill
                const hasFill = computedFill && 
                               computedFill !== 'transparent' && 
                               computedFill !== 'none' && 
                               computedFill !== 'rgba(0, 0, 0, 0)' &&
                               computedFill !== 'rgb(0, 0, 0)'

                if (hasFill) {
                    const elementId = (element.getAttribute('id') || '').toLowerCase()
                    const elementDataPart = (element.getAttribute('data-part') || '').toLowerCase()
                    const elementDataName = (element.getAttribute('data-name') || '').toLowerCase()
                    const elementTitle = (element.getAttribute('title') || '').toLowerCase()
                    const elementClass = (element.getAttribute('class') || '').toLowerCase()
                    
                    const allElementAttrs = [elementId, elementClass, elementDataPart, elementDataName, elementTitle].join(' ')
                    
                    const mightBeSelected = possibleNames.some(name => {
                        const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '')
                        const normalizedAttrs = allElementAttrs.replace(/[^a-z0-9]/g, '')
                        return normalizedAttrs.includes(normalizedName) || 
                               normalizedName.includes(normalizedAttrs) ||
                               elementId === name ||
                               elementDataPart === name ||
                               elementDataName === name
                    })

                    if (mightBeSelected) {
                        if (element.tagName === 'path') {
                            element.style.setProperty('fill', 'hsl(var(--primary) / 0.3)', 'important')
                            element.style.setProperty('stroke', 'hsl(var(--primary))', 'important')
                            element.style.setProperty('stroke-width', '3px', 'important')
                            element.style.setProperty('filter', 'drop-shadow(0 0 2px hsl(var(--primary) / 0.2))', 'important')
                            element.setAttribute('data-permanent-selected', 'true')
                            element.setAttribute('data-selected', 'true')
                        } else if (element.tagName === 'g') {
                            const paths = element.querySelectorAll('path')
                            paths.forEach((path) => {
                                path.style.setProperty('fill', 'hsl(var(--primary) / 0.3)', 'important')
                                path.style.setProperty('stroke', 'hsl(var(--primary))', 'important')
                                path.style.setProperty('stroke-width', '3px', 'important')
                                path.style.setProperty('filter', 'drop-shadow(0 0 2px hsl(var(--primary) / 0.2))', 'important')
                                path.setAttribute('data-permanent-selected', 'true')
                                path.setAttribute('data-selected', 'true')
                            })
                        }
                    } else {
                        if (element.tagName === 'path') {
                            element.style.removeProperty('fill')
                            element.style.removeProperty('stroke')
                            element.style.removeProperty('stroke-width')
                            element.style.removeProperty('filter')
                            element.removeAttribute('data-permanent-selected')
                            element.removeAttribute('data-selected')
                        } else if (element.tagName === 'g') {
                            const paths = element.querySelectorAll('path')
                            paths.forEach((path) => {
                                path.style.removeProperty('fill')
                                path.style.removeProperty('stroke')
                                path.style.removeProperty('stroke-width')
                                path.style.removeProperty('filter')
                                path.removeAttribute('data-permanent-selected')
                                path.removeAttribute('data-selected')
                            })
                        }
                    }
                }
            })
        }

        let timeoutId = setTimeout(applyHighlighting, 100)
        let reapplyTimeoutId = null

        // Use MutationObserver to watch for DOM changes
        const observer = new MutationObserver((mutations) => {
            if (selectedBodyPart) {
                let shouldReapply = false
                for (const mutation of mutations) {
                    if (mutation.type === 'attributes' && 
                        (mutation.attributeName === 'style' || mutation.attributeName === 'fill')) {
                        const target = mutation.target
                        if (target && (target.tagName === 'path' || target.tagName === 'g' || 
                            target.tagName === 'circle' || target.tagName === 'rect')) {
                            if (!target.hasAttribute('data-permanent-selected') && 
                                !target.hasAttribute('data-selected')) {
                                shouldReapply = true
                                break
                            }
                        }
                    }
                }
                if (shouldReapply) {
                    if (reapplyTimeoutId) {
                        clearTimeout(reapplyTimeoutId)
                    }
                    reapplyTimeoutId = setTimeout(applyHighlighting, 100)
                }
            }
        })
        const svgElement = document.querySelector('.body-component-wrapper svg')
        if (svgElement) {
            observer.observe(svgElement, {
                attributes: true,
                attributeFilter: ['style', 'fill'],
                subtree: true,
                childList: false
            })
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId)
            if (reapplyTimeoutId) clearTimeout(reapplyTimeoutId)
            observer.disconnect()
            if (!selectedBodyPart) {
                applyHighlighting()
            }
        }
    }, [selectedBodyPart, hasBodyComponent])

    const uploadMutation = useMutation({
        mutationFn: async ({ file, bodyPart }) => {
            return skinCheckApi.uploadImage(file, bodyPart)
        },
        onSuccess: (data) => {
            toast.success("Image uploaded successfully! Analysis is pending.", {
                icon: <CheckCircle2 className="w-5 h-5" />,
            })
            setImagePreview(null)
            setSelectedBodyPart(null)
            setPendingFile(null)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to upload image", {
                icon: <AlertCircle className="w-5 h-5" />,
            })
        },
    })

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file")
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image size must be less than 5MB")
            return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
            setImagePreview(reader.result)
            setPendingFile(file)
        }
        reader.readAsDataURL(file)
    }

    const handleBodyPartClick = (part) => {
        if (selectedBodyPart === part) {
            setSelectedBodyPart(null)
        } else {
            setSelectedBodyPart(part)
        }
    }

    const handleCameraClick = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            const video = document.createElement("video")
            video.srcObject = stream
            video.play()

            const canvas = document.createElement("canvas")
            const context = canvas.getContext("2d")

            video.addEventListener("loadedmetadata", () => {
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
            })

            const shouldCapture = confirm("Position yourself and click OK to capture")

            if (shouldCapture) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height)
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" })
                        setPendingFile(file)
                        const reader = new FileReader()
                        reader.onloadend = () => {
                            setImagePreview(reader.result)
                        }
                        reader.readAsDataURL(file)
                    }
                }, "image/jpeg", 0.9)
            }

            stream.getTracks().forEach((track) => track.stop())
        } catch (error) {
            console.error("Error accessing camera:", error)
            toast.error("Error accessing camera. Please ensure permissions are granted.", {
                icon: <AlertCircle className="w-5 h-5" />,
            })
        }
    }

    const handleUpload = () => {
        if (!pendingFile) {
            toast.error("Please select an image first")
            return
        }

        if (!selectedBodyPart) {
            toast.error("Please select a body part")
            return
        }

        setShowConfirmDialog(true)
    }

    const confirmUpload = () => {
        uploadMutation.mutate({
            file: pendingFile,
            bodyPart: selectedBodyPart,
        })
        setShowConfirmDialog(false)
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Authentication Required</CardTitle>
                        <CardDescription>Please log in to use the skin check feature.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen py-4 px-4 bg-gradient-to-b from-background to-secondary/20">
            <div className="container mx-auto max-w-6xl">
               
                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Body Part Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Body Part</CardTitle>
                            <CardDescription>Click on the body part where you want to check your skin</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {hasBodyComponent && BodyComponent ? (
                                <div className="relative flex justify-center body-component-wrapper">
                                    {selectedBodyPart && (
                                        <div className="absolute top-2 right-2 z-10 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-xs font-semibold shadow-md">
                                            {selectedBodyPart.split('_').map(word => 
                                                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                            ).join(' ')}
                                        </div>
                                    )}
                                    <BodyComponent
                                        partsInput={selectedBodyPart || ""}
                                        onClick={handleBodyPartClick}
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {BODY_PARTS.map((part) => (
                                        <Button
                                            key={part.id}
                                            variant={selectedBodyPart === part.id ? "default" : "outline"}
                                            onClick={() => handleBodyPartClick(part.id)}
                                            className={cn(
                                                "justify-start",
                                                selectedBodyPart === part.id && "bg-primary text-primary-foreground"
                                            )}
                                        >
                                            {part.label}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Image Upload Section */}
                    <div>
                        <Card>
                            <CardHeader>
                                <CardTitle>Upload Image</CardTitle>
                                <CardDescription>Upload an image or take a photo with your camera</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Image Preview/Upload Area */}
                                <div
                                    className={cn(
                                        "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                                        imagePreview
                                            ? "border-primary bg-primary/5"
                                            : "border-muted-foreground/25 hover:border-primary/50"
                                    )}
                                    onClick={() => !imagePreview && fileInputRef.current?.click()}
                                >
                                    {imagePreview ? (
                                        <div className="space-y-4">
                                            <img
                                                src={imagePreview}
                                                alt="Preview"
                                                className="max-w-full max-h-64 mx-auto rounded-lg object-contain"
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setImagePreview(null)
                                                    setPendingFile(null)
                                                    if (fileInputRef.current) {
                                                        fileInputRef.current.value = ""
                                                    }
                                                }}
                                            >
                                                Remove Image
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">Drag & drop your image here</p>
                                                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                                            </div>
                                        </div>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={handleCameraClick}
                                        className="flex-1"
                                        disabled={uploadMutation.isPending}
                                    >
                                        <Camera className="w-4 h-4 mr-2" />
                                        Use Camera
                                    </Button>
                                    <Button
                                        onClick={handleUpload}
                                        className="flex-1"
                                        disabled={!imagePreview || !selectedBodyPart || uploadMutation.isPending}
                                    >
                                        {uploadMutation.isPending ? "Uploading..." : "Start Analysis"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Confirm Dialog */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Upload for Analysis?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your image will be analyzed for skin conditions. This may take a few moments.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmUpload}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

