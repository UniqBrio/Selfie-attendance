import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb'; // Corrected path if your file is mongodb.ts
import Attendance, { IAttendance } from '@/models/Attendance'; // Import Mongoose model and interface
// Update the import path below to the correct location of imageUploadService in your project structure
import { uploadImageToR2 } from '@/services/imageUploadService'; // Adjust path if needed

// Define the expected request body structure from the frontend
interface AttendanceRequestBody {
  photo: string; // base64 encoded image
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    address?: string;
  };
  userId?: string; // Optional: To organize images by user in R2
}

export async function POST(request: Request) {
  try {
    console.log("API Route: Connecting to DB...");
    await dbConnect(); // Ensure database connection is established
    console.log("API Route: DB Connected.");

    const body = await request.json() as AttendanceRequestBody;
    console.log("API Route: Received body:", body);

    // --- 1. Validate the incoming data (basic example) ---
    if (!body.photo || !body.timestamp || !body.location) {
      console.error("API Route: Missing required fields");
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // --- 2. Handle the photo data and upload to R2 ---
    const photoDataString = body.photo; // e.g., "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."

    // Extract mimetype and base64 data
    const match = photoDataString.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match || match.length !== 3) {
        console.error("API Route: Invalid photo data format received.");
        return NextResponse.json({ message: 'Invalid photo data format. Expected data URL.' }, { status: 400 });
    }
    const mimetype = match[1]; // e.g., "image/jpeg"
    const base64ImageData = match[2];
    const imageBuffer = Buffer.from(base64ImageData, 'base64');

    // Create a generic originalname; the service will make it unique.
    // Derive extension from mimetype.
    const fileExtension = mimetype.split('/')[1] || 'jpeg'; // Default to jpeg if split fails
    const originalname = `attendance_capture_${Date.now()}.${fileExtension}`;

    const fileToUpload = {
        buffer: imageBuffer,
        originalname: originalname,
        mimetype: mimetype,
    };

    // Define a destination path in R2 Storage.
    const destinationFolder = `attendance_selfies/${body.userId || 'unknown_user'}/`; // Organize by userId if available
    const r2ImageUrl = await uploadImageToR2(fileToUpload, destinationFolder);
    console.log("API Route: Image uploaded to R2:", r2ImageUrl);

    // --- 3. Create and save the attendance record using Mongoose ---
    const attendanceDocument = new Attendance({
      imageUrl: r2ImageUrl, // Use the URL from R2 Storage
      timestamp: new Date(body.timestamp), 
      location: {
        latitude: body.location.latitude,
        longitude: body.location.longitude,
        accuracy: body.location.accuracy,
        address: body.location.address || undefined, 
      },
    });

    console.log("API Route: Attempting to save document:", attendanceDocument);
    const savedAttendance = await attendanceDocument.save();
    console.log('API Route: Attendance Record saved to MongoDB:', (savedAttendance as any)._id.toString());

    // --- 4. Send a success response ---
    const responseData = {
      _id: (savedAttendance as any)._id.toString(),
      imageUrl: savedAttendance.imageUrl,
      timestamp: savedAttendance.timestamp.toISOString(),
      location: savedAttendance.location,
      recordedAt: savedAttendance.recordedAt.toISOString(),
    };

    return NextResponse.json(
      { message: 'Attendance submitted successfully', data: responseData },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('API Route: Error submitting attendance:', error);
    let errorMessage = 'Internal Server Error';
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message);
        errorMessage = `Validation Error: ${messages.join(', ')}`;
        return NextResponse.json({ message: 'Validation failed', errors: messages }, { status: 400 });
    } else if (error.message) {
        errorMessage = error.message;
    }
    return NextResponse.json({ message: 'Failed to submit attendance', error: errorMessage }, { status: 500 });
  }
}