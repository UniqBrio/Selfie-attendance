"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, MapPin, Clock, CheckCircle, AlertCircle, RotateCcw, RotateCw } from "lucide-react"

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  address?: string
}

interface AttendanceData {
  photo: string
  timestamp: string
  location: LocationData
  submitted: boolean
}

export default function SelfieAttendance() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [location, setLocation] = useState<LocationData | null>(null)
  const [timestamp, setTimestamp] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const getCurrentLocation = useCallback(() => {
    return new Promise<LocationData>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          let address = "Address not found";

          try {
          
            const geoResponse = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
            );
            if (geoResponse.ok) {
              const geoData = await geoResponse.json();
              if (geoData && geoData.display_name) {
                address = geoData.display_name;
              } else {
                console.warn("Could not parse address from geocoding response:", geoData);
              }
            } else {
              console.warn(
                `Reverse geocoding request failed: ${geoResponse.status} ${geoResponse.statusText}`
              );
            }
          } catch (err) {
            console.error("Error fetching address:", err);
           
          }

          resolve({
            latitude,
            longitude,
            accuracy,
            address, 
          });
        },
        (error) => {
          reject(new Error(`Location error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, 
          maximumAge: 60000,
        },
      )
    })
  }, [])


  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true)
      setError("")

      const locationData = await getCurrentLocation()
      setLocation(locationData)


      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to access camera or location")
    } finally {
      setIsLoading(false)
    }
  }, [getCurrentLocation, facingMode])

  
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }, [stream])

  
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !location) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const now = new Date()
    const timestampText = now.toLocaleString()
    setTimestamp(timestampText) 

    
    const overlayPadding = 10;
    const textPaddingFromEdge = 20; 
    const baseFontSize = 16;
    const fontSize = Math.max(12, Math.min(baseFontSize, canvas.width / 35));
    const lineHeight = fontSize * 1.5;

    context.font = `${fontSize}px Arial`; 
    context.textAlign = "right";
    context.textBaseline = "bottom";

    let textLines: string[] = [];
    textLines.push(`🎯 Accuracy: ${location.accuracy.toFixed(0)}m`);

    if (location.address && location.address !== "Address not found") {
        const maxTextWidth = canvas.width - (textPaddingFromEdge * 2);
        let currentLine = "";
        const words = location.address.split(" ");
        let addressWrappedLines = [];

        for (const word of words) {
            const testLine = currentLine + word + " ";
            if (context.measureText(testLine).width > maxTextWidth && currentLine.length > 0) {
                addressWrappedLines.push(currentLine.trim());
                currentLine = word + " ";
            } else {
                currentLine = testLine;
            }
        }
        addressWrappedLines.push(currentLine.trim());
        
        
        for (let i = addressWrappedLines.length - 1; i >= 0; i--) {
            textLines.push(`📍 ${addressWrappedLines[i]}`);
        }
    } else {
        textLines.push(`📍 ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
    }
    textLines.push(`📅 ${timestampText}`);

    const overlayHeight = (textLines.length * lineHeight) + (overlayPadding * 2);

    context.fillStyle = "rgba(0, 0, 0, 0.7)"
    context.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight)
    context.fillStyle = "white"

    for (let i = 0; i < textLines.length; i++) {
        const yPosition = canvas.height - overlayPadding - (i * lineHeight);
        context.fillText(textLines[i], canvas.width - textPaddingFromEdge, yPosition);
    }

    const photoData = canvas.toDataURL("image/jpeg", 0.8)
    setCapturedPhoto(photoData)
    stopCamera()
  }, [location, stopCamera])

  
  const submitAttendance = useCallback(async () => {
    if (!capturedPhoto || !location || !timestamp) return

    setIsLoading(true);
    setError(""); // Clear previous errors
    try {
      const attendanceData: AttendanceData = {
        photo: capturedPhoto,
        timestamp,
        location,
        submitted: true, // This is mostly for client-side logic
      }

      const response = await fetch('/api/submit-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendanceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log("Attendance submitted to backend:", result);
      setIsSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit attendance. Please try again.");
    } finally {
      setIsLoading(false)
    }
  }, [capturedPhoto, location, timestamp])

  // Reset everything
  const reset = useCallback(() => {
    stopCamera()
    setCapturedPhoto(null)
    setLocation(null)
    setTimestamp("")
    setIsSubmitted(false)
    setError("")
  }, [stopCamera])

  // Switch camera (front/back)
  const switchCamera = useCallback(() => {
    stopCamera()
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))
  }, [stopCamera])

  // Auto-start camera when facing mode changes
  useEffect(() => {
    if (!capturedPhoto && !isSubmitted) {
      startCamera()
    }
  }, [facingMode, capturedPhoto, isSubmitted, startCamera])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-green-700">Attendance Submitted!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Your attendance has been recorded successfully.</p>
              <p className="mt-2">📅 {timestamp}</p>
              {location && (
                <p className="truncate px-4">
                  📍 {location.address && location.address !== "Address not found"
                      ? location.address
                      : `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}
                </p>
              )}
            </div>
            <Button onClick={reset} className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              Take Another Attendance
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Selfie Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {location && (
              <div className="flex flex-wrap gap-2">
                <Badge className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Location Ready
                </Badge>
                <Badge className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timestamp}
                </Badge>
              </div>
            )}

            {!capturedPhoto ? (
              <div className="space-y-4">
                <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  {isLoading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <p>Loading camera...</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={capturePhoto} disabled={!stream || !location || isLoading} className="flex-1">
                    <Camera className="w-4 h-4 mr-2" />
                    Capture Attendance
                  </Button>
                  <Button 
                    onClick={switchCamera} 
                    disabled={isLoading} 
                    className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 p-2" 
                    title="Switch Camera"
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                  <img
                    src={capturedPhoto || "/placeholder.svg"}
                    alt="Captured selfie"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {timestamp}
                  </p>
                  {location && (
                    <p className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={submitAttendance} disabled={isLoading} className="flex-1">
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Submit Attendance
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={switchCamera} 
                    disabled={isLoading} 
                    className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 p-2"
                    title="Switch Camera"
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                  <Button onClick={reset} className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
                    Retake
                  </Button>
                </div>
              </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground space-y-2">
              <p>• Camera and location permissions required</p>
              <p>• Photo includes GPS coordinates and timestamp</p>
              <p>• Works on both desktop and mobile devices</p>
              <p>• Use the camera flip button (↻) to switch between front/back camera</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
