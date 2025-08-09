import { NextResponse } from 'next/server';
import { uploadImageToR2 } from '../../../services/imageUploadService'; // Adjust path as needed
// Assuming your AttendanceModel is set up for Mongoose
// import AttendanceModel from '../../../models/AttendanceModel'; // Adjust path as needed
// import connectDB from '../../../lib/mongodb'; // Your DB connection utility

export async function POST(req) {
  // Example: await connectDB(); // If you need to interact with your database

  try {
    const formData = await req.formData();
    const imageFile = formData.get('attendanceImage'); // This name must match the 'name' attribute of your file input
    const userId = formData.get('userId'); // Example: get other form data like userId

    // --- Basic Validations ---
    if (!imageFile) {
      return NextResponse.json({ message: 'No image file provided.' }, { status: 400 });
    }

    // Ensure the uploaded data is a file and not a string
    if (!(imageFile instanceof File) || typeof imageFile.name !== 'string') {
        return NextResponse.json({ message: 'Invalid file data. "attendanceImage" should be a file.' }, { status: 400 });
    }

    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json({ message: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }

    // Optional: File size validation (e.g., 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (imageFile.size > maxSize) {
      return NextResponse.json({ message: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.` }, { status: 400 });
    }

    // --- Prepare file for upload service ---
    const fileBuffer = Buffer.from(await imageFile.arrayBuffer());
    const fileToUpload = {
      buffer: fileBuffer,
      originalname: imageFile.name,
      mimetype: imageFile.type,
    };

    // Define the destination path in R2 Storage.
    // You might want to make this more dynamic, e.g., include userId or a date.
    const destinationFolder = `attendance_selfies/${userId || 'general_uploads'}/`;

    const selfieImageUrl = await uploadImageToR2(fileToUpload, destinationFolder);

    // --- Save to Database (Example) ---
    // const newAttendance = new AttendanceModel({
    //   userId: userId || 'anonymous', // Use the userId from form or a default
    //   selfieUrl: selfieImageUrl,
    //   timestamp: new Date(),
    //   // ... other fields
    // });
    // await newAttendance.save();

    return NextResponse.json({
      message: 'Attendance image uploaded successfully!',
      selfieUrl: selfieImageUrl,
      // attendanceRecord: newAttendance // if you save it to DB and want to return it
    }, { status: 201 });

  } catch (error) {
    console.error('Upload Error:', error);
    if (error.message.includes('Not an image')) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    // Check for specific R2 errors if needed
    return NextResponse.json({ message: 'Failed to upload attendance image.', error: error.message }, { status: 500 });
  }
}

// The `export const config = { api: { bodyParser: false } };` is not needed
// for App Router when using `req.formData()`. It was for Pages Router with middleware like multer.