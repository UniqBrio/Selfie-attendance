import { NextResponse } from 'next/server';
import fs from 'fs/promises'; // For saving the image to the filesystem (example)
import path from 'path';     // For constructing file paths
import dbConnect from '@/lib/mongodb'; // Corrected path if your file is mongodb.ts
import Attendance, { IAttendance } from '@/models/Attendance'; // Import Mongoose model and interface

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

    // --- 2. Handle the photo data ---
    const base64Data = body.photo.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const imageName = `attendance_${Date.now()}.jpeg`;
    
    // WARNING: In production (especially on Vercel/serverless), local filesystem is ephemeral.
    // You MUST use cloud storage (AWS S3, Google Cloud Storage, Azure Blob Storage, Cloudinary) for images.
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true }); 
    const imagePath = path.join(uploadsDir, imageName);
    await fs.writeFile(imagePath, imageBuffer);
    const imageUrl = `/uploads/${imageName}`; 
    console.log("API Route: Image saved locally to:", imageUrl);

    // --- 3. Create and save the attendance record using Mongoose ---
    const attendanceDocument = new Attendance({
      imageUrl,
      timestamp: new Date(body.timestamp), 
      location: {
        latitude: body.location.latitude,
        longitude: body.location.longitude,
        accuracy: body.location.accuracy,
        address: body.location.address || undefined, 
      },
    });

    console.log("API Route: Attempting to save document:", attendanceDocument);
    const savedAttendance = await attendanceDocument.save() as IAttendance;
    console.log('API Route: Attendance Record saved to MongoDB:', (savedAttendance._id as any).toString());

    // --- 4. Send a success response ---
    const responseData = {
      _id: (savedAttendance._id as any).toString(),
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